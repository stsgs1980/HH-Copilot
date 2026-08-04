# Task 14 Report: Write unit tests for match-scorer weight profiles

## Status: DONE (already implemented)

## What was implemented

The test file `extension/tests/match-scorer.test.js` already exists with 118 tests covering all aspects of the match scoring engine. This was created during Task F7.1 (scoring engine unit tests) and expanded through subsequent tasks (F7.2 location scoring, F7.3 title stem matching).

## What was tested and test results

All 118 tests in `match-scorer.test.js` pass:

### Coverage areas (all already present):
- **Orchestrator (computeMatchScore)**: 7 tests — null inputs, breakdown properties, location dimension, total sum, role mismatch caps
- **Skills scoring (scoreSkills)**: 20 tests — explicit/derived/synonym/implied match weights, confidence factor, normalization
- **Title scoring (scoreTitle)**: 18 tests — exact match, case-insensitive, keyword overlap, abbreviation bonus, stem matching
- **Salary scoring (scoreSalary)**: 12 tests — within range, no data, below/above range, string parsing
- **Experience scoring (scoreExperience)**: 10 tests — within range, unknown, below/above, overqualified, sum
- **Location scoring (scoreLocation)**: 15 tests — same city, nearby region, different city, remote/hybrid, unknown
- **Weight profiles**: precise mode (default) and flexible mode both tested, including semantic score in flexible mode
- **Helpers**: normalizeSkillSet, identifyCity, getRegion, detectWorkFormat, crudeStem, ABBR_MAP

### Specific brief tests verified present:
- `should return score with precise mode by default` — line 31-40
- `should use precise weights by default` — line 42-47
- `should use flexible mode when specified` — line 49-53
- `should return 0 for null inputs` — line 55-58

## Files changed

No files were changed — the test file already existed with full coverage.

## Self-review findings

None. The existing test file exceeds the brief's requirements by an order of magnitude (118 tests vs 4 in brief).

## Pre-existing issues

One unrelated test failure in `ai-service.test.js` (timeoutMs clamp assertion expects 180000 but gets 600000). This is a pre-existing bug in the AI service timeout configuration, not related to match-scorer weight profiles.
