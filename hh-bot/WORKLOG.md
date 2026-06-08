# HH Bot - Worklog

Project: HH Bot - automated job search on HH.ru
Repository: C:\Users\stsgr\Desktop\HH Bot\hh-bot
Created: 2026-06-09

---

## Session 1 (previous, compacted)

### Completed
- Analyzed entire project, found problems caused by previous agent
- Fixed Next.js API routes (login, login-status, status) - replaced stub/hardcoded responses with real fetch() calls to Python backend
- Removed UNICODE_POLICY violations - replaced all emoji in code files with text markers ([OK], [ERROR], [AUTH], etc.)
- Created README.md, ARCHITECTURE.md, ANALYSIS_REPORT.md, WORK_COMPLETED.md
- Updated bot auth handler to use Playwright instead of deprecated OAuth
- Marked deprecated files (src/hh/auth.py, src/hh/api_client.py) for removal
- Created new Playwright-based bot handlers (auth_playwright.py, auth_new.py, states_updated.py)
- Determined Web dashboard as PRIMARY interface (not Telegram bot)
- Target audience: single user first, then other job seekers

### Problems
- Permission denied errors when editing src/bot/handlers/search.py, apply.py, states.py (Windows file lock)
- Workaround: created new files alongside originals

---

## Session 2 (2026-06-09) - Frontend Build

### [DONE] Adapted wireframe design to Next.js
- Updated `src/app/tailwind.config.js` - accent colors (emerald #059669), animations (shimmer, pulse-dot, msg-in, fade-in, slide-up)
- Updated `src/app/globals.css` - glass morphism (.glass, .glass-strong, .glass-accent, .bento-card), buttons (.btn-primary, .btn-secondary, .btn-ghost), navigation (.nav-item, .nav-item-active), dark theme, scrollbar, status indicators
- **Decision**: used CSS @layer components for reusable glass styles instead of Tailwind plugin - simpler, no extra deps
- **Files**: tailwind.config.js, globals.css

### [DONE] Created API client library
- Created `lib/api.ts` - typed API client with interfaces for Auth, Stats, Vacancies, Resumes, Negotiations, Settings
- Uses relative paths (/api/...) via Next.js rewrites to avoid CORS
- **Decision**: relative paths instead of direct BACKEND_URL - avoids CORS config, works through Next.js proxy

### [DONE] Created shared components
- `components/nav.tsx` - sidebar navigation with 6 sections, inline SVG icons (no external deps), active state highlighting
- `components/auth-guard.tsx` - protects dashboard routes, redirects to /login if not authenticated
- `components/loading.tsx` - CardSkeleton, RowSkeleton, FullPageLoader, InlineLoader, ErrorBlock

### [DONE] Created all pages (7 routes)
| Route | File | Purpose |
|---|---|---|
| /login | app/login/page.tsx | Email/password form, CAPTCHA display, 2FA input, polling auth status |
| /dashboard | app/dashboard/page.tsx | KPI cards (vacancies, applied, responses, interviews), HH.ru connection status, activity log |
| /dashboard/vacancies | app/dashboard/vacancies/page.tsx | Search input, vacancy list with match score, company/salary info |
| /dashboard/chat | app/dashboard/chat/page.tsx | Employer conversations list with last message preview |
| /dashboard/resume | app/dashboard/resume/page.tsx | Resume cards with skills tags, sync from HH.ru button |
| /dashboard/analytics | app/dashboard/analytics/page.tsx | Application funnel bar chart, key metrics grid |
| /dashboard/settings | app/dashboard/settings/page.tsx | Search params, min match score slider, auto-apply toggle, apply mode select |

### [DONE] Restructured directory for Next.js App Router
- **Problem**: `next build` failed with "Couldn't find any pages or app directory"
- **Cause**: layout.tsx, page.tsx were at project root (src/app/) instead of inside app/ subdirectory
- **Fix**: moved all route files into `app/` subdirectory: `src/app/app/layout.tsx`, `src/app/app/page.tsx`, etc.
- **Result**: `next build` succeeded - 14 routes, 0 errors, TypeScript types valid

### [DONE] Build verification
- `npx next build` - Compiled successfully, all 14 routes generated
- First Load JS shared: 87.3 kB
- 3 API routes (dynamic), 11 pages (static prerendered)

### [DONE] Cleaned up duplicate files
- Removed old login/, dashboard/, api/ directories from src/app root after restructuring

### [DONE] Dev server verified
- `npx next dev -p 3000` runs successfully
- Server responds 200 on both / and /login
- CSS (32KB) served correctly with all custom classes verified in compiled output

### [DONE] /login 404 fix
- **Cause**: stale .next build cache from before restructuring
- **Fix**: deleted .next directory, restarted dev server
- **Result**: /login returns 200 with "Sign in to HH.ru" form

### [DONE] Python dependencies installed
- pip pypi.org was timing out / connection reset
- **Solution**: used Tsinghua mirror `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple`
- Installed: sqlalchemy, aiosqlite, pydantic-settings, python-dotenv, loguru, httpx, playwright, openai, email-validator, bcrypt

### [DONE] Python backend started
- `uvicorn src.api.app:app --port 8000 --reload` runs, /api/health returns 200

---

## Session 3 (2026-06-09) - Full Audit

### [AUDIT] Root cause of all 500 errors found

**Problem**: Every backend endpoint returns HTTP 500 "Internal Server Error" (generic, no detail).

**Root cause**: Database schema does not match ORM models.

**Specific mismatch in `users` table**:
- ORM model `User` in `src/db/models.py` defines columns: `email`, `password_hash`, `name`
- These 3 columns are MISSING from the actual SQLite database `data/hh_bot.db`
- `sqlite3.OperationalError: no such column: users.email`
- SQLAlchemy tries `SELECT users.email, users.password_hash, users.name, ...` which fails

**Why**: The ORM model was updated (previous agent added email/password auth fields) but `init_db()` only creates tables that don't exist yet. It does NOT alter existing tables to add new columns. The `users` table was created with the old schema (telegram-only auth) and never migrated.

### [AUDIT] Complete schema diff

**users table - Missing columns (ORM has, DB lacks)**:
- `email` VARCHAR(200)
- `password_hash` VARCHAR(256)
- `name` VARCHAR(200)

**All other tables**: `resumes`, `vacancies`, `negotiations`, `user_settings`, `activity_log` - schemas match ORM.

### [AUDIT] Frontend <-> Backend API contract mismatch

The frontend `lib/api.ts` TypeScript interfaces do NOT match the backend response schemas in `src/api/schemas.py`.

| Endpoint | Frontend expects (TS) | Backend returns (Py) | Match? |
|---|---|---|---|
| GET /api/auth/status | `{connected, email, last_verified}` | `{connected, email, tokenExpiry, authMethod}` | PARTIAL - field names differ |
| GET /api/stats | `{total_vacancies, total_applications, total_responses, ...}` | `{stats: {totalVacancies, appliedToday, ...}, chartData, activityLog}` | NO - different structure and field names |
| GET /api/vacancies | `{vacancies: [...], total, page, per_page}` | `{vacancies: [...], resumeTitle}` | NO - no pagination fields |
| GET /api/resumes | `Resume[]` (flat array) | `ResumeResponse[]` (different field names, camelCase via alias) | PARTIAL - field naming |
| GET /api/negotiations | `Negotiation[]` with `messages` array | `NegotiationResponse[]` with different structure | PARTIAL |
| GET/PUT /api/settings | `{search_text, search_area, experience, min_match_score, apply_mode, auto_apply}` | `{mode, careerDirection, letterTone, dailyLimit, searchInterval, minMatchScore}` | NO - completely different fields |

**Conclusion**: Frontend was built based on assumed/guessed API contracts. The real backend uses different field names, different nesting, and different data shapes.

### [AUDIT] Database state

Existing data in `data/hh_bot.db`:
- 1 user (id=1, telegram_id=0, email=sts8987@gmail.com, is_authorized=0)
- 2 resumes (demo_r1: "Python Developer / Fullstack", demo_r2: "DevOps")
- 16 vacancies, 1 user_settings, 5 negotiations, 7 activity_log entries

### [AUDIT] Critical path analysis

For the app to work end-to-end, this chain must function:
1. User opens /login -> Next.js renders form -> OK (working)
2. User submits email/password -> Next.js proxies to backend -> Backend starts Playwright -> needs Playwright browsers installed
3. Playwright not installed: `playwright install chromium` required (large download ~200MB)
4. Backend returns auth status -> Frontend shows dashboard -> BLOCKED by DB schema mismatch
5. Dashboard loads stats/vacancies -> BLOCKED by API contract mismatch

---

## Proposed Action Plan (NOT YET STARTED)

### Priority 1: Fix database schema (unblocks everything)
- Add missing columns `email`, `password_hash`, `name` to `users` table via ALTER TABLE
- Verify all other tables match
- Risk: LOW (additive columns, no data loss)

### Priority 2: Align frontend API client with backend schemas
- Option A: Change frontend lib/api.ts to match backend response shapes
- Option B: Change backend schemas/responses to match what frontend expects
- Recommendation: Option A (change frontend) - less risky, backend is already internally consistent

### Priority 3: Install Playwright browsers
- `playwright install chromium` needed for actual login flow
- Large download, network-dependent

### Priority 4: End-to-end test
- Start both servers
- Login page -> submit -> verify dashboard loads

---

## Current State

### Frontend (Next.js) - RENDERING OK, DATA BROKEN
- Dev server: http://localhost:3000
- All pages render visually
- /login form visible and functional
- Cannot load real data because backend returns 500 (DB schema mismatch)

### Backend (Python FastAPI) - STARTED BUT BROKEN
- uvicorn running on port 8000
- /api/health returns 200
- All data endpoints return 500 (sqlite3.OperationalError: no such column: users.email)
- Root cause: DB schema missing 3 columns in users table

### Database
- SQLite at data/hh_bot.db
- Schema outdated vs ORM models (missing email, password_hash, name in users)
- Has seed data that's usable once schema is fixed

### Blockers (ordered by priority)
1. DB schema mismatch -> all endpoints 500
2. Frontend/backend API contract mismatch -> data won't render even when endpoints work
3. Playwright browsers not installed -> actual HH.ru login won't work
