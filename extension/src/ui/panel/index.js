/**
 * UI: PANEL (Sidebar + FAB orchestration)
 * ==========================================
 * Creates and manages the sidebar, handles sidebar creation/toggle,
 * and the public API.
 *
 * Auth state + background negotiations are in ./auth-and-bg.js.
 * Event binding is in ./events.js.
 * Split from original 294-line file (AHG Rule 12).
 * v1.9.43.0
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { panelState, refs, togglePanelOpen, setVacancies, setStatus as setStatusInternal, updateStats as mergeStatsState } from '../state.js';
export { panelState };
import { getSidebarCSS } from '../styles.js';
import { getSidebarHTML } from '../html.js';
import { createFab, updateFabIcon } from '../fab.js';
import { createInspectorFab } from '../dom-inspector.js';
import { renderVacancyList, renderStatsValues, renderVacancyMatchScore } from '../tabs/vacancies.js';
import { updateSkillGapSection } from '../tabs/resumes/resume-helpers.js';
import { renderOverviewKPI } from '../tabs/overview.js';

import { bindTabClicks } from './events.js';
import { bindTourEvents } from '../../lib/tour-engine.js';
import { updateAuthState, loadNegotiationsInBackground } from './auth-and-bg.js';

// Re-export auth functions for callers that import from here
export { updateAuthState, updateAuthStateAsync } from './auth-and-bg.js';

const panelLog = createLogger('Panel');

// ===============================================
// SIDEBAR CREATION
// ===============================================

export function createSidebar() {
  if (refs.sidebarEl) return;

  refs.backdropEl = document.createElement('div');
  refs.backdropEl.id = 'hh-ar-backdrop';
  refs.backdropEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;';
  refs.backdropEl.addEventListener('click', () => { if (panelState.isOpen) toggleSidebar(); });

  refs.sidebarEl = document.createElement('div');
  refs.sidebarEl.id = 'hh-ar-sidebar';
  refs.sidebarEl.style.cssText = 'position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);';
  refs.sidebarEl.setAttribute('role', 'dialog');
  refs.sidebarEl.setAttribute('aria-label', 'HH Copilot панель');
  refs.sidebarEl.setAttribute('aria-modal', 'true');
  refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getSidebarCSS();
  refs.shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'fab-panel';
  container.innerHTML = getSidebarHTML();
  container.setAttribute('lang', 'ru');
  refs.shadowRoot.appendChild(container);

  /* Initial bind: close button, retry-auth, tab clicks */
  bindTabClicks(container);
  /* Bind tour click delegation inside shadowRoot */
  bindTourEvents();

  /* Escape key handler -- close sidebar */
  refs.sidebarEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelState.isOpen) {
      e.preventDefault();
      toggleSidebar();
      return;
    }
  });

  /* Focus trap: keep Tab cycling within the sidebar while open */
  bindFocusTrap();

  document.body.appendChild(refs.backdropEl);
  document.body.appendChild(refs.sidebarEl);
}

/**
 * Set up Tab focus trap so keyboard navigation stays inside the sidebar
 * while it is open.
 */
function bindFocusTrap() {
  refs.sidebarEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !panelState.isOpen) return;
    const sr = refs.shadowRoot;
    if (!sr) return;
    const focusable = sr.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !sr.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

export function toggleSidebar() {
  if (!refs.sidebarEl) createSidebar();
  if (!refs.fabEl) createFab(toggleSidebar);
  togglePanelOpen();
  refs.sidebarEl.style.transform = panelState.isOpen ? 'translateX(0)' : 'translateX(100%)';
  if (refs.backdropEl) {
    refs.backdropEl.style.opacity = panelState.isOpen ? '1' : '0';
    refs.backdropEl.style.pointerEvents = panelState.isOpen ? 'auto' : 'none';
  }
  updateFabIcon();
  panelLog.info('Sidebar ' + (panelState.isOpen ? 'opened' : 'closed'));

  /* Focus management: move focus into sidebar when opened, return to FAB when closed */
  if (panelState.isOpen) {
    const firstFocusable = refs.shadowRoot?.querySelector('button:not([disabled]), [tabindex="0"]');
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 350);

    // v1.9.40.0: Auto-load negotiations in background when sidebar opens
    loadNegotiationsInBackground();
  } else {
    /* Return focus to FAB button when sidebar closes */
    if (refs.fabEl) setTimeout(() => refs.fabEl.focus(), 350);
  }
}

// ===============================================
// PUBLIC API
// ===============================================

export function updateVacancies(vacancies) {
  setVacancies(vacancies);
  renderVacancyList();
  updateVacancyCounts();
  // Re-run Skill Gap Analysis when vacancies change
  if (panelState.resume) updateSkillGapSection(panelState.resume);
}

export function updateStats(stats) {
  mergeStatsState(stats);
  renderStatsValues();
  renderOverviewKPI();
}

export function setStatus(status) {
  setStatusInternal(status);
}

export function createPanel() {
  createFab(toggleSidebar);
  createInspectorFab();
  createSidebar();
  setTimeout(updateAuthState, 1500);
  setInterval(updateAuthState, 5000);

  // Listen for match score updates (from vacancy detail re-score)
  window.addEventListener('hh-ar-match-updated', (e) => {
    const { vacancyId, score, breakdown, details } = e.detail || {};
    if (score !== undefined) {
      renderVacancyMatchScore(vacancyId, score, breakdown, details);
      panelLog.info('Match UI updated: ' + score + '% for vacancy ' + vacancyId);
    }
  });
}

/* Helper: update vacancy counter cards */
function updateVacancyCounts() {
  const el = (id) => refs.shadowRoot?.getElementById(id);
  const vacs = panelState.vacancies;
  const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
  set('vac-total', vacs.length);
  set('vac-high-match', vacs.filter(v => (v.matchScore || 0) >= 70).length);
  set('vac-blacklisted', vacs.filter(v => v.status === 'blacklisted').length);
}
