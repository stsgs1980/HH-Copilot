# Task 12: Market Analytics Dashboard -- Report

## What was implemented

Market analytics dashboard showing score distribution and skill demand from loaded vacancies. Added as a card within the Vacancies tab.

### New files
- `extension/src/ui/html/tabs/analytics.js` -- HTML template with `getAnalyticsSection()` (avg score, vacancy count, top skill, top-10 in-demand skills)
- `extension/src/ui/tabs/analytics-render.js` -- `renderAnalytics()` function computing stats from vacancy data

### Modified files
- `extension/src/ui/html/tabs/vacancies.js` -- imported and rendered analytics section after last card
- `extension/src/ui/panel/index.js` -- imported `renderAnalytics`, added `hh-ar-vacancies-updated` event listener

### Version bump
- 1.9.84.0 -> 1.9.85.0 across all 5 files (manifest.json, package.json, version.js, popup/index.html, README.md)
- CHANGELOG entry added for v1.9.85.0

## Test results
- Build: v1.9.85.0 OK, dist/content.js 805.6kb
- Tests: 650/651 pass (1 pre-existing failure in ai-service.test.js timeout clamp test)
- Lint: 0 new errors in new files (pre-existing warnings on other files)

## Self-review findings
- Fixed Unicode em dash (U+2014) in analytics.js -> replaced with "--" per AHG Rule 15
- Fixed unused `resume` parameter -> prefixed with `_` per lint rules
- No new lint errors introduced

## Files changed
1. Created: extension/src/ui/html/tabs/analytics.js (44 lines)
2. Created: extension/src/ui/tabs/analytics-render.js (53 lines)
3. Modified: extension/src/ui/html/tabs/vacancies.js (+3 lines)
4. Modified: extension/src/ui/panel/index.js (+8 lines)
5. Version bumped: manifest.json, package.json, version.js, popup/index.html, README.md
6. Added: CHANGELOG entry for v1.9.85.0
7. Updated: worklog.md with task-12 entry
