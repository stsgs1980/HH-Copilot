# AGENTS.md — OpenCode entry point for HH-Copilot

> OpenCode reads this file automatically at session start.
> Full project rules live in `AGENT_RULES.md` (610 lines, mandatory reading).

## STEP 0 — MANDATORY at session start

1. Read `AGENT_RULES.md` (full file, no skimming)
2. Read `worklog.md` (last 10 entries)
3. Read `README.md` (project overview)
4. Read `cascade-state.json` (current task status)
5. Run `git log --oneline -10` to see recent commits
6. Run `git status` to see uncommitted changes

Do NOT write any code until steps 1–6 are done.

## Project at a glance

- **What**: Chrome Extension (Manifest V3) for hh.ru — job apply copilot
- **Stack**: Vanilla JS + esbuild, no framework, no TypeScript
- **Build**: `cd extension && npm run build` (output: `extension/dist/`)
- **Tests**: `cd extension && npm test` (vitest)
- **Current version**: see `extension/manifest.json` → `version` field
- **Lint**: `cd extension && npm run lint`

## Critical rules (full text in AGENT_RULES.md)

### Versioning — Rule 9.1 / 9.2 / 9.4
Every code change MUST bump version. Version MUST be synced across 5 files:
- `extension/manifest.json` → `version`
- `extension/package.json` → `version`
- `extension/src/lib/version.js` → `VERSION`
- `extension/popup/index.html` → `.subtitle` div
- `README.md` → `Version:` header + inline refs

Verify before commit: `bash extension/scripts/version-sync.sh`

### Windows user — Rule 9.1 / 9.4
User is on Windows + PowerShell. After every push, give the user:
```powershell
git stash && git pull && git stash pop && npm run build
```
ONE copy-paste block, not step-by-step prose.

### Documentation — Rule 9.5
- All .md files, code comments, commit messages, worklog entries → **English**
- Chat responses to user → **Russian**
- UI strings visible to end user → **Russian** (hh.ru-facing)

### Worklog — Rule 1
- Before ANY action: read `worklog.md`
- After ANY action: append section with `---` separator
- Format see AGENT_RULES.md lines 59–75

### Read before write — Rule 2
NEVER overwrite a file without reading it first. Use Read tool.

### No loops — Rule 4
3rd attempt with same result → STOP and ask user.

### No unsolicited initiative — Rule 10
Do ONLY what was explicitly asked. No extra features, no extra refactors.

### Pre-commit hooks (enforced, do NOT bypass with --no-verify)
- Phase 1: worklog freshness check
- Phase 2: worklog format check
- Phase 4: version-sync.sh (5-file consistency)
- Phase 5: doc-consistency.sh (CHANGELOG, cascade-state, README)
- Anti-hallucination: co-change check, line count

If a commit is blocked → FIX the issue, do not bypass.

## OpenCode-specific notes

- Use `opencode/deepseek-v4-flash-free` model (configured in opencode.json)
- Context window: 1M tokens — fits entire `extension/` tree
- For complex refactors that need reasoning → user may switch to `opencode/deepseek-v4-pro` (paid, $0.14/$0.28 per 1M tokens)
- When running `npm run build`, esbuild injects `process.env.VERSION` into all modules — do NOT hardcode version strings in source files

## Where things live

```
HH-Copilot-repo/
├── AGENT_RULES.md           # ← READ FIRST (610 lines of rules)
├── AGENTS.md                # ← This file (OpenCode entry)
├── opencode.json            # ← OpenCode model config
├── worklog.md               # ← Append after every action
├── README.md                # ← Project overview
├── extension/               # ← Main code
│   ├── manifest.json        # ← Source of truth for VERSION
│   ├── src/lib/             # ← Business logic
│   ├── src/ui/              # ← UI code
│   ├── src/parsers/         # ← DOM parsers
│   ├── tests/               # ← vitest tests
│   └── scripts/             # ← version-sync, doc-consistency
├── FabInspector/            # ← Git submodule (visual inspector)
└── anti-hallucination-guard/ # ← Git submodule (pre-commit hooks)
```

## Recent context (v1.9.55.0)

- Cover letter editor moved from Negotiations tab → Vacancies tab
- New `mentionsSkillStem()` in cover-letter-evidence.js (4-tier evidence search)
- Experience-based fallback when no per-competency evidence found
- FabInspector added as git submodule (HTTPS URL — user may need to switch to SSH on Windows)
- **Open issue**: Windows git pull stuck on pack file lock + FabInspector submodule access

When in doubt about recent state — read last 5 worklog entries.
