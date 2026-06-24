# HH Copilot — Changelog

All notable changes to the extension are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Note:** Versions prior to v1.9.15.5 (v1.0.0 – v1.9.14) were developed during the
> initial recovery period and have no CHANGELOG entries. Their history is preserved in
> the README Version Timeline and git log. CHANGELOG coverage begins at v1.9.15.5.

---

## [1.9.63.0] — 2026-06-24

### Added
- **DOM-inspector launch button integrated into the main FAB** — Long-deferred UX task (blocked since v1.9.61.0 by cascade-state corruption). A small 32px purple "eye" mini-button is now stacked above the main FAB. Visible only when logged in and panel is closed. Clicking it toggles the DOM inspector (same as the existing header `[data-action="toggle-inspector"]` button).
- **extension/src/ui/fab-inspector-button.js** (new file, 120 lines) — Encapsulates the inspector mini-button: `createFabInspectorButton()`, `setFabInspectorActive()`, `hideFabInspector()`, `showFabInspector()`. Split from fab.js for AHG Rule 12 (200-line limit).
- **`refs.fabInspectorEl`** in `state.js` — New shared DOM reference for the mini-button.

### Changed
- **`createFab(onClick, onInspectorToggle?)`** in `fab.js` — Second optional callback parameter. When provided, the inspector mini-button is created and appended to `document.body`.
- **`updateFabIcon()`** in `fab.js` — Now also drives inspector mini-button visibility (hidden during loading / not-logged-in / panel-open states, same lifecycle as the main FAB).
- **`panel/index.js`** — Passes an inspector toggle callback to `createFab()`. The callback calls `toggleInspector()` without the button arg (the built-in visual update assumes a transparent header button and would clobber the purple bg), then calls `setFabInspectorActive(isInspectorActive())` to manage the pressed-state ring. The existing header `[data-action="toggle-inspector"]` delegated listener now also calls `setFabInspectorActive()` so both entry points stay in sync.

### Notes
- The mini-button ID `hh-ar-fab-inspector` was already listed in `shouldIgnore()` in `dom-inspector.js` (added in v1.9.61.0), so the inspector does not highlight its own toggle button during hover.
- UX choice: mini-button stacked above FAB (vs long-press / double-click). Long-press is non-discoverable on desktop; double-click conflicts with quick sidebar toggle.

## [1.9.62.0] — 2026-06-25

### Fixed
- **cascade-state.json corruption** — root `cascade-state.json` had been silently overwritten with anti-hallucination-guard module dump (RULE-001..017, PROC-*, STD-ENV-*) instead of HH-Copilot task cascade (F0.1-F6.4). Restored original schema from commit c94845b. Audited all 35 tasks against actual code: 33 completed, 2 pending (F5.2 dark/light theme, F6.4 Chrome Web Store).
- **scripts/sync-task-state.sh jq query bug** — `(.implementationFiles | length > 0)` threw "boolean has no length" on null fields; jq `and` does not short-circuit. Replaced with `((.implementationFiles // []) | type == "array" and length > 0)`.
- **auditNote guard in sync-task-state.sh** — tasks with `auditNote` matching `/NOT implemented|manual|blocked/i` are now skipped by auto-sync. Prevents false-positive completion of F5.2 (settings.js exists but dark/light theme NOT implemented).
- **Version drift across 11 files** — README.md (1.9.56.0), AGENT_RULES.md (1.9.47.0), docs/UNICODE_POLICY-v2.1.md (1.9.47.059), extension/popup/index.html (1.9.56.0), extension/docs/research/INDEX.md (1.9.47.0), extension/docs/TASK-CASCADE.md (1.9.61.0), extension/docs/UNICODE_POLICY.md (1.9.47.059), docs/diagrams/hh-copilot-architecture-v2.html (1.9.47.0), extension/worklog.md (1.9.47.04122), cascade/state.json (1.9.49.0) — all synced to 1.9.62.0 via new `scripts/ahg-bump-safe.sh` wrapper.

### Added
- **scripts/ahg-bump-safe.sh** — Safe wrapper around `ahg bump` that excludes `skills/`, `FabInspector/`, `hh-extension/`, `anti-hallucination-guard/` directories. Without this wrapper, `ahg bump` would clobber version strings in 25+ foreign skill files (skills/ has its own version per skill). Needed because `discover-versions.ts` SKIP_DIRS does not include `skills/`, and we cannot patch the AHG submodule (Rule 16: AHG submodule is immutable architecture).

### Changed
- **extension/docs/TASK-CASCADE.md** — Document version 4.0.0 → 5.0.0, date 2026-06-10 → 2026-06-25, current extension version 1.9.31.0 → 1.9.62.0, fixed typo "1.9.47.02074" → "1.9.61.0". Added Changelog v4.0.0 → v5.0.0 section.

## [1.9.61.0] — 2026-06-24

### Fixed
- **UNICODE_POLICY v2.1 [C] violations in production UI** — all emoji in production code replaced with inline Lucide-style SVG (16x16 viewBox 24 24). Affected: dom-inspector.js (6 emoji), shell.js (1 emoji), vacancies.js (2 emoji), cover-letter-events.js (em dash, guillemets, check mark, arrows), settings.js (en dash).
- **ESLint not enforced in pre-commit hook** — rule `no-unicode-graphics` was configured as `error` but pre-commit hook did not call ESLint. Added Phase 4.5 to `.git/hooks/pre-commit`: runs `npx eslint src/ background/ tests/` and blocks commit on any error. Bypass via `LINT_BYPASS=1` env var or `[no-lint]` in commit message.

### Changed
- **Refactoring (Rule 12 anti-monolith)**:
  - Split `dom-inspector.js` (497 lines) → 3 files: `dom-inspector.js` (190), `dom-inspector-panel.js` (228), `dom-inspector-report.js` (97).
  - Split `cover-letter-events.js` (348 lines) → 2 files: `cover-letter-events.js` (159), `cover-letter-ai-events.js` (204).
  - Split `vacancy-fetch-text.js` (258 lines) → 2 files: `vacancy-fetch-text.js` (203), `vacancy-fetch-text-helpers.js` (69).

## [1.9.60.0] — 2026-06-24

### Changed
- **DOM inspector button relocated** from separate floating FAB into sidebar panel header (between tour `?` and close `x` button). Removed `createInspectorFab()`; added `toggleInspector(btn)` for state management.
- **Rule 13 added to AGENT_RULES.md** — version bump is MANDATORY on every code change (even typo).

## [1.9.59.0] — 2026-06-24

### Added
- **Vanilla-JS DOM micro-inspector** — new module `src/ui/dom-inspector.js` (380 lines). Click FAB → hover highlights element (purple overlay) → click to freeze + show panel with Tag, ID, Classes, CSS Path, Text, Outer HTML, Geometry, Computed Style. 4 panel buttons: Copy report / Copy CSS path / Re-pick / Close. Esc to unfreeze/turn off. All styles use `setProperty('!important')` to resist hh.ru CSS overrides. z-index 2147483000 (overlay) / 2147483001 (panel).

## [1.9.58.0] — 2026-06-24

### Added
- **Copy/Clear log buttons** in AI toast UI — `vacancies.js`: 2 new buttons under AI toast. Copy uses `navigator.clipboard.writeText` with textarea+execCommand fallback. Clear resets `aiBtnLog`. Empty log → toast "Сначала кликни Сгенерировать с AI". Success → toast "Вставь в чат с разработчиком".
- **bindAiLogButtons(opts)** in `cover-letter-events.js`.

## [1.9.57.0] — 2026-06-24

### Added
- **AI button verbose logging (F-CR-02)** — new module `src/ui/panel/ai-btn-logger.js` (160 lines). Triple sink: console `[AI-BTN]` + `window.__hhCopilotAIBtnLog` + `chrome.storage.local.aiBtnLog`. Helpers on window: `__hhCopilotAIBtnDump()`, `__hhCopilotAIBtnClear()`. Logs every step: click / ctx / reject-no-ctx / tone / btn-disabled / send-start / send-done / resp-ok / textarea-updated / toast-success / resp-err / exception / btn-restored.
- **Error toast now appends**: "F12 -> Console -> filter [AI-BTN] -> copy all lines."

## [1.9.56.0] — 2026-06-23

### Added
- **AI cover letter orchestrator** (`src/lib/cover-letter-ai.js`) — 3-step pipeline: extract scorecard from vacancy+resume, fetch evidence with stem-matching, generate cover letter via z-ai API.
- **Cover letter scorecard** (`src/lib/cover-letter-scorecard.js`) — 7-test extraction from LLM output.
- **Cover letter evidence** (`src/lib/cover-letter-evidence.js`) — forensic evidence mapping with stem-match anti-hallucination hardening.
- **Cover letter prompt** (`src/lib/cover-letter-prompt.js`) — structured LLM prompt with 11 humanizer patterns (rejects AI-style writing).
- **Cover letter validator** (`src/lib/cover-letter-validator.js`) — anti-hallucination + AI pattern detection.
- **AI settings UI** — Base URL + API Key + Model fields with debounced save.

## [1.9.55.0] — 2026-06-24

### Added
- **FabInspector git submodule** at repo root (`/FabInspector`). Adds the visual element inspector (Next.js dev mode) as a reference module. NOTE: FabInspector targets Next.js 15 + React 19 projects; HH-Copilot is a Chrome Extension (Manifest V3 + esbuild, no React/Next.js runtime), so the inspector cannot be loaded as-is inside the extension. The submodule is added for code reference and possible adaptation of the FAB-triggered inspection pattern.
- **Partial/stem matching (4-tier evidence search)** in `src/lib/cover-letter-evidence.js`: new `mentionsSkillStem()` helper matches skill names against experience sentences by word-stem prefix (first 4–6 chars of each word, ≥4 chars). Catches Russian word-form variations like "Управление продажами" (skill) vs "Управлял командой продаж" (description). Stem-matched evidence is tagged `confidence: 'low'` so the LLM knows it's weaker than an exact match.
- **Experience-based fallback** in `mapEvidence()`: when no per-competency evidence is found, returns the top-2 most recent experience items as `confidence: 'low'` evidence with `competency: '(опыт из резюме)'` and `source.type: 'experience_fallback'`. This guarantees `mapEvidence()` never returns `[]` when `resume.experience` is non-empty — the cover letter can always be generated (user explicitly requested no silent `NO_EVIDENCE` failure when the resume has any experience at all).

### Changed
- **Cover letter editor relocated: Negotiations tab → Vacancies tab.** The "Шаблон сопроводительного" card with textarea, tone selector, AI-generate button, and AI status/toast now lives in the Vacancies tab right after the match-score section, so the user sees their score and writes/generates the letter in the same view. The Negotiations tab retains only the "Эмуляция набора" toggle (typing-speed emulation when sending the letter on hh.ru), with updated copy explaining the template moved. Card title in Negotiations renamed from "Шаблоны и ввод" → "Эмуляция набора".
- `src/ui/panel/events.js` `switchTab()` now calls `populateCoverLetterFields()` when the Vacancies tab opens (in addition to Negotiations), so the textarea + tone select are populated from storage regardless of which tab the user opens first.

### Tests
- 11 new tests in `tests/cover-letter-evidence.test.js` (was 11, now 22 total). New coverage:
  - `mentionsSkillStem` unit tests (6): Russian word-form variation, plural variation, multi-word AND semantics, unrelated-sentence negative, short-word skip, empty-input graceful handling.
  - Stem matching integration in `mapEvidence` (2): stem match → confidence='low'; exact match takes priority over stem (confidence stays high).
  - Experience fallback tests (3): top-2 most recent entries returned when no per-competency evidence; capped at `EXPERIENCE_FALLBACK_MAX=2`; fallback skipped when `resume.experience=[]`.
- Updated `tests/cover-letter-ai.test.js`: old "no matching skills → NO_EVIDENCE" test replaced with two new tests — (a) empty experience → NO_EVIDENCE still returned, (b) experience present + unrelated skills → fallback evidence + AI IS called.
- Total: **471 tests** (was 469, +2 net). All passing.

### Fixed
- **`NO_EVIDENCE` silent failure** — root cause: strict word-boundary matching in `mentionsSkill()` failed on Russian word-form variations ("Управление" vs "Управлял", "продажи" vs "продаж"), causing `mapEvidence()` to return `[]` for resumes where the skill was clearly relevant but phrased differently. Fix: added partial/stem matching as a 4th-tier search + experience-based fallback that always returns at least 2 evidence items when experience is non-empty.

---

## [1.9.48.0] — 2026-06-23

### Added
- **F5.6 — AI settings UI + cover-letter persistence wiring** — closes the gap between F4.2/F4.3/F3.2 (backend logic) and the end-user UI. Without this release, the AI service was unreachable from the panel and the cover-letter template textarea did not persist.
  - **New `src/ui/panel/ai-settings.js` (183 lines)**: loads AI config from background via `ai-get-config` message, populates the 3 fields in Settings tab (`s-ai-base-url`, `s-ai-api-key`, `s-ai-model`), binds debounced (500ms) save handlers that send `ai-set-config` partial updates. Handles 3 BG response shapes (`{ok,config}`, direct config, `{ok:false}`) + `NO_BG`/`BG_ERR`/`BG_THROW`/`EMPTY_RESP` error codes.
  - **New `src/ui/panel/cover-letter-events.js` (147 lines)**: populates `#cover-letter-text` textarea + `#s-letter-tone` select from `getCoverLetterConfig()` when Negotiations tab opens. Debounced (500ms) template save on `input`, immediate tone save on `change`. Tolerates storage failures (never throws).
  - **New "AI-настройки" card** in Settings tab HTML (`src/ui/html/tabs/settings.js`): Base URL + API Key (password) + Model fields, with hint about debounce and storage key.
  - **New tone selector** (`<select id="s-letter-tone">`) next to cover-letter textarea in `src/ui/html/tabs/negotiations.js` — 4 options: formal/friendly/concise/enthusiastic.
  - **Wired new handlers** into `src/ui/panel/events.js`: `bindAiSettingsHandlers` + `bindCoverLetterEvents` called from `bindAllEvents()`. `populateAiFields()` and `populateCoverLetterFields()` triggered on tab switch to settings/negotiations respectively.

### Changed
- `cascade/state.json`: **F1.3 marked completed** — `parseNegotiationItems()` already fulfills all F1.3 acceptance criteria (extracts list, status from predefined values, unread as boolean). Was incorrectly left `pending` while F1.4/F1.8/F1.9 built on top of it.

### Tests
- 37 new tests across `tests/ai-settings.test.js` (22) and `tests/cover-letter-events.test.js` (15). Total: **349 tests** (was 312), all passing.
  - `ai-settings.test.js`: loadAiConfig (3 BG response shapes, defaults, NO_BG/BG_ERR/EMPTY_RESP), saveAiConfig (success, BAD_INPUT, EMPTY_RESP), populateAiFields (3 fields, defaults on error, no shadowRoot), readAiFields (success + no shadowRoot), bindAiSettingsHandlers (bind, debounced save, no-op), internal helpers (setFieldValue/getFieldValue/AI_FIELD_IDS).
  - `cover-letter-events.test.js`: populateCoverLetterFields (template + tone, empty template, no shadowRoot, storage throw tolerance), bindCoverLetterTemplateSave (debounced save, cancel, missing element), bindLetterToneHandler (save on change, invalid tone -> formal, missing element), bindCoverLetterEvents (both bindings), internal exports.

### Fixed
- Rollback of mode-bit drift in working tree (56 files with `100644 -> 100755` mode change, 0 content changes) via `chmod -x`. Working tree now clean before commit.

---

## [1.9.47.0] — 2026-06-17

### Added
- **F4.4 — CAPTCHA detection + auto-pause** — new `src/lib/captcha-detector.js` (180 lines):
  - **7 detection selectors**: `img[src*=captcha]`, `.g-recaptcha`, `[data-qa*=captcha]`, `iframe[src*=recaptcha]`, `#captcha`, `.captcha`, `textarea#g-recaptcha-response`.
  - **`detectCaptcha(root)`** — returns `{found, type, source}`. Anti-ghost: skips `display:none` / `visibility:hidden` via `getComputedStyle()`.
  - **State management**: `getCaptchaState()`, `isAutoPaused()`, `pauseForCaptcha(type, reason)`, `resumeFromCaptcha()`, `loadCaptchaState()`. State persists in `chrome.storage.local` under key `captchaState`, survives page reloads.
  - **`checkAndPause(root, settings)`** — combined detect + pause; respects `settings.captchaAutoPause` flag (when false, only logs).
  - **Badge integration**: when CAPTCHA detected on page load, `chrome.action.setBadgeText({text: '!'})` with amber color `#D97706`.
- **main.js boot integration** — `init()` now calls `loadCaptchaState()` before `createPanel()` (restore persisted pause) and `checkAndPause(document, panelState.settings)` after (detect CAPTCHA on current page).

### Changed
- **`src/content/main.js`** — added imports of `loadCaptchaState`, `checkAndPause`; added CAPTCHA check block after `createPanel()`. Removed inline `loadSavedResumes()` (extracted for AHG Rule 12).
- **[ANTI-MONOLITH]** main.js exceeded 250 lines after additions → extracted `loadSavedResumes()` + resume-related imports into new `src/content/main-resume-boot.js` (61 lines).

### Tests
- **`tests/captcha-detector.test.js`** (290 lines, 32 tests): `detectCaptcha` (10), state accessors (4), `pauseForCaptcha` (4), `resumeFromCaptcha` (3), `loadCaptchaState` (2), `checkAndPause` (5), internal sanity (3). All use `chrome.storage.local` stub.
- Total tests: **312** (was 280, +32 new). All passing.

### Fixed
- Anti-ghost hidden-element check originally used `offsetParent === null` + `getClientRects().length === 0`, but jsdom has no layout engine so these are always empty. Switched to `getComputedStyle()` checking `display` / `visibility` only.

---

## [1.9.46.0] — 2026-06-17

### Added
- **F3.2 — Cover letter tone + template persistence** — new `src/lib/cover-letter-tone.js` (132 lines) and `src/lib/cover-letter-storage.js` (87 lines):
  - **4 tones**: formal / friendly / concise / enthusiastic, each with distinct default template and greeting/closing swap rules.
  - **`validateTone(tone)`** — returns `'formal'` for unknown/invalid input (never throws).
  - **`getTemplateForTone(tone)`** — returns tone-specific default template containing `{position}`, `{company}`, `{experience}`, `{skills}`, `{matching_sentence}` placeholders.
  - **`applyTone(text, tone)`** — post-processes generated letter: swaps `Здравствуйте!` ↔ `Добрый день!` ↔ empty (concise) ↔ `Здравствуйте! Очень рад возможности откликнуться!` (enthusiastic); similarly for closings.
  - **`getCoverLetterTemplate()` / `setCoverLetterTemplate(text)`** — read/write user-saved template from `chrome.storage.local.settings.coverLetterTemplate`. Falls back to formal default if empty/whitespace.
  - **`getLetterTone()` / `setLetterTone(tone)`** — read/write tone (validated before saving).
  - **`getCoverLetterConfig()`** — one-call read of `{template, tone}` for efficiency.
- **Cover letter generator tone integration** — `generateCoverLetter(vacancy, resume, { template, tone })` now accepts a `tone` option. When no explicit template is provided, the tone drives the default template choice. After `fillTemplate`, `applyTone(text, tone)` swaps greeting/closing per tone.

### Changed
- **`src/lib/cover-letter-generator.js`** — added imports of `validateTone`, `applyTone`, `getTemplateForTone`. `DEFAULT_TEMPLATE` now sourced from `getTemplateForTone('formal')` (single source of truth). `generateCoverLetter` accepts `options.tone`, applies tone adjustments in step 4. Return value now includes `tone` field.
- **`src/engine/apply-actions-cover-letter.js`** — `fillCoverLetter()` now reads stored template + tone via `getCoverLetterConfig()`. Priority: sidebar textarea > stored template > tone-default.

### Tests
- **`tests/cover-letter-tone.test.js`** (243 lines, 32 tests): `TONES` config (2), `validateTone` (3), `getTemplateForTone` (5), `applyTone` (7), storage `getCoverLetterTemplate` (3), `setCoverLetterTemplate` (2), `getLetterTone` (3), `setLetterTone` (2), `getCoverLetterConfig` (2), internal sanity (3). All use `chrome.storage.local` stub.
- Total tests: **280** (was 248, +32 new). All passing.

---

## [1.9.45.0] — 2026-06-17

### Added
- **F4.3 — AI chat reply UI** — new `src/parsers/negotiations-thread.js` (219 lines) parses the chat thread inside an open negotiation, and new `src/ui/tabs/negotiations-ai-reply.js` (237 lines) renders the AI reply panel:
  - **Tone selector**: 4 tones (formal/friendly/concise/enthusiastic).
  - **"AI: 3 варианта" button** — reads chat history from the DOM via `parseChatThread()`, falls back to `buildStarterPrompt()` when no history, sends `{type:'ai-chat-reply', history, opts}` to background script, displays 3 variant cards.
  - **Click-to-insert variant** — calls `simulateTyping()` from F3.3 (with native input setter + punctuation pauses), honors existing `neg-type-emulation` checkbox and `neg-type-speed` input from the cover-letter section.
  - **Loading + error states** — button shows "Генерация..." and disables during fetch; red `[ERR]` block appears on failure.
  - **Anti-hallucination**: variants filtered to non-empty trimmed strings (`EMPTY_VARIANTS` code if all filtered out); background errors mapped to `NO_BG`/`BG_ERR`/`BG_THROW`/`EMPTY_RESP`.
- **Chat thread parser** (`parseChatThread`) — extracts `{from, text, time}` per message using `chat-cell-*` data-qa selectors. Detects user vs employer via `data-qa*="-out"` suffix, `msg-out*` class, or alignment class heuristics. Anti-ghost: skips cells with empty text, filters out sub-elements (chat-cell-text, chat-cell-creation-time) that match the same prefix selector.
- **`extractThreadForAI(messages)`** — maps internal format to OpenAI/ZAI chat format (`user`/`assistant` roles).
- **`buildStarterPrompt(conv)`** — fallback when no chat history (initiates conversation with polite vacancy inquiry).

### Changed
- **`src/ui/html/tabs/negotiations.js`** — added `<div id="neg-ai-reply-area">` container below chat input.
- **`src/ui/tabs/negotiations.js`** — `renderChatMessages()` now calls `renderAiReplyArea()` at the end so the AI panel appears whenever a conversation is opened.
- **`src/ui/panel/events.js`** — extended delegated click handler with `#neg-ai-generate` and `.ai-variant-card`; added change listener for `#neg-ai-tone` select.

### Tests
- **`tests/negotiations-thread.test.js`** (165 lines, 17 tests): `parseChatThread` (8), `extractThreadForAI` (4), `buildStarterPrompt` (3), internal helpers (2).
- **`tests/negotiations-ai-reply.test.js`** (220 lines, 13 tests): `requestAiReply` (7), `setAiTone` (2), `insertVariant` (2), state management (2). All use stubbed `chrome.runtime.sendMessage`.
- Total tests: **248** (was 218, +30 new). All passing.

### Fixed
- `parseChatThread` was over-counting cells: `[data-qa^="chat-cell-"]` matched both the cell AND its child `chat-cell-text` element. Added `isSubElement()` filter that excludes elements matching `TEXT_SELECTORS` or `TIME_SELECTORS`.
- Variant filter accepted whitespace-only strings as valid. Added `.trim()` before length check.

---

## [1.9.44.0] — 2026-06-17

### Added
- **F4.2 — AI service (z-ai-web-dev-sdk compatible)** — new `src/services/ai-service.js` (234 lines) provides a thin fetch-based client for the ZAI chat completions API. Used by the background service worker to handle AI requests from content scripts.
  - **Why fetch and not the SDK**: `z-ai-web-dev-sdk` is Node-only (uses `fs`, `os`, `path` for config loading from `~/.z-ai-config`). Chrome MV3 service workers cannot use Node built-ins, so the SDK cannot be bundled. Instead, the same HTTP call is re-implemented: `POST {baseUrl}/chat/completions` with Bearer auth and an OpenAI-compatible body.
  - **Public API**: `sendMessage({ messages, model, temperature, timeoutMs, fetchImpl })`, `generateCoverLetterAI(vacancy, resume, { tone })`, `generateChatReply(history, { tone, variants })`, `getAiConfig()`, `setAiConfig(partial)`, `isAiAvailable()`.
  - **Tone support**: 4 cover-letter tones — `formal` / `friendly` / `concise` / `enthusiastic` — mapped to descriptive system prompts.
  - **Chat reply variants**: `generateChatReply()` produces 1–3 distinct reply variants, split by `---VARIANT---` separator; falls back to a single variant if the AI ignores the separator.
  - **Configurable endpoint**: API base URL and key live in `chrome.storage.local` under key `aiConfig`. Default base URL: `https://internal-api.z.ai/v1`. Default model: `glm-4.5`.
  - **Anti-hallucination**: `sendMessage` NEVER throws — every failure path returns `{ ok: false, error, code }` with one of: `EMPTY`, `NETWORK`, `TIMEOUT`, `HTTP_<status>`, `RATE_LIMIT`, `NO_API_KEY`, `BAD_JSON`, `BAD_INPUT`. 30-second timeout via `AbortController`.
- **Background script AI message routing** — `background/index.js` now handles 6 new message types from content scripts: `ai-send-message`, `ai-cover-letter`, `ai-chat-reply`, `ai-get-config`, `ai-set-config`, `ai-available`. All return a Promise-based response with `ok: boolean`.
- **esbuild: background bundling** — `esbuild.config.mjs` now bundles `background/index.js` as an ESM module (`dist/background/index.js`, ~10 KB) with all `src/services/` imports inlined. Previously the background was copied as-is, which would have failed at runtime once imports were added.

### Changed
- **`background/index.js`** — added `import` of ai-service public API at the top of the file; added 6 new `case` branches to the `chrome.runtime.onMessage` router.
- **`esbuild.config.mjs`** — added `backgroundOptions` (bundle:true, format:'esm'), added `backgroundCtx` to watch mode, added `esbuild.build(backgroundOptions)` to single-shot build.

### Tests
- **`tests/ai-service.test.js`** (330 lines, 22 tests): config (3), sendMessage success (3), sendMessage errors (8), generateCoverLetterAI (3), generateChatReply (5). All use injected `fetchImpl` (no real network). Tests cover: success path, empty response, HTTP 500, HTTP 429 (rate limit), AbortError (timeout), generic network error, malformed JSON, missing API key, bad input, tone forwarding, variant splitting, variant clamping, HTTP error propagation.
- Total tests: **218** (was 196, +22 new). All passing.

### Fixed
- Fixed `generateCoverLetterAI` and `generateChatReply` not forwarding `fetchImpl` to `sendMessage`, which would have caused production code to bypass the test stub and hit the real ZAI API.
- Fixed `generateChatReply` variant splitting: previously if the AI returned fewer parts than `variants` requested, the function discarded the actual parts and returned `[result.text]` (1 variant). Now uses `parts.length > 0 ? parts.slice(0, variants) : [result.text]`.

---

## [1.9.43.0] — 2026-06-17

### Added
- **F1.9 — Negotiations aggregator UI integration** — the negotiations tab now consumes `fetchAllNegotiations()` from F1.8:
  - **Tab-origin chips row** under the status chips: filter by source tab (Все / Приглашение / Ожидание / Отказ / Удалённые / Архив) with live counts.
  - **Refresh button** `[R]` in the chips row: invalidates cache, refetches all 8 tabs, re-renders. Shows `...` during fetch.
  - **Per-item tabOrigin badge**: small grey pill on each item showing which hh.ru tab it came from.
  - **`alsoIn` indicator**: if a vacancy appears in multiple tabs, shows `[also in: wait]` link.
  - **Error toast**: if some tabs fail, shows red toast with error count + details on hover (auto-hide 5s).
  - **Empty state improvements**: shows distinct message when errors vs. genuinely empty.
  - **Overview tab widget**: new "Отклики" card in overview showing total + breakdown (Приглашения / Не просмотрены / Просмотрены / Отказы) + "из кэша" hint when cache served.
- **Page handler background-fetch**: `handleNegotiationsPage()` now triggers `fetchAllNegotiations()` after the initial DOM parse, so the panel ends up with all 8 tabs worth of data (cache 30s → instant on subsequent loads).
- **Event handlers** wired: `.neg-tab-btn` clicks → `setNegotiationTabFilter()`, `#neg-refresh-btn` clicks → `refreshNegotiations()`.

### Changed
- **`src/ui/tabs/negotiations.js`** — refactored to consume aggregated items + meta; preserves existing status filter behavior.
- **`src/ui/tabs/overview.js`** — added `renderNegotiationsSummary()` called from `renderOverviewKPI()`.
- **`src/ui/html/tabs/overview.js`** — added `<div id="overview-negotiations">` container between rate-limits and quick-actions.
- **`src/ui/panel/events.js`** — single delegated click handler now covers `.neg-status-btn`, `.neg-tab-btn`, `#neg-refresh-btn`.

### Anti-hallucination
- Empty aggregator result → "Откликов пока нет" (not blank).
- Fetch errors → red error toast with count (not silent failure).
- `null`/`undefined` items in arrays skipped in count computation (anti-ghost).

### Tests
- New `tests/negotiations-summary.test.js` (25 tests): STATUS_CONFIG, TAB_ORIGIN_LABELS, computeStatusCounts (incl. null/undefined items), computeTabOriginCounts, formatSummaryText (declension), renderStatusChip, renderTabOriginChip.
- Total: 196/196 pass (was 171, +25).
- Lint: 0 errors. Build: v1.9.43.0 OK.

---

## [1.9.42.0] — 2026-06-17

### Added
- **F1.4 — Negotiations selectors + diagnostic** — `extension/src/lib/selectors.js` extended with 8 negotiations selector groups (each with 2-4 step fallback chain: primary `data-qa` → relaxed `^=`/`~=` → Bloko BEM class). New `extension/src/parsers/negotiations-diagnostic.js` exposes `diagnoseNegotiationsDOM()` for structured DOM dump (mirrors `diagnoseVacancyPage()` pattern). Regex fix: `negotiations-item-(\w+)` → `negotiations-item-([\w-]+)` to capture hyphenated statuses like `not-viewed`. (commit `6a76acf`)
- **F1.8 — Negotiations cross-tab aggregator** — `extension/src/parsers/negotiations-aggregator.js` (210 lines): `fetchAllNegotiations()` fetches all 8 hh.ru tabs (Все / Приглашение / Собеседование / Ожидание / Отказ / Удалённые / Архив), merges, deduplicates by `vacancyId` (fallback to title+company), caches 30s in `chrome.storage.local` (key `negotiations:all`). Rate-limited 1 req/sec between tab fetches. Partial failure tolerant: failed tab returns `[]` + error, doesn't break others. Each item stamped with `.tabOrigin` field. All dependencies (fetch, DOMParser, parseItems, sleep) injectable for testing. 20 new tests, 171/171 total pass. (commit `2418a6f`)
- **F6.2 — Full documentation rewrite** — `README.md` (45 KB, full project description with v1.9.42.0 features, 112 modules, 171 tests, cascade CLI, negotiations parser), `ARCHITECTURE.md` (modular structure with layer sizes table, B1+B2+B3 splits, ESLint integration, cascade CLI, path simplification history), `CHANGELOG.md` (root + extension, all versions 1.9.15.5 through 1.9.42.0). All 25 file links verified to exist on disk. Version sync verified across 5 sources: manifest.json = package.json = README = ARCHITECTURE = both CHANGELOGs = 1.9.42.0. (commit `11e49e4`)

### Fixed
- **FAB vertical position** — FAB moved from `bottom: 24px` to `bottom: 80px` to avoid overlap with hh.ru bottom navigation bar. (commit `a8f6d43`)

---

## [1.9.41.0] — 2026-06-16

### Added
- **Negotiations auto-load in background** — when the sidebar opens, `/applicant/negotiations` is fetched in the background and parsed without requiring the user to navigate there. `fetchAndParseNegotiations()` uses `fetch()` + `DOMParser` and reuses the same parsing pipeline as the on-page path. (commit `71b5fa2`)
- **Negotiations page parser with status badges** — `/applicant/negotiations` is now parsed: vacancy title, company, date, status (`not-viewed` / `viewed` / `discard` / `invite`), vacancy ID extracted from link. Status badges color-coded. (commit `aede43e`)
- **Auto-mark vacancies as applied from negotiations page** — when a status `discard` or `viewed` negotiation is found for a vacancy, that vacancy is automatically added to the "applied" set so it no longer shows as "new" in search. (commit `9535cf4`)

### Changed
- **Path simplification** — `hh-extension/hh-auto-respond-extension/` is now `extension/` at the repo root. 192 files moved, path depth reduced from 2 levels to 0. README, AGENT_RULES, verify-docs.json, pre-commit hook all updated. (commit `c70d47f`)
- **Cascade CLI rewritten in Node.js** — `scripts/cascade-task.js` (430 lines, pure Node.js, no external deps) replaces the old `cascade-cli.sh` (484 lines bash + jq). Cross-platform. Old shell script preserved as a 35-line thin wrapper for backward compatibility. The old script also read the wrong state file (`cascade-state.json` instead of `cascade/state.json`) — that bug is now fixed. (commit `c70d47f`)

### Fixed
- **Skill gap analysis hint** — instead of silently hiding skill-gap rows when no data is available, the UI now shows a visible hint explaining why no analysis is shown. (commit `d9ca153`)

---

## [1.9.40.0] — 2026-06-16

### Changed
- Version bump release after `1.9.39.0` negotiations features. (commit `e95d9e3`)

---

## [1.9.39.0] — 2026-06-16

### Added
- **Negotiations page parser + UI** — first working version of the negotiations tab. Page handler registered for `/applicant/negotiations`, parser extracts vacancy/company/date/status, UI shows status badges (amber = not-viewed, blue = viewed, red = discard, green = invite). (commit `aede43e`)
- **Research: Negotiations DOM analysis** — `docs/research/04-negotiations-dom-analysis.md` documents the page structure, selector strategy (only `data-qa` is stable, Magritte hashed classes break), data model, and 3-phase implementation plan. (commit `6472846`)
- **Research: Chatik (/chat) DOM analysis** — `docs/research/05-chatik-dom-analysis.md` analyzes the chat page structure for future chat-reply automation. (commit `385f300`)

---

## [1.9.38.0] — 2026-06-16

### Added
- **Schedule filter** — filter vacancies by work schedule: remote / hybrid / office. Checkbox group in the vacancy panel. (commit `ba68c4c`)
- **Hide ads checkbox** — toggle in vacancy panel to hide sponsored/ad vacancies from the list. (commit `ba68c4c`)

---

## [1.9.37.0] — 2026-06-16

### Added
- **VOTD filter by title similarity** — "Vacancy of the Day" items are now filtered by title similarity threshold >= 0.3 against the active resume position, reducing irrelevant VOTD suggestions. (commit `dbeb86b`)
- **Zero skills fallback** — when a vacancy has zero extractable skills, the scorer no longer penalizes it to 0% but applies a confidence factor. (commit `dbeb86b`)
- **Ad badge** — sponsored VotD items show an "Ad" badge so the user can distinguish them from organic recommendations. (commit `dbeb86b`)

### Fixed
- **Popup HTML duplication** — `popup/index.html` had duplicated HTML content; cleaned up, version pinned to `1.9.37.0`. (commit `1370ec3`)

---

## [1.9.36.0] — 2026-06-14

### Added
- **Irrelevant vacancies filter** — vacancies below a configurable `minMatchScore` threshold are now moved to a separate "Irrelevant vacancies" section in the sidebar. (commit `41007c1`)
- **Irrelevant vacancies section open by default** — the irrelevant section is now expanded by default for visibility. (commit `bbee136`)

### Changed
- **Scoring improvements** — role mismatch penalty added; skill confidence factor introduced for low-skill-count vacancies to avoid over-penalizing sparse-skill jobs. (commit `f4f7243`)

---

## [1.9.35.0] — 2026-06-14

### Changed
- **Enrichment badges translated to Russian** — sidebar vacancy cards now show `полный` / `кэш` / `предварительный` instead of English `full` / `cache` / `preliminary`. (commit `0b8d40a`)

---

## [1.9.34.0] — 2026-06-14

### Changed
- Version bump release. (commit `3c3d96f`)

### Fixed
- **Resume experience description parsing** — glued sentences in the experience description are now split into separate lines instead of running together. (commit `90b9983`)

---

## [1.9.33.0] — 2026-06-14

### Changed
- **UNICODE_POLICY compliance audit** — all non-ASCII / non-Cyrillic characters in UI code replaced with ASCII equivalents (`≈` → `~`, etc.). (commit `f29054d`)
- **Skill scoring deep clean** — scoring now uses only employer `keySkills` from the vacancy detail page, never search-result tags (which can be noisy). (commit `1479197`)
- **Vacancy numbering** — sidebar vacancy list now shows `1. 2. 3. ...` numbering for easier reference. (commit `d6acf53`)

### Fixed
- **Skill scoring source** — detail-only vacancy skills are now used instead of merging all search results, which previously caused inflated skill match scores. (commit `067446e`)
- **Skill synonym display** — `≈` (U+2248) replaced with `~` in skill synonym UI per UNICODE_POLICY. (commit `7c6d98a`)

---

## [1.9.32.0] — 2026-06-14

### Changed
- Version bump release. (commit `4153a16`)

### Fixed
- **Skill scoring deep clean** — only employer `keySkills` are now used; never search-result tags. (commit `1479197`)

---

## [1.9.31.0] — 2026-06-15

### Added
- **Role-implied skills** — skills self-evident from position title are no longer shown as "missing". When a person holds the title "Руководитель отделов продаж", skills like "руководство коллективом" and "управление проектами" are assumed present.
  - `role-implied-skills.js` — local static map (7 role groups: Руководитель, Руководитель отдела продаж, Менеджер по продажам, Маркетолог, HR-специалист, Проектный менеджер, Финансовый специалист). Inspired by ESCO essential/optional concept, adapted for hh.ru Russian market.
  - 5-tier skill match hierarchy in scorer: Explicit (100%) → Derived (70%) → Synonym (50%) → Implied (40%) → Missing (0%)
  - `quality-recommendations.js` — implied skills filtered from "missing" and shown separately at low priority
  - `match-scorer-skills.js` — implied skills get 40% partial credit in scoring

### Research
- `docs/research/01-role-implied-skills.md` — ESCO essential/optional skills research, API verification, implementation plan
- `docs/research/02-kula-ai-ats.md` — Kula.ai AI-native ATS analysis, applicable concepts (must-have vs nice-to-have, semantic matching)
- `docs/research/INDEX.md` — research index with conclusions and TODO items

### Changed
- `ARCHITECTURE.md` — added Section 9 (Skill Matching Pipeline) and Section 10 (Documentation Structure)
- `06-quality-analysis.puml` — added role-implied-skills.js component and 5-tier match hierarchy
- `01-architecture-layers.puml` — added IMP and QR components, fixed wrong arrows (MSSK→SD→IMP, QF→SSYN→QR→SSYN+IMP), removed dead VDS

### Removed
- `parsers/vacancy-detail-skills.js` — dead code (logic moved to `vacancy-fetch-text.js` in v1.9.30.0)
- `parsers/vacancy-detail-parsers.js` — dead code (logic moved to `vacancy-fetch-text.js` in v1.9.30.0)
- 6 unused barrel `index.js` files (lib, parsers, services, ui, ui/tabs, ui/html/tabs)

---

## [1.9.30.0] — 2026-06-14

### Added
- **Cover letter generator** — tailored cover letters using vacancy detail + resume data (`cover-letter-generator.js`, 538 lines, 17 tests)
- **Parser unification** — `vacancy-detail.js` now delegates to `parseVacancyDetailFromDoc()` from `vacancy-fetch-text.js` (single source of truth for vacancy parsing)
- **Vacancy enrichment fixes** — `vacancy-fetch-enrichment.js` now merges location from detail page (was missing)
- **Cover letter tests** — 17 new tests (`tests/cover-letter.test.js`)
- **Vacancy fetch tests** — new tests (`tests/vacancy-fetch.test.js`)
- **Salary parsing** — `match-scorer-salary.js` now handles от/до prefixes via `parseVacancySalaryString`

### Changed
- `apply-actions.js` fills cover letter instead of skipping
- Salary/experience merged into top-level (removed *Structured)
- `enrichmentSource` correctly shows 'cache' (was always 'detail')

### Fixed
- **Vacancy experience scoring** — empty experience '' always scored 15/15 instead of neutral 8/15 (`vacancy-list.js`, `match-scorer-experience.js`)
- **gaussianRandom** — floor of 2.0s overrode FETCH_DELAY_MIN=1500ms (moved `Math.max(2.0)` from `gaussianRandom` to `randomDelay` only)
- **gaussianDelay** — no upper bound clamp; ~0.3% delays exceeded maxMs (added `Math.min(maxMs)` clamp)
- **Russian stem regex** — `quality-experience.js` added `[а-яА-ЯёЁ]*` suffix absorber for Cyrillic word endings
- Duplicate `querySelector` in `vacancy-detail-parsers.js`

---

## [1.9.29.0] — 2026-06-14

### Added
- **Vacancy deep fetch (background enrichment)** — previously, vacancy scoring on the search results page used only 2–5 tag skills from SERP cards. The system now fetches full vacancy detail pages in the background (via hidden iframe + text fetch fallback), parses keySkills, derivedSkills, description sections, structured salary/experience, and re-scores with enriched data. This makes match scoring as accurate on the search page as on the vacancy detail page.
  - `vacancy-fetch.js` — orchestrator: cache enrichment → background fetch → re-score → UI update
  - `vacancy-fetch-iframe.js` — Strategy 1: load vacancy page in hidden iframe, parse fully-rendered DOM
  - `vacancy-fetch-text.js` — Strategy 2: fetch HTML via `fetch()`, parse with DOMParser (fallback)
  - `vacancy-fetch-enrichment.js` — merge detail data into shallow vacancy objects, re-compute match score
  - `parseVacancyDetailFromDoc()` — shared parser used by both strategies (no dependency on global `document`)
- **Cache-based enrichment** — previously stored vacancy details (from visiting `/vacancy/{id}` pages) are now automatically used to enrich SERP vacancies. No network request needed for cached data < 24h old.
- **Enrichment depth indicator in UI** — each vacancy card now shows a badge: `deep` (full analysis), `cache` (from storage), or `serp` (tags only, fetch in progress). Skill count shown per vacancy.
- **Live score updates** — as each vacancy is enriched in the background, the vacancy list re-renders with the updated match score.
- **Rate limiting** — gaussian delay (1.5–3.5s) between fetches, max 50 per batch, priority order (higher scores first).
- **Tests** — 19 new tests for vacancy-fetch, vacancy-fetch-enrichment, and parseVacancyDetailFromDoc.

### Changed
- `handleVacancySearchPage()` now runs cache enrichment immediately, then starts background deep fetch
- `handleMainPage()` now also enriches vacancies from cache and background fetch
- SPA MutationObserver re-triggers enrichment when search results change
- `renderVacancyList()` shows enrichment badges and skill counts

---

## [1.9.28.2] — 2026-06-14

### Fixed
- **Resume detection safety net** — resume detail pages (`/resume/{hash}`) and applicant view pages (`/applicant/resumes/view?resume=XXX`) had no fallback init like vacancy pages. If the `hh-ar-init-page-logic` event was missed (race condition), resume parsing never started. Safety net now covers all detail page types.
- **Routing for `/applicant/resumes/view`** — this URL was incorrectly routed to the resume list handler instead of the resume detail handler. Now correctly calls `handleResumeDetailPage()` with query-param ID extraction.
- **"Sync all" button hidden** — the "All resumes" accordion was collapsed by default, hiding the "Синхронизировать все" button. When no active resume exists, the accordion now auto-expands on panel init.
- **`renderInitialData()`** now calls `renderMyResumesPanel()` to populate the resume list at boot.

---

## [1.9.28.0] — 2026-06-12

### Added
- **Rule 9.5** — all project documentation MUST be in English; chat responses to the user remain in Russian. Added to AGENT_RULES.md.

### Changed
- **All documentation translated to English** — README, ARCHITECTURE, CHANGELOG, TASK-CASCADE, guides, wireframes, PUML reference, and worklog entries. UI strings visible to end users remain in Russian.

### Fixed
- **Sponsored VotD (adsrv.hh.ru)** — 3 of 14 "Vacancies of the Day" were skipped due to tracking URLs (`adsrv.hh.ru/click?meta=ENCRYPTED`) without `vacancyId`. The vacancy ID is now extracted from the numeric `id` attribute of the parent element (e.g., `id="131408939"`). Three-level extraction strategy: (1) `vacancyId` parameter in click-URL, (2) nearest link with `vacancyId=`, (3) `id` attribute of ancestor element matching `/^\d{6,12}$/`.
- All VotD elements now receive the canonical URL `https://hh.ru/vacancy/{id}` instead of the tracking URL.
- Added tests: ID extraction from parent `id`, canonical URL for VotD, adsrv.hh.ru URL parsing.

---

## [1.9.27.0] — 2026-06-12

### Fixed
- **VotD parsing (0/14)** — "Vacancy of the Day" on the hh.ru homepage returned 0 elements. Cause: VotD links are tracking URLs (`content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=XXX`), not standard `/vacancy/XXX`. `extractVacancyId()` now recognizes `?vacancyId=NNN` in query parameters. `parseVacanciesOfTheDay()` uses `titleEl.closest('a')` to find the click-URL.
- Added 5 `extractVacancyId` tests for VotD URL patterns.
- Added 6 VotD parsing tests with realistic DOM structure.
- Test suite: 68 tests passing.

---

## [1.9.26.0] — 2026-06-12

### Added
- **Vacancy parsing on the homepage** — when opening `hh.ru/`, the extension parses two blocks: (1) recommended vacancies with `~=` word-match for `data-qa` attributes and `href` fallback; (2) "Vacancy of the Day" block via `data-qa="vacancy_of_the_day_title"` with three vacancy ID extraction strategies.
- Added `mainPage` route to `detectPageType()` for the `/` URL pattern on `hh.ru`.
- `parseVacanciesOfTheDay()` — new parser function for VotD blocks.

---

## [1.9.25.0] — 2026-06-12

### Added
- **Hot Module Replacement (HMR)** — the extension automatically reloads when files change during development. WebSocket server (`ws://localhost:35729`) starts via `npm run watch`. Content script listens for reload messages and calls `chrome.runtime.reload()`. Eliminates manual extension reloading during development.

---

## [1.9.24.0] — 2026-06-12

### Fixed
- **35 WCAG/typography issues** across the entire sidebar UI:
  - **Contrast**: secondary text `#71717a` → `#52525b`, placeholder `#6b7280`, disabled button `#6b7280`, tour skip `#71717a` → `#52525b`.
  - **Invalid CSS properties**: removed `role:status`, `role:alert`, `aria-live:assertive`, `tabindex:0` from CSS declarations.
  - **Focus indicators**: `:focus-visible` styles for tab buttons, toggles, vacancy items, tour buttons.
  - **Typography**: `font-variant-numeric: tabular-nums` on score rings, `-webkit-font-smoothing: antialiased`.
  - **ARIA attributes**: `role="status"` + `<span class="sr-only">` on spinner, `role="switch"` on toggle, `aria-expanded`/`aria-controls` on timeline toggles, `role="radiogroup"` on stats period, `role="article"` + `aria-label` on vacancy items, `aria-label` on blacklist delete, `aria-valuenow` on range inputs, `lang="ru"` + `role="dialog"` on sidebar, `aria-hidden` on decorative dots.
  - **Keyboard navigation**: WAI-ARIA tabs with Arrow/Home/End keys, Escape closes sidebar, focus trap (Tab cycles within sidebar), focus management on open/close, Enter/Space activates vacancy links.
- Fixed tab switching bug — missing `data-tab` attribute on tab buttons.
- Fixed `&nbsp;` rendering as literal text in sidebar UI.

---

## [1.9.23.0] — 2026-06-11

### Changed
- **Anti-monolith refactoring**: split `match-scorer.js` into 4 focused modules — `match-scorer-skills.js` (skill overlap 0-40), `match-scorer-title.js` (title similarity 0-30), `match-scorer-salary.js` (salary fit 0-15), `match-scorer-experience.js` (experience match 0-15). The main `match-scorer.js` is now a thin orchestrator.
- Removed `cascade-guard` submodule (repository deleted on GitHub).

---

## [1.9.22.0] — 2026-06-11

### Added
- **Synonym skill matching** — related skills are partially accounted for in scoring. If a vacancy requires "P&L" and the resume has "sales management", the synonym group provides a partial match bonus. Synonym groups: sales, IT, marketing, HR, leadership.

---

## [1.9.21.0] — 2026-06-11

### Fixed
- **"What to improve" recommendations** — replaced the noisy "10 skills not in experience descriptions" with actionable "vacancy skills missing from resume", showing only real gaps. Created a shared utility `vacancy-skills-collector.js`.

---

## [1.9.20.0] — 2026-06-11

### Fixed
- Skip skills already included in `derivedSkills` when generating recommendations — no duplicate warnings for skills the user already has.

---

## [1.9.19.0] — 2026-06-11

### Added
- **Vacancy skill derivation from job title** — vacancy cards on the search page rarely contain `keySkills`, so `deriveVacancySkills()` extracts skills from the vacancy title via `SKILL_PATTERNS` and heuristics.
- Added sales/commercial cross-references: "коммерческ" ↔ "продаж" ↔ "менеджер по развитию".
- Added missing skills to skill-dictionary: sales strategy, LTV, ROI, sales funnel building, unit economics.
- **Experience scoring fix** — "overqualified" penalty removed. Exceeding the maximum experience is NOT a penalty on the Russian labor market. 10+ years with a "3-6 years" requirement now gives 12/15 (was 8/15).

---

## [1.9.18.0] — 2026-06-11

### Fixed
- **10 bugs from code review**: employment type parsing, work format parsing, multi-value format handling, career growth logic, false positive vague phrases, Cyrillic regex boundaries, specific uncovered skills in recommendations, tooltip for uncovered skills, tour improvements.

---

## [1.9.17.0] — 2026-06-11

### Fixed
- **Skill parser** — 5 fallback strategies when `skills-card` data-qa is absent in hh.ru DOM (Magritte redesign): skills-table, heading detection, `data-qa*="skill"` scan, Magritte tag scan.
- **Experience scoring** — parse vacancy experience string ("3-6 лет") into structured format `{min:3, max:6}`.
- **Vacancy navigation** — removed broken SPA click interception that was blocking navigation.

---

## [1.9.16.0] — 2026-06-11

### Added
- **SPA navigation** — `pushState`/`replaceState` patch in `page-world.js` (MAIN world). Interception of vacancy/resume link clicks via `pushState` instead of full page reload. `MutationObserver` with 1-second debounce automatically re-parses vacancies.

---

## [1.9.15.9] — 2026-06-11

### Added
- **Derived skills from experience** — `skill-dictionary.js` (50+ Russian skill keyword patterns) + `derive-skills.js` automatically extracts skills from work experience descriptions. Integrated into both resume parsing paths (DOM and fetch). `scoreSkills()` now uses `derivedSkills` with 70% weight.

---

## [1.9.15.6] — 2026-06-11

### Fixed
- **initPageLogic() was not being called** — replaced broken `dynamic import()` with `CustomEvent 'hh-ar-init-page-logic'` pattern. Added safety net: auto-call after 3s on vacancy pages. `initPageLogic()` made idempotent to prevent duplication.

---

## [1.9.15.5] — 2026-06-11

### Added
- **Detailed vacancy parser** — `parseVacancyDetail()` extracts all fields from `/vacancy/{id}` pages: title, company, salary, experience, description, key skills, employment type, work format.
- **Match scoring** — `calculateMatchScore(vacancy, resume)` returns `{total: 0-100, breakdown: {skills, salary, experience, position, location}}`.
- **Vacancy storage** — `storage-vacancies.js` persists vacancy data between sessions.

---

## [1.9.14] — 2026-06-11

### Added
- **"Resume Assessment" block** in the Resume tab — objective assessment of completion quality:
  - Ring chart with % (color: green ≥70%, amber ≥40%, red <40%)
  - Checklist of 11 criteria with weights: position, name, salary, city, contacts, skills (3+), experience (1+), education, languages, about me, employment/format
  - Hint depending on percentage

### Changed
- **"Skill Match" block moved from Resume tab to Vacancies tab** — skills vs. vacancies analysis makes more sense tied to vacancies rather than resume
- Renamed: "Skill Analysis" → "Skill Match" (more accurate name)

---

## [1.9.13] — 2026-06-11

### Fixed
- **Contacts: concatenated text "Электронная почтаfoo@bar.com"** — `textContent` of `[data-qa="resume-contact-email"]` element contains label + email. Email is now extracted via regex from text or via `mailto:` href (clean email without label)
- **Contacts: phone was not parsed** — `[data-qa="resume-contact-phone"]` did not match actual hh.ru structure. Added: priority `tel:` href, extended data-qa selectors (`[data-qa*="contact-phone"]`), search for `a[href^="tel:"]` in contacts block, regex on block text
- **Contacts: false telegram @hh_ru_official** — regex `@(\w{4,})` captured the hh.ru link from the footer. Fixed: telegram is now searched only in the contacts block, system hh.ru accounts excluded (hh_ru_official, hhru, hh_ru, etc.)
- Both parsers synchronized: `parseContacts()` (live page) and `parseContactsFromDoc()` (fetch) use identical logic

### Changed
- **"Skill Analysis" block hidden until vacancies are available** — previously showed useless "0%" with text "open vacancies for comparison". Now the block is completely hidden until vacancies are loaded for comparison

---

## [1.9.12] — 2026-06-11

### Fixed
- **Contacts "Data not found"** — phone, email and telegram were not parsed when loading via fetch (sync all resumes). `parseContactsFromDoc()` was not called in `fetchAndParseResume()`, although it was called in `parseResume()` for the live page
- Added `parseContactsFromDoc()` to `resume-fetch-parse.js` — parsing contacts from fetched HTML with fallback strategies:
  - `data-qa` selectors (primary)
  - `mailto:` links
  - Regex patterns for phone and email
  - Search for `t.me/` links throughout the document
- Added `phone`, `email`, `telegram` fields to resume model in `fetchAndParseResume()`

---

## [1.9.11] — 2026-06-11

### Added
- **"All Resumes" block — collapsible accordion** — the block can now be collapsed/expanded by clicking the header (data-timeline toggle + chevron)
- Visible/hidden resume counters (badge) in accordion header

### Changed
- Block order: "All Resumes" is now on top, "Active Resume" — below
- Anti-monolith refactoring: split iframe-vis strategies, centralize panelState mutations
- Version: 1.9.10 → 1.9.11

---

## [1.9.10] — 2026-06-11

### Changed
- Anti-monolith refactoring: all files ≤200 lines, panelState centralised
- Split 6 monolith files, centralize chrome.storage
- Split main.js (454→139), events.js (301→209), centralize storage
- Updated submodules: anti-hallucination-guard (cascade-guard removed)

---

## [1.9.9] — 2026-06-11

### Fixed
- **Hidden resumes marked as visible** — three bugs in the visibility detection chain:
  1. **Premature UNKNOWN→VISIBLE fallback** in `extractVisibilityStatus()` and `parseResumeList()` — the resume list immediately marked UNKNOWN as VISIBLE without waiting for the detail page check. Removed: UNKNOWN stays UNKNOWN until the resume page is checked
  2. **Strategy 2 in `detectVisibilityFromResumePage()`** — `text.includes('скрыть')` matched any element ("скрыть контакты", "скрыть раздел", etc.), returning VISIBLE. Fixed: only exact match "скрыть резюме"
  3. **Resume page overrode list** — if the page returned VISIBLE (false positive), it overwrote the correct HIDDEN from the list. New priority logic: HIDDEN beats VISIBLE (both from list and page); VISIBLE beats UNKNOWN; final UNKNOWN→VISIBLE fallback only in `syncAllResumes()` after all checks
- Final UNKNOWN→VISIBLE fallback moved from `extractVisibilityStatus()` / `parseResumeList()` to `syncAllResumes()` — triggers only after both list and detail page have been checked

---

## [1.9.8] — 2026-06-11

### Added
- **Visibility detection from resume page** — `detectVisibilityFromResumePage()` in `resume-fetch-resume.js`:
  6 strategies for determining hidden/visible status from the resume detail page HTML:
  1. `data-qa` attributes (`resume-make-visible`, `resume-action-hide`)
  2. Button text ("Сделать видимым" = hidden, "Скрыть резюме" = visible)
  3. Body text with hidden indicators
  4. Raw HTML search with `&nbsp;` normalization
  5. Script/hydration JSON (`"hidden": true`)
  6. Presence of `data-qa="resume-action-hide"` = visible
- Data from the resume page **overrides** data from the list (more reliable)
- **Radio buttons in "All Resumes" list** — select active resume by clicking the card (◉ active, ○ inactive)
- **↻ (re-parse) button** on active resume card — contextual: amber for hidden, standard for visible
- **"Get from page" CTA** in "All Resumes" block — shown only on the resume page when there is no active one

### Changed
- **Button consolidation** — from 7 visible buttons to 2 main ones:
  - Removed "Re-parse active/hidden" — replaced by ↻ on the card
  - "Get from page" moved from empty state to "All Resumes"
  - "Synchronize all" became outline (secondary)
  - Diagnostics collapsed behind chevron (3 buttons hidden)
- **Dropdown selector removed** — replaced by radio buttons (eliminates accidental clicks)
- **Button rename** — "Make current active" → "Get from page" (eliminates "current" vs "active" confusion)
- **Block rename** — "Resume Parsing" → "Active Resume"
- Hidden resume warning — now text instead of button

### Fixed
- **`getResumePageType()` returned `'resume'` instead of `'resume-detail'`** — because of this, the hint "Click 'Get from page' below" and the CTA button were NEVER shown on the resume page. Both consumers (`render-resume-panel.js`, `render-my-resumes.js`) compared against `'resume-detail'`
- **detectVisibilityFromLinkText()** — no longer returns VISIBLE prematurely; returns UNKNOWN, allowing other strategies (card, proximity, script) to work
- **Final UNKNOWN→VISIBLE fallback** — added after ALL strategies in `resume-fetch-helpers.js` and `resume-detail/index.js`
- **Hidden resumes were not re-hidden** after re-hiding on hh.ru — fixed by detection from the resume page

---

## [1.9.7] — 2026-06-11

### Added
- **Loading spinners for buttons** — all 3 buttons (load-resume, sync-resumes, analyze-skills) show loading state with `btn-spinner` and restore after completion
- **`hh-ar-load-resume-done` event** — dispatched after resume loading completes for button restoration
- **`hh-ar-sync-done` event** — dispatched after synchronization completes for button restoration

### Changed
- Version: 1.9.6 → 1.9.7
- Popup version sync: v1.7.3 → v1.9.7
- README version sync: v1.8.3 → v1.9.7

---

## [1.9.6] — 2026-06-11

### Added
- **Strategy 5/6 sub-modules** — decomposition of strategy5-scanners.js and strategy6 sub-modules from monolithic files
- `resume-fetch-strategy5-scanners.js` — scanners for strategy 5 (DOM scanners for searching JSON in script tags)
- `resume-fetch-strategy6-urls.js` — API/URL fallback approaches for strategy 6
- `resume-fetch-strategy6-iframe.js` — hidden iframe (PRIMARY method of strategy 6)
- `resume-fetch-strategy6-expand.js` — expand orchestrator for strategy 6
- `resume-fetch-strategy6-api.js` — API-based fallback for strategy 6

### Fixed
- **Experience scroll & text truncation** — fixed text truncation and scrolling in the experience section
- Version: 1.9.5 → 1.9.6

---

### Fixed
- **Strategy 6: hidden iframe instead of AJAX** — diagnostics showed that the "Expand" button
  does NOT use AJAX. React/Magritte loads all experience data during client-side hydration,
  and the button simply toggles component visibility. Since full data is absent
  from SSR HTML and `<script>` tags, the only reliable way to get all records is to load
  the page in a hidden iframe, wait for React hydration, click "Expand" and parse the DOM.
  - New method `fetchExpandedExperienceViaIframe()` — PRIMARY approach in Strategy 6
  - New method `parseExperienceFromIframeDoc()` — DOM parsing from iframe
  - Existing approaches (API endpoints, query params) kept as fallback

### Changed
- **Anti-monolith refactoring of resume-fetch.js** — 1481-line file split into 8 modules:
  - `resume-fetch.js` (~45 lines) — thin orchestrator (imports + re-exports + syncAllResumes)
  - `resume-fetch-list.js` (~65 lines) — fetchResumeList()
  - `resume-fetch-resume.js` (~150 lines) — fetchAndParseResume() + header/skills parsers + experience orchestrator
  - `resume-fetch-experience.js` (~95 lines) — strategies 1-3 (DOM-based experience)
  - `resume-fetch-strategy4-text.js` (~145 lines) — strategy 4 (text search) + stripHtmlTags
  - `resume-fetch-strategy5-scripts.js` (~190 lines) — strategy 5 (script JSON)
  - `resume-fetch-strategy6-expand.js` (~370 lines) — strategy 6 (iframe, API, URL)
  - `resume-fetch-json-utils.js` (~130 lines) — JSON utilities (extractJsonArray, buildEntryFromApiItem, findExperienceInObject)
  - `resume-fetch-education-languages.js` (~50 lines) — education + languages + about me
- Public API unchanged: `fetchResumeList`, `fetchAndParseResume`, `syncAllResumes` are re-exported from resume-fetch.js
- Version: 1.9.4 → 1.9.5

---

## [1.9.4] — 2026-06-11

### Added
- **Loading spinner in panel** — when clicking "Load from current page" in `#res-parsed-data`
  a `.har-spinner` + text "Loading resume..." is shown instead of empty state
- **Strategy 6: extended experience parsing via AJAX/API** — new strategy for retrieving
  hidden experience records (3→6) that hh.ru loads lazily via "Show all":
  - (a) Search for "Show all" button URLs (href, data-url, data-action-url)
  - (b) Search for Magritte expansion URLs in `<script>` tags
  - (c) Try known API endpoints (`/applicant/api/v1/resumes/{id}`, `api.hh.ru/resumes/{id}`)
  - (d) Try expansion parameters (`?expand=all`, `?expand=experience`, `?showAll=true`)
  - (e) Parse JSON API responses (hh.ru API format: position, company, start/end dates)
  - (f) Parse expanded HTML documents (company-cards + stepper + text patterns)
- **JSON API parser** — `parseExperienceFromJson()` with recursive search for experience array
  in arbitrary JSON structure + `buildEntryFromApiItem()` for converting hh.ru API fields

### Fixed
- **Logger invisible in Chrome DevTools** — `console.debug` is hidden by default, replaced with
  `console.log` — now all `[HH-AR][ResumeFetch]` messages are visible without enabling Verbose

### Changed
- `parseExperienceFromDoc()` became `async` to support Strategy 6 (fetch requests)
- `fetchAndParseResume()` now `await parseExperienceFromDoc()`
- Version: 1.9.2 → 1.9.4

---

## [1.9.0] — 2026-06-11

### Added
- **Strategy 4: text-based experience parsing from HTML** — if data-qa parsing found few records,
  search for ALL date ranges (like "январь 2020 — настоящее время") in the experience section and
  extract surrounding text (position, company, description)
- **Strategy 5: experience parsing from Magritte JSON** — search for experience data in `<script>` tags
  (hydration state, `window.__INITIAL_STATE__`, `resumeStore`)
- **Diagnostic HTML dump** — first 2000 characters of experience section output to console
  for structure analysis during debugging

### Fixed
- Work experience: 5 parsing strategies instead of 3 (company-cards → stepper supplement →
  stepper fallback → text patterns → script JSON)

### Changed
- Version: 1.8.9 → 1.9.0

---

## [1.8.9] — 2026-06-11

### Fixed
- **Work experience: 3 → 6 records** — two root bugs:
  - Race condition in `initPageLogic()`: `expandHiddenSections()` was called without `await`, so `parseResume()` ran before hidden sections were expanded (3 visible cards instead of 6)
  - Stepper fallback in `parseExperienceFromDoc()` only triggered when `uniqueCards.length === 0` — if 3 company-cards were already found, remaining stepper-items were ignored
- **Stepper supplement in live DOM parser** — `parseExperience()` now also supplements records from stepper-items not covered by company-card wrappers
- **Noisy `checkAuth` logs** — removed 3 `console.log()` from `checkAuth()` that were spamming every 5 seconds

### Changed
- `parseExperienceFromDoc()` — 3 strategies: company-cards → stepper supplement → full stepper fallback
- `parseExperience()` (live DOM) — similar 3 strategies + company info search from parent elements
- Version: 1.8.8 → 1.8.9

---

## [1.8.8] — 2026-06-11

### Fixed
- **"Load from current page" on non-resume pages** — on the homepage (`/`) and `/applicant/resumes` the button now loads the first resume from `myResumes[]` or offers synchronization
- **Stepper fallback** — added to `parseExperienceFromDoc()` when zero company-cards are found
- **Debug logging** — preliminary count of company-cards, stepper-items and "Show all" buttons in fetched HTML

---

## [1.8.7] — 2026-06-11

### Fixed
- **Parsing on edit page** — `/resume/edit/{id}/about` does not contain `data-qa` attributes, now uses `fetchAndParseResume()` to load the view page
- **"Clear resume" button** — added `_resumeCleared` flag to prevent auto-restoration from `myResumes[0]`
- **Parse validation** — empty result (no title, skills, experience) does not overwrite good data
- **`initPageLogic()` made async** — to support `await fetchAndParseResume()`

---

## [1.8.5] — 2026-06-10

### Fixed
- **`parseSalaryConditions` ReferenceError** — function was not imported in `parse-resume.js`, call failed with ReferenceError
- Added import of `parseSalaryConditions` from `parse-resume-sections.js`

---

## [1.8.4] — 2026-06-10

### Fixed
- **Skill Gap UI wireframe compliance** — brought into compliance with the design mockup

---

## [1.7.3] — 2026-06-10

### Fixed
- **Pre-push hook**: fixed path resolution bug (`.git/hooks/..` instead of `.git/hooks/../..` — guard was silently disabled)
- **validate.sh whitelist**: added `check-agent.sh` and `audit.sh` to the allowed list
- **cascade-guard/setup.sh**: added execute permissions (`chmod +x`)
- **Git tracking**: removed 1052 skills/ files (system files, not part of project) from git index
- **Git tracking**: removed content.js.bak and content.js.map (build artifacts) from git index
- **.gitignore**: added global rules `*.bak`, `*.map`, `upload/`

### Added
- **cascade-guard submodule** — git submodule (https://github.com/stsgs1980/Cascade-guard.git)
  - cascade-cli.sh — task navigation CLI (next-task, start-task, complete-task, status, validate)
  - cascade-init.sh — interactive cascade-state.json generator
  - cascade-state.json — 35 tasks, 7 phases (P0-P6), single source of truth for statuses
  - AGENT_RULES.md — rules C-1..C-9 (dependencies, priorities, verification)
- **Git hooks**: pre-commit (blocks without fresh worklog) + pre-push (runs validate.sh)
- **worklog.md**: complete work log with Task IDs 1-22

### Changed
- **.gitmodules**: added cascade-guard submodule
- **AGENT_RULES.md**: merged AHG rules (1-6) + Cascade rules (C-1..C-9)
- Repository synced with origin/main (GitHub)

---

## [1.7.2] — 2026-06-10

### Added
- **6-tab UI wireframe** — complete panel redesign per wireframe
  - Overview, Resume, Vacancies, Negotiations, Settings, Statistics
  - Green accent theme (#059669/#10B981), glass-morphism, CSS animations
  - KPI ring, score ring, toggle switch, progress bar

### Fixed
- **FAB CSS isolation** — all styles via `style.setProperty(prop, value, 'important')`
  - hh.ru CSS no longer overrides FAB color

---

## [1.7.1] — 2026-06-10

### Added
- **Username display** — in header and auth badge when authorized
- **FAB tooltip** — for each authorization state

### Fixed
- **authIndicator badge** — click handler was dead, now works
- **renderSidebarContent null state** — fixed regex for spinner HTML

---

## [1.7.0] — 2026-06-10

### Added
- **Anti-monolith split** — all JS files split to <250 lines
  - parse.js (408) → 4 files
  - panel/index.js (277) → panel/ + events.js
  - Total 42 JS files, all <250 lines
- **TASK-CASCADE.md v4.0.0** — Phase 0 marked completed, Phase 0.5 added
- **Popup redirect** — minimal HTML redirect to FAB on icon click

### Changed
- Project renamed: HH-Auto-Respond → HH-Copilot

---

## [1.6.0] — 2026-06-10  (Phase 0 complete)

### Rewritten
- **Phase 0: esbuild modular refactoring (F0.1-F0.9)** -- monolithic content.js (1637 lines)
  decomposed into 16 ES modules with a single build step
  - `src/lib/selectors.js` -- HH_SELECTORS (47+ groups), findElement, findAllElements
  - `src/lib/anti-hallucination.js` -- safeGetText, safeGetAttr, safeClick, safeInput,
    waitForElement, validateVacancyData, extractVacancyId, createLogger
  - `src/lib/storage.js` -- DEFAULT_SETTINGS, DEFAULT_STATS, chrome.storage.local CRUD
  - `src/lib/timing.js` -- gaussianRandom, randomDelay, simulateReading, simulateTyping
  - `src/lib/rate-limiter.js` -- rateLimiter (check, recordAction, adaptiveSlowdown, resetBurst)
  - `src/parsers/vacancy-list.js` -- parseVacanciesFromPage
  - `src/parsers/resume-detail.js` -- parseResume (12 fields), diagnoseResumeDOM
  - `src/parsers/vacancy-detail.js` -- stub parseVacancyDetail (Phase 1)
  - `src/parsers/negotiations.js` -- stub parseNegotiations (Phase 1)
  - `src/ui/fab.js`, `src/ui/panel.js` -- FAB + Shadow DOM sidebar
  - `src/ui/tabs/vacancies.js`, `src/ui/tabs/resumes.js` -- working tabs
  - `src/ui/styles.js`, `src/ui/html.js`, `src/ui/state.js`, `src/ui/auth.js` -- UI infrastructure
  - `src/content/main.js` -- boot sequence (auth gate, detectPageType, SPA observer)
  - `src/engine/auto-respond.js` -- stubs applyToVacancy/continueApply/applyToAll
  - `src/services/index.js` -- service barrier file

### Added
- **esbuild** as build tool (IIFE bundle, sourcemaps)
  - `esbuild.config.mjs` -- build configuration
  - `package.json` -- build/watch scripts
- **content.js.bak** -- backup of the original monolith

### Changed
- content.js now built from src/ modules via `npm run build`
- manifest.json: `type: "module"` for service worker

---

## [1.5.4] -- 2026-06-10

### Added
- Anti-hallucination-guard submodule + pre-commit/pre-push hooks
- consumer-project detection in pre-push (skip module validation)

---

## [1.5.3] -- 2026-06-10

### Rewritten
- Complete documentation overhaul with code cross-checking:
  ARCHITECTURE.md, README.md, UNICODE_POLICY.md, TASK-CASCADE.md v3.0

### Fixed
- Sidebar width 750px -> 720px
- Storage key resume -> myResume
- Clone URL fixed

---

## [1.5.0] -- 2026-06-10

### Removed
- Mass cleanup of dead code: 311 files, -41361 lines
  - hh-bot/, Next.js app/, mini-services/, skills/, download/, upload/
  - Only the extension left in extension/

---

## [1.4.0] -- 2026-06-10

### Added
- Auto-expand hidden resume sections before parsing
- Sidebar width 360px -> 720px

### Fixed
- Duplicate duration in experience period
- Removed text truncation
- Dead code (content/, lib/ -- never imported)

---

## [1.3.0] -- 2026-06-09

### Fixed
- **Critical bug: 8 of 11 resume fields were not parsed** on Magritte pages
  - Cause: selectors used CSS classes that Magritte hashes on each deploy
  - Result: gender, age, address, specialization, skills, experience, education, languages — all ✗
  - Only title, salary and skill-level-3 were found

### Rewritten
- **`parseResume()` — completely new parsing strategy (Magritte-safe)**:
  - **Auto-detection of sections** by h2/h3 heading text ("Опыт работы", "Образование", etc.)
  - Does not depend on specific `data-qa` or CSS classes — works with any Magritte version
  - Gender/age/address — parsing from text content near h1
  - Experience — search by `/employer/` links, b/strong tags, date patterns
  - Education — search by links and b/strong tags within the section
  - Skills — combined search: `data-qa="skills-table"` + heading "Навыки"
  - Languages — bloko-tag within section with heading "Языки"
- **`HH_SELECTORS`** — complete cleanup of Magritte-hashed CSS classes:
  - Removed: `.resume-block__title-text`, `.resume-block__salary`, `h1.bloko-header-section-1`,
    `h2.bloko-header-1`, `.applicant-resumes__resume`, `.resume-block-item`,
    `.vacancy-serp-item__compensation`, `.vacancy-description`, `.vacancy-response-popup`,
    `textarea.bloko-textarea`, `button.bloko-button_primary`, `.bloko-tag__section`
  - Removed from `parseResume()`: `.bloko-text_strong`, `.bloko-text`, `[class*="strong"]`,
    `[class*="description"]`, `[class*="experience"]` — all Magritte-hashed
  - Replaced with: `b, strong, p` + `data-qa` attributes (stable)
  - Internal experience/education selectors: `b/strong` instead of `.bloko-text_strong`

---

## [1.2.0] — 2026-06-09

### Fixed
- **Critical bug**: "Load from current page" button called `parseResume()`
  on the `/applicant/resumes` page (resume list), which always gave the error
  "Could not parse resume from current page", since `parseResume()` expects URL `/resume/{hash}`
- **Cause**: `hh-ar-load-resume` handler did not check the current page type

### Added
- **Context-dependent "Load" button logic**:
  - On `/resume/{hash}` — parses the specific resume (as before)
  - On `/applicant/resumes` — parses and displays the resume list
  - On other pages — warns that you need to navigate to the correct page
- **`getResumePageType()`** — determines page type by URL
- **`renderResumeListPanel()`** — renders resume list in sidebar
  - Clickable links to each resume (opens in new tab)
  - "loaded" badge for already loaded resumes
  - Hint for the user
- **Auto-save resume list** in `panelState.resumeList` when visiting `/applicant/resumes`
- **CSS for resume list**: `.har-resume-list-*` styles
- **"Open on hh.ru" button** in loaded resume card

### Changed
- `panelState` extended: added `resume`, `resumeList`, `activeTab`
- `renderResumePanel()` now checks for list presence and page type
  before showing placeholder

---

## [1.1.0] — 2026-06-09

### Added
- **Resume parser** — full Magritte/Bloko DOM structure support
  - 30+ CSS selectors based on `data-qa` (stable, independent of deploy)
  - Parsing: position, salary, city, gender, age, specializations
  - Skills with level detection (Advanced / Intermediate / Beginner)
  - Work experience: company, position, period, description
  - Education: name, graduation year
  - Languages: name and proficiency level
  - Additional info (citizenship, relocation readiness, etc.)
- **"My Resume" tab** in sidebar
  - Display of all parsed data
  - Skill tags with color styling
  - Work experience list with positions and periods
  - "Load from current page" button
  - "Go to resume list" button (opens /applicant/resumes)
- **Auto-parsing** when opening a resume page (`/resume/{hash}`)
- **Resume saving** in `chrome.storage.local` between sessions
- **Debug panel** — collapsible block with results for each selector
  - ✓ found fields (green)
  - ✗ missing fields (red)
- **Tab system** in sidebar (Vacancies / My Resume)

### Changed
- `initPageLogic()` extended: handling of `/resume/{hash}` and `/applicant/resumes`

### Technical Details
- Magritte CSS classes with hashes (e.g., `magritte-card___bhGKz_8-5-13`) are NOT used
  due to instability. Only `data-qa` attributes and Bloko BEM classes.
- Skills are extracted only from the `[data-qa="skills-table"]` block
  to avoid capturing languages and tags from other sections.

---

## [1.0.0] — 2026-06-09

### Added
- **Chrome Extension (Manifest V3)** — basic architecture
  - `manifest.json` — MV3 configuration
  - `content.js` — single bundle (MV3 does not support ES modules in content scripts)
  - `background/index.js` — Service Worker
  - `popup/` — 4-tab popup (Stats, Settings, Templates, Logs)
  - `icons/` — PNG icons 16/48/128px
- **FAB (Floating Action Button)** — 56px, bottom-right
  - 3 states: gray (checking) → red (unauthorized) → blue (authorized)
  - Hover animation (scale 1.08)
- **Sidebar** — 360px, right-side, Shadow DOM isolation
  - Header with name and version
  - Authorization block with login button
  - Statistics: responses / remaining / errors
  - Daily limit progress bar
  - Buttons: "Apply to all", "Pause", "Refresh"
  - Vacancy list with response buttons
- **Authorization detection** — `checkAuth()`
  - 13 CSS selectors (data-qa + class-based)
  - Cookie fallback (hhruuid, _HH-RU, hhtoken)
  - Polling every 2 seconds
- **Vacancy parser** — `parseVacanciesFromPage()`
  - Card selectors: title, company, salary, location, experience, tags
  - Filtering: already applied, company blacklist
  - Data validation (title, company, url, id)
- **Anti-Hallucination** — safe DOM operations
  - `safeGetText()` — visibility check before text extraction
  - `safeClick()` — disabled, visibility check
  - `safeInput()` — correct value setting via property setter
  - `validateVacancyData()` — 4-level validation
  - `waitForElement()` — MutationObserver with timeout
- **Rate Limiter** — token bucket + adaptive slowdown
  - 200/day, 30/hour, 30s interval, burst max 5
  - Adaptive factor on 429/slow/captcha
- **Storage** — `chrome.storage.local` wrapper
  - Default settings
  - Statistics with daily reset
  - List of applied vacancies
  - Company blacklist
- **SPA Observer** — MutationObserver for search page
  - Auto-update of vacancy list on navigation without reload

### Known Issues
- `offsetParent !== null` check in v1.0.0 broke authorization
  (fixed in hotfix included in 1.1.0)

---

## [1.0.0-hotfix] — 2026-06-09 (not released)

### Fixed
- **Critical bug**: `offsetParent === null` for `position:fixed` elements
  - hh.ru header is fixed, so `offsetParent` is always `null`
  - Result: authorization was NEVER detected (FAB always red)
  - Solution: replaced with `getComputedStyle().display/visibility` check
  - Affected: `checkAuth()`, `findElement()`, `waitForElement()`, `safeClick()`
- **Expanded authorization selector set**: 3 → 13 + cookie fallback

---

[1.1.0]: https://github.com/stsgs1980/HH-Copilot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/stsgs1980/HH-Copilot/releases/tag/v1.0.0
