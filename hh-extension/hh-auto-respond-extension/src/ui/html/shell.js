/**
 * Shell: header, tab bar, and top-level layout
 */
import { ICONS } from './icons.js';
import { esc } from './helpers.js';
import { getOverviewSection } from './tabs/overview.js';
import { getResumeSection } from './tabs/resume.js';
import { getVacanciesSection } from './tabs/vacancies.js';
import { getNegotiationsSection } from './tabs/negotiations.js';
import { getSettingsSection } from './tabs/settings.js';
import { getStatsSection } from './tabs/stats.js';

/* Initial sidebar shell: header with logo + auth spinner */
export function getSidebarHTML() {
  return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace('currentColor', '#fff').replace('width="16" height="16"', 'width="16" height="16" aria-hidden="true"')}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div style="font-size:12px;color:#52525b;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            Проверяем авторизацию...
          </div>
        </div>
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="Закрыть панель"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#52525b;">
        ${ICONS.close}
      </button>
    </div>
    <div class="har-content">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
        <div class="har-spinner" role="status"><span class="sr-only">Загрузка...</span></div>
        <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">Проверяем авторизацию...</h3>
        <p style="font-size:13px;color:#52525b;line-height:1.5;">Определяем статус на hh.ru</p>
      </div>
    </div>
    <div class="har-footer">
      <span style="font-size:12px;color:#52525b;">HH Copilot v${process.env.VERSION}</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;" aria-hidden="true"></span>
        <span style="font-size:12px;color:#52525b;">локально</span>
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
      <span style="font-size:12px;color:#52525b;">HH Copilot v${process.env.VERSION}</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;" aria-hidden="true"></span>
        <span style="font-size:12px;color:#52525b;">локально</span>
      </div>
    </div>`;
}

/* ---- HEADER ---- */
function getHeaderHTML(userName) {
  const name = userName ? esc(userName) : '';
  const badgeLabel = name ? name : 'Онлайн';
  return `
    <div class="har-header" lang="ru">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace('currentColor', '#fff').replace('width="16" height="16"', 'width="16" height="16" aria-hidden="true"')}
        </div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div id="header-auth-status" style="font-size:12px;color:#52525b;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            ${name ? name : 'Авторизован'}
          </div>
        </div>
      </div>
      <div id="authIndicator" class="badge badge-green" style="cursor:pointer;" title="Нажмите для проверки авторизации" role="button" tabindex="0" aria-label="Проверить авторизацию">
        <span style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:4px;" aria-hidden="true"></span>
        ${badgeLabel}
      </div>
      <button class="hh-tour-help" data-action="start-tour" title="Гид по расширению" aria-label="Открыть гид по расширению">?</button>
      <button class="har-close-btn" data-action="close-panel" aria-label="Закрыть панель"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#52525b;">
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
  return `<div class="har-tabbar" role="tablist" aria-label="Основные разделы">${tabs.map((t, _i) =>
    `<button class="tab-btn ${t.id === 'overview' ? 'active' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === 'overview'}" aria-controls="tab-${t.id}" id="tabbtn-${t.id}" tabindex="${t.id === 'overview' ? 0 : -1}">${t.icon}<span>${t.label}</span></button>`
  ).join('')}</div>`;
}
