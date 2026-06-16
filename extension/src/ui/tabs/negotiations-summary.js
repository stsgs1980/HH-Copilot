/**
 * UI: NEGOTIATIONS SUMMARY (F1.9)
 * =================================
 * Helper module: status chip counts + aggregator integration for
 * the negotiations tab. Keeps render code in negotiations.js thin.
 *
 * Provides:
 *   - computeStatusCounts(items) -> per-status breakdown
 *   - computeTabOriginCounts(items) -> per-tab breakdown
 *   - formatSummaryText(counts) -> human-readable "11 откликов: 3 viewed..."
 *   - TAB_ORIGIN_LABELS map
 *
 * v1.9.43.0 -- F1.9
 */

import { NEGOTIATION_TABS } from '../../parsers/negotiations-aggregator.js';

/** Russian labels for hh.ru tab origins. */
const TAB_ORIGIN_LABELS = Object.fromEntries(
  NEGOTIATION_TABS.map(t => [t.id, t.label])
);

/** Status -> {bg, fg, border, label} for badges. Shared with negotiations.js. */
export const STATUS_CONFIG = {
  'invite':     { bg: '#ECFDF5', fg: '#059669', border: '#A7F3D0', label: 'Приглашение' },
  'not-viewed': { bg: '#FFFBEB', fg: '#D97706', border: '#FDE68A', label: 'Не просмотрен' },
  'viewed':     { bg: '#EFF6FF', fg: '#2563EB', border: '#BFDBFE', label: 'Просмотрен' },
  'discard':    { bg: '#FEF2F2', fg: '#DC2626', border: '#FECACA', label: 'Отказ' },
  'unknown':    { bg: '#F4F4F5', fg: '#71717A', border: '#E4E4E7', label: 'Неизвестно' },
};

/** Tab origin -> badge color (subtle, so it does not compete with status). */
export const TAB_ORIGIN_CONFIG = {
  'all':      { bg: '#F8FAFC', fg: '#475569' },
  'invite':   { bg: '#ECFDF5', fg: '#059669' },
  'consider': { bg: '#EFF6FF', fg: '#2563EB' },
  'offer':    { bg: '#FDF4FF', fg: '#A855F7' },
  'wait':     { bg: '#FFFBEB', fg: '#D97706' },
  'discard':  { bg: '#FEF2F2', fg: '#DC2626' },
  'deleted':  { bg: '#F1F5F9', fg: '#64748B' },
  'archive':  { bg: '#F1F5F9', fg: '#64748B' },
};

/**
 * Compute status counts from items array.
 * Returns { all, invite, not-viewed, viewed, discard, unknown }.
 * @param {Array<Object>} items
 * @returns {Object}
 */
export function computeStatusCounts(items) {
  const counts = { all: 0, invite: 0, 'not-viewed': 0, viewed: 0, discard: 0, unknown: 0 };
  if (!items || !Array.isArray(items)) return counts;
  for (const item of items) {
    if (!item) continue;  // anti-ghost
    counts.all++;
    const s = item.status || 'unknown';
    if (counts[s] === undefined) counts.unknown++;
    else counts[s]++;
  }
  return counts;
}

/**
 * Compute tab origin counts from items array.
 * Returns { all: 0, invite: 0, ... } -- counts how many items came from
 * each hh.ru tab (by .tabOrigin field stamped by aggregator).
 * @param {Array<Object>} items
 * @returns {Object}
 */
export function computeTabOriginCounts(items) {
  const counts = {};
  for (const t of NEGOTIATION_TABS) counts[t.id] = 0;
  if (!items || !Array.isArray(items)) return counts;
  for (const item of items) {
    if (!item) continue;
    const tab = item.tabOrigin || 'all';
    if (counts[tab] === undefined) counts[tab] = 0;
    counts[tab]++;
  }
  return counts;
}

/**
 * Format summary text for tab header badge.
 * Example: "11 откликов · 3 viewed · 2 not-viewed"
 * @param {Object} counts - output of computeStatusCounts()
 * @returns {string}
 */
export function formatSummaryText(counts) {
  if (!counts || counts.all === 0) return 'Нет откликов';
  const forms = ['отклик', 'отклика', 'откликов'];
  const n = counts.all;
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  const form = (abs > 10 && abs < 20) ? forms[2]
    : (last > 1 && last < 5) ? forms[1]
    : (last === 1) ? forms[0]
    : forms[2];
  return n + ' ' + form;
}

/**
 * Render a single status chip HTML.
 * @param {string} status - 'all' | 'invite' | 'not-viewed' | 'viewed' | 'discard'
 * @param {number} count
 * @param {boolean} isActive
 * @returns {string} HTML
 */
export function renderStatusChip(status, count, isActive) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const label = status === 'all' ? 'Все' : cfg.label;
  const cls = isActive ? 'btn-primary' : 'btn-outline';
  const style = 'font-size:10px;padding:2px 8px;'
    + (isActive
      ? `background:${cfg.fg};color:#fff;border:1px solid ${cfg.fg};`
      : `background:${cfg.bg};color:${cfg.fg};border:1px solid ${cfg.border};`);
  return `<button class="btn ${cls} btn-sm neg-status-btn" data-status="${status}" style="${style}">${label} ${count}</button>`;
}

/**
 * Render a single tab-origin chip HTML.
 * @param {string} tabId
 * @param {number} count
 * @param {boolean} isActive
 * @returns {string} HTML
 */
export function renderTabOriginChip(tabId, count, isActive) {
  const cfg = TAB_ORIGIN_CONFIG[tabId] || TAB_ORIGIN_CONFIG.all;
  const label = TAB_ORIGIN_LABELS[tabId] || tabId;
  const style = 'font-size:10px;padding:2px 6px;border-radius:4px;'
    + (isActive
      ? `background:${cfg.fg};color:#fff;border:1px solid ${cfg.fg};`
      : `background:${cfg.bg};color:${cfg.fg};border:1px solid transparent;`);
  return `<button class="neg-tab-btn" data-tab-origin="${tabId}" style="${style}">${label} ${count}</button>`;
}

export { TAB_ORIGIN_LABELS };
