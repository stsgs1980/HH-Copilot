/**
 * TOUR ENGINE — lightweight guided tour for HH Copilot.
 *
 * Core: step management, overlay, spotlight, tab switching.
 * Tooltip rendering → tour-tooltip.js
 *
 * Z-index stack (all inside .fab-panel):
 *   overlay   = 9999998  (dark backdrop)
 *   spotlight = 9999999  (glow around target)
 *   tooltip   = 10000001 (on top of everything)
 * CSS classes set z-index — no inline z-index needed.
 */

import { refs } from '../ui/state.js';
import { renderTooltip, renderCenteredTooltip, removeTooltip } from './tour-tooltip.js';

const STORAGE_KEY = 'hh-copilot-tour-done';

let currentStep = 0;
let steps = [];
let overlay = null;
let spotlight = null;
let onDone = null;
let _tourEventsBound = false;

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/** Start a guided tour. */
export function startTour(tourSteps, onFinish) {
  if (overlay) endTour(false);
  steps = tourSteps;
  currentStep = 0;
  onDone = onFinish || null;
  console.log('[Tour] startTour, steps=', steps.length, 'shadowRoot=', !!refs.shadowRoot);
  createOverlay();
  showStep(0);
}

/** Check if user has completed the tour before. */
export function isTourDone() {
  try { return localStorage.getItem(STORAGE_KEY) === 'v1'; } catch { return false; }
}

/** Mark tour as completed. */
export function markTourDone() {
  try { localStorage.setItem(STORAGE_KEY, 'v1'); } catch { /* ignore */ }
}

/** Force restart the full tour. */
export function restartTour(tourSteps, onFinish) {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  startTour(tourSteps, onFinish);
}

/** End tour and clean up. */
export function endTour(save = true) {
  if (save) markTourDone();
  removeOverlay();
  steps = [];
  currentStep = 0;
  if (onDone) { onDone(); onDone = null; }
}

/** Check if a tour is currently active. */
export function isTourActive() {
  return overlay !== null;
}

// ═══════════════════════════════════════════════
// OVERLAY + SPOTLIGHT
// ═══════════════════════════════════════════════

function createOverlay() {
  const panel = refs.shadowRoot?.querySelector('.fab-panel');
  if (!panel) { console.warn('[Tour] createOverlay: no .fab-panel'); return; }

  // Make panel a positioning context for position:absolute children
  // (it already is — position:fixed — but be explicit)
  if (!panel.style.position) panel.style.position = 'fixed';

  overlay = document.createElement('div');
  overlay.className = 'hh-tour-overlay';
  overlay.style.cssText =
    'position:absolute;inset:0;' +
    'background:rgba(0,0,0,0.45);transition:opacity 0.2s;';

  spotlight = document.createElement('div');
  spotlight.className = 'hh-tour-spotlight';
  spotlight.style.cssText =
    'position:absolute;' +
    'border-radius:6px;box-shadow:0 0 0 4px rgba(59,130,246,0.5),0 0 20px rgba(59,130,246,0.2);' +
    'transition:all 0.3s ease;pointer-events:none;';

  panel.appendChild(overlay);
  panel.appendChild(spotlight);
  console.log('[Tour] createOverlay: overlay+spotlight added to .fab-panel');

  overlay.addEventListener('click', () => endTour(true));
}

function removeOverlay() {
  const panel = refs.shadowRoot?.querySelector('.fab-panel');
  if (overlay && panel?.contains(overlay)) panel.removeChild(overlay);
  if (spotlight && panel?.contains(spotlight)) panel.removeChild(spotlight);
  removeTooltip();
  overlay = spotlight = null;
}

// ═══════════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════════

function showStep(idx) {
  if (idx < 0 || idx >= steps.length) { endTour(true); return; }
  currentStep = idx;
  const step = steps[idx];
  console.log('[Tour] showStep', idx, 'target=', step.target, 'tab=', step.tab);

  if (step.tab) switchToTab(step.tab);

  setTimeout(() => {
    const el = findTarget(step.target);
    console.log('[Tour] findTarget(', step.target, ') =', el ? el.tagName + '.' + (el.className || '') : 'NULL');
    if (el) {
      positionSpotlight(el);
      renderTooltip(el, step, idx, steps.length);
    } else {
      renderCenteredTooltip(step, idx, steps.length);
    }
  }, step.tab ? 150 : 30);
}

function findTarget(selector) {
  const root = refs.shadowRoot;
  if (!root) return null;
  return root.querySelector(selector) || document.querySelector(selector);
}

function positionSpotlight(el) {
  const panel = refs.shadowRoot?.querySelector('.fab-panel');
  if (!panel) return;
  const panelRect = panel.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const pad = 4;
  spotlight.style.top = (elRect.top - panelRect.top - pad) + 'px';
  spotlight.style.left = (elRect.left - panelRect.left - pad) + 'px';
  spotlight.style.width = (elRect.width + pad * 2) + 'px';
  spotlight.style.height = (elRect.height + pad * 2) + 'px';
}

// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════

function switchToTab(tabId) {
  const root = refs.shadowRoot;
  if (!root) return;
  root.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  root.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  const btn = root.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  const section = root.querySelector('#tab-' + tabId);
  if (btn) btn.classList.add('active');
  if (section) section.classList.add('active');
}

// ═══════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════

function handleTourClick(e) {
  const btn = e.target.closest('[data-tour]');
  if (!btn) return;
  const action = btn.getAttribute('data-tour');
  if (action === 'next') showStep(currentStep + 1);
  else if (action === 'prev') showStep(currentStep - 1);
  else if (action === 'skip') endTour(true);
}

/** Bind tour click delegation to shadowRoot.
 *  Must be called AFTER refs.shadowRoot is set. Idempotent. */
export function bindTourEvents() {
  if (_tourEventsBound) return;
  const root = refs.shadowRoot;
  if (root) { root.addEventListener('click', handleTourClick); _tourEventsBound = true; }
}

// Also bind on document as fallback for non-shadow targets
if (typeof document !== 'undefined') {
  document.addEventListener('click', handleTourClick);
}
