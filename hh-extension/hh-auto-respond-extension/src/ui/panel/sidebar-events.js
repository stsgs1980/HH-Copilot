/**
 * UI: PANEL — Sidebar Click Handler
 * ====================================
 * Click event delegation for the sidebar panel.
 * Extracted from events.js for anti-monolith compliance.
 */

import { panelState, refs } from '../state.js';
import { toggleSidebar, updateAuthStateAsync } from './index.js';
import { resetAuthCache } from '../auth.js';
import { clearResumeData, dumpResumeToConsole, testParseResume } from './panel-diagnostics.js';
import { addBlacklistItem, removeBlacklistItem, selectConversation } from './helpers.js';
import { diagnoseResumeDOM } from '../../parsers/resume-detail.js';
import { renderStats, clearLog } from '../tabs/stats.js';
import { renderNegotiationList } from '../tabs/negotiations.js';
import { renderResumePanel } from '../tabs/resumes.js';
import { startTour, restartTour, isTourDone } from '../../lib/tour-engine.js';
import { getWelcomeTourSteps, getTabTourSteps } from '../../lib/tour-steps.js';

/**
 * Bind sidebar click delegation — single click handler for all panel actions.
 */
export function bindSidebarClicks(container) {
  container.addEventListener('click', (e) => {
    const t = e.target;

    /* Close panel */
    if (t.closest('[data-action="close-panel"]')) { toggleSidebar(); return; }

    /* Tour */
    if (t.closest('[data-action="start-tour"]')) {
      const activeTab = refs.shadowRoot?.querySelector('.tab-btn.active');
      const tabId = activeTab?.dataset.tab;
      restartTour(tabId ? getTabTourSteps(tabId) : getWelcomeTourSteps());
      return;
    }

    /* Vacancy actions */
    const applyBtn = t.closest('[data-action="apply"]');
    if (applyBtn) { e.preventDefault(); window.dispatchEvent(new CustomEvent('hh-ar-apply', { detail: { vacancyId: applyBtn.dataset.id } })); return; }
    if (t.closest('[data-action="apply-all"]')) { window.dispatchEvent(new CustomEvent('hh-ar-apply-all')); return; }
    if (t.closest('[data-action="pause"]')) { window.dispatchEvent(new CustomEvent('hh-ar-toggle-status')); return; }
    if (t.closest('[data-action="refresh"]')) { window.dispatchEvent(new CustomEvent('hh-ar-refresh')); return; }

    /* Auth — reset cache to force real async re-check */
    if (t.closest('[data-action="check-auth"]')) { resetAuthCache(); updateAuthStateAsync(); return; }
    if (t.closest('#har-retry-auth')) { resetAuthCache(); updateAuthStateAsync(); return; }
    if (t.closest('#authIndicator')) { resetAuthCache(); updateAuthStateAsync(); return; }

    /* Logout */
    if (t.closest('[data-action="logout"]')) { window.location.href = 'https://hh.ru/account/logout'; return; }

    /* Resume */
    if (t.closest('[data-action="load-resume"]')) {
      const btn = t.closest('[data-action="load-resume"]');
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> Загрузка...';
        setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; }, 30000);
        const onDone = () => {
          setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; }, 300);
          window.removeEventListener('hh-ar-load-resume-done', onDone);
        };
        window.addEventListener('hh-ar-load-resume-done', onDone);
      }
      window.dispatchEvent(new CustomEvent('hh-ar-load-resume'));
      return;
    }
    if (t.closest('[data-action="reparse-resume"]')) {
      const btn = t.closest('[data-action="reparse-resume"]');
      const resume = panelState.resume;
      if (!resume || !resume.id) return;
      const resumeUrl = resume.url || ('https://hh.ru/applicant/resumes/view?resume=' + resume.id);
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span>';
        const onDone = () => {
          setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; }, 300);
          window.removeEventListener('hh-ar-load-resume-done', onDone);
        };
        window.addEventListener('hh-ar-load-resume-done', onDone);
        setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; window.removeEventListener('hh-ar-load-resume-done', onDone); }, 30000);
      }
      window.dispatchEvent(new CustomEvent('hh-ar-reparse-resume', { detail: { resumeUrl } }));
      return;
    }
    if (t.closest('[data-action="sync-resumes"]')) {
      const btn = t.closest('[data-action="sync-resumes"]');
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> Синхронизация...';
        const onDone = () => {
          setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; }, 300);
          window.removeEventListener('hh-ar-sync-done', onDone);
        };
        window.addEventListener('hh-ar-sync-done', onDone);
        setTimeout(() => { btn.disabled = false; btn.innerHTML = origHTML; window.removeEventListener('hh-ar-sync-done', onDone); }, 60000);
      }
      window.dispatchEvent(new CustomEvent('hh-ar-sync-resumes'));
      return;
    }
    if (t.closest('[data-action="analyze-skills"]')) { import('../tabs/resumes/resume-helpers.js').then(m => m.updateSkillGapSection(panelState.resume)); return; }
    if (t.closest('[data-action="clear-resume"]')) { clearResumeData(); return; }
    if (t.closest('[data-action="dump-resume"]')) { dumpResumeToConsole(); return; }
    if (t.closest('[data-action="test-parse"]')) { testParseResume(); return; }

    /* Quick action tab switches */
    const tabSwitch = t.closest('[data-tab-switch]');
    if (tabSwitch) { import('./events.js').then(m => m.switchTabPublic(tabSwitch.dataset.tabSwitch)); return; }

    /* Daily reset */
    if (t.closest('[data-action="reset-daily"]')) { window.dispatchEvent(new CustomEvent('hh-ar-reset-daily')); return; }

    /* Diagnose DOM */
    if (t.closest('[data-action="diagnose-dom"]')) { diagnoseResumeDOM(); return; }

    /* Blacklist */
    if (t.closest('[data-action="bl-add"]')) { addBlacklistItem(); return; }
    const blRemove = t.closest('[data-bl-remove]');
    if (blRemove) { removeBlacklistItem(blRemove.dataset.blRemove); return; }

    /* Clear log */
    if (t.closest('[data-action="clear-log"]')) { clearLog(); return; }

    /* Conversation select */
    const convItem = t.closest('[data-conv-id]');
    if (convItem) { selectConversation(convItem.dataset.convId); return; }
  });
}
