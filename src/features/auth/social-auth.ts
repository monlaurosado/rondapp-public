import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

import { completeAuthFromUrl } from "@/features/auth/callback";
import { getAuthRedirectUrl } from "@/lib/deep-links";
import { env } from "@/lib/env";
import { requireSupabase } from "@/lib/supabase";

export type SocialProvider = "google" | "apple";

export type SocialAuthResult = {
  completed: boolean;
};

export class AuthFlowCancelledError extends Error {
  constructor() {
    super("Inicio de sesión cancelado.");
    this.name = "AuthFlowCancelledError";
  }
}

export function isAuthFlowCancelled(error: unknown) {
  return (
    error instanceof AuthFlowCancelledError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED")
  );
}

export async function getSocialProviderAvailability() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    return { google: false, apple: false };
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
    headers: {
      apikey: env.supabasePublishableKey,
    },
  });

  if (!response.ok) {
    throw new Error("No hemos podido comprobar los proveedores de Supabase.");
  }

  const settings = await response.json() as {
    external?: Partial<Record<SocialProvider, boolean>>;
  };

  return {
    google: settings.external?.google === true,
    apple: settings.external?.apple === true,
  };
}

async function signInWithOAuthProvider(
  provider: SocialProvider,
  nextPath?: string | null,
): Promise<SocialAuthResult> {
  const supabase = requireSupabase();
  const redirectTo = getAuthRedirectUrl(nextPath);
  const isWeb = process.env.EXPO_OS === "web";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: !isWeb,
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("El proveedor no ha devuelto una URL de autenticación.");
  }

  // Web uses a full-page redirect. It is more reliable on mobile browsers than
  // opening a popup after the async request that creates the provider URL.
  if (isWeb) {
    return { completed: false };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success") {
    await completeAuthFromUrl(result.url);
    return { completed: true };
  }

  throw new AuthFlowCancelledError();
}

export async function signInWithGoogle(nextPath?: string | null) {
  return signInWithOAuthProvider("google", nextPath);
}

function getFullName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) return null;

  const name = [fullName.givenName, fullName.middleName, fullName.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || null;
}

export async function signInWithApple(nextPath?: string | null) {
  if (process.env.EXPO_OS !== "ios") {
    return signInWithOAuthProvider("apple", nextPath);
  }

  const supabase = requireSupabase();
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error("Apple no ha devuelto un token de identidad.");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw error;
  }

  const fullName = getFullName(credential.fullName);
  if (fullName) {
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: credential.fullName?.givenName ?? undefined,
        family_name: credential.fullName?.familyName ?? undefined,
      },
    });
  }

  return { completed: true };
}
