#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];

const requiredDocs = [
  "docs/RELEASE_CHECKLIST.md",
  "docs/REPO_AUDIT_REPORT.md",
  "docs/PRODUCT_UX_AUDIT.md",
  "docs/UI_UX_IMPROVEMENT_REPORT.md",
  "docs/SUPABASE_RELEASE_AUDIT.md",
  "docs/STORE_READINESS_CHECKLIST.md",
  "docs/BUILD_RELEASE_GUIDE.md",
  "docs/FINAL_RELEASE_REPORT.md",
];

const clientSecretPatterns = [
  /\bsb_secret_[A-Za-z0-9_-]+/i,
  /\bSUPABASE_SERVICE_ROLE_KEY\b/,
  /\bSUPABASE_ACCESS_TOKEN\b/,
  /\bservice_role\b/i,
];

const forbiddenProductCopyPatterns = [
  /el\s+m[aá]s\s+alcoh[oó]lico/i,
  /qui[eé]n\s+bebe\s+m[aá]s/i,
  /bebe\s+m[aá]s\s+para\s+ganar/i,
  /demuestra\s+qui[eé]n\s+bebe\s+m[aá]s/i,
  /\bborrach[a-záéíóúñ]*/i,
  /\bchupit[a-záéíóúñ]*/i,
  /\bshots?\b/i,
];

const forbiddenLegacyVisibleCopyPatterns = [
  /\bfot[oó]n(?:es)?\b/i,
  /\bleyenda de la ronda\b/i,
  /\bel instigador\b/i,
  /\bel fotog[eé]nico\b/i,
  /\bel showman\b/i,
  /\ben la pelea\b/i,
];

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function addFailure(message) {
  failures.push(message);
}

function walkFiles(startPath) {
  const absoluteStart = join(root, startPath);
  const files = [];

  function walk(absolutePath) {
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(absolutePath)) {
        if (entry === "node_modules" || entry === ".expo" || entry === ".git") {
          continue;
        }
        walk(join(absolutePath, entry));
      }
      return;
    }

    if (/\.(tsx?|jsx?|mjs|json|md|env|ts)$/.test(absolutePath)) {
      files.push(relative(root, absolutePath));
    }
  }

  walk(absoluteStart);
  return files;
}

function checkRequiredDocs() {
  for (const doc of requiredDocs) {
    try {
      const text = readText(doc);
      if (text.trim().length < 500) {
        addFailure(`${doc} existe pero parece demasiado corto para un entregable de release.`);
      }
    } catch {
      addFailure(`${doc} no existe.`);
    }
  }
}

function checkClientSecrets() {
  const files = [
    ...walkFiles("app"),
    ...walkFiles("src"),
    "app.config.ts",
    ".env.example",
  ];

  try {
    files.push(".env.local");
  } catch {
    // .env.local is optional in clean clones.
  }

  for (const file of [...new Set(files)]) {
    let text;
    try {
      text = readText(file);
    } catch {
      continue;
    }

    for (const pattern of clientSecretPatterns) {
      if (pattern.test(text)) {
        addFailure(`${file} contiene un posible secreto o service role expuesto: ${pattern}`);
      }
    }
  }
}

function checkProductCopy() {
  const files = [...walkFiles("app"), ...walkFiles("src")];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbiddenProductCopyPatterns) {
      if (pattern.test(text)) {
        addFailure(`${file} contiene copy prohibido o gamificacion de consumo: ${pattern}`);
      }
    }
  }
}

function checkLegacyVisibleCopy() {
  const files = [...walkFiles("app"), ...walkFiles("src")]
    .filter((file) => /\.[jt]sx?$/.test(file));

  for (const file of files) {
    const text = readText(file);
    const sourceFile = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") || file.endsWith(".jsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );

    function visit(node) {
      let visibleText = null;
      if (ts.isStringLiteralLike(node)) {
        visibleText = node.text;
      } else if (
        node.kind === ts.SyntaxKind.JsxText ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail
      ) {
        visibleText = node.getText(sourceFile);
      }

      if (visibleText && visibleText.trim().toLowerCase() !== "foton") {
        for (const pattern of forbiddenLegacyVisibleCopyPatterns) {
          if (pattern.test(visibleText)) {
            addFailure(`${file} contiene copy visible antiguo: ${pattern}`);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

function parseJsonOutput(rawOutput) {
  const start = rawOutput.indexOf("{");
  const end = rawOutput.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in command output.");
  }
  return JSON.parse(rawOutput.slice(start, end + 1));
}

function checkExpoPublicConfig() {
  const raw = execFileSync("npx", ["expo", "config", "--type", "public", "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const config = parseJsonOutput(raw);

  const androidPermissions = config.android?.permissions ?? [];
  const requiredAndroidPermissions = [
    "android.permission.CAMERA",
    "android.permission.POST_NOTIFICATIONS",
  ];

  for (const permission of requiredAndroidPermissions) {
    if (!androidPermissions.includes(permission)) {
      addFailure(`Android config no declara permiso requerido: ${permission}`);
    }
  }

  const forbiddenAndroidPermissions = [
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
  ];

  for (const permission of forbiddenAndroidPermissions) {
    if (androidPermissions.includes(permission)) {
      addFailure(`Android config declara permiso no justificado para MVP: ${permission}`);
    }
  }

  const checks = [
    [config.name === "Rondapp", "Expo name debe ser Rondapp."],
    [config.slug === "rondapp", "Expo slug debe ser rondapp."],
    [config.scheme === "rondapp", "Expo scheme debe ser rondapp."],
    [config.version === "1.0.0", "Expo version inicial debe ser 1.0.0."],
    [config.ios?.bundleIdentifier === "com.rosado.rondapp", "iOS bundle id incorrecto."],
    [config.ios?.buildNumber === "1", "iOS buildNumber inicial debe ser 1."],
    [config.ios?.usesAppleSignIn === true, "iOS debe declarar Apple Sign In."],
    [config.android?.package === "com.rosado.rondapp", "Android package incorrecto."],
    [config.android?.versionCode === 1, "Android versionCode inicial debe ser 1."],
  ];

  for (const [condition, message] of checks) {
    if (!condition) {
      addFailure(message);
    }
  }
}

function checkReleaseChecklistStatus() {
  const checklist = readText("docs/RELEASE_CHECKLIST.md");
  if (/Estado:\s*TODO\b/.test(checklist)) {
    addFailure("docs/RELEASE_CHECKLIST.md contiene Estado: TODO; debe ser DONE o BLOCKED_EXTERNAL con prueba.");
  }
  if (/Estado:\s*IN_PROGRESS\b/.test(checklist)) {
    addFailure("docs/RELEASE_CHECKLIST.md contiene Estado: IN_PROGRESS; para cerrar release debe ser DONE o BLOCKED_EXTERNAL con prueba.");
  }
}

function main() {
  checkRequiredDocs();
  checkClientSecrets();
  checkProductCopy();
  checkLegacyVisibleCopy();
  checkExpoPublicConfig();
  checkReleaseChecklistStatus();

  if (failures.length > 0) {
    console.error("FAIL release static QA");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("PASS release static QA");
}

main();
