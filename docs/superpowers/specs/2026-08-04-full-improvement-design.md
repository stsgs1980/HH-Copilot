# HH Copilot — Full Improvement Design

## Status: Approved (brainstorming complete)

## Scope
Full improvement across all aspects: UX/UI, architecture, functionality.
**Approach: Iterative (Phase 1 → Phase 2 → Phase 3)**

---

## Phase 1: MVP Bug Fixes

### 1.1 Fix incorrect maximums in vacancies-match.js
**File:** `extension/src/ui/tabs/vacancies-match.js:64-67`

Current (wrong):
```javascript
set('vac-match-skills', b.skills + '/40');   // Should be /35
set('vac-match-title', b.title + '/30');      // Should be /25
set('vac-match-salary', b.salary + '/15');    // OK
set('vac-match-exp', b.experience + '/15');   // Should be /10
```

Fix to:
```javascript
set('vac-match-skills', b.skills + '/35');
set('vac-match-title', b.title + '/25');
set('vac-match-salary', b.salary + '/15');
set('vac-match-exp', b.experience + '/10');
```

### 1.2 Add location dimension to match score UI
**File:** `extension/src/ui/html/tabs/vacancies.js`

Add new column for location (0-15):
```javascript
<div style="flex:1;text-align:center;">
  <div id="vac-match-loc" style="font-size:16px;font-weight:700;color:#0EA5E9;">0</div>
  <div style="font-size:12px;color:#52525b;margin-top:1px;">Локация</div>
</div>
```

**File:** `extension/src/ui/tabs/vacancies-match.js`

Update renderVacancyMatchScore to handle location:
```javascript
set('vac-match-loc', b.location + '/15');
// Add to bar calculation
const barLoc = el('vac-match-bar-loc');
if (barLoc) barLoc.style.width = ((b.location / total) * 100).toFixed(1) + '%';
```

### 1.3 Sync weights between match-scorer.js and UI
**Verification:** Ensure breakdown object includes location field.

---

## Phase 2: UX Overhaul

### 2.1 Rename sections for clarity
**File:** `extension/src/ui/html/tabs/vacancies.js`

Change:
- "Совпадение с вакансией" → "Оценка для этой вакансии"
- "Совпадение навыков" → "Анализ навыков рынка"

### 2.2 Add tooltips
**File:** `extension/src/ui/html/tabs/vacancies.js`

Add title attributes to skill categories:
```javascript
<span style="..." title="Навыки, которые AI извлек из описания опыта">Из опыта работы</span>
<span style="..." title="Навыки, похожие по смыслу (синонимы)">Связанные</span>
<span style="..." title="Навыки из вакансии, которых нет в вашем резюме">Не хватает</span>
```

### 2.3 Connect cover letter template to match score
**File:** `extension/src/ui/html/tabs/vacancies.js`

Update default template to include matching skills:
```javascript
<textarea id="cover-letter-text">Здравствуйте! Меня заинтересовала вакансия {position} в {company}. Имею {experience} опыта в {skills}. {matching_sentence}Буду рад обсудить детали на интервью.</textarea>
```

### 2.4 Make "Analysis" button more visible
**File:** `extension/src/ui/html/tabs/vacancies.js`

Add styling to make button stand out:
```javascript
<button class="btn btn-primary btn-sm" data-action="analyze-skills" style="background:#7c3aed;color:#fff;">
  ${ICONS.ai} Анализ навыков
</button>
```

---

## Phase 3: New Architecture

### 3.1 Add "Precise/Flexible" mode toggle
**File:** `extension/src/ui/html/tabs/settings.js`

Add toggle in settings:
```javascript
<div style="display:flex;align-items:center;gap:8px;">
  <label style="font-size:12px;font-weight:500;">Режим матчинга:</label>
  <select id="s-match-mode" style="...">
    <option value="precise">Точный (навыки + должность)</option>
    <option value="flexible">Гибкий (семантика + опыт)</option>
  </select>
</div>
```

**File:** `extension/src/lib/match-scorer.js`

Add weight profiles:
```javascript
const WEIGHT_PROFILES = {
  precise: { skills: 35, title: 25, salary: 15, experience: 10, location: 15 },
  flexible: { semantic: 45, experience: 20, salary: 15, skills: 15, location: 5 }
};
```

### 3.2 AI semantic comparison
**File:** `extension/src/lib/ai-semantic.js` (new)

Create semantic comparison module:
```javascript
export async function computeSemanticSimilarity(resume, vacancy) {
  // Use Groq/OpenCode API to compare
  // Return score 0-1
}
```

**File:** `extension/src/lib/match-scorer.js`

Integrate semantic score when in flexible mode.

### 3.3 Market analytics dashboard
**File:** `extension/src/ui/html/tabs/analytics.js` (new)

Add analytics section showing:
- Average score across loaded vacancies
- Top required skills
- Your resume vs market comparison

---

## Testing Plan

### Unit Tests
- `tests/match-scorer.test.js` — test weight profiles
- `tests/ai-semantic.test.js` — test semantic comparison

### Integration Tests
- Test UI renders correct maximums
- Test location dimension appears
- Test mode toggle switches weights

### Manual Testing
- Load vacancies, verify score display
- Test cover letter generation with new template
- Test analytics dashboard

---

## Implementation Order

1. Phase 1 (bug fixes) — 1-2 hours
2. Phase 2 (UX) — 2-3 hours
3. Phase 3 (architecture) — 4-6 hours
4. Testing — 2-3 hours
5. Documentation — 1 hour

**Total estimated: 10-15 hours**
