/**
 * UI: RESUMES — Accordion Header
 * ================================
 * Updates the resume accordion header with title, subtitle, badge, avatar.
 * Split from render-resume-panel.js for anti-monolith compliance.
 */

import { refs } from '../../state.js';
import { getInitials } from './resume-helpers.js';

/**
 * Calculate total years of experience from resume.experience array.
 * NOTE: Overlapping periods are counted multiple times (simplified calculation).
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
 */
function yearWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'лет';
  if (mod10 === 1) return 'год';
  if (mod10 >= 2 && mod10 <= 4) return 'года';
  return 'лет';
}

/**
 * Update the accordion header with resume info (title, subtitle, badge, avatar).
 * Called after loading or selecting a resume.
 * @param {object|null} resume - Active resume object, or null if none selected
 */
export function updateAccordionHeader(resume) {
  const titleEl = refs.shadowRoot?.getElementById('res-title');
  const subtitleEl = refs.shadowRoot?.getElementById('res-subtitle');
  const badgeEl = refs.shadowRoot?.getElementById('res-parsed-badge');
  const avatarEl = refs.shadowRoot?.getElementById('res-avatar');

  if (resume && resume.id) {
    if (titleEl) titleEl.textContent = 'Действующее резюме';
    if (subtitleEl) {
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
  } else {
    if (titleEl) titleEl.textContent = 'Действующее резюме';
    if (subtitleEl) subtitleEl.textContent = 'Выберите резюме из списка ниже';
    if (badgeEl) {
      badgeEl.textContent = 'не выбрано';
      badgeEl.className = 'badge badge-zinc';
      badgeEl.style.fontSize = '11px';
    }
    if (avatarEl) avatarEl.textContent = '?';
  }
}
