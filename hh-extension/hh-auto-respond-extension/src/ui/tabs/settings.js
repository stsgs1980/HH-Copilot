/**
 * UI: TABS — SETTINGS
 * =======================
 * Renders settings tab: read/write settings, blacklist management.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';

export function renderBlacklist() {
  const list = refs.shadowRoot?.getElementById('bl-list');
  const badge = refs.shadowRoot?.getElementById('bl-count-badge');
  if (!list) return;

  const bl = panelState.blacklist || [];
  if (badge) badge.textContent = bl.length + ' ' + declension(bl.length, ['компания', 'компании', 'компаний']);

  if (bl.length === 0) {
    list.innerHTML = '<div style="padding:8px;text-align:center;font-size:11px;color:#52525b;">Чёрный список пуст</div>';
    return;
  }

  list.innerHTML = bl.map(name =>
    `<div class="bl-item" data-bl-name="${esc(name)}">
      <span style="font-size:12px;">${esc(name)}</span>
      <button class="btn-bl-del" data-bl-remove="${esc(name)}" aria-label="Удалить ${esc(name)} из чёрного списка">Удалить</button>
    </div>`
  ).join('');
}

export function renderSettingsValues() {
  const el = (id) => refs.shadowRoot?.getElementById(id);
  if (!el) return;

  const set = (id, val) => { const e = el(id); if (e) e.value = val; };
  const chk = (id, val) => { const e = el(id); if (e) e.checked = val; };

  set('s-daily-limit', panelState.settings.dailyLimit);
  set('s-hourly-limit', panelState.settings.hourlyLimit);
  set('s-min-interval', panelState.settings.minInterval);
  set('s-captcha-time', panelState.settings.captchaPauseTime);
  set('s-reset-time', panelState.settings.dailyResetTime);
  chk('s-burst', panelState.settings.burstDetection);
  chk('s-adaptive', panelState.settings.adaptiveSlowdown);
  chk('s-captcha', panelState.settings.captchaAutoPause);
  chk('s-auth-check', panelState.settings.autoAuthCheck);
  chk('s-notifications', panelState.settings.notifications);
  chk('s-logging', panelState.settings.logging);
  chk('s-shadow-dom', panelState.settings.shadowDOM);
}

function declension(n, forms) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
