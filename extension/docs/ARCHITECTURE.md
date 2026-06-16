# HH Copilot -- Extension Architecture

**Version:** 1.9.31.0
**Type:** Chrome Extension (Manifest V3)
**Target Platform:** hh.ru (Magritte design system)


## 1. Component Diagram

```
+---------------------------------------------------------------------+
|                        BROWSER (hh.ru)                               |
|                                                                      |
|  +----------------------------------------------------------------+  |
|  |              Content Scripts (document_idle)                     |  |
|  |                                                                  |  |
|  |  +-------------+ +-------------+ +--------------+ +----------+  |  |
|  |  |   PARSERS   | |   PANEL     | |     AUTH     | | MATCHING |  |  |
|  |  |             | |             | |              | |          |  |  |
|  |  | parseVac-   | | ShadowDOM   | |  checkAuth() | | score-   |  |  |
|  |  | ancies()    | |  Sidebar    | |  13 sel.     | | Skills() |  |  |
|  |  | parseRes-   | |  FAB btn    | |  cookie fb   | | score-   |  |  |
|  |  | ume()       | |  6 tabs     | |  username    | | Salary() |  |  |
|  |  | parseVac-   | |  Tour       | |              | | score-   |  |  |
|  |  | Detail()    | |             | |              | | Exp()    |  |  |
|  |  +------+------+ +------+------| +------+-------+ | score-   |  |  |
|  |         |               |              |          | Title()  |  |  |
|  |  +------v---------------v--------------v----------+----------+ |  |
|  |  |                  Shared Libraries                     | |  |
|  |  |  SELECTORS     ANTI-HALLUCINATION   STORAGE          | |  |
|  |  |  findElement    safeGetText          chrome.stor     | |  |
|  |  |  findAllEl      safeClick            age.local       | |  |
|  |  |  waitForElem    safeInput            defaults        | |  |
|  |  |                 validate             daily reset     | |  |
|  |  |  TIMING         RATE LIMITER        DOM observer    | |  |
|  |  |  gaussian       token bucket         SPA nav         | |  |
|  |  |  simulateTyp    adaptive slow        panelState      | |  |
|  |  |                                                    | |  |
|  |  |  SKILLS          QUALITY            TOUR           | |  |
|  |  |  dictionary      ATS-check          tour-engine    | |  |
|  |  |  synonyms        red-flags          tour-steps     | |  |
|  |  |  derive-skills   recommend.         tour-tooltip   | |  |
|  |  |  vacancy-skills  resume-analyzer                    | |  |
|  |  |  role-implied                                      | |  |
|  |  +----------------------------------------------------+ |  |
|  +-------------------------------+------------------------+  |
|                                  |                            |
|  +-------------------------------v------------------------+  |
|  |     Page-World (MAIN world, document_idle)             |  |
|  |  pushState/replaceState patch                          |  |
|  |  Link click interception (SPA navigation)              |  |
|  +-------------------------------+------------------------+  |
|                                  |                            |
|  +-------------------------------v------------------------+  |
|  |        Service Worker (background/index.js)            |  |
|  |  onInstalled: init storage, create daily alarm         |  |
|  |  onAlarm:    reset daily counters at midnight          |  |
|  |  onMessage:  route get-stats, get-settings,            |  |
|  |              apply-vacancy, log, settings-updated       |  |
|  |  updateBadge: appliedToday number on icon              |  |
|  +-------------------------------+------------------------+  |
|                                  |                            |
|  +-------------------------------v------------------------+  |
|  |              Popup (popup/index.html)                  |  |
|  |  Redirect to FAB (minimal)                             |  |
|  +-------------------------------+------------------------+  |
|                                  |                            |
|  +-------------------------------v------------------------+  |
|  |       chrome.storage.local (Persistent)                |  |
|  |  settings, stats, appliedVacancies, resume,            |  |
|  |  blacklistedCompanies, logs, dailyResetDate            |  |
|  +--------------------------------------------------------+  |
+---------------------------------------------------------------------+
```

Three execution contexts: Content Script (runs on hh.ru pages), Page-World Script (runs in MAIN world for SPA navigation), Service Worker (extension background process), Popup (UI on icon click). Communication between them: chrome.storage.local for data and chrome.runtime.sendMessage for commands.


## 2. Data Flows

### 2.1 Vacancy Parsing Flow

```
[hh.ru page loaded]
        |
        v
manifest.json: content_scripts inject content.js (document_idle)
        |
        v
initPageLogic() -- determine page type by URL
        |
        +-- /search/vacancy*  --> parseVacanciesFromPage()
        +-- /vacancy/{id}     --> initVacancyPage() (stub)
        +-- /resume/{hash}    --> parseResume()
        +-- /applicant/resumes --> parseResumeList()
        +-- *                 --> checkAuth() + createFab()
        |
        v  (for /search/vacancy)
parseVacanciesFromPage()
        |
        +-- findAllElements('vacancyCard') --> NodeList of cards
        |
        +-- For each card:
        |       |
        |       +-- findElement('vacancyTitleLink', card) --> titleEl
        |       |       +-- safeGetText(titleEl) --> title
        |       |       +-- safeGetAttr(titleEl, 'href') --> url
        |       |       +-- extractVacancyId(url) --> id
        |       |
        |       +-- findElement('vacancyCompany', card) --> company
        |       +-- findElement('vacancySalary', card) --> salary
        |       +-- findElement('vacancyLocation', card) --> location
        |       +-- findElement('vacancyExperience', card) --> experience
        |       +-- card.querySelectorAll('.bloko-tag__text') --> skills[]
        |       +-- findElement('replyButton', card) --> hasReply
        |       |
        |       +-- validateVacancyData(vacancy) --> {valid, errors}
        |       +-- Check: already applied? Blacklisted?
        |       +-- Add to vacancies[]
        |
        v
panelState.vacancies = vacancies
        |
        v
renderSidebarContent() --> render cards in Shadow DOM sidebar
```

### 2.2 Resume Parsing Flow

```
[User opens /resume/{hash}]
        |
        v
initPageLogic() --> detectPageType() = 'resume'
        |
        v
parseResume()
        |
        +-- URL regex --> resume.id (hex hash)
        |
        +-- data-qa="resume-block-title-position" --> title
        |       +-- fallback: h1
        |
        +-- data-qa="resume-block-salary" --> salary
        |
        +-- data-qa="resume-position-card" text scan:
        |       +-- regex: gender (male/female)
        |       +-- regex: age (N years)
        |       +-- regex: city (Cyrillic text)
        |
        +-- data-qa="skills-card":
        |       +-- [data-qa^="skill-level-title-N"] --> skillLevels
        |       +-- [data-qa^="skill-tag-*"] --> skills[]
        |       +-- fallback: .bloko-tag__text
        |
        +-- [data-qa="profile-experience-company-card"]:
        |       +-- cell-left-side > cell-text-content --> company, duration
        |       +-- magritte-stepper-step-content:
        |               +-- cell-text-content --> position, period
        |               +-- residual text --> description
        |
        +-- data-qa="resume-list-card-education":
        |       +-- method 1: cell-left-side + cell-text-content
        |       +-- method 2: direct child elements
        |       +-- method 3: full text scan
        |
        +-- bloko-tag in resume-about-card --> languages
        +-- data-qa="resume-about-card" text --> additionalInfo
        |
        v
resume._debug = { found: [], missing: [] }
        |
        v
chrome.storage.local.set({ resume })
panelState.resume = resume
renderResumePanel() --> "My Resume" tab in sidebar
```

### 2.3 Authorization Flow

```
[content.js loaded on hh.ru]
        |
        v
createFab() --> gray FAB (checking)
checkAuth():
        |
        +-- Iterate 13 selectors:
        |       [data-qa="mainmenu_applicant"]
        |       [data-qa="mainmenu_user_name"]
        |       a[data-qa="mainmenu_myResumes"]
        |       [data-qa="mainmenu"] sup
        |       .supernova-nav__item--applicant
        |       a[href*="/applicant/"]
        |       ... and 7 more
        |       |
        |       +-- For each: querySelector + getComputedStyle
        |       +-- If visible element found --> return true
        |
        +-- Cookie fallback:
        |       document.cookie contains hhruuid / _HH-RU / hhtoken
        |       --> return true
        |
        +-- Nothing found --> return false
        |
        v
panelState.isLoggedIn = true/false
updateFabIcon() --> blue (true) / red (false)
renderSidebarContent()

[Polling every 2 seconds]
        |
        v
updateAuthState() --> checkAuth() --> updateFabIcon()
```


## 3. Selector Strategy

### 3.1 Why data-qa

hh.ru uses Magritte -- a CSS-in-JS design system that generates hashed class names on every build. Example:

```
magritte-card___bhGKz_8-5-13   (deploy 1)
magritte-card___xYzAb_9-6-14   (deploy 2)
```

A selector based on such a class will stop working after any site update. data-qa attributes, on the other hand, are created for testing and remain stable across deploys. They are the only reliable API for accessing hh.ru's DOM.

### 3.2 Fallback Chains

Each selector in the HH_SELECTORS object is an array of strings. The findElement() function iterates through the array and returns the first visible element:

```javascript
vacancyCard: [
    '[data-qa="vacancy-serp__vacancy"]',     // priority 1: data-qa
    '[class*="vacancy-serp-item"]'            // priority 2: partial class
]
```

findElement() for each selector:
1. Attempts querySelector -- on error (invalid selector) moves to the next one
2. Checks that the element exists (not null)
3. Checks that the element belongs to the document (document.body.contains)
4. Checks that the element is visible via getComputedStyle (display !== 'none', visibility !== 'hidden')
5. Returns the element or null (never undefined)

### 3.3 Selector Categories

**Vacancy Search (search page):** vacancyCard, vacancyTitleLink, vacancyTitleText, vacancyCompany, vacancySalary, vacancyLocation, vacancyExperience, vacancyTags, replyButton, nextPage.

**Vacancy Page (vacancy detail page):** vacancyTitleOnPage, vacancyCompanyOnPage, vacancyDescription, vacancySkills, responsePopup, addCoverLetter, coverLetterInput, submitButton, alertMagritte, relocationConfirm, testTaskWarning, alreadyApplied, indirectEmployerAlert.

**Resume Page (resume detail page):** resumeTitle, resumeSalary, resumeSkillsTable, resumeSkillTag, resumeSkillLevel3, resumeSkillLevel2, resumeSkillLevel1, resumePersonalName, resumeListItem, resumeListTitle, resumeListLink.

**Auth (authorization):** loginEmailInput, loginPasswordInput, loginCaptchaImage, logged_in_indicator.

### 3.4 Forbidden Selectors

It is strictly forbidden to use Magritte CSS classes with hashes (containing ___, e.g. magritte-card___bhGKz). It is also forbidden to rely on h2/h3 headings for resume sections -- Magritte does not use semantic headings for sections.


## 4. Shadow DOM Isolation

### 4.1 Why

hh.ru includes many CSS libraries (Bloko, Magritte). If the panel HTML is inserted directly into document.body, hh.ru styles can break the panel layout, and panel styles can break the page. For example, the .bloko-button class would be overridden, and buttons on the page would stop working correctly.

### 4.2 How It Works

```javascript
panelEl = document.createElement('div');
const shadowRoot = panelEl.attachShadow({ mode: 'closed' });
// All panel styles and DOM exist inside shadowRoot
// External document.body only sees panelEl (empty div)
```

mode: 'closed' means that external JavaScript cannot access shadowRoot via panelEl.shadowRoot -- access is only from inside. This protects against accidental interference.

### 4.3 What Is Isolated

hh.ru CSS does not penetrate into the panel. Panel CSS does not affect hh.ru. hh.ru's global JavaScript has no access to variables and functions inside the Shadow DOM. Events generated inside the Shadow DOM do not bubble out by default (composed: false for internal events).

### 4.4 Exceptions

The extension's content script creates the Shadow DOM, but itself runs in the page context. content.js variables (findElement, safeGetText, etc.) are global to the page, but this is acceptable since function names have prefixes and do not conflict with hh.ru. The diagnoseResumeDOM() function is exported to window.__hhDiagnose for debugging convenience from the console.


## 5. chrome.storage.local Schema

### 5.1 Structure

All extension data is stored in chrome.storage.local. The storage is asynchronous, with a capacity limit of 10 MB. Data is not deleted when the browser is closed.

```
Key                  Type         Default Value              Purpose
--------------------------------------------------------------------------
settings             object       (see DEFAULT_SETTINGS)     User settings
stats                object       (see DEFAULT_STATS)       Response statistics
appliedVacancies     array []     []                        IDs of applied
skippedVacancies     array []     []                        IDs of skipped
blacklistedCompanies array []     []                        Blacklist
logs                 array []     []                        Log (up to 500 entries)
resume               object       null                       Parsed resume
resumeList           array []     []                        Resume list
dailyResetDate       string       null                       Reset date (YYYY-MM-DD)
installedAt          string       null                       Install date (ISO)
```

### 5.2 DEFAULT_SETTINGS

```javascript
{
    mode: 'manual',           // manual / semi-auto / auto
    dailyLimit: 200,          // max applications per day
    minMatchScore: 60,        // min score for auto-apply
    letterTone: 'formal',     // formal / confident / friendly
    searchInterval: 300,      // search interval (sec)
    autoScroll: true,         // auto-scroll the page
    showMatchScore: true,     // show match score
    confirmBeforeApply: true, // confirm before applying
    coverLetterTemplate: ''   // cover letter template
}
```

### 5.3 DEFAULT_STATS

```javascript
{
    totalApplied: 0,
    appliedToday: 0,
    interviewInvites: 0,
    responsesReceived: 0,
    skipsToday: 0,
    errorsToday: 0,
    lastActivity: null       // ISO timestamp
}
```

### 5.4 Operations

getAllSettings() -- reads settings from storage, merges with DEFAULT_SETTINGS, returns the object. On read error, returns a copy of DEFAULT_SETTINGS.

getStats() -- checks daily reset (checkDailyReset), reads stats, merges with DEFAULT_STATS. Counters appliedToday, skipsToday, errorsToday are reset when the date changes.

incrementApplied() -- increments appliedToday and totalApplied, checks the daily limit. Returns {allowed: true/false, remaining: N}.

isAlreadyApplied(id) / markAsApplied(id) -- checks and records in the appliedVacancies array.

checkDailyReset() -- compares dailyResetDate with the current date. If they don't match, resets daily counters and updates the date.

### 5.5 Initialization

When the extension is installed (reason === 'install'), the Service Worker writes all keys with default values to chrome.storage.local. On update (reason === 'update'), existing data is preserved -- the Service Worker only creates/recreates the dailyReset alarm.


## 6. Message Passing

### 6.1 Directions

```
Popup  --sendMessage-->  Service Worker  --sendMessage-->  Content Script
Content Script  --sendMessage-->  Service Worker  (for logs)
```

Content Script cannot send a message directly to Popup (Popup may be closed). Popup sends a message to the Service Worker, and the Service Worker forwards it to the Content Script of the active hh.ru tab via chrome.tabs.sendMessage.

### 6.2 Message Types

**get-stats.** Popup requests statistics. Service Worker reads chrome.storage.local.get('stats') and sends the data back via sendResponse.

**get-settings.** Popup requests settings. Service Worker reads chrome.storage.local.get('settings') and sends them back.

**apply-vacancy.** Popup requests applying to a vacancy. Service Worker forwards the message to the Content Script of the active hh.ru tab (chrome.tabs.query with url filter: 'https://hh.ru/*'). Content Script executes the application logic.

**log.** Content Script or Popup sends a log entry. Service Worker adds it to the logs array in chrome.storage.local (maximum 500 entries, oldest are removed).

**settings-updated.** Popup sends updated settings. Service Worker forwards to Content Script. Content Script updates local state and re-renders the panel.

### 6.3 Asynchronous Responses

For get-stats and get-settings, the Service Worker returns true from the onMessage handler (meaning an asynchronous response). Then calling sendResponse(data) sends the data back to Popup. This is necessary because chrome.storage.local.get is an asynchronous operation.

### 6.4 Badge Updates

The Service Worker exports the updateBadge() function, which reads appliedToday from storage and sets the badge text (number on the extension icon) via chrome.action.setBadgeText. The function is called on initialization and can be called after each application (although currently Content Script updates the badge directly via chrome.runtime.sendMessage).


## 7. Anti-Hallucination Verification

### 7.1 Definition

A "hallucination" in the context of the extension is a situation where the code makes incorrect assumptions about the DOM structure and acts based on data that doesn't exist or is distorted. Examples: accessing textContent of a non-existent element (TypeError, extension crash), parsing salary = "Not specified" as a number (NaN propagation), clicking a hidden element (action is not registered).

### 7.2 Level 1: DOM Verification

Principle: never access the DOM without checking existence and visibility.

safeGetText(el, fallback) performs 5 checks:
1. el !== null
2. el instanceof Element
3. el.offsetParent !== null OR el is not in body (for fixed/transform)
4. el is not hidden via display:none or visibility:hidden (getComputedStyle)
5. textContent is not empty and not whitespace-only

safeGetAttr(el, attr, fallback) checks:
1. el !== null
2. el instanceof Element
3. getAttribute returns not null (returns fallback if null)

safeClick(el, label) checks:
1. el !== null
2. el instanceof Element
3. el.disabled === false
4. document.body.contains(el) === true
5. getComputedStyle: display !== 'none', visibility !== 'hidden'

### 7.3 Level 2: Data Validation

Principle: never use data without validating type, format, and content.

validateVacancyData(v) checks:
- title: exists, type string, length >= 3
- company: exists, type string
- url: exists, starts with "https://hh.ru/"
- id: exists, type string, not empty

extractVacancyId(url) checks:
- url exists, type string
- regex /\/vacancy\/(\d+)/ matched
- on mismatch returns '' (empty string, not null/undefined)

waitForElement(selectors, timeout) checks:
- Instant check (0ms) before starting observer
- MutationObserver with timeout (default 10s)
- On timeout returns null (does not hang)
- Visibility check for each found element

### 7.4 Level 3: Action Verification

Principle: never perform an action without checking preconditions AND result.

safeInput(el, text, label) checks:
1. el !== null
2. el instanceof HTMLElement
3. el.disabled === false, el.readOnly === false
4. text exists, type string, length > 0
5. React native value setter + dispatchEvent(input, change)

simulateTyping(el, text) checks:
1. el and text exist
2. Character-by-character insertion with input event after each character
3. Random delay 30-120ms between characters (simulates live typing)

### 7.5 Developer Rules

Rule 1. Never return undefined. Use specific types: string, null, boolean, number, object. Empty string '' is ok, undefined is not.

Rule 2. Do not assume a DOM element exists. Use findElement() or check manually.

Rule 3. Do not chain .textContent/.value directly. safeGetText() and safeGetAttr() are mandatory.

Rule 4. Do not click invisible elements. safeClick() checks everything.

Rule 5. Do not enter text into disabled/readonly fields. safeInput() checks.

Rule 6. Validate data before use. validateVacancyData() before adding to results.

Rule 7. Check URLs before navigation. extractVacancyId() returns '' for invalid URLs.

Rule 8. Log all errors, do not ignore them. Logger is the single source of truth for debugging.

Rule 9. Do not trust data from chrome.storage blindly. Check type and structure on read.

Rule 10. Provide fallbacks. Selector fallback chains, fallback values, fallback actions.


## 8. SPA Navigation

### 8.1 The Problem

hh.ru is a Single Page Application built with React. When navigating to the next search page (clicking "Next"), the URL changes from /search/vacancy?page=1 to /search/vacancy?page=2, but the page does not reload. The content script loads once at document_idle and is not reloaded on SPA navigation.

### 8.2 Solution

MutationObserver monitors changes in the DOM tree:

```javascript
const observer = new MutationObserver((mutations) => {
    // Filter: only interested in changes within vacancy cards
    let relevantChange = false;
    for (const m of mutations) {
        if (m.target.closest('[data-qa="vacancy-serp__vacancy"]')) {
            relevantChange = true;
            break;
        }
    }
    if (!relevantChange) return;

    // 1 second debounce (wait for DOM to fully update)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const vacancies = parseVacanciesFromPage();
        updateVacancies(vacancies);
    }, 1000);
});
observer.observe(document.body, { childList: true, subtree: true });
```

### 8.3 Debounce

Without debounce, every DOM change (including React's intermediate render states) would trigger re-parsing. The 1-second delay ensures that parsing only starts after the new page has finished rendering.

### 8.4 Cross-page Navigation

When clicking "Apply" in the panel on the search page, you need to navigate to /vacancy/{id}. This causes a full page reload and re-loading of content.js. To preserve state between pages, chrome.storage.local is used: pendingApply is saved with a timestamp; when the vacancy page loads, pendingApply is checked and the application process continues. If pendingApply is older than 2 minutes, it is ignored (protection against stale state).


## 9. Skill Matching Pipeline

### 9.1 Skill Match Categories

When comparing vacancy skills against resume skills, the system uses a 5-tier hierarchy:

| Category | Weight | Description | Source |
|----------|--------|-------------|--------|
| Explicit | 100% | Skill directly declared in resume skills section | `match-scorer-skills.js` |
| Derived | 70% | Skill inferred from experience descriptions | `derive-skills.js` → `match-scorer-skills.js` |
| Synonym | 50% | Related skill from same synonym group | `skill-synonyms.js` → `match-scorer-skills.js` |
| Implied | 40% | Skill self-evident from position title | `role-implied-skills.js` → `match-scorer-skills.js` |
| Missing | 0% | Skill not found anywhere | — |

### 9.2 Role-Implied Skills (v1.9.31.0)

**Problem:** Skills like "руководство коллективом" or "управление проектами" were shown as "missing" for a person with title "Руководитель отделов продаж" — even though these skills are self-evident from the position.

**Solution:** `role-implied-skills.js` maps position title keywords to a set of implied skills. Based on ESCO's essential/optional skills concept.

**How it works:**
1. `getRoleImpliedSkills(title)` returns Set of normalized skill names implied by the position
2. In `quality-recommendations.js`: implied skills are filtered from "missing" and shown with priority "low"
3. In `match-scorer-skills.js`: implied skills get 40% partial credit (future integration)

**Key mappings:**
- Руководитель/Директор/Начальник → управление командой, делегирование, мотивация персонала, стратегическое планирование, etc.
- Менеджер по продажам → переговоры, воронка продаж, работа с клиентами, etc.
- Руководитель отдела продаж → combined (leadership + sales) implied skills
- Маркетолог → маркетинг, продвижение, маркетинговые исследования, etc.
- HR-специалист → подбор персонала, рекрутинг, адаптация персонала, etc.

**Research:** `docs/research/01-role-implied-skills.md`

### 9.3 Synonym Matching (v1.9.22.0)

`skill-synonyms.js` contains 50+ synonym groups. When a vacancy requires skill A and the resume has skill B from the same group, they count as a partial match (50% weight).

Example: "переговоры" matches "работа с возражениями" because objection handling IS part of negotiations.

### 9.4 Skill Derivation (v1.9.20.0)

`derive-skills.js` + `skill-dictionary.js` automatically extract skills from work experience descriptions. 50+ Russian skill keyword patterns. Integrated into both resume parsing paths (DOM and fetch).


## 10. Documentation Structure

```
HH-Copilot-repo/
├── AGENT_RULES.md          -- Agent work rules (MUST read before every session)
├── README.md               -- Project overview
├── CHANGELOG.md            -- Root-level changelog
├── cascade-state.json      -- Task cascade state
├── worklog.md              -- Root-level worklog
│
├── docs/
│   ├── diagrams/           -- Architecture diagrams (PlantUML)
│   ├── wireframes/         -- UI wireframes
│   └── worklog.md          -- Root docs worklog
│
└── extension/
    ├── docs/
    │   ├── ARCHITECTURE.md         -- This file (extension architecture)
    │   ├── TASK-CASCADE.md         -- Task breakdown and status
    │   ├── UNICODE_POLICY.md       -- Unicode handling rules
    │   ├── PLANTUML-REFERENCE.md   -- Diagram syntax reference
    │   └── research/               -- Research documents (NEW v1.9.31.0)
    │       ├── INDEX.md            -- Research index with conclusions
    │       ├── 01-role-implied-skills.md  -- ESCO essential/optional → role-implied
    │       └── 02-kula-ai-ats.md          -- Kula.ai AI-Native ATS analysis
    │
    ├── src/                        -- Source code
    ├── tests/                      -- Test files
    ├── scripts/                    -- Build and utility scripts
    ├── worklog.md                  -- Extension-level worklog
    └── CHANGELOG.md                -- Extension-level changelog
```

Key cross-references:
- `AGENT_RULES.md` (repo root) → referenced by all scripts, setup.sh, audit.sh
- `docs/research/` → referenced by `role-implied-skills.js` and future skill modules
- `TASK-CASCADE.md` → tracks all implementation tasks
- `ARCHITECTURE.md` → this file, describes all modules and data flows
