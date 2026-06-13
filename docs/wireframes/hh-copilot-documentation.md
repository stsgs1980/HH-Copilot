# HH Copilot — UI Prototype Documentation

## Project Overview

**HH Copilot** is a Chrome extension for automating job search on hh.ru. The product consists of two main interfaces: a promotional landing page and the extension's working FAB panel, which overlays on top of the hh.ru website. This documentation describes the content and intended functionality of the two HTML prototypes.

---

## 1. File: `hh-copilot-fab-panel-wireframe.html`

**Purpose:** Interactive wireframe (mockup) of the slide-out side panel of the HH Copilot Chrome extension. Simulates the extension's operation on top of the hh.ru page.

**Tech Stack:**
- Tailwind CSS (CDN) + custom CSS
- Font: Inter (Google Fonts)
- Dark/light theme via `.dark` class on `<html>`
- Glass-morphism (backdrop-filter) for panel background
- Vanilla JavaScript for interactivity

**Context:** The background displays a simulation of the hh.ru vacancy search page with three demo vacancy cards (Yandex 87%, Sber 62%, Lebedev 18%). Each card contains the job title, company, city, salary range, and skill tags with color-coded match-score indicators.

### 1.1. FAB Button (Floating Action Button)

| Element | Description |
|---------|-------------|
| Position | Fixed, bottom-right (28px from edges) |
| Size | 56×56px, border-radius 18px |
| Style | Gradient #059669 → #10B981, green shadow |
| Badge | Red circle with number (23) — notification counter |
| Open animation | `translateX(100%)` → `translateX(0)`, cubic-bezier 0.35s |
| Tooltip | On hover: "HH Copilot" |

### 1.2. Panel Structure (420px, right-aligned)

The panel has three zones:
1. **Header (shrink-0)** — authentication, title, tab navigation
2. **Content (flex-1, scrollable)** — content of the active tab
3. **Footer (shrink-0)** — version and status

---

### Tab 1: Overview

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Authentication status | Session check on hh.ru | Two states: "Authenticated" (green) and "Sign in to hh.ru" (red, lock icon). "Check" button |
| KPI cards (2×2 grid) | Today's metrics | Applications today (23), Invitations (5), Errors (1, with type 429 Rate limit), Total applications (147, +12% for the week) |
| Daily limit | Limit usage progress bar | Daily: 23/200, Hourly: 23/30, countdown to next application (12 sec) |
| Adaptive slowdown | Detection protection | Burst detection (0/5 in a row), Adaptive factor (1.0x) — dynamically increases intervals during a series of rapid requests |
| Auto-apply | Mass submission of applications | Status ("Stopped"), "Apply to all" button, pause button, filter: new + score ≥ 70%, queue with preview (8 vacancies sorted by score descending) |
| Recent activity | Action log | List of 5 most recent events with color coding: applications (green), pauses (yellow), errors (red), invitations (blue) and relative timestamps |

---

### Tab 2: Resume

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Resume data | Profile parsing | Automatic collection: job title, city, salary range, experience. Source: `/applicant/resumes` |
| Skills | Skills extraction | Skill tags from resume: React, TypeScript, Next.js, JavaScript, Redux, Webpack, CI/CD, Module Federation, GraphQL, Testing |
| Work experience | Timeline | Chronology of positions with company, period, and brief description (timeline with line and dots) |
| Skill Gap Analysis | Skill gap analysis | Top 5 missing skills compared to the market: React Testing Library (78%), Node.js (65%), Docker (52%), Tailwind CSS (41%), AWS/Cloud (38%). Color indicators: red (>60%), yellow (40-60%) |
| "Refresh" button | Re-parsing | Re-request resume data from hh.ru |

---

### Tab 3: Vacancies

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Search | Text filter | Full-text search by vacancy title |
| Status filter | Dropdown | Filtering: All / New / Applied / Blacklist |
| Score filter | Range slider | Minimum match-score threshold (0-100%) |
| Vacancy card | Display with matching | Title, company, city, salary, experience, skill tags, badge with % |
| Matching breakdown | Scoring details | 5 metrics: Skills (90%), Salary (85%), Experience (75%), Position (70%), Location (100%) |
| "Apply" button | Manual application | Triggers step-by-step process (modal window) |
| Ban button | Blacklist | Add company to BL with ban icon |
| Shimmer effect | Highlight recommended | Shimmer animation for high-score vacancies that haven't been applied to yet |
| Vacancy states | Visual statuses | Already applied (green badge), Low match (grey disabled button), In blacklist (strikethrough, semi-transparent, "BL" badge) |

---

### Tab 4: Negotiations

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Dialog list | Chat with employers | Avatar (initials), company name and contact person, last message preview, relative time |
| New badge | Unread indicator | Counter "2 new messages" |
| Negotiation status | Categorization | Invitation, Interview, Dialogue, Waiting, Rejection — color-coded tags |
| Click on dialog | Open chat | `cursor: pointer` + hover effect |
| "Refresh" button | Synchronization | Re-request negotiation list |

---

### Tab 5: Settings

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Operation mode | Mode selection | Three modes: Manual (manual application), Semi-auto (confirmation for each), Auto (fully automatic). Visual selector with icons |
| Limits and thresholds | Rate limiting configuration | 4 sliders: daily limit (10-500, default 200), hourly limit (5-60, default 30), minimum interval in seconds (10-120, default 30), minimum match score (0-100%, default 70%) |
| Cover letter | Template with variables | Text field with template, tone selection dropdown (Formal / Confident / Friendly). Variables: `{name}`, `{position}`, `{company}`, `{skills}`, `{experience}` |
| Typing simulation | Input simulation | Character-by-character input to bypass bot detection (described in tooltip) |
| Toggles | Feature on/off | 5 switches: Show match score, Auto-scroll pagination, Application confirmation, Hide blacklist, Panel dark theme |
| Blacklist | BL management | List of blocked companies with removal option. Count indicator |

---

### Tab 6: Logs

**Intended functionality:**

| Block | Function | Details |
|-------|----------|---------|
| Statistics (2×2) | Today's summary | Applications, Invitations, Errors, Total applications |
| Limit progress | Usage visualization | Progress bar 23/200 (11.5%), resets at 00:00 MSK, current adaptive factor |
| Funnel | Conversion funnel | 5 stages: Views (1240) → Applications (147) → Invitations (23) → Interviews (8) → Offers (2). Horizontal progress bars with numbers |
| Logs | Event journal | Filtering by levels: All / Info / Warn / Error. Color indicators: SUCCESS (green), INFO (blue), WARN (yellow), ERROR (red). Each log with timestamp |
| "Clear" button | Log reset | Clear event journal |

---

### Modal Window: Application Process

**Intended functionality:**

| Element | Description |
|---------|-------------|
| Title | "Apply to vacancy" with close button |
| Info block | Vacancy title, score, link to `/vacancy/{id}` |
| Step-by-step process | 5 steps: (1) Navigate to vacancy page, (2) Click "Apply", (3) Fill in cover letter, (4) Handle alerts (relocation), (5) Submit and verify |
| Progress bar | Current step visualization |
| Buttons | "Simulate application" (green) and "Cancel" |

---

### JavaScript Functionality (wireframe)

| Function | Description |
|----------|-------------|
| `togglePanel()` | Open/close panel, toggle overlay |
| `switchTab(tabId)` | Switch tabs, update button active states |
| `toggleAuth()` | Toggle between authentication states |
| `toggleAutoApply()` / `pauseAutoApply()` | Start/pause auto-apply, show/hide queue |
| `manualApply(el, name)` | Open application modal window |
| `simulateApply()` | Simulate step-by-step application process with step animations |
| `closeApplyModal()` | Close modal window |
| `addToBlacklist(company)` / `removeFromBlacklist(company)` | Blacklist management |
| `setMode(mode)` | Switch operation mode (manual/semi/auto) |
| `filterLogs(level)` | Filter logs by level |

---

## 2. File: `hh-copilot-landing.html`

**Purpose:** Promotional landing page for the HH Copilot product. Dark theme, SaaS styling.

**Tech Stack:**
- Pure CSS (no frameworks), CSS variables for design tokens
- Font: Manrope (Google Fonts), weights 200-900
- SVG icons inline (no icon libraries)
- Vanilla JavaScript for animations and interactivity
- `prefers-reduced-motion` — disables animations when system setting is active

**Design System:**
- Background: `#0a0a0c` (near-black)
- Accent: `#059669` / `#10B981` (emerald green)
- Glass-morphism: semi-transparent cards with `backdrop-filter: blur`
- Noise-overlay: textured noise over the entire page (opacity 3.5%)
- Cursor-glow: green glow with 600px radius, following the cursor
- Scroll reveal: appearance animation on scroll via IntersectionObserver

---

### Section: Navbar (fixed)

| Element | Description |
|---------|-------------|
| Logo | "HC" icon (38×38px, green gradient) + "HH Copilot" text |
| Navigation | 4 links: Features, Pricing, FAQ, How It Works |
| CTA button | "Try for free" (green gradient) |
| Responsiveness | At ≤768px: hamburger menu → fullscreen mobile menu with blur background |
| Style | `backdrop-filter: blur(24px)`, semi-transparent background, border-bottom |

---

### Section: Hero

| Element | Description |
|---------|-------------|
| Badge | "AI assistant for job search on HH.ru" with pulsing green dot |
| Heading | "Find a job **10x faster**" (gradient text) |
| Subheading | Product description: auto-apply, AI correspondence, matching, analytics |
| Buttons | "Try for free" (primary) + "How it works" (outline, link to #how) |
| Panel layout | Glass-card with interface mockup: logo, "Online" status, tabs (Overview, Vacancies, Negotiations, Statistics), KPI cards (127 applications, 23 invitations, 89% matching), AI chat (application suggestion, user confirmation) |
| Background effects | 3 radial-gradient spots (mesh-1, mesh-2, mesh-3) with blur 80-100px |
| Scroll indicator | "scroll down" with animated line |
| Responsiveness | ≤1024px: single-column layout, ≤480px: buttons stacked vertically, h1 = 2rem |

---

### Section: Stats (metrics)

| Metric | Value | Description |
|--------|-------|-------------|
| Users | 12,847 | Number of product users |
| Applications sent | 340K | Total number of submitted applications |
| Receive offer | 89% | Offer conversion rate |
| Rating | 4.9 | Chrome Web Store rating |

- Counter animation when entering viewport (easeOutCubic)
- Responsiveness: 4 columns → 2 → 1

---

### Section: Marquee (scrolling ticker)

Infinite horizontal scroll with key product technologies:
`Auto Apply`, `Chatik API`, `AI Interview`, `Smart Replies`, `Analytics`, `Typing Simulation`, `Rate Limiting`, `Skill Matching`, `HH.ru Integration`, `CAPTCHA Detection`.

Content duplication for seamless loop. Speed: 30s per full cycle.

---

### Section: Features

6 cards in a 3×2 grid with hover effects (elevation, rotation, cursor-following glow):

| # | Feature | Description |
|---|---------|-------------|
| 1 | Auto-apply | AI analyzes vacancies and submits applications with personalized cover letters based on your resume |
| 2 | AI correspondence | Reading messages in Chatik, generating response options, adapting to the interlocutor's tone |
| 3 | Smart matching | Weighted skill comparison, scoring 0-100%, threshold 87%+ for auto-apply |
| 4 | Analytics and statistics | Application conversion, response funnel, daily limits, charts and metrics |
| 5 | Ban protection | Rate limiting (200/day, 30/hour, from 30s), typing simulation, burst detection, CAPTCHA detection |
| 6 | Privacy | Local data processing, 152-FZ compliance |

- Each card contains an icon, title, description, and "Learn more" link
- `radial-gradient` effect behind cursor (CSS variables `--mx`, `--my`)
- Responsiveness: 3 → 2 → 1 column

---

### Section: How It Works

4 steps in a grid with connecting lines:

| Step | Title | Description |
|------|-------|-------------|
| 1 | Install the extension | Add to Chrome in 1 click, setup < 1 minute |
| 2 | Connect HH.ru | OAuth authorization, automatic profile synchronization |
| 3 | Set up filters | Salary, location, skills, blacklist |
| 4 | Start auto-search | AI submits applications 24/7, user accepts invitations |

**Timeline card** (horizontal chain):
Connection (1 click) → Parsing (30 sec) → Matching (AI scoring) → Application (auto) → Interview (tips)

- Responsiveness: ≤1024px: 2 columns (no lines), ≤768px: 1 column, timeline vertical

---

### Section: Product Preview (Control Panel)

Panel mockup inside a decorative browser frame:

| Element | Description |
|---------|-------------|
| Browser frame | Chrome window simulation (red/yellow/green dots, URL bar "hh.ru — HH Copilot Panel") |
| Panel header | "HC" logo, name, "Online" status |
| Tabs | Overview, Resume, Vacancies, Negotiations, Settings, Statistics |
| KPI ring | SVG progress ring (127/200), green gradient |
| KPI cards (2×2) | Sent today (127), Invitations (23), Replies (45), Awaiting reply (59) |
| Caption | "750px panel with 6 tabs and 16 features" |

---

### Section: Pricing

3 pricing plans in a grid:

| Parameter | Free | Pro | Business |
|-----------|------|-----|----------|
| Price | 0 ₽/mo | 990 ₽/mo | 2,990 ₽/mo |
| Period | Free forever | Cancel anytime | Custom terms |
| Applications | 20/day | Unlimited | Unlimited |
| AI auto-apply | No | Yes | Yes |
| AI correspondence | No | Yes | Yes |
| Analytics | Basic | Advanced | Advanced |
| Typing simulation | No | Yes | Yes |
| Support | Basic | Priority | Personal manager |
| API access | No | No | Yes |
| SSO | No | No | Yes |
| White-label | No | No | Yes |
| Team dashboard | No | No | Yes |

**Period switch:** Month / Year (30% discount). Toggle switch with ARIA attributes and keyboard support (Enter/Space). Middle plan marked with "Popular" badge.

---

### Section: Testimonials

3 user review cards (5 stars each):

| Author | Role | Review text |
|--------|------|-------------|
| Alexey K. | Frontend Developer | Offer from Yandex in 5 days, AI stood out among 200 candidates |
| Maria S. | Product Manager | 340 applications in a week, 12 invitations, AI correspondence in Chatik |
| Dmitry V. | Backend Developer | AI tips during interview in real time, offer the next day |

---

### Section: FAQ (Frequently Asked Questions)

6 accordion questions with aria-expanded:

| # | Question | Brief answer |
|---|----------|--------------|
| 1 | Is it safe to use the extension? | All data is local, 152-FZ compliant |
| 2 | Will HH.ru ban me for auto-apply? | Rate limiting, typing simulation, burst detection |
| 3 | How does AI correspondence work? | Chatik API, 3 context sources, tone adaptation |
| 4 | How many applications can I submit? | 20/day (free), 200/day (pro) |
| 5 | Is the mobile version supported? | Chrome desktop only, PWA planned |
| 6 | Can I get a refund? | 14-day guarantee, 100% refund |

---

### Section: Final CTA

| Element | Description |
|---------|-------------|
| Heading | "Ready to find the perfect job?" |
| Subheading | 12,000+ users found their dream job |
| Button | "Start for free" |
| Caption | No credit card, setup in 2 minutes, cancel anytime |
| Background | Radial-gradient glow effect |

---

### Footer

| Column | Links |
|--------|-------|
| Brand | "HC" logo + product description |
| Product | Features, Pricing, Chrome Web Store, Updates |
| Company | About us, Blog, Careers, Contacts |
| Support | Documentation, FAQ, Telegram, Email |

---

### JavaScript Functionality (landing)

| Function | Description |
|----------|-------------|
| Cursor glow | `mousemove` tracking, show/hide cursor glow |
| Feature card glow | Update CSS variables `--mx`/`--my` on card hover |
| Scroll reveal | IntersectionObserver for element appearance animation |
| Stats counter | Animate numbers from 0 to `data-target` with easeOutCubic |
| Hamburger menu | Open/close mobile menu, close on link click |
| FAQ accordion | Expand/collapse answers, aria-expanded, close others simultaneously |
| Pricing toggle | Switch month/year, recalculate prices (990 → 693), keyboard accessible |
| Smooth scroll | Smooth scrolling to anchors |
| Nav CTA hide | Hide CTA button in navbar on scroll down |

---

## Functionality Summary Table

| Functional area | Wireframe (FAB Panel) | Landing |
|-----------------|----------------------|---------|
| hh.ru authentication | Yes (2 states) | Described in "How It Works" |
| Resume parsing | Yes ("Resume" tab) | Mentioned |
| Skill Gap Analysis | Yes (top 5 missing skills) | No |
| Vacancy parsing | Yes ("Vacancies" tab) | Described |
| Match scoring | Yes (5 metrics breakdown) | Yes (87%+ description) |
| Manual application | Yes (button + modal with 5 steps) | No |
| Auto-apply | Yes (queue, filters, pause) | Yes (description) |
| Blacklist | Yes (add/remove, filtering) | Mentioned in "How It Works" |
| Negotiations | Yes (dialog list, statuses) | Yes (AI correspondence) |
| AI correspondence | No (dialog list only) | Yes (description + mockup in Hero) |
| Rate limiting | Yes (daily/hourly, adaptive factor, burst detection) | Yes (description in "Ban Protection") |
| Typing simulation | Yes (described in settings) | Yes (mentioned in marquee and features) |
| CAPTCHA detection | No | Mentioned in marquee |
| Conversion funnel | Yes (5 stages with numbers) | No (description only) |
| Logs and debugging | Yes (4 levels, filtering) | No |
| Cover letter template | Yes (textarea + variables + tones) | Mentioned in features |
| Operation modes | Yes (manual/semi/auto) | No |
| Pricing plans | No | Yes (3 plans with details) |
| Testimonials | No | Yes (3 reviews) |
| FAQ | No | Yes (6 questions) |
| Dark/light theme | Yes (toggle) | No (dark only) |
