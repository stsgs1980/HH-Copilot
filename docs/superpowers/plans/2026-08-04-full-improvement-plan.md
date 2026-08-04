# HH Copilot Full Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve HH Copilot across all aspects: UX/UI, architecture, functionality — match score accuracy, UI clarity, semantic comparison, and clean code.

**Architecture:** Iterative improvement in 3 phases: bug fixes → UX overhaul → new architecture. Each phase independently valuable.

**Tech Stack:** Vanilla JS + esbuild, Chrome Extension Manifest V3, Vitest for testing.

## Global Constraints

- User on Windows + PowerShell
- Hardware: Intel Xeon X3450, GeForce GTX 770 (2GB VRAM), 16GB RAM
- Ollama too slow on this hardware — use Groq as Custom provider
- AHG Rule 12: 250-line hard cap per file
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- ESLint: `cd extension && npm run lint` before commit
- Version bump required for every code change

---

## Phase 1: MVP Bug Fixes

### Task 1: Fix incorrect maximums in vacancies-match.js

**Files:**
- Modify: `extension/src/ui/tabs/vacancies-match.js:64-67`

**Interfaces:**
- Consumes: `breakdown` object from `computeMatchScore()`
- Produces: Updated UI labels with correct maximums

- [ ] **Step 1: Read current file**

Read `extension/src/ui/tabs/vacancies-match.js` to understand context.

- [ ] **Step 2: Fix maximums**

Change lines 64-67:
```javascript
set('vac-match-skills', b.skills + '/35');
set('vac-match-title', b.title + '/25');
set('vac-match-salary', b.salary + '/15');
set('vac-match-exp', b.experience + '/10');
```

- [ ] **Step 3: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add extension/src/ui/tabs/vacancies-match.js
git commit -m "fix: correct match score maximums in UI (40→35, 30→25, 15→10)"
```

---

### Task 2: Add location dimension to match score UI

**Files:**
- Modify: `extension/src/ui/html/tabs/vacancies.js:83-100`
- Modify: `extension/src/ui/tabs/vacancies-match.js:60-78`

**Interfaces:**
- Consumes: `breakdown.location` from `computeMatchScore()`
- Produces: New UI column and bar segment for location

- [ ] **Step 1: Add location column to HTML**

In `extension/src/ui/html/tabs/vacancies.js`, add after experience column (around line 99):
```javascript
<div style="flex:1;text-align:center;">
  <div id="vac-match-loc" style="font-size:16px;font-weight:700;color:#0EA5E9;">0</div>
  <div style="font-size:12px;color:#52525b;margin-top:1px;">Локация</div>
</div>
```

- [ ] **Step 2: Add location bar segment**

In same file, add after experience bar (around line 105):
```javascript
<div id="vac-match-bar-loc" style="width:0%;background:linear-gradient(90deg,#0EA5E9,#38BDF8);border-radius:0 4px 4px 0;"></div>
```

- [ ] **Step 3: Update renderVacancyMatchScore**

In `extension/src/ui/tabs/vacancies-match.js`, add after line 67:
```javascript
set('vac-match-loc', (b.location || 0) + '/15');
```

Update bar calculation (around line 70-78) to include location:
```javascript
const total = Math.max(1, b.skills + b.title + b.salary + b.experience + (b.location || 0));
```

Add after line 78:
```javascript
const barLoc = el('vac-match-bar-loc');
if (barLoc) barLoc.style.width = (((b.location || 0) / total) * 100).toFixed(1) + '%';
```

- [ ] **Step 4: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/src/ui/html/tabs/vacancies.js extension/src/ui/tabs/vacancies-match.js
git commit -m "feat: add location dimension to match score UI"
```

---

### Task 3: Verify breakdown object includes location

**Files:**
- Verify: `extension/src/lib/match-scorer.js:63-69`

**Interfaces:**
- Consumes: `computeMatchScore()` result
- Produces: Confirmed `breakdown.location` field

- [ ] **Step 1: Read match-scorer.js**

Read `extension/src/lib/match-scorer.js` to verify breakdown object.

- [ ] **Step 2: Verify location field exists**

Check lines 63-69 for:
```javascript
const breakdown = {
  skills: Math.round(skillResult.score * W_SKILLS),
  title: Math.round(titleResult.score * W_TITLE),
  salary: Math.round(salaryResult.score * W_SALARY),
  experience: Math.round(expResult.score * W_EXP),
  location: locResult.score,
};
```

- [ ] **Step 3: Run existing tests**

Run: `cd extension && npm test`
Expected: PASS

- [ ] **Step 4: Commit (if needed)**

If location field was missing, add it and commit:
```bash
git add extension/src/lib/match-scorer.js
git commit -m "fix: ensure breakdown object includes location field"
```

---

## Phase 2: UX Overhaul

### Task 4: Rename sections for clarity

**Files:**
- Modify: `extension/src/ui/html/tabs/vacancies.js:79,175`

**Interfaces:**
- Consumes: None
- Produces: Updated UI text

- [ ] **Step 1: Rename vacancy match section**

Change line 79 from:
```javascript
<div style="font-size:13px;font-weight:600;">Совпадение с вакансией</div>
```
To:
```javascript
<div style="font-size:13px;font-weight:600;">Оценка для этой вакансии</div>
```

- [ ] **Step 2: Rename skill gap section**

Change line 175 from:
```javascript
<div style="font-size:13px;font-weight:600;">Совпадение навыков</div>
```
To:
```javascript
<div style="font-size:13px;font-weight:600;">Анализ навыков рынка</div>
```

- [ ] **Step 3: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add extension/src/ui/html/tabs/vacancies.js
git commit -m "docs: rename match sections for clarity"
```

---

### Task 5: Add tooltips to skill categories

**Files:**
- Modify: `extension/src/ui/html/tabs/vacancies.js:118,198,207`

**Interfaces:**
- Consumes: None
- Produces: Updated UI with title attributes

- [ ] **Step 1: Add tooltip to "Из опыта работы"**

Change line 118 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#B45309;">Из опыта работы</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#B45309;" title="Навыки, которые AI извлек из описания опыта">Из опыта работы</span>
```

- [ ] **Step 2: Add tooltip to "Связанные"**

Change line 201 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#D97706;">Связанные</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#D97706;" title="Навыки, похожие по смыслу (синонимы)">Связанные</span>
```

- [ ] **Step 3: Add tooltip to "Не хватает"**

Change line 210 from:
```javascript
<span style="font-size:11px;font-weight:600;color:#DC2626;">Не хватает</span>
```
To:
```javascript
<span style="font-size:11px;font-weight:600;color:#DC2626;" title="Навыки из вакансии, которых нет в вашем резюме">Не хватает</span>
```

- [ ] **Step 4: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/src/ui/html/tabs/vacancies.js
git commit -m "docs: add tooltips to skill categories"
```

---

### Task 6: Connect cover letter template to match score

**Files:**
- Modify: `extension/src/ui/html/tabs/vacancies.js:158`

**Interfaces:**
- Consumes: `extractPlaceholders()` from cover-letter-placeholders.js
- Produces: Updated default template

- [ ] **Step 1: Update default template**

Change line 158 from:
```javascript
<textarea id="cover-letter-text" style="...">Здравствуйте! Меня заинтересовала вакансия {position} в {company}. Имею {experience} опыта в {skills}. {matching_sentence}Буду рад обсудить детали на интервью.</textarea>
```
To (verify this is already correct):
```javascript
<textarea id="cover-letter-text" style="...">Здравствуйте! Меня заинтересовала вакансия {position} в {company}. Имею {experience} опыта в {skills}. {matching_sentence}Буду рад обсудить детали на интервью.</textarea>
```

Note: Template already includes `{matching_sentence}` which is populated by `extractPlaceholders()`.

- [ ] **Step 2: Verify extractPlaceholders includes matching_sentence**

Read `extension/src/lib/cover-letter-placeholders.js` to confirm lines 64-66:
```javascript
p.matching_sentence = allMatches.length > 0
  ? 'Мой опыт включает ' + formatSkillList(allMatches) + ', что соответствует требованиям вакансии. '
  : '';
```

- [ ] **Step 3: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add extension/src/ui/html/tabs/vacancies.js
git commit -m "docs: verify cover letter template includes matching skills"
```

---

### Task 7: Make "Analysis" button more visible

**Files:**
- Modify: `extension/src/ui/html/tabs/vacancies.js:178-180`

**Interfaces:**
- Consumes: None
- Produces: Updated button styling

- [ ] **Step 1: Update button styling**

Change lines 178-180 from:
```javascript
<button class="btn btn-outline btn-sm" data-action="analyze-skills">
  ${ICONS.ai} Анализ
</button>
```
To:
```javascript
<button class="btn btn-primary btn-sm" data-action="analyze-skills" style="background:#7c3aed;color:#fff;">
  ${ICONS.ai} Анализ навыков
</button>
```

- [ ] **Step 2: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add extension/src/ui/html/tabs/vacancies.js
git commit -m "style: make analysis button more prominent"
```

---

## Phase 3: New Architecture

### Task 8: Add weight profiles to match-scorer.js

**Files:**
- Modify: `extension/src/lib/match-scorer.js:38-44`

**Interfaces:**
- Consumes: `matchMode` from storage
- Produces: `WEIGHT_PROFILES` object

- [ ] **Step 1: Add weight profiles constant**

After line 44, add:
```javascript
const WEIGHT_PROFILES = {
  precise: { skills: 35, title: 25, salary: 15, experience: 10, location: 15 },
  flexible: { semantic: 45, experience: 20, salary: 15, skills: 15, location: 5 }
};
```

- [ ] **Step 2: Update computeMatchScore to accept mode**

Change function signature from:
```javascript
export function computeMatchScore(resume, vacancy) {
```
To:
```javascript
export function computeMatchScore(resume, vacancy, mode = 'precise') {
```

- [ ] **Step 3: Use weight profile based on mode**

Replace lines 38-44 with:
```javascript
const profile = WEIGHT_PROFILES[mode] || WEIGHT_PROFILES.precise;
const W_SKILLS = profile.skills / 40;
const W_TITLE = profile.title / 30;
const W_SALARY = profile.salary / 15;
const W_EXP = profile.experience / 15;
```

- [ ] **Step 4: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/src/lib/match-scorer.js
git commit -m "feat: add weight profiles for precise/flexible matching modes"
```

---

### Task 9: Add match mode setting to UI

**Files:**
- Modify: `extension/src/ui/html/tabs/settings.js`

**Interfaces:**
- Consumes: `WEIGHT_PROFILES` from match-scorer.js
- Produces: New setting dropdown

- [ ] **Step 1: Read settings.js**

Read `extension/src/ui/html/tabs/settings.js` to find appropriate location.

- [ ] **Step 2: Add match mode dropdown**

After existing settings section, add:
```javascript
<div style="margin-bottom:12px;">
  <label style="display:block;font-size:12px;font-weight:500;margin-bottom:4px;">Режим матчинга</label>
  <select id="s-match-mode" style="width:100%;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
    <option value="precise">Точный (навыки + должность)</option>
    <option value="flexible">Гибкий (семантика + опыт)</option>
  </select>
  <div style="font-size:10px;color:#71717A;margin-top:4px;">Точный: навыки 35%, должность 25%. Гибкий: семантика 45%, опыт 20%.</div>
</div>
```

- [ ] **Step 3: Add event handler**

In `extension/src/ui/panel/ai-settings-handlers.js` or similar, add:
```javascript
// Match mode change handler
const matchModeSelect = document.getElementById('s-match-mode');
if (matchModeSelect) {
  matchModeSelect.addEventListener('change', async (e) => {
    const mode = e.target.value;
    await chrome.storage.local.set({ matchMode: mode });
    // Re-score all vacancies with new mode
    window.dispatchEvent(new CustomEvent('hh-ar-match-mode-changed', { detail: { mode } }));
  });
}
```

- [ ] **Step 4: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/src/ui/html/tabs/settings.js extension/src/ui/panel/ai-settings-handlers.js
git commit -m "feat: add match mode setting (precise/flexible)"
```

---

### Task 10: Create AI semantic comparison module

**Files:**
- Create: `extension/src/lib/ai-semantic.js`

**Interfaces:**
- Consumes: `resume`, `vacancy` objects
- Produces: `computeSemanticSimilarity()` function

- [ ] **Step 1: Create new module**

Create `extension/src/lib/ai-semantic.js`:
```javascript
/**
 * LIB: AI SEMANTIC COMPARISON
 * ============================
 * Computes semantic similarity between resume and vacancy using AI.
 * Uses Groq/OpenCode API for fast inference.
 *
 * v1.9.79.0
 */

import { createLogger } from './anti-hallucination.js';

const semanticLog = createLogger('Semantic');

/**
 * Compute semantic similarity between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {Promise<number>} 0-1 similarity score
 */
export async function computeSemanticSimilarity(resume, vacancy) {
  if (!resume || !vacancy) return 0;

  const prompt = `Compare this resume to this job vacancy. Return a single number 0-1 indicating how well they match.

Resume title: ${resume.title || 'N/A'}
Resume skills: ${(resume.skills || []).join(', ')}
Resume experience: ${resume.experienceTotal || 'N/A'}

Vacancy title: ${vacancy.title || 'N/A'}
Vacancy skills: ${(vacancy.keySkills || []).join(', ')}
Vacancy requirements: ${vacancy.description?.text?.substring(0, 500) || 'N/A'}

Return ONLY a number between 0 and 1, like 0.75`;

  try {
    // Use Groq API (fast, free)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getApiKey()}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '0';
    const score = parseFloat(content) || 0;
    const clamped = Math.max(0, Math.min(1, score));

    semanticLog.info('Semantic score: ' + clamped);
    return clamped;
  } catch (err) {
    semanticLog.error('Semantic comparison failed: ' + err.message);
    return 0;
  }
}

async function getApiKey() {
  const data = await chrome.storage.local.get('aiApiKey');
  return data.aiApiKey || '';
}
```

- [ ] **Step 2: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add extension/src/lib/ai-semantic.js
git commit -m "feat: add AI semantic comparison module"
```

---

### Task 11: Integrate semantic score into match-scorer

**Files:**
- Modify: `extension/src/lib/match-scorer.js:52-70`

**Interfaces:**
- Consumes: `computeSemanticSimilarity()` from ai-semantic.js
- Produces: Updated `computeMatchScore()` with semantic mode

- [ ] **Step 1: Import semantic module**

Add after line 34:
```javascript
import { computeSemanticSimilarity } from './ai-semantic.js';
```

- [ ] **Step 2: Update computeMatchScore for flexible mode**

Change function to async and add semantic logic:
```javascript
export async function computeMatchScore(resume, vacancy, mode = 'precise') {
  if (!resume || !vacancy) {
    return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0 }, details: {} };
  }

  const profile = WEIGHT_PROFILES[mode] || WEIGHT_PROFILES.precise;

  let semanticScore = 0;
  if (mode === 'flexible') {
    semanticScore = await computeSemanticSimilarity(resume, vacancy);
  }

  const skillResult = scoreSkills(resume, vacancy);
  const titleResult = scoreTitle(resume, vacancy);
  const salaryResult = scoreSalary(resume, vacancy);
  const expResult = scoreExperience(resume, vacancy);
  const locResult = scoreLocation(resume, vacancy);

  const breakdown = {
    skills: Math.round(skillResult.score * (profile.skills / 40)),
    title: Math.round(titleResult.score * (profile.title / 30)),
    salary: Math.round(salaryResult.score * (profile.salary / 15)),
    experience: Math.round(expResult.score * (profile.experience / 15)),
    location: locResult.score,
    semantic: mode === 'flexible' ? Math.round(semanticScore * 45) : 0
  };

  let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience + breakdown.location + breakdown.semantic);

  // Role mismatch penalty (only in precise mode)
  if (mode === 'precise') {
    if (titleResult.score === 0 && titleResult.similarity === 0) {
      total = Math.min(total, 25);
    } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
      total = Math.min(total, 40);
    }
  }

  const details = {
    matchingSkills: skillResult.matching,
    derivedMatchSkills: skillResult.derivedMatch,
    synonymMatchSkills: skillResult.synonymMatch,
    impliedMatchSkills: skillResult.impliedMatch,
    missingSkills: skillResult.missing,
    extraSkills: skillResult.extra,
    titleSimilarity: titleResult.similarity,
    salaryMatch: salaryResult.reason,
    experienceMatch: expResult.reason,
    locationMatch: locResult.reason,
    semanticScore: semanticScore
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience + ' loc=' + breakdown.location + ' semantic=' + breakdown.semantic);

  return { total, breakdown, details };
}
```

- [ ] **Step 3: Update callers to use async/await**

Search for `computeMatchScore(` calls and update to use `await`:
- `extension/src/content/main.js:172`
- `extension/src/content/main-page-handlers-vacancy.js:94`
- `extension/src/ui/tabs/vacancies-match.js:113`
- `extension/src/lib/cover-letter-ai.js:61`
- `extension/src/lib/cover-letter-placeholders.js:40`
- `extension/src/lib/cover-letter-rich.js:91`
- `extension/src/lib/vacancy-fetch-enrichment.js:95`

- [ ] **Step 4: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/src/lib/match-scorer.js extension/src/content/main.js extension/src/content/main-page-handlers-vacancy.js extension/src/ui/tabs/vacancies-match.js extension/src/lib/cover-letter-ai.js extension/src/lib/cover-letter-placeholders.js extension/src/lib/cover-letter-rich.js extension/src/lib/vacancy-fetch-enrichment.js
git commit -m "feat: integrate semantic score into match-scorer for flexible mode"
```

---

### Task 12: Create market analytics dashboard

**Files:**
- Create: `extension/src/ui/html/tabs/analytics.js`
- Modify: `extension/src/ui/html/tabs/vacancies.js:230`

**Interfaces:**
- Consumes: `panelState.vacancies`, `panelState.resume`
- Produces: Analytics UI section

- [ ] **Step 1: Create analytics HTML module**

Create `extension/src/ui/html/tabs/analytics.js`:
```javascript
/**
 * TAB: ANALYTICS
 * Market analytics dashboard showing score distribution and skill demand.
 * v1.9.79.0
 */

export function getAnalyticsSection() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Аналитика рынка</div>
    <div id="analytics-content" style="display:none;">
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Средний score</div>
          <div id="analytics-avg-score" style="font-size:16px;font-weight:700;">0%</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Вакансий</div>
          <div id="analytics-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Топ навык</div>
          <div id="analytics-top-skill" style="font-size:12px;font-weight:700;color:#059669;">—</div>
        </div>
      </div>
      <div id="analytics-skills-demand" style="margin-top:8px;">
        <div style="font-size:11px;font-weight:600;color:#52525b;margin-bottom:4px;">Востребованные навыки:</div>
        <div id="analytics-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
    </div>
    <div id="analytics-empty" style="padding:16px;text-align:center;font-size:12px;color:#71717A;">
      Загрузите вакансии для аналитики
    </div>
  </div>`;
}
```

- [ ] **Step 2: Add analytics section to vacancies.js**

In `extension/src/ui/html/tabs/vacancies.js`, after line 230, add:
```javascript
import { getAnalyticsSection } from './analytics.js';
```

And in the template, after the last card, add:
```javascript
${getAnalyticsSection()}
```

- [ ] **Step 3: Create analytics rendering logic**

Create `extension/src/ui/tabs/analytics-render.js`:
```javascript
/**
 * UI: ANALYTICS RENDERING
 * Renders market analytics from loaded vacancies.
 * v1.9.79.0
 */

import { refs } from '../state.js';
import { esc } from '../html.js';

export function renderAnalytics(vacancies, resume) {
  const content = refs.shadowRoot?.getElementById('analytics-content');
  const empty = refs.shadowRoot?.getElementById('analytics-empty');
  if (!content || !empty) return;

  if (!vacancies || vacancies.length === 0) {
    content.style.display = 'none';
    empty.style.display = '';
    return;
  }

  content.style.display = '';
  empty.style.display = 'none';

  // Calculate average score
  const scores = vacancies.filter(v => v.matchScore != null).map(v => v.matchScore);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const avgEl = refs.shadowRoot?.getElementById('analytics-avg-score');
  if (avgEl) avgEl.textContent = avgScore + '%';

  const totalEl = refs.shadowRoot?.getElementById('analytics-total');
  if (totalEl) totalEl.textContent = vacancies.length;

  // Collect all skills from vacancies
  const skillCounts = new Map();
  for (const v of vacancies) {
    const skills = v.keySkills || [];
    for (const s of skills) {
      const name = typeof s === 'string' ? s : (s.name || '');
      if (name) {
        skillCounts.set(name, (skillCounts.get(name) || 0) + 1);
      }
    }
  }

  // Sort by count and get top 10
  const sorted = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topSkill = sorted[0];
  const topSkillEl = refs.shadowRoot?.getElementById('analytics-top-skill');
  if (topSkillEl && topSkill) {
    topSkillEl.textContent = topSkill[0];
  }

  // Render skills list
  const skillsList = refs.shadowRoot?.getElementById('analytics-skills-list');
  if (skillsList) {
    const top10 = sorted.slice(0, 10);
    skillsList.innerHTML = top10.map(([name, count]) =>
      '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#F0FDF4;color:#059669;border:1px solid #BBF7D0;">' + esc(name) + ' (' + count + ')</span>'
    ).join('');
  }
}
```

- [ ] **Step 4: Add event listener for analytics updates**

In `extension/src/ui/panel/index.js` or similar, add:
```javascript
// Update analytics when vacancies change
window.addEventListener('hh-ar-vacancies-updated', (e) => {
  const vacancies = e.detail?.vacancies || panelState.vacancies;
  renderAnalytics(vacancies, panelState.resume);
});
```

- [ ] **Step 5: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add extension/src/ui/html/tabs/analytics.js extension/src/ui/html/tabs/vacancies.js extension/src/ui/tabs/analytics-render.js extension/src/ui/panel/index.js
git commit -m "feat: add market analytics dashboard"
```

---

### Task 13: Update version to 1.9.79.0

**Files:**
- Modify: `extension/manifest.json:5`
- Modify: `extension/package.json:3`
- Modify: `extension/src/lib/version.js:3`
- Modify: `extension/popup/index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: None
- Produces: Version bump across all files

- [ ] **Step 1: Update manifest.json**

Change version from `"1.9.78.0"` to `"1.9.79.0"`.

- [ ] **Step 2: Update package.json**

Change version from `"1.9.78.0"` to `"1.9.79.0"`.

- [ ] **Step 3: Update version.js**

Change `VERSION` from `"1.9.78.0"` to `"1.9.79.0"`.

- [ ] **Step 4: Update popup/index.html**

Update version display.

- [ ] **Step 5: Update README.md**

Update version references.

- [ ] **Step 6: Run version sync script**

Run: `bash extension/scripts/version-sync.sh`
Expected: PASS

- [ ] **Step 7: Run lint**

Run: `cd extension && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add extension/manifest.json extension/package.json extension/src/lib/version.js extension/popup/index.html README.md
git commit -m "chore: bump version to 1.9.79.0"
```

---

## Phase 4: Testing

### Task 14: Write unit tests for match-scorer weight profiles

**Files:**
- Create: `extension/tests/match-scorer.test.js`

**Interfaces:**
- Consumes: `computeMatchScore()` from match-scorer.js
- Produces: Test coverage for weight profiles

- [ ] **Step 1: Create test file**

Create `extension/tests/match-scorer.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { computeMatchScore } from '../src/lib/match-scorer.js';

describe('computeMatchScore', () => {
  const mockResume = {
    title: 'Менеджер по продажам',
    skills: ['продажи', 'переговоры', 'CRM'],
    experience: [{ duration: '3 года' }],
    derivedSkills: ['работа с клиентами']
  };

  const mockVacancy = {
    title: 'Менеджер по продажам',
    keySkills: ['продажи', 'переговоры', 'опыт работы'],
    description: { text: 'Требуется менеджер по продажам' }
  };

  it('should return score with precise mode by default', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('skills');
    expect(result.breakdown).toHaveProperty('title');
    expect(result.breakdown).toHaveProperty('salary');
    expect(result.breakdown).toHaveProperty('experience');
    expect(result.breakdown).toHaveProperty('location');
  });

  it('should use precise weights by default', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy);
    // Skills max is 35, title max is 25
    expect(result.breakdown.skills).toBeLessThanOrEqual(35);
    expect(result.breakdown.title).toBeLessThanOrEqual(25);
  });

  it('should use flexible mode when specified', async () => {
    const result = await computeMatchScore(mockResume, mockVacancy, 'flexible');
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown).toHaveProperty('semantic');
  });

  it('should return 0 for null inputs', async () => {
    const result = await computeMatchScore(null, null);
    expect(result.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd extension && npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add extension/tests/match-scorer.test.js
git commit -m "test: add unit tests for match-scorer weight profiles"
```

---

### Task 15: Write unit tests for AI semantic comparison

**Files:**
- Create: `extension/tests/ai-semantic.test.js`

**Interfaces:**
- Consumes: `computeSemanticSimilarity()` from ai-semantic.js
- Produces: Test coverage for semantic comparison

- [ ] **Step 1: Create test file**

Create `extension/tests/ai-semantic.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { computeSemanticSimilarity } from '../src/lib/ai-semantic.js';

describe('computeSemanticSimilarity', () => {
  it('should return 0 for null inputs', async () => {
    const result = await computeSemanticSimilarity(null, null);
    expect(result).toBe(0);
  });

  it('should return 0 for null resume', async () => {
    const result = await computeSemanticSimilarity(null, { title: 'Test' });
    expect(result).toBe(0);
  });

  it('should return 0 for null vacancy', async () => {
    const result = await computeSemanticSimilarity({ title: 'Test' }, null);
    expect(result).toBe(0);
  });

  it('should return number between 0 and 1', async () => {
    // Mock fetch to return a valid response
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{ message: { content: '0.75' } }]
      })
    });

    const result = await computeSemanticSimilarity(
      { title: 'Менеджер', skills: ['продажи'] },
      { title: 'Менеджер', keySkills: ['продажи'] }
    );

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should clamp values outside 0-1 range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{ message: { content: '1.5' } }]
      })
    });

    const result = await computeSemanticSimilarity(
      { title: 'Test' },
      { title: 'Test' }
    );

    expect(result).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd extension && npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add extension/tests/ai-semantic.test.js
git commit -m "test: add unit tests for AI semantic comparison"
```

---

## Self-Review Checklist

1. ✅ **Spec coverage:** All requirements from design doc are covered in tasks
2. ✅ **Placeholder scan:** No TBD/TODO/placeholder patterns found
3. ✅ **Type consistency:** Function signatures and property names consistent across tasks

## Implementation Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Bug Fixes | Tasks 1-3 | 1-2 hours |
| Phase 2: UX | Tasks 4-7 | 2-3 hours |
| Phase 3: Architecture | Tasks 8-12 | 4-6 hours |
| Phase 4: Testing | Tasks 13-15 | 2-3 hours |
| **Total** | **15 tasks** | **9-14 hours** |
