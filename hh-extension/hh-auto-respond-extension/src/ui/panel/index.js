/**
 * UI: PANEL (Sidebar + FAB orchestration)
 * ==========================================
 * Creates and manages the sidebar, handles auth state updates,
 * sidebar creation/toggle, and the public API.
 * Event binding is in ./events.js.
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { panelState, refs, setAuthState, togglePanelOpen, setVacancies, setStatus as setStatusInternal, updateStats as mergeStatsState, updateSettings as mergeSettingsState } from '../state.js';
export { panelState };
import { getSidebarCSS } from '../styles.js';
import { getSidebarHTML } from '../html.js';
import { checkAuth, checkAuthAsync } from '../auth.js';
import { createFab, updateFabIcon } from '../fab.js';
import { renderVacancyList, renderStatsValues, renderVacancyMatchScore } from '../tabs/vacancies.js';
import { updateSkillGapSection } from '../tabs/resumes/resume-helpers.js';
import { renderOverviewKPI, addTimelineEvent } from '../tabs/overview.js';
import { renderBlacklist } from '../tabs/settings.js';

import { renderSidebarContent, renderInitialData } from './render.js';
import { bindAllEvents, bindTabClicks } from './events.js';
import { bindTourEvents, isTourActive } from '../../lib/tour-engine.js';

const panelLog = createLogger('Panel');

// ═══════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════

export function updateAuthState(forceUI = false) {
  const was = panelState.isLoggedIn;
  const now = checkAuth();
  if (was !== now || forceUI) {
    setAuthState(now);
    panelLog.info('Auth: ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    // Skip DOM rebuild while tour is active — it would destroy tour elements
    if (!isTourActive()) renderSidebarContent();
    if (panelState.isLoggedIn) {
      const container = refs.shadowRoot?.querySelector('.fab-panel');
      if (container) {
        bindAllEvents(container);
        renderInitialData();
      }
      // Start page parsers when user logs in
      // NOTE: We use a custom event instead of dynamic import() because
      // esbuild's IIFE bundle doesn't support dynamic imports at runtime.
      // main.js listens for this event and calls initPageLogic() directly.
      if (was !== true) {
        window.dispatchEvent(new CustomEvent('hh-ar-init-page-logic'));
        panelLog.info('Dispatched hh-ar-init-page-logic event');
      }
    }
    updateFabIcon();
    if (forceUI) showAuthFeedback(now);
  }
}

/** Enhanced async auth check — used for manual re-checks via cookie API */
export async function updateAuthStateAsync() {
  const was = panelState.isLoggedIn;
  const now = await checkAuthAsync();
  if (was !== now) {
    setAuthState(now);
    panelLog.info('Auth (async): ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    if (!isTourActive()) renderSidebarContent();
    if (panelState.isLoggedIn) {
      const container = refs.shadowRoot?.querySelector('.fab-panel');
      if (container) {
        bindAllEvents(container);
        renderInitialData();
      }
      if (was !== true) {
        window.dispatchEvent(new CustomEvent('hh-ar-init-page-logic'));
        panelLog.info('Dispatched hh-ar-init-page-logic event (async)');
      }
    }
    updateFabIcon();
  }
  showAuthFeedback(now);
}

/** Show visual feedback after manual auth check */
function showAuthFeedback(isLoggedIn) {
  if (isLoggedIn) {
    const badge = refs.shadowRoot?.getElementById('authBadge');
    if (badge) {
      badge.style.transition = 'transform 0.15s';
      badge.style.transform = 'scale(1.15)';
      setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
    }
    const card = refs.shadowRoot?.querySelector('#tab-overview .card');
    if (card) {
      const desc = card.querySelector('div[style*="color:#71717a;"]');
      if (desc) {
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const orig = desc.textContent;
        desc.textContent = 'Проверено: ' + time;
        setTimeout(() => { desc.textContent = orig; }, 3000);
      }
    }
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
  /* Bind tour click delegation inside shadowRoot */
  bindTourEvents();
  document.body.appendChild(refs.backdropEl);
  document.body.appendChild(refs.sidebarEl);
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
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

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