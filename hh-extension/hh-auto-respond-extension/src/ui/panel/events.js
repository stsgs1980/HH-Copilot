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

import { toggleSidebar, updateAuthState } from './index.js';
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

    /* Auth — reset cache to force real re-check */
    if (t.closest('[data-action="check-auth"]')) { resetAuthCache(); updateAuthState(); return; }
    if (t.closest('#har-retry-auth')) { resetAuthCache(); updateAuthState(); return; }
    if (t.closest('#authIndicator')) { resetAuthCache(); updateAuthState(); return; }

    /* Resume */
    if (t.closest('[data-action="load-resume"]')) { window.dispatchEvent(new CustomEvent('hh-ar-load-resume')); return; }

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