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
