/**
 * UI: TABS -- NEGOTIATIONS
 * ==========================
 * Renders negotiations tab: conversation list, chat messages, AI hints.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';

const CONV_COLORS = ['#D1FAE5,#065F46', '#DBEAFE,#1E40AF', '#FFFBEB,#B45309', '#F3E8FF,#7C3AED', '#FCE7F3,#DB2777'];

export function renderNegotiationList() {
  const list = refs.shadowRoot?.getElementById('neg-list');
  const badge = refs.shadowRoot?.getElementById('neg-count-badge');
  if (!list) return;

  const convs = panelState.negotiations || [];
  if (badge) badge.textContent = convs.length + ' ' + (convs.length === 1 ? 'активный' : 'активных');

  if (convs.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">Переговоры пока не загружены</div>';
    return;
  }

  list.innerHTML = convs.map((c, i) => {
    const [bg, fg] = CONV_COLORS[i % CONV_COLORS.length].split(',');
    const initials = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const isActive = panelState.activeConversation === c.id;
    return `<div class="conv-item ${isActive ? 'active' : ''}" data-conv-id="${esc(c.id)}" tabindex="0" role="button"
      style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;${isActive ? 'background:#ECFDF5;' : ''}">
      <div style="width:36px;height:36px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${fg};flex-shrink:0;">${esc(initials)}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;font-weight:600;">${esc(c.name)}</span>
          <span style="font-size:11px;color:#52525b;">${esc(c.time || '')}</span>
        </div>
        <div style="font-size:11px;color:#52525b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.preview || '')}</div>
      </div>
      ${c.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:#059669;flex-shrink:0;"></div>' : ''}
    </div>`;
  }).join('');
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
  const [bg, fg] = CONV_COLORS[0].split(',');
  const initials = conv.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  header.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${fg};">${esc(initials)}</div>
    <div>
      <div style="font-size:12px;font-weight:600;">${esc(conv.name)}</div>
      <div style="font-size:11px;color:#059669;">Онлайн</div>
    </div>`;

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
        <div style="font-size:11px;font-weight:600;color:#059669;margin-bottom:3px;">${esc(conv.name)}</div>
        <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
      </div>
    </div>`;
  }).join('');
}
