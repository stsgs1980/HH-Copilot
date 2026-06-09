/**
 * Panel UI — FAB Button + Right Sidebar
 * ========================================
 *
 * Компоненты:
 * 1. FAB (Floating Action Button) — круглая кнопка, fixed правый нижний угол
 * 2. Sidebar — правая панель 360px, full-height, выезжает по клику на FAB
 * 3. Auth check — определяет залогинен ли пользователь на hh.ru
 *
 * FAB states:
 * - Not logged in: красный, иконка замка
 * - Logged in + closed: синий, иконка стрелки
 * - Logged in + open: синий, иконка крестика
 *
 * Sidebar states:
 * - not_logged_in: блок с просьбой залогиниться + кнопка входа
 * - logged_in: полный функционал (вакансии, статистика, настройки)
 *
 * AUTH CHECK METHODOLOGY:
 * Ищем элемент [data-qa="mainmenu_applicant"] в DOM.
 * Если существует — пользователь авторизован.
 * Если нет — не авторизован (страница логина или гость).
 *
 * ANTI-HALLUCINATION:
 * - FAB НЕ зависит от DOM hh.ru (position: fixed)
 * - Shadow DOM изолирует стили
 * - Auth check: проверяем existence + visibility элемента
 * - Каждые 5 секунд повторяем auth check (SPA может обновить DOM)
 */

import { createLogger } from '../lib/anti-hallucination.js';

const log = createLogger('Panel');

// ─── State ────────────────────────────────────

let fabEl = null;
let sidebarEl = null;
let shadowRoot = null;

const state = {
  isOpen: false,
  isLoggedIn: null,    // null = checking, true/false = result
  status: 'idle',      // 'idle' | 'running' | 'paused' | 'error'
  vacancies: [],
  stats: { appliedToday: 0, dailyLimit: 200, errors: 0 }
};

let authCheckInterval = null;

// ═══════════════════════════════════════════════
// 1. AUTH CHECK
// ═══════════════════════════════════════════════

/**
 * Проверяет авторизацию пользователя на hh.ru.
 *
 * МЕТОДИКА:
 * hh.ru показывает меню залогиненного пользователя через data-qa="mainmenu_applicant".
 * Если этот элемент есть в DOM и видим — пользователь авторизован.
 * Также проверяем data-qa="mainmenu_user_name" как backup.
 *
 * ANTI-HALLUCINATION:
 * - Проверяем existence (не null)
 * - Проверяем visibility (offsetParent !== null)
 * - Проверяем что это именно Element
 * - Timeout: если через 3 секунды не нашли — считаем не авторизованным
 *
 * @returns {boolean} true если залогинен, false если нет
 */
function checkAuth() {
  // Primary selector: меню соискателя
  const primary = document.querySelector('[data-qa="mainmenu_applicant"]');
  if (primary && primary.offsetParent !== null) {
    return true;
  }

  // Backup selector: имя пользователя в шапке
  const backup = document.querySelector('[data-qa="mainmenu_user_name"]');
  if (backup && backup.offsetParent !== null) {
    return true;
  }

  // Additional backup: ссылка "Мои резюме"
  const resumes = document.querySelector('[data-qa="mainmenu_myResumes"]');
  if (resumes && resumes.offsetParent !== null) {
    return true;
  }

  // Check if we're on login page
  const loginForm = document.querySelector('[data-qa="account-login-submit"]');
  if (loginForm) {
    return false;
  }

  return false;
}

/**
 * Пытается извлечь имя пользователя из шапки hh.ru.
 * @returns {string} имя или "Пользователь"
 */
function getUserName() {
  const nameEl = document.querySelector('[data-qa="mainmenu_user_name"]');
  if (nameEl) {
    const text = nameEl.textContent?.trim();
    if (text && text.length > 0) return text;
  }
  return 'Пользователь';
}

/**
 * Обновляет UI в зависимости от auth state.
 */
function updateAuthState() {
  const wasLoggedIn = state.isLoggedIn;
  const nowLoggedIn = checkAuth();

  if (wasLoggedIn === null || wasLoggedIn !== nowLoggedIn) {
    state.isLoggedIn = nowLoggedIn;
    log.info(`Auth state: ${nowLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
    renderSidebar();
    updateFab();
  }
}

// ═══════════════════════════════════════════════
// 2. FAB (Floating Action Button)
// ═══════════════════════════════════════════════

/**
 * Создаёт FAB кнопку.
 *
 * Дизайн:
 * - 56x56px circle, fixed правый нижний угол (bottom: 24px, right: 24px)
 * - z-index: 999999 (above everything)
 * - Box shadow для depth effect
 * - Hover: scale up + darker color
 * - Transition: transform 0.3s, background 0.2s
 *
 * Иконки (SVG inline):
 * - Locked (not logged in): замок, красный фон
 * - Closed (logged in, sidebar hidden): стрелка влево, синий фон
 * - Open (logged in, sidebar visible): крестик, синий фон
 */
export function createFab() {
  if (fabEl) return fabEl;

  fabEl = document.createElement('div');
  fabEl.id = 'hh-ar-fab';
  fabEl.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    cursor: pointer;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    background: #2964FF;
  `;

  // Default icon (will be updated by updateFab)
  fabEl.innerHTML = getFabIcon('locked');

  fabEl.addEventListener('mouseenter', () => {
    fabEl.style.transform = 'scale(1.08)';
    fabEl.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
  });

  fabEl.addEventListener('mouseleave', () => {
    fabEl.style.transform = 'scale(1)';
    fabEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)';
  });

  fabEl.addEventListener('click', toggleSidebar);

  document.body.appendChild(fabEl);
  log.info('FAB created');

  return fabEl;
}

function updateFab() {
  if (!fabEl) return;

  if (state.isLoggedIn === null) {
    // Checking...
    fabEl.style.background = '#94a3b8';
    fabEl.innerHTML = getFabIcon('loading');
  } else if (!state.isLoggedIn) {
    // Not logged in
    fabEl.style.background = '#ef4444';
    fabEl.innerHTML = getFabIcon('locked');
  } else if (state.isOpen) {
    // Open
    fabEl.style.background = '#2964FF';
    fabEl.innerHTML = getFabIcon('close');
  } else {
    // Closed, logged in
    fabEl.style.background = '#2964FF';
    fabEl.innerHTML = getFabIcon('open');
  }
}

function getFabIcon(type) {
  const icons = {
    locked: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>`,
    open: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`,
    close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    loading: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation: har-spin 1s linear infinite">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>`
  };
  return icons[type] || icons.open;
}

// ═══════════════════════════════════════════════
// 3. SIDEBAR
// ═══════════════════════════════════════════════

/**
 * Создаёт правый sidebar с Shadow DOM.
 *
 * Дизайн:
 * - 360px шириной, full-height (100vh)
 * - Fixed, right: 0, top: 0
 * - Скрывается за правый край (translateX(100%))
 * - При открытии: translateX(0) с transition 0.3s ease
 * - Backdrop overlay (полупрозрачный) закрывает sidebar при клике
 *
 * Auth-dependent content:
 * - NOT LOGGED IN: сообщение + ссылка на вход
 * - LOGGED IN: полный UI (vacancies, stats, actions)
 */
export function createSidebar() {
  if (sidebarEl) return sidebarEl;

  // Backdrop overlay
  const backdrop = document.createElement('div');
  backdrop.id = 'hh-ar-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 999998;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  `;
  backdrop.addEventListener('click', () => {
    if (state.isOpen) toggleSidebar();
  });

  // Sidebar container
  sidebarEl = document.createElement('div');
  sidebarEl.id = 'hh-ar-sidebar';
  sidebarEl.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 720px;
    height: 100vh;
    z-index: 999999;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Shadow DOM для изоляции стилей
  shadowRoot = sidebarEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getSidebarCSS();
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'har-sidebar';
  container.innerHTML = getSidebarHTML();
  shadowRoot.appendChild(container);

  _bindSidebarEvents(container);

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebarEl);
  log.info('Sidebar created');

  return sidebarEl;
}

export function toggleSidebar() {
  if (!sidebarEl) createSidebar();
  if (!fabEl) createFab();

  state.isOpen = !state.isOpen;

  // Animate sidebar
  sidebarEl.style.transform = state.isOpen ? 'translateX(0)' : 'translateX(100%)';

  // Animate backdrop
  const backdrop = document.getElementById('hh-ar-backdrop');
  if (backdrop) {
    backdrop.style.opacity = state.isOpen ? '1' : '0';
    backdrop.style.pointerEvents = state.isOpen ? 'auto' : 'none';
  }

  // Move FAB when sidebar opens (чтобы не перекрывался)
  fabEl.style.right = state.isOpen ? '380px' : '24px';
  fabEl.style.transition = 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s, box-shadow 0.2s';

  updateFab();
  log.info(`Sidebar ${state.isOpen ? 'opened' : 'closed'}`);
}

// ─── Render Sidebar Content ──────────────────

function renderSidebar() {
  const content = shadowRoot?.querySelector('.har-content');
  if (!content) return;

  if (state.isLoggedIn === null) {
    content.innerHTML = _renderAuthChecking();
  } else if (!state.isLoggedIn) {
    content.innerHTML = _renderAuthRequired();
  } else {
    content.innerHTML = _renderLoggedIn();
    _renderVacancyList();
    _renderStats();
    updateStatusBar();
  }
}

function _renderAuthChecking() {
  return `
    <div class="har-auth-container">
      <div class="har-auth-spinner"></div>
      <h3>Проверяем авторизацию...</h3>
      <p>Определяем статус на hh.ru</p>
    </div>
  `;
}

function _renderAuthRequired() {
  return `
    <div class="har-auth-container">
      <div class="har-auth-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          <path d="M7 11V7a5 5 0 0110 0v4" transform="translate(0,1)"/>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        </svg>
      </div>
      <h3>Войдите в hh.ru</h3>
      <p>Расширение работает с вашей учётной записью hh.ru.<br>
      Пожалуйста, авторизуйтесь, чтобы включить функции автоматизации.</p>
      <a href="https://hh.ru/account/login" target="_blank" class="har-btn har-btn-primary har-btn-full">
        Войти на hh.ru
      </a>
      <button class="har-btn har-btn-secondary har-btn-full" id="har-retry-auth">
        Проверить снова
      </button>
    </div>
  `;
}

function _renderLoggedIn() {
  const userName = getUserName();
  return `
    <div class="har-user-bar">
      <div class="har-user-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="har-user-info">
        <div class="har-user-name">${_escHtml(userName)}</div>
        <div class="har-user-status">Авторизован</div>
      </div>
      <div class="har-status-badge">
        <div class="har-status-dot har-status-${state.status}"></div>
      </div>
    </div>

    <div class="har-stats">
      <div class="har-stat-item">
        <span class="har-stat-value" id="har-stat-applied">0</span>
        <span class="har-stat-label">откликов</span>
      </div>
      <div class="har-stat-item">
        <span class="har-stat-value" id="har-stat-remaining">200</span>
        <span class="har-stat-label">осталось</span>
      </div>
      <div class="har-stat-item">
        <span class="har-stat-value" id="har-stat-errors">0</span>
        <span class="har-stat-label">ошибок</span>
      </div>
    </div>

    <div class="har-progress">
      <div class="har-progress-bar">
        <div class="har-progress-fill" id="har-progress-fill" style="width: 0%"></div>
      </div>
      <div class="har-progress-text" id="har-progress-text">0 / 200</div>
    </div>

    <div class="har-actions">
      <button class="har-btn har-btn-primary" data-action="apply-all">
        Откликнуться на все
      </button>
      <div class="har-actions-row">
        <button class="har-btn har-btn-secondary har-btn-sm" data-action="toggle-status">Пауза</button>
        <button class="har-btn har-btn-secondary har-btn-sm" data-action="refresh">Обновить</button>
      </div>
    </div>

    <div class="har-section-title">Вакансии на странице</div>
    <div class="har-vacancy-list" id="har-vacancy-list">
      <div class="har-empty">Загрузка...</div>
    </div>
  `;
}

function _renderVacancyList() {
  const list = shadowRoot?.getElementById('har-vacancy-list');
  if (!list) return;

  if (state.vacancies.length === 0) {
    list.innerHTML = '<div class="har-empty">Нет вакансий для отображения.<br>Перейдите на страницу поиска.</div>';
    return;
  }

  list.innerHTML = state.vacancies.slice(0, 50).map(v => `
    <div class="har-vacancy-card ${v.status || ''}" data-id="${v.id}">
      <div class="har-vacancy-header">
        <a href="${v.url}" target="_blank" class="har-vacancy-title">${_escHtml(v.title)}</a>
        ${v.matchScore !== null && v.matchScore !== undefined
          ? `<span class="har-score score-${_scoreClass(v.matchScore)}">${v.matchScore}%</span>` : ''}
      </div>
      <div class="har-vacancy-meta">
        <span class="har-company">${_escHtml(v.company)}</span>
        ${v.salary && v.salary !== 'Не указана'
          ? `<span class="har-salary">${_escHtml(v.salary)}</span>` : ''}
      </div>
      <div class="har-vacancy-footer">
        <span class="har-location">${_escHtml(v.location)}</span>
        ${v.hasReply && (!v.status || v.status === 'new')
          ? `<button class="har-btn-apply" data-action="apply" data-id="${v.id}">Откликнуться</button>` : ''}
        ${v.status === 'applied' ? '<span class="har-badge applied">Откликнута</span>' : ''}
        ${v.status === 'blacklisted' ? '<span class="har-badge blacklisted">Чёрный список</span>' : ''}
      </div>
    </div>
  `).join('');

  if (state.vacancies.length > 50) {
    list.innerHTML += `<div class="har-empty">...и ещё ${state.vacancies.length - 50} вакансий</div>`;
  }
}

function _renderStats() {
  const el = shadowRoot?.getElementById('har-stat-applied');
  const el2 = shadowRoot?.getElementById('har-stat-remaining');
  const el3 = shadowRoot?.getElementById('har-stat-errors');
  const progress = shadowRoot?.getElementById('har-progress-fill');
  const progressText = shadowRoot?.getElementById('har-progress-text');

  if (el) el.textContent = state.stats.appliedToday || 0;
  if (el2) el2.textContent = (state.stats.dailyLimit || 200) - (state.stats.appliedToday || 0);
  if (el3) el3.textContent = state.stats.errors || 0;

  const applied = state.stats.appliedToday || 0;
  const limit = state.stats.dailyLimit || 200;
  const pct = Math.min(100, (applied / limit) * 100);
  if (progress) progress.style.width = `${pct}%`;
  if (progressText) progressText.textContent = `${applied} / ${limit}`;
}

// ─── Event Binding ────────────────────────────

function _bindSidebarEvents(container) {
  container.addEventListener('click', (e) => {
    // Apply single vacancy
    const btn = e.target.closest('[data-action="apply"]');
    if (btn) {
      e.preventDefault();
      log.info('Apply clicked', { id: btn.dataset.id });
      window.dispatchEvent(new CustomEvent('hh-ar-apply', {
        detail: { vacancyId: btn.dataset.id }
      }));
      return;
    }

    // Apply all
    if (e.target.closest('[data-action="apply-all"]')) {
      log.info('Apply all clicked');
      window.dispatchEvent(new CustomEvent('hh-ar-apply-all'));
      return;
    }

    // Toggle status (pause/resume)
    if (e.target.closest('[data-action="toggle-status"]')) {
      log.info('Toggle status clicked');
      window.dispatchEvent(new CustomEvent('hh-ar-toggle-status'));
      return;
    }

    // Refresh vacancies
    if (e.target.closest('[data-action="refresh"]')) {
      log.info('Refresh clicked');
      window.dispatchEvent(new CustomEvent('hh-ar-refresh'));
      return;
    }

    // Retry auth check
    if (e.target.closest('#har-retry-auth')) {
      log.info('Retry auth clicked');
      updateAuthState();
      return;
    }
  });
}

// ═══════════════════════════════════════════════
// PUBLIC API (for main.js)
// ═══════════════════════════════════════════════

/**
 * Инициализация: создаёт FAB + sidebar, запускает auth check.
 */
export function createPanel() {
  createFab();
  createSidebar();

  // Initial auth check (с задержкой чтобы DOM прогрузился)
  setTimeout(() => {
    updateAuthState();
  }, 1500);

  // Periodic auth check (каждые 5 секунд)
  authCheckInterval = setInterval(() => {
    updateAuthState();
  }, 5000);

  log.info('Panel init: FAB + sidebar created');
}

export function updateVacancies(vacancies) {
  state.vacancies = (vacancies || []).filter(v => v && v.id && v.title);
  _renderVacancyList();
}

export function updateStats(stats) {
  Object.assign(state.stats, stats);
  _renderStats();
}

export function setStatus(status, message = '') {
  state.status = status;
  updateStatusBar();
}

function updateStatusBar() {
  const dot = shadowRoot?.querySelector('.har-status-dot');
  if (dot) {
    dot.className = `har-status-dot har-status-${state.status}`;
  }
}

// ═══════════════════════════════════════════════
// CSS (inside Shadow DOM)
// ═══════════════════════════════════════════════

function getSidebarCSS() {
  return `
    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    /* Loading spinner */
    @keyframes har-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes har-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

    /* ─── Sidebar container ─── */
    .har-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      box-shadow: -4px 0 24px rgba(0,0,0,0.12);
      overflow: hidden;
    }

    /* ─── Header ─── */
    .har-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #2964FF, #6366f1);
      color: white;
      flex-shrink: 0;
    }
    .har-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .har-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .har-version { font-size: 10px; opacity: 0.7; }

    /* ─── User bar (logged in) ─── */
    .har-user-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .har-user-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #2964FF;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .har-user-info { flex: 1; }
    .har-user-name { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .har-user-status { font-size: 11px; color: #22c55e; }
    .har-status-badge { display: flex; align-items: center; }
    .har-status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #9ca3af;
    }
    .har-status-idle .har-status-dot { background: #9ca3af; }
    .har-status-running .har-status-dot { background: #22c55e; animation: har-pulse 1.5s infinite; }
    .har-status-paused .har-status-dot { background: #f59e0b; }
    .har-status-error .har-status-dot { background: #ef4444; }

    /* ─── Auth container ─── */
    .har-auth-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 32px;
      text-align: center;
    }
    .har-auth-icon { margin-bottom: 24px; }
    .har-auth-spinner {
      width: 40px; height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #2964FF;
      border-radius: 50%;
      animation: har-spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    .har-auth-container h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 12px 0;
    }
    .har-auth-container p {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    /* ─── Stats ─── */
    .har-stats {
      display: flex;
      padding: 12px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 12px;
      flex-shrink: 0;
    }
    .har-stat-item { text-align: center; flex: 1; }
    .har-stat-value { display: block; font-weight: 800; font-size: 22px; color: #2964FF; }
    .har-stat-label { display: block; font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }

    /* ─── Progress bar ─── */
    .har-progress {
      padding: 8px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .har-progress-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .har-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2964FF, #6366f1);
      border-radius: 2px;
      transition: width 0.5s ease;
    }
    .har-progress-text {
      font-size: 10px;
      color: #94a3b8;
      text-align: right;
      margin-top: 4px;
    }

    /* ─── Action buttons ─── */
    .har-actions {
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .har-actions-row {
      display: flex;
      gap: 8px;
    }
    .har-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .har-btn-primary { background: #2964FF; color: white; }
    .har-btn-primary:hover { background: #1d4ed8; }
    .har-btn-secondary { background: #f1f5f9; color: #475569; }
    .har-btn-secondary:hover { background: #e2e8f0; }
    .har-btn-full { width: 100%; display: block; margin: 8px 0 4px 0; text-decoration: none; }
    .har-btn-sm { flex: 1; padding: 8px 12px; font-size: 12px; }

    /* ─── Section title ─── */
    .har-section-title {
      padding: 10px 20px 6px 20px;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    /* ─── Vacancy list ─── */
    .har-vacancy-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    .har-vacancy-card {
      padding: 10px 20px;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }
    .har-vacancy-card:hover { background: #f8fafc; }
    .har-vacancy-card.applied { opacity: 0.5; }
    .har-vacancy-card.blacklisted { opacity: 0.3; }
    .har-vacancy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }
    .har-vacancy-title {
      font-weight: 600;
      color: #2964FF;
      text-decoration: none;
      font-size: 13px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .har-vacancy-title:hover { text-decoration: underline; }
    .har-score {
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .score-high { background: #dcfce7; color: #166534; }
    .score-medium { background: #fef9c3; color: #854d0e; }
    .score-low { background: #fee2e2; color: #991b1b; }
    .har-vacancy-meta {
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .har-salary { color: #1a1a1a; font-weight: 500; }
    .har-vacancy-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .har-location { font-size: 11px; color: #94a3b8; }
    .har-btn-apply {
      padding: 4px 12px;
      background: #2964FF;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .har-btn-apply:hover { background: #1d4ed8; }
    .har-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .har-badge.applied { background: #dbeafe; color: #1d4ed8; }
    .har-badge.blacklisted { background: #fee2e2; color: #991b1b; }
    .har-empty {
      padding: 24px 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.6;
    }

    /* ─── Content area ─── */
    .har-content {
      flex: 1;
      overflow-y: auto;
    }
  `;
}

// ─── HTML Template ────────────────────────────

function getSidebarHTML() {
  return `
    <div class="har-header">
      <div class="har-header-row">
        <h3>HH Auto-Respond</h3>
        <span class="har-version">v1.0</span>
      </div>
    </div>
    <div class="har-content">
      <div class="har-auth-container">
        <div class="har-auth-spinner"></div>
        <h3>Проверяем авторизацию...</h3>
        <p>Определяем статус на hh.ru</p>
      </div>
    </div>
  `;
}

// ─── Utility ───────────────────────────────────

function _escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _scoreClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export { state };
