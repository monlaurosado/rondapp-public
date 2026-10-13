import { requireSupabase } from "@/lib/supabase";
import type { GroupMember, MyGroup, Profile, SocialGroup } from "@/types/domain";

type GroupMemberRow = GroupMember & {
  group: SocialGroup | null;
};

const GROUP_DELETION_TIMEOUT_MS = 30_000;

export async function listMyGroups(userId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,muted,joined_at,group:social_groups(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as GroupMemberRow[])
    .filter((row) => row.group)
    .map((row) => ({ ...row, group: row.group! })) as MyGroup[];
}

export async function getGroup(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("social_groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No tienes acceso a este grupo o ya no existe.");
  }

  return data as SocialGroup;
}

export async function getGroupMembers(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,muted,joined_at,profile:profiles(*)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as (GroupMember & { profile: Profile | null })[];
}

export async function createGroup(input: { name: string }) {
  const supabase = requireSupabase();
  const name = input.name.trim();
  const { data: groupId, error } = await supabase.rpc("create_group", {
    p_name: name,
  });

  if (error) {
    throw error;
  }

  if (!groupId) {
    throw new Error("No hemos recibido el grupo creado.");
  }

  return getGroup(groupId as string);
}

export async function deleteGroup(groupId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean;
    storageCleanupPending?: boolean;
    error?: string;
  }>("delete-group", {
    body: { groupId },
    timeout: GROUP_DELETION_TIMEOUT_MS,
  });

  if (error) {
    throw error;
  }
  if (!data?.deleted) {
    throw new Error(data?.error ?? "No hemos podido confirmar que el grupo se ha eliminado.");
  }

  return { storageCleanupPending: data.storageCleanupPending === true };
}

export async function joinGroupByCode(inviteCode: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("join_group_by_invite", {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function setGroupMuted(input: {
  groupId: string;
  userId: string;
  muted: boolean;
}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("group_members")
    .update({ muted: input.muted })
    .eq("group_id", input.groupId)
    .eq("user_id", input.userId)
    .select("group_id,muted")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.muted !== input.muted) {
    throw new Error("No hemos podido actualizar las notificaciones de este grupo.");
  }

  return data;
}
