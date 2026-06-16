# Changelog — HH Copilot

All notable changes to the HH Copilot Chrome Extension are documented in this file.

The detailed per-version changelog lives in [`extension/CHANGELOG.md`](./extension/CHANGELOG.md).
This root file provides a high-level summary of recent releases; for the full
history including v1.9.15.5 → v1.9.31.0, see the extension changelog.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
