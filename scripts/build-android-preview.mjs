#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const homeDirectory = process.env.HOME ?? "";
const workingDirectory = process.cwd();
const isHostingerBuild =
  process.env.HOSTINGER_AUTO_DEPLOY === "1" ||
  workingDirectory.includes("/.builds/") ||
  (/^\/home\/u\d+$/.test(homeDirectory) && workingDirectory.includes("/domains/"));

function runOrExit(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (isHostingerBuild) {
  console.log("Hostinger compatibility mode: exporting the Expo web app to build/.");
  runOrExit(npxCommand, [
    "expo",
    "export",
    "--platform",
    "web",
    "--output-dir",
    "build",
  ]);
  runOrExit(process.execPath, ["scripts/prepare-hostinger-build.mjs", "build"]);
} else {
  runOrExit(npxCommand, [
    "eas-cli",
    "build",
    "-p",
    "android",
    "--profile",
    "preview",
  ]);
}
