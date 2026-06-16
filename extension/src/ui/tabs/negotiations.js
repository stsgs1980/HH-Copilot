/**
 * UI: TABS -- NEGOTIATIONS
 * ==========================
 * Renders negotiations tab: conversation list with status badges.
 * v1.9.39.0: Real data from /applicant/negotiations parser.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';

/** Status badge config: color + label */
const STATUS_CONFIG = {
  'invite':     { bg: '#ECFDF5', fg: '#059669', border: '#A7F3D0', label: 'Приглашение' },
  'not-viewed': { bg: '#FFFBEB', fg: '#D97706', border: '#FDE68A', label: 'Не просмотрен' },
  'viewed':     { bg: '#EFF6FF', fg: '#2563EB', border: '#BFDBFE', label: 'Просмотрен' },
  'discard':    { bg: '#FEF2F2', fg: '#DC2626', border: '#FECACA', label: 'Отказ' },
  'unknown':    { bg: '#F4F4F5', fg: '#71717A', border: '#E4E4E7', label: 'Неизвестно' },
};

/** Active status filter — default 'all' */
let activeStatusFilter = 'all';

/** Set status filter and re-render. */
export function setNegotiationStatusFilter(status) {
  activeStatusFilter = status;
  renderNegotiationList();
}

export function renderNegotiationList() {
  const sr = refs.shadowRoot;
  const list = sr?.getElementById('neg-list');
  const badge = sr?.getElementById('neg-count-badge');
  if (!list) return;

  const convs = panelState.negotiations || [];

  // Update badge with count by status
  const counts = { all: convs.length, invite: 0, 'not-viewed': 0, viewed: 0, discard: 0 };
  convs.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });
  if (badge) badge.textContent = convs.length + ' ' + (convs.length === 1 ? 'отклик' : convs.length < 5 ? 'отклика' : 'откликов');

  if (convs.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">Переговоры пока не загружены</div>';
    return;
  }

  // Filter by active status
  const filtered = activeStatusFilter === 'all'
    ? convs
    : convs.filter(c => c.status === activeStatusFilter);

  // Build status filter pills
  const pills = ['all', 'invite', 'not-viewed', 'viewed', 'discard'].map(s => {
    const isActive = activeStatusFilter === s;
    const count = s === 'all' ? counts.all : (counts[s] || 0);
    const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.unknown;
    const label = s === 'all' ? 'Все' : cfg.label;
    // Skip pills with 0 count (except 'all')
    if (s !== 'all' && count === 0) return '';
    return `<button class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-sm neg-status-btn" data-status="${s}" style="font-size:10px;padding:2px 8px;">${esc(label)} ${count}</button>`;
  }).join('');

  const filterRow = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">${pills}</div>`;

  // Build items
  const items = filtered.map(c => {
    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.unknown;
    const statusBadge = `<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:${cfg.bg};color:${cfg.fg};border:1px solid ${cfg.border};">${esc(cfg.label)}</span>`;

    // Vacancy link (opens on hh.ru)
    const vacLink = c.vacancyUrl
      ? `<a href="${esc(c.vacancyUrl)}" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:#050;font-family:Inter,system-ui,sans-serif;text-decoration:none;" data-action="navigate">${esc(c.vacancyTitle || c.name)}</a>`
      : `<span style="font-size:12px;font-weight:600;">${esc(c.vacancyTitle || c.name)}</span>`;

    return `<div class="conv-item" data-conv-id="${esc(c.id)}" tabindex="0" role="button"
      style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid #f4f4f5;margin-bottom:4px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${vacLink}
          ${statusBadge}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px;color:#52525b;">
          <span>${esc(c.company || '')}</span>
          ${c.date ? '<span style="color:#a1a1aa;">·</span><span>' + esc(c.date) + '</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  const emptyFilter = filtered.length === 0
    ? '<div style="padding:16px;text-align:center;font-size:11px;color:#52525b;">Нет откликов с таким статусом</div>'
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
}
