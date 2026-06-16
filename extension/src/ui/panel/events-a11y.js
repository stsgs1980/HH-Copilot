/**
 * UI: PANEL -- KEYBOARD & A11Y HANDLERS
 * =======================================
 * Keyboard navigation for tabs, radio groups, timeline toggles,
 * and aria synchronization for switch/radio controls.
 *
 * Split from src/ui/panel/events.js (AHG Rule 12).
 * v1.9.43.0
 */

import { refs } from '../state.js';

/**
 * Bind keyboard navigation for the tablist:
 *   - ArrowRight/ArrowDown -> next tab
 *   - ArrowLeft/ArrowUp -> prev tab
 *   - Home -> first tab
 *   - End -> last tab
 *
 * @param {Element} container -- panel root
 * @param {(tabId: string) => void} switchTab -- tab switcher
 */
export function bindTabKeyboardNav(container, switchTab) {
  container.addEventListener('keydown', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;
    const tabs = Array.from(container.querySelectorAll('.tab-btn'));
    const idx = tabs.indexOf(tabBtn);
    let nextIdx = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = tabs.length - 1;
    }

    if (nextIdx >= 0) {
      tabs[nextIdx].focus();
      switchTab(tabs[nextIdx].dataset.tab);
    }
  });
}

/**
 * Bind keyboard + click handlers for timeline/accordion toggles,
 * switch checkboxes, and stats period radiogroup.
 *
 * @param {Element} container -- panel root
 * @param {(toggleEl: Element) => void} toggleTimeline -- timeline toggler
 * @param {(subId: string, chevId: string) => void} toggleSub -- sub-accordion toggler
 */
export function bindAccessibilityHandlers(container, toggleTimeline, toggleSub) {
  /* Click: timeline / sub-accordion */
  container.addEventListener('click', (e) => {
    const tl = e.target.closest('[data-timeline]');
    if (tl) { toggleTimeline(tl); return; }
    const sub = e.target.closest('[data-sub-toggle]');
    if (sub) { toggleSub(sub.dataset.subId, sub.dataset.chevId); return; }
  });

  /* Keyboard: Enter/Space activate toggles + vacancy items */
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const tl = e.target.closest('[data-timeline]') || e.target.closest('[data-sub-toggle]');
      if (tl) { e.preventDefault(); tl.click(); return; }
      const vacItem = e.target.closest('.vacancy-item');
      if (vacItem) {
        e.preventDefault();
        const navLink = vacItem.querySelector('[data-action="navigate"]');
        if (navLink) navLink.click();
      }
    }
  });

  /* Switch checkbox: sync aria-checked on change */
  container.addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.matches('input[type="checkbox"][role="switch"]')) {
      cb.setAttribute('aria-checked', cb.checked ? 'true' : 'false');
    }
  });

  /* Stats period radiogroup: arrow key navigation */
  container.addEventListener('keydown', (e) => {
    const radio = e.target.closest('[role="radio"]');
    if (!radio) return;
    const group = radio.closest('[role="radiogroup"]');
    if (!group) return;
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    const idx = radios.indexOf(radio);
    let nextIdx = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); nextIdx = (idx + 1) % radios.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); nextIdx = (idx - 1 + radios.length) % radios.length;
    }

    if (nextIdx >= 0) {
      radios[nextIdx].focus();
      radios[nextIdx].click();
    }
  });

  /* Stats period radiogroup: click syncs aria-checked + active class */
  container.addEventListener('click', (e) => {
    const radio = e.target.closest('[role="radio"]');
    if (!radio) return;
    const group = radio.closest('[role="radiogroup"]');
    if (!group) return;
    group.querySelectorAll('[role="radio"]').forEach(r => {
      const isActive = r === radio;
      r.setAttribute('aria-checked', isActive ? 'true' : 'false');
      r.classList.toggle('active', isActive);
      r.classList.toggle('btn-primary', isActive);
      r.classList.toggle('btn-outline', !isActive);
    });
  });
}

/**
 * Filter vacancies by search, status, score, schedule, and ad flag.
 * Reads filter inputs from the shadow DOM and shows/hides .vacancy-item
 * elements in #har-vlist.
 */
export function filterVacancies() {
  const search = (refs.shadowRoot?.getElementById('vac-search')?.value || '').toLowerCase();
  const status = refs.shadowRoot?.getElementById('vac-status-filter')?.value || 'all';
  const minScore = parseInt(refs.shadowRoot?.getElementById('vac-score-range')?.value || '0', 10);

  // Schedule filter -- find active pill
  const sr = refs.shadowRoot;
  const activeScheduleBtn = sr?.querySelector('.vac-schedule-btn.btn-primary');
  const schedule = activeScheduleBtn?.dataset.schedule || 'all';

  // Hide ads checkbox
  const hideAds = sr?.getElementById('vac-hide-ads')?.checked || false;

  const items = sr?.querySelectorAll('#har-vlist .vacancy-item');
  items?.forEach(item => {
    const title = (item.dataset.title || '').toLowerCase();
    const itemStatus = item.dataset.status || 'new';
    const itemScore = parseInt(item.dataset.score || '0', 10);
    const itemSchedule = item.dataset.schedule || 'unknown';
    const itemIsAd = item.dataset.isad === '1';

    const matchTitle = !search || title.includes(search);
    const matchStatus = status === 'all' || itemStatus === status;
    const matchScore = itemScore >= minScore;
    const matchSchedule = schedule === 'all' || itemSchedule === schedule;
    const matchAd = !hideAds || !itemIsAd;

    item.style.display = (matchTitle && matchStatus && matchScore && matchSchedule && matchAd) ? '' : 'none';
  });
}
