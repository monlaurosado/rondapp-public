#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const useShell = process.platform === "win32";

const commands = [
  ["npm", ["run", "audit:security"]],
  ["npm", ["run", "test:security:push"]],
  ["npm", ["run", "qa:release:static"]],
  ["npm", ["run", "qa:navigation"]],
  ["npm", ["run", "qa:errors"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "lint"]],
  ["npx", ["expo-doctor"]],
  ["npx", ["--yes", "deno", "fmt", "--check", "supabase/functions"]],
  [
    "npx",
    [
      "--yes",
      "deno",
      "check",
      "supabase/functions/close-round/index.ts",
      "supabase/functions/delete-account/index.ts",
      "supabase/functions/delete-moment/index.ts",
      "supabase/functions/delete-group/index.ts",
      "supabase/functions/cleanup-storage-deletions/index.ts",
      "supabase/functions/web-push-config/index.ts",
    ],
  ],
  [
    "npx",
    [
      "--yes",
      "deno",
      "check",
      "--config",
      "supabase/functions/send-round-notification/deno.json",
      "supabase/functions/send-round-notification/index.ts",
    ],
  ],
  [
    "npx",
    [
      "--yes",
      "deno",
      "check",
      "--config",
      "supabase/functions/send-test-notification/deno.json",
      "supabase/functions/send-test-notification/index.ts",
    ],
  ],
  ["npx", ["expo", "export", "--platform", "all", "--output-dir", "/tmp/rondapp-export"]],
  ["git", ["diff", "--check"]],
];

function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    shell: useShell,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const [command, args] of commands) {
  run(command, args);
}

console.log("\nPASS local release QA");
