/**
 * UI: RESUMES — Shared Helpers
 * ==============================
 * Common utilities for resume rendering:
 * getInitials, buildSubAccordion, buildGrid, toggleSub, attachSubToggle,
 * updateSkillsSection
 *
 * Skill gap analysis is in ./resume-helpers-gap.js
 */

import { refs } from '../../state.js';
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
// UPDATE SKILLS CARD
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

// Re-export from gap module
export { updateSkillGapSection } from './resume-helpers-gap.js';
