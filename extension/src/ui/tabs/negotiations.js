/**
 * UI: TABS -- NEGOTIATIONS (F1.9 refactor)
 * =========================================
 * Renders negotiations tab with:
 *   - Status chips row (filter by status)
 *   - Tab-origin chips row (filter by hh.ru tab)
 *   - Refresh button (invalidates cache + refetches)
 *   - Per-item tabOrigin badge
 *   - Empty state when no items
 *   - Loading state during fetch
 *   - Error toast when partial failure
 *
 * v1.9.39.0: original
 * v1.9.43.0: F1.9 -- aggregator integration
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';
import {
  STATUS_CONFIG,
  computeStatusCounts,
  computeTabOriginCounts,
  formatSummaryText,
  renderStatusChip,
  renderTabOriginChip,
} from './negotiations-summary.js';
import {
  fetchAllNegotiations,
  invalidateNegotiationsCache,
  NEGOTIATION_TABS,
} from '../../parsers/negotiations-aggregator.js';
import { renderAiReplyArea } from './negotiations-ai-reply.js';
import { renderNegotiationItem } from './negotiations-item.js';

let activeStatusFilter = 'all';
let activeTabFilter = 'all';
let isFetching = false;

/** Set status filter and re-render. */
export function setNegotiationStatusFilter(status) {
  activeStatusFilter = status;
  renderNegotiationList();
}

/** Set tab origin filter and re-render. */
export function setNegotiationTabFilter(tab) {
  activeTabFilter = tab;
  renderNegotiationList();
}

/**
 * Refresh: invalidate cache, refetch all tabs, re-render.
 * Shows spinner during fetch, shows toast on error.
 */
export async function refreshNegotiations() {
  if (isFetching) return;
  isFetching = true;
  setRefreshButtonState(true);
  try {
    await invalidateNegotiationsCache();
    const result = await fetchAllNegotiations({ forceRefresh: true });
    panelState.negotiations = result.items || [];
    panelState.negotiationsMeta = {
      perTab: result.perTab,
      errors: result.errors,
      fetchedAt: result.fetchedAt,
      fromCache: result.fromCache,
    };
    renderNegotiationList();
    if (result.errors && result.errors.length > 0) {
      showErrorToast(result.errors.length + ' tab(s) failed: ' + result.errors.join('; '));
    }
  } catch (err) {
    showErrorToast('Refresh failed: ' + (err.message || String(err)));
  } finally {
    isFetching = false;
    setRefreshButtonState(false);
  }
}

function setRefreshButtonState(loading) {
  const btn = refs.shadowRoot?.getElementById('neg-refresh-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '...' : '[R]';
  btn.style.opacity = loading ? '0.5' : '1';
}

function showErrorToast(msg) {
  const toast = refs.shadowRoot?.getElementById('neg-error-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.background = '#FEF2F2';
  toast.style.color = '#DC2626';
  toast.style.border = '1px solid #FECACA';
  toast.style.padding = '6px 10px';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '11px';
  toast.style.marginBottom = '8px';
  clearTimeout(showErrorToast._t);
  showErrorToast._t = setTimeout(() => { toast.style.display = 'none'; }, 5000);
}

export function renderNegotiationList() {
  const sr = refs.shadowRoot;
  const list = sr?.getElementById('neg-list');
  const badge = sr?.getElementById('neg-count-badge');
  if (!list) return;

  const convs = panelState.negotiations || [];
  const meta = panelState.negotiationsMeta || {};

  const statusCounts = computeStatusCounts(convs);
  const tabCounts = computeTabOriginCounts(convs);

  if (badge) badge.textContent = formatSummaryText(statusCounts);

  if (convs.length === 0) {
    const emptyMsg = (meta.errors && meta.errors.length > 0)
      ? 'Не удалось загрузить отклики (' + meta.errors.length + ' ошибок)'
      : 'Откликов пока нет';
    list.innerHTML = '<div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">'
      + esc(emptyMsg) + '</div>';
    return;
  }

  // Filter by both status and tab origin
  const filtered = convs.filter(c => {
    if (!c) return false;
    if (activeStatusFilter !== 'all' && c.status !== activeStatusFilter) return false;
    if (activeTabFilter !== 'all' && c.tabOrigin !== activeTabFilter) return false;
    return true;
  });

  // Status chips row
  const statusChips = ['all', 'invite', 'not-viewed', 'viewed', 'discard']
    .map(s => {
      const count = s === 'all' ? statusCounts.all : (statusCounts[s] || 0);
      if (s !== 'all' && count === 0) return '';
      return renderStatusChip(s, count, activeStatusFilter === s);
    })
    .join('');

  // Tab-origin chips row (only show tabs with >0 items, or all if none)
  const tabChips = NEGOTIATION_TABS
    .filter(t => t.id === 'all' || (tabCounts[t.id] || 0) > 0)
    .map(t => renderTabOriginChip(t.id, tabCounts[t.id] || 0, activeTabFilter === t.id))
    .join('');

  const refreshBtn = '<button id="neg-refresh-btn" class="btn btn-outline btn-sm" '
    + 'style="font-size:11px;padding:2px 8px;cursor:pointer;" title="Обновить">[R]</button>';
  const errorToast = '<div id="neg-error-toast" style="display:none;"></div>';

  const filterRow = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;align-items:center;">${statusChips}${refreshBtn}</div>`
    + (tabChips ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">${tabChips}</div>` : '')
    + errorToast;

  // Items -- row rendering delegated to renderNegotiationItem (F4.1: preview +
  // relative timestamp + unread dot; extracted to keep this file under AHG 250).
  const items = filtered.map(c => renderNegotiationItem(c)).join('');

  const emptyFilter = filtered.length === 0
    ? '<div style="padding:16px;text-align:center;font-size:11px;color:#52525b;">Нет откликов с такими фильтрами</div>'
    : '';

  list.innerHTML = filterRow + items + emptyFilter;
}

export function renderChatMessages() {
  const area = refs.shadowRoot?.getElementById('neg-chat-area');
  const header = refs.shadowRoot?.getElementById('neg-chat-header');
  const messages = refs.shadowRoot?.getElementById('neg-chat-messages');
  if (!area || !header || !messages) return;

  const conv = panelState.negotiations.find(c => c.id === panelState.activeConversation);
  if (!conv) {
    area.style.display = 'none';
    return;
  }

  area.style.display = '';
  const cfg = STATUS_CONFIG[conv.status] || STATUS_CONFIG.unknown;

  header.innerHTML = `
    <div>
      <div style="font-size:12px;font-weight:600;">${esc(conv.vacancyTitle || conv.name)}</div>
      <div style="font-size:11px;color:#52525b;">${esc(conv.company || '')}</div>
    </div>
    <span style="margin-left:auto;display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:${cfg.bg};color:${cfg.fg};border:1px solid ${cfg.border};">${esc(cfg.label)}</span>`;

  messages.innerHTML = (conv.messages || []).map(m => {
    if (m.from === 'user') {
      return `<div style="align-self:flex-end;max-width:85%;">
        <div style="background:#059669;color:#fff;border-radius:12px;border-top-right-radius:4px;padding:8px 12px;">
          <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
        </div>
      </div>`;
    }
    return `<div style="align-self:flex-start;max-width:85%;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;border-top-left-radius:4px;padding:8px 12px;">
        <div style="font-size:11px;font-weight:600;color:#059669;margin-bottom:3px;">${esc(conv.company || conv.name)}</div>
        <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
      </div>
    </div>`;
  }).join('');

  // F4.3: render AI reply area (tone select + generate button + variants)
  renderAiReplyArea();
}
