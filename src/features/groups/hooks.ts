import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGroup,
  deleteGroup,
  getGroup,
  getGroupMembers,
  joinGroupByCode,
  listMyGroups,
  setGroupMuted,
} from "@/features/groups/api";
import { isSupabaseConfigured } from "@/lib/env";
import { userQueryKeys } from "@/lib/queryClient";

export function useMyGroups(userId?: string) {
  return useQuery({
    queryKey: userId ? userQueryKeys.groups(userId) : ["user", "missing", "groups"],
    queryFn: () => listMyGroups(userId!),
    enabled: Boolean(isSupabaseConfigured && userId),
  });
}

export function useGroup(groupId?: string, userId?: string) {
  return useQuery({
    queryKey: groupId && userId
      ? userQueryKeys.group(userId, groupId)
      : ["user", "missing", "group"],
    queryFn: () => getGroup(groupId!),
    enabled: Boolean(isSupabaseConfigured && groupId && userId),
  });
}

export function useGroupMembers(groupId?: string, userId?: string) {
  return useQuery({
    queryKey: groupId && userId
      ? userQueryKeys.groupMembers(userId, groupId)
      : ["user", "missing", "group-members"],
    queryFn: () => getGroupMembers(groupId!),
    enabled: Boolean(isSupabaseConfigured && groupId && userId),
  });
}

export function useCreateGroup(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!userId) {
        throw new Error("Necesitas iniciar sesión.");
      }
      return createGroup({ name });
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.groups(userId) });
      }
    },
  });
}

export function useJoinGroup(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinGroupByCode,
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.groups(userId) });
      }
    },
  });
}

export function useDeleteGroup(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => {
      if (!userId) {
        throw new Error("Necesitas iniciar sesión.");
      }
      return deleteGroup(groupId);
    },
    onSuccess: (_result, groupId) => {
      if (!userId) return;
      queryClient.removeQueries({
        queryKey: userQueryKeys.group(userId, groupId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: userQueryKeys.groupMembers(userId, groupId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: userQueryKeys.recentRounds(userId, groupId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: userQueryKeys.activeRounds(userId, groupId),
        exact: true,
      });
    },
    onSettled: () => {
      if (userId) {
        // A lost Edge Function response may still mean the group was deleted.
        // Reconcile all user-scoped lists after either outcome.
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.all(userId) });
      }
    },
  });
}

export function useSetGroupMuted(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { groupId: string; muted: boolean }) =>
      setGroupMuted({ ...input, userId: userId! }),
    onSuccess: (_data, input) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.groups(userId) });
        queryClient.invalidateQueries({ queryKey: userQueryKeys.group(userId, input.groupId) });
      }
    },
  });
}
