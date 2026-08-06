# Task 11 Report: Integrate semantic score into match-scorer

## Status: DONE

## What was implemented

The match-scorer already had the semantic scoring logic from Task 10 (ai-semantic.js). The remaining work was:

1. **Fixed critical bug in `vacancy-list-helpers.js:89`**: `applyStatusAndScore()` called `computeMatchScore()` WITHOUT `await`. Since `computeMatchScore` is async (calls `computeSemanticSimilarity`), the result was a Promise object, not a score number. All list-parsed vacancies got `score.total = [object Promise]` which meant `vacancy.matchScore = undefined`.

2. **Fixed callers**: `vacancy-list.js:75` and `vacancy-list-votd.js:116` now `await applyStatusAndScore()`.

3. **Updated all test files** to handle async `computeMatchScore`:
   - `match-scorer.test.js`: 6 orchestrator tests
   - `vacancy-fetch.test.js`: 3 enrichVacancy tests
   - `cover-letter.test.js`: 9 generateCoverLetter tests

4. **Version bump**: 1.9.83.0 -> 1.9.84.0 across all 5 files.

## What was tested

- **Tests**: 650/651 pass (1 pre-existing failure in ai-service.test.js unrelated to this task)
- **Lint**: 0 new errors
- **Build**: v1.9.84.0 successful (dist/content.js 801.2kb)
- **Version sync**: All 5 files verified at 1.9.84.0

## Files changed

| File | Change |
|------|--------|
| `extension/src/parsers/vacancy-list-helpers.js` | Made `applyStatusAndScore` async, added `await` before `computeMatchScore` |
| `extension/src/parsers/vacancy-list.js:75` | Added `await` before `applyStatusAndScore` |
| `extension/src/parsers/vacancy-list-votd.js:116` | Added `await` before `applyStatusAndScore` |
| `extension/tests/match-scorer.test.js` | 6 orchestrator tests: `async`/`await` added, `semantic: 0` added to null-input breakdown |
| `extension/tests/vacancy-fetch.test.js` | 3 tests: `async`/`await` added for `enrichVacancy` |
| `extension/tests/cover-letter.test.js` | 9 tests: `async`/`await` added for `generateCoverLetter` |
| `extension/manifest.json` | Version 1.9.83.0 -> 1.9.84.0 |
| `extension/package.json` | Version 1.9.83.0 -> 1.9.84.0 |
| `extension/src/lib/version.js` | Version 1.9.83.0 -> 1.9.84.0 |
| `extension/popup/index.html` | Version v1.9.83.0 -> v1.9.84.0 |
| `README.md` | Version 1.9.83.0 -> 1.9.84.0 |
| `worklog.md` | Added task entry |

## Self-review findings

1. **Pre-existing test failure**: `ai-service.test.js` test "getAiConfig clamps too-large timeoutMs to 180000" fails because the code allows 600000 (10 min) but the test expects 180000 (3 min). This is a pre-existing issue unrelated to this task.

2. **The task brief listed specific line numbers** (e.g., `match-scorer.js:52-70`) but the code had already been modified in Task 10. The implementation was already in place; the main value of this task was finding and fixing the missing `await` bug in `vacancy-list-helpers.js`.

## Issues or concerns

- None. All changes are minimal, targeted, and verified.
