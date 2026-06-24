# HH Copilot -- Task Cascade

**Document version:** 5.0.0
**Date:** 2026-06-25
**Status:** Master planning document
**Current extension version:** 1.9.65.0
**Cascade-state sync:** `cascade-state.json` (root) -- 33/35 tasks completed, 2 pending

---

## Changelog v4.0.0 -> v5.0.0

- Bumped current extension version from 1.9.31.0 (stale) to 1.9.65.0 (actual)
- Audited all 35 tasks against actual code state in `extension/src/`
- Marked 33 tasks as COMPLETED with `completedAt` timestamps from git log
- F5.2 (dark/light theme) remains PENDING: settings.js exists but theme toggle NOT implemented
- F6.4 (Chrome Web Store) remains PENDING: no implementation files yet
- Fixed `cascade-state.json` corruption: file was previously overwritten with
  anti-hallucination-guard module dump (RULE-001..017) instead of HH-Copilot tasks
- Fixed `scripts/sync-task-state.sh` jq query: `(.implementationFiles | length > 0)`
  threw "boolean has no length" on null fields; replaced with safe `(.implementationFiles // []) | type == "array" and length > 0`
- Added auditNote guard in sync-task-state.sh: tasks with auditNote matching
  "NOT implemented|manual|blocked" are skipped by auto-sync

---

## Changelog v3.0.0 -> v4.0.0

- Updated extension version from 1.5.2 to 1.7.2
- Phase 0 fully completed (F0.1-F0.9), all tasks marked as COMPLETED
- Added Phase 0.5 (additional work not included in the original cascade)
- Section 1.2 rewritten: describes current modular structure (42 JS files, all < 250 lines)
- Section 1.3 rewritten: removed entries about 6-tab wireframe, FAB CSS isolation, auth UX, modular structure, vacancy filtering, blacklist UI (all implemented)
- Section 2.1 updated: target structure = current structure

---

## 1. Introduction

### 1.1 What is HH Copilot

HH Copilot is a Chrome browser extension designed to automate job searching on the hh.ru platform. The extension injects itself into hh.ru pages and provides the user with a side panel containing tools for parsing vacancies, analyzing resume match, mass-applying to vacancies, and tracking negotiations with employers. The main advantage of the extension over server-based solutions is that it operates inside the user's real browser, which completely eliminates detection by hh.ru's anti-bot systems, does not require OAuth authorization, and does not send data to third-party servers. All data is stored locally in chrome.storage.local.

The extension is built on a Manifest V3 architecture and uses content scripts for interacting with hh.ru page DOMs, a service worker for background processing (alarm-based limit resets, message routing, badge updates), and a popup for settings. The user interface is implemented through a Shadow DOM panel that is isolated from hh.ru styles and does not break the site's layout. The extension contains a resume parser (12 fields: title, salary, address, skills with levels, work experience, education, additional info), a resume list parser, a basic vacancy card parser from the search page, and a 6-tab side panel per wireframe.

### 1.2 Current State

Currently the extension is at version 1.9.61.0. The monolithic content.js (1637 lines, v1.5.2) has been fully decomposed into a modular structure of 100+ JS files in the src/ directory, with all files not exceeding 250 lines (Rule 12 anti-monolith enforced via ESLint `max-file-lines-hard` rule). The build is performed via esbuild (IIFE format, entry point src/content/main.js). The version is synchronized across manifest.json, package.json, src/lib/version.js.

**Current modular structure (42 JS files):**

```
src/
  content/main.js (163 lines) -- boot sequence: init, auth gate, detectPageType, SPA observer
  lib/
    index.js (11 lines) -- barrel re-export
    selectors.js (126 lines) -- HH_SELECTORS, findElement, findAllElements
    anti-hallucination.js (115 lines) -- safeGetText, safeGetAttr, validateVacancyData,
      extractVacancyId, waitForElement, safeClick, safeInput, createLogger
    storage.js (90 lines) -- chrome.storage.local, DEFAULT_SETTINGS, DEFAULT_STATS
    timing.js (31 lines) -- gaussianRandom, randomDelay, simulateReading, simulateTyping
    rate-limiter.js (38 lines) -- rateLimiter with check/recordAction/adaptiveSlowdown/resetBurst
  parsers/
    index.js (8 lines) -- barrel re-export
    vacancy-list.js (65 lines) -- parseVacanciesFromPage
    vacancy-detail.js (11 lines) -- stub parseVacancyDetail (Phase 1)
    negotiations.js (11 lines) -- stub parseNegotiations (Phase 1)
    resume-detail.js (1 line) -- barrel re-export to resume-detail/
    resume-detail/
      index.js (79 lines) -- barrel, parseResume entry point
      parse-resume.js (79 lines) -- main resume parsing logic
      parse-company-card.js (59 lines) -- parsing the resume's owning company
      parse-resume-sections.js (179 lines) -- section parsing: skills, experience, additional info
      parse-resume-education.js (111 lines) -- education parsing
      diagnose.js (173 lines) -- diagnoseResumeDOM, data-qa dump
  ui/
    index.js (12 lines) -- barrel re-export
    fab.js (98 lines) -- FAB button with CSS !important isolation
    styles.js (240 lines) -- CSS template literals for Shadow DOM panel
    state.js (57 lines) -- panel state (activeTab, isOpen, etc.)
    auth.js (72 lines) -- passive authorization: checkAuth(), pollAuth(), authIndicator
    panel.js (6 lines) -- barrel re-export to panel/
    panel/
      index.js (127 lines) -- Shadow DOM creation, visibility toggling
      render.js (71 lines) -- tab content rendering
      helpers.js (64 lines) -- rendering utilities (escapeHtml, etc.)
      events.js (161 lines) -- panel event handlers, CustomEvent bridge
    html/
      index.js (5 lines) -- barrel re-export
      shell.js (113 lines) -- panel HTML shell with 6 tabs
      helpers.js (40 lines) -- HTML utilities
      icons.js (26 lines) -- SVG icons
      tabs/
        overview.js (170 lines) -- HTML for "Overview" tab
        resume.js (45 lines) -- HTML for "Resume" tab
        vacancies.js (67 lines) -- HTML for "Vacancies" tab
        negotiations.js (65 lines) -- HTML for "Negotiations" tab
        settings.js (90 lines) -- HTML for "Settings" tab
        stats.js (67 lines) -- HTML for "Statistics" tab
    tabs/
      overview.js (83 lines) -- renderer for "Overview" tab
      resumes.js (107 lines) -- renderer for "Resume" tab
      vacancies.js (74 lines) -- renderer for "Vacancies" tab with filtering
      negotiations.js (81 lines) -- renderer for "Negotiations" tab
      settings.js (59 lines) -- renderer for "Settings" tab
      stats.js (106 lines) -- renderer for "Statistics" tab
  engine/
    index.js (5 lines) -- barrel re-export (stub)
    auto-respond.js (50 lines) -- stub applyToVacancy/applyToAll (Phase 3)
  services/
    index.js (3 lines) -- barrel re-export (stub)
```

**Functionally working:**
- Build via esbuild: `npm run build` assembles content.js from 42 modules, `npm run watch` for development
- FAB button (fixed bottom-right) with CSS !important isolation from hh.ru styles, 3 states (gray/blue/red)
- 720px side panel with Shadow DOM isolation (mode: closed), 6 tabs per wireframe: Overview, Resume, Vacancies, Negotiations, Settings, Statistics
- Passive authorization: checkAuth() with DOM polling + cookie fallback, clickable authIndicator, username display
- Resume parsing (12 fields) with three-level fallback strategies, resume-detail decomposed into 5 files < 250 lines
- Vacancy parsing from search page (parseVacanciesFromPage)
- Client-side vacancy filtering (search, status, scoring range)
- Blacklist add/remove with toast logging
- MutationObserver for SPA navigation (1-second debounce)
- Persistent storage chrome.storage.local (7 keys)
- CustomEvent bridge: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume
- Version sync: v1.7.2 across all files (manifest.json, package.json, popup, html.js)
- Service worker (background/index.js): daily reset via chrome.alarms, message routing, badge
- Popup (index.html + popup.js): 4 tabs (statistics, settings, templates, logs)

### 1.3 What Does NOT Work (Requires Implementation)

List of functional blocks that are in stub state or completely absent:

- Detailed vacancy page parser (parseVacancyDetail) -- stub (11 lines, empty function, to be implemented in Phase 1)
- Skills parser from vacancy description -- absent (Phase 1)
- Negotiations parser (parseNegotiations) -- stub (11 lines, empty function, to be implemented in Phase 1)
- Match scoring system (matching engine) -- absent (engine/index.js -- 5-line stub, Phase 2)
- Skill gap analysis -- absent (Phase 2)
- Full apply process (auto-apply) -- stub in engine/auto-respond.js (50 lines, applyToVacancy/applyToAll do not implement the 5-step process, Phase 3)
- Mass apply (applyToAll) -- stub with minScore filtering (Phase 3)
- AI-generated cover letters -- absent (services/index.js -- 3-line stub, prompts in docs/reference-prompts.py, Phase 4)
- Automatic chat replies -- absent (Phase 4)
- Salary parser and experience parser -- separate modules not created (Phase 1)
- KPI dashboard with conversion funnel -- 6-tab wireframe panel exists, but Overview and Stats tabs contain demo data, real KPIs and funnel not connected (Phase 5)
- Adaptive slowdown with visualization -- rateLimiter.adaptiveSlowdown exists without UI (Phase 5)
- Dark theme -- absent (Phase 6)
- Detailed match breakdown on vacancy cards -- absent (Phase 6)
- Apply modal with 5-step progress -- absent (Phase 6)
- React-native value setter for simulateTyping -- not implemented (Phase 3)

### 1.4 Purpose of the Document

This document is a master plan for implementing all functional blocks of HH Copilot. The document defines a sequence of tasks grouped by development phases, indicating priorities, dependencies, acceptance criteria, and anti-hallucination checks for each task. The task cascade covers the full scope of work from completing parsing and the matching engine to preparing the extension for publication in the Chrome Web Store. Each task contains a comprehensive description of what needs to be done, which selectors and APIs to use, how to verify the implementation, and what hallucination risks exist for the specific block.

---

## 2. Architecture

### 2.1 Current Modular Structure

The architecture is fully modular. A build step based on esbuild assembles modules from src/ into a single IIFE bundle content.js (Manifest V3 does not support ES modules in content_scripts). The extension's root directory contains manifest.json, package.json with esbuild configuration (esbuild.config.mjs), and the src/ directory with source modules. The actual structure:

```
Extension root/
  manifest.json, package.json, esbuild.config.mjs
  content.js -- assembled bundle (generated by npm run build)
  background/index.js -- service worker
  popup/index.html, popup/popup.js -- popup interface
  src/ -- source modules (42 JS files)
    content/main.js -- entry point (boot sequence)
    lib/ -- libraries (selectors, anti-hallucination, storage, timing, rate-limiter)
    parsers/ -- parsers (vacancy-list, vacancy-detail, negotiations, resume-detail/)
    ui/ -- interface (fab, styles, state, auth, panel/, html/, tabs/)
    engine/ -- business logic (auto-respond -- stub)
    services/ -- services (stub)
```

The build script esbuild.config.mjs takes the entry point src/content/main.js and builds content.js in the extension root. All modules use ES import/export inside src/, esbuild resolves dependencies and assembles an IIFE bundle.

### 2.2 Data Flows

The main data flow in the extension starts from the DOM of hh.ru pages. The content script parses the DOM using selectors from lib/selectors.js, applies anti-hallucination wrappers from lib/anti-hallucination.js, and produces structured objects (vacancies, resumes, negotiations). These objects pass validation and enter the engine/matching.js module, where match scoring is calculated. Results are displayed in ui/panel.js through the corresponding tabs. When applying to a vacancy, the vacancy data and cover letter template are passed to engine/cover-letter.js, which can use AI generation through services/ai-service.js. The results of all actions are logged and saved to chrome.storage.local via lib/storage.js.

The service worker (background/index.js) operates independently of the content script and performs background tasks: daily statistics reset via chrome.alarms, message routing between popup and content scripts, and extension icon badge updates. The popup communicates with the content script via chrome.runtime.sendMessage, sending requests for statistics retrieval, settings updates, and log reading. The content script keeps current state (vacancy list, resume, settings, statistics) in memory and synchronizes it with chrome.storage.local. During SPA navigation within hh.ru, the MutationObserver detects DOM changes and restarts parsing for the relevant page.

Communication between UI modules is handled through the CustomEvent bridge (hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume), which links panel events to engine actions without a direct dependency.

### 2.3 Extension Components and Their Relationships

The extension consists of four main components: content script, service worker, popup, and chrome.storage.local. The content script is the primary working component that injects into all hh.ru pages and performs parsing, match scoring, and automatic application submission. The service worker provides background processing and inter-component communication. The popup provides an interface for configuring the extension and viewing statistics. The chrome.storage.local store is the single source of persistent data.

Within the content script, modules are organized by layers: the library layer (selectors, anti-hallucination, storage, timing, rate-limiter) is used by all other modules; the parser layer (vacancy-list, vacancy-detail, resume-list, resume-detail, negotiations) is responsible for extracting data from the DOM; the engine layer (auto-respond, -- matching, skill-gap, cover-letter not yet implemented) implements business logic; the UI layer (panel, html, tabs, fab, styles, state, auth) is responsible for displaying data and user interaction; the service layer (services/) provides integration with external AI services (stub). Each layer depends only on the layers below it, ensuring testability and predictable behavior.

---

## 3. Task Cascade

### Phase 0: Refactoring -- decomposing content.js (1636 lines) -- COMPLETED

The content.js file exceeded the allowable size of 250 lines per the anti-monolith rule. It was split into 42 modules and a build step on esbuild was configured. Manifest V3 content_scripts do not support ES modules (import/export), so a bundler is used. esbuild was chosen as the fastest and most minimal configuration option. **All Phase 0 tasks are completed.**

---

**F0.1 | Build environment setup (esbuild) -- COMPLETED**

Priority: P0
Dependencies: none
Complexity: S
Status: COMPLETED

Description: Create package.json in the extension root with dependencies: esbuild (devDependency). Create esbuild.config.mjs with configuration: entry point src/content/main.js, output file content.js (in root), IIFE format, bundle=true, minify=false (for debugging), sourcemap=true. Add scripts to package.json: "build" for building, "watch" for watch mode. Update manifest.json to reference the assembled content.js. Rename the current monolithic content.js to content.js.bak for backup. Create the src/ directory with subdirectories lib/, parsers/, engine/, ui/, services/, content/, background/. Create src/content/main.js as the entry point that imports and initializes all modules. Create src/lib/index.js, src/parsers/index.js, src/engine/index.js, src/ui/index.js as barrier files (re-export).

Implementation: package.json contains esbuild as a devDependency, esbuild.config.mjs is configured (IIFE, bundle, sourcemap), `npm run build` and `npm run watch` work. manifest.json references the assembled content.js.

---

**F0.2 | Extract lib/selectors.js module -- COMPLETED**

Priority: P0
Dependencies: F0.1
Complexity: S
Status: COMPLETED

Description: Extract the HH_SELECTORS object and helper functions getSelectors, findElement, findAllElements from content.js into a separate module src/lib/selectors.js. Export HH_SELECTORS as const, functions findElement, findAllElements, getSelectors as named exports.

Implementation: src/lib/selectors.js -- 126 lines. HH_SELECTORS with selector groups for resume. findElement and findAllElements with fallback chains. New selectors for vacancy and negotiations will be added in Phase 1 (F1.2, F1.4).

---

**F0.3 | Extract lib/anti-hallucination.js module -- COMPLETED**

Priority: P0
Dependencies: F0.1
Complexity: S
Status: COMPLETED

Description: Extract functions safeGetText, safeGetAttr, validateVacancyData, extractVacancyId, waitForElement, safeClick, safeInput, createLogger from content.js into src/lib/anti-hallucination.js. All functions return concrete types (string, null, boolean, object), never undefined.

Implementation: src/lib/anti-hallucination.js -- 115 lines. All 8 functions extracted and exported. safeQuerySelector, safeQuerySelectorAll, validateResumeData, validateNegotiationData will be added as needed in the corresponding phases.

---

**F0.4 | Extract lib/storage.js module -- COMPLETED**

Priority: P0
Dependencies: F0.1
Complexity: S
Status: COMPLETED

Description: Extract constants DEFAULT_SETTINGS, DEFAULT_STATS and chrome.storage.local functions into src/lib/storage.js.

Implementation: src/lib/storage.js -- 90 lines. DEFAULT_SETTINGS, DEFAULT_STATS, functions getAllSettings, getStats, incrementApplied, isAlreadyApplied, markAsApplied, checkDailyReset. Extended functions (vacancyCache, resumeData, blacklist, eventLog) will be added in Phase 3-5.

---

**F0.5 | Extract lib/timing.js module -- COMPLETED**

Priority: P0
Dependencies: F0.1
Complexity: S
Status: COMPLETED

Description: Extract functions gaussianRandom, randomDelay, simulateReading, simulateTyping from content.js into src/lib/timing.js.

Implementation: src/lib/timing.js -- 31 lines. gaussianRandom, randomDelay, simulateReading, simulateTyping. simulateLongPause, simulateScrolling, simulateMouseMovement will be added in Phase 3.

---

**F0.6 | Extract lib/rate-limiter.js module -- COMPLETED**

Priority: P0
Dependencies: F0.1, F0.4
Complexity: S
Status: COMPLETED

Description: Extract the rateLimiter object from content.js into src/lib/rate-limiter.js. Rate limiter with adaptive slowdown.

Implementation: src/lib/rate-limiter.js -- 38 lines. rateLimiter object with check, recordAction, adaptiveSlowdown, resetBurst. Cooldown timers, getProgress(), exportState() will be added in Phase 3.

---

**F0.7 | Extract parser modules -- COMPLETED**

Priority: P0
Dependencies: F0.1, F0.2, F0.3
Complexity: M
Status: COMPLETED

Description: Split the parsing section into separate modules.

Implementation:
- src/parsers/vacancy-list.js -- 65 lines, parseVacanciesFromPage()
- src/parsers/vacancy-detail.js -- 11 lines, stub parseVacancyDetail() (Phase 1)
- src/parsers/negotiations.js -- 11 lines, stub parseNegotiations() (Phase 1)
- src/parsers/resume-detail.js -- 1 line, barrel re-export
- src/parsers/resume-detail/index.js -- 79 lines, barrel, parseResume entry point
- src/parsers/resume-detail/parse-resume.js -- 79 lines, main logic
- src/parsers/resume-detail/parse-company-card.js -- 59 lines
- src/parsers/resume-detail/parse-resume-sections.js -- 179 lines
- src/parsers/resume-detail/parse-resume-education.js -- 111 lines
- src/parsers/resume-detail/diagnose.js -- 173 lines, diagnoseResumeDOM

---

**F0.8 | Extract UI module (panel + tabs) -- COMPLETED**

Priority: P0
Dependencies: F0.1, F0.2, F0.3, F0.4, F0.7
Complexity: L
Status: COMPLETED

Description: Split the UI section (~400 lines) into modules with 6 tabs per wireframe.

Implementation: Fully modular UI system:
- src/ui/fab.js (98 lines) -- FAB button with !important CSS isolation
- src/ui/styles.js (240 lines) -- CSS template literals for Shadow DOM
- src/ui/state.js (57 lines) -- panel state (activeTab, isOpen)
- src/ui/auth.js (72 lines) -- passive authorization (checkAuth, pollAuth, authIndicator, username)
- src/ui/panel/index.js (127 lines) -- Shadow DOM container, visibility toggling
- src/ui/panel/render.js (71 lines) -- tab content rendering
- src/ui/panel/helpers.js (64 lines) -- rendering utilities (escapeHtml)
- src/ui/panel/events.js (161 lines) -- event handlers, CustomEvent bridge
- src/ui/html/shell.js (113 lines) -- panel HTML shell with 6 tabs
- src/ui/html/helpers.js (40 lines) -- HTML utilities
- src/ui/html/icons.js (26 lines) -- SVG icons
- src/ui/html/tabs/ (6 files) -- HTML generators for each tab
- src/ui/tabs/ (6 files) -- renderers for each tab (overview, resumes, vacancies, negotiations, settings, stats)

---

**F0.9 | Extract main.js module (boot sequence) -- COMPLETED**

Priority: P0
Dependencies: F0.1 - F0.8
Complexity: M
Status: COMPLETED

Description: Create src/content/main.js as the entry point that imports all modules and performs initialization.

Implementation: src/content/main.js -- 163 lines. Boot sequence: (1) Logger initialization, (2) Auth gate via checkAuth(), (3) detectPageType() by URL patterns, (4) Launch the appropriate parser, (5) Create FAB and panel, (6) SPA MutationObserver (1-second debounce).

---

### Phase 0.5: Additional Implemented Work (not included in the original cascade)

During the Phase 0 refactoring, additional work was completed that was not planned in the original task cascade.

---

**F0.5.1 | FAB CSS isolation with !important -- COMPLETED**

Implementation: src/ui/fab.js uses `style.setProperty(prop, value, 'important')` for all CSS properties of the FAB button. This prevents hh.ru styles from overriding them (which may have high specificity through Magritte CSS). The FAB renders correctly on all hh.ru pages, including pages with aggressive global styles.

---

**F0.5.2 | Auth UX -- passive authorization -- COMPLETED**

Implementation: src/ui/auth.js (72 lines). Passive authorization via checkAuth() -- DOM element polling (user profile section) every 2 seconds with cookie fallback. authIndicator -- clickable element in the panel displaying authorization status. When authorized, the user's username is extracted and displayed. The auth gate correctly blocks panel functionality for unauthorized users.

---

**F0.5.3 | 6-tab wireframe panel -- COMPLETED**

Implementation: The panel contains 6 tabs per wireframe: Overview, Resume, Vacancies, Negotiations, Settings, Stats. Each tab has an HTML generator (ui/html/tabs/) and a renderer (ui/tabs/). Tabs are switched through the tab bar in shell.js. All tabs contain demo data for layout visualization. Real data is connected for Vacancies (parsing) and Resumes (parsing).

---

**F0.5.4 | Client-side vacancy filtering -- COMPLETED**

Implementation: src/ui/tabs/vacancies.js (74 lines) and src/ui/panel/events.js (161 lines) implement client-side filtering of the vacancy list. Filters: text search by title/company, status filter (new/applied/blacklisted), match score range filter. Filtering occurs in real time when filters change.

---

**F0.5.5 | Blacklist management UI -- COMPLETED**

Implementation: Ability to add/remove companies to the blacklist through the panel UI. Blacklisted companies' vacancies are hidden from the list. Actions are logged via toast notifications. Data is saved in chrome.storage.local (key blacklistedCompanies).

---

**F0.5.6 | Version sync mechanism -- COMPLETED**

Implementation: Version v1.7.2 is synchronized across manifest.json, package.json, popup/index.html (footer), and src/ui/html/shell.js (panel footer). The single source of truth is manifest.json; other files are updated when the version changes.

---

**F0.5.7 | CustomEvent bridge system -- COMPLETED**

Implementation: src/ui/panel/events.js defines a CustomEvent bridge for communication between UI and business logic. Events: hh-ar-apply (apply to vacancy), hh-ar-apply-all (mass apply), hh-ar-refresh (refresh data), hh-ar-toggle-status (toggle vacancy status), hh-ar-load-resume (load resume data). This links panel events to engine actions without a direct UI-to-engine dependency.

---

### Phase 1: Core Parsing Enhancement -- vacancy details, negotiations parsing

---

**F1.1 | Vacancy detail parser (parseVacancyDetail)**

Priority: P0
Dependencies: F0.2, F0.3
Complexity: M

Description: Implement the parseVacancyDetail() function in src/parsers/vacancy-detail.js to extract full data from the vacancy page (/vacancy/{id}). The function should extract: title (data-qa="vacancy-title"), company name (data-qa="vacancy-company-name"), salary (data-qa="vacancy-compensation"), location (data-qa="vacancy-address"), experience (data-qa="vacancy-experience"), employment type (data-qa="vacancy-employment-mode"), schedule (data-qa="vacancy-schedule"), vacancy description (data-qa="vacancy-description"), skills from description (data-qa="skills-element" or .bloko-tag__text within description), key skills (data-qa="vacancy-sidebar-skills"), working conditions, company information. Fallback chains are needed for each field. Salary parsing should extract numeric values and currency for further use in the matching engine. Experience parsing should extract minimum and maximum experience in years (e.g., "3-6 years" -> {min: 3, max: 6}).

Acceptance criteria: On a real hh.ru vacancy page, parseVacancyDetail() extracts all fields. Title >= 3 characters. Salary is parsed into numeric format (parseInt). Experience is parsed into {min, max} object. Skills are extracted as an array of strings. Description contains the full vacancy text.

Anti-hallucination: Verify that parseInt("Not specified") does not return NaN (should fallback to 0). Verify that parsing experience "1-3 years" and "3-6 years" works correctly for different word forms. Ensure skills contain no duplicates. Verify that the function does not crash on vacancies without salary, without experience, without skills.

---

**F1.2 | Add selectors for the vacancy page**

Priority: P0
Dependencies: F0.2
Complexity: S

Description: Diagnose the DOM of the vacancy page (/vacancy/{id}) similarly to diagnoseResumeDOM. Add selector groups to HH_SELECTORS: vacancyDescriptionContent, vacancyKeySkills, vacancyEmploymentType, vacancyScheduleType, vacancyConditions, vacancyAboutCompany, vacancySimilarVacancies. For each field, create a fallback chain of 2-3 selectors. Create a diagnostic function diagnoseVacancyDOM() analogous to diagnoseResumeDOM() for collecting data-qa attributes and verifying selector correctness.

Acceptance criteria: Each selector group contains an array with 2+ elements. diagnoseVacancyDOM() outputs a data-qa dump to the console. All selectors are tested on a real hh.ru page (DevTools Console).

Anti-hallucination: Run diagnoseVacancyDOM() on 5 different vacancy pages and verify selectors are stable. Verify there are no selectors with hashed Magritte classes (they don't work). All selectors use data-qa or stable Bloko BEM classes.

---

**F1.3 | Negotiations parser (parseNegotiations)**

Priority: P1
Dependencies: F0.2, F0.3
Complexity: L

Description: Implement the parseNegotiations() function in src/parsers/negotiations.js for the /applicant/negotiations page. The function should extract a list of chats with employers. For each chat: company name, position, last message, last message date, status (invitation/interview/dialog/waiting/rejection), unread message count, chat URL. Parsing selectors: chat containers (data-qa="negotiations-item" or fallback), unread badge (data-qa="unread-badge" or .bloko-badge), status (by text content or data-qa). The chat list may be paginated, so it is necessary to parse the current page and provide information for navigating to the next.

Acceptance criteria: On the hh.ru negotiations page, parseNegotiations() extracts a list of chats. Each chat contains company, position, lastMessage, date, status, unread count. Status is one of the predefined values. Unread chats are correctly identified.

Anti-hallucination: Verify that the parser works on an empty negotiations list (no chats). Verify that status is correctly recognized for different states (interview invitation, awaiting response, rejection). Ensure that unread count is a number, not a string.

---

**F1.4 | Add selectors for negotiations**

Priority: P1
Dependencies: F0.2
Complexity: M

Description: Diagnose the DOM of the negotiations page (/applicant/negotiations). Add groups to HH_SELECTORS: negotiationsChatItem, negotiationsChatCompany, negotiationsChatPosition, negotiationsChatLastMessage, negotiationsChatDate, negotiationsChatUnreadBadge, negotiationsChatStatus, negotiationsChatLink. Verify selector stability across different accounts (if possible) and with different numbers of chats. Create a diagnostic function diagnoseNegotiationsDOM().

Acceptance criteria: Selectors find elements on a real negotiations page. diagnoseNegotiationsDOM() outputs a structured dump. Fallback chains work when primary data-qa attributes are absent.

Anti-hallucination: Verify that selectors do not depend on specific Magritte CSS classes (hashed). Ensure data-qa attributes are stable between sessions. Verify that the parser correctly handles long chat lists (50+).

---

**F1.5 | Improve salary parsing**

Priority: P1
Dependencies: F0.3, F1.1
Complexity: S

Description: Create a module src/lib/salary-parser.js with the function parseSalaryString(str) to convert a salary string to numeric format. The function should handle formats: "from 200,000 rub." -> {from: 200000, to: null, currency: 'RUR'}, "up to 300,000 rub." -> {from: null, to: 300000, currency: 'RUR'}, "200,000 - 300,000 rub." -> {from: 200000, to: 300000, currency: 'RUR'}, "Not specified" -> {from: null, to: null, currency: null}, "from $5000" -> {from: 5000, to: null, currency: 'USD'}. Use regex to extract numbers (with space separators) and currency. Function getSalaryMidpoint(salary) returns the midpoint for use in the matching engine. Function isSalaryAcceptable(vacancySalary, resumeSalary, tolerance) checks the match with an acceptable deviation (default 30%).

Acceptance criteria: parseSalaryString("from 250,000 rub.") returns {from: 250000, to: null, currency: 'RUR'}. parseSalaryString("200,000 - 300,000 rub.") returns {from: 200000, to: 300000, currency: 'RUR'}. getSalaryMidpoint({from: 200000, to: 300000}) returns 250000. isSalaryAcceptable with tolerance=0.3 correctly compares salaries.

Anti-hallucination: Verify that parseInt works with space separators ("250 000" -> 250000). Ensure that a null salary does not cause errors in calculations (all functions return null or 0 instead of NaN). Verify that currencies USD, EUR, RUR are correctly recognized.

---

**F1.6 | Improve experience parsing**

Priority: P1
Dependencies: F0.3, F1.1
Complexity: S

Description: Create a function parseExperienceString(str) in src/lib/experience-parser.js to convert an experience string to a numeric range. The function should handle: "3-6 years" -> {min: 3, max: 6}, "from 3 years" -> {min: 3, max: null}, "1 year" -> {min: 1, max: 1}, "no experience" -> {min: 0, max: 0}. Use regex to extract numbers. Function getExperienceYears(resume) calculates total experience from the resume's experience entries array (sum of periods in years). Function isExperienceMatch(vacancyExp, resumeYears, penalty) checks the match with an overqualification penalty (default penalty: -0.5 when exceeding by more than 2x).

Acceptance criteria: parseExperienceString("3-6 years") returns {min: 3, max: 6}. parseExperienceString("no experience") returns {min: 0, max: 0}. isExperienceMatch({min: 3, max: 6}, 5) returns true. isExperienceMatch({min: 1, max: 3}, 10) returns a reduced score.

Anti-hallucination: Verify all word forms ("year", "years"). Ensure that parseExperienceString(null) returns {min: 0, max: 0}. Verify that experience calculation from resume correctly handles missing periods (duration undefined).

---

### Phase 2: Matching Engine -- scoring, skill gap, Jaccard similarity

---

**F2.1 | Matching Engine -- weighted scoring**

Priority: P0
Dependencies: F1.1, F1.5, F1.6
Complexity: L

Description: Implement src/engine/matching.js with the function calculateMatchScore(vacancy, resume) returning an object {total: number, breakdown: {skills: number, salary: number, experience: number, position: number, location: number}}. Weights: skills 30%, salary 25%, experience 20%, position 15%, location 10%. Skills: Jaccard similarity with alias matching (k8s=kubernetes, pg=postgresql, js=javascript, tf=terraform, aws=amazon web services, node=node.js). Create an alias dictionary as a Map. Salary: overlap-based comparison with 30% tolerance. Experience: range matching with overqualification penalty. Position: word overlap with keyword boosting (developer, senior, lead, frontend, backend). Location: exact match or substring matching for major cities. Function scoreClass(score) returns a CSS class for color coding: 'score-high' (>=70), 'score-medium' (40-69), 'score-low' (<40).

Acceptance criteria: calculateMatchScore returns an object with total in [0, 100]. breakdown.skills is calculated via Jaccard. breakdown.salary accounts for tolerance. breakdown.experience accounts for overqualification penalty. A perfect match (all skills match, salary matches, experience matches) yields total >= 90.

Anti-hallucination: Verify that Jaccard similarity for empty sets returns 0 (not NaN). Ensure that salary comparison with null values does not crash. Verify that aliases do not create false matches (e.g., "go" should not match "golang" without an explicit alias). Verify that total is always rounded to an integer.

---

**F2.2 | Skill Gap Analysis**

Priority: P1
Dependencies: F2.1
Complexity: M

Description: Implement the function findSkillGaps(resume, vacancies) in src/engine/skill-gap.js. The function analyzes all vacancies (in cache or passed explicitly), filters those where match score >= 70%, extracts unique skills from these vacancies, compares with resume skills, and returns the top 5 missing skills with demand percentage. Result: [{skill: "Kubernetes", demand: 85, presentInResume: false}, {skill: "Docker Compose", demand: 72, presentInResume: false}, ...]. demand = percentage of high-score vacancies where this skill is listed. For correct operation, skills must be normalized (lowercase, trim) and the alias dictionary from F2.1 must be used.

Acceptance criteria: Given 20 vacancies with match >= 70%, the function returns an array of up to 5 elements. Each element contains skill (string), demand (0-100), presentInResume (boolean). Result is sorted by demand in descending order. With no vacancies, returns [].

Anti-hallucination: Verify that the function works with an empty vacancy array. Ensure that demand is correctly calculated as a percentage, not a count. Verify that resume skills do not appear in the result (presentInResume=true is filtered out). Ensure that skill normalization does not merge different skills (React != React Native without an explicit rule).

---

**F2.3 | Integrate matching engine into vacancy parser**

Priority: P0
Dependencies: F2.1, F0.7
Complexity: M

Description: Integrate calculateMatchScore into parseVacanciesFromPage. After parsing each vacancy from the list, if resume data exists in storage (getResumeData()), calculate the match score and save it in vacancy.matchScore. Also calculate breakdown for display in the UI. Update the vacancy object structure: add matchScore (number), matchBreakdown (object with 5 metrics). In the "Vacancies" tab UI, display the match score next to each vacancy. Color coding: green (>= 70), yellow (40-69), red (< 40).

Acceptance criteria: On the vacancy search page, each card in the panel shows a match score. Score matches the calculated value (verify manually). Color correctly reflects the match level. When no resume data is available, match score = null and displays as "--".

Anti-hallucination: Verify that scoring for 20 vacancies does not block the UI (async calculation or batch). Ensure that null/undefined in resume data does not crash the matching engine. Verify that recalculating occurs correctly when resume data is updated.

---

**F2.4 | Expand skill alias dictionary**

Priority: P2
Dependencies: F2.1
Complexity: M

Description: Expand the alias dictionary for Jaccard similarity. Current aliases: k8s=kubernetes, pg=postgresql, js=javascript. Add: tf=terraform, aws=amazon web services, node=node.js, reactjs=react, golang=go, python3=python, ts=typescript, css3=css, html5=html, mongo=mongodb, mysql2=mysql, rdbms=sql, ci/cd=devops, agile=scrum, kanban=scrum, oop=object oriented. Aliases should be bidirectional (reverse mapping). Create a separate file src/engine/skill-aliases.js with a Map. Add support for user-defined aliases through settings.

Acceptance criteria: The dictionary contains 30+ alias pairs. calculateMatchScore with aliases gives a higher score than without them for vacancies with abbreviations. User-defined aliases are saved in chrome.storage and applied during calculation.

Anti-hallucination: Verify that aliases do not create cycles (a=b, b=a - correct, but a=b, b=c, c=a - check). Ensure that short aliases (2 characters) do not create false matches. Verify that case does not affect matching (lowercase normalization).

---

### Phase 3: Auto-Apply -- manual, semi-automatic, fully automatic modes

---

**F3.1 | Manual apply -- 5-step modal**

Priority: P0
Dependencies: F1.1, F0.3, F0.5, F0.6
Complexity: L

Description: Implement the full vacancy application process in src/engine/auto-respond.js. The process consists of 5 steps displayed in a modal window within the Shadow DOM panel. Step 1 -- Pre-flight check: check rate limiter (daily limit, hourly limit, minimum interval, burst), verify the vacancy has not been applied to before, verify the apply button exists. Step 2 -- Navigation: save pendingApply in chrome.storage ({vacancyId, vacancyUrl, timestamp}), window.location.href = vacancyUrl. Step 3 -- Wait and find: waitForElement for the apply button on the vacancy page (selectors: replyButton), verify button text (not "already applied"). Step 4 -- Handle alerts: check for presence of relocationWarning, testTaskRequired, indirectEmployerAlert. For each alert -- the appropriate handler (confirm relocation, warn about test task). Step 5 -- Fill and submit: click the apply button, waitForElement popup, fill in the cover letter (if template is set), click submit, verify (popup disappeared or button text changed). Each step is logged and displays progress in the modal.

Acceptance criteria: Clicking the "Apply" button in the panel opens a modal. The modal shows 5 steps with current progress. Pre-flight check blocks when limits are exceeded. Navigation correctly goes to the vacancy page. The apply button is found and clicked. Alerts are handled. The cover letter is filled in. The application is submitted (verified by button change).

Anti-hallucination: Verify that pendingApply has a timestamp and is ignored if older than 2 minutes (stale state). Ensure that waitForElement with timeout does not hang forever. Verify that safeClick does not click invisible buttons. Ensure that simulateTyping uses a React-safe native setter. Verify that on error at any step, the process correctly aborts and is logged.

---

**F3.2 | Handle CAPTCHA and 429 errors**

Priority: P0
Dependencies: F3.1, F0.6
Complexity: M

Description: Implement detection and handling of CAPTCHA and HTTP 429 (rate limit) during the application process. CAPTCHA detection: check for elements [data-qa="captcha"], img[src*="captcha"], .g-recaptcha on the page after clicking the apply button. When CAPTCHA is detected: stop the process, log with error level, show a notification to the user in the modal ("CAPTCHA detected, solve manually"), increase adaptiveFactor in the rate limiter. 429 detection: monitor network requests (via performance API or response headers), when 429 is detected: stop, log, show notification, increase adaptiveFactor, set a cooldown timer. After CAPTCHA/429, the user must continue manually or wait for cooldown.

Acceptance criteria: CAPTCHA is detected and stops the process. The modal shows a message for the user. Rate limiter adaptiveFactor is increased. After manually solving the CAPTCHA, the user can continue. 429 error is detected and handled similarly.

Anti-hallucination: Ensure that CAPTCHA detection does not produce false positives on normal pages. Verify that adaptiveFactor does not grow infinitely (max 5.0). Ensure that the cooldown timer works correctly and does not block forever. Verify that after stopping the process there are no "dangling" promises.

---

**F3.3 | Semi-automatic mode (semi-auto)**

Priority: P1
Dependencies: F3.1
Complexity: M

Description: Implement semi-auto mode, in which the extension automatically goes through pre-flight check, navigation, button search, and popup waiting, but stops before filling and submitting, showing a confirm dialog to the user. The confirm dialog displays: vacancy title, company, match score, filled-in cover letter (for preview), "Send" and "Cancel" buttons. The user can edit the letter before sending. If the user clicks "Send", the process continues from step 5 (fill and submit). The mode is set in settings (settings.mode = 'semi-auto').

Acceptance criteria: In semi-auto mode, the application process stops before sending. The confirm dialog shows correct data. The user can edit the letter. Clicking "Send" continues the process. Clicking "Cancel" cancels the process without sending.

Anti-hallucination: Verify that the confirm dialog renders correctly inside the Shadow DOM. Ensure that the letter is not sent without explicit confirmation. Verify that closing the modal also closes the confirm dialog. Ensure that letter editing uses React-safe input.

---

**F3.4 | Fully automatic mode (auto)**

Priority: P2
Dependencies: F3.1, F3.2, F3.3
Complexity: L

Description: Implement fully auto mode, in which the extension automatically applies to all vacancies with match score >= minMatchScore. The applyToAll() function takes the vacancy list from cache, filters by conditions: status='new', hasReply=true, matchScore >= minMatchScore, sorts by matchScore (highest first). For each vacancy: rate limiter check -> apply -> wait interval -> next. Batch timing: every 5 applications -- a long pause simulateLongPause (25-40 sec). Interrupt on: daily limit, hourly limit, CAPTCHA, 429 error, 3 consecutive errors. The UI shows progress: "Application 5/20" with a progress bar. The vacancy queue is stored in chrome.storage for persistence between sessions. Auto mode is activated by the "Auto-apply" button on the vacancies tab or via settings (settings.mode = 'auto').

Acceptance criteria: The "Auto-apply" button starts mass submission. Each vacancy goes through the full 5-step process. Rate limiter correctly limits the speed. Batch pauses work every 5 applications. The process stops when limits or CAPTCHA are reached. Progress bar correctly reflects progress. The queue is persistent (saved to storage).

Anti-hallucination: Verify that applyToAll does not create an infinite loop on a single vacancy error (try/catch + continue). Ensure that batch pause actually works (verify timing through logs). Verify that the queue correctly restores after a page reload. Ensure that simultaneous applies are not created (mutex/lock). Verify that the process can be stopped with a "Stop" button.

---

**F3.5 | Typing simulation for cover letter**

Priority: P1
Dependencies: F0.5, F3.1
Complexity: S

Description: Improve simulateTyping in lib/timing.js. The current implementation uses el.value = el.value + char, which is not React-safe. Replace with React-native value setter (Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set). Add settings: typing speed (30-120ms per character, configurable), speed variation (random acceleration/deceleration for naturalness), pauses between words (200-400ms), pauses between sentences (500-800ms), random typos and corrections (optional, configurable). Add a "Typing simulation" toggle in settings. When the toggle is off -- insert text instantly via native setter without character-by-character typing.

Acceptance criteria: simulateTyping fills the textarea character by character. React state updates correctly (text is submitted on submit). Speed is configurable through settings. With toggle off, text is inserted instantly.

Anti-hallucination: Verify that the native setter works in React 18 (test on an hh.ru vacancy page). Ensure that dispatchEvent('input') triggers a React re-render. Verify that the textarea does not lose focus during typing. Ensure that instant insertion (toggle off) does not trigger a ValidationError from hh.ru.

---

**F3.6 | Company blacklist -- extended UI**

Priority: P2
Dependencies: F0.4, F3.4
Complexity: M

Description: Extend the UI for managing the company blacklist. In the "Settings" tab, add a "Blacklist" section with: a list of companies in the blacklist (with a "Remove" button for each), an input field for adding a new company, an "Import from vacancies" button (adds companies from the current vacancy list). In the "Vacancies" tab, add a "Add to blacklist" button on each vacancy card. Blacklisted companies' vacancies are hidden from the list (if the hideBlacklist toggle is enabled). Data is stored in chrome.storage.local under the key blacklistedCompanies as an array of strings.

Note: Basic blacklist add/remove with toast logging is already implemented (F0.5.5). This task extends it with full UI in settings and import from vacancies.

Acceptance criteria: The "Add to blacklist" button on a vacancy card adds the company. The section in settings shows the company list. The "Remove" button removes the company from the list. The hideBlacklist toggle hides blacklisted vacancies. State is persistent (saved between sessions).

Anti-hallucination: Verify that duplicates are not added (includes check before push). Ensure that removing a company correctly updates the vacancy UI. Verify that an empty blacklist does not cause rendering errors. Ensure that company name comparison is case-insensitive.

---

### Phase 4: AI Integration -- cover letters, chat replies

---

**F4.1 | Integrate z-ai-web-dev-sdk for cover letter generation**

Priority: P1
Dependencies: F3.1
Complexity: L

Description: Implement the src/services/ai-service.js module for generating cover letters using z-ai-web-dev-sdk (chat completions API). The function generateCoverLetter(vacancy, resume, tone, template) forms a prompt based on vacancy and resume data, sends a request to the AI API, and returns the letter text. The prompt should include: a system prompt with instructions to write a cover letter in Russian, vacancy data (title, company, skills, description), resume data (title, skills, experience summary), letter tone (formal/confident/friendly), a template with variables {position}, {company}, {skills}, {experience}. Template variables are replaced with actual data. If template is empty -- AI generates the letter from scratch. If template is provided -- AI adapts it for the specific vacancy. Settings: API key is saved in chrome.storage.local, "AI generation" toggle in settings.

Acceptance criteria: generateCoverLetter returns a string with the letter text. The letter is in Russian. The letter mentions the company and position. The tone matches the setting. When no API key is available, the function returns a fallback (template with variable substitution). On API error, the function does not crash (returns fallback).

Anti-hallucination: Verify that the AI API call does not block the UI (async). Ensure that on API timeout (30 sec) the function returns a fallback. Verify that the prompt does not contain personal data that should not be sent to the server. Ensure that the fallback letter correctly substitutes variables {position}, {company}.

---

**F4.2 | AI replies in negotiations**

Priority: P2
Dependencies: F1.3, F4.1
Complexity: L

Description: Implement the function generateChatReply(message, context, resume) in src/services/ai-service.js for generating replies in negotiation chats. The function accepts: the latest message from the employer, context (correspondence history, position, company), resume data. The prompt is formed with context and instructions to reply professionally in Russian. Replies should be concise (up to 200 characters for standard questions, up to 500 for detailed ones). In the chat UI ("Negotiations" tab), add an "AI reply" button next to the message input field. On click: generate a reply, show it in the textarea for preview, the user can edit before sending. Typical scenarios: interview invitation (confirmation), salary expectations question, availability question, portfolio request.

Acceptance criteria: The "AI reply" button generates reply text. The reply matches the context (not generic). The reply is in Russian. The user can edit before sending. When no API key is available, the button is disabled.

Anti-hallucination: Verify that the AI does not generate replies with false data (salary, experience, skills not in the resume). Ensure that the prompt does not contain the full correspondence history if it is long (token limit). Verify that the "AI reply" button does not spam the API on rapid clicks (debounce).

---

**F4.3 | API key and quota management**

Priority: P1
Dependencies: F4.1
Complexity: S

Description: Implement API key management in settings. Add to popup/settings: API key input field (type=password), "Verify" button (test request to API), display of remaining request count (if API provides limits), "Reset key" button. API key is stored in chrome.storage.local, encrypted via chrome.storage (not plain text). Add a daily AI request limit (default 50) to prevent overspending. The AI request counter is saved in stats.aiRequestsToday. When the limit is exceeded -- fallback to template-based letter.

Acceptance criteria: API key is saved and read correctly. The "Verify" button sends a test request and shows the result. The daily AI request limit works correctly. When the limit is exceeded, fallback is used.

Anti-hallucination: Ensure that the API key is not displayed in logs (masking: "***"). Verify that an invalid API key is handled correctly (error, not crash). Ensure that the request limit resets when the day changes.

---

### Phase 5: Analytics and UX -- KPI, funnel, limits, adaptive slowdown

---

**F5.1 | "Overview" tab -- KPI dashboard**

Priority: P1
Dependencies: F0.4, F0.8
Complexity: L

Description: Implement the "Overview" tab in src/ui/tabs/overview.js. Content: (1) Authorization status -- indicator (green "Authorized" or red "Not authorized") with detection via findElement('logged_in_indicator'). (2) KPI cards 2x2: "Applied today" (stats.appliedToday), "Invitations" (stats.interviewInvites), "Errors" (stats.errorsToday), "Total" (stats.totalApplied). (3) Daily limit progress bar: {appliedToday}/{dailyLimit} with percentage fill and countdown to the next available application (nextAvailableAt - Date.now()). (4) Hourly limit progress bar: similar to daily. (5) Adaptive slowdown indicator: current adaptiveFactor with visualization (normal = green, slowdown = yellow, heavy slowdown = red). (6) Auto-apply status: current mode (manual/semi-auto/auto), start/pause button, filter (new vacancies + score >= minMatchScore), queue size. (7) Recent activity log -- last 10 events from chrome.storage logs.

Note: The wireframe for the "Overview" tab already exists (ui/html/tabs/overview.js -- 170 lines HTML, ui/tabs/overview.js -- 83 lines renderer). This task connects real data instead of demo.

Acceptance criteria: The "Overview" tab displays all 7 blocks. KPI cards show current data. Progress bars fill correctly. Countdown updates every second. Auto-apply status shows the correct mode. Activity log updates on new events.

Anti-hallucination: Verify that all numeric values are valid (Number.isFinite). Ensure that countdown does not show negative values. Verify that progress bars do not exceed 100%. Ensure that the activity log does not show undefined or null entries.

---

**F5.2 | "Statistics" tab -- stats 2x2 + funnel + event log**

Priority: P1
Dependencies: F0.4, F0.8
Complexity: L

Description: Implement the "Statistics" tab (formerly "Logs") in src/ui/tabs/stats.js. Content: (1) Stats 2x2: same KPI cards as in Overview for quick access. (2) Daily limit progress bar. (3) Conversion funnel: Views -> Applications -> Invitations -> Interviews -> Offers. Each stage shows count and conversion from the previous stage (percentage). Funnel data: viewsToday (counted from vacancy cache), appliedToday, interviewInvites, interviewsScheduled (new field in stats), offersReceived (new field). (4) Event log: list of events with color coding by level (Info = gray, Warn = yellow, Error = red), timestamp, module, action. Filter by level. Pagination (50 records per page with "Load more" button). "Export logs" button (JSON format).

Note: The wireframe for the "Statistics" tab already exists (ui/html/tabs/stats.js -- 67 lines HTML, ui/tabs/stats.js -- 106 lines renderer). This task connects real data instead of demo.

Acceptance criteria: The "Statistics" tab displays all 4 blocks. The funnel shows correct data. Conversions are calculated correctly (percentage 0-100). Event log filters by level. Pagination works. Log export downloads a JSON file.

Anti-hallucination: Verify that the funnel does not show NaN percentages (when dividing by 0). Ensure that the event log is correctly sorted by timestamp (newest first). Verify that JSON export is valid (JSON.parse does not throw an exception). Ensure that very long log messages do not break the layout.

---

**F5.3 | Extended statistics -- tracking views, invitations, interviews**

Priority: P2
Dependencies: F0.4, F5.2
Complexity: M

Description: Extend the statistics system. Add tracking: viewsToday -- number of unique vacancies viewed today (counted during parseVacanciesFromPage), interviewInvites -- number of interview invitations (counted during parseNegotiations by invitation status), interviewsScheduled -- number of scheduled interviews (from negotiations), offersReceived -- number of offers (from negotiations). Add dailyStats -- array of daily records for trend building: [{date: '2026-06-09', applied: 15, views: 80, invites: 3}, ...]. Save the last 30 days. Add conversion rates: responseRate = appliedToday / viewsToday, inviteRate = interviewInvites / appliedToday. Display rates in KPI cards.

Acceptance criteria: dailyStats contains records for the last 30 days. viewsToday is correctly counted. interviewInvites updates when parsing negotiations. Conversion rates are calculated and displayed.

Anti-hallucination: Verify that dailyStats does not grow infinitely (limit 30 days, delete old). Ensure that conversion rates do not divide by zero (viewsToday = 0 -> responseRate = 0). Verify that negotiation parsing correctly identifies invitations.

---

**F5.4 | Adaptive slowdown with visualization**

Priority: P2
Dependencies: F0.6, F5.1
Complexity: M

Description: Extend the rate limiter with UI visualization. Add an "Adaptive slowdown" block to the Overview tab: current adaptiveFactor (number), visual indicator (bar from 1.0 to 5.0), adaptiveFactor change history (last 10 entries with timestamp and reason). Slowdown reasons: 429 (red), CAPTCHA (red), slow response (yellow), manual (gray, when manually changed). Add a "Reset slowdown" button to manually reset adaptiveFactor to 1.0. In the auto-apply process, show the current interval between applications (accounting for adaptiveFactor).

Acceptance criteria: The "Adaptive slowdown" block displays the current factor. The visual indicator correctly reflects the level (1.0 = green, 2.0 = yellow, 3.0+ = red). Change history shows the last 10 entries. The reset button works.

Anti-hallucination: Ensure that adaptiveFactor resets on day change (automatic daily reset). Verify that the visual indicator is correctly bounded to the range [1.0, 5.0]. Ensure that the history does not grow infinitely (limit 10).

---

### Phase 6: Polish -- themes, landing, Chrome Web Store

---

**F6.1 | Dark theme**

Priority: P2
Dependencies: F0.8
Complexity: M

Description: Implement a dark theme for the Shadow DOM panel and popup. Use CSS custom properties (variables) for all colors. Define two sets of variables: light-theme and dark-theme. Switching via toggle in settings (settings.darkTheme). Save the choice in chrome.storage.local. Light theme (default): background #ffffff, text #1a1a1a, accent #2964FF, borders #e2e8f0. Dark theme: background #1e1e2e, text #e0e0e0, accent #5b8aff, borders #3a3a4e. Variables: --bg-primary, --bg-secondary, --bg-card, --text-primary, --text-secondary, --accent, --accent-hover, --border, --success, --warning, --danger, --badge-bg. Update all UI components to use variables instead of hardcoded colors.

Acceptance criteria: Toggle switches the theme. All colors change correctly (background, text, borders, buttons, progress bars, cards). Theme is saved between sessions. Popup also supports dark theme. No hardcoded colors (only CSS variables are used).

Anti-hallucination: Verify all 14 CSS variables in both themes (no undefined, no invalid colors). Ensure that text is readable against the background in both themes (contrast). Verify that theme switching does not break the layout.

---

**F6.2 | "Resume" tab -- Skill Gap Analysis UI**

Priority: P1
Dependencies: F2.2, F0.8
Complexity: M

Description: Extend the "Resume" tab with a Skill Gap Analysis block. The block shows: heading "Skill gaps", top 5 missing skills with a horizontal demand bar (percentage), "Refresh" button for recalculation (runs findSkillGaps with current data). Each skill in the list shows: skill name, demand percentage (bar), number of vacancies where it appears. The block is displayed only if there are vacancies with match >= 70% in the cache and resume data is loaded. When no data is available -- message "Load a resume and browse vacancies for gap analysis".

Acceptance criteria: The "Skill gaps" block displays up to 5 skills. Demand bars correctly reflect percentages. The "Refresh" button recalculates the result. When no data is available, a placeholder message is shown.

Anti-hallucination: Verify that demand percentage does not exceed 100. Ensure that resume skills do not appear in the list (filtered out). Verify that bars scale correctly (width = demand%).

---

**F6.3 | "Vacancies" tab -- filters and sorting**

Priority: P1
Dependencies: F2.3, F0.8
Complexity: M

Description: Extend the "Vacancies" tab with filtering and sorting elements. Add: (1) Text search -- filter by vacancy title or company (input with 300ms debounce). (2) Status filter -- dropdown (All/New/Applied/Blacklisted). (3) Match score filter -- range slider (from X% to Y%) with current range display. (4) Sorting -- by match score (descending/ascending), by date (newest/oldest), by salary (high/low). (5) Vacancy cards with detailed match breakdown: Skills (30%), Salary (25%), Experience (20%), Position (15%), Location (10%) -- each metric with a colored bar. (6) "Apply" button on each card (opens 5-step modal from F3.1). (7) "Add to blacklist" button on each card.

Note: Basic client-side vacancy filtering (search, status, score range) is already implemented (F0.5.4). Blacklist add/remove is also implemented (F0.5.5). This task adds sorting, detailed match breakdown, apply button, and range slider.

Acceptance criteria: Text search filters vacancies in real time. Status filter correctly hides/shows vacancies. Range slider filters by match score. Sorting works for all modes. Match breakdown displays 5 metrics on each card.

Anti-hallucination: Verify that debounce does not filter too quickly (300ms). Ensure that filters combine correctly (intersection). Verify that range slider does not allow values outside [0, 100]. Ensure that breakdown bars are correctly bounded to [0, 100]%.

---

**F6.4 | "Vacancies" tab -- Apply modal and Shimmer effect**

Priority: P1
Dependencies: F3.1, F6.3
Complexity: M

Description: Implement an apply modal and shimmer effect. Apply modal: (1) Step 1 -- Pre-flight: display check results (rate limit ok, vacancy not applied, reply button exists), green checkmarks for passed, red crosses for failed. (2) Step 2 -- Navigation: 3-2-1 countdown before navigation. (3) Step 3 -- Waiting: spinner with message "Searching for apply button...". (4) Step 4 -- Alerts: display detected warnings with action buttons. (5) Step 5 -- Submission: letter filling progress bar, submit button. Shimmer effect: vacancies with match score >= 80% receive visual highlighting (subtle gradient border + shimmer animation CSS). Shimmer is used as a "high priority" recommendation.

Acceptance criteria: Modal displays 5 steps with correct information. Countdown before navigation works. Spinner is shown while waiting. Alerts appear with buttons. Shimmer effect animates correctly (CSS keyframes, performance-friendly).

Anti-hallucination: Verify that shimmer does not cause performance issues (use transform instead of position). Ensure that modal closes on backdrop click. Verify that countdown does not block modal closing.

---

**F6.5 | "Negotiations" tab -- chat list and navigation**

Priority: P1
Dependencies: F1.3, F0.8
Complexity: M

Description: Implement the "Negotiations" tab in src/ui/tabs/negotiations.js. Content: (1) List of chats with employers. Each chat shows: company name, position, last message (truncated), date, status badge (invitation/interview/dialog/waiting/rejection), unread count (badge with number). (2) Filter by status. (3) Sort by date (newest first) and by unread. (4) Click on chat -- opens the negotiations page in a new tab (window.open with chat URL). (5) "Refresh" button for re-parsing. When no chats exist -- message "No active negotiations".

Note: The wireframe for the "Negotiations" tab already exists (ui/html/tabs/negotiations.js -- 65 lines HTML, ui/tabs/negotiations.js -- 81 lines renderer). This task connects real data instead of demo and adds clickability/navigation.

Acceptance criteria: The "Negotiations" tab displays a list of chats. Each chat shows all fields. Unread badge displays correctly. Status filter works. Clicking a chat opens the corresponding page.

Anti-hallucination: Verify that long messages are truncated correctly (CSS text-overflow). Ensure that the badge does not show undefined when there are 0 unread. Verify that the status badge uses correct colors for each type.

---

**F6.6 | "Settings" tab -- full implementation**

Priority: P1
Dependencies: F0.4, F0.8
Complexity: M

Description: Implement the "Settings" tab in src/ui/tabs/settings.js with full management of extension settings. Sections: (1) Basic settings: minimum match score (range slider 0-100), apply mode (manual/semi-auto/auto -- radio buttons), daily apply limit (number input), hourly limit (number input), minimum interval between applications (number input, seconds). (2) Behavior: "Typing simulation" toggle, "Hide blacklisted vacancies" toggle, "Auto-scroll pagination" toggle. (3) AI settings: API key (password input), "Verify" button, daily AI request limit (number input), letter tone (select: formal/confident/friendly). (4) Cover letter template: textarea with variable support {position}, {company}, {skills}, {experience}. (5) Blacklist: company list, input field for adding, "Remove" and "Import from vacancies" buttons. All settings are saved to chrome.storage.local on change.

Note: The wireframe for the "Settings" tab already exists (ui/html/tabs/settings.js -- 90 lines HTML, ui/tabs/settings.js -- 59 lines renderer). This task connects real data and save logic.

Acceptance criteria: All settings are displayed and editable. Changes are saved to chrome.storage.local on blur (onblur/onchange). Blacklist correctly adds/removes companies. API key field is masked (type=password). Toggle changes are reflected immediately.

Anti-hallucination: Verify that number inputs do not accept negative values or NaN. Ensure that saving settings does not cause errors on storage overflow. Verify that the letter template correctly saves special characters ({position}, etc.).

---

**F6.7 | Preparation for Chrome Web Store publication**

Priority: P2
Dependencies: All previous phases
Complexity: M

Description: Prepare the extension for publication. (1) Optimize bundle size: enable minify for production build (add "build:prod" to package.json). (2) Create icons: 16x16, 48x48, 128x128 for manifest. (3) Write extension description for Chrome Web Store (in Russian and English). (4) Create screenshots: 1280x800, minimum 3 screenshots (panel on vacancy page, "Overview" tab with KPI, "Vacancies" tab with filters). (5) Remove all console.log from production build (or replace with a conditional logger with levels). (6) Ensure the extension does not use forbidden APIs. (7) Verify that all permissions in manifest.json are minimally necessary. (8) Create a privacy policy (if an API key is used -- state that it is stored locally). (9) Test on Chrome, Edge, Brave. (10) Package as .zip for upload.

Acceptance criteria: Production build (< 1MB minified). Icons of correct size and format. Description contains all key features. Screenshots reflect actual functionality. Extension works on Chrome 120+, Edge 120+, Brave 1.60+.

Anti-hallucination: Ensure that the minified bundle does not contain leaked API keys or personal data. Verify that all external references (CDN, external fonts) are replaced with bundled resources or removed. Ensure that the extension does not use eval() or Function() (forbidden by Chrome Web Store for Manifest V3).

---
