#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const runId = Date.now().toString(36).slice(-8);
const password = `Rondapp-${runId}-local-qa!`;
const createdUserIds = [];
const storagePaths = [];

function parseStatusJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No se pudo leer JSON desde `supabase status -o json`.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function readLocalSupabaseConfig() {
  const fromEnv = {
    apiUrl: process.env.SUPABASE_LOCAL_URL,
    anonKey: process.env.SUPABASE_LOCAL_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
    secretKey: process.env.SUPABASE_LOCAL_SECRET_KEY,
  };

  if (fromEnv.apiUrl && fromEnv.anonKey && fromEnv.serviceRoleKey) {
    return fromEnv;
  }

  try {
    const raw = execFileSync("npx", ["--yes", "supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const status = parseStatusJson(raw);
    return {
      apiUrl: status.API_URL,
      anonKey: status.ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY,
      secretKey: status.SECRET_KEY,
    };
  } catch (error) {
    throw new Error(
      "Supabase local no esta disponible. Ejecuta `npx supabase start` antes de `npm run qa:supabase:local`.",
      { cause: error },
    );
  }
}

function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function unwrap(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function invokeCleanupWorker(apiUrl, headers = {}) {
  const response = await fetch(`${apiUrl}/functions/v1/cleanup-storage-deletions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: "{}",
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function step(label, fn) {
  const result = await fn();
  console.log(`PASS ${label}`);
  return result;
}

async function expectFailure(label, fn) {
  try {
    const result = await fn();
    if (result?.error) {
      console.log(`PASS ${label}`);
      return result.error;
    }
  } catch (error) {
    console.log(`PASS ${label}`);
    return error;
  }
  throw new Error(`${label}: se esperaba un rechazo de RLS/validacion.`);
}

function mondayUtcDate() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

function queryLocalDatabase(sql) {
  const container = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  })
    .split("\n")
    .find((name) => name.startsWith("supabase_db_"));
  if (!container) {
    throw new Error("No se encontro el contenedor Postgres local de Supabase.");
  }
  return execFileSync(
    "docker",
    ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-Atc", sql],
    { encoding: "utf8" },
  ).trim();
}

async function createQaUser({ admin, apiUrl, anonKey, label, ageConfirmed = true }) {
  const email = `rondapp_${runId}_${label}@example.test`;
  const username = `qa_${runId.slice(-6)}_${label}`.slice(0, 20);
  const displayName = `QA ${label}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`No se pudo crear usuario ${label}: ${error?.message ?? "sin user"}`);
  }
  createdUserIds.push(data.user.id);

  const client = createSupabaseClient(apiUrl, anonKey);
  unwrap(await client.auth.signInWithPassword({ email, password }), `login ${label}`);
  unwrap(
    await client.from("profiles").upsert(
      {
        id: data.user.id,
        username,
        display_name: displayName,
        is_age_confirmed: ageConfirmed,
        accepted_terms_at: ageConfirmed ? new Date().toISOString() : null,
      },
      { onConflict: "id" },
    ),
    `profile ${label}`,
  );

  return {
    id: data.user.id,
    email,
    username,
    displayName,
    client,
  };
}

function momentPath({ groupId, roundId, userId, momentId }) {
  return `${groupId}/${roundId}/${userId}/${momentId}.jpg`;
}

async function uploadMomentImage(client, path) {
  storagePaths.push(path);
  unwrap(
    await client.storage.from("moments").upload(path, jpegBytes, {
      contentType: "image/jpeg",
      upsert: false,
    }),
    `upload ${path}`,
  );
}

async function cleanup(admin) {
  if (storagePaths.length > 0) {
    await admin.storage.from("moments").remove(storagePaths);
  }

  for (const userId of createdUserIds.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  const { apiUrl, anonKey, serviceRoleKey, secretKey } = readLocalSupabaseConfig();
  assert(apiUrl && anonKey && serviceRoleKey, "Faltan claves locales de Supabase.");

  const admin = createSupabaseClient(apiUrl, serviceRoleKey);

  try {
    const owner = await step("auth crea usuario owner confirmado", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "owner" }),
    );
    const member = await step("auth crea usuario member confirmado", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "member" }),
    );
    const peer = await step("auth crea usuario peer confirmado", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "peer" }),
    );
    const third = await step("auth crea usuario third confirmado", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "third" }),
    );
    const outsider = await step("auth crea usuario outsider confirmado", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "outside" }),
    );
    const unconfirmed = await step("auth crea usuario sin age gate", () =>
      createQaUser({ admin, apiUrl, anonKey, label: "young", ageConfirmed: false }),
    );

    await expectFailure("age gate bloquea create_group", () =>
      unconfirmed.client.rpc("create_group", { p_name: `QA ${runId}` }),
    );

    const groupId = await step("owner crea grupo privado por RPC", async () => {
      const data = unwrap(
        await owner.client.rpc("create_group", { p_name: `QA ${runId}` }),
        "create_group",
      );
      assert(typeof data === "string", "create_group no devolvio uuid.");
      return data;
    });

    const group = await step("owner lee grupo e invite code", async () => {
      const data = unwrap(
        await owner.client.from("social_groups").select("*").eq("id", groupId).single(),
        "select group",
      );
      assert(data.invite_code, "El grupo no tiene invite_code.");
      return data;
    });

    await step("outsider no puede leer grupo privado", async () => {
      const data = unwrap(
        await outsider.client.from("social_groups").select("id").eq("id", groupId),
        "outsider group select",
      );
      assert(data.length === 0, "Outsider pudo leer el grupo.");
    });

    await step("member entra por invite code", async () => {
      const data = unwrap(
        await member.client.rpc("join_group_by_invite", {
          p_invite_code: group.invite_code,
        }),
        "join_group_by_invite",
      );
      assert(data === groupId, "join_group_by_invite devolvio otro grupo.");
    });

    for (const user of [peer, third]) {
      await step(`${user.displayName} entra por invite code`, async () => {
        const data = unwrap(
          await user.client.rpc("join_group_by_invite", {
            p_invite_code: group.invite_code,
          }),
          `join_group_by_invite ${user.username}`,
        );
        assert(data === groupId, "join_group_by_invite devolvio otro grupo.");
      });
    }

    await step("member puede silenciar grupo", async () => {
      unwrap(
        await member.client
          .from("group_members")
          .update({ muted: true })
          .eq("group_id", groupId)
          .eq("user_id", member.id),
        "mute group",
      );
      const data = unwrap(
        await member.client
          .from("group_members")
          .select("muted")
          .eq("group_id", groupId)
          .eq("user_id", member.id)
          .single(),
        "select muted",
      );
      assert(data.muted === true, "El grupo no quedo silenciado para member.");
    });

    const roundId = randomUUID();
    const ownerMomentId = randomUUID();
    const ownerImagePath = momentPath({
      groupId,
      roundId,
      userId: owner.id,
      momentId: ownerMomentId,
    });

    await step("owner sube imagen a Storage privado", () =>
      uploadMomentImage(owner.client, ownerImagePath),
    );

    await step("owner crea ronda + primer momento transaccional", async () => {
      const data = unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: roundId,
          p_moment_id: ownerMomentId,
          p_image_path: ownerImagePath,
          p_caption: "Momento QA",
          p_drink_type: "agua",
        }),
        "create_round_with_moment",
      );
      assert(data === roundId, "create_round_with_moment devolvio otro id.");
    });

    await step("retry identico de ronda + momento es idempotente", async () => {
      const data = unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: roundId,
          p_moment_id: ownerMomentId,
          p_image_path: ownerImagePath,
          p_caption: "Momento QA",
          p_drink_type: "agua",
        }),
        "retry create_round_with_moment",
      );
      assert(data === roundId, "Retry no devolvio la ronda original.");
    });

    await expectFailure("retry con metadata distinta detecta conflicto", () =>
      owner.client.rpc("create_round_with_moment", {
        p_group_id: groupId,
        p_round_id: roundId,
        p_moment_id: ownerMomentId,
        p_image_path: ownerImagePath,
        p_caption: "Payload diferente",
        p_drink_type: "agua",
      }),
    );

    const blockedRoundId = randomUUID();
    const blockedMomentId = randomUUID();
    const blockedImagePath = momentPath({
      groupId,
      roundId: blockedRoundId,
      userId: member.id,
      momentId: blockedMomentId,
    });
    await step("una ronda activa bloquea crear otra en el mismo grupo", async () => {
      await uploadMomentImage(member.client, blockedImagePath);
      const error = await expectFailure("segunda ronda activa rechazada", () =>
        member.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: blockedRoundId,
          p_moment_id: blockedMomentId,
          p_image_path: blockedImagePath,
          p_caption: "Ronda duplicada",
          p_drink_type: "water",
        })
      );
      assert(
        error.message.includes("active round already exists"),
        "La segunda ronda no devolvio el error de ronda activa.",
      );
      const activeRounds = unwrap(
        await admin
          .from("rounds")
          .select("id")
          .eq("group_id", groupId)
          .eq("status", "active"),
        "active rounds after rejected duplicate",
      );
      assert(
        activeRounds.length === 1 && activeRounds[0].id === roundId,
        "El grupo termino con mas de una ronda activa.",
      );
      unwrap(
        await member.client.storage.from("moments").remove([blockedImagePath]),
        "cleanup rejected round upload",
      );
    });

    await expectFailure("cliente no puede mutar estado de ronda directamente", () =>
      owner.client.from("rounds").update({ status: "closed" }).eq("id", roundId),
    );

    await step("Storage DELETE no puede romper una foto ya publicada", async () => {
      const result = unwrap(
        await owner.client.storage.from("moments").remove([ownerImagePath]),
        "remove referenced own upload",
      );
      assert(result.length === 0, "Storage trato una foto publicada como borrable.");
      const download = await owner.client.storage.from("moments").download(ownerImagePath);
      assert(!download.error, "Storage borro una foto que sigue publicada.");
    });
    await step("Storage DELETE permite limpiar upload propio no referenciado", async () => {
      const orphanMomentId = randomUUID();
      const orphanPath = momentPath({
        groupId,
        roundId,
        userId: owner.id,
        momentId: orphanMomentId,
      });
      await uploadMomentImage(owner.client, orphanPath);
      unwrap(
        await owner.client.storage.from("moments").remove([orphanPath]),
        "remove unreferenced own upload",
      );
      const download = await admin.storage.from("moments").download(orphanPath);
      assert(download.error, "Storage conservo un upload propio que no estaba referenciado.");
    });

    const ownerMoment = await step("member lee ronda y momento de owner", async () => {
      const round = unwrap(
        await member.client.from("rounds").select("*").eq("id", roundId).single(),
        "member select round",
      );
      assert(round.group_id === groupId, "Member leyo otra ronda.");
      const moment = unwrap(
        await member.client.from("moments").select("*").eq("id", ownerMomentId).single(),
        "member select owner moment",
      );
      return moment;
    });

    await step("outsider no puede leer ronda ni momento", async () => {
      const rounds = unwrap(
        await outsider.client.from("rounds").select("id").eq("id", roundId),
        "outsider select rounds",
      );
      const moments = unwrap(
        await outsider.client.from("moments").select("id").eq("id", ownerMomentId),
        "outsider select moments",
      );
      assert(rounds.length === 0, "Outsider pudo leer ronda.");
      assert(moments.length === 0, "Outsider pudo leer momento.");
    });

    await step("member puede firmar imagen del grupo y outsider no", async () => {
      unwrap(
        await member.client.storage.from("moments").createSignedUrl(ownerImagePath, 60),
        "member signed url",
      );
      await expectFailure("outsider no puede firmar imagen", () =>
        outsider.client.storage.from("moments").createSignedUrl(ownerImagePath, 60),
      );
    });

    const memberMomentId = randomUUID();
    const memberImagePath = momentPath({
      groupId,
      roundId,
      userId: member.id,
      momentId: memberMomentId,
    });
    await step("member sube foto-respuesta", () =>
      uploadMomentImage(member.client, memberImagePath),
    );

    const memberMoment = await step("member crea momento por RPC idempotente", async () => {
      const momentId = unwrap(
        await member.client.rpc("create_moment", {
          p_round_id: roundId,
          p_moment_id: memberMomentId,
          p_image_path: memberImagePath,
          p_caption: "Respuesta QA",
          p_drink_type: "refresco",
        }),
        "create_moment member",
      );
      assert(momentId === memberMomentId, "create_moment devolvio otro id.");
      return unwrap(
        await member.client.from("moments").select("*").eq("id", memberMomentId).single(),
        "select member moment",
      );
    });

    await step("retry identico de momento devuelve el mismo id", async () => {
      const momentId = unwrap(
        await member.client.rpc("create_moment", {
          p_round_id: roundId,
          p_moment_id: memberMomentId,
          p_image_path: memberImagePath,
          p_caption: "Respuesta QA",
          p_drink_type: "refresco",
        }),
        "retry create_moment",
      );
      assert(momentId === memberMomentId, "Retry de momento no fue idempotente.");
    });

    await expectFailure("insert directo de momento queda revocado", () =>
      member.client.from("moments").insert({
        id: randomUUID(),
        round_id: roundId,
        group_id: groupId,
        user_id: member.id,
        image_path: "ruta-invalida",
      }),
    );

    await expectFailure("trigger impide cambiar identidad de un momento", () =>
      admin.from("moments").update({ user_id: outsider.id }).eq("id", memberMomentId),
    );

    const peerMomentId = randomUUID();
    const peerImagePath = momentPath({
      groupId,
      roundId,
      userId: peer.id,
      momentId: peerMomentId,
    });
    await step("peer sube y publica otro momento", async () => {
      await uploadMomentImage(peer.client, peerImagePath);
      const momentId = unwrap(
        await peer.client.rpc("create_moment", {
          p_round_id: roundId,
          p_moment_id: peerMomentId,
          p_image_path: peerImagePath,
          p_caption: "Peer QA",
          p_drink_type: "beer",
        }),
        "create_moment peer",
      );
      assert(momentId === peerMomentId, "Peer recibio otro moment id.");
    });

    let concurrentMemberMoments = [];
    await step("limite de 3 momentos resiste publicaciones concurrentes", async () => {
      const attempts = Array.from({ length: 3 }, (_, index) => {
        const momentId = randomUUID();
        const imagePath = momentPath({ groupId, roundId, userId: member.id, momentId });
        return { momentId, imagePath, index };
      });
      for (const attempt of attempts) {
        await uploadMomentImage(member.client, attempt.imagePath);
      }
      const results = await Promise.all(
        attempts.map((attempt) =>
          member.client.rpc("create_moment", {
            p_round_id: roundId,
            p_moment_id: attempt.momentId,
            p_image_path: attempt.imagePath,
            p_caption: `Concurrente ${attempt.index}`,
            p_drink_type: "water",
          })
        ),
      );
      assert(results.filter((result) => !result.error).length === 2, "El limite concurrente no acepto exactamente dos.");
      assert(results.filter((result) => result.error).length === 1, "El limite concurrente no rechazo exactamente uno.");
      concurrentMemberMoments = attempts.filter((_, index) => !results[index].error);
      const rows = unwrap(
        await admin.from("moments").select("id").eq("round_id", roundId).eq("user_id", member.id),
        "count concurrent moments",
      );
      assert(rows.length === 3, "La carrera supero el maximo de tres momentos.");
    });

    await expectFailure("owner no puede darse una estrella a si mismo", () =>
      owner.client.rpc("toggle_round_star", { p_moment_id: ownerMoment.id }),
    );
    await expectFailure("DML directo de reacciones esta revocado", () =>
      member.client.from("reactions").insert({
        moment_id: ownerMoment.id,
        round_id: roundId,
        group_id: groupId,
        user_id: member.id,
        type: "fire",
      }),
    );
    await expectFailure("DML directo de estrellas esta revocado", () =>
      member.client.from("photo_votes").insert({
        moment_id: ownerMoment.id,
        round_id: roundId,
        group_id: groupId,
        voter_id: member.id,
      }),
    );

    const reaction = await step("toggle reaccion añade, cambia, quita y vuelve a añadir", async () => {
      const addedRows = unwrap(
        await member.client.rpc("toggle_reaction", {
          p_moment_id: ownerMoment.id,
          p_type: "fire",
        }),
        "toggle reaction add",
      );
      assert(addedRows[0]?.action === "added", "La reaccion no se anadio.");
      const changedRows = unwrap(
        await member.client.rpc("toggle_reaction", {
          p_moment_id: ownerMoment.id,
          p_type: "wow",
        }),
        "toggle reaction change",
      );
      assert(changedRows[0]?.action === "changed", "La reaccion no cambio.");
      const removedRows = unwrap(
        await member.client.rpc("toggle_reaction", {
          p_moment_id: ownerMoment.id,
          p_type: "wow",
        }),
        "toggle reaction remove",
      );
      assert(removedRows[0]?.action === "removed", "La reaccion no se quito.");
      const finalRows = unwrap(
        await member.client.rpc("toggle_reaction", {
          p_moment_id: ownerMoment.id,
          p_type: "fire",
        }),
        "toggle reaction final add",
      );
      assert(finalRows[0]?.action === "added", "La reaccion final no se anadio.");
      return { id: finalRows[0].reaction_id };
    });

    await step("estrella unica se puede mover, quitar y restaurar", async () => {
      const added = unwrap(
        await member.client.rpc("toggle_round_star", { p_moment_id: ownerMoment.id }),
        "star add",
      );
      assert(added[0]?.action === "added" && added[0]?.available === 0, "La estrella no se anadio.");
      const moved = unwrap(
        await member.client.rpc("toggle_round_star", { p_moment_id: peerMomentId }),
        "star move",
      );
      assert(moved[0]?.action === "moved" && moved[0]?.selected_moment_id === peerMomentId, "La estrella no se movio.");
      const removed = unwrap(
        await member.client.rpc("toggle_round_star", { p_moment_id: peerMomentId }),
        "star remove",
      );
      assert(removed[0]?.action === "removed" && removed[0]?.available === 1, "La estrella no se quito.");
      const restored = unwrap(
        await member.client.rpc("toggle_round_star", { p_moment_id: ownerMoment.id }),
        "star restore",
      );
      assert(restored[0]?.action === "added", "La estrella no se restauro.");
      const votes = unwrap(
        await admin.from("photo_votes").select("moment_id,vote_type").eq("round_id", roundId).eq("voter_id", member.id),
        "select unique star",
      );
      assert(votes.length === 1 && votes[0].vote_type === "foton", "No se mantuvo una unica estrella foton.");
    });

    await expectFailure("outsider no puede reaccionar en grupo privado", () =>
      outsider.client.rpc("toggle_reaction", {
        p_moment_id: ownerMoment.id,
        p_type: "wow",
      }),
    );

    await expectFailure("insert directo de reporte esta revocado", () =>
      member.client.from("reports").insert({
        reporter_id: member.id,
        reported_user_id: owner.id,
        moment_id: ownerMoment.id,
        group_id: groupId,
        reason: "offensive",
      }),
    );

    await expectFailure("trigger rechaza reporte con identidad cruzada aun para service role", () =>
      admin.from("reports").insert({
        reporter_id: peer.id,
        reported_user_id: member.id,
        moment_id: ownerMoment.id,
        group_id: groupId,
        reason: "offensive",
      }),
    );

    await step("member reporta por RPC y deja de ver el contenido", async () => {
      const reportId = unwrap(
        await member.client.rpc("report_moment", {
          p_moment_id: ownerMoment.id,
          p_reason: "offensive",
          p_details: "QA local",
        }),
        "report_moment",
      );
      assert(typeof reportId === "string", "report_moment no devolvio uuid.");
      const reports = unwrap(
        await member.client.from("reports").select("id").eq("moment_id", ownerMoment.id),
        "select report",
      );
      assert(reports.length === 1, "Member no pudo leer su reporte.");
      const moments = unwrap(
        await member.client.from("moments").select("id").eq("id", ownerMoment.id),
        "reported moment visibility",
      );
      assert(moments.length === 0, "Member sigue viendo el momento reportado.");
      await expectFailure("Storage oculta el objeto reportado al reporter", () =>
        member.client.storage.from("moments").createSignedUrl(ownerImagePath, 60),
      );
      const peerRows = unwrap(
        await peer.client.from("moments").select("id").eq("id", ownerMoment.id),
        "peer still sees reported moment",
      );
      assert(peerRows.length === 1, "Un solo reporte oculto el momento globalmente.");
    });

    const pushToken = `ExponentPushToken[qa-${runId}-1234567890]`;
    await expectFailure("DML directo de device token esta revocado", () =>
      member.client.from("device_tokens").insert({
        user_id: member.id,
        expo_push_token: pushToken,
        platform: "ios",
      }),
    );
    await step("registro de token reasigna el dispositivo de forma segura", async () => {
      const memberTokenId = unwrap(
        await member.client.rpc("register_device_token", {
          p_expo_push_token: pushToken,
          p_platform: "ios",
          p_device_name: "QA phone",
        }),
        "register member token",
      );
      const ownerTokenId = unwrap(
        await owner.client.rpc("register_device_token", {
          p_expo_push_token: pushToken,
          p_platform: "ios",
          p_device_name: "QA reassigned",
        }),
        "reassign owner token",
      );
      assert(memberTokenId === ownerTokenId, "La reasignacion creo otro token.");
      const token = unwrap(
        await admin.from("device_tokens").select("user_id").eq("id", ownerTokenId).single(),
        "select reassigned token",
      );
      assert(token.user_id === owner.id, "El token no quedo asignado al ultimo usuario autenticado.");
      const memberRemoved = unwrap(
        await member.client.rpc("unregister_device_token", { p_expo_push_token: pushToken }),
        "old owner unregister token",
      );
      assert(memberRemoved === false, "El usuario anterior pudo borrar un token reasignado.");
      const ownerRemoved = unwrap(
        await owner.client.rpc("unregister_device_token", { p_expo_push_token: pushToken }),
        "current owner unregister token",
      );
      assert(ownerRemoved === true, "El propietario actual no pudo borrar el token.");
    });

    await expectFailure("solo creator puede disparar notificaciones de ronda", () =>
      member.client.functions.invoke("send-round-notification", { body: { roundId } }),
    );
    await step("notificacion sin destinatarios es idempotente", async () => {
      const first = unwrap(
        await owner.client.functions.invoke("send-round-notification", { body: { roundId } }),
        "first round notification",
      );
      assert(first.sent === 0 && first.duplicate === false, "La primera notificacion no se proceso.");
      const second = unwrap(
        await owner.client.functions.invoke("send-round-notification", { body: { roundId } }),
        "duplicate round notification",
      );
      assert(second.sent === 0 && second.duplicate === true, "El reintento pudo duplicar notificaciones.");
    });

    await step("worker rechaza credenciales no administrativas", async () => {
      const missing = await invokeCleanupWorker(apiUrl);
      assert(missing.response.status === 403, "Worker acepto una llamada sin credenciales.");
      const publishable = await invokeCleanupWorker(apiUrl, { apikey: anonKey });
      assert(publishable.response.status === 403, "Worker acepto la clave publica.");
      const userCall = await member.client.functions.invoke("cleanup-storage-deletions", {
        body: {},
      });
      assert(userCall.error, "Worker acepto un JWT de usuario.");
      if (secretKey) {
        const wrongHeader = await invokeCleanupWorker(apiUrl, {
          Authorization: `Bearer ${secretKey}`,
        });
        assert(
          wrongHeader.response.status === 403,
          "Worker acepto una secret key fuera de apikey.",
        );
      }
    });

    await step("worker service-only reintenta cola fallida sin borrar paths referenciados", async () => {
      const simulatedOrphan = `${randomUUID()}/${randomUUID()}.jpg`;
      const simulatedMomentId = randomUUID();
      unwrap(
        await admin.from("moment_storage_deletions").insert({
          moment_id: simulatedMomentId,
          image_path: simulatedOrphan,
          requested_by: peer.id,
        }),
        "seed moment deletion tombstone",
      );
      unwrap(
        await admin.from("storage_cleanup_queue").insert([
          {
            image_path: simulatedOrphan,
            source: "moment_deletion",
            source_id: simulatedMomentId,
            status: "failed",
            attempt_count: 1,
            last_error: "simulated failure",
          },
          {
            image_path: peerImagePath,
            source: "moment_deletion",
            source_id: peerMomentId,
            status: "pending",
            attempt_count: 0,
            last_error: null,
          },
        ]),
        "seed durable cleanup queue",
      );
      const result = secretKey
        ? await invokeCleanupWorker(apiUrl, { apikey: secretKey }).then(({ response, body }) => {
          assert(response.ok, "La secret key no pudo invocar el worker.");
          return body;
        })
        : unwrap(
          await admin.functions.invoke("cleanup-storage-deletions", { body: {} }),
          "cleanup-storage-deletions",
        );
      assert(result.pending === 0, "Worker dejo entradas reintentables en cola.");
      const legacyRetry = await invokeCleanupWorker(apiUrl, {
        Authorization: `Bearer ${serviceRoleKey}`,
      }).then(({ response, body }) => {
        assert(response.ok, "La service role legacy no pudo invocar el worker.");
        return body;
      });
      assert(
        legacyRetry.processed === 0 && legacyRetry.pending === 0,
        "El retry con service role legacy no fue idempotente.",
      );
      const tombstones = unwrap(
        await admin
          .from("moment_storage_deletions")
          .select("moment_id,completed_at")
          .eq("moment_id", simulatedMomentId),
        "tombstone after cleanup worker",
      );
      assert(
        tombstones.length === 1 && tombstones[0].completed_at,
        "Worker no dejo un recibo completado para reintentos idempotentes.",
      );
      const peerDownload = await admin.storage.from("moments").download(peerImagePath);
      assert(!peerDownload.error, "Worker borro un path que seguia referenciado.");
      unwrap(
        await admin.from("moment_storage_deletions").delete().eq("moment_id", simulatedMomentId),
        "cleanup simulated deletion receipt",
      );
    });

    await expectFailure("member no puede cerrar anticipadamente ronda ajena", () =>
      member.client.rpc("close_round", { p_round_id: roundId }),
    );

    await step("creator puede cierre manual anticipado y gana estrella antes que reaccion", async () => {
      const rows = unwrap(
        await owner.client.rpc("close_round", { p_round_id: roundId }),
        "close_round",
      );
      const closed = Array.isArray(rows) ? rows[0] : rows;
      assert(closed.status === "closed", "La ronda no quedo cerrada.");
      assert(closed.winner_moment_id === ownerMoment.id, "El ganador no fue el momento con estrella.");
    });

    const baselineLeaderboard = await step("ranking semanal incluye actividad social y no expone bebida", async () => {
      const rows = unwrap(
        await member.client.rpc("get_weekly_leaderboard", {
          p_group_id: groupId,
          p_week_start: mondayUtcDate(),
        }),
        "get_weekly_leaderboard",
      );
      assert(rows.length >= 2, "Ranking no devolvio miembros del grupo.");
      assert(rows.some((row) => row.user_id === owner.id), "Owner no aparece en ranking.");
      assert(rows.some((row) => row.user_id === member.id), "Member no aparece en ranking.");
      assert(!Object.prototype.hasOwnProperty.call(rows[0], "drink_type"), "Ranking expone drink_type.");
      return rows;
    });

    const hiddenRoundId = randomUUID();
    const hiddenMomentId = randomUUID();
    const hiddenImagePath = momentPath({
      groupId,
      roundId: hiddenRoundId,
      userId: owner.id,
      momentId: hiddenMomentId,
    });
    await step("ronda cuyo unico momento queda oculto no suma ranking", async () => {
      await uploadMomentImage(owner.client, hiddenImagePath);
      unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: hiddenRoundId,
          p_moment_id: hiddenMomentId,
          p_image_path: hiddenImagePath,
          p_caption: "Solo oculto",
          p_drink_type: "prefer_not_say",
        }),
        "create hidden-only round",
      );
      unwrap(
        await admin
          .from("moments")
          .update({ is_hidden: true, hidden_reason: "qa_hidden_only" })
          .eq("id", hiddenMomentId),
        "hide only moment",
      );
      const rows = unwrap(
        await owner.client.rpc("get_weekly_leaderboard", {
          p_group_id: groupId,
          p_week_start: mondayUtcDate(),
        }),
        "ranking after hidden-only round",
      );
      const before = baselineLeaderboard.find((row) => row.user_id === owner.id);
      const after = rows.find((row) => row.user_id === owner.id);
      assert(after.rounds_started === before.rounds_started, "Una ronda sin momentos visibles sumo rounds_started.");
      assert(after.score === before.score, "Una ronda sin momentos visibles altero el score.");
      unwrap(
        await owner.client.rpc("close_round", { p_round_id: hiddenRoundId }),
        "close hidden-only round",
      );
    });

    await step("stats privadas normalizan bebida, incluyen ocultos y usan auth.uid", async () => {
      const stats = unwrap(await owner.client.rpc("get_my_profile_stats"), "owner profile stats");
      assert(stats.total_moments === 2, "Stats owner no incluyen sus dos momentos, incluido el oculto.");
      assert(stats.total_with_drink === 1, "prefer_not_say se conto como bebida indicada.");
      assert(stats.by_drink.water === 1, "La bebida legacy agua no se normalizo a water.");
      assert(!Object.prototype.hasOwnProperty.call(stats.by_drink, "prefer_not_say"), "Stats expusieron prefer_not_say como bebida.");
      const outsiderStats = unwrap(
        await outsider.client.rpc("get_my_profile_stats"),
        "outsider own profile stats",
      );
      assert(outsiderStats.total_moments === 0, "Outsider obtuvo stats de otro usuario.");
    });

    await step("owner no puede cambiar role ni muted de otro miembro", async () => {
      const mutedRows = unwrap(
        await owner.client
          .from("group_members")
          .update({ muted: true })
          .eq("group_id", groupId)
          .eq("user_id", peer.id)
          .select("user_id"),
        "owner updates peer muted",
      );
      const roleRows = unwrap(
        await owner.client
          .from("group_members")
          .update({ role: "admin" })
          .eq("group_id", groupId)
          .eq("user_id", peer.id)
          .select("user_id"),
        "owner updates peer role",
      );
      assert(mutedRows.length === 0 && roleRows.length === 0, "Owner pudo mutar membership ajena.");
      const peerMembership = unwrap(
        await admin
          .from("group_members")
          .select("muted,role")
          .eq("group_id", groupId)
          .eq("user_id", peer.id)
          .single(),
        "peer membership after forbidden updates",
      );
      assert(peerMembership.muted === false && peerMembership.role === "member", "Membership ajena cambio.");
    });

    await step("retry de momento confirmado sigue funcionando tras cierre", async () => {
      const retried = unwrap(
        await member.client.rpc("create_moment", {
          p_round_id: roundId,
          p_moment_id: memberMomentId,
          p_image_path: memberImagePath,
          p_caption: "Respuesta QA",
          p_drink_type: "refresco",
        }),
        "closed retry create_moment",
      );
      assert(retried === memberMomentId, "Retry post-cierre no confirmo el momento existente.");
    });

    await expectFailure("ronda cerrada no acepta nuevas reacciones", () =>
      member.client.rpc("toggle_reaction", {
        p_moment_id: ownerMoment.id,
        p_type: "wow",
      }),
    );

    await expectFailure("DELETE directo de reaccion permanece revocado", () =>
      member.client.from("reactions").delete().eq("id", reaction.id),
    );
    await step("reaccion cerrada permanece inmutable", async () => {
      const rows = unwrap(
        await admin.from("reactions").select("id").eq("id", reaction.id),
        "admin select reaction",
      );
      assert(rows.length === 1, "La reaccion cerrada se borro indebidamente.");
    });

    await step("bloquear usuario oculta filas y Storage entre ambos", async () => {
      unwrap(
        await owner.client.from("blocks").insert({
          blocker_id: owner.id,
          blocked_id: peer.id,
        }),
        "insert block",
      );
      const hiddenFromPeer = unwrap(
        await peer.client.from("moments").select("id").eq("id", ownerMoment.id),
        "peer blocked select",
      );
      const hiddenFromOwner = unwrap(
        await owner.client.from("moments").select("id").eq("id", peerMomentId),
        "owner blocked select",
      );
      assert(hiddenFromPeer.length === 0, "Peer aun ve contenido de owner bloqueador.");
      assert(hiddenFromOwner.length === 0, "Owner aun ve contenido de peer bloqueado.");
      await expectFailure("Storage tambien oculta objetos entre bloqueados", () =>
        peer.client.storage.from("moments").createSignedUrl(ownerImagePath, 60),
      );
      unwrap(
        await owner.client.from("blocks").delete().eq("blocker_id", owner.id).eq("blocked_id", peer.id),
        "remove block",
      );
    });

    await step("tres reportes ocultan globalmente y recomputan ganador", async () => {
      for (const reporter of [peer, third]) {
        unwrap(
          await reporter.client.rpc("report_moment", {
            p_moment_id: ownerMoment.id,
            p_reason: "privacy",
            p_details: "QA threshold",
          }),
          `report threshold ${reporter.username}`,
        );
      }
      const hidden = unwrap(
        await admin.from("moments").select("is_hidden").eq("id", ownerMoment.id).single(),
        "hidden after three reports",
      );
      assert(hidden.is_hidden === true, "Tres reportes no ocultaron el momento.");
      const closedRound = unwrap(
        await admin.from("rounds").select("winner_moment_id").eq("id", roundId).single(),
        "winner after moderation",
      );
      assert(closedRound.winner_moment_id && closedRound.winner_moment_id !== ownerMoment.id, "Ganador oculto no se recomputo.");
      const childRows = unwrap(
        await peer.client.from("reactions").select("id").eq("moment_id", ownerMoment.id),
        "hidden child reactions",
      );
      const voteRows = unwrap(
        await peer.client.from("photo_votes").select("id").eq("moment_id", ownerMoment.id),
        "hidden child votes",
      );
      assert(childRows.length === 0 && voteRows.length === 0, "Hijos de momento oculto filtraron datos.");
      await expectFailure("Storage global oculta objeto moderado", () =>
        peer.client.storage.from("moments").createSignedUrl(ownerImagePath, 60),
      );
    });

    await expectFailure("usuario ajeno no puede borrar un momento", () =>
      outsider.client.functions.invoke("delete-moment", { body: { momentId: memberMoment.id } }),
    );
    await expectFailure("DELETE directo de moments esta revocado", () =>
      member.client.from("moments").delete().eq("id", memberMoment.id),
    );
    await step("autor borra momento con cleanup Storage seguro", async () => {
      const result = unwrap(
        await member.client.functions.invoke("delete-moment", { body: { momentId: memberMoment.id } }),
        "author delete-moment",
      );
      assert(result.deleted === true && result.storageCleanupPending === false, "Delete-moment autor quedo incompleto.");
      const rows = unwrap(
        await admin.from("moments").select("id").eq("id", memberMoment.id),
        "deleted author moment",
      );
      assert(rows.length === 0, "RPC no borro el momento del autor.");
      const download = await admin.storage.from("moments").download(memberImagePath);
      assert(download.error, "Storage conservo la imagen borrada por autor.");
      const retry = unwrap(
        await member.client.functions.invoke("delete-moment", { body: { momentId: memberMoment.id } }),
        "retry author delete-moment",
      );
      assert(
        retry.deleted === true && retry.storageCleanupPending === false,
        "Un reintento tras respuesta perdida no fue idempotente.",
      );
      const receipts = unwrap(
        await admin
          .from("moment_storage_deletions")
          .select("moment_id,completed_at")
          .eq("moment_id", memberMoment.id),
        "completed author deletion receipt",
      );
      assert(
        receipts.length === 1 && receipts[0].completed_at,
        "Delete-moment no conservo recibo completado para reintentos.",
      );
      unwrap(
        await admin.from("moment_storage_deletions").delete().eq("moment_id", memberMoment.id),
        "cleanup author deletion receipt",
      );
    });
    await step("owner/admin puede borrar momento ajeno por el mismo contrato", async () => {
      const target = concurrentMemberMoments[0];
      const result = unwrap(
        await owner.client.functions.invoke("delete-moment", { body: { momentId: target.momentId } }),
        "admin delete-moment",
      );
      assert(result.deleted === true && result.storageCleanupPending === false, "Delete-moment admin quedo incompleto.");
      const rows = unwrap(
        await admin.from("moments").select("id").eq("id", target.momentId),
        "admin deleted member moment",
      );
      assert(rows.length === 0, "Owner no pudo borrar momento ajeno autorizado.");
      const receipts = unwrap(
        await admin
          .from("moment_storage_deletions")
          .select("moment_id,completed_at")
          .eq("moment_id", target.momentId),
        "completed admin deletion receipt",
      );
      assert(receipts.length === 1 && receipts[0].completed_at, "Delete-moment admin no completo su recibo.");
      unwrap(
        await admin.from("moment_storage_deletions").delete().eq("moment_id", target.momentId),
        "cleanup admin deletion receipt",
      );
    });

    const expiredRoundId = randomUUID();
    const expiredMomentId = randomUUID();
    const expiredImagePath = momentPath({
      groupId,
      roundId: expiredRoundId,
      userId: owner.id,
      momentId: expiredMomentId,
    });
    await step("miembro puede cerrar ronda expirada ajena", async () => {
      await uploadMomentImage(owner.client, expiredImagePath);
      unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: expiredRoundId,
          p_moment_id: expiredMomentId,
          p_image_path: expiredImagePath,
          p_caption: "Expirada",
          p_drink_type: "water",
        }),
        "create expired round",
      );
      const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const closesAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      unwrap(
        await admin.from("rounds").update({ created_at: createdAt, closes_at: closesAt }).eq("id", expiredRoundId),
        "expire member-close round",
      );
      const rows = unwrap(
        await member.client.rpc("close_round", { p_round_id: expiredRoundId }),
        "member closes expired round",
      );
      assert(rows[0]?.status === "closed", "Miembro no cerro ronda expirada.");
    });

    const cronRoundId = randomUUID();
    const cronMomentId = randomUUID();
    const cronImagePath = momentPath({
      groupId,
      roundId: cronRoundId,
      userId: owner.id,
      momentId: cronMomentId,
    });
    await step("cron esta registrado y cierre interno procesa expiradas", async () => {
      await uploadMomentImage(owner.client, cronImagePath);
      unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: cronRoundId,
          p_moment_id: cronMomentId,
          p_image_path: cronImagePath,
          p_caption: "Cron",
          p_drink_type: "water",
        }),
        "create cron round",
      );
      const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const closesAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      unwrap(
        await admin.from("rounds").update({ created_at: createdAt, closes_at: closesAt }).eq("id", cronRoundId),
        "expire cron round",
      );
      assert(queryLocalDatabase("select count(*) from cron.job where jobname = 'rondapp-close-expired-rounds';") === "1", "Cron de cierre no esta registrado una sola vez.");
      assert(Number(queryLocalDatabase("select private.close_expired_rounds();")) >= 1, "Funcion de cron no cerro ninguna ronda.");
      const round = unwrap(
        await admin.from("rounds").select("status,winner_moment_id").eq("id", cronRoundId).single(),
        "cron closed round",
      );
      assert(round.status === "closed" && round.winner_moment_id === cronMomentId, "Cierre automatico no eligio ganador.");
    });

    const tieRoundId = randomUUID();
    const tieOwnerMomentId = randomUUID();
    const tiePeerMomentId = randomUUID();
    const tieOwnerPath = momentPath({ groupId, roundId: tieRoundId, userId: owner.id, momentId: tieOwnerMomentId });
    const tiePeerPath = momentPath({ groupId, roundId: tieRoundId, userId: peer.id, momentId: tiePeerMomentId });
    await step("desempate final usa UUID de forma determinista", async () => {
      await uploadMomentImage(owner.client, tieOwnerPath);
      await uploadMomentImage(peer.client, tiePeerPath);
      unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: tieRoundId,
          p_moment_id: tieOwnerMomentId,
          p_image_path: tieOwnerPath,
          p_caption: "Tie owner",
          p_drink_type: "water",
        }),
        "create tie round",
      );
      unwrap(
        await peer.client.rpc("create_moment", {
          p_round_id: tieRoundId,
          p_moment_id: tiePeerMomentId,
          p_image_path: tiePeerPath,
          p_caption: "Tie peer",
          p_drink_type: "water",
        }),
        "create tie peer moment",
      );
      queryLocalDatabase(
        `set session_replication_role = replica; update public.moments set created_at = '2026-07-13T12:00:00Z' where id in ('${tieOwnerMomentId}','${tiePeerMomentId}'); set session_replication_role = origin;`,
      );
      const closed = unwrap(
        await owner.client.rpc("close_round", { p_round_id: tieRoundId }),
        "close tied round",
      );
      const expected = [tieOwnerMomentId, tiePeerMomentId].sort()[0];
      assert(closed[0]?.winner_moment_id === expected, "UUID final no resolvio empate determinista.");
    });

    const deletableGroupId = await step("outsider crea grupo que puede eliminar", async () =>
      unwrap(
        await outsider.client.rpc("create_group", { p_name: `Borrable ${runId}` }),
        "create deletable group",
      )
    );
    const deletableGroup = unwrap(
      await outsider.client
        .from("social_groups")
        .select("invite_code")
        .eq("id", deletableGroupId)
        .single(),
      "read deletable group",
    );
    await step("member entra al grupo que luego elimina el owner", async () => {
      const joinedGroupId = unwrap(
        await member.client.rpc("join_group_by_invite", {
          p_invite_code: deletableGroup.invite_code,
        }),
        "join deletable group",
      );
      assert(joinedGroupId === deletableGroupId, "Member entro en otro grupo borrable.");
    });
    const deletableRoundId = randomUUID();
    const deletableMomentId = randomUUID();
    const deletableImagePath = momentPath({
      groupId: deletableGroupId,
      roundId: deletableRoundId,
      userId: outsider.id,
      momentId: deletableMomentId,
    });
    await step("solo el propietario puede eliminar un grupo y sus fotos", async () => {
      await uploadMomentImage(outsider.client, deletableImagePath);
      unwrap(
        await outsider.client.rpc("create_round_with_moment", {
          p_group_id: deletableGroupId,
          p_round_id: deletableRoundId,
          p_moment_id: deletableMomentId,
          p_image_path: deletableImagePath,
          p_caption: "Grupo borrable",
          p_drink_type: "water",
        }),
        "create deletable group round",
      );

      const directError = await expectFailure("member no puede borrar grupo por RPC", () =>
        member.client.rpc("delete_owned_group", { p_group_id: deletableGroupId })
      );
      assert(
        directError.message.includes("only group owner can delete group"),
        "El RPC no rechazo al miembro con el motivo esperado.",
      );
      await expectFailure("member no puede borrar grupo por Edge Function", () =>
        member.client.functions.invoke("delete-group", {
          body: { groupId: deletableGroupId },
        })
      );
      const groupBeforeOwnerDelete = unwrap(
        await admin.from("social_groups").select("id").eq("id", deletableGroupId),
        "group after forbidden deletion",
      );
      assert(groupBeforeOwnerDelete.length === 1, "El miembro consiguio borrar el grupo.");

      const result = unwrap(
        await outsider.client.functions.invoke("delete-group", {
          body: { groupId: deletableGroupId },
        }),
        "owner delete-group",
      );
      assert(
        result.deleted === true && result.storageCleanupPending === false,
        "El borrado de grupo quedo incompleto.",
      );
      const groupAfterDelete = unwrap(
        await admin.from("social_groups").select("id").eq("id", deletableGroupId),
        "group after owner deletion",
      );
      assert(groupAfterDelete.length === 0, "El grupo sobrevivio al borrado del owner.");
      const download = await admin.storage.from("moments").download(deletableImagePath);
      assert(download.error, "La foto privada sobrevivio al borrado del grupo.");
      const pendingCleanup = unwrap(
        await admin
          .from("storage_cleanup_queue")
          .select("image_path")
          .eq("source", "group_deletion")
          .eq("source_id", deletableGroupId),
        "group deletion cleanup queue",
      );
      assert(pendingCleanup.length === 0, "El borrado exitoso dejo fotos en cola.");
    });

    const soloGroupId = await step("outsider crea grupo solo-owner para borrado", async () =>
      unwrap(await outsider.client.rpc("create_group", { p_name: `Solo ${runId}` }), "create solo group"),
    );
    const soloRoundId = randomUUID();
    const soloMomentId = randomUUID();
    const soloImagePath = momentPath({
      groupId: soloGroupId,
      roundId: soloRoundId,
      userId: outsider.id,
      momentId: soloMomentId,
    });
    await step("borrar cuenta solo-owner elimina su grupo y Storage", async () => {
      await uploadMomentImage(outsider.client, soloImagePath);
      unwrap(
        await outsider.client.rpc("create_round_with_moment", {
          p_group_id: soloGroupId,
          p_round_id: soloRoundId,
          p_moment_id: soloMomentId,
          p_image_path: soloImagePath,
          p_caption: "Solo owner",
          p_drink_type: "water",
        }),
        "create solo moment",
      );
      const result = unwrap(
        await outsider.client.functions.invoke("delete-account", { body: {} }),
        "delete solo-owner account",
      );
      assert(result.deleted === true, "Cuenta solo-owner no se borro.");
      const groups = unwrap(
        await admin.from("social_groups").select("id").eq("id", soloGroupId),
        "solo group after deletion",
      );
      assert(groups.length === 0, "Grupo sin reemplazo sobrevivio al borrado.");
      const download = await admin.storage.from("moments").download(soloImagePath);
      assert(download.error, "Storage del grupo eliminado sobrevivio.");
      const queue = unwrap(
        await admin.from("storage_cleanup_queue").select("image_path"),
        "queue after solo-owner deletion",
      );
      assert(queue.length === 0, "Cleanup exitoso dejo cola pendiente.");
    });

    await step("borrar owner transfiere grupo y conserva contenido de miembros", async () => {
      const replacement = unwrap(
        await admin
          .from("group_members")
          .select("user_id,joined_at")
          .eq("group_id", groupId)
          .neq("user_id", owner.id)
          .order("joined_at")
          .order("user_id")
          .limit(1)
          .single(),
        "deterministic replacement",
      );
      const preservedMoment = unwrap(
        await admin
          .from("moments")
          .select("id,image_path")
          .eq("id", peerMomentId)
          .single(),
        "preserved peer moment before delete",
      );
      const session = unwrap(await owner.client.auth.getSession(), "owner session before deletion");
      const result = unwrap(
        await owner.client.functions.invoke("delete-account", { body: {} }),
        "delete owner account",
      );
      assert(result.deleted === true, "Owner no se borro.");
      const groupAfter = unwrap(
        await admin.from("social_groups").select("owner_id").eq("id", groupId).single(),
        "group after owner deletion",
      );
      assert(groupAfter.owner_id === replacement.user_id, "Ownership no se transfirio deterministamente.");
      const roundAfter = unwrap(
        await admin.from("rounds").select("created_by").eq("id", roundId).single(),
        "round after creator deletion",
      );
      assert(roundAfter.created_by === null, "Ronda conservada no anonimizo created_by.");
      const preservedAfter = unwrap(
        await admin.from("moments").select("image_path").eq("id", preservedMoment.id).single(),
        "peer moment after owner deletion",
      );
      assert(preservedAfter.image_path === preservedMoment.image_path, "Momento ajeno se perdio al borrar owner.");
      const peerDownload = await admin.storage.from("moments").download(peerImagePath);
      assert(!peerDownload.error, "Storage ajeno se elimino al borrar owner.");
      const ownerDownload = await admin.storage.from("moments").download(ownerImagePath);
      assert(ownerDownload.error, "Storage propio del owner sobrevivio.");
      const authAfter = await admin.auth.getUser(session.session.access_token);
      assert(authAfter.error, "Sesion del usuario borrado sigue valida.");
      const queue = unwrap(
        await admin.from("storage_cleanup_queue").select("image_path"),
        "queue after owner deletion",
      );
      assert(queue.length === 0, "Borrado exitoso dejo rutas pendientes en cola.");
    });

    console.log("PASS Supabase local QA multiusuario completado.");
  } finally {
    await cleanup(admin);
  }
}

main().catch((error) => {
  console.error("FAIL Supabase local QA");
  console.error(error);
  process.exitCode = 1;
});
