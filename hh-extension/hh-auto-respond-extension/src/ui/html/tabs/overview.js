/**
 * TAB 1: OVERVIEW
 */
import { ICONS } from '../icons.js';

export function getOverviewSection() {
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
        <button class="btn btn-sm" data-action="logout" style="background:#ef4444;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;">Выход</button>
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
        <div style="font-size:11px;color:#71717a;">Детекция всплесков</div>
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
      <button class="btn btn-outline" data-tab-switch="resume">${ICONS.file} Действующее резюме</button>
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
