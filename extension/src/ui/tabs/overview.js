/**
 * UI: TABS -- OVERVIEW
 * =====================
 * Renders overview tab content: KPI values, rate limits, activity timeline.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';

export function renderOverviewKPI() {
  const s = panelState.stats;
  const applied = s.appliedToday || 0;
  const limit = panelState.settings.dailyLimit || 200;
  const hourly = s.hourlyApplied || 0;
  const hourlyLimit = panelState.settings.hourlyLimit || 30;
  const el = (id) => refs.shadowRoot?.getElementById(id);
  if (!el) return;

  const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

  set('kpi-daily-count', applied);
  set('kpi-hourly-count', hourly);
  set('kpi-applied-count', applied);
  set('kpi-invitations-count', panelState.dailyStats.invitations || 0);
  set('rl-429-count', panelState.dailyStats.errors429 || 0);

  /* Update KPI ring SVG aria-label for screen readers */
  const kpiSvg = refs.shadowRoot?.querySelector('.kpi-ring-fill')?.closest('svg');
  if (kpiSvg) kpiSvg.setAttribute('aria-label', `Дневной лимит: ${applied} из ${limit}`);

  const hourlyBar = el('kpi-hourly-bar')?.querySelector('.fill');
  if (hourlyBar) hourlyBar.style.width = Math.min(100, (hourly / hourlyLimit) * 100) + '%';
}

export function addTimelineEvent(type, text, detail) {
  const list = refs.shadowRoot?.getElementById('tl-activity-list');
  if (!list) return;
  const colors = {
    apply: '#059669',
    invitation: '#2563EB',
    captcha: '#D97706',
    error: '#DC2626',
    info: '#71717a',
    resume: '#7C3AED',
    parsing: '#059669',
    reset: '#71717a',
  };
  const labels = {
    apply: 'ОТКЛИК',
    invitation: 'ПРИГЛАШЕНИЕ',
    captcha: 'CAPTCHA',
    error: 'ОШИБКА',
    info: 'ИНФО',
    resume: 'РЕЗЮМЕ',
    parsing: 'ПАРСИНГ',
    reset: 'СБРОС',
  };
  const color = colors[type] || '#71717a';
  const label = labels[type] || 'СОБЫТИЕ';
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry = document.createElement('div');
  entry.className = 'tl-item';
  entry.innerHTML = `<div class="tl-dot" style="background:${color};"></div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;">
      <span style="font-size:11px;"><b style="color:${color};">[${label}]</b> ${esc(text)}</span>
      <span style="font-size:11px;color:#52525b;flex-shrink:0;margin-left:8px;">${time}</span>
    </div>
    ${detail ? `<div style="font-size:11px;color:#52525b;margin-top:1px;">${esc(detail)}</div>` : ''}`;

  const placeholder = list.querySelector('div[style*="text-align:center"]');
  if (placeholder) list.innerHTML = '';
  list.prepend(entry);

  const count = list.querySelectorAll('.tl-item').length;
  const countEl = refs.shadowRoot?.getElementById('tl-event-count');
  if (countEl) countEl.textContent = count + ' ' + declension(count, ['событие', 'события', 'событий']);
}

function declension(n, forms) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
