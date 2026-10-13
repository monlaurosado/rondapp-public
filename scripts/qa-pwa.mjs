#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const outputName = process.argv[2] ?? "dist";
if (!/^[A-Za-z0-9._-]+$/.test(outputName)) {
  throw new Error(`Invalid PWA output directory: ${outputName}`);
}

const outputDirectory = resolve(process.cwd(), outputName);
const failures = [];

function readText(fileName) {
  try {
    return readFileSync(resolve(outputDirectory, fileName), "utf8");
  } catch {
    failures.push(`Falta ${outputName}/${fileName}.`);
    return "";
  }
}

function requireFile(fileName) {
  try {
    const stats = statSync(resolve(outputDirectory, fileName));
    if (!stats.isFile() || stats.size === 0) {
      failures.push(`${outputName}/${fileName} no es un archivo válido.`);
    }
  } catch {
    failures.push(`Falta ${outputName}/${fileName}.`);
  }
}

function expectIncludes(text, value, source) {
  if (!text.includes(value)) {
    failures.push(`${source} no contiene ${JSON.stringify(value)}.`);
  }
}

function readPngSize(fileName) {
  try {
    const buffer = readFileSync(resolve(outputDirectory, fileName));
    const pngSignature = "89504e470d0a1a0a";
    if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
      failures.push(`${outputName}/${fileName} no es un PNG válido.`);
      return null;
    }
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  } catch {
    failures.push(`No se puede leer ${outputName}/${fileName}.`);
    return null;
  }
}

const requiredFiles = [
  "index.html",
  "404.html",
  ".htaccess",
  "manifest.json",
  "pwa-register.js",
  "service-worker.js",
  "offline.html",
  "apple-touch-icon.png",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "pwa-icon-maskable-512.png",
];

for (const fileName of requiredFiles) {
  requireFile(fileName);
}

const indexHtml = readText("index.html");
expectIncludes(indexHtml, 'lang="es"', "index.html");
expectIncludes(indexHtml, 'rel="manifest" href="/manifest.json"', "index.html");
expectIncludes(indexHtml, 'rel="apple-touch-icon"', "index.html");
expectIncludes(indexHtml, 'name="apple-mobile-web-app-capable" content="yes"', "index.html");
expectIncludes(indexHtml, 'name="apple-mobile-web-app-status-bar-style" content="black"', "index.html");
expectIncludes(indexHtml, 'src="/pwa-register.js"', "index.html");

const registrationScript = readText("pwa-register.js");
expectIncludes(
  registrationScript,
  'serviceWorker.register("/service-worker.js", { scope: "/" })',
  "pwa-register.js",
);

const serviceWorker = readText("service-worker.js");
expectIncludes(serviceWorker, 'self.addEventListener("install"', "service-worker.js");
expectIncludes(serviceWorker, 'self.addEventListener("fetch"', "service-worker.js");
expectIncludes(serviceWorker, 'self.addEventListener("push"', "service-worker.js");
expectIncludes(serviceWorker, 'self.addEventListener("notificationclick"', "service-worker.js");
expectIncludes(serviceWorker, 'const OFFLINE_URL = "/offline.html"', "service-worker.js");

const htaccess = readText(".htaccess");
expectIncludes(htaccess, 'RewriteRule ^ index.html [L]', ".htaccess");
expectIncludes(htaccess, '<Files "service-worker.js">', ".htaccess");

let manifest = null;
try {
  manifest = JSON.parse(readText("manifest.json"));
} catch {
  failures.push(`${outputName}/manifest.json no contiene JSON válido.`);
}

if (manifest) {
  const checks = [
    [manifest.id === "/", "manifest.id debe ser /."],
    [manifest.name === "Rondapp", "manifest.name debe ser Rondapp."],
    [manifest.short_name === "Rondapp", "manifest.short_name debe ser Rondapp."],
    [manifest.start_url === "/", "manifest.start_url debe ser /."],
    [manifest.scope === "/", "manifest.scope debe ser /."],
    [manifest.display === "standalone", "manifest.display debe ser standalone."],
    [manifest.orientation === "portrait-primary", "manifest.orientation debe ser portrait-primary."],
    [manifest.theme_color === "#06070B", "manifest.theme_color no coincide con la app."],
    [manifest.background_color === "#06070B", "manifest.background_color no coincide con la app."],
  ];

  for (const [condition, message] of checks) {
    if (!condition) failures.push(message);
  }

  for (const icon of manifest.icons ?? []) {
    const fileName = String(icon.src ?? "").replace(/^\/+/, "");
    const declaredSize = /^(\d+)x(\d+)$/.exec(String(icon.sizes ?? ""));
    if (!fileName || !declaredSize) {
      failures.push("El manifest contiene un icono sin ruta o tamaño válidos.");
      continue;
    }

    const actualSize = readPngSize(fileName);
    if (
      actualSize &&
      (actualSize.width !== Number(declaredSize[1]) ||
        actualSize.height !== Number(declaredSize[2]))
    ) {
      failures.push(
        `${fileName} mide ${actualSize.width}x${actualSize.height}, no ${icon.sizes}.`,
      );
    }
  }
}

const appleTouchSize = readPngSize("apple-touch-icon.png");
if (appleTouchSize && (appleTouchSize.width !== 180 || appleTouchSize.height !== 180)) {
  failures.push("apple-touch-icon.png debe medir 180x180.");
}

if (failures.length > 0) {
  console.error("FAIL PWA QA");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS PWA QA (${outputName})`);
}
