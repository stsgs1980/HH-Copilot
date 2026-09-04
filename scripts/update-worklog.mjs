#!/usr/bin/env node

import { execSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKLOG = resolve(__dirname, "..", "worklog.md");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: resolve(__dirname, "..") }).trim();
}

function findMarker(text) {
  const re = /^[\s-]*Commit:\s*([0-9a-f]{7,})/gm;
  let last;
  let m;
  while ((m = re.exec(text)) !== null) {
    last = m[1];
  }
  return last;
}

function parseIssueRefs(body) {
  const issues = [];
  for (const m of body.matchAll(/(?:^|\s)Fixes\s+#(\d+)/gim)) issues.push(m[1]);
  for (const m of body.matchAll(/(?:^|\s)Part of\s+#(\d+)/gim)) issues.push("part-" + m[1]);
  return issues.length ? [...new Set(issues)] : ["misc"];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

try {
  const text = readFileSync(WORKLOG, "utf8");
  const marker = findMarker(text);

  if (!marker) {
    console.log("[worklog] No Commit: marker found, nothing to do");
    process.exit(0);
  }

  const head = run("git rev-parse --short HEAD");
  if (marker === head) {
    console.log("[worklog] Marker == HEAD, nothing to do");
    process.exit(0);
  }

  const raw = run(`git log ${marker}..HEAD --pretty=format:"%h|%s|%b" --no-merges`);
  if (!raw) {
    console.log("[worklog] No new commits since marker");
    process.exit(0);
  }

  const lines = raw.split("\n");
  const commits = [];

  for (const line of lines) {
    const sep = line.indexOf("|");
    if (sep === -1) continue;
    const hash = line.slice(0, sep);
    const rest = line.slice(sep + 1);
    const subSep = rest.indexOf("|");
    if (subSep === -1) {
      commits.push({ hash, subject: rest, body: "" });
    } else {
      commits.push({
        hash,
        subject: rest.slice(0, subSep),
        body: rest
          .slice(subSep + 1)
          .replace(/\n\s*/g, "\n  ")
          .trim(),
      });
    }
  }

  if (!commits.length) {
    console.log("[worklog] No commits parsed");
    process.exit(0);
  }

  const groups = {};
  for (const c of commits) {
    const refs = parseIssueRefs(c.body);
    for (const ref of refs) {
      if (!groups[ref]) groups[ref] = [];
      groups[ref].push(c);
    }
  }

  let topFiles = "";
  try {
    const stat = run(`git diff --stat ${marker}..HEAD`);
    topFiles = stat
      .split("\n")
      .slice(0, 5)
      .map((l) => "- " + l.trim())
      .join("\n");
  } catch {
    topFiles = "- (stat unavailable)";
  }

  const sections = [];
  for (const [issue, cs] of Object.entries(groups)) {
    const taskId = `auto-${today()}-${issue}`;
    const firstSubject = cs[0].subject;
    const commitHashes = cs.map((c) => c.hash).join(", ");

    const workLogLines = cs
      .map((c) => {
        const type = c.subject.split(":")[0] || "chore";
        const rest = c.subject.includes(":") ? c.subject.split(":").slice(1).join(":").trim() : c.subject;
        return `- ${c.hash} ${type}: ${rest}`;
      })
      .join("\n");

    sections.push(
      [
        `Task ID: ${taskId}`,
        `Agent: main`,
        `Task: [DRAFT] ${firstSubject}`,
        ``,
        `Work Log:`,
        ``,
        workLogLines,
        `  [DRAFT] supplemented by user before commit`,
        ``,
        `Stage Summary:`,
        ``,
        `- Commits: ${commitHashes}`,
        topFiles,
        ``,
        `---`,
      ].join("\n"),
    );
  }

  const suffix = text.charAt(text.length - 1) === "\n" ? "\n" : "\n\n";
  const endMarker = `\nCommit: ${head}\n`;
  appendFileSync(WORKLOG, suffix + sections.join("\n\n") + "\n" + endMarker, "utf8");
  console.log(`[worklog] Appended ${sections.length} section(s) for ${Object.keys(groups).length} group(s)`);
} catch (err) {
  console.error("[worklog] Error:", err.message);
  process.exit(0);
}
