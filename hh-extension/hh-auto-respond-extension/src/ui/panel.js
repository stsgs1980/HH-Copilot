/**
 * UI: PANEL (Sidebar + FAB orchestration)
 * ==========================================
 * Creates and manages the sidebar, handles tab switching,
 * auth state updates, and event delegation.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { panelState, refs } from './state.js';
export { panelState };
import { getSidebarCSS } from './styles.js';
import { getSidebarHTML, esc } from './html.js';
import { checkAuth, getUserName } from './auth.js';
import { createFab, updateFabIcon } from './fab.js';
import { renderVacancyList, renderStatsValues } from './tabs/vacancies.js';
import { renderResumePanel, renderResumeListPanel } from './tabs/resumes.js';
import { diagnoseResumeDOM } from '../parsers/resume-detail.js';

const panelLog = createLogger('Panel');

// ═══════════════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════════════

export function updateAuthState() {
  const was = panelState.isLoggedIn;
  const now = checkAuth();
  console.log('[HH-AR][Auth] updateAuthState: was=' + was + ', now=' + now + ', url=' + window.location.href);
  if (was !== now) {
    panelState.isLoggedIn = now;
    panelLog.info('Auth: ' + (now ? 'LOGGED IN' : 'NOT LOGGED IN'));
    renderSidebarContent();
    updateFabIcon();
  }
}

// ═══════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════

export function createSidebar() {
  if (refs.sidebarEl) return;

  refs.backdropEl = document.createElement('div');
  refs.backdropEl.id = 'hh-ar-backdrop';
  refs.backdropEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;';
  refs.backdropEl.addEventListener('click', () => { if (panelState.isOpen) toggleSidebar(); });

  refs.sidebarEl = document.createElement('div');
  refs.sidebarEl.id = 'hh-ar-sidebar';
  refs.sidebarEl.style.cssText = 'position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);';
  refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getSidebarCSS();
  refs.shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'har-sidebar';
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
  if (refs.backdropEl) { refs.backdropEl.style.opacity = panelState.isOpen ? '1' : '0'; refs.backdropEl.style.pointerEvents = panelState.isOpen ? 'auto' : 'none'; }
  refs.fabEl.style.right = panelState.isOpen ? '380px' : '24px';
  updateFabIcon();
  panelLog.info('Sidebar ' + (panelState.isOpen ? 'opened' : 'closed'));
}

export function renderSidebarContent() {
  const content = refs.shadowRoot?.querySelector('.har-content');
  if (!content) return;

  if (panelState.isLoggedIn === null) {
    content.innerHTML = '<div class="har-auth-box"><div class="har-spinner"></div><h3>Проверяем авторизацию...</h3><p>Определяем статус на hh.ru</p></div>';
  } else if (!panelState.isLoggedIn) {
    content.innerHTML = '<div class="har-auth-box"><div class="har-lock-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h3>Войдите в hh.ru</h3><p>Расширение работает с вашей учётной записью.<br>Авторизуйтесь для включения автоматизации.</p><a href="https://hh.ru/account/login" target="_blank" class="har-btn har-btn-primary har-btn-block">Войти на hh.ru</a><button class="har-btn har-btn-secondary har-btn-block" id="har-retry-auth">Проверить снова</button></div>';
  } else {
    renderLoggedInContent(content);
  }
}

export function renderLoggedInContent(content) {
  const name = getUserName();
  content.innerHTML = `
    <div class="har-user-bar">
      <div class="har-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="har-user-info"><div class="har-user-name">${esc(name)}</div><div class="har-user-status">Авторизован</div></div>
      <div class="har-dot har-dot-${panelState.status}"></div>
    </div>
    <div class="har-tabs">
      <button class="har-tab ${!panelState.activeTab || panelState.activeTab === 'vacancies' ? 'har-tab-active' : ''}" data-tab="vacancies">Вакансии</button>
      <button class="har-tab ${panelState.activeTab === 'resume' ? 'har-tab-active' : ''}" data-tab="resume">Моё резюме</button>
    </div>
    <div class="har-tab-content" id="har-tab-vacancies" style="${panelState.activeTab === 'resume' ? 'display:none' : ''}">
      <div class="har-stats">
        <div class="har-stat"><span class="har-stat-val" id="sv-applied">0</span><span class="har-stat-lbl">откликов</span></div>
        <div class="har-stat"><span class="har-stat-val" id="sv-remain">200</span><span class="har-stat-lbl">осталось</span></div>
        <div class="har-stat"><span class="har-stat-val" id="sv-errors">0</span><span class="har-stat-lbl">ошибок</span></div>
      </div>
      <div class="har-progress"><div class="har-progress-bar"><div class="har-progress-fill" id="pf"></div></div><div class="har-progress-text" id="pt">0 / 200</div></div>
      <div class="har-actions">
        <button class="har-btn har-btn-primary" data-action="apply-all">Откликнуться на все</button>
        <div style="display:flex;gap:8px"><button class="har-btn har-btn-secondary" data-action="pause" style="flex:1">Пауза</button><button class="har-btn har-btn-secondary" data-action="refresh" style="flex:1">Обновить</button></div>
      </div>
      <div class="har-section-title">Вакансии на странице</div>
      <div class="har-vacancy-list" id="har-vlist"><div class="har-empty">Загрузка...</div></div>
    </div>
    <div class="har-tab-content" id="har-tab-resume" style="${!panelState.activeTab || panelState.activeTab !== 'resume' ? 'display:none' : ''}">
      <div id="har-resume-content"><div class="har-empty">Откройте страницу резюме на hh.ru<br>или нажмите кнопку "Загрузить".</div></div>
      <button class="har-btn har-btn-primary har-btn-block" data-action="load-resume" style="margin:12px 20px">Загрузить с текущей страницы</button>
      <button class="har-btn har-btn-secondary har-btn-block" data-action="diagnose-dom" style="margin:0 20px 8px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b">Диагностика DOM</button>
      <button class="har-btn har-btn-secondary har-btn-block" data-action="goto-resume" style="margin:0 20px 12px">Перейти к списку резюме</button>
    </div>`;
  bindTabEvents(content);
  renderVacancyList();
  renderStatsValues();
  if (panelState.activeTab === 'resume') renderResumePanel();
}

// ═══════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════

function bindTabEvents(container) {
  container.querySelectorAll('.har-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      panelState.activeTab = tabName;
      // Переключаем видимость табов
      const vacDiv = refs.shadowRoot?.getElementById('har-tab-vacancies');
      const resDiv = refs.shadowRoot?.getElementById('har-tab-resume');
      if (vacDiv) vacDiv.style.display = tabName === 'vacancies' ? '' : 'none';
      if (resDiv) resDiv.style.display = tabName === 'resume' ? '' : 'none';
      // Подсветка табов
      refs.shadowRoot?.querySelectorAll('.har-tab').forEach(t => {
        t.classList.toggle('har-tab-active', t.dataset.tab === tabName);
      });
      if (tabName === 'resume') renderResumePanel();
    });
  });
}

function bindSidebarEvents(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="apply"]');
    if (btn) { e.preventDefault(); window.dispatchEvent(new CustomEvent('hh-ar-apply', { detail: { vacancyId: btn.dataset.id } })); return; }
    if (e.target.closest('[data-action="apply-all"]')) { window.dispatchEvent(new CustomEvent('hh-ar-apply-all')); return; }
    if (e.target.closest('[data-action="pause"]')) { window.dispatchEvent(new CustomEvent('hh-ar-toggle-status')); return; }
    if (e.target.closest('[data-action="refresh"]')) { window.dispatchEvent(new CustomEvent('hh-ar-refresh')); return; }
    if (e.target.closest('#har-retry-auth')) { updateAuthState(); return; }
    // Resume actions
    if (e.target.closest('[data-action="load-resume"]')) { window.dispatchEvent(new CustomEvent('hh-ar-load-resume')); return; }
    if (e.target.closest('[data-action="goto-resume"]')) { window.open('https://hh.ru/applicant/resumes', '_blank'); return; }
    if (e.target.closest('[data-action="diagnose-dom"]')) { diagnoseResumeDOM(); return; }
  });
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

export function updateVacancies(vacancies) {
  panelState.vacancies = (vacancies || []).filter(v => v && v.id && v.title);
  renderVacancyList();
}
export function updateStats(stats) {
  Object.assign(panelState.stats, stats);
  renderStatsValues();
}
export function setStatus(status) {
  panelState.status = status;
  const dot = refs.shadowRoot?.querySelector('.har-dot');
  if (dot) dot.className = 'har-dot har-dot-' + status;
}
export function createPanel() {
  createFab(toggleSidebar);
  createSidebar();
  setTimeout(updateAuthState, 1500);
  setInterval(updateAuthState, 5000);
}
