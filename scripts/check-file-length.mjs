#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const MAX_LINES = 250;

/**
 * Pre-commit check: staged TS/JS files must not exceed MAX_LINES.
 * @returns {void}
 */
function main() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
  });

  const files = output
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

  let failed = 0;

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split("\n").length;

    // Skip files that suppress max-file-lines (intentionally large legacy files)
    const content = readFileSync(file, "utf8");
    if (content.includes("eslint-disable ahg-rules/max-file-lines")) {
      continue;
    }

    if (lines > MAX_LINES) {
      console.error(`[FAIL] File '${file}' has ${lines} lines. Limit: ${MAX_LINES}.`);
      failed = 1;
    }
  }

  if (failed) {
    console.error("[Anti-Monolith] Commit rejected.");
    process.exit(1);
  }
}

main();
