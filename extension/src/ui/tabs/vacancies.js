/**
 * UI: TABS -- VACANCIES
 * =======================
 * Renders vacancy list and stats in the sidebar vacancies tab.
 * Uses new design system: vacancy-item cards with match score ring.
 *
 * Match score rendering is in vacancies-match.js.
 * Split from original 260-line file (AHG Rule 12).
 * v1.9.43.0
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';
import { updateSkillGapSection } from './resumes/resume-helpers.js';

// Re-export match-score functions for backwards compatibility
export { renderVacancyMatchScore, tryShowVacancyMatch } from './vacancies-match.js';

/**
 * Render the vacancy list with relevant + irrelevant sections.
 */
export function renderVacancyList() {
  const list = refs.shadowRoot?.getElementById('har-vlist');
  if (!list) return;

  if (!panelState.vacancies.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">Нет вакансий.<br>Перейдите на страницу поиска.</div>';
    return;
  }

  // v1.9.36.0: Use minMatchScore from settings to separate relevant vs irrelevant vacancies
  const minMatch = panelState.settings?.minMatchScore || 60;
  const allVacancies = panelState.vacancies.slice(0, 50);
  const relevant = allVacancies.filter(v => (v.matchScore != null ? v.matchScore : 0) >= minMatch);
  const irrelevant = allVacancies.filter(v => (v.matchScore != null ? v.matchScore : 0) < minMatch);

  // Render relevant vacancies (full list)
  let html = relevant.map((v, idx) => renderVacancyItem(v, idx, false)).join('');

  // Render irrelevant vacancies (collapsed, hidden by default)
  if (irrelevant.length > 0) {
    html += '<div style="margin-top:8px;padding:8px 10px;background:#F4F4F5;border-radius:8px;border:1px solid #E4E4E7;">';
    html += '<button data-action="toggle-irrelevant" style="display:flex;align-items:center;gap:6px;width:100%;background:none;border:none;cursor:pointer;font-size:11px;color:#71717A;padding:0;">';
    html += '<span class="icon"><svg class="irrelevant-chevron" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.15s;transform:rotate(180deg);" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline\'"><path d="m6 9 6 6 6-6"/></svg><span class="icon-fallback" style="display:none">v</span></span>';
    html += '<span>Низкое совпадение (' + irrelevant.length + ')</span>';
    html += '</button>';
    html += '<div class="irrelevant-list" style="margin-top:6px;">';
    html += irrelevant.map((v, idx) => renderVacancyItem(v, relevant.length + idx, true)).join('');
    html += '</div></div>';
  }

  list.innerHTML = html;

  // Update skill gap analysis after vacancy list is rendered
  const r = panelState.resume;
  if (r && ((r.skills && r.skills.length > 0) || (r.derivedSkills && r.derivedSkills.length > 0))) {
    updateSkillGapSection(r);
  }
}

/**
 * Render a single vacancy item card.
 * @param {Object} v - vacancy object
 * @param {number} idx - display index (1-based)
 * @param {boolean} dimmed - if true, render with dimmed style (low match)
 */
function renderVacancyItem(v, idx, dimmed) {
  const score = v.matchScore != null ? v.matchScore : 0;
  const sc = score > 0
    ? '<div class="score-ring" style="--score:' + score + ';" role="img" aria-label="Совпадение ' + score + '%"><span>' + score + '%</span></div>'
    : '';

  const applyBtn = (v.hasReply && v.status === 'new')
    ? '<button class="btn btn-primary btn-sm" data-action="apply" data-id="' + esc(v.id) + '">Откликнуться</button>'
    : '';

  const badge = v.status === 'applied'
    ? '<span class="badge badge-green">Откликнута</span>'
    : v.status === 'blacklisted'
      ? '<span class="badge badge-red">BL</span>'
      : v.isAd
        ? '<span class="badge badge-amber">Реклама</span>'
        : '';

  // Enrichment depth indicator
  const enrichBadge = v.keySkills && v.keySkills.length > 0
    ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;" title="Полный анализ описания вакансии">полный</span>'
    : v.enrichmentSource === 'cache'
      ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;" title="Данные из кэша (ранее посещённая вакансия)">кэш</span>'
      : '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#F4F4F5;color:#71717A;border:1px solid #D4D4D8;" title="Только данные из карточки поиска -- полный анализ в процессе">предварительный</span>';

  const skillCount = (v.keySkills && v.keySkills.length > 0)
    ? '<span style="font-size:11px;color:#059669;" title="Навыки из описания вакансии">' + v.keySkills.length + ' навыков</span>'
    : (v.skills && v.skills.length > 0)
      ? '<span style="font-size:11px;color:#71717A;" title="Только теги из карточки поиска">' + v.skills.length + ' тегов</span>'
      : '';

  const shimmerClass = (score >= 70 && v.status === 'new') ? ' shimmer' : '';
  // Dimmed: lower opacity for irrelevant vacancies
  const opacity = dimmed ? 'opacity:0.45;' : v.status === 'blacklisted' ? 'opacity:0.4;' : v.status === 'applied' ? 'opacity:0.5;' : '';

  return '<div class="vacancy-item' + shimmerClass + '" data-title="' + esc(v.title) + '" data-status="' + esc(v.status || 'new') + '" data-score="' + score + '" data-schedule="' + (v.schedule || 'unknown') + '" data-isad="' + (v.isAd ? '1' : '0') + '" style="' + opacity + '" tabindex="0" role="article" aria-label="' + esc(v.title) + ', ' + esc(v.company) + ', совпадение ' + score + '%">' +
    '<div style="flex-shrink:0;">' + sc + '</div>' +
    '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
        '<a href="' + esc(v.url) + '" data-action="navigate" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;cursor:pointer;"><span style="color:#71717a;font-weight:400;margin-right:3px;">' + (idx + 1) + '.</span>' + esc(v.title) + '</a>' +
        '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">' + enrichBadge + badge + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;">' +
        '<span>' + esc(v.company) + '</span>' +
        (v.salary && v.salary !== 'Не указана' ? '<span style="color:#18181b;font-weight:500;">' + esc(typeof v.salary === 'object' ? v.salary.raw : v.salary) + '</span>' : '') +
        skillCount +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<span style="font-size:12px;color:#52525b;">' + esc(v.location) + '</span>' +
        applyBtn +
      '</div>' +
    '</div>' +
  '</div>';
}

/**
 * Render stats values (applied today, remaining, errors, progress bar).
 */
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
