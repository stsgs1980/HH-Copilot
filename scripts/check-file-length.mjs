#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const HARD_LIMIT = 400;

/**
 * Pre-commit check: new TS/JS files must not exceed HARD_LIMIT.
 * Modified files are only warned, not blocked.
 * @returns {void}
 */
function main() {
  const added = execSync("git diff --cached --name-only --diff-filter=A", {
    encoding: "utf8",
  });

  const modified = execSync("git diff --cached --name-only --diff-filter=M", {
    encoding: "utf8",
  });

  const newFiles = added
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

  const modifiedFiles = modified
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

  let failed = 0;

  for (const file of newFiles) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n").length;
    if (lines > HARD_LIMIT) {
      console.error(`[FAIL] NEW file '${file}' has ${lines} lines. Hard limit: ${HARD_LIMIT}.`);
      failed = 1;
    }
  }

  for (const file of modifiedFiles) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n").length;
    if (lines > HARD_LIMIT) {
      console.error(`[WARN] Modified file '${file}' has ${lines} lines. Hard limit: ${HARD_LIMIT}.`);
    }
  }

  if (failed) {
    console.error("[Anti-Monolith] Commit rejected.");
    process.exit(1);
  }
}

main();
