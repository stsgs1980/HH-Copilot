/**
 * BARRIER: resume-detail/index.js
 * ==============================
 * Public API for resume-detail parser module.
 * Re-exports all functions from sub-modules.
 */
import { parseResume } from './parse-resume.js';
import { diagnoseResumeDOM } from './diagnose.js';
import { parseResumeList } from './resume-detail-list-parser.js';
import { debugVisibility } from './resume-detail-debug-vis.js';

/**
 * Determines the type of the current page based on URL pathname.
 */
export function getResumePageType() {
  const path = window.location.pathname;
  if (/\/resume\/[a-f0-9]+/.test(path)) return 'resume-detail';
  if (path.includes('/applicant/resumes')) return 'resume-list';
  return 'other';
}

/**
 * Clicks "Развернуть" / "Показать все" buttons on the resume page.
 */
export async function expandHiddenSections() {
  const expandButtons = document.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
  const clicked = [];
  expandButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('посмотреть всё') || text.includes('показать все') || text.includes('показать ещё') ||
        text.includes('посмотреть все') || text.includes('развернуть') || text.includes('expand')) {
      try { btn.click(); clicked.push(text); } catch (e) {}
    }
  });
  if (clicked.length > 0) {
    const resumeLog = (await import('../../lib/anti-hallucination.js')).createLogger('Resume');
    resumeLog.info('Expanded hidden sections: ' + clicked.join(', '));
    await new Promise(r => setTimeout(r, 1500));
  }
}

// Re-exports
export { parseResume, diagnoseResumeDOM, parseResumeList, debugVisibility };
