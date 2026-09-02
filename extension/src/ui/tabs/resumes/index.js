/**
 * UI: RESUMES -- Barrel Export
 * =============================
 * Re-exports from split modules for backward compatibility.
 */

export { renderMyResumesPanel, renderResumeListPanel } from "./render-my-resumes.js";
export { renderResumePanel } from "./render-resume-panel.js";
export {
  attachSubToggle,
  buildGrid,
  buildSubAccordion,
  getInitials,
  toggleSub,
  updateSkillGapSection,
  updateSkillsSection,
} from "./resume-helpers.js";
export {
  buildContactsSection,
  buildEducationSection,
  buildExperienceSection,
  buildLanguagesSection,
  buildPersonalSection,
  buildSalarySection,
} from "./section-builders.js";
