import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";

import {
  closeRound,
  createMoment,
  createRoundWithMoment,
  deleteMoment,
  getRound,
  getRoundMoments,
  listActiveRounds,
  listRecentRounds,
  toggleRoundStar,
  toggleReaction,
  type PublicationPhase,
} from "@/features/rounds/api";
import type { ReactionType } from "@/constants/reactions";
import { isSupabaseConfigured } from "@/lib/env";
import { userQueryKeys } from "@/lib/queryClient";
import type { Moment, MomentWithStats, Round } from "@/types/domain";

function notifyRollback() {
  if (process.env.EXPO_OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

function updateReactionOptimistically(
  moments: MomentWithStats[] | undefined,
  targetMomentId: string,
  type: ReactionType,
) {
  return moments?.map((moment) => {
    if (moment.id !== targetMomentId) return moment;

    const previousType = Object.entries(moment.hasMyReaction).find(
      ([, selected]) => selected,
    )?.[0] as ReactionType | undefined;
    const removing = previousType === type;
    const reactionCounts = { ...moment.reactionCounts };

    if (previousType) {
      reactionCounts[previousType] = Math.max(0, reactionCounts[previousType] - 1);
    }
    if (!removing) {
      reactionCounts[type] += 1;
    }

    return {
      ...moment,
      reactionCounts,
      hasMyReaction: Object.fromEntries(
        Object.keys(moment.hasMyReaction).map((reactionType) => [
          reactionType,
          !removing && reactionType === type,
        ]),
      ) as Record<ReactionType, boolean>,
    };
  });
}

function updateStarOptimistically(
  moments: MomentWithStats[] | undefined,
  targetMomentId: string,
) {
  if (!moments) return moments;

  const previousMomentId = moments.find((moment) => moment.myFoton)?.id;
  const removing = previousMomentId === targetMomentId;

  return moments.map((moment) => {
    const wasSelected = moment.id === previousMomentId;
    const willBeSelected = !removing && moment.id === targetMomentId;
    let fotonCount = moment.fotonCount;

    if (wasSelected) fotonCount = Math.max(0, fotonCount - 1);
    if (willBeSelected) fotonCount += 1;

    return {
      ...moment,
      fotonCount,
      myFoton: willBeSelected,
    };
  });
}

function invalidateRoundPreviews(
  queryClient: QueryClient,
  userId: string,
  groupId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: userQueryKeys.activeRounds(userId),
  });
  void queryClient.invalidateQueries({
    queryKey: userQueryKeys.activeRounds(userId, groupId),
  });
  void queryClient.invalidateQueries({
    queryKey: userQueryKeys.recentRounds(userId, groupId),
  });
}

function invalidateRoundMetrics(
  queryClient: QueryClient,
  userId: string,
  groupId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: userQueryKeys.leaderboardRoot(userId, groupId),
  });
  void queryClient.invalidateQueries({
    queryKey: userQueryKeys.profileStats(userId),
  });
}

export function useActiveRounds(userId?: string, groupId?: string) {
  return useQuery({
    queryKey: userId
      ? userQueryKeys.activeRounds(userId, groupId)
      : ["user", "missing", "rounds", "active"],
    queryFn: () => listActiveRounds(groupId),
    enabled: Boolean(isSupabaseConfigured && userId),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useRecentRounds(groupId?: string, userId?: string) {
  return useQuery({
    queryKey: groupId && userId
      ? userQueryKeys.recentRounds(userId, groupId)
      : ["user", "missing", "rounds", "recent"],
    queryFn: () => listRecentRounds(groupId!),
    enabled: Boolean(isSupabaseConfigured && groupId && userId),
  });
}

export function useRound(roundId?: string, userId?: string) {
  return useQuery({
    queryKey: roundId && userId
      ? userQueryKeys.round(userId, roundId)
      : ["user", "missing", "round"],
    queryFn: () => getRound(roundId!),
    enabled: Boolean(isSupabaseConfigured && roundId && userId),
  });
}

export function useRoundMoments(roundId?: string, userId?: string) {
  return useQuery({
    queryKey: roundId && userId
      ? userQueryKeys.moments(userId, roundId)
      : ["user", "missing", "moments"],
    queryFn: () => getRoundMoments(roundId!, userId!),
    enabled: Boolean(isSupabaseConfigured && roundId && userId),
  });
}

export function useCreateRound(userId?: string) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<PublicationPhase | null>(null);
  const mutation = useMutation({
    mutationFn: (input: {
      roundId: string;
      momentId: string;
      groupId: string;
      imageUri: string;
      caption?: string;
      drinkType?: string | null;
    }) => createRoundWithMoment({ ...input, userId: userId! }, setPhase),
    onMutate: () => setPhase("compressing"),
    onSuccess: (roundId, input) => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.round(userId, roundId),
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moments(userId, roundId),
      });
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.groups(userId) });
      invalidateRoundPreviews(queryClient, userId, input.groupId);
      invalidateRoundMetrics(queryClient, userId, input.groupId);
    },
    onSettled: () => setPhase(null),
  });

  return { ...mutation, phase };
}

export function useCreateMoment(userId?: string) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<PublicationPhase | null>(null);
  const mutation = useMutation({
    mutationFn: (input: {
      momentId: string;
      roundId: string;
      groupId: string;
      imageUri: string;
      caption?: string;
      drinkType?: string | null;
    }) => createMoment({ ...input, userId: userId! }, setPhase),
    onMutate: () => setPhase("compressing"),
    onSuccess: (moment) => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moments(userId, moment.round_id),
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moment(userId, moment.id),
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.round(userId, moment.round_id),
      });
      invalidateRoundPreviews(queryClient, userId, moment.group_id);
      invalidateRoundMetrics(queryClient, userId, moment.group_id);
    },
    onSettled: () => setPhase(null),
  });

  return { ...mutation, phase };
}

export function useToggleReaction(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { moment: MomentWithStats; type: Parameters<typeof toggleReaction>[0]["type"] }) =>
      toggleReaction({ moment: input.moment, type: input.type, userId: userId! }),
    onMutate: async (input) => {
      const queryKey = userQueryKeys.moments(userId!, input.moment.round_id);
      await queryClient.cancelQueries({ queryKey });
      const previousMoments = queryClient.getQueryData<MomentWithStats[]>(queryKey);
      queryClient.setQueryData<MomentWithStats[]>(queryKey, (moments) =>
        updateReactionOptimistically(moments, input.moment.id, input.type),
      );
      return { previousMoments };
    },
    onError: (_error, input, context) => {
      if (context?.previousMoments) {
        queryClient.setQueryData(
          userQueryKeys.moments(userId!, input.moment.round_id),
          context.previousMoments,
        );
      }
      notifyRollback();
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.moments(userId!, input.moment.round_id) });
      queryClient.invalidateQueries({
        queryKey: userQueryKeys.leaderboardRoot(userId!, input.moment.group_id),
      });
    },
  });
}

export function useToggleRoundStar(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moment: MomentWithStats) => toggleRoundStar({ moment, userId: userId! }),
    onMutate: async (moment) => {
      const queryKey = userQueryKeys.moments(userId!, moment.round_id);
      await queryClient.cancelQueries({ queryKey });
      const previousMoments = queryClient.getQueryData<MomentWithStats[]>(queryKey);
      queryClient.setQueryData<MomentWithStats[]>(queryKey, (moments) =>
        updateStarOptimistically(moments, moment.id),
      );
      return { previousMoments };
    },
    onError: (_error, moment, context) => {
      if (context?.previousMoments) {
        queryClient.setQueryData(userQueryKeys.moments(userId!, moment.round_id), context.previousMoments);
      }
      notifyRollback();
    },
    onSettled: (_data, _error, moment) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.moments(userId!, moment.round_id) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.leaderboardRoot(userId!, moment.group_id) });
    },
  });
}

export function useCloseRound(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeRound,
    onMutate: (roundId) => {
      if (!userId) return;
      const round = queryClient.getQueryData<Round>(
        userQueryKeys.round(userId, roundId),
      );
      return { groupId: round?.group_id };
    },
    onSuccess: (_data, roundId, context) => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.round(userId, roundId),
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moments(userId, roundId),
      });

      if (context?.groupId) {
        invalidateRoundPreviews(queryClient, userId, context.groupId);
        invalidateRoundMetrics(queryClient, userId, context.groupId);
      } else {
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.all(userId),
        });
      }
    },
  });
}

export function useDeleteMoment(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moment: Moment) => deleteMoment({ moment, userId: userId! }),
    onSettled: (_data, _error, moment) => {
      if (!userId) return;
      // A lost Edge Function response is ambiguous: the server may already
      // have deleted the row. Reconcile every related cache either way.
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moment(userId, moment.id),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.moments(userId, moment.round_id),
      });
      void queryClient.invalidateQueries({
        queryKey: userQueryKeys.round(userId, moment.round_id),
      });
      invalidateRoundPreviews(queryClient, userId, moment.group_id);
      invalidateRoundMetrics(queryClient, userId, moment.group_id);
    },
  });
}
