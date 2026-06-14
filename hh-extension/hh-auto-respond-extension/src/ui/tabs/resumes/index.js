/**
 * UI: RESUMES -- Barrel Export
 * =============================
 * Re-exports from split modules for backward compatibility.
 */

export { renderResumePanel } from './render-resume-panel.js';
export { renderMyResumesPanel, renderResumeListPanel } from './render-my-resumes.js';
export {
  getInitials, buildSubAccordion, buildGrid,
  toggleSub, attachSubToggle, updateSkillsSection, updateSkillGapSection
} from './resume-helpers.js';
export {
  buildPersonalSection, buildSalarySection,
  buildExperienceSection, buildEducationSection,
  buildLanguagesSection, buildContactsSection
} from './section-builders.js';
