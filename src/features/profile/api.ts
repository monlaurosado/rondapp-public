import { requireSupabase } from "@/lib/supabase";

export type MyProfileStats = {
  total_moments: number;
  total_with_drink: number;
  by_drink: Record<string, number>;
};

type RawProfileStats = {
  total_moments?: number | string | null;
  total_with_drink?: number | string | null;
  by_drink?: Record<string, number | string> | null;
};

export async function getMyProfileStats(): Promise<MyProfileStats> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_my_profile_stats");

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as RawProfileStats | null;
  const byDrink = Object.fromEntries(
    Object.entries(row?.by_drink ?? {}).map(([drinkType, count]) => [
      drinkType,
      Number(count) || 0,
    ]),
  );

  return {
    total_moments: Number(row?.total_moments) || 0,
    total_with_drink: Number(row?.total_with_drink) || 0,
    by_drink: byDrink,
  };
}
