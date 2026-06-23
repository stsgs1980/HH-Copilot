/**
 * UI: NEGOTIATIONS LIST ITEM (F4.1)
 * ==================================
 * Renders a single negotiations-list row HTML. Extracted from
 * negotiations.js to keep that file under the AHG HARD limit (250 lines).
 *
 * Row structure:
 *   [unread dot?] vacancyTitle [statusBadge] [tabBadge] [alsoIn]
 *   company [· rawDate?]
 *   previewContent [· relativeTime?]      <-- NEW in F4.1
 *
 * Preview resolution (variant 3 hybrid):
 *   - statusText present  -> render it in normal muted color
 *   - statusText falsy    -> render "(нет сообщений)" in grey + italic
 *   - (F4.5 future: c.lastMessage takes precedence over statusText)
 *
 * Unread: red dot (no number) when status is 'not-viewed' or 'invite'.
 * Accessibility: dot carries aria-label + title.
 */

import { esc } from '../html.js';
import { STATUS_CONFIG } from './negotiations-summary.js';
import { formatRelativeTime } from './negotiations-format.js';

/** Inline styles shared with the rest of the negotiations UI (inline-style convention). */
const PREVIEW_STYLE_NORMAL =
  'font-size:11px;color:#71717A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
const PREVIEW_STYLE_EMPTY =
  'font-size:11px;color:#a1a1aa;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

/**
 * Build the HTML for a single conversation list row.
 * @param {Object} c - parsed negotiation object (from panelState.negotiations)
 * @returns {string} HTML string
 */
export function renderNegotiationItem(c) {
  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.unknown;

  // -- Unread dot (no number) --
  const isUnread = c.status === 'not-viewed' || c.status === 'invite';
  const unreadDot = isUnread
    ? '<span class="neg-unread-dot" role="img" aria-label="Есть непрочитанные" '
      + 'title="Непросмотрено" '
      + 'style="display:inline-block;width:8px;height:8px;border-radius:50%;'
      + 'background:#DC2626;flex-shrink:0;margin-top:5px;"></span>'
    : '';

  // -- Badges (status, tabOrigin, alsoIn) --
  const statusBadge = '<span style="display:inline-block;font-size:10px;padding:1px 6px;'
    + 'border-radius:4px;background:' + cfg.bg + ';color:' + cfg.fg + ';'
    + 'border:1px solid ' + cfg.border + ';">' + esc(cfg.label) + '</span>';
  const tabBadge = c.tabOrigin && c.tabOrigin !== 'all'
    ? '<span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:3px;'
      + 'background:#F1F5F9;color:#64748B;" title="Источник: ' + esc(c.tabOrigin) + '">'
      + esc(c.tabOrigin) + '</span>'
    : '';
  const alsoIn = c.alsoIn && c.alsoIn.length > 0
    ? '<span style="font-size:9px;color:#94A3B8;" title="Также в: '
      + esc(c.alsoIn.join(', ')) + '">[also in: ' + esc(c.alsoIn.join(',')) + ']</span>'
    : '';

  // -- Vacancy title (link or plain) --
  const vacLink = c.vacancyUrl
    ? '<a href="' + esc(c.vacancyUrl) + '" target="_blank" rel="noopener" '
      + 'style="font-size:12px;font-weight:600;color:#050;'
      + 'font-family:Inter,system-ui,sans-serif;text-decoration:none;" '
      + 'data-action="navigate">' + esc(c.vacancyTitle || c.name) + '</a>'
    : '<span style="font-size:12px;font-weight:600;">'
      + esc(c.vacancyTitle || c.name) + '</span>';

  // -- Preview line (F4.1) --
  const hasStatusText =
    c.statusText !== undefined && c.statusText !== null && c.statusText !== '';
  const previewText = hasStatusText ? c.statusText : '(нет сообщений)';
  const previewStyle = hasStatusText ? PREVIEW_STYLE_NORMAL : PREVIEW_STYLE_EMPTY;

  // -- Relative timestamp (omitted entirely when '') --
  const relTime = formatRelativeTime(c.date);
  const tsSpan = relTime
    ? '<span style="color:#a1a1aa;">·</span><span style="font-size:11px;color:#a1a1aa;">'
      + esc(relTime) + '</span>'
    : '';

  // -- Raw application date (kept on the company row, as before) --
  const rawDate = c.date
    ? '<span style="color:#a1a1aa;">·</span><span>' + esc(c.date) + '</span>'
    : '';

  return '<div class="conv-item" data-conv-id="' + esc(c.id) + '" tabindex="0" role="button" '
    + 'style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;'
    + 'cursor:pointer;border:1px solid #f4f4f5;margin-bottom:4px;">'
    + unreadDot
    + '<div style="flex:1;min-width:0;">'
    + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
    + vacLink + statusBadge + tabBadge + alsoIn
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px;color:#52525b;">'
    + '<span>' + esc(c.company || '') + '</span>' + rawDate
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;justify-content:space-between;">'
    + '<span style="flex:1;min-width:0;' + previewStyle + '">' + esc(previewText) + '</span>'
    + '<span style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' + tsSpan + '</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}
