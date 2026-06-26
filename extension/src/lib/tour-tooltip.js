/**
 * TOUR TOOLTIP -- rendering and positioning for guided tour tooltips.
 * Extracted from tour-engine.js for anti-monolith compliance.
 *
 * All elements are appended to .fab-panel and use position:absolute
 * because the sidebar host has CSS transform, which makes position:fixed
 * relative to the host instead of the viewport.
 *
 * Key design decisions:
 * - z-index set IMMEDIATELY on creation (not in rAF) so tooltip is always
 *   above the overlay from the very first frame.
 * - No CSS animation on the tooltip -- avoids transform conflict with
 *   position:absolute positioning.
 * - Two-phase render: append hidden -> measure -> position -> show.
 */

import { refs } from '../ui/state.js';
import { ICONS } from '../ui/html/icons.js';

const TOUR_Z = 9999999;

let tooltip = null;

/** Get the .fab-panel container (our positioning context). */
function getPanel() {
  return refs.shadowRoot?.querySelector('.fab-panel') || null;
}

/** @returns {HTMLElement|null} current tooltip element */
export function getTooltip() { return tooltip; }

/** Remove current tooltip from DOM. */
export function removeTooltip() {
  const panel = getPanel();
  if (tooltip && panel?.contains(tooltip)) panel.removeChild(tooltip);
  tooltip = null;
}

/**
 * Render tooltip anchored to a target element.
 */
export function renderTooltip(targetEl, step, idx, stepsLen) {
  removeTooltip();
  const panel = getPanel();
  if (!panel) { console.warn('[Tour] renderTooltip: no .fab-panel'); return; }

  tooltip = document.createElement('div');
  tooltip.className = 'hh-tour-tooltip';
  tooltip.innerHTML = buildTooltipHTML(step, idx, stepsLen);

  // CRITICAL: set z-index + visibility IMMEDIATELY so tooltip is above overlay
  // from the very first frame, but hidden until positioned.
  tooltip.style.cssText =
    'position:absolute;z-index:' + (TOUR_Z + 2) +
    ';visibility:hidden;top:0;left:0;pointer-events:auto;';

  panel.appendChild(tooltip);
  console.log('[Tour] renderTooltip appended, target=', step.target, 'pos=', step.position || 'auto');

  // Two-frame: measure after layout, then position and show
  requestAnimationFrame(() => {
    const targetRect = targetEl.getBoundingClientRect();
    const pos = step.position || autoPosition(targetRect);
    positionTooltip(tooltip, targetRect, pos);
    // Make visible after positioning
    tooltip.style.visibility = 'visible';
    console.log('[Tour] tooltip visible -- positioned and shown');
  });
}

/**
 * Render tooltip centered in the panel (no target element).
 */
export function renderCenteredTooltip(step, idx, stepsLen) {
  removeTooltip();
  const panel = getPanel();
  if (!panel) { console.warn('[Tour] renderCenteredTooltip: no .fab-panel'); return; }

  tooltip = document.createElement('div');
  tooltip.className = 'hh-tour-tooltip';
  tooltip.innerHTML = buildTooltipHTML(step, idx, stepsLen);

  // Centered in panel
  tooltip.style.cssText =
    'position:absolute;z-index:' + (TOUR_Z + 2) +
    ';top:50%;left:50%;transform:translate(-50%,-50%);' +
    'pointer-events:auto;';

  panel.appendChild(tooltip);
  console.log('[Tour] renderCenteredTooltip done');
}

// ===============================================
// HTML BUILDER
// ===============================================

function buildTooltipHTML(step, idx, stepsLen) {
  const isLast = idx === stepsLen - 1;
  const isFirst = idx === 0;
  const counter = (idx + 1) + '/' + stepsLen;

  return '<div class="hh-tour-header">' +
      '<span class="hh-tour-counter">' + counter + '</span>' +
      '<button class="hh-tour-skip" data-tour="skip">Пропустить</button>' +
    '</div>' +
    (step.title ? '<div class="hh-tour-title">' + step.title + '</div>' : '') +
    '<div class="hh-tour-text">' + step.text + '</div>' +
    '<div class="hh-tour-footer">' +
      (isFirst ? '' : '<button class="hh-tour-prev" data-tour="prev">' + ICONS.arrowLeft + ' Назад</button>') +
      '<button class="hh-tour-next" data-tour="next">' +
        (isLast ? 'Готово ' + ICONS.checkMark : 'Далее ' + ICONS.arrowRight) +
      '</button>' +
    '</div>';
}

// ===============================================
// POSITIONING -- all coords relative to .fab-panel
// ===============================================

function positionTooltip(tipEl, targetRect, pos) {
  const panel = getPanel();
  if (!panel) return;

  const panelRect = panel.getBoundingClientRect();
  const tipRect = tipEl.getBoundingClientRect();

  // Convert target viewport coords to panel-relative coords
  const tTop = targetRect.top - panelRect.top;
  const tBottom = targetRect.bottom - panelRect.top;
  const tLeft = targetRect.left - panelRect.left;
  const gap = 12;

  let top, left;

  if (pos === 'bottom') {
    top = tBottom + gap;
    left = tLeft + targetRect.width / 2 - tipRect.width / 2;
  } else if (pos === 'top') {
    top = tTop - tipRect.height - gap;
    left = tLeft + targetRect.width / 2 - tipRect.width / 2;
  } else if (pos === 'left') {
    top = tTop + targetRect.height / 2 - tipRect.height / 2;
    left = tLeft - tipRect.width - gap;
  } else if (pos === 'right') {
    top = tTop + targetRect.height / 2 - tipRect.height / 2;
    left = targetRect.right - panelRect.left + gap;
  } else { // center
    top = panelRect.height / 2 - tipRect.height / 2;
    left = panelRect.width / 2 - tipRect.width / 2;
  }

  // Keep within panel bounds
  left = Math.max(8, Math.min(left, panelRect.width - tipRect.width - 8));
  top = Math.max(8, Math.min(top, panelRect.height - tipRect.height - 8));

  // Apply position -- keep z-index from initial cssText
  tipEl.style.top = top + 'px';
  tipEl.style.left = left + 'px';

  console.log('[Tour] positionTooltip: top=', Math.round(top),
    'left=', Math.round(left),
    'tipW=', Math.round(tipRect.width), 'tipH=', Math.round(tipRect.height),
    'panelW=', Math.round(panelRect.width), 'panelH=', Math.round(panelRect.height));
}

function autoPosition(rect) {
  const panel = getPanel();
  if (!panel) return 'bottom';
  const panelRect = panel.getBoundingClientRect();
  const spaceBelow = panelRect.bottom - rect.bottom;
  const spaceAbove = rect.top - panelRect.top;
  return spaceBelow > 200 ? 'bottom' : spaceAbove > 200 ? 'top' : 'right';
}
