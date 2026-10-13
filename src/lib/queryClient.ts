import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const currentState = AppState.currentState;
    if (currentState) {
      setFocused(currentState === "active");
    }

    const subscription = AppState.addEventListener("change", (state) => {
      setFocused(state === "active");
    });

    return () => subscription.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

let queryReset = Promise.resolve();

export function resetQueryCache() {
  queryReset = queryReset
    .catch(() => undefined)
    .then(async () => {
      await queryClient.cancelQueries().catch(() => undefined);
      queryClient.clear();
    });

  return queryReset;
}

export const userQueryKeys = {
  all: (userId: string) => ["user", userId] as const,
  profile: (userId: string) => ["user", userId, "profile"] as const,
  groups: (userId: string) => ["user", userId, "groups"] as const,
  group: (userId: string, groupId: string) =>
    ["user", userId, "group", groupId] as const,
  groupMembers: (userId: string, groupId: string) =>
    ["user", userId, "group-members", groupId] as const,
  activeRounds: (userId: string, groupId?: string) =>
    ["user", userId, "rounds", "active", groupId] as const,
  recentRounds: (userId: string, groupId: string) =>
    ["user", userId, "rounds", "recent", groupId] as const,
  round: (userId: string, roundId: string) =>
    ["user", userId, "round", roundId] as const,
  moments: (userId: string, roundId: string) =>
    ["user", userId, "moments", roundId] as const,
  moment: (userId: string, momentId: string) =>
    ["user", userId, "moment", momentId] as const,
  leaderboardRoot: (userId: string, groupId: string) =>
    ["user", userId, "leaderboard", groupId] as const,
  leaderboard: (userId: string, groupId: string, weekStart: string) =>
    ["user", userId, "leaderboard", groupId, weekStart] as const,
  profileStats: (userId: string) => ["user", userId, "profile-stats"] as const,
};
