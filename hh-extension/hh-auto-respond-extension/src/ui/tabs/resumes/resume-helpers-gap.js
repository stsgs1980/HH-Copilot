/**
 * UI: RESUMES — Skill Gap Analysis
 * ==================================
 * Skill gap visualization: ring chart, stacked bar, 3 categories, recommendation.
 * Split from resume-helpers.js for anti-monolith compliance.
 */

import { refs, panelState } from '../../state.js';
import { esc } from '../../html.js';

// ═══════════════════════════════════════════════
// SKILL GAP ANALYSIS
// ═══════════════════════════════════════════════

/**
 * Update the Skill Gap Analysis section.
 * Shows: ring chart, stacked bar, match/miss/extra categories, recommendation.
 */
export function updateSkillGapSection(r) {
  const section = refs.shadowRoot?.getElementById('res-gap-section');
  if (!section) return;

  if (!r || ((!r.skills || r.skills.length === 0) && (!r.derivedSkills || r.derivedSkills.length === 0))) {
    section.style.display = 'none';
    return;
  }

  const resumeSkills = normalizeSkills(r.skills);
  const derivedSkills = normalizeSkills(r.derivedSkills || []);
  const allResumeSkills = new Set([...resumeSkills, ...derivedSkills]);
  const vacancySkills = collectVacancySkills();

  if (vacancySkills.size === 0) {
    // No vacancies loaded — hide the gap section entirely (no point showing 0% ring)
    section.style.display = 'none';
    return;
  }

  const match = [];
  const miss = [];
  const extra = [];

  for (const skill of allResumeSkills) {
    if (vacancySkills.has(skill)) match.push(skill);
  }
  for (const skill of vacancySkills) {
    if (!allResumeSkills.has(skill)) miss.push(skill);
  }
  for (const skill of allResumeSkills) {
    if (!vacancySkills.has(skill)) extra.push(skill);
  }

  const total = allResumeSkills.size + miss.length;
  const matchPct = total > 0 ? Math.round((match.length / total) * 100) : 0;

  section.style.display = '';

  // Ring chart
  const ring = refs.shadowRoot?.getElementById('res-gap-ring');
  if (ring) {
    const deg = Math.round(matchPct * 3.6);
    ring.style.background = 'conic-gradient(#059669 0deg ' + deg + 'deg, #e4e4e7 ' + deg + 'deg 360deg)';
    const inner = ring.querySelector('div');
    if (inner) inner.textContent = matchPct + '%';
  }

  // Subtitle
  const subtitle = refs.shadowRoot?.getElementById('res-gap-subtitle');
  if (subtitle) {
    const resumeTitle = r.title || 'Без названия';
    if (matchPct >= 80) {
      subtitle.textContent = resumeTitle + ' — топ ' + Math.round(100 - matchPct) + '% кандидатов';
    } else if (matchPct >= 50) {
      subtitle.textContent = resumeTitle + ' — совпадение ' + matchPct + '%';
    } else {
      subtitle.textContent = resumeTitle + ' — рекомендуется дополнить навыки';
    }
  }

  // Stacked bar
  const barMatch = refs.shadowRoot?.getElementById('res-gap-bar-match');
  const barMiss = refs.shadowRoot?.getElementById('res-gap-bar-miss');
  const barExtra = refs.shadowRoot?.getElementById('res-gap-bar-extra');
  if (barMatch && barMiss && barExtra) {
    barMatch.style.width = (total > 0 ? ((match.length / total) * 100).toFixed(1) : 0) + '%';
    barMiss.style.width = (total > 0 ? ((miss.length / total) * 100).toFixed(1) : 0) + '%';
    barExtra.style.width = (total > 0 ? ((extra.length / total) * 100).toFixed(1) : 0) + '%';
  }

  updateGapRow('res-gap-match-row', 'res-gap-match-count', 'res-gap-match-list', match, 'skill-match');
  updateGapRow('res-gap-miss-row', 'res-gap-miss-count', 'res-gap-miss-list', miss, 'skill-miss');
  updateGapRow('res-gap-extra-row', 'res-gap-extra-count', 'res-gap-extra-list', extra, 'skill-extra');
  updateGapRecommendation(miss, matchPct);
}

// ═══════════════════════════════════════════════
// GAP HELPERS
// ═══════════════════════════════════════════════

function updateGapRow(rowId, countId, listId, skills, cssClass) {
  const row = refs.shadowRoot?.getElementById(rowId);
  const countEl = refs.shadowRoot?.getElementById(countId);
  const listEl = refs.shadowRoot?.getElementById(listId);
  if (!row) return;
  if (skills.length === 0) { row.style.display = 'none'; return; }
  row.style.display = '';
  if (countEl) countEl.textContent = skills.length;
  if (listEl) {
    const visible = skills.slice(0, 5);
    const remainder = skills.length - visible.length;
    let html = visible.map(s => '<span class="skill-tag ' + cssClass + '">' + esc(s) + '</span>').join('');
    if (remainder > 0) {
      html += '<span style="font-size:11px;color:#71717a;padding:3px 0;">+' + remainder + '</span>';
    }
    listEl.innerHTML = html;
  }
}

function updateGapRecommendation(miss, matchPct) {
  const block = refs.shadowRoot?.getElementById('res-gap-recommendation');
  const text = refs.shadowRoot?.getElementById('res-gap-recommendation-text');
  if (!block || !text) return;
  if (miss.length === 0 || matchPct >= 90) { block.style.display = 'none'; return; }
  block.style.display = 'flex';
  const topMiss = miss.slice(0, 3);
  const potentialPct = Math.min(95, matchPct + topMiss.length * 5);
  const boldSkills = topMiss.map(s => '<b>' + esc(s) + '</b>').join(', ');
  text.innerHTML = 'Добавьте ' + boldSkills + ' для роста до <b>' + potentialPct + '%</b> совпадения с рынком.';
}

function normalizeSkills(skills) {
  const set = new Set();
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    if (name) set.add(name.toLowerCase().trim());
  }
  return set;
}

function collectVacancySkills() {
  const skills = new Set();
  const vacancies = panelState.vacancies || [];
  for (const v of vacancies) {
    if (v.tags && Array.isArray(v.tags)) {
      for (const t of v.tags) {
        const name = typeof t === 'string' ? t : (t.name || '');
        if (name) skills.add(name.toLowerCase().trim());
      }
    }
    if (v.skills && Array.isArray(v.skills)) {
      for (const s of v.skills) {
        const name = typeof s === 'string' ? s : (s.name || '');
        if (name) skills.add(name.toLowerCase().trim());
      }
    }
  }
  return skills;
}
