/**
 * UI: TABS -- RESUMES (compatibility shim)
 * =========================================
 * Delegates to split modules under ./resumes/.
 * This file exists for backward compatibility with existing imports.
 */

export {
  renderResumePanel,
  renderMyResumesPanel,
  renderResumeListPanel
} from './resumes/index.js';

export { getResumePageType } from '../../parsers/resume-detail.js';
