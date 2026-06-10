/**
 * UI: PANEL — EVENT BINDING
 * ===========================
 * Tab switching, timeline/accordion toggling, sidebar click delegation,
 * and input change handlers. All event-related logic extracted from
 * panel/index.js to keep the main module under 250 lines.
 */

import { panelState, refs } from '../state.js';
import { renderResumePanel } from '../tabs/resumes.js';
import { renderStats, clearLog } from '../tabs/stats.js';
import { renderNegotiationList } from '../tabs/negotiations.js';
import { diagnoseResumeDOM } from '../../parsers/resume-detail.js';
import { addBlacklistItem, removeBlacklistItem, selectConversation, filterVacancies } from './helpers.js';

import { toggleSidebar, updateAuthState, updateAuthStateAsync } from './index.js';
import { resetAuthCache } from '../auth.js';

// ═══════════════════════════════════════════════
// TAB SWITCHING (6 tabs, CSS class toggle)
// ═══════════════════════════════════════════════

function switchTab(tabId) {
  panelState.activeTab = tabId;
  const sr = refs.shadowRoot;
  if (!sr) return;

  sr.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  sr.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab-' + tabId);
  });

  /* Lazy render on tab activation */
  if (tabId === 'resume') renderResumePanel();
  if (tabId === 'stats') renderStats();
  if (tabId === 'negotiations') renderNegotiationList();
}

// ═══════════════════════════════════════════════
// TIMELINE / ACCORDION TOGGLES
// ═══════════════════════════════════════════════

function toggleTimeline(toggleEl) {
  const body = toggleEl.nextElementSibling;
  const chevron = toggleEl.querySelector('.timeline-chevron');
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open', isOpen);
}

function toggleSub(subId, chevId) {
  const sr = refs.shadowRoot;
  const sub = sr?.getElementById(subId);
  const chev = sr?.getElementById(chevId);
  if (sub) sub.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}

// ═══════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════

export function bindAllEvents(container) {
  bindTabClicks(container);
  bindSidebarClicks(container);
  bindTimelineToggles(container);
  bindInputChanges(container);
}

export function bindTabClicks(container) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function bindSidebarClicks(container) {
  container.addEventListener('click', (e) => {
    const t = e.target;

    /* Close panel */
    if (t.closest('[data-action="close-panel"]')) { toggleSidebar(); return; }

    /* Vacancy actions */
    const applyBtn = t.closest('[data-action="apply"]');
    if (applyBtn) { e.preventDefault(); window.dispatchEvent(new CustomEvent('hh-ar-apply', { detail: { vacancyId: applyBtn.dataset.id } })); return; }
    if (t.closest('[data-action="apply-all"]')) { window.dispatchEvent(new CustomEvent('hh-ar-apply-all')); return; }
    if (t.closest('[data-action="pause"]')) { window.dispatchEvent(new CustomEvent('hh-ar-toggle-status')); return; }
    if (t.closest('[data-action="refresh"]')) { window.dispatchEvent(new CustomEvent('hh-ar-refresh')); return; }

    /* Auth — reset cache to force real async re-check with cookie API verification */
    if (t.closest('[data-action="check-auth"]')) { resetAuthCache(); updateAuthStateAsync(); return; }
    if (t.closest('#har-retry-auth')) { resetAuthCache(); updateAuthStateAsync(); return; }
    if (t.closest('#authIndicator')) { resetAuthCache(); updateAuthStateAsync(); return; }

    /* Logout — redirect to hh.ru logout */
    if (t.closest('[data-action="logout"]')) { window.location.href = 'https://hh.ru/account/logout'; return; }

    /* Resume */
    if (t.closest('[data-action="load-resume"]')) { console.log('[HH-AR][Events] load-resume clicked, dispatching hh-ar-load-resume'); window.dispatchEvent(new CustomEvent('hh-ar-load-resume')); return; }
    if (t.closest('[data-action="sync-resumes"]')) { console.log('[HH-AR][Events] sync-resumes clicked'); window.dispatchEvent(new CustomEvent('hh-ar-sync-resumes')); return; }
    if (t.closest('[data-action="analyze-skills"]')) { import('../tabs/resumes/resume-helpers.js').then(m => m.updateSkillGapSection(panelState.resume)); return; }
    if (t.closest('[data-action="clear-resume"]')) { clearResumeData(); return; }
    if (t.closest('[data-action="dump-resume"]')) { dumpResumeToConsole(); return; }
    if (t.closest('[data-action="test-parse"]')) { testParseResume(); return; }

    /* Quick action tab switches */
    const tabSwitch = t.closest('[data-tab-switch]');
    if (tabSwitch) { switchTab(tabSwitch.dataset.tabSwitch); return; }

    /* Daily reset */
    if (t.closest('[data-action="reset-daily"]')) { window.dispatchEvent(new CustomEvent('hh-ar-reset-daily')); return; }

    /* Diagnose DOM */
    if (t.closest('[data-action="diagnose-dom"]')) { diagnoseResumeDOM(); return; }

    /* Blacklist */
    if (t.closest('[data-action="bl-add"]')) { addBlacklistItem(); return; }
    const blRemove = t.closest('[data-bl-remove]');
    if (blRemove) { removeBlacklistItem(blRemove.dataset.blRemove); return; }

    /* Clear log */
    if (t.closest('[data-action="clear-log"]')) { clearLog(); return; }

    /* Conversation select */
    const convItem = t.closest('[data-conv-id]');
    if (convItem) { selectConversation(convItem.dataset.convId); return; }
  });
}

function bindTimelineToggles(container) {
  container.addEventListener('click', (e) => {
    const tl = e.target.closest('[data-timeline]');
    if (tl) { toggleTimeline(tl); return; }
    const sub = e.target.closest('[data-sub-toggle]');
    if (sub) { toggleSub(sub.dataset.subId, sub.dataset.chevId); return; }
  });

  /* Keyboard support for toggleable elements */
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const tl = e.target.closest('[data-timeline]') || e.target.closest('[data-sub-toggle]');
      if (tl) { e.preventDefault(); tl.click(); }
    }
  });
}

function bindInputChanges(container) {
  /* Score range slider */
  const scoreRange = container.querySelector('#vac-score-range');
  const scoreLabel = container.querySelector('#vac-score-label');
  if (scoreRange && scoreLabel) {
    scoreRange.addEventListener('input', () => {
      scoreLabel.textContent = scoreRange.value + '%';
      filterVacancies();
    });
  }

  /* Vacancy search input */
  const searchInput = container.querySelector('#vac-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterVacancies());
  }

  /* Vacancy status filter */
  const statusFilter = container.querySelector('#vac-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => filterVacancies());
  }
}

// ═══════════════════════════════════════════════
// DIAGNOSTIC FUNCTIONS
// ═══════════════════════════════════════════════

function setStatusLine(text) {
  const el = refs.shadowRoot?.getElementById('res-status-line');
  if (el) el.textContent = text;
}

function clearResumeData() {
  console.log('[HH-AR][Diag] Clearing resume data...');
  panelState.resume = null;
  panelState._resumeCleared = true;
  panelState.resumeList = [];
  chrome.storage.local.remove('myResume', () => {
    console.log('[HH-AR][Diag] myResume removed from storage');
    setStatusLine('Резюме очищено из памяти и storage');
    renderResumePanel();
  });
}

function dumpResumeToConsole() {
  console.log('[HH-AR][Diag] === DUMP START ===');
  console.log('[HH-AR][Diag] panelState.resume:', JSON.stringify(panelState.resume, null, 2));
  console.log('[HH-AR][Diag] panelState.resumeList:', panelState.resumeList?.length);
  console.log('[HH-AR][Diag] panelState.myResumes:', panelState.myResumes?.length);
  console.log('[HH-AR][Diag] panelState.vacancies:', panelState.vacancies?.length);
  console.log('[HH-AR][Diag] URL:', window.location.href);
  console.log('[HH-AR][Diag] Auth:', panelState.isLoggedIn);
  console.log('[HH-AR][Diag] === DUMP END ===');
  setStatusLine('Дамп выведен в консоль (F12)');
}

async function testParseResume() {
  console.log('[HH-AR][Diag] === TEST PARSE START ===');
  setStatusLine('Тест парсинга...');

  const path = window.location.pathname;
  console.log('[HH-AR][Diag] Current path:', path);
  console.log('[HH-AR][Diag] Is resume page:', /\/resume\/[a-f0-9]+/.test(path));
  console.log('[HH-AR][Diag] Is edit page:', /\/resume\/edit\//.test(path));
  console.log('[HH-AR][Diag] Is resumes list:', path.includes('/applicant/resumes'));

  if (/\/resume\/[a-f0-9]+/.test(path)) {
    try {
      let resume;

      if (/\/resume\/edit\//.test(path)) {
        // EDIT page: use fetch-based parser
        const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
        if (editMatch) {
          const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + editMatch[1];
          console.log('[HH-AR][Diag] Edit page, fetching view:', viewUrl);
          const { fetchAndParseResume } = await import('../../lib/resume-fetch.js');
          resume = await fetchAndParseResume(viewUrl);
        } else {
          setStatusLine('Ошибка: не удалось извлечь ID из URL');
          return;
        }
      } else {
        // VIEW page: parse live DOM
        const { expandHiddenSections } = await import('../../parsers/resume-detail/index.js');
        const { parseResume } = await import('../../parsers/resume-detail/parse-resume.js');
        await expandHiddenSections();
        resume = parseResume();
      }

      console.log('[HH-AR][Diag] Parse result:', JSON.stringify(resume, null, 2));
      console.log('[HH-AR][Diag] Experience count:', resume.experience?.length);
      console.log('[HH-AR][Diag] Skills count:', resume.skills?.length);
      console.log('[HH-AR][Diag] Debug found:', resume._debug?.found);
      console.log('[HH-AR][Diag] Debug missing:', resume._debug?.missing);

      const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
      if (hasUsefulData) {
        panelState.resume = resume;
        panelState._resumeCleared = false;
        await chrome.storage.local.set({ myResume: resume });
        renderResumePanel();
        setStatusLine('Спарсено: ' + resume.experience?.length + ' мест, ' + resume.skills?.length + ' навыков');
      } else {
        setStatusLine('Ошибка: нет полезных данных (id=' + resume.id + ')');
      }
    } catch (err) {
      console.error('[HH-AR][Diag] Parse error:', err);
      setStatusLine('Ошибка парсинга: ' + err.message);
    }
  } else {
    setStatusLine('Откройте страницу /resume/{hash} для теста');
    console.log('[HH-AR][Diag] Not on resume page, cannot test parse');
  }
  console.log('[HH-AR][Diag] === TEST PARSE END ===');
}