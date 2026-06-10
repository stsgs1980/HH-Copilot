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
