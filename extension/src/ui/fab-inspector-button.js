/**
 * UI: FAB Inspector Mini-Button
 * =================================
 * The small purple "eye" button stacked above the main FAB that toggles
 * the DOM inspector. Lives in MAIN document (not Shadow DOM), styled with
 * setProperty(..., 'important') to resist hh.ru CSS overrides.
 *
 * Split from fab.js for AHG Rule 12 (anti-monolith, 200-line limit).
 * v1.9.63.0
 */

import { refs } from './state.js';

const INSPECTOR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>' +
  '<circle cx="12" cy="12" r="3"/></svg>';

function fabStyle(style, prop, value) {
  style.setProperty(prop, value, 'important');
}

/**
 * Create the inspector mini-button and append it to document.body.
 * Initial state: hidden (opacity 0, pointer-events none). updateFabIcon()
 * in fab.js is responsible for showing it when the FAB is visible.
 *
 * @param {Function} onToggle - called with the button element when clicked
 *        or activated via keyboard. Caller is responsible for calling
 *        toggleInspector() and setFabInspectorActive() in response.
 */
export function createFabInspectorButton(onToggle) {
  if (refs.fabInspectorEl) return;
  if (typeof onToggle !== 'function') return;

  const btn = document.createElement('div');
  btn.id = 'hh-ar-fab-inspector';
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', 'Запустить DOM-инспектор');
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('title', 'DOM-инспектор: осмотреть элемент на странице');
  btn.setAttribute('tabindex', '0');

  const ib = btn.style;
  fabStyle(ib, 'position', 'fixed');
  fabStyle(ib, 'bottom', '148px');
  fabStyle(ib, 'right', '36px');
  fabStyle(ib, 'width', '32px');
  fabStyle(ib, 'height', '32px');
  fabStyle(ib, 'border-radius', '50%');
  fabStyle(ib, 'cursor', 'pointer');
  fabStyle(ib, 'z-index', '999998');
  fabStyle(ib, 'display', 'flex');
  fabStyle(ib, 'align-items', 'center');
  fabStyle(ib, 'justify-content', 'center');
  fabStyle(ib, 'background', '#7c3aed');
  fabStyle(ib, 'box-shadow', '0 2px 10px rgba(124,58,237,0.45)');
  fabStyle(ib, 'transition', 'transform 0.2s, opacity 0.3s, background 0.2s, box-shadow 0.2s');
  fabStyle(ib, 'opacity', '0');
  fabStyle(ib, 'pointer-events', 'none');
  ib.border = '2px solid #fff';
  btn.innerHTML = INSPECTOR_ICON;

  btn.addEventListener('mouseenter', () => {
    ib.setProperty('transform', 'scale(1.12)', 'important');
  });
  btn.addEventListener('mouseleave', () => {
    ib.setProperty('transform', 'scale(1)', 'important');
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(btn);
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggle(btn);
    }
  });
  btn.addEventListener('focus', () => {
    if (btn.matches(':focus-visible')) {
      ib.setProperty('outline', '3px solid #7c3aed', 'important');
      ib.setProperty('outline-offset', '2px', 'important');
    }
  });
  btn.addEventListener('blur', () => {
    ib.removeProperty('outline');
    ib.removeProperty('outline-offset');
  });

  document.body.appendChild(btn);
  refs.fabInspectorEl = btn;
}

/**
 * Update visual pressed-state of the inspector mini-button.
 * @param {boolean} active - true if inspector is now ON
 */
export function setFabInspectorActive(active) {
  if (!refs.fabInspectorEl) return;
  const ib = refs.fabInspectorEl.style;
  refs.fabInspectorEl.setAttribute('aria-pressed', active ? 'true' : 'false');
  if (active) {
    fabStyle(ib, 'background', '#9333ea');
    fabStyle(ib, 'box-shadow', '0 0 0 4px rgba(147,51,234,0.35), 0 2px 12px rgba(124,58,237,0.6)');
  } else {
    fabStyle(ib, 'background', '#7c3aed');
    fabStyle(ib, 'box-shadow', '0 2px 10px rgba(124,58,237,0.45)');
  }
}

/* Helpers used by fab.js updateFabIcon() to show/hide the mini-button
   in sync with the main FAB's visibility state. */
export function hideFabInspector() {
  if (!refs.fabInspectorEl) return;
  const ib = refs.fabInspectorEl.style;
  fabStyle(ib, 'opacity', '0');
  fabStyle(ib, 'pointer-events', 'none');
  fabStyle(ib, 'transform', 'scale(0.6)');
}

export function showFabInspector() {
  if (!refs.fabInspectorEl) return;
  const ib = refs.fabInspectorEl.style;
  fabStyle(ib, 'opacity', '1');
  fabStyle(ib, 'pointer-events', 'auto');
  fabStyle(ib, 'transform', 'scale(1)');
}
