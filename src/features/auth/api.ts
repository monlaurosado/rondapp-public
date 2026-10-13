import {
  FunctionsFetchError,
  FunctionsRelayError,
  type Session,
} from "@supabase/supabase-js";

import { getAuthRedirectUrl } from "@/lib/deep-links";
import { requireSupabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";

const PROFILE_REQUEST_TIMEOUT_MS = 15_000;
const ACCOUNT_DELETION_TIMEOUT_MS = 30_000;

export async function signInWithEmail(email: string, password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string, nextPath?: string | null) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(nextPath),
      data: {
        app_name: "Rondapp",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resendSignupConfirmation(email: string, nextPath?: string | null) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: getAuthRedirectUrl(nextPath),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchProfile(userId: string) {
  const supabase = requireSupabase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROFILE_REQUEST_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .abortSignal(controller.signal)
      .maybeSingle();

    if (controller.signal.aborted) {
      throw new Error("La carga del perfil ha agotado el tiempo de espera.");
    }
    if (error) {
      throw error;
    }

    return data as Profile | null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function ensureProfileForSession(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  return fetchProfile(session.user.id);
}

export async function confirmAge(userId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        is_age_confirmed: true,
        accepted_terms_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function upsertProfile(input: {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.userId,
        username: input.username.trim().toLowerCase(),
        display_name: input.displayName.trim(),
        avatar_url: input.avatarUrl ?? null,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function deleteCurrentAccount() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean;
    storageCleanupPending?: boolean;
  }>("delete-account", {
    body: {},
    timeout: ACCOUNT_DELETION_TIMEOUT_MS,
  });

  if (error) {
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      return {
        status: "unconfirmed" as const,
        storageCleanupPending: true,
      };
    }
    throw error;
  }

  if (!data?.deleted) {
    throw new Error("No hemos podido confirmar que la cuenta se haya borrado.");
  }

  return {
    status: "deleted" as const,
    storageCleanupPending: data.storageCleanupPending === true,
  };
}

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.is_age_confirmed && profile.username && profile.display_name);
}
