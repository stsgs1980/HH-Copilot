/**
 * UI: RESUMES — Skill Gap Analysis
 * ==================================
 * Skill gap visualization: ring chart, stacked bar, 4 categories, recommendation.
 * Split from resume-helpers.js for anti-monolith compliance.
 *
 * v1.9.22.0: Added synonym category — related skills that partially match.
 *   Categories: match (exact), synonym (related), miss (absent), extra (resume-only)
 */

import { refs, panelState } from '../../state.js';
import { esc } from '../../html.js';
import { collectAllVacancySkills } from '../../../lib/vacancy-skills-collector.js';
import { findSynonymMatch, SYNONYM_WEIGHT } from '../../../lib/skill-synonyms.js';

// ═══════════════════════════════════════════════
// SKILL GAP ANALYSIS
// ═══════════════════════════════════════════════

/**
 * Update the Skill Gap Analysis section.
 * Shows: ring chart, stacked bar, 4 categories, recommendation.
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
  const vacancySkills = collectAllVacancySkills(panelState.vacancies);

  if (vacancySkills.size === 0) {
    // No vacancies loaded — hide the gap section entirely (no point showing 0% ring)
    section.style.display = 'none';
    return;
  }

  // v1.9.22.0: 4 categories instead of 3
  const match = [];       // exact match
  const synonym = [];     // synonym match (related skill)
  const miss = [];        // completely absent
  const extra = [];       // resume-only

  for (const skill of allResumeSkills) {
    if (vacancySkills.has(skill)) match.push(skill);
  }
  for (const skill of vacancySkills) {
    if (allResumeSkills.has(skill)) {
      // already in match — skip
    } else {
      // v1.9.22.0: check synonym before marking as missing
      const synMatch = findSynonymMatch(skill, allResumeSkills);
      if (synMatch) {
        synonym.push({ vacancy: skill, resume: synMatch });
      } else {
        miss.push(skill);
      }
    }
  }
  for (const skill of allResumeSkills) {
    if (!vacancySkills.has(skill)) extra.push(skill);
  }

  // Weighted match percentage: exact=1.0, synonym=0.5
  const effectiveMatch = match.length + synonym.length * SYNONYM_WEIGHT;
  const total = vacancySkills.size;
  const matchPct = total > 0 ? Math.round((effectiveMatch / total) * 100) : 0;

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
    barMatch.style.width = (total > 0 ? ((effectiveMatch / total) * 100).toFixed(1) : 0) + '%';
    barMiss.style.width = (total > 0 ? ((miss.length / total) * 100).toFixed(1) : 0) + '%';
    barExtra.style.width = (total > 0 ? ((extra.length / total) * 100).toFixed(1) : 0) + '%';
  }

  updateGapRow('res-gap-match-row', 'res-gap-match-count', 'res-gap-match-list', match, 'skill-match');
  // v1.9.22.0: synonym row shows "vacancy ≈ resume" format
  updateSynonymGapRow('res-gap-synonym-row', 'res-gap-synonym-count', 'res-gap-synonym-list', synonym);
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
      html += '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>';
    }
    listEl.innerHTML = html;
  }
}

/**
 * v1.9.22.0: Render synonym matches as "vacancy ≈ resume" skill tags.
 */
function updateSynonymGapRow(rowId, countId, listId, synonyms) {
  const row = refs.shadowRoot?.getElementById(rowId);
  const countEl = refs.shadowRoot?.getElementById(countId);
  const listEl = refs.shadowRoot?.getElementById(listId);
  if (!row) return;
  if (synonyms.length === 0) { row.style.display = 'none'; return; }
  row.style.display = '';
  if (countEl) countEl.textContent = synonyms.length;
  if (listEl) {
    const visible = synonyms.slice(0, 5);
    const remainder = synonyms.length - visible.length;
    let html = visible.map(s =>
      '<span class="skill-tag skill-synonym" title="Связанный навык: «' + esc(s.resume) + '» ≈ «' + esc(s.vacancy) + '»">' +
      esc(s.vacancy) + ' ≈ ' + esc(s.resume) + '</span>'
    ).join('');
    if (remainder > 0) {
      html += '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + '</span>';
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
    if (name) {
      set.add(
        name.toLowerCase().trim()
          .replace(/[-–—]/g, ' ')
          .replace(/ё/g, 'е')
          .replace(/\s+/g, ' ')
      );
    }
  }
  return set;
}
