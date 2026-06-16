/**
 * UI: PANEL -- AUTH STATE & BACKGROUND TASKS
 * ============================================
 * Auth state synchronization (sync + async), visual feedback,
 * and background negotiations loader.
 *
 * Split from src/ui/panel/index.js (AHG Rule 12).
 * v1.9.42.0
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { panelState, refs, setAuthState } from '../state.js';
import { checkAuth, checkAuthAsync } from '../auth.js';
import { updateFabIcon } from '../fab.js';
import { renderSidebarContent, renderInitialData } from './render.js';
import { bindAllEvents } from './events.js';
import { isTourActive } from '../../lib/tour-engine.js';

const authLog = createLogger('Panel');

/**
 * Synchronous auth state update. Re-renders sidebar when state changes,
 * triggers page parser init when user logs in, and updates FAB icon.
 *
 * @param {boolean} [forceUI=false] -- if true, re-render + show feedback even if state unchanged
 */
export function updateAuthState(forceUI = false) {
  const was = panelState.isLoggedIn;
  const now = checkAuth();
  if (was !== now || forceUI) {
    setAuthState(now);
    authLog.info('Auth: ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    // Skip DOM rebuild while tour is active -- it would destroy tour elements
    if (!isTourActive()) renderSidebarContent();
    if (panelState.isLoggedIn) {
      const container = refs.shadowRoot?.querySelector('.fab-panel');
      if (container) {
        bindAllEvents(container);
        renderInitialData();
      }
      // Start page parsers when user logs in
      if (was !== true) {
        window.dispatchEvent(new CustomEvent('hh-ar-init-page-logic'));
        authLog.info('Dispatched hh-ar-init-page-logic event');
      }
    }
    updateFabIcon();
    if (forceUI) showAuthFeedback(now);
  }
}

/**
 * Enhanced async auth check -- used for manual re-checks via cookie API.
 */
export async function updateAuthStateAsync() {
  const was = panelState.isLoggedIn;
  const now = await checkAuthAsync();
  if (was !== now) {
    setAuthState(now);
    authLog.info('Auth (async): ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    if (!isTourActive()) renderSidebarContent();
    if (panelState.isLoggedIn) {
      const container = refs.shadowRoot?.querySelector('.fab-panel');
      if (container) {
        bindAllEvents(container);
        renderInitialData();
      }
      if (was !== true) {
        window.dispatchEvent(new CustomEvent('hh-ar-init-page-logic'));
        authLog.info('Dispatched hh-ar-init-page-logic event (async)');
      }
    }
    updateFabIcon();
  }
  showAuthFeedback(now);
}

/**
 * Show visual feedback after manual auth check: badge pulse and
 * timestamp next to the auth status card.
 *
 * @param {boolean} isLoggedIn
 */
function showAuthFeedback(isLoggedIn) {
  if (!isLoggedIn) return;
  const badge = refs.shadowRoot?.getElementById('authBadge');
  if (badge) {
    badge.style.transition = 'transform 0.15s';
    badge.style.transform = 'scale(1.15)';
    setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
  }
  const card = refs.shadowRoot?.querySelector('#tab-overview .card');
  if (card) {
    const desc = card.querySelector('div[style*="color:#52525b;"]');
    if (desc) {
      const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const orig = desc.textContent;
      desc.textContent = 'Проверено: ' + time;
      setTimeout(() => { desc.textContent = orig; }, 3000);
    }
  }
}

// ===============================================
// BACKGROUND NEGOTIATIONS LOADER
// ===============================================

/**
 * v1.9.40.0: Auto-load negotiations from /applicant/negotiations via background fetch.
 * Only runs if: logged in + negotiations list is empty + not already fetching.
 * Debounced: won't re-fetch within 5 minutes.
 */
let _negLastFetch = 0;
let _negFetching = false;

export async function loadNegotiationsInBackground() {
  // Skip if not logged in
  if (!panelState.isLoggedIn) return;
  // Skip if already loaded (non-empty) and fetched recently
  if (panelState.negotiations.length > 0 && Date.now() - _negLastFetch < 5 * 60 * 1000) return;
  // Skip if already fetching
  if (_negFetching) return;

  _negFetching = true;
  try {
    const { fetchAndParseNegotiations } = await import('../../parsers/negotiations.js');
    const { setNegotiations } = await import('../state.js');
    const { markAsApplied } = await import('../../lib/storage.js');

    const negotiations = await fetchAndParseNegotiations();
    if (negotiations.length > 0) {
      setNegotiations(negotiations);
      _negLastFetch = Date.now();

      // Mark as applied in storage
      const appliedIds = negotiations.filter(n => n.vacancyId).map(n => n.vacancyId);
      if (appliedIds.length > 0) {
        Promise.all(appliedIds.map(id => markAsApplied(id))).catch(() => {});
      }

      // Re-render if negotiations tab is active
      try {
        const { renderNegotiationList } = await import('../tabs/negotiations.js');
        renderNegotiationList();
      } catch (_e) {}

      authLog.info('Background negotiations loaded: ' + negotiations.length + ' items');
    }
  } catch (err) {
    authLog.warn('Background negotiations fetch failed: ' + err.message);
  } finally {
    _negFetching = false;
  }
}
