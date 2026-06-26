/**
 * UI: FAB (Floating Action Button)
 * ===================================
 * Creates and manages the FAB overlay button.
 * Green gradient (#059669 -> #10B981), pulse animation when panel closed.
 *
 * v1.9.63.0: inspector mini-button moved to fab-inspector-button.js.
 *
 * NOTE: FAB lives in the MAIN document (not Shadow DOM), so hh.ru CSS
 * can override inline styles. All visual properties use setProperty(..., 'important')
 * to prevent external CSS conflicts.
 */

import { panelState, refs } from './state.js';
import {
  createFabInspectorButton,
  setFabInspectorActive as setInspectorActiveInternal,
  hideFabInspector,
  showFabInspector,
} from './fab-inspector-button.js';

const FAB_ICONS = {
  loading: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:har-spin 1s linear infinite"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>',
  locked: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
};

/* Helper: set CSS property with !important to prevent hh.ru overrides */
function fabStyle(style, prop, value) {
  style.setProperty(prop, value, 'important');
}

/**
 * Create the FAB and (optionally) the inspector mini-button above it.
 * @param {Function} onClick - main FAB click handler (toggle sidebar)
 * @param {Function} [onInspectorToggle] - inspector mini-button click handler.
 *        Receives the mini-button element as its only argument.
 *        If omitted, no inspector mini-button is created.
 */
export function createFab(onClick, onInspectorToggle) {
  if (refs.fabEl) return;
  refs.fabEl = document.createElement('div');
  refs.fabEl.id = 'hh-ar-fab';
  refs.fabEl.setAttribute('role', 'button');
  refs.fabEl.setAttribute('aria-label', 'Открыть HH Copilot');
  refs.fabEl.setAttribute('tabindex', '0');
  /* Use setProperty for all visual props to resist hh.ru CSS overrides */
  const s = refs.fabEl.style;
  fabStyle(s, 'position', 'fixed');
  fabStyle(s, 'bottom', '80px');
  fabStyle(s, 'right', '24px');
  fabStyle(s, 'width', '56px');
  fabStyle(s, 'height', '56px');
  fabStyle(s, 'border-radius', '50%');
  fabStyle(s, 'cursor', 'pointer');
  fabStyle(s, 'z-index', '999999');
  fabStyle(s, 'display', 'flex');
  fabStyle(s, 'align-items', 'center');
  fabStyle(s, 'justify-content', 'center');
  fabStyle(s, 'background', 'linear-gradient(135deg,#059669,#10B981)');
  fabStyle(s, 'box-shadow', '0 4px 20px rgba(5,150,105,0.4)');
  fabStyle(s, 'transition', 'right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s');
  fabStyle(s, 'animation', 'fabPulse 2.5s ease-in-out infinite');
  s.border = 'none';
  refs.fabEl.innerHTML = FAB_ICONS.briefcase;
  refs.fabEl.addEventListener('mouseenter', () => { s.setProperty('transform', 'scale(1.1)', 'important'); });
  refs.fabEl.addEventListener('mouseleave', () => { s.setProperty('transform', 'scale(1)', 'important'); });
  refs.fabEl.addEventListener('click', onClick);
  refs.fabEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
  /* Focus-visible outline for WCAG keyboard accessibility */
  refs.fabEl.addEventListener('focus', () => {
    if (refs.fabEl.matches(':focus-visible')) {
      s.setProperty('outline', '3px solid #059669', 'important');
      s.setProperty('outline-offset', '3px', 'important');
    }
  });
  refs.fabEl.addEventListener('blur', () => {
    s.removeProperty('outline');
    s.removeProperty('outline-offset');
  });
  document.body.appendChild(refs.fabEl);

  /* Inspector mini-button lives in a separate module -- create it if a
     toggle callback was provided. ID matches shouldIgnore() in dom-inspector.js. */
  if (typeof onInspectorToggle === 'function') {
    createFabInspectorButton(onInspectorToggle);
  }
}

export function updateFabIcon() {
  if (!refs.fabEl) return;
  const s = refs.fabEl.style;

  if (panelState.isLoggedIn === null) {
    fabStyle(s, 'background', '#94a3b8');
    fabStyle(s, 'box-shadow', '0 4px 20px rgba(148,163,184,0.3)');
    fabStyle(s, 'animation', 'none');
    fabStyle(s, 'opacity', '1');
    fabStyle(s, 'transform', 'scale(1)');
    fabStyle(s, 'pointer-events', 'auto');
    refs.fabEl.innerHTML = FAB_ICONS.loading;
    refs.fabEl.setAttribute('title', 'HH Copilot: проверяем авторизацию...');
    refs.fabEl.setAttribute('aria-label', 'HH Copilot: проверяем авторизацию');
    hideFabInspector();
  } else if (!panelState.isLoggedIn) {
    fabStyle(s, 'background', '#ef4444');
    fabStyle(s, 'box-shadow', '0 4px 20px rgba(239,68,68,0.4)');
    fabStyle(s, 'animation', 'none');
    fabStyle(s, 'opacity', '1');
    fabStyle(s, 'transform', 'scale(1)');
    fabStyle(s, 'pointer-events', 'auto');
    refs.fabEl.innerHTML = FAB_ICONS.locked;
    refs.fabEl.setAttribute('title', 'HH Copilot: НЕ авторизован на hh.ru');
    refs.fabEl.setAttribute('aria-label', 'HH Copilot: не авторизован');
    hideFabInspector();
  } else if (panelState.isOpen) {
    fabStyle(s, 'background', '#059669');
    fabStyle(s, 'opacity', '0');
    fabStyle(s, 'transform', 'scale(0) rotate(180deg)');
    fabStyle(s, 'pointer-events', 'none');
    refs.fabEl.setAttribute('title', 'HH Copilot: закрыть панель');
    hideFabInspector();
  } else {
    fabStyle(s, 'background', 'linear-gradient(135deg,#059669,#10B981)');
    fabStyle(s, 'box-shadow', '0 4px 20px rgba(5,150,105,0.4)');
    fabStyle(s, 'opacity', '1');
    fabStyle(s, 'transform', 'scale(1)');
    fabStyle(s, 'pointer-events', 'auto');
    fabStyle(s, 'animation', 'fabPulse 2.5s ease-in-out infinite');
    refs.fabEl.innerHTML = FAB_ICONS.briefcase;
    refs.fabEl.setAttribute('title', 'HH Copilot: авторизован. Нажмите для открытия.');
    refs.fabEl.setAttribute('aria-label', 'HH Copilot: открыть панель');
    showFabInspector();
  }
}

/* Re-export so callers (panel/index.js) can update pressed-state without
   coupling to fab-inspector-button.js directly. */
export const setFabInspectorActive = setInspectorActiveInternal;
