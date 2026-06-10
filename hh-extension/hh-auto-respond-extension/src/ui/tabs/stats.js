/**
 * UI: TABS — STATS
 * ===================
 * Renders statistics tab: KPIs, weekly chart, funnel, logs.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function renderStats() {
  renderKPIs();
  renderWeeklyChart();
  renderFunnel();
  renderLog();
}

function renderKPIs() {
  const s = panelState.stats;
  const el = (id) => refs.shadowRoot?.getElementById(id);
  const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

  const total = s.totalApplied || 0;
  const inv = panelState.dailyStats.invitations || 0;
  set('stat-total', total);
  set('stat-invitations', inv);
  set('stat-conversion', total > 0 ? ((inv / total) * 100).toFixed(1) + '%' : '0%');
  set('stat-429', panelState.dailyStats.errors429 || 0);
}

function renderWeeklyChart() {
  const chart = refs.shadowRoot?.getElementById('stat-chart');
  if (!chart) return;

  const data = panelState.weeklyData || [30, 45, 25, 55, 60, 20, 10];
  const max = Math.max(...data, 1);

  chart.innerHTML = data.map((val, i) => {
    const pct = (val / max) * 100;
    const isWeekend = i >= 5;
    const grad = isWeekend
      ? 'linear-gradient(180deg,#047857,#059669)'
      : 'linear-gradient(180deg,#059669,#10B981)';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:100%;border-radius:4px;background:${grad};height:${Math.max(pct, 4)}%;transition:height 0.5s ease;"></div>
      <span style="font-size:11px;color:#71717a;">${DAYS[i]}</span>
    </div>`;
  }).join('');
}

function renderFunnel() {
  const container = refs.shadowRoot?.getElementById('stat-funnel');
  if (!container) return;

  const stages = [
    { label: 'Просмотрено', value: 342, color: '#3f3f46' },
    { label: 'Совпадение > 60%', value: 222, color: '#D97706' },
    { label: 'Отклики', value: 147, color: '#059669' },
    { label: 'Приглашения', value: 23, color: '#2563EB' },
    { label: 'Собеседования', value: 8, color: '#7C3AED' },
  ];
  const max = stages[0].value;

  container.innerHTML = stages.map(s => {
    const pct = (s.value / max) * 100;
    return `<div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:11px;color:#71717a;width:90px;flex-shrink:0;">${s.label}</span>
      <div class="progress-bar" style="flex:1;"><div class="fill" style="width:${Math.max(pct, 2)}%;background:${s.color};"></div></div>
      <span style="font-size:11px;font-weight:600;width:40px;text-align:right;">${s.value}</span>
    </div>`;
  }).join('');
}

export function addLogEntry(level, text) {
  const container = refs.shadowRoot?.getElementById('activity-log');
  if (!container) return;

  const colors = { success: '#059669', info: '#2563EB', warn: '#D97706', error: '#DC2626' };
  const labels = { success: 'ОК', info: 'ИНФО', warn: 'ВАРН', error: 'ОШИБКА' };
  const color = colors[level] || '#71717a';
  const label = labels[level] || level.toUpperCase();
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const placeholder = container.querySelector('div[style*="text-align:center"]');
  if (placeholder) container.innerHTML = '';

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.setAttribute('data-level', level);
  entry.innerHTML = `<div class="log-dot" style="background:${color};"></div>
    <div style="flex:1;">
      <div style="font-size:11px;"><b style="color:${color};">[${label}]</b> ${esc(text)}</div>
      <div style="font-size:11px;color:#71717a;">${time}</div>
    </div>`;
  container.prepend(entry);
}

function renderLog() {
  /* Logs are rendered incrementally via addLogEntry */
}

export function clearLog() {
  const container = refs.shadowRoot?.getElementById('activity-log');
  if (container) container.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Нет записей</div>';
}
