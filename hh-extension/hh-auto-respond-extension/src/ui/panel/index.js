/**
 * UI: PANEL (Sidebar + FAB orchestration)
 * ==========================================
 * Creates and manages the sidebar, handles auth state updates,
 * sidebar creation/toggle, and the public API.
 * Event binding is in ./events.js.
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { panelState, refs } from '../state.js';
export { panelState };
import { getSidebarCSS } from '../styles.js';
import { getSidebarHTML } from '../html.js';
import { checkAuth } from '../auth.js';
import { createFab, updateFabIcon } from '../fab.js';
import { renderVacancyList, renderStatsValues } from '../tabs/vacancies.js';
import { renderOverviewKPI, addTimelineEvent } from '../tabs/overview.js';
import { renderBlacklist } from '../tabs/settings.js';

import { renderSidebarContent, renderInitialData } from './render.js';
import { bindAllEvents, bindTabClicks } from './events.js';

const panelLog = createLogger('Panel');

// ═══════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════

export function updateAuthState() {
  const was = panelState.isLoggedIn;
  const now = checkAuth();
  if (was !== now) {
    panelState.isLoggedIn = now;
    panelLog.info('Auth: ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    renderSidebarContent();
    /* bindAllEvents and renderInitialData are called here (not inside
       renderSidebarContent) to avoid a circular import with render.js */
    if (panelState.isLoggedIn) {
      const container = refs.shadowRoot?.querySelector('.fab-panel');
      if (container) {
        bindAllEvents(container);
        renderInitialData();
      }
    }
    updateFabIcon();
  }
}

// ═══════════════════════════════════════════════
// SIDEBAR CREATION
// ═══════════════════════════════════════════════

export function createSidebar() {
  if (refs.sidebarEl) return;

  refs.backdropEl = document.createElement('div');
  refs.backdropEl.id = 'hh-ar-backdrop';
  refs.backdropEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;';
  refs.backdropEl.addEventListener('click', () => { if (panelState.isOpen) toggleSidebar(); });

  refs.sidebarEl = document.createElement('div');
  refs.sidebarEl.id = 'hh-ar-sidebar';
  refs.sidebarEl.style.cssText = 'position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);';
  refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getSidebarCSS();
  refs.shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'fab-panel';
  container.innerHTML = getSidebarHTML();
  refs.shadowRoot.appendChild(container);

  /* Initial bind: close button, retry-auth, tab clicks */
  bindTabClicks(container);
  document.body.appendChild(refs.backdropEl);
  document.body.appendChild(refs.sidebarEl);
}

export function toggleSidebar() {
  if (!refs.sidebarEl) createSidebar();
  if (!refs.fabEl) createFab(toggleSidebar);
  panelState.isOpen = !panelState.isOpen;
  refs.sidebarEl.style.transform = panelState.isOpen ? 'translateX(0)' : 'translateX(100%)';
  if (refs.backdropEl) {
    refs.backdropEl.style.opacity = panelState.isOpen ? '1' : '0';
    refs.backdropEl.style.pointerEvents = panelState.isOpen ? 'auto' : 'none';
  }
  updateFabIcon();
  panelLog.info('Sidebar ' + (panelState.isOpen ? 'opened' : 'closed'));
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

export function updateVacancies(vacancies) {
  panelState.vacancies = (vacancies || []).filter(v => v && v.id && v.title);
  renderVacancyList();
  updateVacancyCounts();
}

export function updateStats(stats) {
  Object.assign(panelState.stats, stats);
  renderStatsValues();
  renderOverviewKPI();
}

export function setStatus(status) {
  panelState.status = status;
}

export function createPanel() {
  createFab(toggleSidebar);
  createSidebar();
  setTimeout(updateAuthState, 1500);
  setInterval(updateAuthState, 5000);
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