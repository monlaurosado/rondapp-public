import * as Linking from "expo-linking";

import { env } from "@/lib/env";

export function getAuthRedirectUrl(nextPath?: string | null) {
  const queryParams = nextPath ? { next: nextPath } : undefined;
  return Linking.createURL("auth/callback", { queryParams });
}

export function getJoinGroupUrl(inviteCode: string) {
  const path = `join/${inviteCode.trim().toUpperCase()}`;
  if (env.appLinkBaseUrl) {
    try {
      const base = new URL(env.appLinkBaseUrl);
      if (base.protocol === "https:") {
        return new URL(path, `${base.origin}/`).toString();
      }
    } catch {
      // Invalid optional configuration falls back to the installed-app scheme.
    }
  }
  return Linking.createURL(path);
}
