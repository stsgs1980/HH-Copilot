/**
 * UI: RESUMES — Main Resume Panel
 * =================================
 * Renders the parsed resume data in the sidebar resume tab.
 * Wireframe: 6 accordion sections + skills card + gap analysis card.
 */

import { panelState, refs } from '../../state.js';
import { esc } from '../../html.js';
import { getResumePageType } from '../../../parsers/resume-detail.js';
import {
  getInitials, attachSubToggle, updateSkillsSection, updateSkillGapSection
} from './resume-helpers.js';
import { renderMyResumesPanel, renderResumeListPanel } from './render-my-resumes.js';
import {
  buildPersonalSection, buildSalarySection,
  buildExperienceSection, buildEducationSection,
  buildLanguagesSection, buildContactsSection
} from './section-builders.js';

// ═══════════════════════════════════════════════
// ACCORDION HEADER UPDATE
// ═══════════════════════════════════════════════

function updateAccordionHeader(resume) {
  const titleEl = refs.shadowRoot?.getElementById('res-title');
  const subtitleEl = refs.shadowRoot?.getElementById('res-subtitle');
  const badgeEl = refs.shadowRoot?.getElementById('res-parsed-badge');
  const avatarEl = refs.shadowRoot?.getElementById('res-avatar');

  if (resume && resume.id) {
    if (titleEl) titleEl.textContent = 'Действующее резюме';
    if (subtitleEl) {
      // Wireframe: "Алексей Козлов • 7 лет опыта • 18 навыков"
      const parts = [];
      if (resume.name) parts.push(resume.name);
      else if (resume.title) parts.push(resume.title);
      const expYears = calcExperienceYears(resume);
      if (expYears > 0) parts.push(expYears + ' ' + yearWord(expYears) + ' опыта');
      if (resume.skills && resume.skills.length) parts.push(resume.skills.length + ' навыков');
      subtitleEl.textContent = parts.join(' • ') || 'Резюме загружено';
    }
    if (badgeEl) {
      const vis = resume.visibility || (resume.hidden ? 'hidden' : 'unknown');
      if (vis === 'hidden') {
        badgeEl.textContent = 'действующее (скрыто)';
        badgeEl.className = 'badge badge-amber';
      } else {
        badgeEl.textContent = 'действующее';
        badgeEl.className = 'badge badge-green';
      }
      badgeEl.style.fontSize = '11px';
    }
    if (avatarEl) {
      const initials = getInitials(resume.name || resume.title || resume.gender || '?');
      avatarEl.textContent = initials;
    }
    // No selector trigger in header anymore — selection is in "Все резюме" list below
  } else {
    if (titleEl) titleEl.textContent = 'Действующее резюме';
    if (subtitleEl) subtitleEl.textContent = 'Нажмите «Загрузить» для выбора резюме';
    if (badgeEl) {
      badgeEl.textContent = 'не выбрано';
      badgeEl.className = 'badge badge-zinc';
      badgeEl.style.fontSize = '11px';
    }
    if (avatarEl) avatarEl.textContent = '?';
    // No selector trigger in header anymore
  }
}

// ═══════════════════════════════════════════════
// EXPERIENCE YEARS CALC
// ═══════════════════════════════════════════════

function calcExperienceYears(resume) {
  if (!resume.experience || resume.experience.length === 0) return 0;
  let totalMonths = 0;
  for (const job of resume.experience) {
    if (job.period) {
      const yearMatch = job.period.match(/(\d+)\s*(лет|год|года|г\.)/i);
      const monthMatch = job.period.match(/(\d+)\s*мес/i);
      if (yearMatch) totalMonths += parseInt(yearMatch[1], 10) * 12;
      if (monthMatch) totalMonths += parseInt(monthMatch[1], 10);
    }
  }
  return Math.round(totalMonths / 12);
}

function yearWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'лет';
  if (mod10 === 1) return 'год';
  if (mod10 >= 2 && mod10 <= 4) return 'года';
  return 'лет';
}

// ═══════════════════════════════════════════════
// MAIN RESUME PANEL RENDER
// ═══════════════════════════════════════════════

export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    const synced = panelState.myResumes || [];
    // Only auto-select from synced resumes if user hasn't explicitly cleared
    if (!panelState._resumeCleared && synced.length > 0 && synced[0].id) {
      panelState.resume = synced[0];
      chrome.storage.local.set({ myResume: synced[0] });
      renderResumePanel();
      return;
    }
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = 'Перейдите на страницу резюме на hh.ru<br>и нажмите «Взять со страницы».';
    if (pageType === 'resume-list') {
      hint = 'Нажмите «Загрузить», чтобы увидеть резюме на этой странице.';
    }
    container.innerHTML = '<div class="har-empty">Действующее резюме не выбрано.<br>' + hint + '</div>';
    updateAccordionHeader(null);
    return;
  }

  updateAccordionHeader(r);

  // Auto-expand the main accordion
  const body = refs.shadowRoot?.getElementById('res-parsing-body');
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    const chevron = body.previousElementSibling?.querySelector('.timeline-chevron');
    if (chevron) chevron.classList.add('open');
  }

  // Build 6 accordion sections matching wireframe
  const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
  const isActiveHidden = vis === 'hidden';
  const reparseBtn = isActiveHidden
    ? '<button class="btn btn-outline btn-sm" data-action="load-resume" style="width:100%;color:#b45309;border-color:#fbbf24;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>' +
        ' Перепарсить (скрытое)' +
      '</button>' +
      '<div style="font-size:10px;color:#92400e;margin-top:4px;padding-left:4px;">Скрытое резюме не видно работодателям — мэтчинг недоступен</div>'
    : '<button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>' +
        ' Перепарсить действующее' +
      '</button>';

  container.innerHTML =
    '<div class="tl-item">' + buildPersonalSection(r) + '</div>' +
    '<div class="tl-item">' + buildSalarySection(r) + '</div>' +
    '<div class="tl-item">' + buildExperienceSection(r) + '</div>' +
    '<div class="tl-item">' + buildEducationSection(r) + '</div>' +
    '<div class="tl-item">' + buildLanguagesSection(r) + '</div>' +
    '<div class="tl-item">' + buildContactsSection(r) + '</div>' +
    // Reparse button (context-aware)
    '<div style="padding-top:12px;padding-left:24px;">' + reparseBtn + '</div>';

  // Attach sub-accordion toggle listeners
  attachSubToggle('subPersonal', 'chevPersonal');
  attachSubToggle('subSalary', 'chevSalary');
  attachSubToggle('subExp', 'chevExp');
  attachSubToggle('subEdu', 'chevEdu');
  attachSubToggle('subLang', 'chevLang');
  attachSubToggle('subContacts', 'chevContacts');

  // Update skills section if visible
  updateSkillsSection(r);

  // Update Skill Gap Analysis section
  updateSkillGapSection(r);

  // Also render myResumes list in sync section
  renderMyResumesPanel();
}


