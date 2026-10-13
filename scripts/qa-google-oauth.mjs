#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appRedirectUrl =
  process.env.RONDAPP_GOOGLE_QA_REDIRECT_URL ??
  "https://darkgray-partridge-666122.hostingersite.com/auth/callback";

function fail(message) {
  throw new Error(message);
}

async function main() {
  if (!supabaseUrl || !publishableKey) {
    fail("Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  const supabaseOrigin = new URL(supabaseUrl).origin;
  const expectedGoogleCallback = `${supabaseOrigin}/auth/v1/callback`;
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const settingsResponse = await fetch(`${supabaseOrigin}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  });
  const settings = await settingsResponse.json().catch(() => ({}));

  if (!settingsResponse.ok || settings.external?.google !== true) {
    fail("Google no esta activado en Supabase Auth.");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: appRedirectUrl,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    fail(error?.message ?? "Supabase no devolvio una URL OAuth de Google.");
  }

  const supabaseAuthorize = await fetch(data.url, { redirect: "manual" });
  const googleLocation = supabaseAuthorize.headers.get("location");

  if (supabaseAuthorize.status !== 302 || !googleLocation) {
    fail(`Supabase no redirigio a Google (HTTP ${supabaseAuthorize.status}).`);
  }

  const googleUrl = new URL(googleLocation);
  if (googleUrl.hostname !== "accounts.google.com") {
    fail(`Destino OAuth inesperado: ${googleUrl.hostname}.`);
  }

  const configuredCallback = googleUrl.searchParams.get("redirect_uri");
  if (configuredCallback !== expectedGoogleCallback) {
    fail(
      `Callback OAuth inesperado. Esperado ${expectedGoogleCallback}; recibido ${configuredCallback ?? "ninguno"}.`,
    );
  }

  const googleResponse = await fetch(googleLocation, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const googleBody = await googleResponse.text();
  const googlePath = new URL(googleResponse.url).pathname;
  const failedAtGoogle =
    googlePath.includes("/signin/oauth/error") ||
    /Error 400:\s*redirect_uri_mismatch/i.test(googleBody) ||
    /OAuth client (?:was not found|does not exist)/i.test(googleBody);

  if (failedAtGoogle) {
    fail(
      `Google rechaza el cliente OAuth. Anade exactamente ${expectedGoogleCallback} a Authorized redirect URIs del cliente Web configurado en Supabase.`,
    );
  }

  console.log(`PASS Google acepta el callback OAuth ${expectedGoogleCallback}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
