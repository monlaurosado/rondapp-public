#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });

const projectRef = process.env.RONDAPP_SUPABASE_PROJECT_REF ?? "bckrwqvvmjjorunbzxbo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

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
  if (!response.ok) {
    const detail = data?.message ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`Supabase Auth config: ${detail}`);
  }
  return data;
}

async function readAdminKey() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.message ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`Supabase API keys: ${detail}`);
  }

  const secretKey = data.find((entry) => entry.type === "secret" && entry.api_key)?.api_key;
  if (!secretKey) {
    throw new Error("El proyecto no devolvio una secret API key para el QA remoto.");
  }
  return secretKey;
}

async function main() {
  if (!accessToken) {
    fail("SUPABASE_ACCESS_TOKEN ausente. Exportalo en la terminal; no lo guardes en archivos.");
  }

  const before = await requestAuthConfig();
  const adminKey = await readAdminKey();
  const result = spawnSync(process.execPath, ["scripts/qa-supabase-remote-smoke.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_REMOTE_ADMIN_KEY: adminKey,
    },
    stdio: "inherit",
  });
  const after = await requestAuthConfig();

  if (after.mailer_autoconfirm !== before.mailer_autoconfirm) {
    throw new Error("QA altero inesperadamente mailer_autoconfirm.");
  }
  console.log(`PASS Auth sin cambios: mailer_autoconfirm=${after.mailer_autoconfirm === true}.`);
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
