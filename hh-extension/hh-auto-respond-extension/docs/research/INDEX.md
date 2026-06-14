# Research Index

All research documents for HH-Copilot project. Each document contains: findings, conclusions, and where we apply them.

## Documents

| # | File | Topic | Date | Status | Applied in code |
|---|------|-------|------|--------|-----------------|
| 01 | [01-role-implied-skills.md](./01-role-implied-skills.md) | ESCO essential/optional skills → role-implied skills concept | 2026-06-15 | Research done, implementation partial | `role-implied-skills.js`, `quality-recommendations.js` |
| 02 | [02-kula-ai-ats.md](./02-kula-ai-ats.md) | Kula.ai AI-Native ATS — features, scoring, matching | 2026-06-15 | Research done, not yet applied | Future: semantic matching, career alignment |

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

## TODO (from research, not yet implemented)
- [ ] Integrate implied skills into `match-scorer-skills.js` (40% weight)
- [ ] Expand role-implied map with more professions
- [ ] Future: embedding-based semantic skill matching
- [ ] Future: career trajectory alignment bonus
