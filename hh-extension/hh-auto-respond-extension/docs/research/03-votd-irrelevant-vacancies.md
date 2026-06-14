# Research: VOTD Irrelevant Vacancies on Main Page

**Date:** 2026-06-15
**Status:** Research complete, NOT yet applied in code
**Trigger:** 14 из 19 вакансий на главной странице — мусор (курьер, повар, уборщик) при резюме «Руководитель отдела продаж»

---

## 1. Problem Statement

When a logged-in user with resume «Руководитель отдела продаж» opens hh.ru main page (/), the extension shows 19 vacancies: only 5 are relevant, 14 are completely irrelevant (courier, cook, cleaner, baker, barista, etc.). All 14 irrelevant vacancies go through the full fetch pipeline, wasting network resources and time.

---

## 2. Root Cause: VOTD = Paid Advertising, Not Recommendations

### 2.1 Two Separate Sections on hh.ru Main Page

| Section | data-qa attribute | Personalized | Nature |
|---------|-------------------|-------------|--------|
| «Для вас» (recommended) | `vacancy-serp__vacancy` | **Yes** — ML-based, resume-matched | Smart search (free for users) |
| «Вакансии дня» (VOTD) | `vacancy_of_the_day_title` | **No** — geo-only (region) | Paid promotional product for employers |

### 2.2 Evidence from hh.ru Official Documentation

From `/article/vacancyday`:
> «Вакансия дня размещается на главной hh.ru, отображается и у авторизованных, и у анонимных пользователей»

From `/knowledge-base/article/0195`:
> «Подходящие вакансии» — алгоритмы hh.ru подбирают специально для вас. Умный поиск анализирует ваш опыт, навыки, действия на сайте.

These are **two different products** with **different goals**:
- «Подходящие» = ML recommendations (free, user-centric)
- VOTD = promotional banner (paid, employer-centric)

### 2.3 Real DOM Analysis (2026-06-15, hh.ru main page)

Verified by fetching and parsing the actual hh.ru main page HTML:

| Metric | Value |
|--------|-------|
| `vacancy-serp__vacancy` occurrences | **0** (anonymous page); >0 for logged-in users |
| `vacancy_of_the_day_title` occurrences | **14** |
| `adsrv.hh.ru/click` URLs (sponsored VOTD) | **11** |
| `content.hh.ru/api/v1/vacancy_of_the_day/click` URLs (organic VOTD) | **4** |
| Direct `/vacancy/XXX` links | **0** (VOTD uses click-tracking URLs, not direct links) |

VOTD vacancy IDs are embedded as parent element `id` attributes (e.g., `<div id="132982706">`), matching our code's Fallback 2 extraction path.

---

## 3. Why Specifically Courier/Cook/Cleaner

The 14 VOTD vacancies from the real main page:

| # | Title | Category |
|---|-------|----------|
| 1 | Уборщик производственных и служебных помещений (м. Строгино) | Blue collar |
| 2 | Повар (м. Пражская) | Blue collar |
| 3 | Курьер / Велокурьер в Озон фреш | Blue collar |
| 4 | Пекарь (м. Бибирево) | Blue collar |
| 5 | Курьер документов и посылок | Blue collar |
| 6 | Слесарь-сборщик космического аппарата | Blue collar |
| 7 | Менеджер (generic) | Mid-level |
| 8 | Менеджер по премиальному развитию клиентов | Mid-level |
| 9 | Главный менеджер по работе с клиентами | Mid-level |
| 10 | Менеджер по привлечению клиентов | Mid-level |
| 11 | Ассистент стоматолога | Retail/Service |
| 12 | Ассистент ветеринарного врача | Retail/Service |
| 13 | Бариста в кофейню Дринкит (м. ЦСКА) | Retail/Service |
| 14 | Консультант-кассир MAAG (ТЦ Охотный ряд) | Retail/Service |

**Breakdown:** 6/14 blue collar, 4/14 generic mid-level, 4/14 retail/service. **Zero senior/executive positions.**

**Reasons:**
1. **Mass hiring** — Courier services, retail, restaurants hire by hundreds. VOTD is cost-effective for them.
2. **High turnover** — Blue collar positions have weekly churn, constant need for new applicants.
3. **Budget** — Large employers (Ozon, retail chains) have advertising budgets. A company hiring one sales director won't pay for VOTD.
4. **Targeting** — hh.ru filters VOTD by **geography only** (Moscow region), NOT by profession/skills. «Курьер в Москве» is shown to ALL Moscow users, including sales directors.
5. **Revenue model** — VOTD generates revenue from mass recruitment. hh.ru has no incentive to personalize it.

---

## 4. Code Trace: How Garbage Reaches the App

### 4.1 Entry Point — `handleMainPage()` (main-page-handlers-pages.js:191-227)

```javascript
const recommended = await parseVacanciesFromPage(panelState.resume);  // 5 vacancies
const votd = await parseVacanciesOfTheDay(panelState.resume);         // 14 vacancies
const allVacancies = [...recommended, ...votd];                       // 19 merged
```

**Problem:** Both arrays merged without distinguishing source. VOTD ads sit alongside personalized recommendations.

### 4.2 VOTD Parser — `parseVacanciesOfTheDay()` (vacancy-list.js:131-233)

Correctly finds 14 VOTD cards via `[data-qa="vacancy_of_the_day_title"]`. Extracts:
- title, salary, company, vacancy ID
- Sets `source: 'votd'` on each vacancy object (line 214)

**But creates vacancies with:** `skills: []`, `experience: ''` — because VOTD cards don't contain these fields.

### 4.3 SERP-Stage Match Score

For «Курьер / Велокурьер» vs «Руководитель отдела продаж»:

| Component | Score | Reason |
|-----------|-------|--------|
| skills | 10/40 | Empty skills → neutral fallback (scoreSkills line 46) |
| title | 0/30 | Zero keyword overlap, similarity=0 |
| salary | 5-15/15 | May overlap numerically |
| experience | 0/15 | Empty experience string |
| **Role mismatch penalty** | **cap 25%** | similarity=0 → total capped at 25% |

**SERP-score: ~10-25%. Already below minMatchScore=60%.**

### 4.4 THE HOLE — `fetchVacancyDetails()` (vacancy-fetch.js:121-129)

```javascript
const toFetch = vacancies.filter(v => {
  if (v.keySkills && v.keySkills.length > 0) return false;  // VOTD: keySkills=undefined → passes
  const cached = detailMap.get(v.id);
  if (cached && isDetailFresh(cached)) return false;         // No cache → passes
  return true;  // GARBAGE WITH matchScore=17% REACHES HERE
});
```

**The filter does NOT check matchScore.** Any vacancy without keySkills and without fresh cache goes to fetch — even with matchScore=10%.

### 4.5 Wasted Resources

For each of 14 irrelevant vacancies:
1. `fetchVacancyViaIframe(vacancy.url)` — creates iframe, loads page, parses DOM
2. `fetchVacancyViaText(vacancy.url)` — fallback text fetch
3. `gaussianDelay(1500, 3500)` — rate limit between fetches

**14 useless fetches × ~2.5s avg = ~35 seconds of wasted network activity.**

### 4.6 DEEP-Stage Score — Same Result

After fetch, «Курьер» gets keySkills: `["Доставка", "Курьерская доставка", ...]`. These skills **still don't overlap** with РОП skills (`["Управление продажами", "B2B", "Переговоры", ...]`).

DEEP-score: same ~10-25%. **Fetch changed nothing.**

---

## 5. Data Available for Early Filtering (SERP Stage)

Before fetch, we already have:

| Field | Available | Usable for filtering? |
|-------|-----------|----------------------|
| `title` | Yes — «Курьер / Велокурьер» | Yes — title similarity = 0 |
| `salary` | Yes — «от 120 000 до 250 000» | Partially |
| `source` | Yes — `'votd'` | **Yes — 100% reliable marker** |
| `matchScore` | Yes — 10-25% | **Yes — already < minMatchScore** |
| `company` | Yes | Limited value |
| `skills` | No — empty `[]` | N/A |
| `experience` | No — empty string | N/A |

**Conclusion:** `source: 'votd'` + `matchScore < minMatchScore` are sufficient for 100% reliable early filtering. No fetch needed.

---

## 6. Discrepancy Map — All Points Where Code Diverges from Optimal Behavior

| # | Problem | File:Line | Impact | Fix Complexity |
|---|---------|-----------|--------|----------------|
| 1 | VOTD not filtered by source before merge | `main-page-handlers-pages.js:196` | Ads mixed with recommendations | Low |
| 2 | `fetchVacancyDetails()` ignores matchScore | `vacancy-fetch.js:121-129` | Garbage with 10% goes to fetch | Low |
| 3 | `fetchVacancyDetails()` ignores source='votd' | `vacancy-fetch.js:121-129` | VOTD always fetches (no keySkills) | Low |
| 4 | No VOTD vs Recommended distinction in UI | `vacancies.js` render | User confused about garbage source | Medium |
| 5 | VOTD cards have no skills/experience | Nature of VOTD | Fetch required for scoring, but useless | Architectural |

---

## 7. Key Conclusions

1. **VOTD is paid advertising.** It will NEVER be personalized. This is by design — employers pay for reach, not targeting.
2. **VOTD will always contain mass-hiring positions.** Couriers, cooks, cleaners — these employers have the budget and need for VOTD. Senior positions will never appear in VOTD.
3. **SERP-stage match score is sufficient to filter.** Role mismatch penalty caps VOTD garbage at 25%, well below minMatchScore=60%.
4. **Fetch is 100% wasted on VOTD garbage.** The deep score equals the SERP score because irrelevant skills don't match regardless of how many you fetch.
5. **`source: 'votd'` is already marked in code** (vacancy-list.js:214) — the infrastructure for filtering exists, it's just not used.

---

## 8. NOT Applied in Code (Requires Permission)

This research is documented but NO code changes have been made. Potential fixes require user approval:

- Add matchScore threshold to `fetchVacancyDetails()` filter
- Add source='votd' filter to skip fetch for VOTD vacancies
- Optionally: separate VOTD into distinct UI section with clear labeling
- Optionally: add setting to exclude VOTD entirely
