# Task 12: Create market analytics dashboard

## Files
- Create: `extension/src/ui/html/tabs/analytics.js`
- Create: `extension/src/ui/tabs/analytics-render.js`
- Modify: `extension/src/ui/html/tabs/vacancies.js:230`
- Modify: `extension/src/ui/panel/index.js`

## Interfaces
- Consumes: `panelState.vacancies`, `panelState.resume`
- Produces: Analytics UI section

## Steps

1. Create analytics HTML module `extension/src/ui/html/tabs/analytics.js`:
```javascript
/**
 * TAB: ANALYTICS
 * Market analytics dashboard showing score distribution and skill demand.
 * v1.9.84.0
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

2. Add analytics section to `extension/src/ui/html/tabs/vacancies.js`:
```javascript
import { getAnalyticsSection } from './analytics.js';
```
And in the template, after the last card:
```javascript
${getAnalyticsSection()}
```

3. Create analytics rendering logic `extension/src/ui/tabs/analytics-render.js`:
```javascript
/**
 * UI: ANALYTICS RENDERING
 * Renders market analytics from loaded vacancies.
 * v1.9.84.0
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

4. Add event listener for analytics updates in `extension/src/ui/panel/index.js`:
```javascript
// Update analytics when vacancies change
window.addEventListener('hh-ar-vacancies-updated', (e) => {
  const vacancies = e.detail?.vacancies || panelState.vacancies;
  renderAnalytics(vacancies, panelState.resume);
});
```

5. Run lint: `cd extension && npm run lint` (Expected: PASS)
6. Commit with message: `feat: add market analytics dashboard`
