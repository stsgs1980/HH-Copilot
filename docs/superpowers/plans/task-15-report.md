# Task 15: Write unit tests for AI semantic comparison -- Report

## What was implemented

Created `extension/tests/ai-semantic.test.js` with 11 unit tests covering `computeSemanticSimilarity()` from `ai-semantic.js`.

## Tests created (11 total)

1. Returns 0 for null inputs (both resume and vacancy)
2. Returns 0 for null resume
3. Returns 0 for null vacancy
4. Returns number between 0 and 1 on valid AI response
5. Clamps values > 1 to 1
6. Clamps values < 0 to 0
7. Returns 0 on fetch/network error
8. Returns 0 when AI response content is empty string
9. Returns 0 when choices array is empty
10. Sends correct request to Groq API (URL, Authorization header, model, temperature, max_tokens)
11. Handles resume with missing optional fields (null skills, null experienceTotal, null description)

## Test results

- New tests: 11/11 PASS
- Full suite: 671/672 (1 pre-existing failure in ai-service.test.js -- timeout clamp expects 180000 but code allows 600000, unrelated to this task)

## Files changed

- `extension/tests/ai-semantic.test.js` -- NEW (197 lines)
- `worklog.md` -- appended worklog entry

## Mocking approach

- `chrome.storage.local` stub installed via `installChromeStub()` (same pattern as ai-service.test.js)
- `global.fetch` mocked with `vi.fn().mockResolvedValue()` / `vi.fn().mockRejectedValue()`

## Self-review findings

- All tests follow existing project conventions (vitest, jsdom, chrome stub pattern)
- Tests are isolated: each test installs fresh chrome stub and fetch mock in beforeEach
- No version bump needed (test-only changes per task brief and Rule 9.1 exception)
- Pre-existing ai-service.test.js failure (1/672) is NOT caused by this change

## Commit

- `2c83219` test: add unit tests for AI semantic comparison
