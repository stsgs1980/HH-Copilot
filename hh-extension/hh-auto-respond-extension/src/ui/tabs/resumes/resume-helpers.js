/**
 * UI: RESUMES — Shared Helpers
 * ==============================
 * Common utilities for resume rendering:
 * getInitials, buildSubAccordion, buildGrid, toggleSub, attachSubToggle,
 * updateSkillsSection, updateSkillGapSection
 */

import { refs } from '../../state.js';
import { panelState } from '../../state.js';
import { esc } from '../../html.js';

// ═══════════════════════════════════════════════
// INITIALS FROM NAME
// ═══════════════════════════════════════════════

export function getInitials(text) {
  if (!text) return '?';
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return text.substring(0, 2).toUpperCase();
}

// ═══════════════════════════════════════════════
// SUB-ACCORDION TOGGLE
// ═══════════════════════════════════════════════

export function toggleSub(sectionId, chevronId) {
  const body = refs.shadowRoot?.getElementById(sectionId);
  const chev = refs.shadowRoot?.getElementById(chevronId);
  if (!body) return;
  body.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}

// ═══════════════════════════════════════════════
// BUILD SUB-ACCORDION HTML
// ═══════════════════════════════════════════════

export function buildSubAccordion(bodyId, chevronId, title, count, dotColor, contentHtml) {
  return '' +
    '<div class="tl-dot" style="background:' + dotColor + ';"></div>' +
    '<div class="sub-toggle" tabindex="0" role="button" data-sub-toggle="' + bodyId + '" data-sub-chev="' + chevronId + '">' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<span style="font-size:11px;font-weight:600;color:' + dotColor + ';">' + esc(title) + '</span>' +
        '<span style="font-size:11px;color:#71717a;">' + esc(count) + '</span>' +
      '</div>' +
      '<svg class="sub-chevron" id="' + chevronId + '" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</div>' +
    '<div class="sub-body" id="' + bodyId + '">' + contentHtml + '</div>';
}

// ═══════════════════════════════════════════════
// BUILD KEY-VALUE GRID
// ═══════════════════════════════════════════════

export function buildGrid(pairs) {
  const rows = pairs
    .filter(([, val]) => val)
    .map(([label, val]) =>
      '<span style="color:#71717a;">' + esc(label) + '</span><span style="font-weight:500;">' + esc(val) + '</span>'
    ).join('');
  if (!rows) return '<div style="padding:8px;font-size:11px;color:#71717a;">Данные не найдены</div>';
  return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;">' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + rows + '</div></div>';
}

// ═══════════════════════════════════════════════
// ATTACH SUB-ACCORDION TOGGLE EVENT
// ═══════════════════════════════════════════════

export function attachSubToggle(bodyId, chevronId) {
  const toggleEl = refs.shadowRoot?.querySelector('[data-sub-toggle="' + bodyId + '"]');
  if (!toggleEl) return;
  toggleEl.addEventListener('click', () => {
    toggleSub(bodyId, chevronId);
  });
  toggleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSub(bodyId, chevronId);
    }
  });
}

// ═══════════════════════════════════════════════
// UPDATE SKILLS CARD (separate section)
// ═══════════════════════════════════════════════

export function updateSkillsSection(r) {
  const section = refs.shadowRoot?.getElementById('res-skills-section');
  const list = refs.shadowRoot?.getElementById('res-skills-list');
  const count = refs.shadowRoot?.getElementById('res-skills-count');
  if (!section || !list) return;

  if (!r || !r.skills || r.skills.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  if (count) count.textContent = r.skills.length + ' навыков';
  list.innerHTML = r.skills.map(s => '<span class="skill-tag skill-match">' + esc(s) + '</span>').join('');
}

// ═══════════════════════════════════════════════
// SKILL GAP ANALYSIS (wireframe: ring + bar + 3 categories + recommendation)
// ═══════════════════════════════════════════════

export function updateSkillGapSection(r) {
  const section = refs.shadowRoot?.getElementById('res-gap-section');
  if (!section) return;

  // Need resume skills and at least some vacancy data
  if (!r || !r.skills || r.skills.length === 0) {
    section.style.display = 'none';
    return;
  }

  const resumeSkills = normalizeSkills(r.skills);
  const vacancySkills = collectVacancySkills();

  // If no vacancy data yet, show placeholder
  if (vacancySkills.size === 0) {
    section.style.display = '';
    const subtitle = refs.shadowRoot?.getElementById('res-gap-subtitle');
    const resumeTitle = r.title || 'Без названия';
    if (subtitle) subtitle.textContent = resumeTitle + ' — откройте вакансии для сравнения';
    return;
  }

  // Categorize: match, miss, extra
  const match = [];
  const miss = [];
  const extra = [];

  for (const skill of resumeSkills) {
    if (vacancySkills.has(skill)) {
      match.push(skill);
    }
  }

  for (const skill of vacancySkills) {
    if (!resumeSkills.has(skill)) {
      miss.push(skill);
    }
  }

  for (const skill of resumeSkills) {
    if (!vacancySkills.has(skill)) {
      extra.push(skill);
    }
  }

  const total = resumeSkills.size + miss.length;
  const matchPct = total > 0 ? Math.round((match.length / total) * 100) : 0;

  // Show section
  section.style.display = '';

  // Update ring — conic-gradient angle: matchPct * 3.6 degrees
  const ring = refs.shadowRoot?.getElementById('res-gap-ring');
  if (ring) {
    const deg = Math.round(matchPct * 3.6);
    ring.style.background = 'conic-gradient(#059669 0deg ' + deg + 'deg, #e4e4e7 ' + deg + 'deg 360deg)';
    const inner = ring.querySelector('div');
    if (inner) {
      inner.textContent = matchPct + '%';
    }
  }

  // Update subtitle — show which resume is used for matching
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

  // Update stacked bar
  const barMatch = refs.shadowRoot?.getElementById('res-gap-bar-match');
  const barMiss = refs.shadowRoot?.getElementById('res-gap-bar-miss');
  const barExtra = refs.shadowRoot?.getElementById('res-gap-bar-extra');
  if (barMatch && barMiss && barExtra) {
    const matchW = total > 0 ? ((match.length / total) * 100).toFixed(1) : 0;
    const missW = total > 0 ? ((miss.length / total) * 100).toFixed(1) : 0;
    const extraW = total > 0 ? ((extra.length / total) * 100).toFixed(1) : 0;
    barMatch.style.width = matchW + '%';
    barMiss.style.width = missW + '%';
    barExtra.style.width = extraW + '%';
  }

  // Row 1: Match
  updateGapRow('res-gap-match-row', 'res-gap-match-count', 'res-gap-match-list', match, 'skill-match');

  // Row 2: Miss
  updateGapRow('res-gap-miss-row', 'res-gap-miss-count', 'res-gap-miss-list', miss, 'skill-miss');

  // Row 3: Extra
  updateGapRow('res-gap-extra-row', 'res-gap-extra-count', 'res-gap-extra-list', extra, 'skill-extra');

  // Recommendation
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

  if (skills.length === 0) {
    row.style.display = 'none';
    return;
  }

  row.style.display = '';
  if (countEl) countEl.textContent = skills.length;
  if (listEl) {
    // Show up to 5 tags + "+N" remainder
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

  if (miss.length === 0 || matchPct >= 90) {
    block.style.display = 'none';
    return;
  }

  block.style.display = 'flex';
  const topMiss = miss.slice(0, 3);
  const potentialPct = Math.min(95, matchPct + topMiss.length * 5);
  const boldSkills = topMiss.map(s => '<b>' + esc(s) + '</b>').join(', ');
  text.innerHTML = 'Добавьте ' + boldSkills + ' для роста до <b>' + potentialPct + '%</b> совпадения с рынком.';
}

// ═══════════════════════════════════════════════
// NORMALIZE SKILLS — lowercase for comparison
// ═══════════════════════════════════════════════

function normalizeSkills(skills) {
  const set = new Set();
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    if (name) set.add(name.toLowerCase().trim());
  }
  return set;
}

// ═══════════════════════════════════════════════
// COLLECT VACANCY SKILLS from parsed vacancies
// ═══════════════════════════════════════════════

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
