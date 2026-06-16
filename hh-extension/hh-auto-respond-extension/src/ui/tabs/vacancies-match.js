/**
 * UI: VACANCY MATCH SCORE RENDERING
 * ===================================
 * Renders the match score ring, breakdown bars, and skill lists
 * for a selected vacancy in the sidebar.
 *
 * Split from src/ui/tabs/vacancies.js (AHG Rule 12).
 * v1.9.41.0
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';
import { computeMatchScore } from '../../lib/match-scorer.js';

/**
 * Render vacancy match score section: ring chart, subtitle, breakdown bars,
 * and matching/derived/missing skill lists.
 *
 * @param {string} vacancyId
 * @param {number} score -- 0..100
 * @param {Object} breakdown -- { skills, title, salary, experience }
 * @param {Object} details -- { matchingSkills, derivedMatchSkills, missingSkills }
 */
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
      subtitle.textContent = 'Отличное совпадение -- рекомендуем откликнуться';
    } else if (score >= 40) {
      subtitle.textContent = 'Частичное совпадение -- стоит рассмотреть';
    } else {
      subtitle.textContent = 'Низкое совпадение -- навыки не подходят';
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

  // Stacked bar -- fill 100% width proportionally
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

      renderSkillList(el, 'vac-match-matching-skills', 'vac-match-matching-list',
        matching, '#ECFDF5', '#059669', '#A7F3D0');
      renderSkillList(el, 'vac-match-derived-skills', 'vac-match-derived-list',
        derived, '#FFFBEB', '#B45309', '#FDE68A');
      renderSkillList(el, 'vac-match-missing-skills', 'vac-match-missing-list',
        missing, '#FEF2F2', '#DC2626', '#FECACA');
    } else {
      detailsSection.style.display = 'none';
    }
  }
}

/**
 * Try to show match score from stored vacancy detail data.
 * Reads window.__hhVacDetail and panelState.resume, recomputes score
 * with current resume to get full skill detail.
 */
export function tryShowVacancyMatch() {
  const detail = window.__hhVacDetail;
  if (!detail || detail.matchScore === undefined) return;
  // Re-compute with current resume to get full details (matching/missing skills)
  const resume = panelState.resume;
  if (resume) {
    const score = computeMatchScore(resume, detail);
    renderVacancyMatchScore(detail.id, score.total, score.breakdown, score.details);
  } else {
    // No resume -- show score without skill details
    renderVacancyMatchScore(detail.id, detail.matchScore, detail.matchBreakdown, null);
  }
}

// ===============================================
// INTERNAL HELPERS
// ===============================================

/**
 * Render a single skill list (matching / derived / missing).
 *
 * @param {(id: string) => Element|null} el -- element getter
 * @param {string} rowId -- container row element id
 * @param {string} listId -- inner list element id
 * @param {string[]} skills
 * @param {string} bg -- background color
 * @param {string} fg -- foreground color
 * @param {string} border -- border color
 */
function renderSkillList(el, rowId, listId, skills, bg, fg, border) {
  const row = el(rowId);
  const list = el(listId);
  if (!row || !list) return;

  if (skills.length > 0) {
    row.style.display = '';
    const visible = skills.slice(0, 6);
    const remainder = skills.length - visible.length;
    list.innerHTML = visible.map(s =>
      '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:' + bg + ';color:' + fg + ';border:1px solid ' + border + ';">' + esc(s) + '</span>'
    ).join('') +
      (remainder > 0 ? '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>' : '');
  } else {
    row.style.display = 'none';
  }
}
