# Audit: Matching + Skills + Cover-Letter Pipeline

- **Date:** 2026-06-24
- **Auditor:** zcode (3 parallel Explore agents + manual cross-checks)
- **Scope:** verify correctness of resume/vacancy scoring and its downstream use
  for AI cover-letter generation. Read-only audit — no code changed.
- **Method:** read source directly, cite file:line, no reliance on README/cascade status.
- **Baseline version:** v1.9.66.0

---

## 0. Executive Summary

The pipeline is **architecturally sound and defended against the worst
anti-hallucination failure (no NaN/empty-set crashes)**. But there are real
correctness risks concentrated in **skill derivation/implication (inference
layers)** and **AI-pattern validation (too lenient)**. Documentation drift is
significant (weights, pattern count, file pointers).

**Confidence on the core question "is scoring done correctly?":** the arithmetic
is correct and guarded; the *semantics* have three bias sources (RF-1/2/7 below)
that inflate scores for data-poor and inference-heavy inputs.

**Confidence on "is the cover letter grounded?":** the evidence pipeline is
honest (verbatim quotes only), but two downstream gaps let hallucinations slip
through (RF-J, RF-I).

---

## 1. Matching Engine — VERIFIED FACTS

### 1.1 Corrected premises (README/my earlier statements were WRONG)

| Claim (README / earlier) | Reality (verified in code) |
|--------------------------|----------------------------|
| Function `calculateMatchScore(vacancy, resume)` | **`computeMatchScore(resume, vacancy)`** (`match-scorer.js:40`). Order is reversed vs. the claim. |
| 5 components, weights 40/15/15/15/15 | **4 components**: skills 40 / **title 30** / salary 15 / experience 15. **No location component** and no `match-scorer-location.js`. |
| Jaccard for skills | **Weighted ratio**, not Jaccard (`match-scorer-skills.js:92-113`). |

### 1.2 Signature & return shape

`computeMatchScore(resume, vacancy)` → `{ total, breakdown:{skills,title,salary,experience}, details }` (`match-scorer.js:40,50-81`).

`details` contains: `matchingSkills`, `derivedMatchSkills`, `synonymMatchSkills`,
`impliedMatchSkills`, `missingSkills`, plus `extraSkills`, `titleSimilarity`,
`salaryMatch`, `experienceMatch` (`match-scorer.js:71-81`).

### 1.3 Per-component algorithms

| Component | Weight | Algorithm | Source |
|-----------|-------|-----------|--------|
| skills | 0–40 | weighted ratio of matched vacancy skills; tiers matching(1.0)/derived(0.7)/synonym(0.5)/implied(0.4); confidence factor scales by skill count | `match-scorer-skills.js` |
| title | 0–30 | token-overlap ratio vs vacancy tokens + abbreviation bonus (≤5); role-mismatch penalty | `match-scorer-title.js` |
| salary | 0–15 | numeric-range overlap with tolerance bands; no-data → 8 | `match-scorer-salary.js` |
| experience | 0–15 | years-range match; no-exp-required → 15; unknown → 8 | `match-scorer-experience.js` |

### 1.4 Anti-hallucination (POSITIVE finding)

**No NaN/Infinity hazard.** Verified all division paths:
- skills: early-return on empty vacancy skills (`match-scorer-skills.js:44`) + `size>0` guard at `:112`
- title: guards empty title (`:25`)
- salary: `|| Infinity` / `|| 0` defaults (`:48-49`)
- experience: `|| 99` default max (`:54`)

### 1.5 Role-mismatch penalty (by design, but confusing)

`match-scorer.js:59-69`: if title score=0 AND similarity=0 → total capped at 25;
if similarity in (0, 0.15) → capped at 40. `breakdown` still shows uncapped
component values → "why 25% when components sum to 70?" confusion.

---

## 2. Skill Pipeline — VERIFIED FACTS

### 2.1 Resume side

5 cascading DOM strategies in `parse-resume-skills.js` (skills-card, skills-table,
heading-walk, `data-qa*="skill"`, Magritte tag scan). Skill levels parsed from
`data-qa^="skill-level-title-"` → `{3:'Продвинутый',2:'Средний',1:'Начальный'}`.

### 2.2 Synonym system

32 synonym groups (~110 normalized strings), **fully bidirectional** within a
group (`skill-synonyms.js:42-59`). Weight `SYNONYM_WEIGHT = 0.5`.

### 2.3 Normalization contract (CRITICAL — verified consistent)

`normalizeSkill` (`cover-letter-evidence.js:68-75`) and `normalizeSkillSet`
(`match-scorer-skills.js:133-147`) are **logically identical**:
lowercase → trim → hyphen/dash→space → ё→е → collapse spaces.
**Agent #3's "Red Flag A" (silent competency drops from normalizer mismatch) is
REFUTED.** The contract holds.

> Note: neither normalizer strips dots. `"Node.js"` stays `"node.js"` on both
> sides consistently — so this is fine, not a bug.

---

## 3. Cover-Letter Pipeline — VERIFIED FACTS

### 3.1 Corrected premise

The AI chain orchestrator is **`cover-letter-ai.js`** (`generateAICoverLetter`,
lines 38-106), NOT `cover-letter-generator.js` (which is the legacy template path
and does not use scorecard/evidence/prompt). **README pointing F-CR-02 at the
generator is a doc error.**

### 3.2 Chain

```
extractScorecard(vacancy)            -> scorecard (vacancy-derived, resume-blind)
computeMatchScore(resume, vacancy)   -> matchResult.details (skill buckets)
mapEvidence(scorecard, resume, matchResult) -> Evidence[] (verbatim quotes)
buildPrompt(scorecard, evidence, tone) -> LLM messages
sendMessage(...)                     -> AI letter
validateLetter(letter, evidence, resumeSkills) -> { ok, text, warnings }
```

### 3.3 Evidence is sent VERBATIM with confidence (`cover-letter-prompt.js:65`)

```
[<competency>]: <evidenceText>  [уверенность: <confidence>]
```
System prompt has 6 hard rules: "use ONLY facts from Доказательства", "do not
invent skills/dates/numbers", "if no evidence for a competency — don't mention it".

### 3.4 Validator — "11 patterns" claim is FALSE

Actual: **8 regex AI-patterns** + **2 heuristics** = **10** (`cover-letter-validator.js:22-31,48-55`).
Rule-of-three is explicitly skipped (`:46` comment "too noisy"). Em-dash-as-comma
is not detected (only em-dash-overuse >3).

### 3.5 Unverified-skill whitelist is narrow

`findUnverifiedSkills` whitelist = 30 hardcoded tech names (`:92`): React,
TypeScript, JS, Python, Java, Go, Rust, C++, SQL, Node.js, Docker, K8s, AWS,
GCP, Azure, Kafka, Redis, MongoDB, PostgreSQL, MySQL, GraphQL, REST, API, HTTP(S),
CI/CD, Git, Linux, Windows, MacOS. **Vue, Angular, Spring, Django, Flutter, Swift,
Kotlin, Ruby, PHP, Tailwind, Jenkins, Terraform, etc. are NOT covered.**

---

## 4. RED FLAGS — ranked by severity

### 🔴 HIGH

**RF-1 — Skill derivation hallucinates on negated/irrelevant prose.**
`derive-skills.js:74-80` runs `pattern.test(corpus)` over concatenated resume
text with **no sentence/negation awareness**. A resume saying "не использовал 1С"
or "без опыта b2b" can still trip the `b2b` pattern → counted as derived skill →
**70% credit** (`match-scorer-skills.js:91`). No guardrails.

**RF-2 — Role-implied substring matching is too loose.**
`role-implied-skills.js:215` uses `normalizedTitle.includes(trigger)`. Tiny bare
triggers `'vp'`, `'hr'`, `'cfo'`, `'pm '` (`:30,132,151,169`) and stem
`'финансов'` can misfire inside larger tokens (e.g. "VIP", "нефинансовый"). Each
false imply = **40% credit** (`:237`). No word-boundary enforcement.

**RF-J — Validator skill whitelist misses most tech names.**
`cover-letter-validator.js:92`. A hallucinated "Vue"/"Angular"/"Spring" (not in
evidence, not in resume.skills) is **not flagged** → letter ships with `ok:true`.
Large hole.

### 🟡 MEDIUM

**RF-7 — Double inference compounding.** When a vacancy has no `keySkills`, its
`derivedSkills` (regex-inferred from description) becomes the requirement set
(`vacancy-skills-collector.js:74-80`). Combined with RF-1, *both sides* are
keyword guesses → two layers of inference stack.

**RF-9 — No-data bias.** Salary "no-data" → 8/15, experience "unknown" → 8/15
(`match-scorer-salary.js:36,40,44`; `match-scorer-experience.js:44,50`). A
vacancy with neither earns 16/30 (53%) from zero-evidence components → scores
of data-poor vacancies are inflated.

**RF-I — AI-pattern warnings never reject.** `cover-letter-validator.js:156-159`:
`ok=false` only for `UNVERIFIED_SKILL` or `UNVERIFIED_NUMBER`. AI-pattern warnings
(see RF-J) don't affect `ok`, and there is **no regenerate loop**
(`cover-letter-ai.js:88-105`). AI-sounding letters ship as ok.

**RF-H — Doc/prompt/validator mismatch on pattern count.** README & prompt header
say "11 patterns"; validator enforces 10. Rule-of-three unimplemented.

**RF-4 — Quantization-dependent role-mismatch caps.** `match-scorer-title.js:55`
rounds similarity to 2 decimals; the soft-cap threshold `< 0.15`
(`match-scorer.js:66`) is boundary-quantization-sensitive.

**RF-5 — Hard cap contradicts breakdown silently.** `match-scorer.js:65` caps
total at 25 on zero title overlap, but `breakdown` shows uncapped components.

**RF-M — Company-name match is weak grounding.** `cover-letter-evidence-search.js:80-83`:
a skill substring in the employer NAME becomes "evidence" (confidence medium).
LLM may spin employer name into a false competency claim.

**RF-F — Role outcomes sent without disambiguation.** `cover-letter-prompt.js:60-62`:
`Ожидаемые результаты` (role outcomes) fed as context but system prompt doesn't
say "these describe the ROLE, not the candidate" → LLM may claim them as own.

**RF-D — Final fallback sends placeholder competency.** `cover-letter-evidence-fallback.js:52`:
on low-signal resumes, `competency:'(опыт из резюме)'` is sent to the LLM — max
hallucination surface.

### 🟢 LOW

- **RF-3** Dead `.length` guard on a Set (`match-scorer-title.js:38`).
- **RF-8** Null-guard returns empty `details:{}` (`match-scorer.js:42`); consumers
  that destructure without guards get `undefined` (but `mapEvidence` tolerates it).
- **RF-B** Synonym bucket parsing hardcodes `~` separator — implicit contract.
- **RF-C** "declared" fallback grounds on bare self-declared skill list.
- **RF-E** Missing-skill exclusion lives in mapEvidence, not scorecard (coupling).
- **RF-G** `scorecard.position/company` injected by orchestrator, not by extractScorecard.
- **RF-L** Number check misses decimals ("1.5x") and skips 0/1.
- **RF-RF3-resume** Resume skill dedup on RAW (unnormalized) text — inflates
  debug counts (not a downstream correctness bug since scorer re-normalizes).
- **RF-RF4-resume** Two parallel resume-skill parsers (`parse-resume-skills.js`
  live + `resume-fetch-resume-skills.js` fetch) will drift.
- **RF-RF6** Synonym index is a cached global singleton (fine for static data).

---

## 5. Concrete failure scenarios (traced end-to-end)

### Scenario 1 — Inflated score via inference stacking (RF-1 + RF-7 + RF-9)
Vacancy with no `keySkills` and no salary → requirements inferred from description
(RF-7), resume "derived skills" inferred from prose (RF-1), no-data salary
+8 (RF-9). A candidate whose resume merely *mentions* keywords gets a
high-looking score with little real overlap.

### Scenario 2 — Hallucinated skill ships unflagged (RF-J + RF-I)
LLM writes "Также работал с Vue.js" (Vue not in evidence). Validator whitelist
excludes Vue → not flagged → `ok:true`. No regenerate loop (RF-I). Letter ships
with a fabricated skill.

### Scenario 3 — Confusing 25% (RF-4 + RF-5)
Different profession title (zero token overlap) but strong skill/salary/exp
match → components show 40+15+15=70, but total silently capped at 25. User sees
"25% match, components look high" → confusion (not a bug, but needs UI note).

---

## 6. Recommendations (prioritized — NOT executed, awaiting decision)

1. **Tighten derivation/implication matching** (RF-1, RF-2): add word boundaries,
   negation detection, or lower derived/implied weights. Highest score-integrity
   impact.
2. **Replace validator whitelist** (RF-J): derive the checked skill set from
   `resume.skills + evidence.competencies` dynamically instead of a hardcoded list.
3. **Reconcile pattern count** (RF-H): implement rule-of-three + em-dash-comma, OR
   fix README/prompt to say 10.
4. **Decide AI-pattern policy** (RF-I): surface warnings in UI; consider one
   regenerate attempt on threshold.
5. **Fix doc pointers** (RF in §3.1): F-CR-02 = `cover-letter-ai.js`, not
   `cover-letter-generator.js`.
6. **Tune no-data bias** (RF-9): consider scoring no-data as 0 or a lower neutral
   to avoid inflating sparse vacancies.
7. **Unify resume-skill parsers** (RF-RF4): extract shared strategy module to
   prevent drift.

---

## 7. What was REFUTED during the audit (honesty, Rule 5/6)

- **Agent #3 Red Flag A** ("normalizer mismatch → silent competency drop"):
  manually verified `normalizeSkill` ≡ `normalizeSkillSet`. **Refuted.**
- **My own earlier claim** of "calculateMatchScore(vacancy, resume), 5 components,
  Jaccard": all three wrong. Corrected above.

## 8. Files inspected (directly read, not inferred)

Matching: `match-scorer.js`, `match-scorer-skills.js`, `match-scorer-salary.js`,
`match-scorer-experience.js`, `match-scorer-title.js`.

Skills: `skill-dictionary.js`, `skill-synonyms.js`, `skill-synonyms-data-{sales,
marketing-finance,product-hr-it}.js`, `derive-skills.js`, `role-implied-skills.js`,
`vacancy-skills-collector.js`, `parse-resume-skills.js`, `resume-fetch-resume-skills.js`.

Cover letter: `cover-letter-ai.js`, `cover-letter-scorecard.js`,
`cover-letter-evidence.js`, `cover-letter-evidence-search.js`,
`cover-letter-evidence-fallback.js`, `cover-letter-prompt.js`,
`cover-letter-generator.js`, `cover-letter-validator.js`.

---

## 9. Deep dive: RF-1 quantified — `SKILL_PATTERNS` false-positive measurement

**Date added:** 2026-06-24 (follow-up). **Method:** read all 3 dictionary files
(~50 skill entries across 9 domains), then ran the **real** `deriveSkillsFromExperience`
on 7 hand-crafted resumes where the candidate clearly does NOT have the skill.
This is measured output, not estimation.

### 9.1 Dictionary size & quality overview

- **~50 skill entries** in 9 domains (management 13, sales 12, marketing 6,
  finance 6, IT 10, product 4, HR 3, logistics 3, soft 13).
- Each entry has 1–7 `RegExp` patterns; matching is `pattern.test(corpus)` over a
  giant text blob (`derive-skills.js:55` joins title + experience descriptions +
  duties + achievements + additionalInfo + about with `\n`).
- **No sentence-level isolation, no negation handling, no tense/context awareness.**

### 9.2 Measured false-positives (6 of 7 cases produced wrong skills)

| # | Resume text (candidate does NOT have skill) | Wrongly derived | Triggered by |
|---|---------------------------------------------|-----------------|--------------|
| 1 | "не использовал CRM. Без опыта b2b. Подчинённых не было." | **B2B продажи, CRM** | `/B2B/i` on "b2b"; `/CRM/i` on "CRM" — negation ignored |
| 2 | "компания ищет React и Python разработчиков. ...не сам кодил." | **Python, React** | role-context ignored; bare tokens match |
| 3 | "пробовал 1С ... бросил. Читал про Docker, не применял." | **аналитика, Docker, 1С** | past-tense / abandoned ignored; `/аналитик/` matched "аналитик" elsewhere; `/1[СCсc]/` matched |
| 4 | "Организовал conference... Использовал Java-скрипт... опечатка" | (none) | the only clean case |
| 5 | "TS специалист. PM группы. BI анализ. AI отдел." | **управление проектами, TypeScript, анализ данных** | `/\bPM\b/` on "PM"; `/\bTS\b/` on "TS"; `/\bBI\b/` on "BI" — 2-letter acronyms match unrelated role abbreviations |
| 6 | "Был стресс на работе из-за дедлайнов." | **стрессоустойчивость** | `/стресс/i` (the only pattern for this skill) — any mention of stress = skill |
| 7 | "внедряли микроCRM. Я к ней доступа не имел." | **CRM** | `/CRM/i` substring inside "микроCRM"; access denied ignored |

**Hit rate: 6/7 (86%) of adversarial resumes produced at least one fabricated skill.**
Each fabricated skill earns **0.7 × 40 = 28 points** of skill-component credit
(`match-scorer-skills.js:91`), i.e. up to 28% of the total score from a skill the
candidate does not have.

### 9.3 Root causes (from reading the patterns)

**RC-1 — Bare substring / acronym patterns without context.** Worst offenders:
- `/B2B/i`, `/B2C/i`, `/CRM/i`, `/SMM/i`, `/digital/i`, `/KPI/i` — match anywhere
- `/стресс/i` (sole pattern for "стрессоустойчивость") — any stress mention = skill
- `/\bPM\b/`, `/\bTS\b/`, `/\bJS\b/`, `/\bBI\b/`, `/\bGTM\b/` — 2-letter tokens match
  unrelated abbreviations ("TS специалист", "PM группы", "BI анализ")
- `/1[СCсc]/` — matches "1С" inside phone numbers, addresses, any "1c"
- `/аналитик/` — matches "аналитика" the noun, "аналитик" the role, "аналитический"

**RC-2 — No negation.** Russian negation markers `не`, `без`, `нет`, `никогда`,
`ни разу` are invisible to `pattern.test()`. "не использовал X" counts as X.

**RC-3 — No tense/ownership separation.** "пробовал, но бросил", "читал про X",
"компания ищет X" all match identically to "внедрил X в продакшен". The corpus
blurs the candidate's own actions with company/context/past attempts.

**RC-4 — The matching is "one match is enough" with `break`** (`derive-skills.js:78`).
A single substring hit anywhere in the entire resume text corpus commits the skill.

### 9.4 Severity reassessment

RF-1 is **HIGH and confirmed by measurement**, not just theoretical. The 86%
adversarial hit rate means the derived-skills bucket is systematically unreliable.
Combined with:
- `derivedWeight = 0.7` (heavy credit, `match-scorer-skills.js:91`)
- RF-7 (vacancy requirements also inferred when no keySkills → double inference)
- RF-J (cover-letter validator doesn't catch non-whitelisted fabricated skills)

→ A candidate can be scored and have a cover letter written around skills they
**explicitly disclaimed**, and the pipeline will not catch it.

### 9.5 Mitigation options (ranked, not executed)

1. **Require phrase-level context, not bare substring.** Rewrite the worst
   patterns: `/стресс/` → `/стрессоустойчив/i`; `/B2B/` → `/B2B\s+(?:продаж|клиент|сегмент)/i`;
   remove bare 2-letter acronym patterns (`/\bPM\b/` etc.) or anchor them to role
   words. Biggest single improvement.
2. **Negation guard.** Before accepting a hit, check the preceding ~20 chars for
   `не|без|нет|никогда|ни разу|бросил|не использовал` and reject. Moderate effort,
   high payoff.
3. **Lower `derivedWeight`** from 0.7 → 0.4–0.5 to reduce the credit a single
   inference earns. Trivial, but blunt (hurts true positives too).
4. **Sentence isolation.** Run `pattern.test()` per-sentence (already split by
   `splitSentences` elsewhere) instead of on the whole blob. Reduces cross-sentence
   contamination (e.g. company-context in one sentence leaking into candidate claims).
5. **Add a `derive-skills` test suite** — there is currently NO test for
   `deriveSkillsFromExperience` (confirmed: no `derive-skills.test.js`). This is
   why RF-1 went undetected. Highest-value defensive fix regardless of (1)-(4).

---

## 10. RF-SYN — synonym matching not robust to "навыки"-prefix and word-form variants

**Date added:** 2026-06-26 (follow-up, after running the real pipeline on a
user's actual resume + vacancy). **Severity: HIGH — affects every candidate on
every hh.ru vacancy.**

### 10.1 Problem

`findSynonymMatch(skillA, skillSet)` (`skill-synonyms.js:81`) looks up the
EXACT normalized key in the synonym index:

```js
const synonyms = _synonymIndex.get(normalize(skillA));
if (!synonyms) return null;          // <-- dead end for "навыки переговоров"
```

`normalize()` (`skill-synonyms.js:65-71`) only does lowercase / trim /
hyphen→space / ё→е. It does NOT strip service prefixes ("навыки ", "навык ",
"умение ", "работа с ", "ведение ") and does NOT do stem-matching.

The synonym index keys are the literal group-member strings
(e.g. `"переговоры"`, `"работа с возражениями"`). So a vacancy skill written as
**"Навыки переговоров"** normalizes to `"навыки переговоры"` — a key that does
NOT exist in the index → `null` → skill dumped into `missingSkills`.

### 10.2 Measured reproduction (real data)

Ran `findSynonymMatch` with a resume skill set `{переговоры, деловое общение,
работа с возражениями}` against formulations a real hh.ru vacancy used:

| Vacancy skill | normalize → | Result | Should match |
|---------------|-------------|--------|--------------|
| `"Навыки переговоров"` | `"навыки переговоров"` | **NULL → missing** | `"переговоры"` |
| `"Деловая коммуникация"` | `"деловая коммуникация"` | **NULL → missing** | `"деловое общение"` |
| `"отработка возражений"` | `"отработка возражений"` | **NULL → missing** | `"работа с возражениями"` |
| `"Работа с возражениями"` | (exact group member) | MATCH ✅ | — |
| `"переговоры"` | (exact group member) | MATCH ✅ | — |

**3 of 5 legitimate formulations fail.** The two that pass only pass because
they happen to be exact members of the hardcoded synonym group.

### 10.3 Real-world impact (measured on a real resume)

Resume: "Руководитель отдела продаж", 20+ years experience, explicit skills
include `CRM, Управление командой, B2B Продажи, Управленческие навыки` plus a
rich experience text (reanimated a sales dept, +35% productivity, hired 40
people, etc.).

Vacancy: "Руководитель отдела продаж" for an AV-equipment distributor,
keySkills = `[Управление командой, Планирование, Подбор персонала,
Обучение персонала, Навыки переговоров, Руководство коллективом,
Деловая коммуникация, Мотивация персонала, B2B Продажи,
Управленческие навыки, Навыки продаж, Аналитическое мышление]`.

`computeMatchScore(resume, vacancy)` returned **67/100**, because 5 of 12
vacancy skills landed in `missingSkills`:
`Подбор персонала, Навыки переговоров, Деловая коммуникация, Навыки продаж,
Аналитическое мышление` — of which at least **Навыки переговоров** and
**Деловая коммуникация** are false-negatives caused directly by RF-SYN (the
candidate demonstrably has negotiations + business communication). A
reasonable score for this resume/vacancy pair is ~80+.

### 10.4 Root causes

**RC-SYN-1 — No prefix/suffix stripping.** hh.ru vacancies routinely phrase
keySkills as "Навыки X", "X-навыки", "Работа с Y", "Умение Z". None of these
surface forms survive exact-equality lookup against bare group members.

**RC-SYN-2 — No stem fallback.** Even with exact members, natural language
varies ("отработка возражений" vs the stored "работа с возражениями"). A
stem-prefix check (which already exists and was hardened in
`skill-stem-match.js` for the cover-letter evidence path) is not applied to
synonym lookup.

### 10.5 Mitigation (planned, not executed — awaiting user OK)

1. **Strip service prefixes/suffixes** before lookup: `навыки? `, `навык `,
   `умение `, `работа с `, `ведение `, trailing `-навыки` / ` навыки`.
2. **Stem fallback** in `findSynonymMatch`: if exact lookup returns null,
   check whether any group member shares a stem-prefix with `skillA`
   (reuse `mentionsSkillStem` from `skill-stem-match.js`).
3. **Acceptance criterion**: the real resume/vacancy pair above must move
   from 67 → ~80, and "Навыки переговоров" must MATCH "переговоры".

### 10.6 Also discovered: `skill-synonyms.js` has NO tests

Confirmed: no `skill-synonyms.test.js` exists and `findSynonymMatch` is not
referenced in any test file. Same blind spot as `derive-skills` had before §9.
A characterization test suite will be added alongside the fix.

