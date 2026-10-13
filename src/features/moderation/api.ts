import { requireSupabase } from "@/lib/supabase";
import type { Moment } from "@/types/domain";

export async function reportMoment(input: {
  moment: Moment;
  reporterId: string;
  reason: string;
  details?: string;
}) {
  if (input.moment.user_id === input.reporterId) {
    throw new Error("No puedes reportar tu propio momento.");
  }

  const supabase = requireSupabase();
  const { error } = await supabase.rpc("report_moment", {
    p_moment_id: input.moment.id,
    p_reason: input.reason,
    p_details: input.details?.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function blockUser(input: { blockerId: string; blockedId: string }) {
  if (input.blockerId === input.blockedId) {
    throw new Error("No puedes bloquearte a ti mismo.");
  }

  const supabase = requireSupabase();
  const { error } = await supabase.from("blocks").insert({
    blocker_id: input.blockerId,
    blocked_id: input.blockedId,
  });

  if (error) {
    throw error;
  }
}
