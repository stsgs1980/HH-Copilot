# HH Copilot

Chrome extension for automating job search on hh.ru -- parses vacancies, extracts resume data, scores matches, and applies to positions with one click or in fully automatic mode.

**Version:** 1.9.71.0 | **Platform:** Chrome Extension (Manifest V3) | **Target:** hh.ru (Magritte design system)

[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Resume Parsing](#resume-parsing)
- [Status](#status)
- [License](#license)

## Features

- Vacancy parsing from search page and homepage (recommended + Vacancy of the Day) with data validation and blacklist filtering
- Resume parsing with 13+ fields: name, position, salary, gender, age, city, skills with levels, experience, education, languages, contacts
- Five-component match scoring engine: skills 40%, salary 15%, experience 15%, position 15%, location 15% with derived skills from work experience
- Shadow DOM sidebar (720px, 6 tabs: Overview, Resumes, Vacancies, Negotiations, Settings, Statistics) with FAB button and green pulsation
- Auto-apply orchestrator with queue, rate limiting (200/day, 30/hour), CAPTCHA detection, and adaptive slowdown
- AI cover letter generation with scorecard + evidence + projection pipeline, 4 tones, 11 humanizer patterns
- AI chat reply generation (3 variants, tone-adaptive, typing simulation)
- Resume quality analysis with ATS compatibility scoring, red flags, and improvement recommendations
- SPA navigation tracking via MutationObserver and pushState/replaceState patch
- 522 unit tests across 27 files (Vitest + jsdom), ESLint with custom AHG anti-monolith rules
- Hot-reload for development via WebSocket (port 35729)

## Tech Stack

- **Build** - esbuild (IIFE bundle for Manifest V3)
- **Testing** - Vitest, jsdom
- **Platform** - Chrome Extension Manifest V3
- **Linting** - ESLint with AHG custom rules (max-file-lines, no-unicode-graphics)
- **Hot Reload** - WebSocket (ws)
- **UI** - Shadow DOM (closed mode), Custom Events
- **Storage** - chrome.storage.local
- **Selectors** - data-qa attributes, Bloko BEM classes

## Getting Started

### Prerequisites

- Chrome or Chromium-based browser (Chrome, Edge, Brave, Opera)
- Node.js 20+

### Installation

```bash
git clone https://github.com/stsgs1980/HH-Copilot.git
cd HH-Copilot
git submodule update --init
cd extension
npm install
npm run build
```

### Run

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle "Developer mode" ON (top-right corner)
3. Click "Load unpacked" and select the `extension/dist` folder
4. Navigate to `https://hh.ru` and log in
5. A floating green FAB button will appear on the right edge -- click it to open the sidebar

For development with auto-rebuild and hot-reload:

```bash
cd extension
npm install ws
npm run watch
```

## Architecture

The extension uses Manifest V3 with three executable contexts:

- **Content Script (content.js)** -- main module built by esbuild from 140 source modules in `src/`. Organized by layers: content (boot sequence, page handlers), lib (60 files: selectors, anti-hallucination, storage, scoring), parsers (24 files: vacancies, resumes, negotiations), engine (apply orchestrator, queue, actions), ui (44 files: FAB, panel, tabs, styles, auth)
- **Service Worker (background/index.js)** -- storage initialization, daily alarm for limit resets, message routing between popup and content scripts, badge updates
- **Popup (popup/index.html)** -- minimal UI, redirects to FAB button

Data flows:

- **Vacancy parsing**: content.js injects at document_idle, determines page type, calls appropriate parser. MutationObserver with 1-second debounce handles SPA re-parsing
- **Resume parsing**: on `/resume/{hash}`, extracts 13 fields via data-qa selectors with fallback strategies. Two-level visibility detection (list page + detail page, 6 strategies)
- **Authorization**: `checkAuth()` polls DOM every 2 seconds with cookie fallback (`hhruuid`, `_HH-RU`, `hhtoken`)
- **Communication**: CustomEvent bridge between UI and engine (hh-ar-apply, hh-ar-apply-all, hh-ar-refresh, etc.)

The sidebar panel is isolated via Shadow DOM (mode: closed) -- hh.ru styles (Bloko, Magritte) cannot penetrate, and panel styles cannot leak out. React-safe input is used for filling forms (native value setter + synthetic events).

## Project Structure

- `extension/manifest.json` - Manifest V3 configuration (source of truth for version)
- `extension/esbuild.config.mjs` - Build configuration (IIFE, bundle, output to dist/)
- `extension/dist/` - Build directory (load in Chrome as unpacked extension)
- `extension/src/content/` - Boot sequence, page handlers (6 files)
- `extension/src/lib/` - Library modules: selectors, anti-hallucination, storage, timing, rate limiter, match scorer, skill dictionary, quality analysis (60 files)
- `extension/src/parsers/` - Vacancy, resume, negotiation, diagnostic parsers (24 files)
- `extension/src/engine/` - Apply orchestrator, actions, queue (4 files)
- `extension/src/ui/` - FAB, panel, tabs, sidebar CSS, auth (44 files)
- `extension/docs/` - Architecture, task cascade, Unicode policy
- `extension/CHANGELOG.md` - Version history (Keep a Changelog format)
- `docs/wireframes/` - UI prototypes (FAB panel, landing page)
- `anti-hallucination-guard/` - Git submodule for code quality guard

## Scripts

```bash
cd extension
npm run build        # Build content.js from src/content/main.js
npm run watch        # Auto-rebuild + hot-reload (ws://localhost:35729)
npm test             # Run 522 unit tests (Vitest + jsdom)
npm run lint         # ESLint with AHG rules
npm run lint:fix     # Auto-fix ESLint issues
```

## Resume Parsing

hh.ru uses Magritte (CSS-in-JS) that hashes class names on every deploy. The only stable selectors are `data-qa` attributes. Each selector in `HH_SELECTORS` is an array of strings iterated in priority order: first element is the most stable data-qa, subsequent elements are fallback variants (Bloko BEM classes, textual content analysis).

The `diagnoseResumeDOM()` function (available via `window.__hhDiagnose`) outputs a complete DOM dump for selector development when hh.ru layout changes.

Extracted fields (13): position, salary, gender, age, city, skills with proficiency levels (Advanced/Intermediate/Beginner), work experience (company, position, period, description), education (institution, faculty, year, degree), languages with levels, contacts, additional information.

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Modular refactoring | Completed | esbuild, 140 modules, anti-monolith, ESLint AHG rules |
| Phase 1: Extended parsing | Completed | Detailed vacancy parser, resume quality analysis, 5-component scoring |
| Phase 2: Matching engine | Completed | Jaccard + alias matching, skill gap analysis, synonym matching |
| Phase 3: Auto-apply | In progress | Orchestrator + queue + actions, guided tour, SPA nav, CAPTCHA handling |
| Phase 4: AI integration | Pending | Cover letter LLM, AI replies, API key management |
| Phase 5: Analytics and UX | Pending | KPI dashboard, conversion funnel, extended statistics |
| Phase 6: Polish | Pending | Dark theme, Chrome Web Store publication |

## License

Private project. All rights reserved.

---
Built with: TypeScript + Chrome Extensions API
