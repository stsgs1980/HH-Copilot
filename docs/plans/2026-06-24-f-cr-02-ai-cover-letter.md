# F-CR-02 Implementation Plan

> **Spec**: `docs/specs/2026-06-24-f-cr-02-ai-cover-letter.md`
> **Method**: TDD (sp-test-driven-development). Red → Green → Refactor per module.
> **Branch**: `main` (per repo convention — no feature branches)
> **Version target**: 1.9.49.0 → 1.9.50.0

---

## Phase A: Pure-logic modules (no I/O, no AI) — TDD strictly

These modules have no external dependencies. Pure functions. Perfect for TDD.

### Step A1: `cover-letter-scorecard.js` (TDD)

**Files to create:**
- `extension/src/lib/cover-letter-scorecard.js` (~80 lines)
- `extension/tests/cover-letter-scorecard.test.js` (~7 tests)

**Test cases (write FIRST, before impl):**
1. `extractScorecard(vacancy)` with full vacancy → returns `{ mission, outcomes[], competencies[], source }`
2. mission derived from `title` + first sentence of `description.sections.responsibilities`
3. outcomes: top 3-5 concrete sentences from responsibilities (heuristic: contains verb + concrete noun)
4. competencies: union of `keySkills` + noun phrases from `requirements` section
5. empty `responsibilities` → fallback mission from title, outcomes = `['успешно выполнять обязанности роли']`
6. empty `keySkills` → competencies from `requirements` only
7. empty `requirements` AND empty `keySkills` → competencies = `[]` (orchestrator handles this)

**Implementation notes:**
- Russian-aware: use simple regex for sentence splitting `/[.!?]+/`
- Noun phrase extraction from requirements: split by comma, strip adjectives (`опыт работы с`, `знание`, `понимание`), keep rest as competencies
- Cap outcomes at 5, competencies at 10
- Pure function — no I/O, no chrome.storage, no fetch

**Verification:**
```bash
cd extension && npx vitest run tests/cover-letter-scorecard.test.js
```

Expected: 7 tests pass. Move to A2.

### Step A2: `cover-letter-evidence.js` (TDD)

**Files to create:**
- `extension/src/lib/cover-letter-evidence.js` (~120 lines)
- `extension/tests/cover-letter-evidence.test.js` (~9 tests)

**Test cases:**
1. matching skill + experience entry with description containing the skill → returns evidence with confidence `high` if description has digit, else `medium`
2. derived skill (`derivedMatchSkills`) → confidence `medium`
3. missing skill (`missingSkills`) → SKIPPED, not in evidence array
4. multiple experience entries with same skill → picks most recent (last in array)
5. experience entry with empty description → skipped for that entry, fall back to next
6. skill mentioned in resume.skills but not in any experience.description → no evidence found for it, skipped
7. evidence source field populated: `{ type: 'experience', index, sentence }`
8. no matching skills at all → returns `[]`
9. confidence `high` when sentence contains digit/percent/timeframe regex

**Implementation:**
- Import `computeMatchScore` from `./match-scorer.js`
- For each competency in `scorecard.competencies`:
  - Check if in `matchResult.details.matchingSkills` → search all `resume.experience[].description` (split by sentence) for case-insensitive mention of competency
  - If not in matching but in `derivedMatchSkills` → same search, mark confidence `medium`
  - If in `missingSkills` → skip
- Pick first matching sentence (most recent entry first if multiple)
- Strip the sentence to first 250 chars (for prompt context)

**Verification:** 9 tests pass.

### Step A3: `cover-letter-prompt.js` (TDD)

**Files to create:**
- `extension/src/lib/cover-letter-prompt.js` (~90 lines)
- `extension/tests/cover-letter-prompt.test.js` (~6 tests)

**Test cases:**
1. `buildPrompt(scorecard, evidence, tone)` returns `{ messages: [system, user], estimatedTokens }`
2. system message contains "anti-hallucination" rules
3. system message contains "ЗАПРЕЩЁННЫЕ AI-ПАТТЕРНЫ" section
4. user message includes scorecard.mission
5. user message includes all outcomes (3-5 lines)
6. user message includes all evidence items with competency + evidenceText
7. tone forwarded: `tone='friendly'` → system message contains "friendly and warm"

**Implementation:**
- Pure string assembly
- `estimatedTokens` = rough estimate: `(system.length + user.length) / 4` (chars per token approx for Russian with Latin mix)

### Step A4: `cover-letter-validator.js` (TDD)

**Files to create:**
- `extension/src/lib/cover-letter-validator.js` (~100 lines)
- `extension/tests/cover-letter-validator.test.js` (~14 tests)

**Test cases:**
1. length > 5000 → truncated, warning
2. length = 5000 → ok=true
3. skill mentioned not in evidence AND not in resume.skills → warning `UNVERIFIED_SKILL: <name>`
4. skill mentioned in evidence → no warning
5. digit in text not in evidence → warning `UNVERIFIED_NUMBER`
6. leading "Здравствуйте, меня зовут ..." → stripped
7. LLM filler first paragraph ("Я уверен, что мой опыт...") → stripped
8. AI pattern "кроме того" → warning `AI_PATTERN: ai_vocabulary`
9. AI pattern "не только X, но и Y" → warning `AI_PATTERN: negative_parallelism`
10. `**жирный**` → warning `AI_PATTERN: boldface` + stripped from text
11. "обеспечивая" → warning `AI_PATTERN: verbal_noun_filler`
12. "буду рад принести ценность" → warning `AI_PATTERN: generic_conclusion`
13. em dash count > 3 → warning `AI_PATTERN: em_dash_overuse`
14. clean Russian letter (no patterns) → ok=true, warnings=[]

**Implementation:**
- `validateLetter(text, evidence, resumeSkills)` signature
- Apply transformations in order: strip boldface → strip leading greeting → strip LLM filler → check length → check unverified skills/numbers → AI patterns
- Return `{ ok, text, warnings }`

**Phase A verification:**
```bash
cd extension && npm test
```
Expected: 364 (existing) + ~36 (new) = ~400 passing, 0 failures.

---

## Phase B: Orchestrator + integration

### Step B1: `cover-letter-ai.js` (TDD)

**Files to create:**
- `extension/src/lib/cover-letter-ai.js` (~80 lines)
- `extension/tests/cover-letter-ai.test.js` (~7 tests)

**Test cases:**
1. no API key → returns `{ ok: false, code: 'NO_API_KEY' }` (mock `isAiAvailable` → false)
2. evidence empty → returns `{ ok: false, code: 'NO_EVIDENCE' }`
3. successful path with fetchImpl stub returning LLM text → ok=true, text returned
4. AI returns 500 → returns `{ ok: false, code: 'AI_ERROR', error }`
5. AI returns text with `**boldface**` → text cleaned, warnings populated, ok=true
6. tone forwarded to `buildPrompt`
7. orchestrator calls `applyTone` post-validation

**Implementation:**
- Imports: `extractScorecard`, `mapEvidence`, `buildPrompt`, `validateLetter`, `computeMatchScore`, `sendMessage`, `isAiAvailable`, `applyTone`
- Signature: `generateAICoverLetter(vacancy, resume, opts)` where opts = `{ tone, fetchImpl }`
- Flow per spec section 6.5

### Step B2: Replace `generateCoverLetterAI` in `ai-service.js`

**File to modify:** `extension/src/services/ai-service.js` (lines 156-195)

**Change:**
- Remove primitive prompt building (lines 156-195)
- Replace with: `import { generateAICoverLetter } from '../lib/cover-letter-ai.js';` and thin wrapper that re-exports it under old name for backward compat
- Keep `generateCoverLetterAI` as alias (background/index.js uses it)

**Existing tests in `tests/ai-service.test.js`** (F4.2 section, 3 tests): Update expectations — they tested old prompt structure. After replacement, tests should check that `generateCoverLetterAI` delegates to `generateAICoverLetter` orchestrator. May need to mock `isAiAvailable` and `sendMessage` via injected `fetchImpl`.

**Verification:**
```bash
cd extension && npx vitest run tests/ai-service.test.js tests/cover-letter-ai.test.js
```

---

## Phase C: UI wiring

### Step C1: Add AI button to HTML

**File to modify:** `extension/src/ui/html/tabs/negotiations.js` (line ~60-70 area)

**Add after the tone `<select>`, before the `<textarea>`:**

```html
<button id="cover-letter-ai-btn" type="button"
        style="font-size:11px;padding:4px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;">
  Сгенерировать с AI
</button>
```

### Step C2: Bind AI button handler

**File to modify:** `extension/src/ui/panel/cover-letter-events.js`

**Add:**
- New export `bindCoverLetterAIBtn(opts)` per spec section 7.2
- Calls `chrome.runtime.sendMessage({ type: 'AI_GENERATE_COVER_LETTER', vacancy, resume, opts })`
- On success: fill `#cover-letter-text` value + dispatch `input` event (triggers debounced save)
- On failure: show toast with error code
- Disable button during request, re-enable in finally
- Call `bindCoverLetterAIBtn(opts)` from `bindCoverLetterEvents(container, opts)` (existing function on line 159)

**No test file for this** — UI event binding is hard to test in jsdom without full panel mount. Skip per existing project convention (other bind* functions in same file are not tested either).

### Step C3: Verify background route

**File:** `extension/background/index.js` (line 140)

Already routes `AI_GENERATE_COVER_LETTER` → `generateCoverLetterAI(message.vacancy, message.resume, message.opts)`. No change needed since `generateCoverLetterAI` is aliased to new orchestrator.

---

## Phase D: Documentation + version bump

### Step D1: Update `cascade/state.json`

- `F-CR-02`: status `Stub` → `Works`
- Add acceptance note: "AI cover letter via Scorecard→Evidence→Projection pipeline + 11 humanizer patterns"

### Step D2: Update `worklog.md` (repo root)

Append section per AGENT_RULES template:
```markdown
---
Task ID: F-CR-02
Agent: ZCode session 2026-06-24
Task: AI cover letter generation (Scorecard→Evidence→Projection)

Work Log:
- Wrote spec: docs/specs/2026-06-24-f-cr-02-ai-cover-letter.md
- Wrote plan: docs/plans/2026-06-24-f-cr-02-ai-cover-letter.md
- TDD: 5 new modules + tests
- Wired UI button
- Replaced primitive generateCoverLetterAI with orchestrator

Stage Summary:
- 5 new lib files (scorecard, evidence, prompt, validator, ai orchestrator)
- 5 new test files, ~36 new tests (364 → ~400)
- UI: "Сгенерировать с AI" button in negotiations tab
- AI writing patterns: 11 banned via system prompt + validator
- F-CR-02 status: Stub → Works
```

### Step D3: Version bump (Rule 9.2 — before commit)

**5 files:**
1. `extension/manifest.json`: `"version": "1.9.49.0"` → `"1.9.50.0"`
2. `extension/package.json`: same
3. `extension/src/lib/version.js`: same
4. `extension/popup/index.html`: same (carefully — file is 38 lines, don't break it!)
5. `../README.md` (repo root): same + test count 364 → ~400, files 19 → 24

**Post-bump check:**
```bash
cd extension && bash scripts/version-sync.sh
wc -l extension/popup/index.html  # expect ~38 lines
```

### Step D4: README update

- Bump version line
- Test count: 364 → ~400
- Add `cover-letter-ai.js` + 4 new lib files to file list
- Add "AI cover letter generation (F-CR-02)" to features section

---

## Phase E: Pre-commit verification

### Step E1: Lint
```bash
cd extension && npm run lint
```
Expected: 0 errors, ~22 pre-existing warnings + maybe 0-5 new (cap each file < 250 lines per AHG).

### Step E2: Full test suite
```bash
cd extension && npm test
```
Expected: ~400 pass, 0 fail.

### Step E3: Build
```bash
cd extension && npm run build
```
Expected: success, no esbuild errors.

### Step E4: Version-sync
```bash
cd extension && bash scripts/version-sync.sh
```
Expected: PASSED on 1.9.50.0.

### Step E5: popup/index.html integrity
```bash
wc -l extension/popup/index.html
```
Expected: ~38 lines (one DOCTYPE, not 16).

---

## Phase F: Commit + push

### Step F1: Stage + commit

```bash
cd /home/z/my-project/HH-Copilot-repo
git add -A
git commit -m "feat(F-CR-02): AI cover letter via scorecard+evidence+projection pipeline

Replaces primitive generateCoverLetterAI with structured pipeline:
1. extractScorecard(vacancy) -> mission + outcomes + competencies
2. mapEvidence(scorecard, resume, matchResult) -> verified facts only
3. buildPrompt -> structured LLM prompt with anti-hallucination rules
4. sendMessage -> AI call (temp 0.4 for determinism)
5. validateLetter -> 11 humanizer patterns + unverified facts flagging

Methodology: reverse of interview-designer skill
(Smart scorecard + Adler future projection + Kahneman de-bias).
AI writing patterns: 11 banned via system prompt + post-validator
(inflated symbolism, AI vocab, negative parallelism, verbal noun
filler, rule of three, em dash, generic conclusions, filler,
boldface, inline-header lists, sycophantic).

New files (5):
- src/lib/cover-letter-scorecard.js (~80 lines)
- src/lib/cover-letter-evidence.js (~120 lines)
- src/lib/cover-letter-prompt.js (~90 lines)
- src/lib/cover-letter-validator.js (~100 lines)
- src/lib/cover-letter-ai.js (~80 lines, orchestrator)

New tests (5 files, ~36 tests):
- tests/cover-letter-scorecard.test.js (7 tests)
- tests/cover-letter-evidence.test.js (9 tests)
- tests/cover-letter-prompt.test.js (7 tests)
- tests/cover-letter-validator.test.js (14 tests)
- tests/cover-letter-ai.test.js (7 tests)

Modified:
- services/ai-service.js: generateCoverLetterAI delegates to orchestrator
- ui/html/tabs/negotiations.js: AI button added
- ui/panel/cover-letter-events.js: bindCoverLetterAIBtn handler
- cascade/state.json: F-CR-02 Stub -> Works

Spec: docs/specs/2026-06-24-f-cr-02-ai-cover-letter.md
Plan: docs/plans/2026-06-24-f-cr-02-ai-cover-letter.md

Version: 1.9.49.0 -> 1.9.50.0
Tests: 364 -> ~400"
```

### Step F2: Push

```bash
git push origin main
```

### Step F3: Give sync command to user

Per Rule 9.4 — user runs on Windows:
```powershell
cd C:\Users\stsgr\HH-Copilot-repo
git stash
git pull
git stash pop
npm run build
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| LLM ignores anti-hallucination rules | Post-validator catches with regex; warnings logged; user can manually edit textarea |
| Russian noun-phrase extraction imperfect | Cap competencies at 10; orchestrator works with partial list; bad competencies → no evidence → skipped |
| `match-scorer.js` returns different shape than expected | Test A2 uses real `computeMatchScore` import — will catch shape mismatch early |
| UI button added but panelState.activeVacancy missing | Handler guards with toast "Нужно активное резюме + вакансия" |
| Pre-commit hook rejects (worklog.md not updated) | D2 updates worklog before commit |
| Pre-push hook rejects (version-sync fail) | D3 + E4 verify before push |
| popup/index.html breaks again | D3 explicit `wc -l` check + use Edit tool not sed |
| AI endpoint 403 (internal-api.z.ai private) | User's apiKey (their own) — not our concern; F6.4 backlog |

---

## Estimated Effort

- Phase A (TDD, 4 modules): ~45 min
- Phase B (orchestrator + ai-service replace): ~20 min
- Phase C (UI wiring): ~15 min
- Phase D (docs + version): ~15 min
- Phase E (verify): ~10 min
- Phase F (commit + push): ~5 min

**Total: ~110 min** (assuming no major rework)

---

## Definition of Done

- [ ] All 5 new lib files exist with correct exports
- [ ] All 5 new test files exist, ~36 new tests pass
- [ ] Existing 364 tests still pass
- [ ] Lint: 0 errors
- [ ] Build: success
- [ ] version-sync: PASSED on 1.9.50.0
- [ ] popup/index.html: ~38 lines, one DOCTYPE
- [ ] cascade/state.json: F-CR-02 status = Works
- [ ] worklog.md updated (repo root)
- [ ] README updated (version, test count, file count, features)
- [ ] Committed with ASCII message per AHG
- [ ] Pushed to origin/main
- [ ] Sync command given to user
