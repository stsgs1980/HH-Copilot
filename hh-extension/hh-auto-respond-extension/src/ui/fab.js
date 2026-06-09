/**
 * UI: FAB (Floating Action Button)
 * ===================================
 * Creates and manages the FAB overlay button.
 */

import { panelState, refs } from './state.js';

export function createFab(onClick) {
  if (refs.fabEl) return;
  refs.fabEl = document.createElement('div');
  refs.fabEl.id = 'hh-ar-fab';
  refs.fabEl.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.18);transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,background 0.2s;background:#94a3b8;';
  refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
  refs.fabEl.addEventListener('mouseenter', () => { refs.fabEl.style.transform = 'scale(1.08)'; });
  refs.fabEl.addEventListener('mouseleave', () => { refs.fabEl.style.transform = 'scale(1)'; });
  refs.fabEl.addEventListener('click', onClick);
  document.body.appendChild(refs.fabEl);
}

export function updateFabIcon() {
  if (!refs.fabEl) return;
  if (panelState.isLoggedIn === null) {
    refs.fabEl.style.background = '#94a3b8';
    refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
  } else if (!panelState.isLoggedIn) {
    refs.fabEl.style.background = '#ef4444';
    refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
  } else if (panelState.isOpen) {
    refs.fabEl.style.background = '#2964FF';
    refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  } else {
    refs.fabEl.style.background = '#2964FF';
    refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
  }
}
