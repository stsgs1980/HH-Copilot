# HH Copilot -- Chrome Extension

**Version:** 1.9.67.0
**Type:** Chrome Extension (Manifest V3)
**Target Platform:** hh.ru (Magritte design system)
**License:** Private project. All rights reserved.


## 1. HH Copilot -- Brief Description

HH Copilot is a browser extension for automating job search on the hh.ru portal. The project solves the problem of routine responses to vacancies: it parses vacancy cards from the search page, extracts user resume data, shows results in a built-in sidebar, and allows responding to suitable positions with one click or in fully automatic mode.

The extension runs exclusively in the user's browser. No server infrastructure, database, Telegram bot, or any external APIs are required. All data is stored locally in chrome.storage.local. The user uses their current hh.ru session, so no additional authorization via OAuth, OTP, or 2FA is needed. The extension reads the page DOM tree and interacts with elements the same way a live user would, making it indistinguishable from manual actions.

The project was originally developed as part of a large automation system (Next.js + FastAPI + Playwright + Celery + Telegram), but the closure of the hh.ru Applicant API in December 2025 made the server-side approach unworkable. Playwright was detected by the anti-bot system via TLS fingerprint, navigator.webdriver, and behavioral biometrics. The extension solves all these problems: it runs in a real browser, uses real cookies, real clicks, and real navigation. No hidden markers, no headless sessions, no user-agent spoofing.

The target audience is job seekers who send dozens of responses per day and want to speed up this process without losing quality. The extension doesn't replace the person entirely, but automates the mechanical part: searching, filtering, filling in fields, sending responses. The decision about which vacancies to respond to is made by the user (manual mode) or the scoring algorithm (semi-automatic and automatic modes).

Current version (1.9.67.0) features a modular architecture based on esbuild. The content script is built from 112 JS modules in the src/ directory. Resume parsing (13+ fields: name, position, salary, gender, age, city, skills with levels, experience, education, languages, contacts, employment conditions, additional info), vacancy parsing from the search page + hh.ru main page (recommended + "Vacancy of the Day") + detailed vacancy parser, FAB button with green pulsation, Shadow DOM sidebar (720px, 6 tabs), authorization, SPA navigation with pushState patch, two-level resume visibility detection (list + detail page, 6 strategies), radio buttons for selecting the active resume, consolidated UI ((r) for re-parsing, contextual CTA "Take from page"), multi-strategy experience parsing (6 strategies), five-component scoring engine (skills 40%, salary 15%, experience 15%, position 15%, location 15%) with derived skills from work experience, skill synonyms, and position synonyms, resume quality analysis (ATS compatibility, red flags, improvement recommendations), guided tour for new users, auto-apply (orchestrator + queue + actions), negotiations page parser with status badges and background auto-load, AI cover letter generation (F-CR-02: scorecard + evidence + projection pipeline, 4 tones, template persistence, 11 AI writing patterns rejected via humanizer rules), AI chat reply generation (3 variants, tone-adaptive, typing simulation), AI settings UI (Base URL + API Key + Model, debounced save), CAPTCHA detection with auto-pause and badge -- all of this is working.


## 2. Features

### What the extension can do now

**Modular build (esbuild).** The source code is located in the extension/src/ directory and consists of 112 ES modules organized by layers: lib/ (libraries, 75 files), parsers/ (parsers, 10 files), engine/ (business logic, 5 files), ui/ (interface, 15 files), content/ (7 files), plus page-world.js (MAIN world script). The esbuild bundler combines modules into a single IIFE bundle content.js (Manifest V3 does not support ES modules in content_scripts). Additionally, page-world.js is injected into the MAIN world for SPA navigation. Commands: `npm run build` (build), `npm run watch` (development with auto-rebuild), `npm run lint` (ESLint with AHG rules), `npm test` (509 unit tests).

**Vacancy parsing from the search page.** The extension finds all vacancy cards on the hh.ru/search/vacancy page and extracts from each: position title, company name, salary, location, required experience, skill tags, URL, and identifier. Data is validated (title, company, URL, id checks), filtered by company blacklist and list of already-applied vacancies.

**Vacancy parsing from the hh.ru main page.** When the root page hh.ru (/) is opened, the extension parses two vacancy blocks: (1) recommended vacancies -- the same vacancy-serp__vacancy selectors as on the search page, with ~= word-match support for space-separated data-qa attributes and fallback by href for links without data-qa; (2) "Vacancy of the Day" -- vacancies with data-qa="vacancy_of_the_day_title", where the vacancy ID is extracted using three strategies: from click-URL parameter vacancyId= (content.hh.ru), from vacancyId= in query params (fallback), from the id attribute of the parent element (sponsored adsrv.hh.ru vacancies). All VotD vacancies receive the canonical URL https://hh.ru/vacancy/{id}. Results from both blocks are merged: recommended + VotD.

**Resume parsing (13 fields).** When a specific resume page is opened (/resume/{hash}), the extension extracts: name, position, desired salary, gender, age, city, skills with proficiency levels (Advanced/Intermediate/Beginner), work experience (company, position, period, description), education (institution name, faculty, graduation year, degree), languages with levels, contacts, additional information. Each field has a fallback strategy: first data-qa selectors, then Bloko BEM classes, then textual content analysis. The built-in diagnostic tool diagnoseResumeDOM() outputs a complete DOM dump to the console for selector development. Resume parsing is decomposed into 14 files in src/parsers/resume-detail/. Common constants (title cleanup, visibility detection, whitespace normalization) are extracted to src/lib/resume-constants.js.

**Resume list and synchronization.** On the /applicant/resumes page, the extension finds all user resumes and displays them in the sidebar. The "Sync all" button loads all resumes at once. Each resume displays its visibility status: "Visible" (green badge), "Hidden" (yellow badge). Visibility detection uses a two-level approach: (1) from the resume list page (less reliable, client-side rendering lacks indicators), (2) from the resume detail page (more reliable, SSR contains data-qa attributes and buttons). Six strategies for visibility detection from the resume page: data-qa attributes, button text, body text, raw HTML with &nbsp; normalization, script JSON, data-qa presence. Data from the resume page overrides list data. Active resume selection uses radio buttons in the "All resumes" list (click on card). The (r) button on the active card triggers re-parsing. Migration of old data in chrome.storage automatically adds the visibility field on load.

**Built-in panel (FAB + Sidebar).** The floating button (FAB) in the bottom-right corner of the screen has three states: gray (checking authorization), red (not authorized), green with pulsation (authorized). All FAB CSS properties are set via `style.setProperty(prop, value, 'important')` to protect against hh.ru styles. Clicking opens a sidebar panel 720px wide with 6 tabs: Overview, Resumes, Vacancies, Negotiations, Settings, Statistics. The panel is isolated via Shadow DOM (mode: closed), so hh.ru styles don't affect its rendering, and panel styles don't affect hh.ru.

**Authorization check.** Passive authorization via checkAuth() with DOM polling every 2 seconds + cookie fallback (hhruuid, _HH-RU, hhtoken). Primary selector -- `[data-qa="mainmenu_applicant"]`. Upon authorization, the user's username is extracted and displayed. The auth gate blocks panel functionality for unauthorized users.

**SPA navigation.** hh.ru is a Single Page Application built on React. When navigating to the next search page, the URL changes but the page doesn't reload. MutationObserver with 1-second debounce tracks DOM changes and automatically re-parses vacancies.

**Client-side vacancy filtering.** Real-time filtering: text search by title/company, status filter (new/applied/blacklisted), match score range filter.

**Blacklist management.** Add/remove companies to the blacklist via the panel UI. Blacklisted vacancies are hidden. Actions are logged via toast notifications.

**CustomEvent bridge.** Communication between UI and business logic via events: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume. This allows binding panel events to engine actions without a direct dependency of UI on engine.

**Popup dashboard.** Four tabs: statistics (responses today, invitations, errors, total), settings (operation mode, limits, intervals, display), cover letter templates (with variables {name}, {position}, {company}, {skills}), logs (last 50 entries). Popup is a minimal redirect to FAB.

**Anti-hallucination.** Three-level verification system: DOM Verification (checking element existence and visibility), Data Validation (checking data types and formats), Action Verification (checking preconditions and action results). All functions return concrete types (string, null, boolean, number), never undefined. Module src/lib/anti-hallucination.js.

**Rate Limiter.** Token bucket with adaptive slowdown: 200 responses/day, 30/hour, minimum 30 seconds between actions, maximum 5 consecutive with a 2-minute pause. When receiving 429/captcha/slow response, the adaptive factor increases (x2 on 429, x1.5 on slow, x1.3 on captcha). Module src/lib/rate-limiter.js.

**Version sync.** Version is synchronized between manifest.json, package.json, popup/index.html, and src/lib/version.js. The single source of truth is manifest.json (esbuild reads it and injects process.env.VERSION). Module src/lib/version.js contains the constant for reference but is not imported by any module.

**Tests.** 509 unit tests across 26 files based on Vitest + jsdom. Coverage: anti-hallucination (21 tests -- extractVacancyId, validateVacancyData, VotD URL patterns), cover-letter (17 tests), cover-letter-scorecard (7 -- F-CR-02 scorecard extraction), cover-letter-evidence (32 -- F-CR-02 forensic evidence mapping + stem-match anti-hallucination hardening), cover-letter-prompt (7 -- F-CR-02 structured LLM prompt + 11 humanizer patterns), cover-letter-validator (14 -- F-CR-02 anti-hallucination + AI pattern detection), cover-letter-ai (7 -- F-CR-02 orchestrator pipeline), derive-skills (26 -- skill derivation from experience text + RF-1 false-positive characterization), negotiations (34 tests -- selectors, parser, diagnostic, 50+ items anti-hallucination), negotiations-format (13 -- relative time formatting), parse-experience (13 -- all experience string formats), routing (11 -- all routes including main page), selectors (9 -- ~= word-match, VotD selectors), timing (13 -- simulateTyping with native setter), vacancy-fetch, vacancy-list. Run: `npm test`, watch mode: `npm run test:watch`. All 509 tests passing as of v1.9.67.0.

**Hot-reload for development.** WebSocket server (ws://localhost:35729) is started by `npm run watch`. On rebuild, the extension automatically reloads via chrome.runtime.reload(). Eliminates manual refresh in chrome://extensions.

**Negotiations page parser.** When the user is on /applicant/negotiations (or when the sidebar opens from any page), the extension parses the negotiations list: vacancy title, company, date, status (`not-viewed` / `viewed` / `discard` / `invite`), and vacancy ID. Status badges color-coded (amber / blue / red / green). The background auto-load path (`fetchAndParseNegotiations`) uses fetch + DOMParser so it works from any page. Module: src/parsers/negotiations.js + src/parsers/negotiations-diagnostic.js (split for AHG Rule 12 compliance).

**ESLint integration with AHG rules.** The project enforces two custom ESLint rules: `ahg-rules/max-file-lines` (WARN at 200 lines) and `ahg-rules/max-file-lines-hard` (ERROR at 250 lines, HARD CAP 400). The pre-commit hook blocks commits on any ERROR. Rule 15 (`no-unicode-graphics`) warns on em-dash and other Unicode graphics. Run: `npm run lint` (or `npm run lint:fix`).

**Cascade CLI (Node.js).** `scripts/cascade-task.js` is a cross-platform Node.js CLI (430 lines, no external deps) for managing the task cascade in `cascade/state.json`. 13 commands: `next-task`, `ready-tasks`, `status`, `phases`, `task`, `deps`, `start`, `complete`, `block`, `pending`, `blocked`, `functions`, `validate`. Replaces the old bash+jq `cascade-cli.sh`. Run from extension/: `npm run cascade -- next-task`.

### What does NOT work (stubs, planned for subsequent phases)

**Dark theme.** Not implemented. Planned for Phase 5 (F5.2).

**KPI dashboard.** Tab wireframes exist but data is demo. Planned for Phase 5 (F5.3).

**Apply modal with 5-step progress.** Not implemented. Planned for Phase 3.

**Extension icons.** Placeholder PNGs only. Generation via z-ai-generate CLI planned (F6.1).

**Chrome Web Store preparation.** Not started. Description, screenshots, privacy policy, category selection needed (F6.4).

**Landing page.** Wireframe exists (`docs/wireframes/hh-copilot-landing.html`) but no deployment (F6.3).


## 3. Installation and Setup

### Building from source

The extension is built using esbuild. Source modules are located in src/, the bundler generates a single IIFE bundle content.js in the extension root.

```
git clone https://github.com/stsgs1980/HH-Copilot.git
cd HH-Copilot
git submodule update --init   # initialize submodule (anti-hallucination-guard)
cd extension
npm install          # install esbuild + ws (devDependencies)
npm run build        # build content.js from src/content/main.js
npm test             # run 509 unit tests (Vitest + jsdom)
npm run lint         # ESLint with AHG rules (0 errors expected)
```

For development with auto-rebuild and hot-reload (extension reloads automatically):

```
npm install ws       # once -- WebSocket server for hot-reload
npm run watch        # auto-rebuild + hot-reload on ws://localhost:35729
```

Built extension files (in the dist/ directory): content.js (bundle), page-world.js (MAIN world script), manifest.json, background/index.js (service worker), popup/index.html (popup, redirect to FAB), icons/.

### Loading in Chrome

Step 1. Open Chrome and navigate to chrome://extensions.

Step 2. In the top-right corner, toggle "Developer mode" ON.

Step 3. Click the "Load unpacked" button.

Step 4. In the dialog, select the extension/dist folder (the one containing the built manifest.json).

Step 5. The extension will appear in the list with the name "HH Copilot". Make sure the toggle is enabled.

### Verifying functionality

After loading the extension, open https://hh.ru and log in (if not already logged in). A floating round button (FAB) will appear on the right edge of the screen. Within 1-2 seconds it should change color from gray to green (with pulsation), indicating successful authorization detection. If the button turns red -- authorization was not detected, check that you are logged into the site.

Navigate to the vacancy search page: https://hh.ru/search/vacancy?text=Python. Click the FAB. A sidebar panel 720px wide with 6 tabs will open. The "Vacancies" tab will display the list of found vacancies. Each card contains the position title, company, salary, location, and control buttons.

To verify resume parsing, navigate to one of your resumes (https://hh.ru/resume/{hash}). Open DevTools (F12), go to the Console tab. Type HH-AR in the filter. You will see parsing logs with detailed information about found and missing fields. In the sidebar, open the "Resumes" tab -- all parsed data will be displayed there.

### Debugging

The content script logs all actions with the [HH-AR] prefix. Main modules: Parser, Resume, Panel, Auth. For DOM diagnostics, you can call the diagnoseResumeDOM() function from the console (also available via window.__hhDiagnose). This function outputs a complete dump of all data-qa attributes on the page, which is useful when hh.ru layout is updated.

The Service Worker can be inspected on the chrome://extensions page -- find the extension, click "Service Worker" under its name. Storage can be viewed by clicking "Storage" on the extension card.


## 4. Project Structure

### Repository root

```
/
  extension/   -- extension code
  docs/wireframes/                            -- UI prototypes (FAB panel + landing)
    hh-copilot-documentation.md               -- wireframe documentation (399 lines)
    hh-copilot-fab-panel.html                 -- interactive FAB panel wireframe
    hh-copilot-landing.html                   -- landing page prototype
    resume-tab-reference.png                  -- "Resumes" tab reference

  anti-hallucination-guard/                    -- git submodule (anti-hallucination guard)
  (cascade-state.json removed -- no longer used)
  AGENT_RULES.md                               -- AHG + Cascade rules
  cascade-cli.sh                               -- task navigation CLI
  cascade-init.sh                              -- interactive state generator
  scripts/
    validate.sh                                -- repository cleanliness check
    check-agent.sh                             -- agent monitoring
    audit.sh                                   -- line-by-line estimation
  tools/verify-docs/                           -- documentation verification tool
  .git/hooks/
    pre-commit                                 -- blocks commit without fresh worklog
    pre-push                                   -- runs validate.sh before push
  worklog.md                                   -- work log (required for commits)
  README.md                                    -- this file
```

### Extension code (extension/)

```
manifest.json                  -- Manifest V3 configuration (v1.9.67.0, source of truth for version)
package.json                   -- esbuild, build/watch scripts
esbuild.config.mjs              -- build configuration (IIFE, bundle, output -> dist/)
dist/                          -- build directory (load in Chrome as unpacked extension)
  content.js                   -- built bundle (generated by npm run build from src/content/main.js)
  page-world.js                -- MAIN world script (copied from src/page-world.js)
  manifest.json                -- copy of root manifest.json (esbuild)
  background/index.js          -- service worker (copy)
  popup/index.html              -- popup (copy, version injected by esbuild)
  icons/icon{16,48,128}.png    -- extension icons (copy)
background/index.js            -- service worker (source)
popup/index.html                -- popup (source, minimal redirect to FAB)
icons/icon{16,48,128}.png      -- extension icons (source)

src/                           -- source modules (140 JS files)
  content/ (6 files):
    index.js                   -- barrel re-export
    main.js                    -- boot sequence: init, auth gate, detectPageType, SPA observer, migration
    main-page-handlers.js      -- initPageLogic, SPA routing, page routing
    main-page-handlers-pages.js -- page handler implementations (search, resume, vacancy, main page)
    main-resume-loader.js      -- resume loading: parseResume, fetchAndParseResume
    main-sync.js               -- synchronization: storage listeners, state sync
  lib/ (60 files):
    -- base modules --
    index.js, selectors.js, anti-hallucination.js, timing.js, rate-limiter.js, version.js
    storage.js, storage-queue.js, storage-settings.js, storage-vacancies.js
    -- scoring --
    match-scorer.js             -- calculateMatchScore() (skills 40%, salary 15%, experience 15%, position 15%, location 15%)
    match-scorer-skills.js      -- scoreSkills() (explicit + derived, synonyms)
    match-scorer-salary.js      -- scoreSalary()
    match-scorer-experience.js  -- scoreExperience()
    match-scorer-title.js       -- scoreTitle() (position synonyms, groups)
    -- skills --
    skill-dictionary.js         -- SKILL_PATTERNS (50+ Russian skill keyword patterns)
    skill-synonyms.js           -- SKILL_SYNONYMS (synonym groups)
    derive-skills.js            -- deriveSkillsFromExperience()
    vacancy-skills-collector.js -- collectAllVacancySkills()
    parse-experience.js         -- parseExperienceString()
    -- quality --
    quality-flags.js            -- buildRecommendations()
    quality-ats.js              -- ATS compatibility
    quality-experience.js       -- experience analysis
    quality-patterns.js         -- red flags
    quality-date-helpers.js     -- date utilities
    resume-quality-analyzer.js  -- analyzeResumeQuality()
    -- guided tour --
    tour-engine.js, tour-steps.js, tour-tooltip.js
    -- resume constants --
    resume-constants.js, resume-constants-core.js, resume-constants-title.js, resume-constants-visibility.js
    -- resume fetch (26 files) --
    resume-fetch.js, resume-fetch-list.js, resume-fetch-resume.js, resume-fetch-resume-skills.js,
    resume-fetch-*.js (experience, strategy4-6, json-utils, education-languages, helpers,
    parse, parse-edu, vis-fallback, iframe-vis*, list-vis*, resume-diag, resume-exp-orch, resume-page-vis)
  parsers/ (24 files):
    index.js, vacancy-list.js
    vacancy-detail.js           -- parseVacancyDetail (implemented)
    vacancy-detail-skills.js    -- parseVacancySkills (5 fallback strategies)
    vacancy-diagnostic.js       -- diagnoseVacancyDOM()
    vacancy-diagnostic-detectors.js -- heuristic detectors (title, company, salary, etc.)
    vacancy-detail-parsers.js   -- salary, experience, description parsers
    negotiations.js             -- stub (Phase 1)
    resume-detail.js            -- barrel to resume-detail/
    resume-detail/ (15 files):
      index.js, parse-resume.js, parse-company-card.js, parse-resume-sections.js,
      parse-resume-education.js, parse-resume-personal.js, parse-resume-contacts.js,
      parse-resume-conditions.js, parse-resume-skills.js, diagnose.js, diagnose-blocks.js,
      diagnose-elements.js, diagnose-structure.js, resume-detail-debug-vis.js, resume-detail-list-parser.js
  engine/ (4 files):
    index.js, apply-orchestrator.js, apply-actions.js, apply-queue.js
  services/ (1 file):
    index.js                    -- stub (Phase 4 -- AI cover letters)
  ui/ (44 files):
    -- root --
    index.js, fab.js, styles.js, state.js, panel.js, html.js, auth.js
    -- styles --
    sidebar-css.js, sidebar-css-core.js, sidebar-css-components.js
    -- authorization --
    auth-check.js, auth-detection.js, auth-user.js
    -- panel --
    panel/index.js, panel/render.js, panel/helpers.js, panel/events.js,
    panel/sidebar-events.js, panel/panel-diagnostics.js
    -- html --
    html/index.js, html/shell.js, html/helpers.js, html/icons.js
    html/tabs/overview.js, html/tabs/resume.js, html/tabs/vacancies.js,
    html/tabs/negotiations.js, html/tabs/settings.js, html/tabs/stats.js
    -- tabs --
    tabs/index.js, tabs/overview.js, tabs/resumes.js, tabs/vacancies.js,
    tabs/negotiations.js, tabs/settings.js, tabs/stats.js
    tabs/resumes/ (7 files):
      index.js, render-my-resumes.js, render-resume-panel.js,
      resume-helpers.js, resume-helpers-gap.js, resume-accordion-header.js, section-builders.js

docs/
  ARCHITECTURE.md               -- architecture documentation
  PLANTUML-REFERENCE.md         -- PlantUML reference (required before editing .puml)
  UNICODE_POLICY.md             -- Unicode policy (enforcement for content.js)
  TASK-CASCADE.md               -- task cascade (8 phases, 40 tasks)
  reference-prompts.py          -- AI prompt templates (reference, not connected)
CHANGELOG.md                    -- version history (in extension root, Keep a Changelog)
worklog.md                      -- extension work log (in extension root)
```

### Guard Systems

The project uses two git submodules to ensure code quality:



**anti-hallucination-guard/** (https://github.com/stsgs1980/Anti-hallucination-guard.git, commit 0759547) -- guard system against code hallucinations. AHG rules 1-6 are integrated into AGENT_RULES.md in the repository root.

**Git hooks** (installed manually via `tools/verify-docs/templates/install-hooks.ts`):
- `.git/hooks/pre-commit` -- blocks commit without a fresh entry in worklog.md
- `.git/hooks/pre-push` -- runs validate.sh before pushing to the remote repository

After cloning the repository, install the hooks:
```
npx ts-node tools/verify-docs/templates/install-hooks.ts
```


## 5. Resume Parsing

### How it works

hh.ru uses Magritte -- its own CSS-in-JS design system that hashes class names on every deploy. A class like magritte-card_bhGKz_8-5-13 will change to magritte-card_xYzAb_9-6-14 after the next release. For this reason, CSS selectors by class names for Magritte components don't work -- they are unstable and break on every site update.

The only stable API for addressing DOM elements on hh.ru is data-qa attributes. They are created by hh.ru developers for internal testing and don't change between deploys. The resume parsing strategy is built exclusively on data-qa attributes, and where they are absent -- on textual content analysis and Bloko library BEM classes (hash-free).

### Extracted fields (13)

The "Position" field is extracted from data-qa="resume-block-title-position". Fallback -- the h1 tag on the page. This is the most reliable field, present on all resumes.

The "Salary" field is taken from data-qa="resume-block-salary". Fallback -- any element with a data-qa containing "salary". Can be empty if the job seeker hasn't specified desired income.

The "Gender", "Age", "City" fields are extracted from the text content of the data-qa="resume-position-card" block. Magritte doesn't provide separate data-qa attributes for these fields, so pattern matching is used: gender is searched by the words "мужчина"/"женщина", age -- by the pattern "N лет/года", city -- by text fragments with Cyrillic characters that don't match salary or position.

The "Skills" field is taken from the data-qa="skills-card" container. Skill tags have data-qa="skill-tag-*", proficiency levels -- data-qa="skill-level-title-N" (where N is 1, 2, or 3, corresponding to "Beginner", "Intermediate", "Advanced"). Fallback -- .bloko-tag__text classes inside skills-card.

The "Work experience" field is extracted from data-qa="resume-list-card-experience". Each entry is data-qa="profile-experience-company-card". Inside the card, the structure is cell-based: company and duration in cell-left-side (two cell-text-content elements), position and period in magritte-stepper-step-content, description -- residual text after subtracting position and period.

The "Education" field is extracted from data-qa="resume-list-card-education". Three fallback strategies are used: cell-left-side (as in experience), direct child elements of eduCard, full text scan searching for "Name -- year" patterns. UI text is filtered (words like "Образование", "Редактировать", etc.).

The "Languages" field is searched in bloko-tag within data-qa="resume-about-card" and data-qa="resume-position-card". There is no separate data-qa for languages in the current Magritte version.

The "Additional information" field is taken from data-qa="resume-about-card" -- the text content of the entire block.

### Diagnostics

For selector development when hh.ru DOM changes, the diagnoseResumeDOM() function is designed. It is available from the console (window.__hhDiagnose) or via a button in the sidebar. The function collects all data-qa attributes on the page, groups them by prefix, checks all resume selectors from HH_SELECTORS, outputs dumps of experience and education sections, shows h1-h3 headings and all page sections.


## 6. Architecture

### Overall scheme

The extension is built on the classic Chrome Extension Manifest V3 architecture and consists of three executable contexts: Content Script, Service Worker, and Popup. Each context performs its role and interacts with others via chrome.storage.local and chrome.runtime.sendMessage.

**Content Script (content.js)** -- the main extension module, loaded on all hh.ru pages. Content is built by esbuild from 140 source modules in the src/ directory into a single IIFE bundle. Additionally, page-world.js is injected into the MAIN world for SPA navigation. Modules are organized by layers: content (boot sequence, page handlers), library (src/lib/ -- 60 files: selectors, anti-hallucination, storage, timing, rate limiter, match-scorer, skill-dictionary, derive-skills, quality analysis, tour, resume-fetch), parsers (src/parsers/ -- 24 files: vacancies, resumes, negotiations, diagnostics), engine (src/engine/ -- apply-orchestrator, apply-actions, apply-queue), services (src/services/, stub), UI (src/ui/ -- 44 files: FAB, panel, tabs, styles, state, auth, sidebar-css).

**Service Worker (background/index.js)** -- background script running in the extension context (not on the hh.ru page). Responsible for storage initialization on first install, creating a daily alarm (chrome.alarms) for resetting limits at midnight, message routing between popup and content scripts, badge updates (number on the extension icon).

**Popup (popup/index.html)** -- minimal user interface when clicking the extension icon. Redirects to the FAB button; the main interface is available through the sidebar.

### Data flows

**Vacancy parsing flow:**

The hh.ru/search/vacancy page or hh.ru main page (/) loads in the browser. Manifest V3 injects content.js at document_idle. Entry point src/content/main.js determines the page type (search, vacancy, resume, resume-list, main) and launches the appropriate logic. For the search page, parseVacanciesFromPage() from src/parsers/vacancy-list.js is called. For the main page, handleMainPage() is called, which parses recommended vacancies (parseVacanciesFromPage) and "Vacancy of the Day" (parseVacanciesOfTheDay), merging the results. The function finds all vacancy cards via findAllElements(), extracts data from each card via findElement() and safeGetText(). Results are validated via validateVacancyData(), filtered by applied list and blacklist, then passed to renderSidebarContent() for display. MutationObserver with debounce automatically re-parses on DOM changes.

**Resume parsing flow:**

On the /resume/{hash} page, parseResume() from src/parsers/resume-detail/ is called. The module sequentially extracts data from the DOM using data-qa selectors. Each field has a primary strategy and one or more fallback variants (5 files: parse-resume.js, parse-company-card.js, parse-resume-sections.js, parse-resume-education.js). The result is saved to chrome.storage.local (key: resume) and displayed in the sidebar "Resumes" tab. Resume visibility is determined at two levels: first from list page data (extractVisibilityStatus), then when the detail page loads -- detectVisibilityFromResumePage() with 6 strategies, overriding the list data when more accurate.

**Authorization flow:**

checkAuth() from src/ui/auth.js is called on page load and every 2 seconds. It iterates DOM selectors and checks cookies. The result updates the panelState.isLoggedIn state, which changes the FAB color and sidebar content.

**Message flow:**

Popup sends messages via chrome.runtime.sendMessage (types: get-stats, get-settings, apply-vacancy, log, settings-updated). Service Worker routes messages: get-stats and get-settings read data from storage and respond to popup, apply-vacancy is forwarded to the content script of the active hh.ru tab, log writes to storage.

**CustomEvent bridge:**

Communication between UI modules and business logic is carried out via CustomEvent bridge (src/ui/panel/events.js). Events: hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, hh-ar-toggle-status, hh-ar-load-resume. This allows binding panel events to engine actions without a direct dependency of UI on engine.


## 7. Technologies

### Manifest V3

The extension is built on Manifest V3 -- the current version of the Chrome Extensions platform. Manifest V3 replaced V2 in 2023-2024 and introduced a number of significant restrictions: content_scripts don't support ES modules (import/export unavailable), background pages were replaced by Service Workers (no DOM access), APIs like chrome.webRequest for request blocking were removed, data is stored exclusively via chrome.storage.local/session. All decisions in the project were made with these restrictions in mind. The lack of a module system in content_scripts led to using esbuild for IIFE bundle building. The Service Worker has no DOM access and operates only through Chrome APIs.

### esbuild

The esbuild bundler was chosen as the fastest and most minimal configuration option. Configuration in esbuild.config.mjs: entry point src/content/main.js, output file dist/content.js, IIFE format, bundle=true, minify=false (for debugging), sourcemap=false. Second entry point: src/page-world.js -> dist/page-world.js (bundle=false). Static files (manifest.json, background/, popup/, icons/) are copied to dist/. Commands: `npm run build` (build to dist/), `npm run watch` (watch for changes + hot-reload). Load in Chrome by selecting the dist/ folder as an unpacked extension.

**Hot-Module Replacement (HMR)** -- automatic extension reload during development. When running `npm run watch`, esbuild starts a WebSocket server on port 35729. When a source file changes, esbuild rebuilds the bundle and sends a "reload" signal via WebSocket. The extension receives the signal and calls `chrome.runtime.reload()` -- the extension reloads without manual clicks.

Requirement: `npm install ws` (devDependency, already added to package.json). If the `ws` package is not installed, hot-reload silently disables -- regular `npm run watch` works as before.

Workflow diagram:
```
Save file -> esbuild rebuilds -> WebSocket "reload" -> chrome.runtime.reload() -> extension updated
```

Activated ONLY in dev mode (absence of `update_url` in manifest.json -- indicator of an unpacked extension). In production builds, HMR code does not execute.

### Shadow DOM

The extension panel (sidebar) is created inside a Shadow DOM with mode: "closed". This means complete isolation: CSS styles from hh.ru (Bloko and Magritte libraries) don't penetrate inside the panel, and panel styles don't affect the page. Panel JavaScript is isolated from the global page context -- no variable conflicts, no prototype overrides. Shadow DOM is a built-in browser mechanism that doesn't require polyfills or libraries. It works in all modern Chromium-based browsers, including Chrome, Edge, Brave, and Opera.

### chrome.storage.local

All extension data is stored in chrome.storage.local -- a key-value store accessible from all extension contexts (content scripts, service worker, popup). The storage is asynchronous, with a volume limit of 10 MB per extension (sufficient for thousands of vacancies). Storage schema: settings (object with user settings), stats (response statistics), appliedVacancies (array of applied vacancy IDs), skippedVacancies (skipped), blacklistedCompanies (company blacklist), logs (array up to 500 entries), resume (parsed resume object), resumeList (list of resumes), dailyResetDate (last reset date), installedAt (installation date). Data is not sent to external servers.

### data-qa selectors

The strategy for addressing hh.ru DOM is built exclusively on data-qa attributes. Each selector in HH_SELECTORS is an array of strings, iterated in priority order. The first element is the most stable data-qa, subsequent elements are fallback variants (Bloko BEM classes, partial class match). The findElement() function iterates the array, checks existence, document membership, visibility (display and visibility via getComputedStyle), and returns the first matching element. Magritte hashed classes (like magritte-card_bhGKz) are categorically not used -- they are unstable.

### React-safe input

hh.ru is built on React 18 with Magritte UI. React uses synthetic events, so directly assigning element.value = text doesn't update React's internal state, and data isn't sent on submit. The extension uses the native value setter (Object.getOwnPropertyDescriptor for HTMLTextAreaElement.prototype.value) followed by dispatching synthetic events (input and change, bubbles: true). This guarantees that React "sees" the new value and processes it correctly.


## 8. Versioning

### Rules

The extension version is specified in manifest.json in the "version" field and follows the SemVer format (MAJOR.MINOR.PATCH). Every commit to the main branch with functional changes must be accompanied by a version bump. The version is automatically synchronized between manifest.json, package.json, popup/index.html, and src/lib/version.js. The single source of truth is manifest.json (esbuild reads it and injects `process.env.VERSION` at build time).

**PATCH (third digit).** Bug fixes, selector updates without logic changes, minor popup style tweaks, documentation text updates. Example: 1.7.2 becomes 1.7.3.

**MINOR (second digit).** New functionality that doesn't break existing behavior: adding a new parser, new resume fields, new popup settings, new sidebar tabs. Example: 1.7.3 becomes 1.8.0.

**MAJOR (first digit).** Changes that break backward compatibility: new architectural decision, storage schema migration, removal of existing API. Example: 1.7.3 becomes 2.0.0.

### Commit format

Each commit must start with a change type: feat:, fix:, refactor:, docs:, chore:. After the type -- a brief description in Russian or English. Examples: "feat: skill parsing with levels", "fix: offsetParent for fixed elements", "docs: update ARCHITECTURE.md".

### Changelog

Full version history is maintained in extension/CHANGELOG.md (detailed) and CHANGELOG.md at repo root (high-level summary). Format -- Keep a Changelog. Each release contains "Added", "Changed", "Fixed", "Removed" sections. Current version -- 1.9.67.0.

### Version timeline

- **v1.0.0**: Initial popup-only extension (monolithic content.js, 1637 lines)
- **v1.1.0**: Resume parser, sidebar tab system
- **v1.2.0**: Fixed resume loading bug, context-dependent logic
- **v1.3.0**: Rewrote resume parsing for Magritte (critical bug: 8/11 fields not parsing)
- **v1.4.0**: Auto-expand hidden sections, sidebar 720px
- **v1.5.0**: Mass dead code cleanup (311 files, -41361 lines), only extension kept
- **v1.5.1-v1.5.4**: Anti-hallucination-guard submodule, documentation
- **v1.6.0**: Phase 0 -- esbuild modular refactoring (42 modules from monolith)
- **v1.7.0-v1.7.2**: Auth UX, FAB CSS isolation, version sync, dist/ build, apply engine stub
- **v1.7.3**: File structure cleanup, git hooks, version sync
- **v1.7.4**: Fix resume sync selector (/applicant/resumes/view?resume= pattern)
- **v1.7.5-v1.7.7**: Resume visibility badges (Visible/Hidden/Status unknown), title noise cleanup
- **v1.7.8**: Migration for old stored data (visibility backfill), nbsp normalization fix
- **v1.7.9**: Magritte-aware multi-strategy visibility detection
- **v1.8.0**: &nbsp; (U+00A0) normalization in visibility detection
- **v1.8.1**: Fix "Load from current page" button (container ID mismatch har-resume-content->res-parsed-data)
- **v1.8.2**: Repo restoration after destructive agent, wireframe files added to docs/wireframes/
- **v1.8.3**: Resume UI wireframe compliance -- anti-monolith refactor (resumes.js -> 5 files), subtitle fix, name field, structured education/languages
- **v1.9.0-v1.9.10**: Match scoring engine (5 components), derived skills, SPA navigation, resume quality analysis, anti-monolith refactoring (all files <= 200 lines), collapsible accordion, contacts parsing
- **v1.9.11-v1.9.15.9**: Contact fixes (email/phone/telegram), resume assessment block, detailed vacancy parser, derived skills from experience, HMR for development
- **v1.9.16-v1.9.19**: SPA navigation (pushState/replaceState patch), skill parser fallbacks, experience scoring, synonym matching, vacancy skill derivation, 10 bug fixes from code review
- **v1.9.20-v1.9.23**: Recommendation improvements, synonym skill matching, anti-monolith split of match-scorer.js into 4 modules
- **v1.9.24**: 35 WCAG/typography fixes (contrast, ARIA, keyboard nav, focus indicators)
- **v1.9.25**: HMR (Hot Module Replacement) for development
- **v1.9.26**: Homepage vacancy parsing (recommended + Vacancy of the Day)
- **v1.9.27**: VotD parsing fix (tracking URLs with vacancyId param)
- **v1.9.28**: Sponsored VotD fix (adsrv.hh.ru parent id extraction), all docs translated to English, Rule 9.5 added


## 9. Development

### How to add new functionality

**Adding a new module.** All modules are located in the src/ directory. Library modules -- in src/lib/, parsers -- in src/parsers/, business logic -- in src/engine/, services -- in src/services/, UI -- in src/ui/. A new module is created as an ES module with named exports and connected via the barrel file (index.js) of the corresponding directory. After building (`npm run build`), the module is included in content.js.

**Adding a new selector.** Open the HH_SELECTORS object in src/lib/selectors.js. Find the appropriate group (Vacancy Search, Vacancy Page, Resume Page, Auth) or create a new one. Add the selector to the array: first element -- data-qa (most stable), then fallback variants. Test via diagnoseResumeDOM() (window.__hhDiagnose) -- it will check all resume selectors and show which are found and which are not.

**Adding a new storage key.** Add the key to DEFAULT_SETTINGS or DEFAULT_STATS in src/lib/storage.js, and also to the initialization in background/index.js (chrome.runtime.onInstalled.addListener section). Be sure to provide a default value.

### Code rules

Rule 1. Never return undefined. All functions return string, null, boolean, number, or object. Empty string '' is an acceptable value, undefined is not. This prevents cascading errors in call chains.

Rule 2. Never assume a DOM element exists. Any querySelector call can return null. Use findElement() or safeQuery() instead of direct querySelector.

Rule 3. Never access textContent/value without a wrapper. safeGetText() checks existence, type, visibility, and emptiness. safeGetAttr() checks existence and returns fallback. safeInput() checks disabled/readonly and uses React-safe setter.

Rule 4. Never click on invisible elements. safeClick() checks offsetParent, getComputedStyle, disabled. If the element is invisible -- the function returns false without performing the click.

Rule 5. Always validate data before use. validateVacancyData() checks type, length, format. extractVacancyId() uses regex with fallback to empty string.

Rule 6. Don't use Magritte hashed CSS classes. Only data-qa attributes and Bloko BEM classes. Hashes change on every hh.ru deploy.

Rule 7. All panel styles must be inside Shadow DOM. No inline styles on elements outside shadowRoot. No insertions into document.head.

Rule 8. Log everything that might be useful for debugging. Prefix [HH-AR][ModuleName]. Levels: debug (info), warn, error.

Rule 9. Each module must not exceed 250 lines. If exceeded -- decompose (anti-monolith rule).

Rule 10. Each commit must be accompanied by an entry in worklog.md. The pre-commit hook blocks commits without a fresh worklog.


## 10. Roadmap

### Phase 0 (completed): Modular refactoring

The monolithic content.js (1637 lines) was decomposed into 112 ES modules. esbuild was configured (IIFE, bundle, sourcemap). Modular structure created: lib/ (75 files), parsers/ (10 files), engine/ (5 files), ui/ (15 files), content/ (7 files) with barrel files. All files stay under the 250-line hard cap (AHG Rule 12), with a 200-line WARN threshold. ESLint integrated with custom AHG rules (Rule 12 anti-monolith, Rule 15 no-unicode-graphics) and enforced via pre-commit hook. All Phase 0 tasks are completed; the cascade is at 65% (26/40 tasks across 8 phases).

Additional work (Phase 0.5): FAB CSS isolation with !important, Auth UX (passive authorization, username), 6-tab wireframe panel, client-side vacancy filtering, blacklist management UI, version sync, CustomEvent bridge.

### Phase 1 (completed): Extended parsing

Detailed vacancy parser (parseVacancyDetail), resume list synchronization, resume quality analysis (ATS compatibility, red flags, improvement recommendations), 5-component match scoring engine (skills 40%, salary 15%, experience 15%, position 15%, location 15%), derived skills from work experience, skill synonyms and position synonyms, vacancy skill derivation from job titles.

### Phase 2 (completed): Matching Engine

Five-component scoring (Jaccard + alias matching), skill gap analysis, synonym skill matching, integrated into vacancy parser and resume panel. Resume assessment with ring chart and actionable recommendations.

### Phase 3 (in progress): Auto-Apply

Auto-apply orchestrator + queue + actions implemented. Guided tour for new users. WCAG 2.1 AA compliance (17 violations fixed). SPA navigation (pushState/replaceState patch). HMR for development. Homepage vacancy parsing. CAPTCHA/429 handling, semi-automatic and fully automatic modes -- in progress.

### Phase 4: AI Integration

Cover letter generation via LLM API, AI replies in negotiations, API key management. All tasks -- pending.

### Phase 5: Analytics and UX

KPI dashboard, conversion funnel, extended statistics, adaptive slowdown with visualization. All tasks -- pending.

### Phase 6: Polish

Dark theme, skill gap analysis UI, Chrome Web Store publication. All tasks -- pending.
