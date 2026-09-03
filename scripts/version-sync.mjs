#!/usr/bin/env node
/**
 * Version Sync Check -- ensures all version references in the extension are
 * consistent with manifest.json (the single source of truth).
 *
 * Exit codes:
 *   0 = all version references match
 *   1 = version mismatch found
 *
 * Usage:
 *   node scripts/version-sync.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkVersions, extractJsonVersion } from "../extension/src/lib/version-sync.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXTENSION_DIR = join(SCRIPT_DIR, "..", "extension");

const MANIFEST_PATH = join(EXTENSION_DIR, "manifest.json");
const PACKAGE_PATH = join(EXTENSION_DIR, "package.json");
const VERSION_JS_PATH = join(EXTENSION_DIR, "src", "lib", "version.js");
const POPUP_HTML_PATH = join(EXTENSION_DIR, "popup", "index.html");
const README_PATHS = [join(EXTENSION_DIR, "README.md"), join(SCRIPT_DIR, "..", "README.md")];

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function main() {
  const manifest = read(MANIFEST_PATH);
  if (manifest == null) {
    console.error("[version-sync] FATAL: manifest.json not found");
    process.exit(2);
  }

  const truth = extractJsonVersion(manifest, "version");
  if (truth == null) {
    console.error("[version-sync] FATAL: no version in manifest.json");
    process.exit(2);
  }

  const sourcesContents = {
    package: read(PACKAGE_PATH),
    js: read(VERSION_JS_PATH),
    html: read(POPUP_HTML_PATH),
  };
  const sourceLabels = {
    package: "package.json",
    js: "src/lib/version.js",
    html: "popup/index.html",
  };

  const readme = README_PATHS.map(read).find((c) => c != null);
  if (readme != null) {
    sourcesContents.readme = readme;
    sourceLabels.readme = "README.md";
  }

  const { mismatches } = checkVersions(manifest, sourcesContents, sourceLabels);

  console.log(`[version-sync] source of truth (manifest.json): ${truth}`);
  if (mismatches.length === 0) {
    console.log("[version-sync] OK: all version references match");
    process.exit(0);
  }

  for (const label of mismatches) {
    console.error(`[version-sync] MISMATCH: ${label} differs from manifest.json`);
  }
  console.error(`[version-sync] fix by setting all references to ${truth}`);
  process.exit(1);
}

main();
