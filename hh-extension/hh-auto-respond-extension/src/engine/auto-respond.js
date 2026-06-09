/**
 * ENGINE: AUTO-RESPOND
 * ========================
 * Handles automated vacancy apply workflow:
 * rate limiting, navigation, and apply actions.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import rateLimiter from '../lib/rate-limiter.js';
import { isAlreadyApplied, incrementApplied, markAsApplied } from '../lib/storage.js';
import { randomDelay } from '../lib/timing.js';

const autoLog = createLogger('AutoRespond');

export async function applyToVacancy(vacancyId) {
  autoLog.info('Apply to vacancy: ' + vacancyId);
  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) { autoLog.warn(rateCheck.reason); return { success: false, reason: rateCheck.reason }; }
  if (await isAlreadyApplied(vacancyId)) return { success: false, reason: 'Already applied' };
  const limitCheck = await incrementApplied();
  if (!limitCheck.allowed) return { success: false, reason: 'Daily limit' };

  // Navigate to vacancy page
  const url = 'https://hh.ru/vacancy/' + vacancyId;
  await chrome.storage.local.set({ pendingApply: { vacancyId, timestamp: Date.now() } });
  window.location.href = url;
  return { success: false, reason: 'Navigating (page reload expected)' };
}

export async function continueApply(pending) {
  autoLog.info('Continue apply on vacancy page');
  // Will be implemented: click reply, fill letter, submit
  // For now just verify and mark
  await markAsApplied(pending.vacancyId);
  return { success: true };
}

export async function applyToAll(vacancies, minScore) {
  minScore = minScore || 60;
  const eligible = vacancies.filter(v => v.status === 'new' && v.hasReply)
    .filter(v => v.matchScore === null || v.matchScore >= minScore)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  autoLog.info('Auto-apply ' + eligible.length + ' vacancies (score >= ' + minScore + ')');
  for (const v of eligible) {
    const rc = await rateLimiter.check();
    if (!rc.allowed) break;
    await applyToVacancy(v.id);
    await randomDelay();
  }
}
