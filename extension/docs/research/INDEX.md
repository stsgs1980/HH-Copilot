# Research Index

All research documents for HH-Copilot project. Each document contains: findings, conclusions, and where we apply them.

## Documents

| # | File | Topic | Date | Status | Applied in code |
|---|------|-------|------|--------|-----------------|
| 01 | [01-role-implied-skills.md](./01-role-implied-skills.md) | ESCO essential/optional skills → role-implied skills concept | 2026-06-15 | Research done, implementation partial | `role-implied-skills.js`, `quality-recommendations.js` |
| 02 | [02-kula-ai-ats.md](./02-kula-ai-ats.md) | Kula.ai AI-Native ATS — features, scoring, matching | 2026-06-15 | Research done, not yet applied | Future: semantic matching, career alignment |
| 03 | [03-votd-irrelevant-vacancies.md](./03-votd-irrelevant-vacancies.md) | VOTD irrelevant vacancies — root cause, DOM analysis, code trace | 2026-06-15 | Research done, applied in v1.9.63.0 | `match-scorer-skills.js`, `vacancy-list.js`, `main-page-handlers-pages.js`, `vacancies.js` |
| 04 | [04-negotiations-dom-analysis.md](./04-negotiations-dom-analysis.md) | Negotiations page DOM structure, selectors, data model | 2026-06-16 | Research done, NOT yet applied | `parsers/negotiations.js`, `selectors.js`, `ui/tabs/negotiations.js` |
| 05 | [05-chatik-dom-analysis.md](./05-chatik-dom-analysis.md) | Chatik (/chat) DOM structure, selectors, vs Negotiations comparison | 2026-06-16 | Research in progress, NOT yet applied | Future: `parsers/chatik.js`, `selectors.js` |

## Key Conclusions Summary

### Role-Implied Skills (from ESCO + Kula)
- **Problem:** Skills implied by position title shown as "missing" in recommendations
- **Solution:** Map position title → set of implied skills; filter from "missing" list
- **ESCO concept:** Essential skills = always required for occupation; Optional = may be required
- **Kula concept:** Must-have vs nice-to-have criteria in AI scoring
- **Implementation:** `role-implied-skills.js` + filter in `quality-recommendations.js`
- **Weight in scoring:** Implied match = 40% (between synonym 50% and missing 0%)

### Kula.ai Patterns
- Semantic matching beyond keywords (we have synonyms, need embeddings)
- AI scoring on multiple axes (we have 4-axis, Kula has similar)
- Career trajectory alignment (we detect progression, but don't use for scoring)

### VOTD Irrelevant Vacancies (03)
- **Problem:** 14/19 vacancies on main page are irrelevant VOTD ads (courier, cook, cleaner)
- **Root cause:** VOTD is a PAID promotional product, NOT personalized. Only geo-filtered (region).
- **Evidence:** Real DOM analysis of hh.ru main page + official hh.ru articles
- **Waste:** 14 useless fetches × 2.5s = ~35s wasted network activity per page load
- **Key insight:** SERP-stage matchScore (10-25%) is already sufficient to filter — fetch changes nothing
- **Marker:** `source: 'votd'` already exists in code (vacancy-list.js:214) but not used for filtering

## TODO (from research, not yet implemented)
- [ ] Integrate implied skills into `match-scorer-skills.js` (40% weight)
- [ ] Expand role-implied map with more professions
- [ ] Future: embedding-based semantic skill matching
- [ ] Future: career trajectory alignment bonus
- [ ] Add matchScore threshold to `fetchVacancyDetails()` filter (skip < minMatchScore)
- [ ] Add source='votd' filter to skip fetch for VOTD vacancies
- [ ] Optionally: separate VOTD in UI with clear labeling
- [ ] Optionally: add setting to exclude VOTD entirely

### Negotiations Page DOM (04)
- **Problem:** Negotiations tab is stub — `parseNegotiations()` returns `[]`, no page handler
- **DOM structure:** `negotiations-list` > `negotiations-item` rows with vacancy link, company, date, status tag
- **3 statuses found:** `not-viewed` (amber), `viewed` (blue), `discard` (red); possibly also `invite` (green)
- **Vacancy ID** in link: `extractVacancyId()` already handles this URL format
- **Key decision:** No chat parsing in Phase 1 — only list page. Chat requires separate conversation pages.
- **MatchScore:** From cache only, no fetching from negotiations page

### Chatik Page DOM (05)
- **Two separate systems:** `/applicant/negotiations` (отклики) vs `/chat` (мессенджер) — разные data-qa prefixes
- **Chatik selectors:** `chatik-layout`, `chatik-open-chat-{CHAT_ID}`, `chat-cell-creation-time`, `status-icon-delivered/read`
- **Key challenge:** Нет vacancy ID в Chatik — только название вакансии в неструктурированном тексте ячейки
- **Chat ID ≠ Vacancy ID:** Chatik использует 10-значные ID чатов, vacancy IDs — 9-значные
- **Priority:** Negotiations Phase 1 > Chatik (P1+), т.к. Negotiations даёт статусы откликов напрямую

## TODO (from research, not yet implemented)
