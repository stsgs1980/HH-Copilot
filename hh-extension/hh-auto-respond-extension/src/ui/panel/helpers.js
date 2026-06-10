/**
 * UI: PANEL — Helpers
 * ======================
 * Blacklist management, conversation select, vacancy filtering.
 */

import { refs, panelState } from '../state.js';
import { renderBlacklist } from '../tabs/settings.js';
import { addLogEntry } from '../tabs/stats.js';
import { renderNegotiationList, renderChatMessages } from '../tabs/negotiations.js';

// ═══════════════════════════════════════════════
// BLACKLIST MANAGEMENT
// ═══════════════════════════════════════════════

export function addBlacklistItem() {
  const input = refs.shadowRoot?.getElementById('bl-input');
  if (!input || !input.value.trim()) return;
  const name = input.value.trim();
  if (!panelState.blacklist.includes(name)) {
    panelState.blacklist.push(name);
    input.value = '';
    renderBlacklist();
    addLogEntry('info', 'Добавлена компания в ЧС: ' + name);
  }
}

export function removeBlacklistItem(name) {
  panelState.blacklist = panelState.blacklist.filter(n => n !== name);
  renderBlacklist();
}

// ═══════════════════════════════════════════════
// CONVERSATION SELECT
// ═══════════════════════════════════════════════

export function selectConversation(convId) {
  panelState.activeConversation = convId;
  renderNegotiationList();
  renderChatMessages();
}

// ═══════════════════════════════════════════════
// VACANCY FILTERING (client-side)
// ═══════════════════════════════════════════════

export function filterVacancies() {
  const search = (refs.shadowRoot?.getElementById('vac-search')?.value || '').toLowerCase();
  const status = refs.shadowRoot?.getElementById('vac-status-filter')?.value || 'all';
  const minScore = parseInt(refs.shadowRoot?.getElementById('vac-score-range')?.value || '0', 10);

  const items = refs.shadowRoot?.querySelectorAll('#har-vlist .vacancy-item');
  let visible = 0;
  items.forEach(item => {
    const title = (item.dataset.title || '').toLowerCase();
    const itemStatus = item.dataset.status || 'new';
    const itemScore = parseInt(item.dataset.score || '0', 10);
    const matchTitle = !search || title.includes(search);
    const matchStatus = status === 'all' || itemStatus === status;
    const matchScore = itemScore >= minScore;
    item.style.display = (matchTitle && matchStatus && matchScore) ? '' : 'none';
    if (matchTitle && matchStatus && matchScore) visible++;
  });
}
