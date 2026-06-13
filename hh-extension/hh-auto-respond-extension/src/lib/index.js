// ═══════════════════════════════════════════════
// LIB MODULES — barrier index
// ═══════════════════════════════════════════════
// Re-exports public API.
// Import individual modules directly: import { findElement } from './selectors.js';

export { HH_SELECTORS, getSelectors, findElement, findAllElements } from './selectors.js';
export { safeGetText, safeGetAttr, validateVacancyData, extractVacancyId, waitForElement, safeClick, safeInput, createLogger } from './anti-hallucination.js';
export { DEFAULT_SETTINGS, DEFAULT_STATS, getAllSettings, getStats, incrementApplied, isAlreadyApplied, markAsApplied, checkDailyReset } from './storage.js';
export { gaussianRandom, randomDelay, simulateReading, simulateTyping } from './timing.js';
export { default as rateLimiter } from './rate-limiter.js';
