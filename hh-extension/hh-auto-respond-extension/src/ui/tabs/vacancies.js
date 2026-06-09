/**
 * UI: TABS — VACANCIES
 * =======================
 * Renders vacancy list and stats in the sidebar vacancies tab.
 */

import { panelState, refs } from '../state.js';
import { esc, scoreClass } from '../html.js';

export function renderVacancyList() {
  const list = refs.shadowRoot?.getElementById('har-vlist');
  if (!list) return;
  if (!panelState.vacancies.length) { list.innerHTML = '<div class="har-empty">Нет вакансий.<br>Перейдите на страницу поиска.</div>'; return; }
  list.innerHTML = panelState.vacancies.slice(0, 50).map(v => {
    const sc = v.matchScore != null ? '<span class="har-score sc-' + scoreClass(v.matchScore) + '">' + v.matchScore + '%</span>' : '';
    const apply = (v.hasReply && v.status === 'new') ? '<button class="har-btn-apply" data-action="apply" data-id="' + v.id + '">Откликнуться</button>' : '';
    const badge = v.status === 'applied' ? '<span class="har-badge ba">Откликнута</span>' : v.status === 'blacklisted' ? '<span class="har-badge bb">ЧС</span>' : '';
    return '<div class="har-vcard ' + (v.status || '') + '"><div class="har-vhead"><a href="' + v.url + '" target="_blank" class="har-vtitle">' + esc(v.title) + '</a>' + sc + '</div><div class="har-vmeta"><span>' + esc(v.company) + '</span>' + (v.salary && v.salary !== 'Не указана' ? '<span class="har-vsalary">' + esc(v.salary) + '</span>' : '') + '</div><div class="har-vfoot"><span>' + esc(v.location) + '</span>' + apply + badge + '</div></div>';
  }).join('');
}

export function renderStatsValues() {
  const s = panelState.stats;
  const el = (id) => refs.shadowRoot?.getElementById(id);
  const applied = s.appliedToday || 0;
  const limit = s.dailyLimit || 200;
  if (el('sv-applied')) el('sv-applied').textContent = applied;
  if (el('sv-remain')) el('sv-remain').textContent = limit - applied;
  if (el('sv-errors')) el('sv-errors').textContent = s.errorsToday || 0;
  if (el('pf')) el('pf').style.width = Math.min(100, (applied / limit) * 100) + '%';
  if (el('pt')) el('pt').textContent = applied + ' / ' + limit;
}
