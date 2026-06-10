/**
 * UI: TABS — VACANCIES
 * =======================
 * Renders vacancy list and stats in the sidebar vacancies tab.
 * Uses new design system: vacancy-item cards with match score ring.
 */

import { panelState, refs } from '../state.js';
import { esc, scoreClass } from '../html.js';

export function renderVacancyList() {
  const list = refs.shadowRoot?.getElementById('har-vlist');
  if (!list) return;

  if (!panelState.vacancies.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">Нет вакансий.<br>Перейдите на страницу поиска.</div>';
    return;
  }

  list.innerHTML = panelState.vacancies.slice(0, 50).map(v => {
    const score = v.matchScore != null ? v.matchScore : 0;
    const sc = score > 0
      ? `<div class="score-ring" style="--score:${score};"><span>${score}%</span></div>`
      : '';

    const applyBtn = (v.hasReply && v.status === 'new')
      ? `<button class="btn btn-primary btn-sm" data-action="apply" data-id="${esc(v.id)}">Откликнуться</button>`
      : '';

    const badge = v.status === 'applied'
      ? '<span class="badge badge-green">Откликнута</span>'
      : v.status === 'blacklisted'
        ? '<span class="badge badge-red">BL</span>'
        : '';

    const shimmerClass = (score >= 70 && v.status === 'new') ? ' shimmer' : '';
    const opacity = v.status === 'blacklisted' ? 'opacity:0.4;' : v.status === 'applied' ? 'opacity:0.5;' : '';

    return `<div class="vacancy-item${shimmerClass}" data-title="${esc(v.title)}" data-status="${esc(v.status || 'new')}" data-score="${score}" style="${opacity}">
      <div style="flex-shrink:0;">${sc}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <a href="${esc(v.url)}" target="_blank" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${esc(v.title)}</a>
          ${badge}
        </div>
        <div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;">
          <span>${esc(v.company)}</span>
          ${v.salary && v.salary !== 'Не указана' ? `<span style="color:#18181b;font-weight:500;">${esc(v.salary)}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#71717a;">${esc(v.location)}</span>
          ${applyBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

export function renderStatsValues() {
  const s = panelState.stats;
  const el = (id) => refs.shadowRoot?.getElementById(id);
  const applied = s.appliedToday || 0;
  const limit = panelState.settings.dailyLimit || 200;
  const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

  set('sv-applied', applied);
  set('sv-remain', limit - applied);
  set('sv-errors', s.errorsToday || 0);

  const fill = el('pf');
  if (fill) fill.style.width = Math.min(100, (applied / limit) * 100) + '%';
  const text = el('pt');
  if (text) text.textContent = applied + ' / ' + limit;
}
