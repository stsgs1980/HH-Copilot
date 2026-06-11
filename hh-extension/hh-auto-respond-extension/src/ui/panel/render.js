/**
 * UI: PANEL — Render helpers
 * ============================
 * Sidebar content rendering (auth states, initial data).
 * Event binding is handled by index.js after render to avoid circular deps.
 */

import { refs, panelState } from '../state.js';
import { getLoggedInHTML, esc } from '../html.js';
import { checkAuth, getUserName } from '../auth.js';
import { renderVacancyList, renderStatsValues, tryShowVacancyMatch } from '../tabs/vacancies.js';
import { renderOverviewKPI } from '../tabs/overview.js';
import { renderStats } from '../tabs/stats.js';
import { renderNegotiationList } from '../tabs/negotiations.js';
import { renderBlacklist, renderSettingsValues } from '../tabs/settings.js';
import { startTour, isTourDone } from '../../lib/tour-engine.js';
import { getWelcomeTourSteps } from '../../lib/tour-steps.js';

// ═══════════════════════════════════════════════
// RENDER STATES
// ═══════════════════════════════════════════════

export function renderSidebarContent() {
  const content = refs.shadowRoot?.querySelector('.har-content');
  if (!content) return;

  // Always update header status text to match auth state
  updateHeaderStatus();

  if (panelState.isLoggedIn === null) {
    content.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <div class="har-spinner"></div>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">Проверяем авторизацию...</h3>
      <p style="font-size:13px;color:#71717a;line-height:1.5;">Определяем статус на hh.ru</p>
    </div>`;
    return;
  }
  if (!panelState.isLoggedIn) {
    content.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">Войдите в hh.ru</h3>
      <p style="font-size:13px;color:#71717a;line-height:1.5;margin-bottom:24px;">Расширение работает с вашей учётной записью.<br>Авторизуйтесь для включения автоматизации.</p>
      <a href="https://hh.ru/account/login" target="_blank" class="btn btn-primary" style="text-decoration:none;">Войти на hh.ru</a>
      <button class="btn btn-outline" id="har-retry-auth" style="margin-top:8px;">Проверить снова</button>
    </div>`;
    return;
  }

  /* Logged in: replace entire sidebar innerHTML */
  const container = refs.shadowRoot?.querySelector('.fab-panel');
  if (!container) return;
  const userName = getUserName();
  container.innerHTML = getLoggedInHTML(userName);
  /* NOTE: bindAllEvents(container) and renderInitialData() are called by
     updateAuthState in index.js after this function returns, to avoid
     a circular import between this module and index.js. */
  /* Update header auth status with username */
  const headerStatus = refs.shadowRoot?.getElementById('header-auth-status');
  if (headerStatus && userName !== 'Пользователь') {
    headerStatus.innerHTML = `<span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>${esc(userName)}`;
  }
  /* Update FAB title with username */
  if (refs.fabEl && userName !== 'Пользователь') {
    refs.fabEl.setAttribute('title', 'HH Copilot: ' + userName + '. Нажмите для открытия.');
  }
}

/**
 * Update the header status text to reflect actual auth state.
 * The initial HTML always shows "Проверяем авторизацию..." — this
 * function updates it to "Не авторизован" or leaves it for the full
 * logged-in re-render.
 */
function updateHeaderStatus() {
  if (!refs.shadowRoot) return;
  const container = refs.shadowRoot?.querySelector('.fab-panel');
  if (!container) return;

  // Only update if we're still using the initial shell HTML
  // (logged-in state replaces everything via getLoggedInHTML)
  if (panelState.isLoggedIn === false) {
    const headerStatus = container.querySelector('.har-header div[style*="font-size:11px"]');
    if (headerStatus) {
      const dotColor = '#ef4444';
      headerStatus.innerHTML = `<span class="pulse-dot" style="width:6px;height:6px;background:${dotColor};border-radius:50%;display:inline-block;"></span>Не авторизован`;
    }
  }
}

let _tourTimer = null;

export function renderInitialData() {
  renderOverviewKPI();
  renderVacancyList();
  renderStatsValues();
  renderStats();
  renderBlacklist();
  renderSettingsValues();
  renderNegotiationList();

  // Show match score card if we're on a vacancy detail page with parsed data
  tryShowVacancyMatch();

  // Auto-start tour for first-time users (guard against duplicate calls)
  if (!isTourDone()) {
    if (_tourTimer) clearTimeout(_tourTimer);
    _tourTimer = setTimeout(() => { _tourTimer = null; startTour(getWelcomeTourSteps()); }, 800);
  }
}
