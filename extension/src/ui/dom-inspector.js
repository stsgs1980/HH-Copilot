/**
 * UI: DOM MICRO-INSPECTOR
 * =====================================
 * Vanilla-JS visual inspector for hh.ru elements.
 *
 * What it does:
 *   - Toggle from header button (in HH Copilot sidebar) or via API
 *   - When ON, hovering over any hh.ru element highlights it
 *   - Click -> freeze on element, show panel with:
 *       tag, id, classes, CSS path, text (truncated), computed size, font, color
 *   - Panel has buttons: Copy report, Copy CSS path, Re-pick, Close
 *   - Esc: first Esc = unfreeze, second Esc = turn OFF
 *
 * All elements live in MAIN document (not Shadow DOM) so the overlay can
 * cover the whole page. Styles use setProperty(..., 'important') to resist
 * hh.ru CSS overrides.
 *
 * Split for Rule 12 (anti-monolith):
 *   - dom-inspector.js          (this file: state + events + entry points)
 *   - dom-inspector-panel.js    (overlay + panel + buttons + toast + clipboard)
 *   - dom-inspector-report.js   (buildCssPath + buildElementReport, pure)
 *
 * v1.9.61.0
 */

import {
  INSPECTOR_Z,
  imp,
  getOverlay,
  positionOverlay,
  hideOverlay,
  renderPanel,
  renderPanelPlaceholder,
  flashToast,
} from './dom-inspector-panel.js';
import { buildCssPath } from './dom-inspector-report.js';

const inspectorState = {
  active: false,        // hover-highlight mode ON
  frozen: false,        // user clicked an element, highlight is locked
  overlayEl: null,      // purple outline box
  panelEl: null,        // info panel
  currentEl: null,      // element currently hovered/clicked
  moveHandler: null,
  clickHandler: null,
  keyHandler: null,
  /** External toggle button (header) -- updated on start/stop for visual state. */
  toggleBtn: null,
};

/** Should we ignore this element during hover? (e.g. our own UI) */
function shouldIgnore(el) {
  if (!el) return true;
  const id = el.id || '';
  if (id === 'hh-ar-inspector-overlay') return true;
  if (id === 'hh-ar-inspector-panel') return true;
  if (id === 'hh-ar-inspector-toast') return true;
  if (id === 'hh-ar-inspector-fab') return true;
  if (id === 'hh-ar-fab') return true;
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
  positionOverlay(inspectorState, el);
}

function onClick(e) {
  const el = e.target;
  if (shouldIgnore(el)) return;
  e.preventDefault();
  e.stopPropagation();
  inspectorState.frozen = true;
  inspectorState.currentEl = el;
  positionOverlay(inspectorState, el);
  renderPanel(inspectorState, el, stopInspector);
  console.log('[DOM-Inspector] element picked:', buildCssPath(el));
}

function onKey(e) {
  if (e.key === 'Escape') {
    if (inspectorState.frozen) {
      inspectorState.frozen = false;
      if (inspectorState.panelEl) {
        renderPanelPlaceholder(inspectorState);
      }
    } else {
      stopInspector();
    }
  }
}

/** Turn inspector ON. */
export function startInspector() {
  if (inspectorState.active) return;
  inspectorState.active = true;
  inspectorState.frozen = false;

  getOverlay(inspectorState);
  renderPanelPlaceholder(inspectorState);

  inspectorState.moveHandler = onMouseMove;
  inspectorState.clickHandler = onClick;
  inspectorState.keyHandler = onKey;

  document.addEventListener('mousemove', inspectorState.moveHandler, true);
  document.addEventListener('click', inspectorState.clickHandler, true);
  document.addEventListener('keydown', inspectorState.keyHandler, true);

  console.log('[DOM-Inspector] ON -- hover any element, click to freeze, Esc to exit');
  flashToast('Inspector ON -- click any element on the page');
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

  hideOverlay(inspectorState);
  if (inspectorState.panelEl) {
    inspectorState.panelEl.remove();
    inspectorState.panelEl = null;
  }

  // Reset external toggle button (header) visual state
  if (inspectorState.toggleBtn) {
    inspectorState.toggleBtn.setAttribute('aria-pressed', 'false');
    inspectorState.toggleBtn.style.background = 'transparent';
    inspectorState.toggleBtn.style.color = '#52525b';
  }

  console.log('[DOM-Inspector] OFF');
  flashToast('Inspector OFF');
}

export function isInspectorActive() {
  return inspectorState.active;
}

/**
 * Toggle inspector from an external button (e.g. header search button).
 * @param {HTMLButtonElement} [btn] -- optional button to update visual state
 * @returns {boolean} -- true if inspector is now active
 */
export function toggleInspector(btn) {
  if (btn) inspectorState.toggleBtn = btn;
  if (inspectorState.active) {
    stopInspector();
    return false;
  }
  startInspector();
  if (btn) {
    btn.setAttribute('aria-pressed', 'true');
    btn.style.background = '#7c3aed';
    btn.style.color = '#fff';
  }
  return true;
}

/** Exports for tests. */
export const _internal = {
  inspectorState,
  shouldIgnore,
  buildCssPath,
};
