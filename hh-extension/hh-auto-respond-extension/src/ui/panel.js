/**
 * UI: PANEL (Sidebar + FAB orchestration)
 * ==========================================
 * Creates and manages the sidebar, handles 6-tab switching,
 * auth state updates, timeline/accordion toggling, event delegation.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { panelState, refs } from './state.js';
export { panelState };
import { getSidebarCSS } from './styles.js';
import { getSidebarHTML, getLoggedInHTML, esc } from './html.js';
import { checkAuth, getUserName } from './auth.js';
import { createFab, updateFabIcon } from './fab.js';
import { renderVacancyList, renderStatsValues } from './tabs/vacancies.js';
import { renderResumePanel } from './tabs/resumes.js';
import { renderOverviewKPI, addTimelineEvent } from './tabs/overview.js';
import { renderStats, addLogEntry, clearLog } from './tabs/stats.js';
import { renderNegotiationList, renderChatMessages } from './tabs/negotiations.js';
import { renderBlacklist, renderSettingsValues } from './tabs/settings.js';
import { diagnoseResumeDOM } from '../parsers/resume-detail.js';

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

  bindSidebarEvents(container);
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
// RENDER STATES
// ═══════════════════════════════════════════════

export function renderSidebarContent() {
  const content = refs.shadowRoot?.querySelector('.har-content');
  if (!content) return;

  if (panelState.isLoggedIn === null) {
    content.innerHTML = getSidebarHTML().replace(/<div class="har-content">[\s\S]*?<\/div>/, '');
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
  container.innerHTML = getLoggedInHTML();
  bindAllEvents(container);
  renderInitialData();
}

function renderInitialData() {
  renderOverviewKPI();
  renderVacancyList();
  renderStatsValues();
  renderStats();
  renderBlacklist();
  renderSettingsValues();
  renderNegotiationList();
}

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

function bindAllEvents(container) {
  bindTabClicks(container);
  bindSidebarClicks(container);
  bindTimelineToggles(container);
  bindInputChanges(container);
}

function bindTabClicks(container) {
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

    /* Auth */
    if (t.closest('[data-action="check-auth"]')) { updateAuthState(); return; }
    if (t.closest('#har-retry-auth')) { updateAuthState(); return; }

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

// ═══════════════════════════════════════════════
// BLACKLIST MANAGEMENT
// ═══════════════════════════════════════════════

function addBlacklistItem() {
  const input = refs.shadowRoot?.getElementById('bl-input');
  if (!input || !input.value.trim()) return;
  const name = input.value.trim();
  if (!panelState.blacklist.includes(name)) {
    panelState.blacklist.push(name);
    input.value = '';
    renderBlacklist();
    addLogEntry('info', 'Добавлена компания в ЧС: ' + name);
  }
}

function removeBlacklistItem(name) {
  panelState.blacklist = panelState.blacklist.filter(n => n !== name);
  renderBlacklist();
}

// ═══════════════════════════════════════════════
// CONVERSATION SELECT
// ═══════════════════════════════════════════════

function selectConversation(convId) {
  panelState.activeConversation = convId;
  renderNegotiationList();
  renderChatMessages();
}

// ═══════════════════════════════════════════════
// VACANCY FILTERING (client-side)
// ═══════════════════════════════════════════════

function filterVacancies() {
  const search = (refs.shadowRoot?.getElementById('vac-search')?.value || '').toLowerCase();
  const status = refs.shadowRoot?.getElementById('vac-status-filter')?.value || 'all';
  const minScore = parseInt(refs.shadowRoot?.getElementById('vac-score-range')?.value || '0', 10);

  const items = refs.shadowRoot?.querySelectorAll('#har-vlist .vacancy-item');
  let visible = 0;
  items.forEach(item => {
    const title = (item.dataset.title || '').toLowerCase();
    const itemStatus = item.dataset.status || 'new';
    const itemScore = parseInt(item.dataset.score || '0', 10);
    const matchTitle = !search || title.includes(search);
    const matchStatus = status === 'all' || itemStatus === status;
    const matchScore = itemScore >= minScore;
    item.style.display = (matchTitle && matchStatus && matchScore) ? '' : 'none';
    if (matchTitle && matchStatus && matchScore) visible++;
  });
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
