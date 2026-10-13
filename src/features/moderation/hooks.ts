import { useMutation, useQueryClient } from "@tanstack/react-query";

import { blockUser, reportMoment } from "@/features/moderation/api";
import { userQueryKeys } from "@/lib/queryClient";
import type { Moment } from "@/types/domain";

export function useReportMoment(reporterId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { moment: Moment; reason: string; details?: string }) =>
      reportMoment({ ...input, reporterId: reporterId! }),
    onSuccess: (_data, input) => {
      if (reporterId) {
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.moments(reporterId, input.moment.round_id),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.moment(reporterId, input.moment.id),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.round(reporterId, input.moment.round_id),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.activeRounds(reporterId),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.activeRounds(reporterId, input.moment.group_id),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.recentRounds(reporterId, input.moment.group_id),
        });
        void queryClient.invalidateQueries({
          queryKey: userQueryKeys.leaderboardRoot(reporterId, input.moment.group_id),
        });
      }
    },
  });
}

export function useBlockUser(blockerId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedId: string) => blockUser({ blockerId: blockerId!, blockedId }),
    onSuccess: () => {
      if (blockerId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.all(blockerId) });
      }
    },
  });
}
