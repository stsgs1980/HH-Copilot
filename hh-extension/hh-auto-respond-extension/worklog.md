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
