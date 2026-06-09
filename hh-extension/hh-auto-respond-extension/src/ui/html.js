/**
 * UI: SIDEBAR HTML TEMPLATES
 * =============================
 * HTML generators for the Shadow DOM sidebar.
 * 6 tabs: Overview, Resume, Vacancies, Negotiations, Settings, Stats.
 * Design: green accent (#059669), 720px panel, Inter font.
 */

/* HTML-escape helper */
export function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function scoreClass(s) {
  return s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low';
}

/* SVG icon snippets (reused across tabs) */
const ICONS = {
  briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
  chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  refresh: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>',
  rocket: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  search: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 2v4m0 12v4m-8-10H2m20 0h-2"/><circle cx="12" cy="12" r="4"/></svg>',
  mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  envelope: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
  ai: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0"/></svg>',
  clock: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  code: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  money: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  bubble: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
};

/* Initial sidebar shell: header with logo + auth spinner */
export function getSidebarHTML() {
  return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace('currentColor', '#fff').replace('width="16" height="16"', 'width="16" height="16"')}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50;display:inline-block;"></span>
            Проверяем авторизацию...
          </div>
        </div>
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="Закрыть панель"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${ICONS.close}
      </button>
    </div>
    <div class="har-content">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
        <div class="har-spinner"></div>
        <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">Проверяем авторизацию...</h3>
        <p style="font-size:13px;color:#71717a;line-height:1.5;">Определяем статус на hh.ru</p>
      </div>
    </div>
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`;
}

/* Full logged-in content with 6 tabs */
export function getLoggedInHTML(userName) {
  const name = (userName && userName !== 'Пользователь') ? esc(userName) : '';
  return `
    ${getHeaderHTML(name)}
    ${getTabBarHTML()}
    ${getOverviewSection()}
    ${getResumeSection()}
    ${getVacanciesSection()}
    ${getNegotiationsSection()}
    ${getSettingsSection()}
    ${getStatsSection()}
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`;
}

/* ---- HEADER ---- */
function getHeaderHTML(userName) {
  const name = userName ? esc(userName) : '';
  const badgeLabel = name ? name : 'Онлайн';
  return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace('currentColor', '#fff').replace('width="16" height="16"', 'width="16" height="16"')}
        </div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div id="header-auth-status" style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            ${name ? name : 'Авторизован'}
          </div>
        </div>
      </div>
      <div id="authIndicator" class="badge badge-green" style="cursor:pointer;" title="Нажмите для проверки авторизации">
        <span style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:4px;"></span>
        ${badgeLabel}
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="Закрыть панель"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${ICONS.close}
      </button>
    </div>`;
}

/* ---- TAB BAR (6 tabs) ---- */
function getTabBarHTML() {
  const tabs = [
    { id: 'overview', label: 'Обзор', icon: ICONS.briefcase },
    { id: 'resume', label: 'Резюме', icon: ICONS.file },
    { id: 'vacancies', label: 'Вакансии', icon: ICONS.folder },
    { id: 'negotiations', label: 'Переговоры', icon: ICONS.chat },
    { id: 'settings', label: 'Настройки', icon: ICONS.gear },
    { id: 'stats', label: 'Статистика', icon: ICONS.chart },
  ];
  return `<div class="har-tabbar">${tabs.map(t =>
    `<button class="tab-btn ${t.id === 'overview' ? 'active' : ''}" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`
  ).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 1: OVERVIEW
   ═══════════════════════════════════════════════════ */
function getOverviewSection() {
  return `<div class="tab-section active" id="tab-overview">
    ${overviewAuthCard()}
    ${overviewKPIHero()}
    ${overviewRateLimits()}
    ${overviewQuickActions()}
    ${overviewTimeline()}
  </div>`;
}

function overviewAuthCard() {
  return `<div class="card fade-in" style="margin-bottom:12px;border-left:3px solid #059669;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:12px;font-weight:600;">Авторизация HH.ru</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">Проверка через <code style="font-size:11px;background:#f4f4f5;padding:1px 4px;border-radius:3px;">[data-qa="mainmenu_applicant"]</code></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge badge-green" id="authBadge"><span class="pulse-dot" style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:3px;"></span> Авторизован</span>
        <button class="btn btn-outline btn-sm" data-action="check-auth">Проверить</button>
      </div>
    </div>
  </div>`;
}

function overviewKPIHero() {
  return `<div class="card fade-in" style="margin-bottom:12px;padding:18px;background:linear-gradient(135deg,rgba(5,150,105,0.03) 0%,rgba(16,185,129,0.05) 50%,rgba(37,99,235,0.03) 100%);border:1px solid rgba(5,150,105,0.1);">
    <div style="display:flex;gap:18px;align-items:stretch;">
      ${kpiRing()}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
        ${kpiHourly()}
        ${kpiApplied()}
        ${kpiInvitations()}
      </div>
    </div>
  </div>`;
}

function kpiRing() {
  return `<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
    <svg width="108" height="108" viewBox="0 0 120 120">
      <defs><linearGradient id="kpiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#34D399"/>
      </linearGradient></defs>
      <circle class="kpi-ring-bg" cx="60" cy="60" r="54"/>
      <circle class="kpi-ring-fill" cx="60" cy="60" r="54"/>
    </svg>
    <div style="position:absolute;top:50%;left:42px;transform:translateY(-50%);text-align:center;">
      <div id="kpi-daily-count" style="font-size:26px;font-weight:800;color:#18181b;line-height:1;">0</div>
      <div style="font-size:11px;color:#71717a;font-weight:500;">из 200</div>
    </div>
    <div style="font-size:11px;font-weight:600;color:#059669;margin-top:6px;letter-spacing:0.3px;">ДНЕВНОЙ ЛИМИТ</div>
  </div>`;
}

function kpiHourly() {
  return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.sun}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-hourly-count" style="font-size:18px;font-weight:700;color:#18181b;">0</span>
        <span style="font-size:12px;color:#71717a;">/30 час</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <div style="flex:1;height:4px;background:#f4f4f5;border-radius:2px;overflow:hidden;">
          <div id="kpi-hourly-bar" class="progress-bar" style="height:100%;"><div class="fill" style="width:0%;background:linear-gradient(90deg,#D97706,#F59E0B);"></div></div>
        </div>
        <span id="kpi-countdown" style="font-size:11px;color:#B45309;font-weight:600;white-space:nowrap;">--</span>
      </div>
    </div>
  </div>`;
}

function kpiApplied() {
  return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#D1FAE5,#A7F3D0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.mail}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-applied-count" style="font-size:18px;font-weight:700;color:#059669;">0</span>
        <span style="font-size:11px;color:#71717a;">откликов</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-applied-delta" style="color:#059669;font-weight:600;">+0</span> за последний час
      </div>
    </div>
  </div>`;
}

function kpiInvitations() {
  return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#DBEAFE,#BFDBFE);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.envelope}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-invitations-count" style="font-size:18px;font-weight:700;color:#2563EB;">0</span>
        <span style="font-size:11px;color:#71717a;">приглашений</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-inv-delta" style="color:#2563EB;font-weight:600;">+0</span> новых за сегодня
      </div>
    </div>
  </div>`;
}

function overviewRateLimits() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:600;">Скоринг и лимиты</span>
      <span class="badge badge-green" id="rl-status-badge">Норма</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">Мин. интервал</div>
        <div style="font-size:14px;font-weight:600;">30 сек</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">Burst detection</div>
        <div style="font-size:14px;font-weight:600;color:#059669;">Выкл</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">429 ошибок</div>
        <div id="rl-429-count" style="font-size:14px;font-weight:600;">0</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">CAPTCHA</div>
        <div id="rl-captcha-status" style="font-size:14px;font-weight:600;color:#059669;">Не обнаружена</div>
      </div>
    </div>
  </div>`;
}

function overviewQuickActions() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Быстрые действия</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" data-action="apply-all">${ICONS.rocket} Массовый отклик</button>
      <button class="btn btn-outline" data-tab-switch="vacancies">${ICONS.check} Парсинг вакансий</button>
      <button class="btn btn-outline" data-tab-switch="resume">${ICONS.file} Парсинг резюме</button>
      <button class="btn btn-outline" data-action="reset-daily">${ICONS.refresh} Сброс дневных</button>
    </div>
  </div>`;
}

function overviewTimeline() {
  return `<div class="card fade-in">
    <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="activity">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:12px;font-weight:600;">Последняя активность</div>
        <div style="display:flex;gap:-4px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#059669;border:2px solid #fff;margin-left:-3px;position:relative;z-index:3;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid #fff;margin-left:-3px;position:relative;z-index:2;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#D97706;border:2px solid #fff;margin-left:-3px;position:relative;z-index:1;"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="tl-event-count" style="font-size:11px;color:#71717a;">0 событий</span>
        ${ICONS.chevronDown}
      </div>
    </div>
    <div class="timeline-body" id="tl-activity-body" style="margin-top:4px;">
      <div id="tl-activity-list">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Нет событий</div>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 2: RESUME
   ═══════════════════════════════════════════════════ */
function getResumeSection() {
  return `<div class="tab-section" id="tab-resume">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div id="res-title" style="font-size:13px;font-weight:600;">Резюме не загружено</div>
            <div id="res-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">Нажмите "Загрузить" для парсинга</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">не спарсено</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Данные появятся после парсинга</div>
        </div>
        <div style="padding-top:12px;padding-left:24px;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            ${ICONS.refresh} Загрузить с текущей страницы
          </button>
        </div>
      </div>
    </div>
    <div id="res-skills-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">Навыки из резюме</span>
        <span class="badge badge-zinc" id="res-skills-count">0 навыков</span>
      </div>
      <div id="res-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>
    <div id="res-gap-section" class="card fade-in" style="display:none;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Анализ навыков</div>
      <div id="res-gap-content" style="font-size:11px;color:#71717a;">Анализ доступен после парсинга вакансий</div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 3: VACANCIES
   ═══════════════════════════════════════════════════ */
function getVacanciesSection() {
  return `<div class="tab-section" id="tab-vacancies">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">Парсинг вакансий</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">Извлечение со страницы поиска hh.ru</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="refresh">${ICONS.check} Спарсить</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Найдено</div>
          <div id="vac-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Match > 70%</div>
          <div id="vac-high-match" style="font-size:16px;font-weight:700;color:#059669;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Чёрный список</div>
          <div id="vac-blacklisted" style="font-size:16px;font-weight:700;color:#DC2626;">0</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="vac-search" placeholder="Поиск по названию..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <select id="vac-status-filter" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
          <option value="all">Все</option>
          <option value="new">New</option>
          <option value="applied">Откликнуто</option>
          <option value="blacklisted">Blacklist</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#71717a;white-space:nowrap;">Min score:</span>
        <input type="range" id="vac-score-range" min="0" max="100" value="0" style="flex:1;">
        <span id="vac-score-label" style="font-size:11px;font-weight:600;color:#71717a;min-width:32px;text-align:right;">0%</span>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;">Массовый отклик</div>
        <span id="mass-status" class="badge badge-zinc">Остановлен</span>
      </div>
      <div id="mass-progress" style="display:none;margin-bottom:10px;">
        <div class="progress-bar"><div id="mass-fill" class="fill fill-green" style="width:0%;"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span id="mass-count" style="font-size:11px;color:#71717a;">0 / 20</span>
          <span id="mass-eta" style="font-size:11px;color:#71717a;">ETA: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">Откликнуться на все</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>Пауза</button>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Вакансии на странице</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">Загрузка...</div></div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 4: NEGOTIATIONS
   ═══════════════════════════════════════════════════ */
function getNegotiationsSection() {
  return `<div class="tab-section" id="tab-negotiations">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">Переговоры</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">Отслеживание сообщений с работодателями</div>
        </div>
        <span id="neg-count-badge" class="badge badge-blue">0 активных</span>
      </div>
      <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
        <div style="padding:24px;text-align:center;font-size:11px;color:#71717a;">Переговоры пока не загружены</div>
      </div>
    </div>
    <div id="neg-chat-area" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;flex-direction:column;max-height:340px;">
        <div id="neg-chat-header" style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;flex-shrink:0;"></div>
        <div id="neg-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:10px;"></div>
        <div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <input type="text" id="neg-chat-input" placeholder="Сообщение..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
          <button class="btn btn-primary" style="padding:8px 12px;">${ICONS.send}</button>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">Шаблоны и ввод</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">сопроводительное</span>
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">эмуляция набора</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:500;">Эмуляция набора</div>
              <div style="font-size:11px;color:#71717a;">Посимвольный ввод (антибот)</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <input type="number" value="80" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
              <span style="font-size:11px;color:#71717a;">мс</span>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label style="font-size:11px;font-weight:500;">Шаблон сопроводительного</label>
              <span style="font-size:11px;color:#71717a;">{position} {experience} {skills}</span>
            </div>
            <textarea id="cover-letter-text" style="width:100%;height:64px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">Здравствуйте! Меня заинтересовала вакансия {position}. У меня {experience} опыта в {skills}. Готов обсудить детали на интервью.</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 5: SETTINGS
   ═══════════════════════════════════════════════════ */
function getSettingsSection() {
  return `<div class="tab-section" id="tab-settings">
    ${settingsRateLimits()}
    ${settingsCaptcha()}
    ${settingsBlacklist()}
    ${settingsDailyReset()}
    ${settingsGeneral()}
  </div>`;
}

function settingsRateLimits() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Лимиты и рейт-лимитинг</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingRow('Дневной лимит', 'Макс. откликов в день', 'number', 's-daily-limit', 200, '/ день')}
      ${settingRow('Часовой лимит', 'Макс. откликов в час', 'number', 's-hourly-limit', 30, '/ час')}
      ${settingRow('Мин. интервал', 'Между откликами', 'number', 's-min-interval', 30, 'сек')}
      ${settingToggle('Burst detection', 'Остановка при всплеске 429', 's-burst', true)}
      ${settingToggle('Adaptive slowdown', 'Увеличение интервала при 429/CAPTCHA', 's-adaptive', true)}
    </div>
  </div>`;
}

function settingsCaptcha() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">CAPTCHA обработка</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle('Авто-пауза при CAPTCHA', 'Остановить отклики и уведомить', 's-captcha', true)}
      ${settingRow('Время паузы', 'Перед продолжением', 'number', 's-captcha-time', 5, 'мин')}
    </div>
  </div>`;
}

function settingsBlacklist() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">Чёрный список</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">Работодатели, которые будут пропущены</div>
      </div>
      <span id="bl-count-badge" class="badge badge-zinc">0 компаний</span>
    </div>
    <div id="bl-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="bl-input" placeholder="Название компании..." style="flex:1;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;">
      <button class="btn btn-outline btn-sm" data-action="bl-add">+ Добавить</button>
    </div>
  </div>`;
}

function settingsDailyReset() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Ежедневный сброс</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">Авто-сброс счётчиков</div>
          <div style="font-size:11px;color:#71717a;">Время сброса (chrome.alarms)</div>
        </div>
        <input type="time" id="s-reset-time" value="00:00" style="padding:4px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">Следующий сброс</div>
          <div style="font-size:11px;color:#71717a;">Через chrome.alarms API</div>
        </div>
        <span id="s-reset-countdown" style="font-size:11px;font-weight:600;color:#71717a;">--</span>
      </div>
      <button class="btn btn-outline" style="align-self:flex-start;" data-action="reset-daily">${ICONS.refresh} Сбросить сейчас</button>
    </div>
  </div>`;
}

function settingsGeneral() {
  return `<div class="card fade-in">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Общие настройки</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle('Авто-проверка авторизации', '', 's-auth-check', true)}
      ${settingToggle('Уведомления', '', 's-notifications', true)}
      ${settingToggle('Логирование действий', '', 's-logging', true)}
      ${settingToggle('Shadow DOM изоляция', '', 's-shadow-dom', true)}
    </div>
  </div>`;
}

/* Helper: setting row (input with label) */
function settingRow(label, hint, type, id, value, suffix) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${type}" id="${id}" value="${value}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:11px;color:#71717a;">${suffix}</span>
    </div>
  </div>`;
}

/* Helper: setting toggle row */
function settingToggle(label, hint, id, checked) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ''}
    </div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="slider"></span></label>
  </div>`;
}

/* ═══════════════════════════════════════════════════
   TAB 6: STATISTICS & LOGS
   ═══════════════════════════════════════════════════ */
function getStatsSection() {
  return `<div class="tab-section" id="tab-stats">
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button class="btn btn-sm btn-primary stats-period-btn active" data-period="today">Сегодня</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="week">Неделя</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="month">Месяц</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="all">Всё время</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Всего откликов</div>
        <div id="stat-total" style="font-size:22px;font-weight:700;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Приглашений</div>
        <div id="stat-invitations" style="font-size:22px;font-weight:700;color:#2563EB;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Конверсия</div>
        <div id="stat-conversion" style="font-size:22px;font-weight:700;color:#059669;">0%</div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:12px;">Динамика за неделю</div>
      <div id="stat-chart" style="display:flex;align-items:flex-end;gap:6px;height:100px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Воронка конверсии</div>
      <div id="stat-funnel" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Статистика лимитов</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">429 ошибок (всего)</div>
          <div id="stat-429" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">CAPTCHA (всего)</div>
          <div id="stat-captcha" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Adaptive slowdowns</div>
          <div id="stat-slowdowns" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Ср. интервал</div>
          <div id="stat-avg-interval" style="font-size:16px;font-weight:700;">--</div>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">Лог действий</span>
        <button class="btn btn-outline btn-sm" data-action="clear-log">Очистить</button>
      </div>
      <div id="activity-log">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Нет записей</div>
      </div>
    </div>
  </div>`;
}
