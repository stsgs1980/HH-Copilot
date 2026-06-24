# Changelog — HH Copilot

All notable changes to the HH Copilot Chrome Extension are documented in this file.

The detailed per-version changelog lives in [`extension/CHANGELOG.md`](./extension/CHANGELOG.md).
This root file provides a high-level summary of recent releases; for the full
history including v1.9.15.5 → v1.9.31.0, see the extension changelog.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.65.0] — 2026-06-25

### Fixed — CRITICAL
- **Cover letter AI generation: NO_API_KEY out of the box.** Root cause: `sendMessage` in `src/services/ai-service.js` sent only `Authorization: Bearer ${apiKey}`, but the ZAI backend requires 4 chat-session headers (`Authorization`, `X-Token`, `X-Chat-Id`, `X-User-Id`, plus `X-Z-AI-From: Z`). Without `X-Token`, every call failed and `isAiAvailable()` returned `false` until the user manually configured an API key in Settings.
- `ai-service.js` now sends all 5 headers (mirroring `z-ai-web-dev-sdk`). Built-in defaults (apiKey=`Z.ai`, JWT, chatId, userId from the build chat session) are baked into the extension so it works out of the box. When the JWT expires (manifests as HTTP 401, not NO_API_KEY), the user can refresh it via the new fields in Settings -> AI-настройки.
- `isAiAvailable()` now requires BOTH `apiKey` AND `token` (previously only checked `apiKey`).
- Anti-monolith split: extracted `generateCoverLetterAI` + `generateChatReply` into new `src/services/ai-helpers.js` (67 lines). `ai-service.js` is now 215 lines (under the 250 cap).

### Added
- 3 new fields in Settings -> AI-настройки: `X-Token (JWT)`, `X-Chat-Id`, `X-User-Id`. Together with `Base URL` / `API Key` / `Model` / `Timeout` this gives the user full control over all 4 authentication headers.
- Inline hint in Settings explaining how to refresh the JWT when it expires.

### Tests
- 483 tests (+12 net). 3 new tests in `ai-service.test.js` covering built-in defaults and `isAiAvailable` with both fields. `ai-settings.test.js` updated for the 7-field UI.

See [`extension/CHANGELOG.md`](./extension/CHANGELOG.md) for full details.

## [1.9.48.0] — 2026-06-23

### Added
- **F5.6 — AI settings UI + cover-letter persistence wiring** — closes the gap between F4.2/F4.3/F3.2 (backend logic) and the end-user UI. Without this release, the AI service was unreachable from the panel and the cover-letter template textarea did not persist.
- New `src/ui/panel/ai-settings.js` (183 lines): loads AI config from background via `ai-get-config` message, populates the 3 fields in Settings tab (`s-ai-base-url`, `s-ai-api-key`, `s-ai-model`), binds debounced (500ms) save handlers that send `ai-set-config` partial updates. Handles 3 BG response shapes (`{ok,config}`, direct config, `{ok:false}`) + `NO_BG`/`BG_ERR`/`BG_THROW`/`EMPTY_RESP` error codes.
- New `src/ui/panel/cover-letter-events.js` (147 lines): populates `#cover-letter-text` textarea + `#s-letter-tone` select from `getCoverLetterConfig()` when Negotiations tab opens. Debounced (500ms) template save on `input`, immediate tone save on `change`. Tolerates storage failures (never throws).
- New "AI-настройки" card in Settings tab HTML (`src/ui/html/tabs/settings.js`): Base URL + API Key (password) + Model fields, with hint about debounce and storage key.
- New tone selector (`<select id="s-letter-tone">`) next to cover-letter textarea in `src/ui/html/tabs/negotiations.js` — 4 options: formal/friendly/concise/enthusiastic.
- Wired new handlers into `src/ui/panel/events.js`: `bindAiSettingsHandlers` + `bindCoverLetterEvents` called from `bindAllEvents()`. `populateAiFields()` and `populateCoverLetterFields()` triggered on tab switch to settings/negotiations respectively.

### Changed
- `cascade/state.json`: **F1.3 marked completed** — `parseNegotiationItems()` already fulfills all F1.3 acceptance criteria (extracts list, status from predefined values, unread as boolean). Was incorrectly left `pending` while F1.4/F1.8/F1.9 built on top of it.

### Tests
- 37 new tests across `tests/ai-settings.test.js` (22) and `tests/cover-letter-events.test.js` (15). Total: **349 tests** (was 312), all passing.
- New tests cover: loadAiConfig (3 BG response shapes, defaults, error codes), saveAiConfig (success, BAD_INPUT, BG error), populateAiFields (3 fields, defaults on error, no shadowRoot), readAiFields, bindAiSettingsHandlers (debounce, partial save), internal helpers. Cover-letter tests: populate (template + tone, empty template, no shadowRoot, storage throw tolerance), debounced save + cancel, tone change handler (valid + invalid + missing elements), convenience wrapper.

### Fixed
- Rollback of mode-bit drift in working tree (56 files with `100644 -> 100755` mode change, 0 content changes) via `chmod -x`. Working tree now clean before commit.

---

## [1.9.47.0] — 2026-06-17

### Added
- **F4.4 — CAPTCHA detection + auto-pause** — `src/lib/captcha-detector.js` (180 lines). 7 detection selectors (`img[src*=captcha]`, `.g-recaptcha`, `[data-qa*=captcha]`, `iframe[src*=recaptcha]`, `#captcha`, `.captcha`, `textarea#g-recaptcha-response`). `detectCaptcha(root)` returns `{found, type, source}`. State persists in `chrome.storage.local`. `checkAndPause(root, settings)` respects `captchaAutoPause` flag. Badge integration: `chrome.action.setBadgeText({text: '!'})` with amber `#D97706`.

### Changed
- `main.js` boot integration: `loadCaptchaState()` + `checkAndPause()` after `createPanel()`.
- [ANTI-MONOLITH] extracted `loadSavedResumes()` into new `src/content/main-resume-boot.js` (61 lines).

### Tests
- 32 new tests in `tests/captcha-detector.test.js`. Total: **312 tests** (was 280), all passing.

## [1.9.46.0] — 2026-06-17

### Added
- **F3.2 — Cover letter tone + template persistence** — `src/lib/cover-letter-tone.js` (132 lines) + `src/lib/cover-letter-storage.js` (87 lines). 4 tones (formal/friendly/concise/enthusiastic) each with distinct default template + greeting/closing swap rules. `applyTone(text, tone)` post-processes generated letter. Storage wrappers: `getCoverLetterTemplate/setCoverLetterTemplate`, `getLetterTone/setLetterTone`, `getCoverLetterConfig`. `generateCoverLetter` now accepts `tone` option.

### Tests
- 32 new tests in `tests/cover-letter-tone.test.js`. Total: **280 tests** (was 248), all passing.

## [1.9.45.0] — 2026-06-17

### Added
- **F4.3 — AI chat reply UI** — `src/parsers/negotiations-thread.js` (219 lines) + `src/ui/tabs/negotiations-ai-reply.js` (237 lines). Reads chat history from DOM, sends to background via `ai-chat-reply` message, displays 3 variant cards with click-to-insert via `simulateTyping()` (F3.3). 4 tones (formal/friendly/concise/enthusiastic). Anti-hallucination: `EMPTY_VARIANTS` filter, `NO_BG`/`BG_ERR`/`BG_THROW` codes.
- **Chat thread parser**: `parseChatThread(root)` extracts `{from, text, time}` per message using `chat-cell-*` data-qa selectors. `extractThreadForAI()` maps to OpenAI format. `buildStarterPrompt()` fallback when no history.

### Tests
- 30 new tests across `tests/negotiations-thread.test.js` (17) and `tests/negotiations-ai-reply.test.js` (13). All use stubbed `chrome.runtime.sendMessage`, no real network.
- Total: **248 tests** (was 218), all passing.

## [1.9.44.0] — 2026-06-17

### Added
- **F4.2 — AI service** — `src/services/ai-service.js` (234 lines): thin fetch-based client for ZAI chat completions API (`https://internal-api.z.ai/v1/chat/completions`). Why fetch and not `z-ai-web-dev-sdk`: the SDK is Node-only (uses `fs`/`os`/`path` for `~/.z-ai-config` loading) and cannot run in Chrome MV3 service workers. Public API: `sendMessage`, `generateCoverLetterAI(vacancy, resume, { tone })`, `generateChatReply(history, { tone, variants })`, `getAiConfig/setAiConfig`, `isAiAvailable`. 4 tones (formal/friendly/concise/enthusiastic). 30s timeout via AbortController. Never throws — returns `{ ok: false, error, code }` with codes `EMPTY`/`NETWORK`/`TIMEOUT`/`HTTP_<status>`/`RATE_LIMIT`/`NO_API_KEY`/`BAD_JSON`/`BAD_INPUT`.
- **Background AI message routing** — `background/index.js` handles 6 new message types: `ai-send-message`, `ai-cover-letter`, `ai-chat-reply`, `ai-get-config`, `ai-set-config`, `ai-available`.
- **esbuild: background bundling** — `background/index.js` is now bundled as ESM with all `src/services/` imports inlined (was just copied, would have failed at runtime).

### Tests
- 22 new tests in `tests/ai-service.test.js` (config 3, sendMessage success 3, sendMessage errors 8, generateCoverLetterAI 3, generateChatReply 5). All use injected `fetchImpl`, no real network.
- Total: **218 tests** (was 196), all passing.

## [1.9.43.0] — 2026-06-17

### Added
- **F1.9 — Negotiations aggregator UI integration** — the negotiations tab now uses `fetchAllNegotiations()` from F1.8: tab-origin chips row, refresh button, per-item tabOrigin badge, alsoIn indicator for cross-tab duplicates, error toast on partial failure, and overview-tab summary widget.
- **Page handler background-fetch** — `handleNegotiationsPage()` triggers aggregator after initial DOM parse, so panel shows all 8 tabs of data (cache 30s).

### Tests
- 25 new tests in `negotiations-summary.test.js` (196 total, was 171).

---

## [1.9.42.0] — 2026-06-17

### Added
- **F1.4 — Negotiations selectors + diagnostic** — 8 negotiations selector groups with fallback chains, plus `diagnoseNegotiationsDOM()` for structured DOM inspection. Regex fix to capture hyphenated statuses (`not-viewed`).
- **F1.8 — Negotiations cross-tab aggregator** — `fetchAllNegotiations()` fetches all 8 hh.ru tabs (Все / Приглашение / Собеседование / Ожидание / Отказ / Удалённые / Архив), merges, deduplicates by vacancyId, caches 30s. Rate-limited, partial-failure tolerant, fully injectable for tests.
- **F6.2 — Full documentation rewrite** — README, ARCHITECTURE, and CHANGELOG rewritten to reflect v1.9.42.0 state (112 modules, 171 tests, cascade CLI, negotiations module).

### Fixed
- **FAB vertical position** — moved from `bottom: 24px` to `bottom: 80px` to clear hh.ru's bottom nav.

---

## [1.9.41.0] — 2026-06-16

### Added
- **Negotiations auto-load in background** — `/applicant/negotiations` is fetched in the background when the sidebar opens, no user navigation required.
- **Negotiations page parser with status badges** — parses vacancy title, company, date, status (`not-viewed` / `viewed` / `discard` / `invite`) from the negotiations page.
- **Auto-mark vacancies as applied from negotiations** — vacancies with `discard` or `viewed` negotiation status are automatically added to the "applied" set.

### Changed
- **Path simplification** — `hh-extension/hh-auto-respond-extension/` is now `extension/` at the repo root. 192 files moved, path depth reduced from 2 levels to 0.
- **Cascade CLI rewritten in Node.js** — `scripts/cascade-task.js` (430 lines, pure Node.js) replaces `cascade-cli.sh` (484 lines bash + jq). Cross-platform, no jq dependency. Also fixes a bug in the old script that read the wrong state file.

### Fixed
- **Skill gap analysis hint** — instead of silently hiding rows when no data is available, the UI now shows a visible hint.

---

## [1.9.40.0] — 2026-06-16

Version bump release after `1.9.39.0` negotiations features.

---

## [1.9.39.0] — 2026-06-16

### Added
- **Negotiations page parser + UI** — first working version of the negotiations tab with status badges (amber / blue / red / green).
- **Research: Negotiations DOM analysis** — `extension/docs/research/04-negotiations-dom-analysis.md` documents page structure, selector strategy, data model, and 3-phase implementation plan.
- **Research: Chatik (/chat) DOM analysis** — `extension/docs/research/05-chatik-dom-analysis.md` analyzes the chat page structure for future chat-reply automation.

---

## [1.9.38.0] — 2026-06-16

### Added
- **Schedule filter** — filter vacancies by work schedule: remote / hybrid / office.
- **Hide ads checkbox** — toggle in vacancy panel to hide sponsored/ad vacancies.

---

## [1.9.37.0] — 2026-06-16

### Added
- **VOTD filter by title similarity** — "Vacancy of the Day" items are now filtered by title similarity threshold >= 0.3 against the active resume position.
- **Zero skills fallback** — scorer no longer penalizes vacancies with zero extractable skills to 0%, applies a confidence factor instead.
- **Ad badge** — sponsored VotD items show an "Ad" badge to distinguish them from organic recommendations.

### Fixed
- **Popup HTML duplication** — `popup/index.html` had duplicated HTML content; cleaned up, version pinned to `1.9.37.0`.

---

## Earlier versions

For versions `1.9.15.5` through `1.9.36.0`, see [`extension/CHANGELOG.md`](./extension/CHANGELOG.md).

> **Note:** Versions prior to `1.9.15.5` (v1.0.0 – v1.9.14) were developed during the
> initial recovery period and have no CHANGELOG entries. Their history is preserved in
> the README Version Timeline and git log.
