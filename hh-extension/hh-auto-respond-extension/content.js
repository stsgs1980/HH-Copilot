/**
 * HH Auto-Respond — Bundled Content Script
 * =========================================
 * Все модули объединены в один файл, т.к. Manifest V3
 * content_scripts НЕ поддерживают ES modules (import/export).
 *
 * Порядок: lib → content → main (boot)
 */

// ═══════════════════════════════════════════════
// LIB: SELECTORS
// ═══════════════════════════════════════════════

const HH_SELECTORS = {
  vacancyCard: ['[data-qa="vacancy-serp__vacancy"]', '.vacancy-serp-item', '[class*="vacancy-serp-item"]'],
  vacancyTitleLink: ['a[data-qa="serp-item__title"]', 'a[data-qa="vacancy-serp__vacancy-title"]'],
  vacancyTitleText: ['[data-qa="serp-item__title-text"]'],
  vacancyCompany: ['[data-qa="vacancy-serp__vacancy-employer-text"]', 'a[data-qa="vacancy-serp__vacancy-employer"]'],
  vacancySalary: ['[data-qa="vacancy-serp__compensation"]', '.vacancy-serp-item__compensation'],
  vacancyLocation: ['[data-qa="vacancy-serp__vacancy-address"]'],
  vacancyExperience: ['[data-qa^="vacancy-serp__vacancy-work-experience"]'],
  vacancyTags: ['.bloko-tag__text'],
  replyButton: ['[data-qa="vacancy-serp__vacancy_response"]', '[data-qa="vacancy-response-link-top"]'],
  nextPage: ['[data-qa="pager-next"]'],
  vacancyTitleOnPage: ['[data-qa="vacancy-title"]', 'h1.bloko-header-section-1'],
  vacancyCompanyOnPage: ['[data-qa="vacancy-company-name"]', 'a[data-qa="vacancy-company-name"]'],
  vacancyDescription: ['[data-qa="vacancy-description"]', '.vacancy-description'],
  vacancySkills: ['[data-qa="skills-element"]', '.bloko-tag__section'],
  responsePopup: ['[data-qa="vacancy-response-submit-popup"]', '.vacancy-response-popup'],
  addCoverLetter: ['[data-qa="add-cover-letter"]'],
  coverLetterInput: ['textarea[data-qa="vacancy-response-popup-form-letter-input"]', 'textarea.bloko-textarea'],
  submitButton: ['[data-qa="vacancy-response-submit-popup"]', 'button.bloko-button_primary'],
  alertMagritte: ['[data-qa="magritte-alert"]'],
  relocationConfirm: ['[data-qa="relocation-warning-confirm"]'],
  testTaskWarning: ['[data-qa="test-task-required"]'],
  alreadyApplied: ['[data-qa="already-applied"]'],
  indirectEmployerAlert: ['[data-qa="indirect-employer-alert"]'],
  resumePersonalName: ['[data-qa="resume-personal-name"]'],
  resumeTitle: ['[data-qa="resume-block-title-position"]'],
  resumeSkillTag: ['[data-qa="skill-tag"]', '.bloko-tag__text'],
  loginEmailInput: ['input[name="username"]', 'input[type="email"]', 'input[data-qa="login-input-username"]'],
  loginPasswordInput: ['input[name="password"]', 'input[type="password"]', 'input[data-qa="login-input-password"]'],
  loginCaptchaImage: ['img[src*="captcha"]', '.g-recaptcha'],
  logged_in_indicator: ['[data-qa="mainmenu_applicant"]', '[data-qa="mainmenu_user_name"]', 'a[data-qa="mainmenu_myResumes"]']
};

function getSelectors(name) {
  const s = HH_SELECTORS[name];
  return (s && Array.isArray(s)) ? [...s] : [];
}

function findElement(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (!el) continue;
      // НЕ проверяем offsetParent (null для fixed/transform элементов)
      if (root === document) {
        if (!document.body.contains(el)) continue;
      } else {
        if (!root.contains(el)) continue;
      }
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') return el;
    } catch (e) {}
  }
  return null;
}

function findAllElements(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els && els.length > 0) return Array.from(els);
    } catch (e) {}
  }
  return [];
}

// ═══════════════════════════════════════════════
// LIB: ANTI-HALLUCINATION
// ═══════════════════════════════════════════════

function safeGetText(el, fallback) {
  fallback = fallback || '';
  if (!el || !(el instanceof Element)) return fallback;
  if (el.offsetParent === null && document.body.contains(el)) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return fallback;
  }
  const text = (el.textContent || '').trim();
  return text.length > 0 ? text : fallback;
}

function safeGetAttr(el, attr, fallback) {
  fallback = fallback || '';
  if (!el || !(el instanceof Element)) return fallback;
  const v = el.getAttribute(attr);
  return v !== null ? v : fallback;
}

function validateVacancyData(v) {
  const errors = [];
  if (!v || typeof v !== 'object') return { valid: false, errors: ['not an object'] };
  if (!v.title || typeof v.title !== 'string' || v.title.trim().length < 3) errors.push('bad title');
  if (!v.company || typeof v.company !== 'string') errors.push('bad company');
  if (!v.url || typeof v.url !== 'string' || !v.url.startsWith('https://hh.ru/')) errors.push('bad url');
  if (!v.id || typeof v.id !== 'string') errors.push('bad id');
  return { valid: errors.length === 0, errors };
}

function extractVacancyId(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/\/vacancy\/(\d+)/);
  return m ? m[1] : '';
}

function waitForElement(selectors, timeout, root) {
  timeout = timeout || 10000;
  root = root || document;
  const checkVisible = (el) => {
    if (!el) return false;
    const container = root === document ? document.body : root;
    if (!container.contains(el)) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  return new Promise(resolve => {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (checkVisible(el)) { resolve(el); return; }
      } catch (e) {}
    }
    const startTime = Date.now();
    const observer = new MutationObserver(() => {
      if (Date.now() - startTime > timeout) { observer.disconnect(); resolve(null); return; }
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel);
          if (checkVisible(el)) { observer.disconnect(); resolve(el); return; }
        } catch (e) {}
      }
    });
    observer.observe(root.body || root, { childList: true, subtree: true });
  });
}

function safeClick(el, label) {
  if (!el || !(el instanceof Element) || el.disabled) return false;
  if (!document.body.contains(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  el.click();
  return true;
}

function safeInput(el, text, label) {
  if (!el || !(el instanceof HTMLElement) || el.disabled || el.readOnly) return false;
  if (typeof text !== 'string' || text.length === 0) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) { setter.call(el, text); } else { el.value = text; }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// Logger
function createLogger(module) {
  return {
    info: (action, data) => console.debug('[HH-AR][' + module + '] ' + action, data || ''),
    warn: (action, data) => console.warn('[HH-AR][' + module + '] ' + action, data || ''),
    error: (action, data) => console.error('[HH-AR][' + module + '] ' + action, data || ''),
  };
}

// ═══════════════════════════════════════════════
// LIB: STORAGE
// ═══════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  mode: 'manual', dailyLimit: 200, minMatchScore: 60,
  letterTone: 'formal', searchInterval: 300,
  autoScroll: true, showMatchScore: true, confirmBeforeApply: true
};

const DEFAULT_STATS = {
  totalApplied: 0, appliedToday: 0, interviewInvites: 0,
  responsesReceived: 0, skipsToday: 0, errorsToday: 0, lastActivity: null
};

async function getAllSettings() {
  try {
    const d = await chrome.storage.local.get('settings');
    return Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
  } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}

async function getStats() {
  try {
    await checkDailyReset();
    const d = await chrome.storage.local.get('stats');
    return Object.assign({}, DEFAULT_STATS, d.stats || {});
  } catch (e) { return Object.assign({}, DEFAULT_STATS); }
}

async function incrementApplied() {
  const stats = await getStats();
  const settings = await getAllSettings();
  if (stats.appliedToday >= settings.dailyLimit) return { allowed: false, remaining: 0 };
  stats.appliedToday++;
  stats.totalApplied++;
  stats.lastActivity = new Date().toISOString();
  await chrome.storage.local.set({ stats });
  return { allowed: true, remaining: settings.dailyLimit - stats.appliedToday };
}

async function isAlreadyApplied(id) {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    return (d.appliedVacancies || []).includes(id);
  } catch (e) { return false; }
}

async function markAsApplied(id) {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    const arr = d.appliedVacancies || [];
    if (!arr.includes(id)) { arr.push(id); await chrome.storage.local.set({ appliedVacancies: arr }); }
  } catch (e) {}
}

async function checkDailyReset() {
  try {
    const d = await chrome.storage.local.get('dailyResetDate');
    const today = new Date().toISOString().split('T')[0];
    if (d.dailyResetDate !== today) {
      const sd = await chrome.storage.local.get('stats');
      const s = sd.stats || DEFAULT_STATS;
      s.appliedToday = 0; s.skipsToday = 0; s.errorsToday = 0;
      await chrome.storage.local.set({ stats: s, dailyResetDate: today });
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════
// LIB: TIMING
// ═══════════════════════════════════════════════

function gaussianRandom(mean, stddev) {
  mean = mean || 10.0; stddev = stddev || 4.0;
  let u1 = Math.max(1e-10, Math.min(1 - 1e-10, Math.random()));
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * Math.random());
  return Math.max(2.0, z * stddev + mean);
}

function randomDelay() {
  return new Promise(r => setTimeout(r, gaussianRandom() * 1000));
}

function simulateReading() {
  const delay = 5000 + Math.random() * 7000;
  return new Promise(r => setTimeout(r, delay));
}

async function simulateTyping(el, text) {
  if (!el || typeof text !== 'string') return;
  for (const ch of text) {
    el.value = (el.value || '') + ch;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30 + Math.random() * 90));
  }
}

// ═══════════════════════════════════════════════
// LIB: RATE LIMITER
// ═══════════════════════════════════════════════

const rateLimiter = {
  limits: { maxPerDay: 200, maxPerHour: 30, minIntervalMs: 30000, burstMax: 5, burstPauseMs: 120000 },
  lastActionTime: 0, burstCount: 0, hourlyCount: 0, currentHour: new Date().getHours(), adaptiveFactor: 1.0,

  async check() {
    const stats = await getStats();
    const settings = await getAllSettings();
    const now = Date.now();
    if (stats.appliedToday >= (settings.dailyLimit || this.limits.maxPerDay))
      return { allowed: false, reason: 'Дневной лимит: ' + stats.appliedToday + '/' + settings.dailyLimit };
    const ch = new Date().getHours();
    if (ch !== this.currentHour) { this.hourlyCount = 0; this.currentHour = ch; }
    if (this.hourlyCount >= this.limits.maxPerHour)
      return { allowed: false, reason: 'Часовой лимит', waitMs: 3600000 };
    if (now - this.lastActionTime < this.limits.minIntervalMs * this.adaptiveFactor)
      return { allowed: false, reason: 'Слишком быстро', waitMs: this.limits.minIntervalMs };
    if (this.burstCount >= this.limits.burstMax)
      return { allowed: false, reason: 'Burst pause (5 подряд)', waitMs: this.limits.burstPauseMs };
    return { allowed: true };
  },
  recordAction() { this.lastActionTime = Date.now(); this.burstCount++; this.hourlyCount++; },
  adaptiveSlowdown(reason) {
    const f = { '429': 2.0, slow: 1.5, captcha: 1.3 }[reason] || 1.0;
    this.adaptiveFactor = Math.min(5.0, this.adaptiveFactor * f);
  },
  resetBurst() { this.burstCount = 0; }
};

// ═══════════════════════════════════════════════
// CONTENT: PARSER
// ═══════════════════════════════════════════════

const parserLog = createLogger('Parser');

async function parseVacanciesFromPage() {
  const cards = findAllElements('vacancyCard');
  parserLog.info('Found ' + cards.length + ' vacancy cards');
  if (cards.length === 0) return [];

  const vacancies = [];
  let appliedIds = [], blacklisted = [];
  try {
    const d1 = await chrome.storage.local.get('appliedVacancies');
    appliedIds = d1.appliedVacancies || [];
    const d2 = await chrome.storage.local.get('blacklistedCompanies');
    blacklisted = d2.blacklistedCompanies || [];
  } catch (e) {}

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const titleEl = findElement('vacancyTitleLink', card);
    const title = safeGetText(titleEl);
    if (!title) continue;
    const url = safeGetAttr(titleEl, 'href', '');
    const id = extractVacancyId(url.startsWith('/') ? 'https://hh.ru' + url : url);
    if (!id) continue;

    const company = safeGetText(findElement('vacancyCompany', card));
    const salary = safeGetText(findElement('vacancySalary', card), '');
    const location = safeGetText(findElement('vacancyLocation', card), '');
    const experience = safeGetText(findElement('vacancyExperience', card), '');

    const tagEls = card.querySelectorAll('.bloko-tag__text, [data-qa="bloko-tag"]');
    const skills = [];
    tagEls.forEach(el => { const t = (el.textContent || '').trim(); if (t && t.length < 50) skills.push(t); });

    const replyBtn = findElement('replyButton', card);
    const hasReply = replyBtn !== null;

    const vacancy = {
      id, title: title.trim(), company: (company || '').trim(),
      salary: salary || 'Не указана', location: (location || '').trim(),
      experience: (experience || '').trim(), skills,
      url: url.startsWith('/') ? 'https://hh.ru' + url : url,
      hasReply, status: 'new', parsedAt: new Date().toISOString(),
      matchScore: null
    };

    const validation = validateVacancyData(vacancy);
    if (!validation.valid) { parserLog.warn('Card #' + i + ' invalid: ' + validation.errors.join(', ')); continue; }

    if (appliedIds.includes(vacancy.id)) vacancy.status = 'applied';
    if (blacklisted.includes(vacancy.company)) vacancy.status = 'blacklisted';
    vacancies.push(vacancy);
  }
  parserLog.info('Parsed ' + vacancies.length + '/' + cards.length + ' valid vacancies');
  return vacancies;
}

// ═══════════════════════════════════════════════
// CONTENT: PANEL (FAB + SIDEBAR)
// ═══════════════════════════════════════════════

const panelLog = createLogger('Panel');
let fabEl = null, sidebarEl = null, backdropEl = null, shadowRoot = null;
const panelState = { isOpen: false, isLoggedIn: null, status: 'idle', vacancies: [], stats: {} };

// AUTH CHECK
// NOTE: offsetParent === null для position:fixed элементов, поэтому НЕ проверяем его.
// Проверяем только: элемент существует, не скрыт через display:none / visibility:hidden.
function checkAuth() {
  const selectors = [
    '[data-qa="mainmenu_applicant"]',
    '[data-qa="mainmenu_user_name"]',
    'a[data-qa="mainmenu_myResumes"]',
    '[data-qa="mainmenu"] sup',
    '.supernova-nav__item--applicant',
    'a[href*="/applicant/"]',
    'a[href*="/account"]',
    '.bloko-header-hamburger',
    '[data-qa="mainmenu"] a[href*="resumes"]',
    '.mainmenu__item--applicant',
    '[data-qa="mainmenu"]',
    '.HH-React-Header-Nav',
    'nav[class*="nav"] a[href*="resumes"]',
    // Cookie fallback: если есть cookie с именем пользователя, точно авторизован
  ];
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      // Проверяем что не скрыт через display:none или visibility:hidden
      if (document.body.contains(el)) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log('[HH-AR][Auth] Found auth element:', sel);
          return true;
        }
      }
    } catch (e) { /* invalid selector */ }
  }
  // Cookie-based fallback: ищем cookie hhruuid или _HH-RU-Auth
  const cookies = document.cookie || '';
  if (cookies.includes('hhruuid') || cookies.includes('_HH-RU') || cookies.includes('hhtoken')) {
    console.log('[HH-AR][Auth] Found auth cookie');
    return true;
  }
  console.log('[HH-AR][Auth] No auth indicators found');
  return false;
}

function getUserName() {
  // Попробуем несколько вариантов получения имени
  const nameSelectors = [
    '[data-qa="mainmenu_user_name"]',
    '.supernova-nav__item--applicant',
    'a[href*="/applicant/"]',
  ];
  for (const sel of nameSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const name = (el.textContent || '').trim();
        if (name && name.length > 0 && name.length < 100) {
          console.log('[HH-AR][Auth] User name from:', sel, '=', name);
          return name;
        }
      }
    } catch (e) {}
  }
  console.log('[HH-AR][Auth] Could not extract user name, using default');
  return 'Пользователь';
}

function updateAuthState() {
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

// FAB
function createFab() {
  if (fabEl) return;
  fabEl = document.createElement('div');
  fabEl.id = 'hh-ar-fab';
  fabEl.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.18);transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,background 0.2s;background:#94a3b8;';
  fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
  fabEl.addEventListener('mouseenter', () => { fabEl.style.transform = 'scale(1.08)'; });
  fabEl.addEventListener('mouseleave', () => { fabEl.style.transform = 'scale(1)'; });
  fabEl.addEventListener('click', toggleSidebar);
  document.body.appendChild(fabEl);
}

function updateFabIcon() {
  if (!fabEl) return;
  if (panelState.isLoggedIn === null) {
    fabEl.style.background = '#94a3b8';
    fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
  } else if (!panelState.isLoggedIn) {
    fabEl.style.background = '#ef4444';
    fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
  } else if (panelState.isOpen) {
    fabEl.style.background = '#2964FF';
    fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  } else {
    fabEl.style.background = '#2964FF';
    fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
  }
}

// SIDEBAR
function createSidebar() {
  if (sidebarEl) return;

  backdropEl = document.createElement('div');
  backdropEl.id = 'hh-ar-backdrop';
  backdropEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;';
  backdropEl.addEventListener('click', () => { if (panelState.isOpen) toggleSidebar(); });

  sidebarEl = document.createElement('div');
  sidebarEl.id = 'hh-ar-sidebar';
  sidebarEl.style.cssText = 'position:fixed;top:0;right:0;width:360px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);';
  shadowRoot = sidebarEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getSidebarCSS();
  shadowRoot.appendChild(style);

  const container = document.createElement('div');
  container.className = 'har-sidebar';
  container.innerHTML = getSidebarHTML();
  shadowRoot.appendChild(container);

  bindSidebarEvents(container);
  document.body.appendChild(backdropEl);
  document.body.appendChild(sidebarEl);
}

function toggleSidebar() {
  if (!sidebarEl) createSidebar();
  if (!fabEl) createFab();
  panelState.isOpen = !panelState.isOpen;
  sidebarEl.style.transform = panelState.isOpen ? 'translateX(0)' : 'translateX(100%)';
  if (backdropEl) { backdropEl.style.opacity = panelState.isOpen ? '1' : '0'; backdropEl.style.pointerEvents = panelState.isOpen ? 'auto' : 'none'; }
  fabEl.style.right = panelState.isOpen ? '380px' : '24px';
  updateFabIcon();
  panelLog.info('Sidebar ' + (panelState.isOpen ? 'opened' : 'closed'));
}

function renderSidebarContent() {
  const content = shadowRoot?.querySelector('.har-content');
  if (!content) return;

  if (panelState.isLoggedIn === null) {
    content.innerHTML = '<div class="har-auth-box"><div class="har-spinner"></div><h3>Проверяем авторизацию...</h3><p>Определяем статус на hh.ru</p></div>';
  } else if (!panelState.isLoggedIn) {
    content.innerHTML = '<div class="har-auth-box"><div class="har-lock-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h3>Войдите в hh.ru</h3><p>Расширение работает с вашей учётной записью.<br>Авторизуйтесь для включения автоматизации.</p><a href="https://hh.ru/account/login" target="_blank" class="har-btn har-btn-primary har-btn-block">Войти на hh.ru</a><button class="har-btn har-btn-secondary har-btn-block" id="har-retry-auth">Проверить снова</button></div>';
  } else {
    renderLoggedInContent(content);
  }
}

function renderLoggedInContent(content) {
  const name = getUserName();
  content.innerHTML = `
    <div class="har-user-bar">
      <div class="har-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="har-user-info"><div class="har-user-name">${esc(name)}</div><div class="har-user-status">Авторизован</div></div>
      <div class="har-dot har-dot-${panelState.status}"></div>
    </div>
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
    <div class="har-vacancy-list" id="har-vlist"><div class="har-empty">Загрузка...</div></div>`;
  renderVacancyList();
  renderStatsValues();
}

function renderVacancyList() {
  const list = shadowRoot?.getElementById('har-vlist');
  if (!list) return;
  if (!panelState.vacancies.length) { list.innerHTML = '<div class="har-empty">Нет вакансий.<br>Перейдите на страницу поиска.</div>'; return; }
  list.innerHTML = panelState.vacancies.slice(0, 50).map(v => {
    const sc = v.matchScore != null ? '<span class="har-score sc-' + scoreClass(v.matchScore) + '">' + v.matchScore + '%</span>' : '';
    const apply = (v.hasReply && v.status === 'new') ? '<button class="har-btn-apply" data-action="apply" data-id="' + v.id + '">Откликнуться</button>' : '';
    const badge = v.status === 'applied' ? '<span class="har-badge ba">Откликнута</span>' : v.status === 'blacklisted' ? '<span class="har-badge bb">ЧС</span>' : '';
    return '<div class="har-vcard ' + (v.status || '') + '"><div class="har-vhead"><a href="' + v.url + '" target="_blank" class="har-vtitle">' + esc(v.title) + '</a>' + sc + '</div><div class="har-vmeta"><span>' + esc(v.company) + '</span>' + (v.salary && v.salary !== 'Не указана' ? '<span class="har-vsalary">' + esc(v.salary) + '</span>' : '') + '</div><div class="har-vfoot"><span>' + esc(v.location) + '</span>' + apply + badge + '</div></div>';
  }).join('');
}

function renderStatsValues() {
  const s = panelState.stats;
  const el = (id) => shadowRoot?.getElementById(id);
  const applied = s.appliedToday || 0;
  const limit = s.dailyLimit || 200;
  if (el('sv-applied')) el('sv-applied').textContent = applied;
  if (el('sv-remain')) el('sv-remain').textContent = limit - applied;
  if (el('sv-errors')) el('sv-errors').textContent = s.errorsToday || 0;
  if (el('pf')) el('pf').style.width = Math.min(100, (applied / limit) * 100) + '%';
  if (el('pt')) el('pt').textContent = applied + ' / ' + limit;
}

function bindSidebarEvents(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="apply"]');
    if (btn) { e.preventDefault(); window.dispatchEvent(new CustomEvent('hh-ar-apply', { detail: { vacancyId: btn.dataset.id } })); return; }
    if (e.target.closest('[data-action="apply-all"]')) { window.dispatchEvent(new CustomEvent('hh-ar-apply-all')); return; }
    if (e.target.closest('[data-action="pause"]')) { window.dispatchEvent(new CustomEvent('hh-ar-toggle-status')); return; }
    if (e.target.closest('[data-action="refresh"]')) { window.dispatchEvent(new CustomEvent('hh-ar-refresh')); return; }
    if (e.target.closest('#har-retry-auth')) { updateAuthState(); return; }
  });
}

function getSidebarCSS() {
  return '@keyframes har-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes har-pulse{0%,100%{opacity:1}50%{opacity:.5}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}.har-sidebar{height:100%;display:flex;flex-direction:column;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;color:#1a1a1a}.har-header{padding:16px 20px;background:linear-gradient(135deg,#2964FF,#6366f1);color:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:space-between}.har-header h3{margin:0;font-size:16px;font-weight:700}.har-version{font-size:10px;opacity:.7}.har-content{flex:1;overflow-y:auto}.har-user-bar{display:flex;align-items:center;gap:12px;padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.har-avatar{width:36px;height:36px;border-radius:50%;background:#2964FF;display:flex;align-items:center;justify-content:center}.har-user-info{flex:1}.har-user-name{font-size:13px;font-weight:600}.har-user-status{font-size:11px;color:#22c55e}.har-dot{width:8px;height:8px;border-radius:50%;background:#9ca3af}.har-dot-idle{background:#9ca3af}.har-dot-running{background:#22c55e;animation:har-pulse 1.5s infinite}.har-dot-paused{background:#f59e0b}.har-dot-error{background:#ef4444}.har-auth-box{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center}.har-spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#2964FF;border-radius:50%;animation:har-spin .8s linear infinite;margin-bottom:20px}.har-lock-icon{margin-bottom:20px}.har-auth-box h3{font-size:18px;font-weight:700;margin:0 0 12px}.har-auth-box p{font-size:13px;color:#64748b;line-height:1.6;margin:0 0 24px}.har-stats{display:flex;padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;gap:12px}.har-stat{text-align:center;flex:1}.har-stat-val{display:block;font-weight:800;font-size:22px;color:#2964FF}.har-stat-lbl{display:block;font-size:10px;color:#64748b;text-transform:uppercase;margin-top:2px}.har-progress{padding:8px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.har-progress-bar{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden}.har-progress-fill{height:100%;background:linear-gradient(90deg,#2964FF,#6366f1);border-radius:2px;transition:width .5s}.har-progress-text{font-size:10px;color:#94a3b8;text-align:right;margin-top:4px}.har-actions{padding:12px 20px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #e2e8f0}.har-btn{padding:10px 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;text-align:center}.har-btn-primary{background:#2964FF;color:#fff}.har-btn-primary:hover{background:#1d4ed8}.har-btn-secondary{background:#f1f5f9;color:#475569}.har-btn-secondary:hover{background:#e2e8f0}.har-btn-block{width:100%;display:block;margin:6px 0}.har-section-title{padding:10px 20px 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}.har-vacancy-list{flex:1;overflow-y:auto}.har-vcard{padding:10px 20px;border-bottom:1px solid #f1f5f9;transition:background .15s}.har-vcard:hover{background:#f8fafc}.har-vcard.applied{opacity:.5}.har-vcard.blacklisted{opacity:.3}.har-vhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}.har-vtitle{font-weight:600;color:#2964FF;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.har-vtitle:hover{text-decoration:underline}.har-score{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap}.sc-high{background:#dcfce7;color:#166534}.sc-medium{background:#fef9c3;color:#854d0e}.sc-low{background:#fee2e2;color:#991b1b}.har-vmeta{display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px}.har-vsalary{color:#1a1a1a;font-weight:500}.har-vfoot{display:flex;align-items:center;justify-content:space-between}.har-vfoot>span:first-child{font-size:11px;color:#94a3b8}.har-btn-apply{padding:4px 12px;background:#2964FF;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer}.har-btn-apply:hover{background:#1d4ed8}.har-badge{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600}.ba{background:#dbeafe;color:#1d4ed8}.bb{background:#fee2e2;color:#991b1b}.har-empty{padding:24px 20px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6}';
}

function getSidebarHTML() {
  return '<div class="har-header"><h3>HH Auto-Respond</h3><span class="har-version">v1.0</span></div><div class="har-content"><div class="har-auth-box"><div class="har-spinner"></div><h3>Проверяем авторизацию...</h3><p>Определяем статус на hh.ru</p></div></div>';
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function scoreClass(s) { return s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low'; }

// PUBLIC API for main.js
function updateVacancies(vacancies) {
  panelState.vacancies = (vacancies || []).filter(v => v && v.id && v.title);
  renderVacancyList();
}
function updateStats(stats) {
  Object.assign(panelState.stats, stats);
  renderStatsValues();
}
function setStatus(status) {
  panelState.status = status;
  const dot = shadowRoot?.querySelector('.har-dot');
  if (dot) dot.className = 'har-dot har-dot-' + status;
}
function createPanel() {
  createFab(); createSidebar();
  setTimeout(updateAuthState, 1500);
  setInterval(updateAuthState, 5000);
}

// ═══════════════════════════════════════════════
// CONTENT: AUTO-RESPOND (placeholder)
// ═══════════════════════════════════════════════

const autoLog = createLogger('AutoRespond');

async function applyToVacancy(vacancyId) {
  autoLog.info('Apply to vacancy: ' + vacancyId);
  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) { autoLog.warn(rateCheck.reason); return { success: false, reason: rateCheck.reason }; }
  if (await isAlreadyApplied(vacancyId)) return { success: false, reason: 'Already applied' };
  const limitCheck = await incrementApplied();
  if (!limitCheck.allowed) return { success: false, reason: 'Daily limit' };

  // Navigate to vacancy page
  const url = 'https://hh.ru/vacancy/' + vacancyId;
  await chrome.storage.local.set({ pendingApply: { vacancyId, timestamp: Date.now() } });
  window.location.href = url;
  return { success: false, reason: 'Navigating (page reload expected)' };
}

async function continueApply(pending) {
  autoLog.info('Continue apply on vacancy page');
  // Will be implemented: click reply, fill letter, submit
  // For now just verify and mark
  await markAsApplied(pending.vacancyId);
  return { success: true };
}

async function applyToAll(vacancies, minScore) {
  minScore = minScore || 60;
  const eligible = vacancies.filter(v => v.status === 'new' && v.hasReply)
    .filter(v => v.matchScore === null || v.matchScore >= minScore)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  autoLog.info('Auto-apply ' + eligible.length + ' vacancies (score >= ' + minScore + ')');
  for (const v of eligible) {
    const rc = await rateLimiter.check();
    if (!rc.allowed) break;
    await applyToVacancy(v.id);
    await randomDelay();
  }
}

// ═══════════════════════════════════════════════
// MAIN: BOOT
// ═══════════════════════════════════════════════

const mainLog = createLogger('Main');
let pageInitialized = false;

async function init() {
  mainLog.info('Loaded: ' + window.location.href);
  await checkDailyReset();
  createPanel();

  // Auth poll
  pollAuth();

  // Events
  window.addEventListener('hh-ar-apply', async (e) => {
    if (!panelState.isLoggedIn) return;
    await applyToVacancy(e.detail.vacancyId);
  });
  window.addEventListener('hh-ar-apply-all', async () => {
    if (!panelState.isLoggedIn) return;
    await applyToAll(panelState.vacancies);
  });
  window.addEventListener('hh-ar-refresh', async () => {
    if (!panelState.isLoggedIn) return;
    const v = await parseVacanciesFromPage();
    updateVacancies(v);
  });
}

function pollAuth() {
  if (checkAuth()) {
    mainLog.info('User logged in');
    if (!pageInitialized) {
      pageInitialized = true;
      updateAuthState();
      initPageLogic();
    }
    return;
  }
  setTimeout(pollAuth, 2000);
}

async function initPageLogic() {
  const path = window.location.pathname;
  mainLog.info('Page: ' + path);

  if (path.startsWith('/search/vacancy')) {
    const vacancies = await parseVacanciesFromPage();
    updateVacancies(vacancies);
    const stats = await getStats();
    updateStats(stats);

    // SPA observer
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const fresh = await parseVacanciesFromPage();
        updateVacancies(fresh);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    mainLog.info('SPA observer active');

  } else if (/^\/vacancy\/\d+/.test(path)) {
    const { pendingApply } = await chrome.storage.local.get('pendingApply');
    if (pendingApply?.vacancyId) {
      const age = Date.now() - (pendingApply.timestamp || 0);
      if (age < 120000) {
        await chrome.storage.local.remove('pendingApply');
        await continueApply(pendingApply);
      } else {
        await chrome.storage.local.remove('pendingApply');
      }
    }
  }
}

// BOOT
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
