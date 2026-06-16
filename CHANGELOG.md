# Changelog — HH Copilot

All notable changes to the HH Copilot Chrome Extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.37.0] - 2026-06-16

- 

## [1.9.30.0] - 2026-06-14

- 

## [1.9.28.0] — 2026-06-12

### Fixed
- **Sponsored VotD (adsrv.hh.ru)** — 3 out of 14 "Vacancy of the Day" items were skipped because their tracking URLs (`adsrv.hh.ru/click?meta=ENCRYPTED`) contain no `vacancyId` parameter. The vacancy ID is now extracted from the parent element's numeric `id` attribute (e.g., `id="131408939"`). Three-tier extraction strategy: (1) click-URL `vacancyId` param, (2) any nearby `<a href*="vacancyId=">`, (3) ancestor element `id` attribute matching `/^\d{6,12}$/`.
- All VotD items now get canonical `https://hh.ru/vacancy/{id}` URL instead of tracking URL.
- Added test: sponsored VotD with parent `id` attribute extraction.
- Added test: canonical URL for VotD items.

## [1.9.27.0] — 2026-06-12

### Fixed
- **VotD parsing (0/14)** — "Vacancy of the Day" items on the hh.ru main page returned 0 parsed items. Root cause: VotD links are tracking URLs (`content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=XXX`), not standard `/vacancy/XXX` paths. `extractVacancyId()` now also matches `?vacancyId=NNN` in query parameters. `parseVacanciesOfTheDay()` now uses `titleEl.closest('a')` to find the click-URL.
- Added 5 new `extractVacancyId` tests for VotD URL patterns.
- Added 6 VotD parsing tests with realistic DOM structure.
- Test suite: 67 tests passing.

## [1.9.26.0] — 2026-06-12

### Added
- **Main page vacancy parsing** — when user opens `hh.ru/` (root page), the extension now parses two blocks: (1) recommended vacancies using the same selectors as search page with `~=` word-match for space-separated `data-qa` attributes and `href` fallback; (2) "Vacancy of the Day" block using `data-qa="vacancy_of_the_day_title"` selectors with three vacancy ID extraction strategies.
- Added `mainPage` route to `detectPageType()` for URL pattern `/` on `hh.ru`.
- `parseVacanciesOfTheDay()` — new parser function for VotD blocks.

## [1.9.25.0] — 2026-06-12

### Added
- **Hot Module Replacement (HMR)** — extension auto-reloads on file change during development. WebSocket server (`ws://localhost:35729`) started by `npm run watch`. Content script listens for reload messages and calls `chrome.runtime.reload()`. Eliminates manual extension reload during development.

## [1.9.24.0] — 2026-06-12

### Fixed
- **35 WCAG/typography issues** across the entire sidebar UI:
  - **Contrast**: secondary text `#71717a` → `#52525b`, placeholder `#6b7280`, disabled button `#6b7280`, tour skip `#71717a` → `#52525b`.
  - **Invalid CSS properties**: removed `role:status`, `role:alert`, `aria-live:assertive`, `tabindex:0` from CSS declarations.
  - **Focus indicators**: `:focus-visible` styles for tab buttons, toggles, vacancy items, tour buttons.
  - **Typography**: `font-variant-numeric: tabular-nums` on score rings, `-webkit-font-smoothing: antialiased`.
  - **ARIA attributes**: `role="status"` + `<span class="sr-only">` on spinner, `role="switch"` on toggle, `aria-expanded`/`aria-controls` on timeline toggles, `role="radiogroup"` on stats period, `role="article"` + `aria-label` on vacancy items, `aria-label` on blacklist delete, `aria-valuenow` on range inputs, `lang="ru"` + `role="dialog"` on sidebar, `aria-hidden` on decorative dots.
  - **Keyboard navigation**: WAI-ARIA tabs with Arrow/Home/End keys, Escape closes sidebar, focus trap (Tab cycles inside sidebar), focus management on open/close, Enter/Space activates vacancy links.
- Fixed tab switching bug — missing `data-tab` attribute on tab buttons.
- Fixed `&nbsp;` rendering as literal text in sidebar UI.

## [1.9.23.0] — 2026-06-11

### Changed
- **Anti-monolith refactor**: split `match-scorer.js` into 4 focused modules — `match-scorer-skills.js` (skill overlap 0-40), `match-scorer-title.js` (title similarity 0-30), `match-scorer-salary.js` (salary fit 0-15), `match-scorer-experience.js` (experience match 0-15). Main `match-scorer.js` is now a thin orchestrator.
- Removed `cascade-guard` submodule (repo deleted on GitHub).

## [1.9.22.0] — 2026-06-11

### Added
- **Synonym skill matching** — related skills partially count towards the score. If a vacancy requires "P&L" and the resume has "управление продажами", the synonym group provides a partial match bonus. Synonym groups: sales, IT, marketing, HR, leadership.

## [1.9.21.0] — 2026-06-11

### Fixed
- **"Что улучшить" recommendations** — replaced noisy "10 навыков не в описаниях опыта" with actionable "навыков вакансии нет в резюме" that only shows genuine gaps. Created shared `vacancy-skills-collector.js` utility.

## [1.9.20.0] — 2026-06-11

### Fixed
- Skip skills already in `derivedSkills` when building recommendations — no duplicate warnings for skills the user already has.

## [1.9.19.0] — 2026-06-11

### Added
- **Vacancy skill derivation from title** — vacancy cards on search page rarely have `keySkills`, so `deriveVacancySkills()` extracts skills from the vacancy title using `SKILL_PATTERNS` and heuristics.
- Added sales/commercial cross-references: "коммерческ" ↔ "продаж" ↔ "менеджер по развитию".
- Added missing skills to skill-dictionary: стратегия продаж, LTV, ROI, построение воронки продаж, unit-экономика.
- **Experience scoring fix** — "overqualified" penalty removed. Exceeding the experience maximum is NOT a penalty in the Russian job market. 10+ years for "3-6 лет" now scores 12/15 (was 8/15).

## [1.9.18.0] — 2026-06-11

### Fixed
- **10 bugs from code review**: employment type parsing, work format parsing, multi-value format handling, career progression logic, false-positive vague phrases, Cyrillic regex boundaries, specific uncovered skills in recommendations, tooltip for uncovered skills, tour improvements.

## [1.9.17.0] — 2026-06-11

### Fixed
- **Skills parser** — 5 fallback strategies when `skills-card` data-qa is missing from hh.ru DOM (Magritte redesign): skills-table, heading detection, `data-qa*="skill"` scan, Magritte tag scan.
- **Experience scoring** — parse vacancy experience string ("3-6 лет") into structured format `{min:3, max:6}`.
- **Vacancy navigation** — removed broken SPA click interception that prevented navigation.

## [1.9.16.0] — 2026-06-11

### Added
- **SPA navigation** — `pushState`/`replaceState` patch in `page-world.js` (MAIN world). Link click interception for vacancy/resume links uses `pushState` instead of full page reload. `MutationObserver` with 1-second debounce auto-re-parses vacancies.

## [1.9.15.9] — 2026-06-11

### Added
- **Derived skills from experience** — `skill-dictionary.js` (50+ Russian skill keyword patterns) + `derive-skills.js` automatically extracts skills from work experience descriptions. Integrated into both DOM and fetch resume parsing paths. `scoreSkills()` now uses `derivedSkills` at 70% weight.

## [1.9.15.6] — 2026-06-11

### Fixed
- **initPageLogic() not called** — replaced broken `dynamic import()` with `CustomEvent 'hh-ar-init-page-logic'` pattern. Added safety net: auto-call after 3s on vacancy detail pages. Made `initPageLogic()` idempotent to prevent duplicate execution.

## [1.9.15.5] — 2026-06-11

### Added
- **Vacancy detail parser** — `parseVacancyDetail()` extracts all fields from `/vacancy/{id}` pages: title, company, salary, experience, description, key skills, employment type, work format.
- **Match scorer** — `calculateMatchScore(vacancy, resume)` returns `{total: 0-100, breakdown: {skills, salary, experience, position, location}}`.
- **Vacancy storage** — `storage-vacancies.js` persists vacancy data across sessions.

## [1.9.14] — 2026-06-11

### Added
- Resume score displayed in Resume tab. Skill gap analysis moved to Vacancies tab.

## [1.9.13] — 2026-06-11

### Fixed
- **Contacts parsing** — label glue, missing phone, false telegram detection. Added `parseContactsFromDoc()` to fetch chain.

## [1.9.12] — 2026-06-11

### Fixed
- **Contacts parsing** — added `parseContactsFromDoc()` to the resume fetch chain.

## [1.9.10] — 2026-06-11

### Fixed
- **Iframe visibility detection** — `iframeVis` lost when entries don't increase. Fixed calculation of visibility state from IntersectionObserver entries.
- **Missing VISIBILITY_HIDDEN import** — caused fatal crash on sync.

## [1.9.8] — 2026-06-11

### Fixed
- `getResumePageType()` bug — incorrect page type detection for resume URLs.
- Added JSDoc documentation across parser modules.

## [1.9.7] — 2026-06-11

### Changed
- Consolidated UI: ↻ button for re-parsing, contextual CTA "Взять со страницы".
- Radio buttons for selecting active resume.
- "Парсинг резюме" renamed to "Действующее резюме" with resume selector dropdown.

## [1.9.6] — 2026-06-11

### Added
- Guided tour for new users — 14 steps across 6 tabs, auto-start on first launch, "?" help button.

### Fixed
- Tour tooltip invisible — z-index, animation transform conflict, two-phase render fix.

## [1.9.5] — 2026-06-11

### Added
- Strategy 6 — hidden iframe approach for full experience parsing.

## [1.9.0] — 2026-06-10

### Changed
- Complete architecture rewrite: modular esbuild-based build replacing monolithic `content.js`. 134 ES-modules organized in `src/`: `lib/` (58 files), `parsers/` (21 files), `engine/` (4 files), `services/` (1 file), `ui/` (44 files), `content/` (5 files).

## [1.7.4] — 2026-06-09

### Fixed
- Resume sync selector — `fetchResumeList()` now matches both `/resume/{hex}` and `?resume={hex}` URL patterns.

## [1.7.3] — 2026-06-09

### Added
- Initial release — Chrome Extension for hh.ru automation: FAB button, Shadow DOM sidebar, vacancy parsing, resume parsing (13 fields), auth check, rate limiter, blacklist.
