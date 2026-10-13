import { QueryClientProvider } from "@tanstack/react-query";
import { Redirect, useGlobalSearchParams, usePathname } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/feedback/error-boundary";
import { ToastProvider } from "@/components/feedback/toast";
import { Screen } from "@/components/ui/screen";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { colors } from "@/constants/theme";
import { isProfileComplete } from "@/features/auth/api";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { configureNotifications } from "@/features/notifications/api";
import {
  useNotificationResponseRouter,
  useRegisterPushToken,
} from "@/features/notifications/hooks";
import { NetworkStatusProvider } from "@/features/network/network-status";
import { PwaInstallProvider } from "@/features/pwa/pwa-install";
import { getErrorMessage } from "@/lib/errors";
import {
  buildNextParams,
  clearPendingAuthNextPath,
  getPendingAuthNextPath,
  normalizeNextPath,
} from "@/lib/navigation";
import { queryClient } from "@/lib/queryClient";

configureNotifications();
WebBrowser.maybeCompleteAuthSession();

const PUBLIC_PATHS = new Set([
  "/onboarding",
  "/login",
  "/register",
  "/check-email",
  "/auth/callback",
  "/community-guidelines",
  "/privacy",
  "/support",
  "/terms",
]);

const AUTH_ENTRY_PATHS = new Set([
  "/onboarding",
  "/login",
  "/register",
  "/check-email",
  "/age-gate",
  "/complete-profile",
]);

const LEGAL_OR_CALLBACK_PATHS = new Set([
  "/auth/callback",
  "/community-guidelines",
  "/privacy",
  "/support",
  "/terms",
]);

function AppShell() {
  const { user, profile, profileError, isLoading, retryAuth } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ next?: string | string[] }>();
  useRegisterPushToken(profile?.is_age_confirmed ? user?.id : undefined);
  useNotificationResponseRouter(user?.id, !isLoading);

  useEffect(() => {
    // Keeps this component mounted for notification and push-token hooks.
  }, []);

  useEffect(() => {
    if (
      user &&
      profile?.is_age_confirmed &&
      isProfileComplete(profile) &&
      !AUTH_ENTRY_PATHS.has(pathname)
    ) {
      clearPendingAuthNextPath();
    }
  }, [pathname, profile, user]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Preparando tu ronda..." />
      </Screen>
    );
  }

  if (profileError) {
    return (
      <Screen>
        <ErrorState
          message={getErrorMessage(
            profileError,
            "No hemos podido recuperar tu sesión. Comprueba la conexión e inténtalo de nuevo.",
          )}
          onRetry={() => {
            retryAuth().catch(() => undefined);
          }}
        />
      </Screen>
    );
  }

  const nextPath = normalizeNextPath(pathname);
  const requestedNextPath = normalizeNextPath(params.next);
  const guardedNextPath = requestedNextPath ?? getPendingAuthNextPath() ?? nextPath;
  if (!user && pathname !== "/" && !PUBLIC_PATHS.has(pathname)) {
    return (
      <Redirect
        href={{ pathname: "/login", params: buildNextParams(requestedNextPath ?? nextPath) }}
      />
    );
  }

  if (user && pathname === "/auth/callback") {
    if (!profile?.is_age_confirmed) {
      return (
        <Redirect
          href={{ pathname: "/age-gate", params: buildNextParams(requestedNextPath) }}
        />
      );
    }
    if (!isProfileComplete(profile)) {
      return (
        <Redirect
          href={{ pathname: "/complete-profile", params: buildNextParams(requestedNextPath) }}
        />
      );
    }
    return <Redirect href={requestedNextPath ?? "/home"} />;
  }

  if (
    user &&
    !profile?.is_age_confirmed &&
    pathname !== "/age-gate" &&
    !LEGAL_OR_CALLBACK_PATHS.has(pathname)
  ) {
    return <Redirect href={{ pathname: "/age-gate", params: buildNextParams(guardedNextPath) }} />;
  }

  if (
    user &&
    profile?.is_age_confirmed &&
    !isProfileComplete(profile) &&
    pathname !== "/complete-profile" &&
    !LEGAL_OR_CALLBACK_PATHS.has(pathname)
  ) {
    return <Redirect href={{ pathname: "/complete-profile", params: buildNextParams(guardedNextPath) }} />;
  }

  if (user && isProfileComplete(profile) && AUTH_ENTRY_PATHS.has(pathname)) {
    const readyDestination = guardedNextPath && guardedNextPath !== pathname
      ? guardedNextPath
      : "/home";
    return <Redirect href={readyDestination} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen
          name="capture"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "fade",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="group/[groupId]" options={{ headerShown: true, title: "Grupo" }} />
        <Stack.Screen name="round/[roundId]" options={{ headerShown: true, title: "Ronda" }} />
        <Stack.Screen name="moment/[momentId]" options={{ headerShown: true, title: "Momento" }} />
        <Stack.Screen name="join/[inviteCode]" options={{ headerShown: true, title: "Unirse" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Ajustes" }} />
        <Stack.Screen
          name="modals/create-group"
          options={{ headerShown: true, title: "Crear grupo", presentation: "modal" }}
        />
        <Stack.Screen
          name="modals/join-group"
          options={{ headerShown: true, title: "Unirme", presentation: "modal" }}
        />
        <Stack.Screen
          name="modals/report"
          options={{ headerShown: true, title: "Reportar", presentation: "modal" }}
        />
        <Stack.Screen name="community-guidelines" options={{ headerShown: true, title: "Normas" }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: "Privacidad" }} />
        <Stack.Screen name="terms" options={{ headerShown: true, title: "Términos" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NetworkStatusProvider>
              <AuthProvider>
                <ToastProvider>
                  <PwaInstallProvider>
                    <AppShell />
                  </PwaInstallProvider>
                </ToastProvider>
              </AuthProvider>
            </NetworkStatusProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
