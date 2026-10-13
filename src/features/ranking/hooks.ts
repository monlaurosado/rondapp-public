import { focusManager, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getWeeklyLeaderboard } from "@/features/ranking/api";
import { getWeekStart, toISODate } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import { userQueryKeys } from "@/lib/queryClient";

type WeekWindow = {
  start: Date;
  key: string;
};

function getCurrentWeekWindow(): WeekWindow {
  const start = getWeekStart();
  return { start, key: toISODate(start) };
}

function useCurrentWeekWindow() {
  const [week, setWeek] = useState(getCurrentWeekWindow);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const syncAndSchedule = () => {
      const currentWeek = getCurrentWeekWindow();
      setWeek((previousWeek) =>
        previousWeek.key === currentWeek.key ? previousWeek : currentWeek,
      );

      if (timer) clearTimeout(timer);
      const nextWeekStart = new Date(currentWeek.start);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const delay = Math.max(1_000, nextWeekStart.getTime() - Date.now() + 1_000);
      timer = setTimeout(syncAndSchedule, delay);
    };

    syncAndSchedule();
    const unsubscribe = focusManager.subscribe((focused) => {
      if (focused) syncAndSchedule();
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return week;
}

export function useWeeklyLeaderboard(groupId?: string, userId?: string) {
  const week = useCurrentWeekWindow();

  return useQuery({
    queryKey: groupId && userId
      ? userQueryKeys.leaderboard(userId, groupId, week.key)
      : ["user", "missing", "leaderboard"],
    queryFn: () => getWeeklyLeaderboard(groupId!, week.start),
    enabled: Boolean(isSupabaseConfigured && groupId && userId),
  });
}
