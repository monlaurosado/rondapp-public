#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });

const projectRef = process.env.RONDAPP_SUPABASE_PROJECT_REF ?? "bckrwqvvmjjorunbzxbo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const googleOauthJsonPath = process.env.GOOGLE_OAUTH_JSON;
const googleClientIdFromEnv = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
const googleClientSecretFromEnv = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dryRun = process.argv.includes("--dry-run");
const expectedGoogleRedirectUri = `https://${projectRef}.supabase.co/auth/v1/callback`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readGoogleCredentials() {
  if (googleOauthJsonPath) {
    const parsed = JSON.parse(readFileSync(googleOauthJsonPath, "utf8"));
    const web = parsed.web ?? {};
    return {
      clientId: web.client_id,
      clientSecret: web.client_secret,
      redirectUris: web.redirect_uris ?? [],
      source: "GOOGLE_OAUTH_JSON",
    };
  }

  return {
    clientId: googleClientIdFromEnv,
    clientSecret: googleClientSecretFromEnv,
    redirectUris: null,
    source: "SUPABASE_AUTH_EXTERNAL_GOOGLE_*",
  };
}

async function readProviderStatus() {
  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  });
  const data = await response.json();
  return {
    status: response.status,
    email: data.external?.email ?? null,
    google: data.external?.google ?? null,
    apple: data.external?.apple ?? null,
  };
}

async function patchGoogleProvider(credentials) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: credentials.clientId,
      external_google_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data.message ?? data.error ?? JSON.stringify(data);
    } catch {
      detail = await response.text();
    }
    throw new Error(`Supabase Management API rejected Google OAuth config (${response.status}): ${detail}`);
  }
}

async function main() {
  if (!accessToken && !dryRun) {
    fail("SUPABASE_ACCESS_TOKEN ausente. Exportalo en la terminal; no lo escribas en archivos.");
  }

  const credentials = readGoogleCredentials();
  if (!credentials.clientId || !credentials.clientSecret) {
    fail("Faltan credenciales Google. Define GOOGLE_OAUTH_JSON o SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET.");
  }

  if (
    credentials.redirectUris &&
    !credentials.redirectUris.includes(expectedGoogleRedirectUri)
  ) {
    fail(
      `El cliente OAuth de GOOGLE_OAUTH_JSON no autoriza ${expectedGoogleRedirectUri}. Anade esa URI exacta en Google Auth Platform y descarga de nuevo el JSON.`,
    );
  }

  const before = await readProviderStatus();
  if (before) {
    console.log(
      `Antes: email=${before.email} google=${before.google} apple=${before.apple} status=${before.status}`,
    );
  }

  console.log(`Google OAuth: client_id presente desde ${credentials.source}; client_secret presente.`);
  console.log(`Google OAuth callback requerido: ${expectedGoogleRedirectUri}`);
  if (dryRun) {
    console.log("DRY RUN: no se envio ningun secreto a Supabase.");
    return;
  }

  await patchGoogleProvider(credentials);
  const after = await readProviderStatus();
  if (after) {
    console.log(
      `Despues: email=${after.email} google=${after.google} apple=${after.apple} status=${after.status}`,
    );
  }
  console.log("PASS Google OAuth aplicado en Supabase remoto.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
