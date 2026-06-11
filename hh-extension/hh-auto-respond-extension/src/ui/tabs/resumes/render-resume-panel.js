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
import { setActiveResume } from '../../../lib/storage.js';

// ═══════════════════════════════════════════════
// ACCORDION HEADER UPDATE
// ═══════════════════════════════════════════════

/**
 * Update the accordion header with resume info (title, subtitle, badge, avatar).
 * Called after loading or selecting a resume.
 * @param {object|null} resume - Active resume object, or null if none selected
 */
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
    if (subtitleEl) subtitleEl.textContent = 'Выберите резюме из списка ниже';
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

/**
 * Calculate total years of experience from resume.experience array.
 * NOTE: Overlapping periods are counted multiple times (simplified calculation).
 * @param {object} resume - Resume object with experience array
 * @returns {number} Total years of experience (rounded)
 */
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

/**
 * Return the correct Russian grammatical form of "year" for a number.
 * E.g. 1 год, 2 года, 5 лет, 21 год, 22 года, 25 лет.
 * @param {number} n - Number
 * @returns {string} 'год' | 'года' | 'лет'
 */
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

/**
 * Render the main resume panel in the sidebar.
 *
 * Shows either:
 *   - Empty state with contextual hint (based on page type)
 *   - Auto-selected first resume from synced list (if _resumeCleared is false)
 *   - Full resume display with 6 accordion sections + visibility warning
 *   - Resume list panel (if on /applicant/resumes with no active resume)
 *
 * Also triggers rendering of the "My Resumes" sync section.
 */
export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    const synced = panelState.myResumes || [];
    // Only auto-select from synced resumes if user hasn't explicitly cleared
    if (!panelState._resumeCleared && synced.length > 0 && synced[0].id) {
      panelState.resume = synced[0];
      setActiveResume(synced[0]);
      renderResumePanel();
      return;
    }
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = 'Выберите резюме ниже или перейдите на страницу резюме.';
    if (pageType === 'resume-list') {
      hint = 'Нажмите «Синхронизировать все» ниже.';
    } else if (pageType === 'resume-detail') {
      hint = 'Нажмите «Взять со страницы» ниже.';
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
  // NOTE: Reparse button removed from here — now inline on active resume card in "Все резюме"
  const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
  container.innerHTML =
    '<div class="tl-item">' + buildPersonalSection(r) + '</div>' +
    '<div class="tl-item">' + buildSalarySection(r) + '</div>' +
    '<div class="tl-item">' + buildExperienceSection(r) + '</div>' +
    '<div class="tl-item">' + buildEducationSection(r) + '</div>' +
    '<div class="tl-item">' + buildLanguagesSection(r) + '</div>' +
    '<div class="tl-item">' + buildContactsSection(r) + '</div>' +
    // Hidden resume warning (no button, just info)
    (vis === 'hidden'
      ? '<div style="font-size:10px;color:#92400e;padding:6px 4px 0 28px;">Скрытое резюме не видно работодателям — мэтчинг недоступен</div>'
      : '');

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


