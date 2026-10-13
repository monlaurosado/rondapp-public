#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  clearPendingAuthNextPath,
  getPendingAuthNextPath,
  normalizeNextPath,
  rememberPendingAuthNextPath,
} from "../src/lib/navigation.ts";

const id = "70000000-0000-4000-8000-000000000001";

for (const path of ["/", "/groups", "/home", "/launch", "/profile", "/ranking", "/settings"]) {
  assert.equal(normalizeNextPath(path), path);
}

for (const path of [`/group/${id}`, `/moment/${id}`, `/round/${id}`, "/join/VISUALUNO"]) {
  assert.equal(normalizeNextPath(path), path);
}

assert.equal(normalizeNextPath(`%2Fround%2F${id}`), `/round/${id}`);

for (const unsafePath of [
  "/complete-profile",
  "/age-gate",
  "/login",
  "/group/../login",
  "/group/%2e%2e/login",
  "/group/%252e%252e/login",
  "/group/not-a-uuid",
  "/join/a",
  "/home?next=/login",
  "//evil.test/path",
  "https://evil.test/path",
  "/group\\evil",
]) {
  assert.equal(normalizeNextPath(unsafePath), null, unsafePath);
}

rememberPendingAuthNextPath(`/group/${id}`);
assert.equal(getPendingAuthNextPath(), `/group/${id}`);
rememberPendingAuthNextPath("/complete-profile");
assert.equal(getPendingAuthNextPath(), null);
clearPendingAuthNextPath();
assert.equal(getPendingAuthNextPath(), null);

console.log("PASS navigation continuation QA");
