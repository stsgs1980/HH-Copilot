/**
 * LIB: STORAGE (barrel)
 * =======================
 * Re-exports all storage functions from focused sub-modules.
 *
 *   storage-settings.js — defaults, settings, stats, daily reset
 *   storage-queue.js    — resumes, queues, blacklist, apply tracking
 *   storage-vacancies.js — vacancy details, match scores
 */

export {
  DEFAULT_SETTINGS, DEFAULT_STATS,
  getAllSettings, getStats, incrementApplied, checkDailyReset
} from './storage-settings.js';

export {
  getAppliedVacancies, isAlreadyApplied, markAsApplied,
  getMyResumes, saveMyResume, saveMyResumes, clearMyResumes,
  getSyncQueue, setSyncQueue, dequeueSyncItem, clearSyncQueue,
  getActiveResume, setActiveResume, clearActiveResume,
  getApplyQueue, setApplyQueue,
  getBlacklistedCompanies, setBlacklistedCompanies, addBlacklistedCompany, removeBlacklistedCompany
} from './storage-queue.js';

export {
  getVacancyDetails, getVacancyDetail, saveVacancyDetail,
  removeVacancyDetail, clearVacancyDetails,
  getVacancyScores, saveVacancyScore, getVacancyScore
} from './storage-vacancies.js';
