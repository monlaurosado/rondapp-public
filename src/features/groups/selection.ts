import "expo-sqlite/localStorage/install";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { MyGroup } from "@/types/domain";

const listeners = new Map<string, Set<() => void>>();

function storageKey(userId: string) {
  return `rondapp:last-group:${userId}`;
}

function readSelection(key: string) {
  return localStorage.getItem(key);
}

function writeSelection(key: string, groupId: string | null) {
  if (groupId) {
    localStorage.setItem(key, groupId);
  } else {
    localStorage.removeItem(key);
  }

  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  return () => {
    keyListeners.delete(listener);
    if (keyListeners.size === 0) listeners.delete(key);
  };
}

export function useGroupSelection(userId: string | undefined, groups: MyGroup[]) {
  const key = userId ? storageKey(userId) : "rondapp:last-group:anonymous";
  const storedGroupId = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => readSelection(key),
    () => null,
  );

  const onlyGroupId = groups.length === 1 ? groups[0]?.group_id ?? null : null;
  const storedSelectionIsValid = groups.some(
    (membership) => membership.group_id === storedGroupId,
  );
  const selectedGroupId = onlyGroupId ?? (storedSelectionIsValid ? storedGroupId : null);

  useEffect(() => {
    if (!userId || !onlyGroupId || storedGroupId === onlyGroupId) return;
    writeSelection(key, onlyGroupId);
  }, [key, onlyGroupId, storedGroupId, userId]);

  const selectGroup = useCallback(
    (groupId: string) => {
      if (!userId || !groups.some((membership) => membership.group_id === groupId)) return;
      writeSelection(key, groupId);
    },
    [groups, key, userId],
  );

  return { selectedGroupId, selectGroup };
}
