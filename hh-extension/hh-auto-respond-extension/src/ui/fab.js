/**
 * UI: FAB (Floating Action Button)
 * ===================================
 * Creates and manages the FAB overlay button.
 * Green gradient (#059669 -> #10B981), pulse animation when panel closed.
 *
 * NOTE: FAB lives in the MAIN document (not Shadow DOM), so hh.ru CSS
 * can override inline styles. All visual properties use setProperty(..., 'important')
 * to prevent external CSS conflicts.
 */

import { panelState, refs } from './state.js';

const FAB_ICONS = {
  loading: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
  locked: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  briefcase: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
  close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

/* Helper: set CSS property with !important to prevent hh.ru overrides */
function fabStyle(style, prop, value) {
  style.setProperty(prop, value, 'important');
}

export function createFab(onClick) {
  if (refs.fabEl) return;
  refs.fabEl = document.createElement('div');
  refs.fabEl.id = 'hh-ar-fab';
  refs.fabEl.setAttribute('role', 'button');
  refs.fabEl.setAttribute('aria-label', 'Открыть HH Copilot');
  refs.fabEl.setAttribute('tabindex', '0');
  /* Use setProperty for all visual props to resist hh.ru CSS overrides */
  const s = refs.fabEl.style;
  fabStyle(s, 'position', 'fixed');
  fabStyle(s, 'bottom', '24px');
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
  document.body.appendChild(refs.fabEl);
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
  } else if (panelState.isOpen) {
    fabStyle(s, 'background', '#059669');
    fabStyle(s, 'opacity', '0');
    fabStyle(s, 'transform', 'scale(0) rotate(180deg)');
    fabStyle(s, 'pointer-events', 'none');
    refs.fabEl.setAttribute('title', 'HH Copilot: закрыть панель');
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
  }
}
