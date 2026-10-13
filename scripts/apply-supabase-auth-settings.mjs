#!/usr/bin/env node

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });

const projectRef = process.env.RONDAPP_SUPABASE_PROJECT_REF ?? "bckrwqvvmjjorunbzxbo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const siteUrl =
  process.env.SUPABASE_AUTH_SITE_URL ??
  "https://darkgray-partridge-666122.hostingersite.com";
const redirectUrls = (
  process.env.SUPABASE_AUTH_REDIRECT_URLS ??
  [
    "rondapp://auth/callback",
    "rondapp://**",
    "exp://**",
    "http://localhost:8081/auth/callback",
    "http://127.0.0.1:8081/auth/callback",
    "https://darkgray-partridge-666122.hostingersite.com/auth/callback",
  ].join(",")
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const enableLeakedPasswordProtection =
  process.env.SUPABASE_ENABLE_LEAKED_PASSWORD_PROTECTION !== "false";
const dryRun = process.argv.includes("--dry-run");

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function requestAuthConfig(method = "GET", body) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  const data = await response.json().catch(() => null);
  return { response, data };
}

function summarize(config) {
  return {
    siteUrl: config?.site_url ?? null,
    redirectUrls: (config?.uri_allow_list ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    leakedPasswordProtection: config?.password_hibp_enabled === true,
  };
}

async function patchOrThrow(body, label) {
  const { response, data } = await requestAuthConfig("PATCH", body);
  if (!response.ok) {
    const detail = data?.message ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return data;
}

async function main() {
  if (!accessToken && !dryRun) {
    fail("SUPABASE_ACCESS_TOKEN ausente. Exportalo en la terminal; no lo guardes en archivos.");
  }

  console.log(
    `Auth URLs: site_url=${siteUrl}; ${redirectUrls.length} redirect URLs preparadas.`,
  );
  console.log(
    `Leaked password protection: ${enableLeakedPasswordProtection ? "solicitada" : "sin cambios"}.`,
  );

  if (dryRun) {
    console.log("DRY RUN: no se modifico Supabase.");
    return;
  }

  await patchOrThrow(
    {
      site_url: siteUrl,
      uri_allow_list: redirectUrls.join(","),
    },
    "No se pudieron aplicar las URLs de Auth",
  );

  let hibpBlocked = false;
  if (enableLeakedPasswordProtection) {
    try {
      await patchOrThrow(
        { password_hibp_enabled: true },
        "No se pudo activar leaked password protection",
      );
    } catch (error) {
      hibpBlocked = true;
      console.warn(
        `BLOCKED_EXTERNAL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const { response, data } = await requestAuthConfig();
  if (!response.ok) {
    throw new Error(`No se pudo verificar Auth config (HTTP ${response.status}).`);
  }

  const current = summarize(data);
  const urlsMatch =
    current.siteUrl === siteUrl &&
    redirectUrls.every((url) => current.redirectUrls.includes(url));

  if (!urlsMatch) {
    throw new Error("La verificacion remota no coincide con las URLs solicitadas.");
  }

  console.log(JSON.stringify(current, null, 2));
  console.log("PASS URLs de Supabase Auth aplicadas y verificadas.");

  if (hibpBlocked || (enableLeakedPasswordProtection && !current.leakedPasswordProtection)) {
    process.exitCode = 2;
    return;
  }

  if (enableLeakedPasswordProtection) {
    console.log("PASS leaked password protection activada.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
