/**
 * UI: TABS — VACANCIES
 * =======================
 * Renders vacancy list and stats in the sidebar vacancies tab.
 * Uses new design system: vacancy-item cards with match score ring.
 */

import { panelState, refs } from '../state.js';
import { esc, scoreClass } from '../html.js';
import { updateSkillGapSection } from './resumes/resume-helpers.js';
import { computeMatchScore } from '../../lib/match-scorer.js';

export function renderVacancyMatchScore(vacancyId, score, breakdown, details) {
  const section = refs.shadowRoot?.getElementById('vac-match-section');
  if (!section) return;

  if (!score && score !== 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  // Ring chart
  const ring = refs.shadowRoot?.getElementById('vac-match-ring');
  if (ring) {
    const deg = Math.round(score * 3.6);
    const color = score >= 70 ? '#059669' : score >= 40 ? '#D97706' : '#DC2626';
    ring.style.background = 'conic-gradient(' + color + ' 0deg ' + deg + 'deg, #e4e4e7 ' + deg + 'deg 360deg)';
    const inner = ring.querySelector('div');
    if (inner) {
      inner.textContent = score + '%';
      inner.style.color = color;
    }
  }

  // Subtitle
  const subtitle = refs.shadowRoot?.getElementById('vac-match-subtitle');
  if (subtitle) {
    if (score >= 70) {
      subtitle.textContent = 'Отличное совпадение — рекомендуем откликнуться';
    } else if (score >= 40) {
      subtitle.textContent = 'Частичное совпадение — стоит рассмотреть';
    } else {
      subtitle.textContent = 'Низкое совпадение — навыки не подходят';
    }
  }

  // Breakdown numbers
  const el = (id) => refs.shadowRoot?.getElementById(id);
  const b = breakdown || { skills: 0, title: 0, salary: 0, experience: 0 };
  const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
  set('vac-match-skills', b.skills + '/40');
  set('vac-match-title', b.title + '/30');
  set('vac-match-salary', b.salary + '/15');
  set('vac-match-exp', b.experience + '/15');

  // Stacked bar — fill 100% width proportionally
  const total = Math.max(1, b.skills + b.title + b.salary + b.experience);
  const barSkills = el('vac-match-bar-skills');
  const barTitle = el('vac-match-bar-title');
  const barSalary = el('vac-match-bar-salary');
  const barExp = el('vac-match-bar-exp');
  if (barSkills) barSkills.style.width = ((b.skills / total) * 100).toFixed(1) + '%';
  if (barTitle) barTitle.style.width = ((b.title / total) * 100).toFixed(1) + '%';
  if (barSalary) barSalary.style.width = ((b.salary / total) * 100).toFixed(1) + '%';
  if (barExp) barExp.style.width = ((b.experience / total) * 100).toFixed(1) + '%';

  // Matching/missing skills details
  const detailsSection = el('vac-match-details');
  if (detailsSection && details) {
    const matching = details.matchingSkills || [];
    const derived = details.derivedMatchSkills || [];
    const missing = details.missingSkills || [];

    if (matching.length > 0 || derived.length > 0 || missing.length > 0) {
      detailsSection.style.display = '';

      // Explicit matching skills (green)
      const matchingRow = el('vac-match-matching-skills');
      const matchingList = el('vac-match-matching-list');
      if (matchingRow && matchingList) {
        if (matching.length > 0) {
          matchingRow.style.display = '';
          const visible = matching.slice(0, 6);
          const remainder = matching.length - visible.length;
          matchingList.innerHTML = visible.map(s => '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;">' + esc(s) + '</span>').join('') +
            (remainder > 0 ? '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>' : '');
        } else {
          matchingRow.style.display = 'none';
        }
      }

      // Derived matching skills (amber — inferred from experience)
      const derivedRow = el('vac-match-derived-skills');
      const derivedList = el('vac-match-derived-list');
      if (derivedRow && derivedList) {
        if (derived.length > 0) {
          derivedRow.style.display = '';
          const visible = derived.slice(0, 6);
          const remainder = derived.length - visible.length;
          derivedList.innerHTML = visible.map(s => '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;">' + esc(s) + '</span>').join('') +
            (remainder > 0 ? '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>' : '');
        } else {
          derivedRow.style.display = 'none';
        }
      }

      // Missing skills (red)
      const missingRow = el('vac-match-missing-skills');
      const missingList = el('vac-match-missing-list');
      if (missingRow && missingList) {
        if (missing.length > 0) {
          missingRow.style.display = '';
          const visible = missing.slice(0, 6);
          const remainder = missing.length - visible.length;
          missingList.innerHTML = visible.map(s => '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;">' + esc(s) + '</span>').join('') +
            (remainder > 0 ? '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>' : '');
        } else {
          missingRow.style.display = 'none';
        }
      }
    } else {
      detailsSection.style.display = 'none';
    }
  }
}

/** Try to show match score from stored vacancy detail data */
export function tryShowVacancyMatch() {
  const detail = window.__hhVacDetail;
  if (!detail || detail.matchScore === undefined) return;
  // Re-compute with current resume to get full details (matching/missing skills)
  const resume = panelState.resume;
  if (resume) {
    const score = computeMatchScore(resume, detail);
    renderVacancyMatchScore(detail.id, score.total, score.breakdown, score.details);
  } else {
    // No resume — show score without skill details
    renderVacancyMatchScore(detail.id, detail.matchScore, detail.matchBreakdown, null);
  }
}

export function renderVacancyList() {
  const list = refs.shadowRoot?.getElementById('har-vlist');
  if (!list) return;

  if (!panelState.vacancies.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">Нет вакансий.<br>Перейдите на страницу поиска.</div>';
    return;
  }

  list.innerHTML = panelState.vacancies.slice(0, 50).map(v => {
    const score = v.matchScore != null ? v.matchScore : 0;
    const sc = score > 0
      ? `<div class="score-ring" style="--score:${score};" role="img" aria-label="Совпадение ${score}%"><span>${score}%</span></div>`
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

    return `<div class="vacancy-item${shimmerClass}" data-title="${esc(v.title)}" data-status="${esc(v.status || 'new')}" data-score="${score}" style="${opacity}" tabindex="0" role="article" aria-label="${esc(v.title)}, ${esc(v.company)}, совпадение ${score}%">
      <div style="flex-shrink:0;">${sc}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <a href="${esc(v.url)}" data-action="navigate" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;cursor:pointer;">${esc(v.title)}</a>
          ${badge}
        </div>
        <div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;">
          <span>${esc(v.company)}</span>
          ${v.salary && v.salary !== 'Не указана' ? `<span style="color:#18181b;font-weight:500;">${esc(v.salary)}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;color:#52525b;">${esc(v.location)}</span>
          ${applyBtn}
        </div>
      </div>
    </div>`;
  }).join('');

  // Update skill gap analysis after vacancy list is rendered
  const r = panelState.resume;
  if (r && ((r.skills && r.skills.length > 0) || (r.derivedSkills && r.derivedSkills.length > 0))) {
    updateSkillGapSection(r);
  }
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
