# Research: Negotiations Page DOM Analysis

**Date:** 2026-06-16
**Status:** Research complete, NOT yet applied in code
**Trigger:** Tab "Perenosy" в sidebar всегда показывает "Perenosy poka ne zagruzheny" — parser stub, net dannyh

---

## 1. Problem Statement

Tab "Perenosy" (negotiations) in HH-Copilot sidebar is a non-functional stub. `parseNegotiations()` returns `[]`, no page handler is registered for `/applicant/negotiations`, and the tab always shows empty state. The goal is to parse the negotiations list and display it with status badges and matchScore integration.

---

## 2. Page URL and Structure

**URL:** `https://hh.ru/applicant/negotiations`

**SPA route:** `/applicant/negotiations`

**Top-level container:** `[data-qa="negotiations-list"]`

---

## 3. DOM Structure (one row)

```
negotiations-list
  +-- negotiations-item (each row = one negotiation)
        +-- negotiations-item-checkbox          (checkbox for batch actions)
        +-- negotiations-tag negotiations-item-{status}  (status badge)
        |     text content = status label
        +-- negotiations-item-vacancy           (vacancy title as <a> link)
        |     href = "https://hh.ru/vacancy/{ID}?hhtmFrom=negotiation_list"
        +-- negotiations-item-company           (employer name)
        +-- negotiations-item-date              (date string, e.g. "9 iyunya")
        +-- negotiations-employer-statistics     (employer view stats)
```

---

## 4. Data Extracted from Real Page

Three sample rows (2026-06-16):

| vacancy | vacancyHref | company | date | status class | status text |
|---------|-------------|---------|------|-------------|-------------|
| AI Engineer / AI Automation Specialist... | https://hh.ru/vacancy/133218911?hhtmFrom=negotiation_list | Matuzova Olesya Vasilievna | 9 iyunya | not-viewed | Ne prosmotren |
| Rukovoditel napravleniya prodazh | https://hh.ru/vacancy/133252199?hhtmFrom=negotiation_list | FRESBERI | 9 iyunya | discard | Otkaz |
| Rukovoditel otdela prodazh (remont i dizayn) | https://hh.ru/vacancy/133898632?hhtmFrom=negotiation_list | UrbandCraft | 5 iyunya | not-viewed | Ne prosmotren |

---

## 5. Status Codes (from data-qa)

All unique statuses found on page:

| data-qa suffix | Text | Meaning | UI color suggestion |
|----------------|------|---------|-------------------|
| `negotiations-item-not-viewed` | Ne prosmotren | Employer has not viewed your application yet | amber (#D97706) |
| `negotiations-item-viewed` | Prosmotren | Employer viewed, no response yet | blue (#2563EB) |
| `negotiations-item-discard` | Otkaz | Employer rejected your application | red (#DC2626) |

**Potentially possible** (not found on current page but may exist):
| `negotiations-item-invite` | Priglashenie | Employer invited you to interview | green (#059669) |

---

## 6. Vacancy ID Extraction

The vacancy link in `negotiations-item-vacancy` contains the vacancy ID:
```
https://hh.ru/vacancy/133218911?hhtmFrom=negotiation_list
```

`extractVacancyId()` from `anti-hallucination.js` already handles this URL format. The ID can be used to:
- Link to already-parsed vacancy data (matchScore, skills)
- Navigate to vacancy detail page
- Cross-reference with vacancy list

---

## 7. Selectors to Add

Current selectors in `selectors.js`:
```js
negotiationsChatItem:   ['[data-qa="negotiations-chat-item"]', '[class*="negotiations-chat"]'],
negotiationsChatUnread: ['[data-qa="negotiations-chat-unread"]', '[class*="unread"]'],
```

These are **wrong** — they reference "chat-item" which doesn't exist on the list page. Need to replace with:

```js
negotiationsList:        ['[data-qa="negotiations-list"]'],
negotiationsItem:        ['[data-qa="negotiations-item"]'],
negotiationsItemVacancy: ['[data-qa="negotiations-item-vacancy"]'],
negotiationsItemCompany: ['[data-qa="negotiations-item-company"]'],
negotiationsItemDate:    ['[data-qa="negotiations-item-date"]'],
negotiationsItemTag:     ['[data-qa^="negotiations-tag"]'],
```

---

## 8. Data Model for Parsed Negotiation

```js
{
  id: string,           // vacancy ID (extracted from link)
  vacancyTitle: string, // vacancy title text
  vacancyUrl: string,   // full URL to vacancy
  company: string,      // employer name
  date: string,         // date string (raw from DOM)
  status: string,       // 'not-viewed' | 'viewed' | 'discard' | 'invite' | 'unknown'
  statusText: string,   // raw status text from DOM
  matchScore: number|null, // from vacancy cache or computed
  parsedAt: string      // ISO timestamp
}
```

---

## 9. Implementation Plan

### Phase 1: Parse and Display (minimal viable)
1. Add correct selectors to `selectors.js`
2. Implement `parseNegotiations()` in `parsers/negotiations.js`
3. Add route handler for `/applicant/negotiations` in `main-page-handlers-pages.js`
4. Update `renderNegotiationList()` to show real data with status badges
5. Click on negotiation item navigates to vacancy page on hh.ru
6. Bump version to 1.9.39.0

### Phase 2: MatchScore Integration
- Cross-reference negotiation vacancy IDs with cached vacancy data
- Show matchScore ring next to each negotiation
- Color-code: high match + discard = highlight (missed opportunity)

### Phase 3: Advanced Features (future)
- Status filter pills (All / Invites / Viewed / Discarded)
- Unread count badge
- AI-generated reply to invitations
- Auto-respond to invitations with cover letter

---

## 10. Key Decisions

1. **No chat parsing in Phase 1** — the list page does not contain message content. Chat requires navigating to individual conversation pages (`/applicant/negotiations/{id}`), which is a separate DOM structure. This is Phase 3+.

2. **Status from data-qa, not text** — the status class in data-qa is the reliable source. Text may change (localization, A/B tests), but data-qa is stable.

3. **Reuse existing vacancy ID extraction** — `extractVacancyId()` already handles hh.ru vacancy URLs. No new code needed.

4. **MatchScore from cache only** — we will NOT fetch vacancy details from the negotiations page. If the vacancy was already enriched (user visited it), the score is in cache. Otherwise, show "--" instead of score.

---

## 11. Console Commands Used for Research

```js
// All data-qa attributes containing "negotiation"
[...document.querySelectorAll('[data-qa]')].map(e => e.dataset.qa).filter(q => q.includes('negotiation')).join('\n')

// Detailed data for first 3 items
[...document.querySelectorAll('[data-qa="negotiations-item"]')].slice(0,3).map(item => {
  const vacancy = item.querySelector('[data-qa="negotiations-item-vacancy"]');
  const company = item.querySelector('[data-qa="negotiations-item-company"]');
  const date = item.querySelector('[data-qa="negotiations-item-date"]');
  const tag = item.querySelector('[data-qa^="negotiations-tag"]');
  const link = vacancy?.closest('a') || vacancy?.querySelector('a');
  return {
    vacancy: vacancy?.textContent?.trim()?.substring(0,60),
    vacancyHref: link?.href || vacancy?.href,
    company: company?.textContent?.trim()?.substring(0,40),
    date: date?.textContent?.trim(),
    tagQa: tag?.dataset?.qa,
    tagText: tag?.textContent?.trim()
  };
}).map(JSON.stringify).join('\n')

// Unique statuses
[...document.querySelectorAll('[data-qa^="negotiations-tag"]')].map(e => e.dataset.qa.replace('negotiations-tag negotiations-item-','') + ' -> ' + e.textContent.trim()).filter((v,i,a) => a.indexOf(v)===i).join('\n')
```
