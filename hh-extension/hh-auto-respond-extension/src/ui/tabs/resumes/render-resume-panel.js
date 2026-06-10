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
  const selectorTrigger = refs.shadowRoot?.getElementById('res-selector-trigger');
  const selectorLabel = refs.shadowRoot?.getElementById('res-selector-label');

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
      badgeEl.textContent = 'действующее';
      badgeEl.className = 'badge badge-green';
      badgeEl.style.fontSize = '11px';
    }
    if (avatarEl) {
      const initials = getInitials(resume.name || resume.title || resume.gender || '?');
      avatarEl.textContent = initials;
    }
    // Show selector trigger if multiple resumes available
    const allResumes = panelState.myResumes || [];
    if (selectorTrigger && selectorLabel) {
      if (allResumes.length > 1) {
        selectorTrigger.style.display = 'inline-flex';
        selectorLabel.textContent = resume.title || 'Без названия';
      } else {
        selectorTrigger.style.display = 'none';
      }
    }
  } else {
    if (titleEl) titleEl.textContent = 'Действующее резюме';
    if (subtitleEl) subtitleEl.textContent = 'Нажмите «Загрузить» для выбора резюме';
    if (badgeEl) {
      badgeEl.textContent = 'не выбрано';
      badgeEl.className = 'badge badge-zinc';
      badgeEl.style.fontSize = '11px';
    }
    if (avatarEl) avatarEl.textContent = '?';
    if (selectorTrigger) selectorTrigger.style.display = 'none';
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
    let hint = 'Перейдите на страницу резюме на hh.ru<br>и нажмите «Загрузить с текущей страницы».';
    if (pageType === 'resume-list') {
      hint = 'Нажмите «Загрузить», чтобы увидеть резюме на этой странице.';
    }
    container.innerHTML = '<div class="har-empty">Действующее резюме не выбрано.<br>' + hint + '</div>';
    updateAccordionHeader(null);
    return;
  }

  updateAccordionHeader(r);
  updateResumeSelector();

  // Auto-expand the main accordion
  const body = refs.shadowRoot?.getElementById('res-parsing-body');
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    const chevron = body.previousElementSibling?.querySelector('.timeline-chevron');
    if (chevron) chevron.classList.add('open');
  }

  // Build 6 accordion sections matching wireframe
  container.innerHTML =
    '<div class="tl-item">' + buildPersonalSection(r) + '</div>' +
    '<div class="tl-item">' + buildSalarySection(r) + '</div>' +
    '<div class="tl-item">' + buildExperienceSection(r) + '</div>' +
    '<div class="tl-item">' + buildEducationSection(r) + '</div>' +
    '<div class="tl-item">' + buildLanguagesSection(r) + '</div>' +
    '<div class="tl-item">' + buildContactsSection(r) + '</div>' +
    // Reparse button
    '<div style="padding-top:12px;padding-left:24px;">' +
      '<button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>' +
        ' Перепарсить действующее' +
      '</button>' +
    '</div>';

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

// ═══════════════════════════════════════════════
// RESUME SELECTOR DROPDOWN
// ═══════════════════════════════════════════════

function updateResumeSelector() {
  const allResumes = panelState.myResumes || [];
  const trigger = refs.shadowRoot?.getElementById('res-selector-trigger');
  const dropdown = refs.shadowRoot?.getElementById('res-selector-dropdown');
  if (!trigger || !dropdown) return;

  // Show trigger only if 2+ resumes
  if (allResumes.length <= 1) {
    trigger.style.display = 'none';
    return;
  }
  trigger.style.display = 'inline-flex';

  // Remove old listeners by replacing node
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);

  newTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display !== 'none';
    if (isOpen) {
      dropdown.style.display = 'none';
      return;
    }
    // Build dropdown items
    const activeId = panelState.resume?.id;
    dropdown.innerHTML = allResumes.map((r, idx) => {
      const isActive = r.id === activeId;
      const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
      const visBadge = vis === 'visible'
        ? '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">Видимо</span>'
        : vis === 'hidden'
          ? '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">Скрыто</span>'
          : '';
      return '<div data-select-resume-idx="' + idx + '" style="padding:8px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;' +
        (isActive ? 'background:#f0fdf4;font-weight:600;' : '') +
        'border-bottom:1px solid #f4f4f5;font-size:12px;">' +
        '<span style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + (isActive ? '#059669' : '#d4d4d8') + ';"></span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.title || 'Без названия') + '</span>' +
        visBadge +
      '</div>';
    }).join('');
    dropdown.style.display = 'block';

    // Bind item clicks
    dropdown.querySelectorAll('[data-select-resume-idx]').forEach(item => {
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = parseInt(item.getAttribute('data-select-resume-idx'), 10);
        const resume = allResumes[idx];
        if (!resume) return;
        panelState.resume = resume;
        panelState._resumeCleared = false;
        chrome.storage.local.set({ myResume: resume });
        dropdown.style.display = 'none';
        renderResumePanel();
        renderMyResumesPanel();
      });
    });
  });

  // Close dropdown on outside click (within shadow root)
  const sr = refs.shadowRoot;
  if (sr) {
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && !newTrigger.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    };
    sr.addEventListener('click', closeDropdown, true);
    // Also close on scroll
    const closeOnScroll = () => { dropdown.style.display = 'none'; };
    sr.addEventListener('scroll', closeOnScroll, true);
  }
}
