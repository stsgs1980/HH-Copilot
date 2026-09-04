/**
 * LIB: STORAGE (barrel)
 * =======================
 * Re-exports all storage functions from focused sub-modules.
 *
 *   storage-settings.js -- defaults, settings, stats, daily reset
 *   storage-queue.js    -- resumes, queues, blacklist, apply tracking
 *   storage-vacancies.js -- vacancy details, match scores
 */

export {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  checkDailyReset,
  getAllSettings,
  getStats,
  incrementApplied,
} from "./storage-settings.js";

export {
  addBlacklistedCompany,
  clearActiveResume,
  clearMyResumes,
  clearSyncQueue,
  dequeueSyncItem,
  getActiveResume,
  getAppliedVacancies,
  getApplyQueue,
  getBlacklistedCompanies,
  getMyResumes,
  getSkippedVacancies,
  getSyncQueue,
  isAlreadyApplied,
  isAlreadySkipped,
  markAsApplied,
  markAsSkipped,
  removeBlacklistedCompany,
  saveMyResume,
  saveMyResumes,
  setActiveResume,
  setApplyQueue,
  setBlacklistedCompanies,
  setSyncQueue,
} from "./storage-queue.js";

export {
  clearVacancyDetails,
  getVacancyDetail,
  getVacancyDetails,
  getVacancyScore,
  getVacancyScores,
  removeVacancyDetail,
  saveVacancyDetail,
  saveVacancyScore,
} from "./storage-vacancies.js";
