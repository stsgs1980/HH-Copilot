# Research: Kula.ai — AI-Native ATS

**Date:** 2026-06-15
**Source:** https://www.kula.ai/
**Status:** Research completed

---

## 1. What is Kula.ai

Kula is a "Gen 3 AI-Native ATS" — an applicant tracking system where AI is embedded in every workflow, not bolted on as an afterthought. Founded 2021, trusted by startups and mid-sized teams.

**Core features:**
- AI Scoring — automatic candidate scoring based on predefined criteria (skills, experience, etc.)
- AI Sourcing — automated candidate discovery from career portals, job boards, outbound, referrals, CRM
- Semantic search — matching beyond keywords (NLP-based)
- Resume screening — automated filtering of inbound candidates
- AI Agents (coming soon) — autonomous recruiting assistants
- Interview note taker — AI summarizes interview highlights
- Integrated analytics — built-in hiring insights and metrics

---

## 2. Key Concepts Applicable to HH-Copilot

### 2.1 Essential vs Optional Criteria (shared concept with ESCO)

Kula uses the concept of "must-have" vs "nice-to-have" criteria for candidate scoring. This directly maps to:
- **ESCО**: essential skills vs optional skills per occupation
- **HH-Copilot**: role-implied skills vs truly missing skills

**Application:** In `quality-recommendations.js` and `match-scorer-skills.js`, we already started implementing this via `role-implied-skills.js`. Skills implied by the position title should NOT be shown as "missing" — they are "must-have by definition" and assumed present.

### 2.2 Semantic Search / NLP Matching

Kula's matching goes beyond keyword overlap. It uses NLP to understand that:
- "Руководство коллективом" ≈ "Управление командой" ≈ "Team leadership"
- "P&L responsibility" ≈ "Управление прибылью" ≈ "Financial management"

**Application:** In HH-Copilot, this is partially implemented via `skill-synonyms.js` (50+ groups). But synonyms are manual and static. Future improvement: use embedding-based similarity for automatic semantic matching.

### 2.3 AI Scoring Pipeline

Kula scores candidates on multiple axes:
- Skills match
- Experience level
- Cultural fit signals
- Role alignment

**Application:** HH-Copilot already has 4-axis scoring (skills 40%, title 30%, salary 15%, experience 15%). What's missing:
- Role-alignment bonus (if position matches career trajectory)
- Implied skills credit (partial score for skills implied by position)

### 2.4 Resume Parsing Limitation

Kula does NOT currently offer resume parsing (per Skima.ai review). This is an advantage for HH-Copilot — we DO parse resumes from hh.ru DOM.

---

## 3. Comparison: Kula.ai vs HH-Copilot

| Feature | Kula.ai | HH-Copilot |
|---------|---------|------------|
| Platform | Full SaaS ATS | Chrome Extension |
| Market | Global (English) | Russian (hh.ru) |
| Resume parsing | No | Yes (DOM-based) |
| Skill matching | AI Scoring (semantic) | Jaccard + synonyms + implied |
| Essential/Optional | Must-have vs nice-to-have | Role-implied filter (partial) |
| Candidate sourcing | AI-powered outbound | Manual browsing + auto-respond |
| Interview support | AI note taker | No |
| Cover letter | AI-generated | Template-based + AI generation |
| Analytics | Built-in dashboard | Stats tab |
| Price | Paid SaaS | Free (extension) |

---

## 4. What We Should Apply from Kula.ai

### Phase 1 (Current sprint — v1.9.31.0)
- [x] Role-implied skills concept — skills self-evident from position title are NOT "missing"
- [ ] Essential vs optional distinction in scoring — implied skills get partial credit (40%), not full

### Phase 2 (Future)
- [ ] Semantic matching beyond synonyms — embedding-based skill similarity
- [ ] Career trajectory alignment — bonus for progressive experience (intern → junior → senior → lead)
- [ ] AI-powered cover letter improvement (Kula's AI generates personalized outreach messages)

### NOT applicable
- AI Sourcing — HH-Copilot works within hh.ru, not across platforms
- Interview note taker — outside our scope
- Full ATS — we complement hh.ru, not replace it

---

## 5. Sources

1. Kula.ai homepage: https://www.kula.ai/
2. ATS Features blog: https://www.kula.ai/blog/applicant-tracking-system-features
3. AI Sourcing blog: https://www.kula.ai/blog/ai-sourcing
4. Skima.ai review: https://skima.ai/blog/product-deep-dives/kula-reviews
5. Reddit migration experience: https://www.reddit.com/r/recruiting/comments/1n23fiu/migrating_from_ashby_to_kulaai
