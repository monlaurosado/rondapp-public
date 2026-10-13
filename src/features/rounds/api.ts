import { REACTIONS, type ReactionType } from "@/constants/reactions";
import {
  createMomentImagePath,
  getSignedMomentUrls,
  removeMomentImage,
  uploadMomentImage,
  type MomentUploadPhase,
} from "@/lib/images";
import { logger } from "@/lib/logger";
import { requireSupabase } from "@/lib/supabase";
import { isRoundExpired } from "@/lib/dates";
import type {
  Moment,
  MomentWithStats,
  PhotoVote,
  Reaction,
  Round,
  RoundWithRelations,
  SocialGroup,
  Profile,
} from "@/types/domain";

type RoundRow = Round & {
  group?: SocialGroup | null;
  creator?: Profile | null;
  moments?: Pick<Moment, "image_path" | "created_at">[] | null;
};

type MomentRow = Moment & {
  author?: Profile | null;
};

type ReactionStatRow = Pick<Reaction, "moment_id" | "type" | "user_id">;
type VoteStatRow = Pick<PhotoVote, "moment_id" | "voter_id">;

export type PublicationPhase = MomentUploadPhase | "publishing";

const PUBLICATION_RPC_TIMEOUT_MS = 20_000;
const PUBLICATION_CONFIRMATION_TIMEOUT_MS = 15_000;
const NOTIFICATION_TIMEOUT_MS = 15_000;

class PublicationRequestTimeoutError extends Error {
  readonly code = "REQUEST_TIMEOUT";

  constructor(operation: string) {
    super(`La operación ${operation} ha agotado el tiempo de espera (timed out).`);
    this.name = "PublicationRequestTimeoutError";
  }
}

type PublicationIdentity = {
  momentId: string;
  roundId: string;
  groupId: string;
  userId: string;
  imagePath: string;
  caption: string | null;
  drinkType: string | null;
};

function emptyReactionCounts() {
  return REACTIONS.reduce(
    (acc, reaction) => {
      acc[reaction.id] = 0;
      return acc;
    },
    {} as Record<ReactionType, number>,
  );
}

function emptyMyReactions() {
  return REACTIONS.reduce(
    (acc, reaction) => {
      acc[reaction.id] = false;
      return acc;
    },
    {} as Record<ReactionType, boolean>,
  );
}

async function withPublicationTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
  operationName: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new PublicationRequestTimeoutError(operationName)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([Promise.resolve(operation), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function addRoundPreviews(rounds: RoundRow[]): Promise<RoundWithRelations[]> {
  const prepared = rounds.map((round) => {
    const moments = [...(round.moments ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const { moments: _moments, ...baseRound } = round;
    return {
      baseRound,
      momentCount: moments.length,
      previewPath: moments[0]?.image_path ?? null,
    };
  });
  const signedUrls = await getSignedMomentUrls(
    prepared.flatMap(({ previewPath }) => (previewPath ? [previewPath] : [])),
  );

  return prepared.map(({ baseRound, momentCount, previewPath }) => ({
    ...baseRound,
    moment_count: momentCount,
    preview_url: previewPath ? signedUrls.get(previewPath) : null,
  }));
}

export async function listActiveRounds(groupId?: string) {
  const supabase = requireSupabase();
  let query = supabase
    .from("rounds")
    .select("*,group:social_groups(*),creator:profiles(*),moments!moments_round_id_fkey(image_path,created_at)")
    .eq("status", "active")
    .gt("closes_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return addRoundPreviews((data ?? []) as RoundRow[]);
}

export async function listRecentRounds(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .select("*,group:social_groups(*),creator:profiles(*),moments!moments_round_id_fkey(image_path,created_at)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return addRoundPreviews((data ?? []) as RoundRow[]);
}

export async function getRound(roundId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .select("*,group:social_groups(*),creator:profiles(*)")
    .eq("id", roundId)
    .single();

  if (error) {
    throw error;
  }

  return data as RoundRow;
}

export async function getMomentById(momentId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("moments")
    .select("*,author:profiles(*)")
    .eq("id", momentId)
    .single();

  if (error) {
    throw error;
  }

  return data as MomentRow;
}

export async function closeRound(roundId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("close_round", {
    p_round_id: roundId,
  });

  if (error) {
    throw error;
  }

  return data;
}

async function assertRoundOpen(roundId: string) {
  const round = await getRound(roundId);
  if (isRoundExpired(round)) {
    throw new Error("Esta ronda ya está cerrada. Ya no se puede interactuar.");
  }
  return round;
}

async function getMatchingPublishedMoment(identity: PublicationIdentity) {
  const supabase = requireSupabase();
  const { data, error } = await withPublicationTimeout(
    supabase
      .from("moments")
      .select("*")
      .eq("id", identity.momentId)
      .maybeSingle(),
    PUBLICATION_CONFIRMATION_TIMEOUT_MS,
    "de comprobación de la publicación",
  );

  if (error) throw error;
  if (!data) return null;

  const moment = data as Moment;
  const matches =
    moment.round_id === identity.roundId &&
    moment.group_id === identity.groupId &&
    moment.user_id === identity.userId &&
    moment.image_path === identity.imagePath &&
    moment.caption === identity.caption &&
    moment.drink_type === identity.drinkType;

  if (!matches) {
    throw new Error("Este intento de publicación ya se usó con otros datos.");
  }

  return moment;
}

async function assertGroupHasNoActiveRound(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "active")
    .gt("closes_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    throw new Error("active round already exists");
  }
}

function isAuthoritativePublicationError(error: unknown) {
  if (error instanceof PublicationRequestTimeoutError || error instanceof TypeError) {
    return false;
  }
  if (!error || typeof error !== "object") return false;

  const record = error as { code?: string; message?: string; status?: number };
  const message = record.message?.toLowerCase() ?? "";
  if (
    record.status === 0 ||
    record.status === 408 ||
    record.status === 425 ||
    record.status === 429 ||
    (record.status !== undefined && record.status >= 500) ||
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("timed out") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("gateway timeout") ||
    message.includes("service unavailable") ||
    message.includes("connection reset") ||
    message.includes("connection refused") ||
    message.includes("socket hang up") ||
    message.includes("request aborted")
  ) {
    return false;
  }

  const code = record.code?.toUpperCase() ?? "";
  if (!code || /^08/.test(code) || /^PGRST00[0-3]$/.test(code)) return false;

  return (
    code === "P0001" ||
    code === "42501" ||
    /^22/.test(code) ||
    /^23/.test(code) ||
    /^28/.test(code) ||
    /^PGRST/.test(code)
  );
}

async function reconcileFailedPublication(
  identity: PublicationIdentity,
  rpcError: unknown,
) {
  let confirmedMoment: Moment | null;
  try {
    confirmedMoment = await getMatchingPublishedMoment(identity);
  } catch (confirmationError) {
    logger.warn("publication confirmation check failed; preserving uploaded image", confirmationError, {
      roundId: identity.roundId,
      momentId: identity.momentId,
    });
    return null;
  }

  if (confirmedMoment) return confirmedMoment;

  if (!isAuthoritativePublicationError(rpcError)) {
    logger.warn("publication result is ambiguous; preserving uploaded image", rpcError, {
      roundId: identity.roundId,
      momentId: identity.momentId,
    });
    return null;
  }

  try {
    await removeMomentImage(identity.imagePath);
  } catch (cleanupError) {
    logger.warn("rejected publication storage cleanup failed", cleanupError, {
      roundId: identity.roundId,
      momentId: identity.momentId,
      imagePath: identity.imagePath,
    });
  }

  return null;
}

async function sendRoundNotification(roundId: string) {
  const supabase = requireSupabase();
  try {
    const { error } = await withPublicationTimeout(
      supabase.functions.invoke("send-round-notification", {
        body: { roundId },
      }),
      NOTIFICATION_TIMEOUT_MS,
      "de envío de la notificación",
    );
    if (error) throw error;
  } catch (error) {
    logger.warn("send-round-notification failed", error, { roundId });
  }
}

export async function createRoundWithMoment(input: {
  roundId: string;
  momentId: string;
  groupId: string;
  userId: string;
  imageUri: string;
  caption?: string;
  drinkType?: string | null;
}, onPhase?: (phase: PublicationPhase) => void) {
  const supabase = requireSupabase();
  const caption = input.caption?.trim() || null;
  const drinkType = input.drinkType || null;
  const imagePath = createMomentImagePath({
    groupId: input.groupId,
    roundId: input.roundId,
    userId: input.userId,
    momentId: input.momentId,
  });
  const identity: PublicationIdentity = {
    momentId: input.momentId,
    roundId: input.roundId,
    groupId: input.groupId,
    userId: input.userId,
    imagePath,
    caption,
    drinkType,
  };

  const existingMoment = await getMatchingPublishedMoment(identity);
  if (existingMoment) {
    await sendRoundNotification(input.roundId);
    return input.roundId;
  }

  // Avoid uploading a photo when the user reached this screen through stale
  // navigation. The database repeats this check under a group-scoped lock.
  await assertGroupHasNoActiveRound(input.groupId);

  await uploadMomentImage(imagePath, input.imageUri, onPhase);
  onPhase?.("publishing");

  let rpcResult;
  try {
    rpcResult = await withPublicationTimeout(
      supabase.rpc("create_round_with_moment", {
        p_group_id: input.groupId,
        p_round_id: input.roundId,
        p_moment_id: input.momentId,
        p_image_path: imagePath,
        p_caption: caption,
        p_drink_type: drinkType,
      }),
      PUBLICATION_RPC_TIMEOUT_MS,
      "de publicación de la ronda",
    );
  } catch (error) {
    const confirmedMoment = await reconcileFailedPublication(identity, error);
    if (confirmedMoment) {
      await sendRoundNotification(input.roundId);
      return input.roundId;
    }
    throw error;
  }

  const { data, error } = rpcResult;

  if (error) {
    const confirmedMoment = await reconcileFailedPublication(identity, error);
    if (confirmedMoment) {
      await sendRoundNotification(input.roundId);
      return input.roundId;
    }
    throw error;
  }

  if (data !== input.roundId) {
    throw new Error("No hemos podido confirmar la ronda creada. Reinténtalo.");
  }

  await sendRoundNotification(input.roundId);
  return input.roundId;
}

export async function createMoment(input: {
  momentId: string;
  roundId: string;
  groupId: string;
  userId: string;
  imageUri: string;
  caption?: string;
  drinkType?: string | null;
}, onPhase?: (phase: PublicationPhase) => void) {
  const supabase = requireSupabase();
  const caption = input.caption?.trim() || null;
  const drinkType = input.drinkType || null;
  const imagePath = createMomentImagePath({
    groupId: input.groupId,
    roundId: input.roundId,
    userId: input.userId,
    momentId: input.momentId,
  });
  const identity: PublicationIdentity = {
    momentId: input.momentId,
    roundId: input.roundId,
    groupId: input.groupId,
    userId: input.userId,
    imagePath,
    caption,
    drinkType,
  };

  const existingMoment = await getMatchingPublishedMoment(identity);
  if (existingMoment) return existingMoment;

  const round = await getRound(input.roundId);
  if (round.status === "closed" || new Date(round.closes_at).getTime() <= Date.now()) {
    throw new Error("Esta ronda ya ha terminado. Ya no se pueden subir momentos.");
  }

  const { count, error: countError } = await supabase
    .from("moments")
    .select("id", { count: "exact", head: true })
    .eq("round_id", input.roundId)
    .eq("user_id", input.userId);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) >= 3) {
    throw new Error("Máximo 3 momentos por persona en una ronda.");
  }

  await uploadMomentImage(imagePath, input.imageUri, onPhase);
  onPhase?.("publishing");

  let rpcResult;
  try {
    rpcResult = await withPublicationTimeout(
      supabase.rpc("create_moment", {
        p_round_id: input.roundId,
        p_moment_id: input.momentId,
        p_image_path: imagePath,
        p_caption: caption,
        p_drink_type: drinkType,
      }),
      PUBLICATION_RPC_TIMEOUT_MS,
      "de publicación del momento",
    );
  } catch (error) {
    const confirmedMoment = await reconcileFailedPublication(identity, error);
    if (confirmedMoment) return confirmedMoment;
    throw error;
  }

  const { data, error } = rpcResult;

  if (error) {
    const confirmedMoment = await reconcileFailedPublication(identity, error);
    if (confirmedMoment) return confirmedMoment;
    throw error;
  }

  if (data !== input.momentId) {
    throw new Error("No hemos podido confirmar el momento creado. Reinténtalo.");
  }

  const publishedMoment = await getMatchingPublishedMoment(identity);
  if (!publishedMoment) {
    throw new Error("El momento se publicó, pero aún no podemos mostrarlo. Reinténtalo.");
  }
  return publishedMoment;
}

export async function getRoundMoments(roundId: string, userId: string) {
  const supabase = requireSupabase();
  const momentsResult = await supabase
    .from("moments")
    .select("*,author:profiles(*)")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (momentsResult.error) {
    throw momentsResult.error;
  }

  const roundMoments = (momentsResult.data ?? []) as MomentRow[];
  if (roundMoments.length === 0) return [];

  const momentIds = roundMoments.map((moment) => moment.id);
  const [reactionsResult, votesResult, reportsResult] = await Promise.all([
    supabase
      .from("reactions")
      .select("moment_id,type,user_id")
      .eq("round_id", roundId)
      .in("moment_id", momentIds),
    supabase
      .from("photo_votes")
      .select("moment_id,voter_id")
      .eq("round_id", roundId)
      .in("moment_id", momentIds),
    supabase
      .from("reports")
      .select("moment_id")
      .eq("reporter_id", userId)
      .in("moment_id", momentIds),
  ]);

  if (reactionsResult.error) {
    throw reactionsResult.error;
  }
  if (votesResult.error) {
    throw votesResult.error;
  }
  if (reportsResult.error) {
    throw reportsResult.error;
  }

  const reportedMomentIds = new Set(
    (reportsResult.data ?? [])
      .map((report) => report.moment_id)
      .filter((momentId): momentId is string => Boolean(momentId)),
  );
  const moments = roundMoments.filter(
    (moment) => !reportedMomentIds.has(moment.id),
  );
  const reactions = (reactionsResult.data ?? []) as ReactionStatRow[];
  const votes = (votesResult.data ?? []) as VoteStatRow[];
  const reactionsByMoment = new Map<string, ReactionStatRow[]>();
  const votesByMoment = new Map<string, VoteStatRow[]>();

  reactions.forEach((reaction) => {
    const current = reactionsByMoment.get(reaction.moment_id) ?? [];
    current.push(reaction);
    reactionsByMoment.set(reaction.moment_id, current);
  });
  votes.forEach((vote) => {
    const current = votesByMoment.get(vote.moment_id) ?? [];
    current.push(vote);
    votesByMoment.set(vote.moment_id, current);
  });

  const signedUrls = await getSignedMomentUrls(
    moments.map((moment) => moment.image_path),
  );

  return moments.map((moment) => {
    const reactionCounts = emptyReactionCounts();
    const hasMyReaction = emptyMyReactions();
    const momentReactions = reactionsByMoment.get(moment.id) ?? [];
    const momentVotes = votesByMoment.get(moment.id) ?? [];

    momentReactions.forEach((reaction) => {
      reactionCounts[reaction.type] += 1;
      if (reaction.user_id === userId) {
        hasMyReaction[reaction.type] = true;
      }
    });

    const signedUrl = signedUrls.get(moment.image_path);
    if (!signedUrl) {
      throw new Error("No se ha podido obtener acceso temporal a una foto.");
    }

    return {
      ...moment,
      signedUrl,
      author: moment.author ?? null,
      reactionCounts,
      fotonCount: momentVotes.length,
      myFoton: momentVotes.some((vote) => vote.voter_id === userId),
      hasMyReaction,
    } satisfies MomentWithStats;
  });
}

export async function toggleReaction(input: {
  moment: Moment;
  userId: string;
  type: ReactionType;
}) {
  await assertRoundOpen(input.moment.round_id);

  if (input.moment.user_id === input.userId) {
    throw new Error("No puedes reaccionar a tu propia foto.");
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("toggle_reaction", {
    p_moment_id: input.moment.id,
    p_type: input.type,
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as {
    action: "added" | "changed" | "removed";
    reaction_id: string | null;
    moment_id: string;
    reaction_type: ReactionType | null;
  };
}

export async function toggleRoundStar(input: { moment: Moment; userId: string }) {
  await assertRoundOpen(input.moment.round_id);

  if (input.moment.user_id === input.userId) {
    throw new Error("No puedes dar tu Estrella a tu propia foto.");
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("toggle_round_star", {
    p_moment_id: input.moment.id,
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as {
    action: "added" | "moved" | "removed";
    vote_id: string | null;
    selected_moment_id: string | null;
    round_id: string;
    available: number;
  };
}

export async function deleteMoment(input: { moment: Moment; userId: string }) {
  if (input.moment.user_id !== input.userId) {
    throw new Error("Solo puedes borrar tus propios momentos.");
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean;
    storageCleanupPending?: boolean;
    error?: string;
  }>("delete-moment", {
    body: { momentId: input.moment.id },
  });

  if (error) throw error;
  if (!data?.deleted) {
    throw new Error(data?.error ?? "No hemos podido confirmar que el momento se ha borrado.");
  }

  return { storageCleanupPending: data.storageCleanupPending === true };
}
