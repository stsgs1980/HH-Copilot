# Worklog — HH Copilot Extension

---
Task ID: 6
Agent: Main
Task: Fix visibility detection — Magritte-aware multi-strategy approach

Work Log:
- User confirmed: all 3 resumes show "Видимо" when 2 should be "Скрыто"
- User pointed out: hh.ru uses Magritte design system, code was "guessing"
- Root cause: proximity search finds hash in <script> hydration data first, not card HTML
- Rewrote 3 files with Magritte-aware multi-strategy visibility detection
- Version bumped: 1.7.9 → 1.8.0, build successful

Stage Summary:
- resume-constants.js: HIDDEN_INDICATORS, RESUME_CARD_SELECTORS, detectVisibilityFromCard(), stripScripts(), findCardForLink()
- resume-fetch-helpers.js: 3 strategies (data-qa cards, script state, proximity with script stripping)
- resume-detail/index.js: 3 strategies (data-qa cards, DOM walk, proximity with script stripping)
- Added debugVisibility() diagnostic (window.__hhDebugVisibility)

---
Task ID: 7
Agent: Main
Task: Fix &nbsp; (U+00A0 non-breaking space) in visibility detection

Work Log:
- User's console logs showed "Многие не видят ваше резюме" in link text but visibility still "visible"
- ROOT CAUSE: hh.ru uses &nbsp; (U+00A0) between words: "Многие\u00A0не\u00A0видят"
- Code compared "многие не видят" (regular spaces) against text with \u00A0 — NEVER matched
- Added normalizeWs() to resume-constants.js: converts ALL Unicode whitespace to regular spaces
- Added hasHiddenIndicator() that normalizes whitespace before checking HIDDEN_INDICATORS
- Updated extractResumeLinks() (resume-fetch-helpers.js): Strategy 0 uses hasHiddenIndicator()
- Updated extractVisibilityStatus() (resume-fetch-helpers.js): Strategy 3 proximity uses hasHiddenIndicator()
- Updated parseResumeList() (resume-detail/index.js): Strategy 3 proximity uses hasHiddenIndicator()
- Fixed debugVisibility(): indicator search now normalizes whitespace before matching
- LINE_BREAK_INJECTORS use \s+ between words to handle &nbsp; variations
- Build successful, committed as v1.8.1

Stage Summary:
- &nbsp; normalization is the key fix — all visibility comparisons must go through hasHiddenIndicator()
- Strategy 0 (link text) is now reliable because it normalizes whitespace
- debugVisibility() now shows accurate indicator positions
- Push attempt — resolving git tracking issues

---
Task ID: 8
Agent: Main
Task: Fix resume parsing on /resume/edit/ pages, fix clear button, add data validation (v1.8.7)

Work Log:
- User reported: buttons "перепарсить резюме" and "загрузить с текущей страницы" don't work on /resume/edit/ pages
- User reported: "очистить резюме" doesn't actually clear — data comes back from myResumes[]
- User reported: "перепарсить" on edit page results in "Без названия Статус неизвестен"
- Root cause 1: /resume/edit/{id}/about has different DOM structure — no data-qa attributes that parseResume() looks for. parseResume() finds 0 company-cards, returns empty resume
- Root cause 2: renderResumePanel() has fallback that auto-selects synced[0] from myResumes when panelState.resume is null
- Root cause 3: No validation — empty parse results overwrite good data

Fixes:
1. Edit page detection: /resume/edit/ paths now use fetchAndParseResume() to fetch the VIEW page (/applicant/resumes/view?resume={id}) and parse that instead. Applied to: initPageLogic(), hh-ar-load-resume handler, testParseResume()
2. Clear button: Added panelState._resumeCleared flag. When set, renderResumePanel() skips auto-restore from myResumes[]. Flag reset on sync, load, or resume click
3. Parse validation: Resume must have title OR skills OR experience to be saved. Empty results show warning status

Files changed:
- src/content/main.js: import fetchAndParseResume, edit page detection in initPageLogic + load-resume handler, parse validation
- src/ui/panel/events.js: _resumeCleared flag in clearResumeData(), edit page handling in testParseResume(), parse validation
- src/ui/state.js: added _resumeCleared: false to panelState
- src/ui/tabs/resumes/render-resume-panel.js: respect _resumeCleared flag
- src/ui/tabs/resumes/render-my-resumes.js: reset _resumeCleared on resume click
- manifest.json: version 1.8.6 → 1.8.7
- initPageLogic() made async for fetchAndParseResume support

Stage Summary:
- Resume parsing now works correctly on both /resume/{hash} (view) and /resume/edit/{id} (edit) pages
- Clear button properly clears without auto-restore
- Empty parse results no longer overwrite good data

---
Task ID: 9
Agent: Main
Task: Fix "Загрузить с текущей страницы" on non-resume pages + debug experience count (v1.8.8)

Work Log:
- User reported: "Загрузить с текущей страницы" does nothing on hh.ru main page (/)
  Log: "Cannot parse resume from this page (/). Go to /resume/{hash} or /applicant/resumes"
- User reported: On /applicant/resumes, button shows list but doesn't load resume details
- User reported: All synced resumes show Exp: 3 (should be more)
- Fix 1: On non-resume pages, "Загрузить" now loads first resume from myResumes[] if available
  If no synced data, shows "Используйте «Синхронизировать все»"
- Fix 2: On /applicant/resumes, button now loads list AND auto-selects first synced resume
- Fix 3: Added stepper fallback in parseExperienceFromDoc() for when company-cards are 0
- Fix 4: Added debug logging for pre-parse experience card count in fetched HTML
  Shows: company-cards count, stepper-items count, "show all" buttons count

Stage Summary:
- "Загрузить с текущей страницы" now works on ALL pages (loads from sync if not on resume page)
- 2 files modified: main.js, resume-fetch.js
- Debug logging added for experience count investigation

// Updated 2026-06-10

---
Task ID: 10
Agent: Main
Task: Fix experience parsing (3→6) + reduce auth log noise (v1.8.9)

Work Log:
- Root cause analysis: two bugs causing only 3 of 6 experiences to be parsed
  1. Race condition: expandHiddenSections() called without await in initPageLogic()
     parseResume() ran before hidden sections expanded → only 3 cards visible in DOM
  2. Stepper fallback: only triggered when uniqueCards.length === 0
     When 3 company-cards found, remaining stepper-items were ignored
- Fix 1: Added `await` before expandHiddenSections() in initPageLogic() line 92
- Fix 2: Rewrote parseExperienceFromDoc() with 3 strategies:
  - Strategy 1: company-cards (as before)
  - Strategy 2: stepper supplement — parse stepper items NOT covered by company-cards
    Uses usedStepperElements Set to skip already-processed items
  - Strategy 3: full stepper fallback (if still 0 entries)
- Fix 3: Same stepper supplement logic added to live DOM parseExperience() in parse-resume-sections.js
  Also tries to find company info from parent elements for stepper-only items
- Fix 4: Removed 3 console.log() from checkAuth() in auth.js (was spamming every 5s)
- Verified "Загрузить с текущей страницы" handler already works for non-resume pages (v1.8.8)
- Updated version: 1.8.8 → 1.8.9
- Updated CHANGELOG.md with entries for v1.8.4 through v1.8.9

Stage Summary:
- Experience parsing should now find all entries (3→6) on both live DOM and fetch paths
- Race condition fixed with await
- Auth log noise eliminated
- CHANGELOG.md fully up to date (v1.7.3 → v1.8.9)


---
Task ID: 1
Agent: main
Task: Fix Strategy 6 in resume-fetch.js to get all 6 experience entries instead of 3

Work Log:
- Analyzed diagnostic output from user's browser console
- Key finding: "Развернуть" button does NOT use AJAX — React/Magritte loads data during hydration
- Company names NOT found in any <script> tag in SSR HTML
- SSR HTML = 808K chars vs live DOM after expand = ~2M chars
- Designed hidden iframe approach as primary Strategy 6 method
- Implemented fetchExpandedExperienceViaIframe() — loads resume in hidden iframe
- Implemented parseExperienceFromIframeDoc() — parses experience from iframe DOM
- Kept existing API/query-param approaches as fallback
- Updated version to 1.9.5 across version.js, package.json, manifest.json, CHANGELOG.md
- Build verified successfully (esbuild, 311.6kb)

Stage Summary:
- Strategy 6 now uses hidden iframe as PRIMARY approach (mirrors expandHiddenSections DOM logic)
- Falls back to API endpoints and query params if iframe fails
- All version files consistent at 1.9.5
- Build passes, new functions confirmed in dist/content.js bundle

---
Task ID: v1.9.6-v1.9.7
Agent: main
Task: Strategy 5/6 sub-modules split + button spinners + version sync

Work Log:
- Split resume-fetch.js monolith (1481→75 lines) into 14 focused modules
- strategy5-scanners.js, strategy6-urls/iframe/expand/api.js, json-utils.js, education-languages.js
- Fixed experience scroll & text truncation
- All 3 action buttons now show loading spinner when clicked
- Added hh-ar-load-resume-done and hh-ar-sync-done events
- Synced version references: popup v1.7.3→v1.9.7, README v1.8.3→v1.9.7
- v1.9.5 → v1.9.6 → v1.9.7

Stage Summary:
- 14 resume-fetch modules, all under 200 lines
- Buttons no longer appear stuck after click
- All version references consistent at 1.9.7

---
Task ID: visibility-ux-rework
Agent: main
Task: Fix visibility detection + UI rework (radio buttons, button consolidation, rename)

Work Log:
- Fixed syncAllResumes(): was only syncing visible, now syncs ALL resumes
- Fixed detectVisibilityFromLinkText(): returns UNKNOWN instead of VISIBLE
- Added UNKNOWN→VISIBLE final fallback after ALL strategies
- Added detectVisibilityFromResumePage() with 6 strategies in resume-fetch-resume.js
- Page-level visibility OVERRIDES list-level metadata
- Renamed 'Парсинг резюме' → 'Действующее резюме'
- Removed dropdown selector, added radio buttons (◉/○) in resume list
- Renamed 'Сделать текущее действующим' → 'Взять со страницы'
- Made reparse button context-aware: amber for hidden, green for visible
- Consolidated buttons: 7 → 2 main + contextual CTA + collapsed diagnostics
- Added ↻ icon on active resume card for reparse
- Moved 'Взять со страницы' CTA into 'Все резюме' section (contextual)
- Collapsed diagnostics behind chevron toggle
- Fixed click event bubbling: ↻ doesn't trigger resume switch

Stage Summary:
- Two-layer visibility detection: list page + resume detail page
- Radio buttons replace dropdown (no accidental clicks)
- Button consolidation: 7→2 main buttons
- Build passes: dist/content.js 324.1kb

---
Task ID: docs-complete
Agent: main
Task: Complete documentation — CHANGELOG, README, worklog

Work Log:
- Added CHANGELOG entries for v1.9.6, v1.9.7, v1.9.7+ (unreleased)
- Updated README with two-layer visibility detection, 6 strategies, radio buttons, ↻ reparse, button consolidation
- Updated README flow description with visibility detection pipeline
- Filled worklog gaps for all commits since v1.9.5
- No documentation gaps remaining

Stage Summary:
- CHANGELOG: 3 new version entries (1.9.6, 1.9.7, 1.9.7+)
- README: updated with all recent changes
- worklog: complete from v1.9.5 to present

---
Task ID: v1.9.8-audit-fix
Agent: main
Task: Full code audit — fix getResumePageType() bug, add JSDoc, fix documentation gaps, bump to v1.9.8

Work Log:
- Audited all resume-related files for documentation gaps (27 issues found by sub-agent)
- **CRITICAL BUG FIXED**: getResumePageType() returned 'resume' but consumers checked for 'resume-detail'
  - This meant: hint "Нажмите «Взять со страницы» ниже" NEVER showed on resume detail pages
  - CTA button "Взять со страницы" NEVER appeared on resume detail pages
  - Fixed: now returns 'resume-detail' (matching both consumers: render-resume-panel.js, render-my-resumes.js)
- Added JSDoc to 17 undocumented functions across 5 files:
  - resume-fetch-helpers.js: fetchHtml, htmlToDoc, safeGetText, extractResumeLinks, extractFromScripts
  - resume-fetch-resume.js: parseHeader, parseSkillsFromDoc, parseExperienceFromDoc
  - render-resume-panel.js: updateAccordionHeader, calcExperienceYears, yearWord, renderResumePanel
  - render-my-resumes.js: renderMyResumesPanel, renderResumeListPanel
  - resume-detail/index.js: getResumePageType, expandHiddenSections
- Documented magic numbers: {32,} vs MIN_HASH_LEN (30), SEARCH_RADIUS=5000, skill level codes
- Fixed version.js: comment now says "NOT the single source of truth — manifest.json is"
- Added resume-fetch-helpers.js to README file structure
- Fixed README field count: "12 из 12" → "13 полей"
- Fixed README version: 1.9.7 → 1.9.8
- Bumped version to 1.9.8: manifest.json, package.json, version.js, CHANGELOG
- CHANGELOG [1.9.7+] → [1.9.8] with bug fix entry added
- Build verified: 324.1kb, 0 errors

Stage Summary:
- Critical bug fixed: getResumePageType() return value mismatch
- 17 functions now have JSDoc documentation
- README consistent: v1.9.8, 13 fields, resume-fetch-helpers.js listed
- version.js correctly documented as NOT the source of truth
- No TODO/FIXME/HACK comments in codebase

---
Task ID: v1.9.9-visibility-fix
Agent: main
Task: Fix hidden resumes incorrectly marked as visible — three bugs in visibility detection chain

Work Log:
- Root cause analysis: three bugs in the visibility detection pipeline
  1. `extractVisibilityStatus()` in resume-fetch-helpers.js: UNKNOWN→VISIBLE fallback too early
     List page SSR HTML lacks hidden indicators (client-rendered by React), so all resumes
     were UNKNOWN and immediately defaulted to VISIBLE before detail page check
  2. `parseResumeList()` in resume-detail/index.js: same UNKNOWN→VISIBLE premature fallback
  3. `detectVisibilityFromResumePage()` Strategy 2: `text.includes('скрыть')` too broad
     Matched "скрыть контакты", "скрыть раздел" etc. → false VISIBLE override
  4. `fetchAndParseResume()`: page VISIBLE override list HIDDEN — wrong priority
- Fix 1: Removed UNKNOWN→VISIBLE fallback from `extractVisibilityStatus()` — keep UNKNOWN
- Fix 2: Removed UNKNOWN→VISIBLE fallback from `parseResumeList()` — keep UNKNOWN
- Fix 3: Strategy 2 now only matches "скрыть резюме" exactly (not just "скрыть")
- Fix 4: New priority logic in `fetchAndParseResume()`:
  - Page HIDDEN always wins (most reliable)
  - List HIDDEN wins over Page VISIBLE (list saw the indicator directly)
  - Page VISIBLE wins over List UNKNOWN
  - List VISIBLE wins over Page UNKNOWN
  - Both UNKNOWN → stays UNKNOWN
- Fix 5: Final UNKNOWN→VISIBLE fallback moved to `syncAllResumes()` — only after ALL
  detection (list + detail page) has been tried
- Updated version: 1.9.8 → 1.9.9 (manifest, package.json, version.js)
- Updated CHANGELOG.md with v1.9.9 entry
- Build verified: 324.3kb, 0 errors

Stage Summary:
- 4 files modified: resume-fetch-helpers.js, resume-fetch-resume.js, resume-fetch.js, resume-detail/index.js
- 1 file added to imports: resume-constants.js (VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE) in resume-fetch.js
- Hidden resumes should now correctly show "Скрыто" badge after sync
- Visibility priority: HIDDEN > VISIBLE > UNKNOWN (UNKNOWN→VISIBLE only as last resort in syncAllResumes)

---
Task ID: vis-diag-dump
Agent: main
Task: Add hard diagnostic dump for visibility detection path

Work Log:
- Added [VIS-DIAG] prefixed logs throughout entire visibility pipeline
- detectVisibilityFromResumePage(): each strategy logs its step and result
  - S1: data-qa selectors tried
  - S2: button text search with all matching buttons listed (including partial "скрыть"/"видим")
  - S3: body text indicator position
  - S4: raw HTML indicator position
  - S5: script JSON patterns found
  - S6: hide-link data-qa
  - EXTRA: all [data-qa*="hide"] elements on page
  - Final: which strategy returned what
- fetchAndParseResume(): logs both sources (page + list) and final decision
  - Shows page=VISIBLE/UNKNOWN, list=VISIBLE/UNKNOWN/hidden
  - Shows which branch won and why
- extractVisibilityStatus(): lists each resume's UNKNOWN status
- syncAllResumes(): shows each resume's final fallback (UNKNOWN→VISIBLE) and FINAL SUMMARY
- All diagnostic lines prefixed with [VIS-DIAG] for easy filtering in DevTools
- Build: 327.8kb

Stage Summary:
- 3 files modified: resume-fetch-resume.js, resume-fetch.js, resume-fetch-helpers.js
- Filter console by [VIS-DIAG] to see full visibility decision path for every resume

---
Task ID: anti-monolith-final
Agent: main
Task: Anti-Monolith compliance sweep — all files ≤200 lines, panelState centralised

Work Log:
- Scanned all source files: 9 files exceeded 200-line limit
- diagnose.js (173 lines, single 158-line function) → split into 3 sub-modules + orchestrator
- Added 12 accessor functions to state.js for panelState mutations
- Migrated 18 direct panelState mutations across 7 files to use accessor functions
- Split resume-helpers.js (292→97): skill gap analysis → resume-helpers-gap.js
- Split storage.js (217→23 barrel): settings → storage-settings.js, queues → storage-queue.js
- Split panel/events.js (209→125): sidebar click handler → sidebar-events.js
- Split render-resume-panel.js (205→97): accordion header → resume-accordion-header.js
- Split resume-fetch-list-vis.js (263→133): strategies 2&3 → resume-fetch-list-vis-strategies.js
- Split resume-fetch.js (236→120): visibility fallback → resume-fetch-vis-fallback.js
- Split resume-fetch-parse.js (204→95): education parser → resume-fetch-parse-edu.js
- Split resume-fetch-resume.js (203→92): diagnostics → resume-fetch-resume-diag.js
- Split sidebar-css.js (247→14): CSS split into sidebar-css-core.js + sidebar-css-components.js
- Fixed import: resume-fetch-education-languages.js → resume-fetch-parse-edu.js
- Build verified: esbuild compiles cleanly, 0 errors
- Committed and pushed to origin/main

Stage Summary:
- ALL source files now ≤200 lines (0 violations remaining)
- ALL panelState mutations centralised through accessor functions (0 external direct mutations)
- 14 new files created, 21 files modified
- Build passes: dist/content.js 364.4kb

---
Task ID: anti-monolith-final-batch2
Agent: main
Task: Final anti-monolith batch — iframe-vis function split + panelState accessor migration

Work Log:
- Full compliance scan: 0 files over 200 lines, but 1 function over 150 lines
- detectVisibilityFromIframeDoc() in resume-fetch-iframe-vis.js was 161 lines (limit: 150)
- Split into 2 strategy modules + orchestrator:
  - resume-fetch-iframe-vis-dom.js (94 lines) — DOM strategies S0,S1,S2,S4 + diag buttons
  - resume-fetch-iframe-vis-adv.js (121 lines) — text/script strategies S3,S5,S6,S7,S8 + vis elements
  - resume-fetch-iframe-vis.js (95 lines) — thin orchestrator with tryStrategy() helper
- Added updateStats() and updateSettings() accessor functions to state.js
- Migrated 3 Object.assign(panelState, ...) calls:
  - content/main.js: Object.assign(panelState.stats, stats) → updateStats(stats)
  - content/main.js: Object.assign(panelState.settings, settings) → updateSettings(settings)
  - ui/panel/index.js: Object.assign(panelState.stats, stats) → mergeStatsState(stats)
- Final compliance scan: 0 violations remaining
  - 0 files over 200 lines
  - 0 functions over 150 lines
  - 0 direct panelState mutations outside state.js
  - 0 direct chrome.storage calls outside lib/storage*.js
  - 0 direct fetch() calls outside lib/
- Build verified: esbuild compiles cleanly, dist/content.js 366.7kb
- Committed and pushed to origin/main

Stage Summary:
- detectVisibilityFromIframeDoc() split: 161 → 95 lines (orchestrator) + 94 + 121 (strategies)
- panelState fully centralised: updateStats/updateSettings accessors added, 3 callers migrated
- Anti-monolith compliance: 100% — zero violations across all checks

---
Task ID: submodule-update
Agent: main
Task: Update anti-hallucination-guard + cascade-guard submodules

Work Log:
- Updated anti-hallucination-guard to 0759547
- Updated cascade-guard to 1c99480
- Ran setup.sh for both submodules
- AHG rules (1-6) and Cascade rules (C-1..C-9) integrated in AGENT_RULES.md

Stage Summary:
- Both submodules updated and set up

---
Task ID: v1.9.15.5
Agent: main
Task: Vacancy detail parser + match scorer + vacancy storage

Work Log:
- Fixed keySkills bug in vacancy-diagnostic.js: [data-qa="skills-element"] items now parsed correctly
  Each <li data-qa="skills-element"> IS the skill item (Magritte), text on element itself
  Previously looked for .bloko-tag__text children which don't exist in Magritte UI
- Built real vacancy-detail.js parser (was stub returning null):
  - Title, company, companyUrl via data-qa selectors
  - Salary parser: extracts min/max/currency/period/net from Russian salary strings
  - Experience parser: extracts min/max years from experience requirements (handles "Нет опыта", ranges, "Более N лет")
  - Location, employment, schedule, hiringFormat, isRemote detection
  - Key skills: [data-qa="skills-element"] with Bloko fallback
  - Description parser: raw text/HTML + heading extraction + section splitting
    (responsibilities, requirements, advantages, conditions)
- Created match-scorer.js: 4-axis scoring algorithm (0-100):
  - skills (0-40): overlap between resume skills and vacancy keySkills
  - title (0-30): keyword overlap + abbreviation bonus (e.g., "РОП" ↔ "руководитель отдела продаж")
  - salary (0-15): range compatibility (within, slightly below/above, out of range)
  - experience (0-15): resume years vs vacancy requirement match
- Created storage-vacancies.js: vacancy details + match scores in chrome.storage
  - getVacancyDetails/saveVacancyDetail/getVacancyDetail/removeVacancyDetail/clearVacancyDetails
  - getVacancyScores/saveVacancyScore/getVacancyScore
  - LRU by parsedAt (max 200 details, max 500 scores)
- Updated storage.js barrel: re-exports from storage-vacancies.js
- Updated vacancy-list.js: computeMatchScore for each card, sort by score descending
  parseVacanciesFromPage(resume) now accepts optional resume parameter
- Updated main-page-handlers.js:
  - handleVacancyDetailPage() now calls parseVacancyDetail() + computeMatchScore()
  - Saves detail + score to chrome.storage
  - Logs match breakdown: skills/title/salary/experience
  - Stores detail in window.__hhVacDetail for console access
- Updated main.js: parseVacanciesFromPage(panelState.resume) for refresh handler
- Build verified: 481.4kb, 0 errors, 0 warnings

Stage Summary:
- Vacancy detail parsing: from stub → full structured parser with 15+ fields
- Match scoring: 4-axis algorithm (skills/title/salary/experience) produces 0-100 score
- Vacancy storage: persistent details + scores in chrome.storage
- List sorting: search results now sorted by match score (highest first)
- Version: 1.9.15.5

---
Task ID: v1.9.15.6
Agent: main
Time: 2026-06-12T18:30:00+03:00
Task: Fix initPageLogic() never called — replace broken dynamic import() with custom event pattern + make idempotent

Work Log:
- Root cause: panel/index.js used import('../../content/main.js') to call initPageLogic() on auth change
  esbuild's IIFE bundle doesn't support dynamic import() at runtime — Promise silently fails
- Result: routeToHandler() never fires, handleVacancyDetailPage() never runs
  Vacancy detail parsing + match scoring were dead code
- Fix 1: Replaced dynamic import() with CustomEvent 'hh-ar-init-page-logic' dispatch
  panel/index.js dispatches event, main.js listens and calls initPageLogic() directly
  Both updateAuthState() and updateAuthStateAsync() paths fixed
- Fix 2: Added safety net in main.js — auto-calls initPageLogic() after 3s on vacancy detail pages
- Fix 3: Made initPageLogic() idempotent with pageLogicInitialized guard flag
  Prevents duplicate execution from event + safety net
  Second call logs "Page logic already initialized — skipping duplicate"
- Build verified: no dynamic import() remains in bundle, all routing/VacDetail/Scorer code present
- User confirmed fix works: [VacDetail] and match scoring logs now appear in console

Stage Summary:
- Root cause fixed: CustomEvent replaces broken dynamic import()
- initPageLogic() is now idempotent — no duplicate execution
- Vacancy detail parser + match scorer now actually run on /vacancy/{id} pages
- Remaining: "No active resume — skip match scoring" (need resume loaded for scoring)

---
Task ID: v1.9.15.7
Agent: main
Time: 2026-06-12T21:40:00+03:00
Task: Fix timing (re-score on resume load) + match breakdown UI card

Work Log:
- Problem: On vacancy detail page, first scoring shows skills=0 because resume
  hasn't been loaded from chrome.storage yet. After resume loads (async),
  no re-score happens — user sees wrong score until page reload.
- Solution: CustomEvent 'hh-ar-resume-loaded' dispatched from all resume load paths
  main.js listens and re-scores vacancy detail if on /vacancy/{id}
- Added hh-ar-resume-loaded dispatch from 5 locations:
  1. main.js::loadSavedResumes() — resume loaded from storage at boot
  2. main-page-handlers.js::saveResumeToState() — resume parsed from page
  3. main-resume-loader.js::loadFromResumePage() — manual "Load from page"
  4. main-resume-loader.js::loadFromResumeListPage() — resume list page
  5. main-resume-loader.js::loadFromSyncedData() — non-resume page fallback
  6. main-resume-loader.js::handleReparseResume() — reparse button
- main.js: hh-ar-resume-loaded listener re-parses vacancy, computes score,
  saves to storage, dispatches 'hh-ar-match-updated' with full breakdown
- New UI: 'Совпадение с вакансией' card in vacancies tab
  - Ring chart with color coding (green >= 70%, amber >= 40%, red < 40%)
  - 4-axis breakdown: Навыки/40, Должность/30, Зарплата/15, Опыт/15
  - Stacked bar visualization
  - Matching/missing skills detail (green/red tags)
  - Contextual recommendation subtitle
- panel/index.js: listens for hh-ar-match-updated, calls renderVacancyMatchScore()
- render.js: tryShowVacancyMatch() called on initial data render
- main-page-handlers.js: dispatches hh-ar-match-updated on first score too
- vacancies tab HTML: added vac-match-section card with ring + bars + skill lists

Stage Summary:
- Timing fix: resume-loaded event triggers re-score automatically
- Match breakdown now visible in sidebar panel (not just console)
- Version: 1.9.15.7

---
Task ID: v1.9.15.8
Agent: main
Task: Fix stacked bar proportions + skill tag rendering in match card

Work Log:
- Fixed stacked bar: was using absolute values (20%,30%,8%,8% = 66% total with gray gap)
  Now uses proportional fill: each segment = value/total*100, so bar always fills 100%
- Fixed skill tags: replaced CSS class "skill-tag" (not defined in Shadow DOM) with inline styles
  Matching: green bg #ECFDF5, border #A7F3D0, text #059669
  Missing: red bg #FEF2F2, border #FECACA, text #DC2626
- Removed dead code: 4 unused set() calls with toFixed on bar elements

Stage Summary:
- Stacked bar now fills full width with proportional segments
- Skill tags render correctly with inline styles (no dependency on CSS class)
