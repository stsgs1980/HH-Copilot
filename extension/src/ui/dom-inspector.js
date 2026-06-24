/**
 * UI: DOM MICRO-INSPECTOR
 * =====================================
 * Vanilla-JS visual inspector for hh.ru elements.
 *
 * What it does:
 *   - Adds a 🔍 FAB button next to the main HH Copilot FAB
 *   - When inspector is ON, hovering over any hh.ru element highlights it
 *   - Click → freeze on element, show panel with:
 *       tag, id, classes, CSS path, text (truncated), computed size, font, color
 *   - Panel has buttons: Copy as report, Copy CSS path, Close
 *   - Esc turns inspector OFF
 *
 * All elements live in MAIN document (not Shadow DOM) so the overlay can
 * cover the whole page. Styles use setProperty(..., 'important') to resist
 * hh.ru CSS overrides.
 *
 * v1.9.59.0
 */

const INSPECTOR_Z = 2147483000; // above everything except devtools

let inspectorState = {
  active: false,        // hover-highlight mode ON
  frozen: false,        // user clicked an element, highlight is locked
  overlayEl: null,      // yellow outline box
  panelEl: null,        // info panel
  fabEl: null,          // 🔍 button
  currentEl: null,      // element currently hovered/clicked
  moveHandler: null,
  clickHandler: null,
  keyHandler: null,
};

/** Set style with !important. */
function imp(el, prop, value) {
  el.style.setProperty(prop, value, 'important');
}

/**
 * Compute a CSS selector path for an element.
 * Uses id if present, else walks up: tag:nth-of-type(n) > ...
 * @param {Element} el
 * @returns {string}
 */
export function buildCssPath(el) {
  if (!el || el.nodeType !== 1) return '';
  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 8) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += '#' + node.id;
      parts.unshift(part);
      break; // id is unique, stop
    }
    const cls = Array.from(node.classList || []).filter(c => c && c.length < 60).slice(0, 3);
    if (cls.length > 0) part += '.' + cls.join('.');
    // nth-of-type among siblings of same tag
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === node.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        part += ':nth-of-type(' + idx + ')';
      }
    }
    parts.unshift(part);
    node = node.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

/**
 * Build a plain-text report from an element. Easy to paste into a chat.
 * @param {Element} el
 * @returns {string}
 */
export function buildElementReport(el) {
  if (!el || el.nodeType !== 1) return '';
  const cs = (typeof getComputedStyle === 'function') ? getComputedStyle(el) : {};
  const rect = el.getBoundingClientRect();
  const lines = [];
  lines.push('=== HH-Copilot DOM Inspector Report ===');
  lines.push('Time: ' + new Date().toISOString());
  lines.push('URL: ' + (typeof location !== 'undefined' ? location.href : '?'));
  lines.push('');
  lines.push('Tag: ' + el.tagName.toLowerCase());
  lines.push('ID: ' + (el.id || '(none)'));
  const classes = Array.from(el.classList || []);
  lines.push('Classes: ' + (classes.length ? classes.join(' ') : '(none)'));
  lines.push('');
  lines.push('CSS Path: ' + buildCssPath(el));
  lines.push('');
  lines.push('Text (truncated 400 chars):');
  const txt = (el.innerText || el.textContent || '').trim();
  lines.push(txt.length > 400 ? txt.slice(0, 400) + '...(+' + (txt.length - 400) + ' more)' : txt);
  lines.push('');
  lines.push('Geometry:');
  lines.push('  rect: ' + Math.round(rect.left) + ',' + Math.round(rect.top) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
  lines.push('  offsetWidth: ' + el.offsetWidth + 'px');
  lines.push('  offsetHeight: ' + el.offsetHeight + 'px');
  lines.push('');
  lines.push('Computed style (key):');
  lines.push('  display: ' + (cs.display || '?'));
  lines.push('  visibility: ' + (cs.visibility || '?'));
  lines.push('  font: ' + (cs.fontFamily || '?').slice(0, 80) + ' / ' + (cs.fontSize || '?') + ' / ' + (cs.lineHeight || '?'));
  lines.push('  color: ' + (cs.color || '?'));
  lines.push('  background: ' + (cs.backgroundColor || '?'));
  lines.push('  padding: ' + (cs.padding || '?'));
  lines.push('  margin: ' + (cs.margin || '?'));
  lines.push('  border: ' + (cs.border || '?'));
  lines.push('');
  lines.push('Outer HTML (truncated 600 chars):');
  try {
    const html = el.outerHTML || '';
    lines.push(html.length > 600 ? html.slice(0, 600) + '...(+' + (html.length - 600) + ' more)' : html);
  } catch (e) {
    lines.push('(could not serialize: ' + (e.message || e) + ')');
  }
  lines.push('');
  lines.push('=== end report ===');
  return lines.join('\n');
}

/** Create or return the overlay box. */
function getOverlay() {
  if (inspectorState.overlayEl) return inspectorState.overlayEl;
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
  inspectorState.overlayEl = ov;
  return ov;
}

/** Position overlay over an element. */
function positionOverlay(el) {
  const ov = getOverlay();
  const r = el.getBoundingClientRect();
  ov.style.setProperty('display', 'block', 'important');
  ov.style.setProperty('top', (r.top - 2) + 'px', 'important');
  ov.style.setProperty('left', (r.left - 2) + 'px', 'important');
  ov.style.setProperty('width', (r.width + 4) + 'px', 'important');
  ov.style.setProperty('height', (r.height + 4) + 'px', 'important');
}

/** Hide overlay. */
function hideOverlay() {
  if (inspectorState.overlayEl) {
    inspectorState.overlayEl.style.setProperty('display', 'none', 'important');
  }
}

/** Render the info panel for an element. */
function renderPanel(el) {
  let panel = inspectorState.panelEl;
  if (!panel) {
    panel = document.createElement('div');
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
    inspectorState.panelEl = panel;
  }

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
    '<span style="font-weight:600;color:#a78bfa;">🔍 Inspector</span>' +
    '<span style="font-size:10px;color:#9ca3af;">Esc — закрыть</span>';
  panel.appendChild(header);

  // Buttons row
  const btns = document.createElement('div');
  imp(btns, 'display', 'flex');
  imp(btns, 'gap', '6px');
  imp(btns, 'margin-bottom', '8px');
  imp(btns, 'flex-wrap', 'wrap');

  const mkBtn = (label, color, onClick) => {
    const b = document.createElement('button');
    b.textContent = label;
    imp(b, 'font-size', '10px');
    imp(b, 'padding', '3px 8px');
    imp(b, 'background', color);
    imp(b, 'color', '#fff');
    imp(b, 'border', '0');
    imp(b, 'border-radius', '4px');
    imp(b, 'cursor', 'pointer');
    imp(b, 'font-family', 'inherit');
    b.addEventListener('click', onClick);
    return b;
  };

  btns.appendChild(mkBtn('📋 Copy report', '#059669', () => {
    copyToClipboard(report);
    flashToast('Report copied to clipboard');
  }));
  btns.appendChild(mkBtn('📍 Copy CSS path', '#2563eb', () => {
    copyToClipboard(cssPath);
    flashToast('CSS path copied');
  }));
  btns.appendChild(mkBtn('🔄 Re-pick', '#7c3aed', () => {
    inspectorState.frozen = false;
    inspectorState.currentEl = null;
    hideOverlay();
    panel.innerHTML = '<div style="color:#9ca3af;font-size:11px;">Hover another element...</div>';
  }));
  btns.appendChild(mkBtn('✖ Close', '#dc2626', () => {
    stopInspector();
  }));
  panel.appendChild(btns);

  // Report body (read-only pre)
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

/** Show a tiny transient toast at bottom of viewport. */
function flashToast(msg) {
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
  t._timer = setTimeout(() => { t.style.setProperty('display', 'none', 'important'); }, 2000);
}

/** Copy text to clipboard with fallbacks. */
function copyToClipboard(text) {
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

/** Should we ignore this element during hover? (e.g. our own UI) */
function shouldIgnore(el) {
  if (!el) return true;
  // Ignore our own overlay/panel/fab
  const id = el.id || '';
  if (id === 'hh-ar-inspector-overlay') return true;
  if (id === 'hh-ar-inspector-panel') return true;
  if (id === 'hh-ar-inspector-toast') return true;
  if (id === 'hh-ar-inspector-fab') return true;
  if (id === 'hh-ar-fab') return true;
  // Ignore everything inside our panel
  let p = el;
  while (p) {
    if (p.id === 'hh-ar-inspector-panel') return true;
    if (p.id === 'hh-ar-inspector-fab') return true;
    if (p.id === 'hh-ar-fab') return true;
    p = p.parentElement;
  }
  return false;
}

function onMouseMove(e) {
  if (inspectorState.frozen) return;
  const el = e.target;
  if (shouldIgnore(el)) return;
  inspectorState.currentEl = el;
  positionOverlay(el);
}

function onClick(e) {
  const el = e.target;
  if (shouldIgnore(el)) return;
  e.preventDefault();
  e.stopPropagation();
  inspectorState.frozen = true;
  inspectorState.currentEl = el;
  positionOverlay(el);
  renderPanel(el);
  // eslint-disable-next-line no-console
  console.log('[DOM-Inspector] element picked:', buildCssPath(el));
}

function onKey(e) {
  if (e.key === 'Escape') {
    if (inspectorState.frozen) {
      // First Esc: unfreeze, return to hover mode
      inspectorState.frozen = false;
      if (inspectorState.panelEl) {
        inspectorState.panelEl.innerHTML = '<div style="color:#9ca3af;font-size:11px;">Hover another element...</div>';
      }
    } else {
      // Second Esc: turn off inspector entirely
      stopInspector();
    }
  }
}

/** Turn inspector ON. */
export function startInspector() {
  if (inspectorState.active) return;
  inspectorState.active = true;
  inspectorState.frozen = false;

  // Highlight FAB as active
  if (inspectorState.fabEl) {
    imp(inspectorState.fabEl, 'background', '#7c3aed');
    imp(inspectorState.fabEl, 'box-shadow', '0 4px 20px rgba(124,58,237,0.5)');
  }

  // Pre-create overlay + panel placeholder
  getOverlay();
  renderPanelPlaceholder();

  inspectorState.moveHandler = onMouseMove;
  inspectorState.clickHandler = onClick;
  inspectorState.keyHandler = onKey;

  document.addEventListener('mousemove', inspectorState.moveHandler, true);
  document.addEventListener('click', inspectorState.clickHandler, true);
  document.addEventListener('keydown', inspectorState.keyHandler, true);

  // eslint-disable-next-line no-console
  console.log('[DOM-Inspector] ON — hover any element, click to freeze, Esc to exit');
  flashToast('Inspector ON — кликни элемент на странице');
}

function renderPanelPlaceholder() {
  let panel = inspectorState.panelEl;
  if (!panel) {
    panel = document.createElement('div');
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
    inspectorState.panelEl = panel;
  }
  panel.innerHTML = '<div style="color:#9ca3af;font-size:11px;">🔍 Наведи курсор на любой элемент и кликни.<br>Esc — закрыть.</div>';
}

/** Turn inspector OFF. */
export function stopInspector() {
  if (!inspectorState.active) return;
  inspectorState.active = false;
  inspectorState.frozen = false;
  inspectorState.currentEl = null;

  if (inspectorState.moveHandler) {
    document.removeEventListener('mousemove', inspectorState.moveHandler, true);
  }
  if (inspectorState.clickHandler) {
    document.removeEventListener('click', inspectorState.clickHandler, true);
  }
  if (inspectorState.keyHandler) {
    document.removeEventListener('keydown', inspectorState.keyHandler, true);
  }
  inspectorState.moveHandler = null;
  inspectorState.clickHandler = null;
  inspectorState.keyHandler = null;

  hideOverlay();
  if (inspectorState.panelEl) {
    inspectorState.panelEl.remove();
    inspectorState.panelEl = null;
  }
  if (inspectorState.fabEl) {
    imp(inspectorState.fabEl, 'background', '#1f2937');
    imp(inspectorState.fabEl, 'box-shadow', '0 4px 12px rgba(0,0,0,0.25)');
  }
  // eslint-disable-next-line no-console
  console.log('[DOM-Inspector] OFF');
  flashToast('Inspector OFF');
}

export function isInspectorActive() {
  return inspectorState.active;
}

/**
 * Create the 🔍 FAB button. Place it to the LEFT of the main FAB.
 * @param {Object} [opts]
 */
export function createInspectorFab(opts) {
  if (inspectorState.fabEl) return inspectorState.fabEl;

  const fab = document.createElement('div');
  fab.id = 'hh-ar-inspector-fab';
  fab.setAttribute('role', 'button');
  fab.setAttribute('aria-label', 'DOM Inspector: выделить элемент');
  fab.setAttribute('tabindex', '0');
  fab.setAttribute('title', 'DOM Inspector — кликни чтобы включить');

  imp(fab, 'position', 'fixed');
  imp(fab, 'bottom', '80px');
  imp(fab, 'right', '88px'); // 24 + 56 + 8 = to the left of main FAB
  imp(fab, 'width', '40px');
  imp(fab, 'height', '40px');
  imp(fab, 'border-radius', '50%');
  imp(fab, 'cursor', 'pointer');
  imp(fab, 'z-index', '999999');
  imp(fab, 'display', 'flex');
  imp(fab, 'align-items', 'center');
  imp(fab, 'justify-content', 'center');
  imp(fab, 'background', '#1f2937');
  imp(fab, 'color', '#fff');
  imp(fab, 'box-shadow', '0 4px 12px rgba(0,0,0,0.25)');
  imp(fab, 'transition', 'all 0.2s');
  fab.innerHTML = '<span style="font-size:18px;line-height:1;">🔍</span>';

  fab.addEventListener('mouseenter', () => {
    fab.style.setProperty('transform', 'scale(1.1)', 'important');
  });
  fab.addEventListener('mouseleave', () => {
    fab.style.setProperty('transform', 'scale(1)', 'important');
  });
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inspectorState.active) {
      stopInspector();
    } else {
      startInspector();
    }
  });
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (inspectorState.active) stopInspector();
      else startInspector();
    }
  });

  document.body.appendChild(fab);
  inspectorState.fabEl = fab;
  return fab;
}

/** Exports for tests. */
export const _internal = {
  inspectorState,
  shouldIgnore,
  buildCssPath,
  buildElementReport,
};
