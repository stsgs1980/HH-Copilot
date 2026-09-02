/**
 * UI: RESUMES -- Main Resume Panel
 * =================================
 * Renders the parsed resume data in the sidebar resume tab.
 * Wireframe: 6 accordion sections + skills card + gap analysis card.
 */

import { setActiveResume } from "../../../lib/storage.js";
import { getResumePageType } from "../../../parsers/resume-detail.js";
import { panelState, refs, setActiveResumeState } from "../../state.js";
import { renderMyResumesPanel, renderResumeListPanel } from "./render-my-resumes.js";
import { updateAccordionHeader } from "./resume-accordion-header.js";
import { attachSubToggle, updateSkillsSection } from "./resume-helpers.js";
import { updateResumeScore } from "./resume-score.js";
import {
  buildContactsSection,
  buildEducationSection,
  buildExperienceSection,
  buildLanguagesSection,
  buildPersonalSection,
  buildSalarySection,
} from "./section-builders.js";

// ===============================================
// MAIN RESUME PANEL RENDER
// ===============================================

/**
 * Render the main resume panel in the sidebar.
 *
 * Shows either:
 *   - Empty state with contextual hint (based on page type)
 *   - Auto-selected first resume from synced list (if _resumeCleared is false)
 *   - Full resume display with 6 accordion sections + visibility warning
 *   - Resume list panel (if on /applicant/resumes with no active resume)
 *
 * Also triggers rendering of the "My Resumes" sync section.
 */
export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById("res-parsed-data");
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    const synced = panelState.myResumes || [];
    if (!panelState._resumeCleared && synced.length > 0 && synced[0].id) {
      setActiveResumeState(synced[0]);
      setActiveResume(synced[0]);
      renderResumePanel();
      return;
    }
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = "Выберите резюме ниже или перейдите на страницу резюме.";
    if (pageType === "resume-list") {
      hint = 'Нажмите "Синхронизировать все" ниже.';
    } else if (pageType === "resume-detail") {
      hint = 'Нажмите "Взять со страницы" ниже.';
    }
    container.innerHTML = '<div class="har-empty">Действующее резюме не выбрано.<br>' + hint + "</div>";
    updateAccordionHeader(null);
    return;
  }

  updateAccordionHeader(r);

  // Build 6 accordion sections matching wireframe
  const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
  container.innerHTML =
    '<div class="tl-item">' +
    buildPersonalSection(r) +
    "</div>" +
    '<div class="tl-item">' +
    buildSalarySection(r) +
    "</div>" +
    '<div class="tl-item">' +
    buildExperienceSection(r) +
    "</div>" +
    '<div class="tl-item">' +
    buildEducationSection(r) +
    "</div>" +
    '<div class="tl-item">' +
    buildLanguagesSection(r) +
    "</div>" +
    '<div class="tl-item">' +
    buildContactsSection(r) +
    "</div>" +
    (vis === "hidden"
      ? '<div style="font-size:10px;color:#92400e;padding:6px 4px 0 28px;">Скрытое резюме не видно работодателям -- мэтчинг недоступен</div>'
      : "");

  // Attach sub-accordion toggle listeners
  attachSubToggle("subPersonal", "chevPersonal");
  attachSubToggle("subSalary", "chevSalary");
  attachSubToggle("subExp", "chevExp");
  attachSubToggle("subEdu", "chevEdu");
  attachSubToggle("subLang", "chevLang");
  attachSubToggle("subContacts", "chevContacts");

  updateSkillsSection(r);
  updateResumeScore(r);
  renderMyResumesPanel();
}
