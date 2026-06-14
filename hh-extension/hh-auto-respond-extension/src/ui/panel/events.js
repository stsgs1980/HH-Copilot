/**
 * UI: PANEL -- EVENT BINDING
 * ===========================
 * Tab switching, timeline/accordion toggling, and input change handlers.
 * Sidebar click delegation is in ./sidebar-events.js.
 */

import { panelState, refs, setActiveTab } from '../state.js';
import { renderResumePanel } from '../tabs/resumes.js';
import { renderStats } from '../tabs/stats.js';
import { renderNegotiationList } from '../tabs/negotiations.js';
import { bindSidebarClicks } from './sidebar-events.js';

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
// EVENT BINDING
// ===============================================

export function bindAllEvents(container) {
  bindTabClicks(container);
  bindSidebarClicks(container);
  bindTimelineToggles(container);
  bindInputChanges(container);
}

export function bindTabClicks(container) {
  const tabBtns = container.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* WAI-ARIA Tabs: Arrow keys navigate between tabs, Home/End to first/last */
  container.addEventListener('keydown', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;
    const tabs = Array.from(container.querySelectorAll('.tab-btn'));
    const idx = tabs.indexOf(tabBtn);
    let nextIdx = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = tabs.length - 1;
    }

    if (nextIdx >= 0) {
      tabs[nextIdx].focus();
      switchTab(tabs[nextIdx].dataset.tab);
    }
  });
}

function bindTimelineToggles(container) {
  container.addEventListener('click', (e) => {
    const tl = e.target.closest('[data-timeline]');
    if (tl) { toggleTimeline(tl); return; }
    const sub = e.target.closest('[data-sub-toggle]');
    if (sub) { toggleSub(sub.dataset.subId, sub.dataset.chevId); return; }
  });

  /* Keyboard support for toggleable elements, vacancy items, auth indicator, and toggle switches */
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      /* Timeline / accordion toggles */
      const tl = e.target.closest('[data-timeline]') || e.target.closest('[data-sub-toggle]');
      if (tl) { e.preventDefault(); tl.click(); return; }
      /* Vacancy item keyboard activation -- click the navigate link inside */
      const vacItem = e.target.closest('.vacancy-item');
      if (vacItem) {
        e.preventDefault();
        const navLink = vacItem.querySelector('[data-action="navigate"]');
        if (navLink) navLink.click();
      }
    }
  });

  /* Toggle switch (role=switch checkbox): sync aria-checked on change */
  container.addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.matches('input[type="checkbox"][role="switch"]')) {
      cb.setAttribute('aria-checked', cb.checked ? 'true' : 'false');
    }
  });

  /* Stats period radiogroup: arrow key navigation */
  container.addEventListener('keydown', (e) => {
    const radio = e.target.closest('[role="radio"]');
    if (!radio) return;
    const group = radio.closest('[role="radiogroup"]');
    if (!group) return;
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    const idx = radios.indexOf(radio);
    let nextIdx = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); nextIdx = (idx + 1) % radios.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); nextIdx = (idx - 1 + radios.length) % radios.length;
    }

    if (nextIdx >= 0) {
      radios[nextIdx].focus();
      radios[nextIdx].click();
    }
  });

  /* Stats period radiogroup: click syncs aria-checked + active class */
  container.addEventListener('click', (e) => {
    const radio = e.target.closest('[role="radio"]');
    if (!radio) return;
    const group = radio.closest('[role="radiogroup"]');
    if (!group) return;
    group.querySelectorAll('[role="radio"]').forEach(r => {
      const isActive = r === radio;
      r.setAttribute('aria-checked', isActive ? 'true' : 'false');
      r.classList.toggle('active', isActive);
      /* Sync visual style: primary = selected, outline = unselected */
      r.classList.toggle('btn-primary', isActive);
      r.classList.toggle('btn-outline', !isActive);
    });
  });
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
}

/** Filter vacancies by search, status, and score. */
function filterVacancies() {
  const search = (refs.shadowRoot?.getElementById('vac-search')?.value || '').toLowerCase();
  const status = refs.shadowRoot?.getElementById('vac-status-filter')?.value || 'all';
  const minScore = parseInt(refs.shadowRoot?.getElementById('vac-score-range')?.value || '0', 10);

  const items = refs.shadowRoot?.querySelectorAll('#har-vlist .vacancy-item');
  items?.forEach(item => {
    const title = (item.dataset.title || '').toLowerCase();
    const itemStatus = item.dataset.status || 'new';
    const itemScore = parseInt(item.dataset.score || '0', 10);
    const matchTitle = !search || title.includes(search);
    const matchStatus = status === 'all' || itemStatus === status;
    const matchScore = itemScore >= minScore;
    item.style.display = (matchTitle && matchStatus && matchScore) ? '' : 'none';
  });
}
