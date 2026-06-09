/**
 * UI: FAB (Floating Action Button)
 * ===================================
 * Creates and manages the FAB overlay button.
 * Green gradient (#059669 -> #10B981), pulse animation when panel closed.
 */

import { panelState, refs } from './state.js';

const FAB_ICONS = {
  loading: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
  locked: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  briefcase: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
  close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

export function createFab(onClick) {
  if (refs.fabEl) return;
  refs.fabEl = document.createElement('div');
  refs.fabEl.id = 'hh-ar-fab';
  refs.fabEl.setAttribute('role', 'button');
  refs.fabEl.setAttribute('aria-label', 'Открыть HH Copilot');
  refs.fabEl.style.cssText =
    'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;' +
    'cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;' +
    'background:linear-gradient(135deg,#059669,#10B981);' +
    'box-shadow:0 4px 20px rgba(5,150,105,0.4);' +
    'transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s;' +
    'animation:fabPulse 2.5s ease-in-out infinite;';
  refs.fabEl.innerHTML = FAB_ICONS.briefcase;
  refs.fabEl.addEventListener('mouseenter', () => { refs.fabEl.style.transform = 'scale(1.1)'; });
  refs.fabEl.addEventListener('mouseleave', () => { refs.fabEl.style.transform = 'scale(1)'; });
  refs.fabEl.addEventListener('click', onClick);
  document.body.appendChild(refs.fabEl);
}

export function updateFabIcon() {
  if (!refs.fabEl) return;
  if (panelState.isLoggedIn === null) {
    refs.fabEl.style.background = '#94a3b8';
    refs.fabEl.style.animation = 'none';
    refs.fabEl.innerHTML = FAB_ICONS.loading;
  } else if (!panelState.isLoggedIn) {
    refs.fabEl.style.background = '#ef4444';
    refs.fabEl.style.boxShadow = '0 4px 20px rgba(239,68,68,0.4)';
    refs.fabEl.style.animation = 'none';
    refs.fabEl.innerHTML = FAB_ICONS.locked;
  } else if (panelState.isOpen) {
    refs.fabEl.style.background = '#059669';
    refs.fabEl.style.opacity = '0';
    refs.fabEl.style.transform = 'scale(0) rotate(180deg)';
    refs.fabEl.style.pointerEvents = 'none';
  } else {
    refs.fabEl.style.background = 'linear-gradient(135deg,#059669,#10B981)';
    refs.fabEl.style.boxShadow = '0 4px 20px rgba(5,150,105,0.4)';
    refs.fabEl.style.opacity = '1';
    refs.fabEl.style.transform = 'scale(1)';
    refs.fabEl.style.pointerEvents = 'auto';
    refs.fabEl.style.animation = 'fabPulse 2.5s ease-in-out infinite';
    refs.fabEl.innerHTML = FAB_ICONS.briefcase;
  }
}
