import type { Session } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ensureProfileForSession, fetchProfile } from "@/features/auth/api";
import {
  resumeDeviceTokenRegistration,
  suspendDeviceTokenRegistration,
  unregisterDeviceToken,
} from "@/features/notifications/api";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { resetQueryCache } from "@/lib/queryClient";
import {
  clearLocalSupabaseSession,
  revokeSupabaseSession,
  supabase,
} from "@/lib/supabase";
import type { AuthContextValue, Profile } from "@/types/domain";

const AuthContext = createContext<AuthContextValue | null>(null);

function asError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const activeUserIdRef = useRef<string | null | undefined>(undefined);
  const sessionTransitionRef = useRef(0);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    const transition = sessionTransitionRef.current;
    setProfileError(null);
    try {
      const nextProfile = await fetchProfile(userId);
      if (
        transition !== sessionTransitionRef.current ||
        activeUserIdRef.current !== userId
      ) {
        return;
      }
      setProfile(nextProfile);
    } catch (error) {
      if (
        transition !== sessionTransitionRef.current ||
        activeUserIdRef.current !== userId
      ) {
        return;
      }
      setProfileError(asError(error, "No hemos podido cargar tu perfil."));
      throw error;
    }
  }, [session]);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const transition = ++sessionTransitionRef.current;
    const nextUserId = nextSession?.user.id ?? null;
    const identityChanged = activeUserIdRef.current !== nextUserId;

    if (nextUserId) {
      resumeDeviceTokenRegistration(nextUserId);
    } else {
      suspendDeviceTokenRegistration();
    }

    if (identityChanged) {
      setIsLoading(true);
      setProfile(null);
      setProfileError(null);
      await resetQueryCache();
      if (transition !== sessionTransitionRef.current) return;
      activeUserIdRef.current = nextUserId;
    }

    if (transition !== sessionTransitionRef.current) return;
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setProfileError(null);
      setIsLoading(false);
      return;
    }

    try {
      const nextProfile = await ensureProfileForSession(nextSession);
      if (transition === sessionTransitionRef.current) {
        setProfile(nextProfile);
        setProfileError(null);
      }
    } catch (error) {
      if (transition === sessionTransitionRef.current) {
        setProfileError(asError(error, "No hemos podido cargar tu perfil."));
        logger.warn("No hemos podido cargar el perfil de la sesión.");
      }
    } finally {
      if (transition === sessionTransitionRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const retryAuth = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applySession(data.session);
    } catch (error) {
      setProfileError(asError(error, "No hemos podido recuperar tu sesión."));
      setIsLoading(false);
      throw error;
    }
  }, [applySession]);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      const nextUserId = nextSession?.user.id ?? null;
      if (nextUserId) {
        resumeDeviceTokenRegistration(nextUserId);
      } else {
        suspendDeviceTokenRegistration();
      }
      if (activeUserIdRef.current !== nextUserId) {
        setIsLoading(true);
        setProfile(null);
        setProfileError(null);
      }
      setSession(nextSession);
      setTimeout(() => {
        if (active) void applySession(nextSession);
      }, 0);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!active || authEventReceived) return;
        return applySession(data.session);
      })
      .catch((error) => {
        if (!active || authEventReceived) return;
        logger.warn("No hemos podido recuperar la sesión guardada.");
        setProfileError(asError(error, "No hemos podido recuperar tu sesión."));
        setIsLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const accessToken = session?.access_token;
    if (accessToken) {
      // Both operations use the captured JWT and continue independently of
      // local storage. Neither can block an offline logout.
      void unregisterDeviceToken(accessToken).catch(() => {
        logger.warn("No hemos podido desvincular las notificaciones antes de salir.");
      });
      void revokeSupabaseSession(accessToken).catch(() => {
        logger.warn("No hemos podido revocar la sesión remota al salir.");
      });
    } else {
      suspendDeviceTokenRegistration();
    }

    // Public auth.signOut({ scope: "local" }) is network-first. Clear the
    // persisted session immediately so logout also works fully offline.
    await clearLocalSupabaseSession();
    await applySession(null);
  }, [applySession, session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      isLoading,
      refreshProfile,
      retryAuth,
      signOut,
    }),
    [isLoading, profile, profileError, refreshProfile, retryAuth, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.use(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
