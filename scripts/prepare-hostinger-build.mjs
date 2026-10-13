#!/usr/bin/env node

import { access, copyFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const outputName = process.argv[2] ?? "dist";

if (!/^[A-Za-z0-9._-]+$/.test(outputName)) {
  throw new Error(`Invalid build output directory: ${outputName}`);
}

const outputDirectory = resolve(process.cwd(), outputName);
const indexPath = resolve(outputDirectory, "index.html");
const expoAssetsPath = resolve(outputDirectory, "_expo");

const htaccess = `Options -Indexes
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^\\.well-known/ - [L]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  <FilesMatch "\\.(js|css|woff|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <Files "service-worker.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
  <Files "pwa-register.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
  <Files "manifest.json">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
</IfModule>
`;

await access(indexPath, constants.R_OK);
await access(expoAssetsPath, constants.R_OK);
await writeFile(resolve(outputDirectory, ".htaccess"), htaccess, "utf8");
await copyFile(indexPath, resolve(outputDirectory, "404.html"));

console.log(
  `Hostinger web output prepared: ${outputName}/.htaccess and ${outputName}/404.html.`,
);
