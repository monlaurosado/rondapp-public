import { getWeekStart, toISODate } from "@/lib/dates";
import { requireSupabase } from "@/lib/supabase";
import type { LeaderboardRow } from "@/types/domain";

export async function getWeeklyLeaderboard(groupId: string, weekStart = getWeekStart()) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_weekly_leaderboard", {
    p_group_id: groupId,
    p_week_start: toISODate(weekStart),
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as LeaderboardRow[];
}
