/**
 * UI: PANEL -- EVENT BINDING
 * ===========================
 * Tab switching, timeline/accordion toggling, and input change handlers.
 * Sidebar click delegation is in ./sidebar-events.js.
 * Keyboard navigation + filterVacancies are in ./events-a11y.js.
 *
 * Split from original 271-line file (AHG Rule 12).
 * v1.9.43.0
 */

import { refs, setActiveTab } from '../state.js';
import { renderResumePanel } from '../tabs/resumes.js';
import { renderStats } from '../tabs/stats.js';
import { renderNegotiationList, setNegotiationStatusFilter, setNegotiationTabFilter, refreshNegotiations } from '../tabs/negotiations.js';
import { bindSidebarClicks } from './sidebar-events.js';
import {
  bindTabKeyboardNav,
  bindAccessibilityHandlers,
  filterVacancies,
} from './events-a11y.js';

// Re-export filterVacancies for callers that import from here
export { filterVacancies } from './events-a11y.js';

// ===============================================
// TAB SWITCHING (6 tabs, CSS class toggle)
// ===============================================

function switchTab(tabId) {
  setActiveTab(tabId);
  const sr = refs.shadowRoot;
  if (!sr) return;

  sr.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  sr.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab-' + tabId);
  });

  /* Lazy render on tab activation */
  if (tabId === 'resume') renderResumePanel();
  if (tabId === 'stats') renderStats();
  if (tabId === 'negotiations') renderNegotiationList();

  /* Focus the activated tab panel for screen readers */
  const activePanel = sr.querySelector('#tab-' + tabId);
  if (activePanel) activePanel.focus();
}

/** Public wrapper for tab switching from other modules. */
export function switchTabPublic(tabId) { switchTab(tabId); }

// ===============================================
// TIMELINE / ACCORDION TOGGLES
// ===============================================

function toggleTimeline(toggleEl) {
  const body = toggleEl.nextElementSibling;
  const chevron = toggleEl.querySelector('.timeline-chevron');
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open', isOpen);
  toggleEl.setAttribute('aria-expanded', isOpen);
  if (body.id) toggleEl.setAttribute('aria-controls', body.id);
}

function toggleSub(subId, chevId) {
  const sr = refs.shadowRoot;
  const sub = sr?.getElementById(subId);
  const chev = sr?.getElementById(chevId);
  if (sub) sub.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}

// ===============================================
// EVENT BINDING ENTRY POINT
// ===============================================

export function bindAllEvents(container) {
  bindTabClicks(container);
  bindSidebarClicks(container);
  bindAccessibilityHandlers(container, toggleTimeline, toggleSub);
  bindInputChanges(container);
}

export function bindTabClicks(container) {
  const tabBtns = container.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* WAI-ARIA Tabs: Arrow keys navigate between tabs, Home/End to first/last */
  bindTabKeyboardNav(container, switchTab);
}

function bindInputChanges(container) {
  /* Score range slider */
  const scoreRange = container.querySelector('#vac-score-range');
  const scoreLabel = container.querySelector('#vac-score-label');
  if (scoreRange && scoreLabel) {
    scoreRange.addEventListener('input', () => {
      scoreLabel.textContent = scoreRange.value + '%';
      scoreRange.setAttribute('aria-valuenow', scoreRange.value);
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

  /* v1.9.38.0: Schedule filter pills */
  container.addEventListener('click', (e) => {
    const scheduleBtn = e.target.closest('.vac-schedule-btn');
    if (scheduleBtn) {
      // Toggle active state: only one pill active at a time
      const sr = refs.shadowRoot;
      if (!sr) return;
      sr.querySelectorAll('.vac-schedule-btn').forEach(btn => {
        const isActive = btn === scheduleBtn;
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-outline', !isActive);
      });
      filterVacancies();
    }
  });

  /* v1.9.38.0: Hide ads checkbox */
  const hideAdsCheckbox = container.querySelector('#vac-hide-ads');
  if (hideAdsCheckbox) {
    hideAdsCheckbox.addEventListener('change', () => filterVacancies());
  }

  /* v1.9.39.0: Negotiation status filter pills + F1.9 tab filter + refresh */
  container.addEventListener('click', (e) => {
    const negStatusBtn = e.target.closest('.neg-status-btn');
    if (negStatusBtn) {
      setNegotiationStatusFilter(negStatusBtn.dataset.status);
      return;
    }
    const negTabBtn = e.target.closest('.neg-tab-btn');
    if (negTabBtn) {
      setNegotiationTabFilter(negTabBtn.dataset.tabOrigin);
      return;
    }
    const refreshBtn = e.target.closest('#neg-refresh-btn');
    if (refreshBtn) {
      refreshNegotiations();
    }
  });
}
