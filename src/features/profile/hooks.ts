import { useQuery } from "@tanstack/react-query";

import { getMyProfileStats } from "@/features/profile/api";
import { isSupabaseConfigured } from "@/lib/env";
import { userQueryKeys } from "@/lib/queryClient";

export function useMyProfileStats(userId?: string) {
  return useQuery({
    queryKey: userId
      ? userQueryKeys.profileStats(userId)
      : ["user", "missing", "profile-stats"],
    queryFn: getMyProfileStats,
    enabled: Boolean(isSupabaseConfigured && userId),
  });
}
