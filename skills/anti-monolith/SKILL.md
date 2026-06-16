---
name: anti-monolith
version: 1.9.44.026
compatibility: both
description: "Modular architecture enforcement. Automatically activates when files exceed size limits, components have too many hooks, or code structure violates FSD/layer boundaries. Refactors monoliths into composable, testable modules using a 7-step decomposition strategy. Triggers: file > 250 lines, component > 200 lines, 3+ useState in one component, upward layer imports, mixed concerns in a single file. This skill MUST auto-activate whenever the agent encounters these patterns during ANY task — the agent does not need to be explicitly asked to refactor."
id: ZAI-ARCH-002
author: STS
trigger: monolith, refactor, file too long, too many lines, too many hooks, useState overload, decompose, split component, extract hook, split file, modular architecture, FSD, layer violation, clean architecture, separation of concerns, 250 lines, 200 lines, file exceeds limit
license: MIT
---

# Skill: Anti-Monolith v1.0

> ID: ZAI-ARCH-002
> Version: 1.0
> Last Updated: 2026-05

This skill enforces modular architecture by detecting and decomposing monolithic code. It activates automatically when size or complexity thresholds are exceeded, applying a systematic 7-step refactoring strategy to transform large, tangled files into small, composable, testable modules.

---

## AUTO-ACTIVATION RULES

**This skill MUST activate automatically whenever ANY of these conditions are detected during ANY task:**

| Condition | Threshold | Severity |
|-----------|-----------|----------|
| File exceeds 250 lines | 250 lines | [C] Critical |
| Component exceeds 200 lines | 200 lines | [C] Critical |
| 3+ `useState` in one component | 3 hooks | [W] Warning |
| Upward layer imports (features -> sections) | 1 violation | [C] Critical |
| Mixed concerns in single file (data + UI + logic) | 2+ concerns | [W] Warning |
| Single function exceeds 50 lines | 50 lines | [I] Info |
| Component renders 4+ sub-sections inline | 4 sections | [W] Warning |
| `useEffect` with 3+ dependencies | 3 deps | [I] Info |

**Auto-trigger phrases (agent should recognize these patterns in ANY context):**
- Writing a file that goes past 250 lines
- Adding the 3rd `useState` to a component
- Importing from a higher layer
- A `page.tsx` that contains business logic
- A component that both fetches data AND renders UI

**The agent MUST NOT wait to be asked. When a threshold is crossed during ANY work, the agent MUST:**
1. STOP writing the monolith
2. Announce: `[ANTI-MONOLITH] Threshold exceeded: <reason>`
3. Apply the 7-step decomposition (see below)
4. Continue the task with decomposed modules

---

## When to Use This Skill

**MUST apply this skill when:**
- Writing a file that approaches or exceeds size limits
- A component accumulates too many hooks or concerns
- Layer boundaries are violated (upward imports, cross-concern access)
- User explicitly asks to "refactor", "split", "decompose", "modularize"
- Code review reveals monolithic patterns
- Starting a new file that will clearly exceed limits (plan decomposition upfront)

**DO NOT use for:**
- Configuration files (next.config.ts, tailwind.config.ts) — these are naturally long
- Auto-generated files (prisma schema, API types)
- Test files with many test cases
- CSS/utility files that are inherently flat

---

## The 7-Step Decomposition Strategy

When a monolith is detected, apply these steps in order:

### Step 1: Identify Sub-Components

Scan the monolith for JSX blocks that could be independent components:

```text
LOOK FOR:
- Sections of JSX wrapped in <div> with a clear visual boundary
- Repeated UI patterns (cards, list items, form sections)
- Blocks with their own conditional rendering
- Sections that could have their own loading/error states

EXTRACT:
- Each becomes a new file in sections/ or features/
- Props replace direct state access
- Component name describes WHAT it renders, not HOW
```

**Example:**
```tsx
// BEFORE: 200-line monolith page.tsx
export default function DashboardPage() {
  // ... 80 lines of state and handlers ...
  return (
    <div>
      {/* 40 lines: header with stats */}
      {/* 60 lines: chart section */}
      {/* 40 lines: recent activity table */}
    </div>
  )
}

// AFTER: 30-line composer
import { DashboardHeader } from './sections/dashboard-header'
import { DashboardChart } from './sections/dashboard-chart'
import { ActivityTable } from './sections/activity-table'

export default function DashboardPage() {
  const { stats, chartData, activity } = useDashboardData()
  return (
    <div>
      <DashboardHeader stats={stats} />
      <DashboardChart data={chartData} />
      <ActivityTable items={activity} />
    </div>
  )
}
```

### Step 2: Identify State Clusters

Group related `useState` calls and extract into custom hooks:

```text
LOOK FOR:
- 3+ useState in one component -> extract to use[Feature] hook
- useState pairs that always update together -> useReducer
- State that depends on other state -> derive with useMemo
- State for form handling -> extract to useFormValues hook

RULES:
- Max 2 useState per component (3rd = extract to hook)
- Related state must be in same hook
- Hook name starts with "use" and describes the domain
```

**Example:**
```tsx
// BEFORE: 5 useState in one component
const [name, setName] = useState('')
const [email, setEmail] = useState('')
const [errors, setErrors] = useState({})
const [isSubmitting, setIsSubmitting] = useState(false)
const [success, setSuccess] = useState(false)

// AFTER: extracted hook
function useContactForm() {
  // All 5 states live here
  return { name, email, errors, isSubmitting, success, submit, reset }
}

// Component uses clean hook
const form = useContactForm()
```

### Step 3: Identify Data Loading

Move data fetching to hooks or Server Components:

```text
LOOK FOR:
- useEffect with fetch/axios -> extract to SWR/React Query hook or Server Component
- Loading states tied to data fetching -> co-locate with data hook
- Error states for API calls -> co-locate with data hook
- Multiple useEffect for different data -> separate hooks

RULES:
- Client Components: use SWR or React Query hooks
- Server Components: fetch directly (no useEffect)
- Loading/error states belong with the data, not the UI
```

### Step 4: Classify Each Module

Determine where each extracted piece belongs:

```text
sections/ — Pure presentation, NO state:
  - DashboardHeader (receives stats as props)
  - DashboardChart (receives data as props)
  - ActivityTable (receives items as props)

features/ — Has state or business logic:
  - useDashboardData() (fetches + transforms data)
  - useContactForm() (form state + validation)
  - useNotifications() (real-time updates)

shared/ — Reusable across features:
  - StatCard (generic stat display)
  - DataChart (generic chart wrapper)
```

### Step 5: Add Dynamic Imports

For heavy dependencies that aren't needed on initial render:

```tsx
import dynamic from 'next/dynamic'

// Heavy chart library — load only when visible
const DashboardChart = dynamic(
  () => import('./sections/dashboard-chart').then(m => m.DashboardChart),
  { loading: () => <ChartSkeleton />, ssr: false }
)

// Editor — load on interaction
const CodeEditor = dynamic(
  () => import('./sections/code-editor').then(m => m.CodeEditor),
  { ssr: false }
)
```

**When to use dynamic imports:**
- Chart libraries (recharts, d3, chart.js)
- Code editors (monaco, codemirror)
- Media players
- Components below the fold
- Components behind interaction (modals, tabs)

### Step 6: Create Barrel Exports

Use explicit barrel exports for clean interfaces:

```tsx
// sections/index.ts — EXPLICIT exports (not export *)
export { DashboardHeader } from './dashboard-header'
export { DashboardChart } from './dashboard-chart'
export { ActivityTable } from './activity-table'
export { StatCard } from './stat-card'

// features/index.ts
export { useDashboardData } from './use-dashboard-data'
export { useContactForm } from './use-contact-form'
```

**Rules:**
- Use explicit exports for 10+ files in a directory
- `export *` is acceptable for < 10 files
- Barrel must be in `index.ts` at the directory root
- Consumers import from the barrel, not individual files

### Step 7: Verify Layer Separation

Run these checks after decomposition:

```text
LAYER RULES:
  app/        -> imports from features/, sections/, shared/
  features/   -> imports from sections/, shared/  (NEVER app/)
  sections/   -> imports from shared/ only        (NEVER features/ or app/)
  shared/     -> imports NOTHING from this project (only external libs)

VALIDATION:
  1. No upward imports (sections importing from features)
  2. No skip-level imports (sections importing from app)
  3. No circular dependencies
  4. Each file has a single responsibility
  5. Each component < 200 lines
  6. Each file < 250 lines
  7. Max 2 useState per component
```

**ESLint boundaries config** (add to project):
```js
// .eslintrc.js
rules: {
  'boundaries/element-types': [2, {
    default: 'allow',
    rules: [
      { from: 'sections', disallow: ['features', 'app'] },
      { from: 'shared', disallow: ['features', 'sections', 'app'] },
    ]
  }]
}
```

---

## Directory Structure After Decomposition

```text
app/dashboard/
  page.tsx              <- 30-50 line composer
  layout.tsx            <- Dashboard layout wrapper
  sections/
    dashboard-header.tsx   <- Pure UI, receives stats
    dashboard-chart.tsx    <- Pure UI, receives data
    activity-table.tsx     <- Pure UI, receives items
    stat-card.tsx          <- Shared reusable card
    index.ts               <- Barrel exports
  features/
    use-dashboard-data.ts  <- Data fetching hook
    use-contact-form.ts    <- Form logic hook
    index.ts               <- Barrel exports
  shared/
    format-date.ts         <- Shared utility
    constants.ts           <- Dashboard-specific constants
```

---

## Exception Handling

When decomposition is not practical:

1. **Document the exception** with a comment:
   ```tsx
   // [ANTI-MONOLITH EXCEPTION] Reason: Single-form wizard where
   // decomposition would break linear readability.
   // Tech Debt ticket: PROJ-123
   // Approved by: Tech Lead
   // Revisit date: 2026-Q3
   ```

2. **Exception is valid when:**
   - File is under 300 lines AND well-organized with clear sections
   - Decomposition would harm readability (linear flows, wizards)
   - Component is temporary/throwaway (prototype, demo)
   - Auto-generated code (Prisma client, OpenAPI types)

3. **Exception is NOT valid when:**
   - File exceeds 400 lines (no excuses, decompose)
   - Multiple developers need to edit the same file
   - Component has 5+ useState
   - Any test file for this component is also monolithic

---

## Companion Skills

| Companion Skill | When to Use | What It Covers |
|----------------|-------------|----------------|
| **fullstack-dev** | When decomposition requires new API routes or database changes | Backend architecture, API routes, Prisma schemas |
| **frontend-styling-expert** | When extracted components need polish or responsive adjustments | CSS, Tailwind, responsive, accessibility |
| **mermaid-diagrams** | When documenting the decomposed architecture | Architecture diagrams, dependency graphs |

---

## Quick Reference Card

```text
THRESHOLDS:
  File:     250 lines max (150 recommended)
  Component: 200 lines max (100 recommended)
  useState:  2 per component (3rd -> custom hook)
  Function:  50 lines max
  useEffect: 2 dependencies max (3+ -> refactor)

7 STEPS:
  1. Identify sub-components -> extract to sections/
  2. Identify state clusters -> extract to use[Feature] hooks
  3. Identify data loading -> Server Components or SWR hooks
  4. Classify: sections/ (no state) vs features/ (has state)
  5. Dynamic imports for heavy deps
  6. Barrel exports (explicit, not export *)
  7. Verify layer separation (no upward imports)

AUTO-ACTIVATE WHEN:
  - File crosses 250 lines
  - 3rd useState added
  - Upward import detected
  - Mixed concerns in one file
```

---

## Communication Style

This skill communicates in a direct, diagnostic style:
- Announce violations: `[ANTI-MONOLITH] File exceeds 250 lines (312 lines): decompose`
- Use severity tags: [C] Critical (must fix), [W] Warning (should fix), [I] Info (consider)
- Show before/after line counts: `DashboardPage: 312 lines -> 38 lines (composer) + 4 modules`
- No emoji — use text markers: [OK], [FAIL], [VIOLATION], [EXCEPTION]

---

## Related Standards

- **STD-FE-001** (FRONTEND_STANDARD.md): File size limits, FSD decomposition, exception format
- **STD-IMPL-001** (IMPLEMENTATION_ORDER.md): Large monolith file handling, priority-based fixes

---

Built with: Z.ai Agent Toolkit
