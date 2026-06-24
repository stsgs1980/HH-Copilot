/**
 * DOM Inspector -- visual layer (overlay + panel + buttons + toast + clipboard).
 * All SVG icons are inline Lucide-style to comply with UNICODE_POLICY v2.1 [C].
 *
 * v1.9.61.0
 */

import { buildCssPath, buildElementReport } from './dom-inspector-report.js';

const INSPECTOR_Z = 2147483000; // above everything except devtools

/** Lucide-style SVG icons (inline, no Unicode). */
const INSPECTOR_ICONS = {
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  clipboard: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  mapPin: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  refresh: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  close: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

/** Set style with !important. */
export function imp(el, prop, value) {
  el.style.setProperty(prop, value, 'important');
}

export { INSPECTOR_Z };

/** Create or return the overlay box. */
export function getOverlay(state) {
  if (state.overlayEl) return state.overlayEl;
  const ov = document.createElement('div');
  ov.id = 'hh-ar-inspector-overlay';
  imp(ov, 'position', 'fixed');
  imp(ov, 'pointer-events', 'none');
  imp(ov, 'z-index', String(INSPECTOR_Z));
  imp(ov, 'border', '2px solid #7c3aed');
  imp(ov, 'background', 'rgba(124,58,237,0.12)');
  imp(ov, 'border-radius', '4px');
  imp(ov, 'transition', 'all 0.05s linear');
  imp(ov, 'display', 'none');
  imp(ov, 'top', '0');
  imp(ov, 'left', '0');
  imp(ov, 'width', '0');
  imp(ov, 'height', '0');
  document.body.appendChild(ov);
  state.overlayEl = ov;
  return ov;
}

/** Position overlay over an element. */
export function positionOverlay(state, el) {
  const ov = getOverlay(state);
  const r = el.getBoundingClientRect();
  ov.style.setProperty('display', 'block', 'important');
  ov.style.setProperty('top', (r.top - 2) + 'px', 'important');
  ov.style.setProperty('left', (r.left - 2) + 'px', 'important');
  ov.style.setProperty('width', (r.width + 4) + 'px', 'important');
  ov.style.setProperty('height', (r.height + 4) + 'px', 'important');
}

/** Hide overlay. */
export function hideOverlay(state) {
  if (state.overlayEl) {
    state.overlayEl.style.setProperty('display', 'none', 'important');
  }
}

/** Create the panel shell once (no content). Reused by render + placeholder. */
function createPanelShell(state) {
  const panel = document.createElement('div');
  panel.id = 'hh-ar-inspector-panel';
  imp(panel, 'position', 'fixed');
  imp(panel, 'top', '12px');
  imp(panel, 'right', '12px');
  imp(panel, 'width', '380px');
  imp(panel, 'max-height', '90vh');
  imp(panel, 'overflow-y', 'auto');
  imp(panel, 'background', '#1f2937');
  imp(panel, 'color', '#f3f4f6');
  imp(panel, 'font-family', 'ui-monospace, Menlo, Consolas, monospace');
  imp(panel, 'font-size', '11px');
  imp(panel, 'line-height', '1.45');
  imp(panel, 'border-radius', '8px');
  imp(panel, 'box-shadow', '0 8px 32px rgba(0,0,0,0.4)');
  imp(panel, 'padding', '10px 12px');
  imp(panel, 'z-index', String(INSPECTOR_Z + 1));
  imp(panel, 'border', '1px solid #374151');
  document.body.appendChild(panel);
  state.panelEl = panel;
  return panel;
}

/** Build a small action button with inline SVG + label. */
function mkBtn(iconSvg, label, color, onClick) {
  const b = document.createElement('button');
  b.innerHTML = iconSvg + ' ' + label;
  imp(b, 'font-size', '10px');
  imp(b, 'padding', '3px 8px');
  imp(b, 'background', color);
  imp(b, 'color', '#fff');
  imp(b, 'border', '0');
  imp(b, 'border-radius', '4px');
  imp(b, 'cursor', 'pointer');
  imp(b, 'font-family', 'inherit');
  imp(b, 'display', 'inline-flex');
  imp(b, 'align-items', 'center');
  imp(b, 'gap', '4px');
  b.addEventListener('click', onClick);
  return b;
}

/** Render the info panel for an element. */
export function renderPanel(state, el, onStop) {
  const panel = state.panelEl || createPanelShell(state);
  const report = buildElementReport(el);
  const cssPath = buildCssPath(el);

  panel.innerHTML = '';
  const header = document.createElement('div');
  imp(header, 'display', 'flex');
  imp(header, 'justify-content', 'space-between');
  imp(header, 'align-items', 'center');
  imp(header, 'margin-bottom', '8px');
  imp(header, 'padding-bottom', '6px');
  imp(header, 'border-bottom', '1px solid #374151');
  header.innerHTML =
    '<span style="font-weight:600;color:#a78bfa;display:inline-flex;align-items:center;gap:4px;">' +
    INSPECTOR_ICONS.search + ' Inspector</span>' +
    '<span style="font-size:10px;color:#9ca3af;">Esc -- close</span>';
  panel.appendChild(header);

  const btns = document.createElement('div');
  imp(btns, 'display', 'flex');
  imp(btns, 'gap', '6px');
  imp(btns, 'margin-bottom', '8px');
  imp(btns, 'flex-wrap', 'wrap');

  btns.appendChild(mkBtn(INSPECTOR_ICONS.clipboard, 'Copy report', '#059669', () => {
    copyToClipboard(report);
    flashToast('Report copied to clipboard');
  }));
  btns.appendChild(mkBtn(INSPECTOR_ICONS.mapPin, 'Copy CSS path', '#2563eb', () => {
    copyToClipboard(cssPath);
    flashToast('CSS path copied');
  }));
  btns.appendChild(mkBtn(INSPECTOR_ICONS.refresh, 'Re-pick', '#7c3aed', () => {
    state.frozen = false;
    state.currentEl = null;
    hideOverlay(state);
    renderPanelPlaceholder(state);
  }));
  btns.appendChild(mkBtn(INSPECTOR_ICONS.close, 'Close', '#dc2626', () => {
    onStop();
  }));
  panel.appendChild(btns);

  const pre = document.createElement('pre');
  imp(pre, 'white-space', 'pre-wrap');
  imp(pre, 'word-break', 'break-all');
  imp(pre, 'margin', '0');
  imp(pre, 'font-family', 'inherit');
  imp(pre, 'font-size', '10px');
  imp(pre, 'color', '#d1d5db');
  pre.textContent = report;
  panel.appendChild(pre);
}

/** Render initial placeholder ("hover any element" hint). */
export function renderPanelPlaceholder(state) {
  const panel = state.panelEl || createPanelShell(state);
  panel.innerHTML =
    '<div style="color:#9ca3af;font-size:11px;display:flex;align-items:center;gap:6px;">' +
    INSPECTOR_ICONS.search +
    '<span>Hover any element and click.<br>Esc -- close.</span></div>';
}

/** Show a tiny transient toast at bottom of viewport. */
export function flashToast(msg) {
  let t = document.getElementById('hh-ar-inspector-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'hh-ar-inspector-toast';
    imp(t, 'position', 'fixed');
    imp(t, 'bottom', '24px');
    imp(t, 'left', '50%');
    imp(t, 'transform', 'translateX(-50%)');
    imp(t, 'background', '#1f2937');
    imp(t, 'color', '#10b981');
    imp(t, 'font-family', 'ui-sans-serif, system-ui');
    imp(t, 'font-size', '12px');
    imp(t, 'padding', '6px 12px');
    imp(t, 'border-radius', '6px');
    imp(t, 'z-index', String(INSPECTOR_Z + 2));
    imp(t, 'box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.setProperty('display', 'block', 'important');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.setProperty('display', 'none', 'important');
  }, 2000);
}

/** Copy text to clipboard with fallbacks. */
export function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {}, () => fallbackCopy(text));
      return;
    }
  } catch (_e) { /* fall through */ }
  fallbackCopy(text);
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    ta.remove();
  } catch (_e) { /* ignore */ }
}
