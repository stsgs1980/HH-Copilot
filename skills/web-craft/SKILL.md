---
name: web-craft
description: "Orchestrate the right combination of frontend skills for any web development task. Use this skill when the user asks to build a website, web app, landing page, dashboard, admin panel, portfolio, or any web project and you need to determine which specialist skills to combine. Also use when the user's request spans multiple concerns: backend + design + polish, or when you're unsure which of the three web skills (fullstack-dev, frontend-design, frontend-styling-expert) to invoke. This skill routes and coordinates — it does NOT replace the specialist skills."
license: MIT
---

# Web Craft — Frontend Skill Orchestrator

This skill is a lightweight routing layer that determines the right combination of specialist skills for any web development task. It does not contain domain expertise itself — it coordinates three specialist skills:

| Skill | Domain | What It Owns |
|-------|--------|-------------|
| **fullstack-dev** | Architecture & Backend | Next.js 16, Prisma, API routes, WebSocket, auth, deployment |
| **frontend-design** | Visual Direction & Systems | Design tokens, aesthetic choices, typography, color, composition |
| **frontend-styling-expert** | CSS Polish & Accessibility | Responsive, animations, WCAG, hover/focus, dark mode, cross-browser |

---

## Routing Table

### Decision Flow

```
User request
    │
    ├── Needs backend/database/API? ─── YES ──→ fullstack-dev
    │
    ├── Needs visual direction / design from scratch? ─── YES ──→ frontend-design
    │
    └── Needs CSS polish / responsive / accessibility? ─── YES ──→ frontend-styling-expert
```

Ask all three questions. The answer determines the combination.

### Scenario → Skill Combination

| Scenario | Skills | Order |
|----------|--------|-------|
| 🏗 Full web app (new project) | fullstack-dev + frontend-design + styling-expert | Architecture → Design → Polish |
| 🎨 Landing page / portfolio | frontend-design + styling-expert | Design → Polish |
| 📊 CRUD admin panel | fullstack-dev + styling-expert | Architecture → Polish |
| ⚙️ API + backend only | fullstack-dev | Solo |
| 🎨 Design system / token library | frontend-design | Solo |
| 🔧 CSS fix / responsive tweak | styling-expert | Solo |
| ♿ Accessibility audit / fix | styling-expert | Solo |
| 🌙 Dark mode implementation | styling-expert | Solo (or + frontend-design if starting from scratch) |
| 🔄 Rebrand / redesign existing app | frontend-design + styling-expert | Design → Polish |
| 📱 Mobile-first responsive build | frontend-design + styling-expert | Design → Polish |
| 🎮 Real-time app (chat, collab) | fullstack-dev + frontend-design + styling-expert | Architecture → Design → Polish |

---

## How to Orchestrate

### When Only One Skill Is Needed

Invoke the single skill directly. No coordination overhead.

```
User: "Fix the mobile layout on my dashboard"
→ styling-expert only
```

### When Two Skills Are Needed

Invoke the primary skill first, then the secondary. Pass context from the first to the second.

```
User: "Build a modern landing page for my startup"
→ 1. frontend-design (establish tokens, aesthetic, components)
→ 2. styling-expert (responsive polish, accessibility, animations)
```

**Context passing between skills:**
When transitioning from one skill to the next, carry forward:
- Design tokens defined by `frontend-design` → used by `styling-expert`
- Component structure from `frontend-design` → polished by `styling-expert`
- API routes from `fullstack-dev` → consumed by `frontend-design` components
- Database schema from `fullstack-dev` → shapes `frontend-design` data display

### When All Three Are Needed

Follow the natural build order:

```
1. fullstack-dev → Project structure, schema, API, auth
2. frontend-design → Visual system, tokens, component design
3. styling-expert → Responsive, animations, accessibility, polish
```

**Why this order?**
- Architecture decisions constrain design (SSR vs CSR, data shape, routing)
- Design decisions constrain polish (token system, component variants)
- Polish is always last — it refines what already exists

---

## Ambiguity Resolution

When the user's request is unclear, use these heuristics:

| Ambiguous Request | Likely Intent | Skills |
|------------------|---------------|--------|
| "Make a website" | Full project | fullstack-dev + frontend-design + styling-expert |
| "Make it look better" | Visual redesign | frontend-design + styling-expert |
| "Fix this page" | Could be anything | Ask: "Is this a CSS/layout issue, or does the design need rethinking?" |
| "Build a dashboard" | Full app with data | fullstack-dev + frontend-design + styling-expert |
| "Add dark mode" | CSS-level change | styling-expert |
| "Redesign my app" | Visual overhaul | frontend-design + styling-expert |
| "Make it responsive" | CSS fix | styling-expert |
| "Create a beautiful UI" | Design from scratch | frontend-design + styling-expert |

**Golden rule**: When in doubt, ask the user one clarifying question:
- "Is this about **how it works** (backend), **how it looks** (design), or **how it feels** (polish)?"

---

## Skill Boundaries (Avoid Overlap)

| Task | Primary Owner | Others Stay Out |
|------|--------------|----------------|
| Prisma schema | fullstack-dev | frontend-design doesn't touch it |
| API route handler | fullstack-dev | styling-expert doesn't touch it |
| Design token definition | frontend-design | styling-expert uses them, doesn't redefine |
| Color palette choice | frontend-design | styling-expert implements, doesn't choose |
| Animation timing/easing | styling-expert | frontend-design defines motion tokens |
| Responsive breakpoints | styling-expert | frontend-design defines layout intent |
| Accessibility audit | styling-expert | frontend-design ensures structural a11y |
| Component variants | frontend-design | styling-expert adds hover/focus states |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│                  WEB-CRAFT ROUTER                    │
├─────────────┬──────────────┬────────────────────────┤
│  Question   │    Answer    │      Activate          │
├─────────────┼──────────────┼────────────────────────┤
│ Backend?    │     YES      │ fullstack-dev          │
│ Design?     │     YES      │ frontend-design        │
│ Polish?     │     YES      │ styling-expert         │
├─────────────┼──────────────┼────────────────────────┤
│ Backend +   │              │                        │
│ Design +    │     ALL      │ All three, in order    │
│ Polish?     │              │                        │
├─────────────┼──────────────┼────────────────────────┤
│ Only one?   │              │ That skill, solo       │
└─────────────┴──────────────┴────────────────────────┘
```

---

## What This Skill Does NOT Do

- ❌ Write code directly (delegate to specialist skills)
- ❌ Replace any of the three specialist skills
- ❌ Make design or architecture decisions (that's the specialists' job)
- ❌ Store design tokens or component code
- ❌ Duplicate content from companion skills

This skill is a **router and coordinator only**. Its value is in knowing *which* skills to combine and *in what order*, not in doing the work itself.

---

**Version**: 1.0.0
**License**: MIT
