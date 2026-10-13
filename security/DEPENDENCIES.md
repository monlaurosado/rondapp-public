# Dependency security patches

Use Node 22 and `npm ci`. Installation applies `dependency-patches.json` and the
build verifies the installed source hashes. After an installation using
`--ignore-scripts`, explicitly run `npm run postinstall` before running tools.

`npm run audit:security` verifies exact hashes and regression tests before
classifying the two advisories below as locally mitigated. All other advisories
fail the check. `npm audit` retains the original versions and upstream warnings.

## Temporary upstream mitigations, 2026-10-13

- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  braces 3.0.3 has no published fixed version. Parser nesting and recursive AST
  traversal are bounded to 128 levels. Tests cover normal globs, deep patterns
  below the character limit, deep ASTs and cycles.
- [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv):
  node-forge 1.4.0 has no published fixed version. Its Node RSA verifier now
  requires the nested DigestAlgorithm to contain exactly the OID and optional
  empty NULL. Tests accept a valid signature and reject signed malformed
  DigestInfo structures. This patches the Node entrypoint used by Expo tooling;
  do not import the upstream prebuilt browser `dist` bundles.

Every lockfile copy is patched and verified using exact upstream and patched
SHA-256 hashes. An unexpected version/source change requires reviewing the
patch. Replace these mitigations with upstream fixes when published, removing
the corresponding patch and exception together and rerunning release QA.

Expo stays on SDK 57. Overrides deduplicate native modules and select patched
transitive packages; Expo Doctor and exports for all three platforms validate
compatibility.
