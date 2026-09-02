/**
 * UI: PANEL -- Sidebar Resume Handlers
 * =====================================
 * Resume action handlers extracted from sidebar-events.js for Rule 12.
 */

import { panelState } from "../state.js";
import { clearResumeData, dumpResumeToConsole, testParseResume } from "./panel-diagnostics.js";

export function handleResumeClick(t) {
  if (t.closest('[data-action="load-resume"]')) {
    const btn = t.closest('[data-action="load-resume"]');
    if (btn) {
      const origHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span> Загрузка...';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = origHTML;
      }, 30000);
      const onDone = () => {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }, 300);
        window.removeEventListener("hh-ar-load-resume-done", onDone);
      };
      window.addEventListener("hh-ar-load-resume-done", onDone);
    }
    window.dispatchEvent(new CustomEvent("hh-ar-load-resume"));
    return true;
  }
  if (t.closest('[data-action="reparse-resume"]')) {
    const btn = t.closest('[data-action="reparse-resume"]');
    const resume = panelState.resume;
    if (!resume || !resume.id) return true;
    const resumeUrl = resume.url || "https://hh.ru/applicant/resumes/view?resume=" + resume.id;
    if (btn) {
      const origHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span>';
      const onDone = () => {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }, 300);
        window.removeEventListener("hh-ar-load-resume-done", onDone);
      };
      window.addEventListener("hh-ar-load-resume-done", onDone);
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = origHTML;
        window.removeEventListener("hh-ar-load-resume-done", onDone);
      }, 30000);
    }
    window.dispatchEvent(new CustomEvent("hh-ar-reparse-resume", { detail: { resumeUrl } }));
    return true;
  }
  if (t.closest('[data-action="sync-resumes"]')) {
    const btn = t.closest('[data-action="sync-resumes"]');
    if (btn) {
      const origHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span> Синхронизация...';
      const onDone = () => {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }, 300);
        window.removeEventListener("hh-ar-sync-done", onDone);
      };
      window.addEventListener("hh-ar-sync-done", onDone);
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = origHTML;
        window.removeEventListener("hh-ar-sync-done", onDone);
      }, 60000);
    }
    window.dispatchEvent(new CustomEvent("hh-ar-sync-resumes"));
    return true;
  }
  if (t.closest('[data-action="analyze-skills"]')) {
    import("../tabs/resumes/resume-helpers.js").then((m) => m.updateSkillGapSection(panelState.resume));
    return true;
  }
  if (t.closest('[data-action="clear-resume"]')) {
    clearResumeData();
    return true;
  }
  if (t.closest('[data-action="dump-resume"]')) {
    dumpResumeToConsole();
    return true;
  }
  if (t.closest('[data-action="test-parse"]')) {
    testParseResume();
    return true;
  }
  return false;
}
