/**
 * ENGINE: APPLY ORCHESTRATOR
 * ========================
 * Public API for the automated vacancy apply workflow.
 * Orchestrates queue management, page navigation, and DOM actions.
 *
 * STRATEGY:
 * 1. applyToVacancy(id) -- saves to queue + navigates to vacancy page
 * 2. On vacancy page load -> continueApply() -> find "Откликнуться" button -> click
 * 3. Wait for popup -> click submit -> mark applied -> process next in queue
 */

import { createLogger } from '../lib/anti-hallucination.js';
import rateLimiter from '../lib/rate-limiter.js';
import { isAlreadyApplied, incrementApplied, markAsApplied } from '../lib/storage.js';
import { getQueue, setQueue, processNextInQueue } from './apply-queue.js';
import { waitForPageReady, clickApplyButton, waitForPopupAndSubmit, setActiveResumeForCoverLetter } from './apply-actions.js';

const autoLog = createLogger('AutoRespond');

/**
 * Apply to a single vacancy by ID.
 * Saves to queue and navigates to the vacancy page.
 * @param {string} vacancyId
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function applyToVacancy(vacancyId, resume) {
  autoLog.info('Apply to vacancy: ' + vacancyId);

  // Set resume for cover letter generation before navigating
  if (resume) {
    setActiveResumeForCoverLetter(resume);
  }

  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) { autoLog.warn(rateCheck.reason); return { success: false, reason: rateCheck.reason }; }
  if (await isAlreadyApplied(vacancyId)) return { success: false, reason: 'Уже откликнулся' };

  // Save to queue so after page reload we know what to do
  const queue = await getQueue();
  if (!queue.find(q => q.vacancyId === vacancyId)) {
    queue.push({ vacancyId, timestamp: Date.now() });
    await setQueue(queue);
  }

  // Navigate to vacancy page
  const url = 'https://hh.ru/vacancy/' + vacancyId;
  autoLog.info('Navigating to: ' + url);
  window.location.href = url;
  return { success: false, reason: 'Переход на страницу вакансии...' };
}

/**
 * Continue the apply process after navigating to a vacancy page.
 * Called on vacancy page load. Finds and clicks the apply button,
 * handles the popup, and processes the next item in queue.
 * @param {{vacancyId: string}} pending - Queue item for the current vacancy
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function continueApply(pending) {
  autoLog.info('Continue apply on vacancy page: ' + pending.vacancyId);

  // Verify we're on the correct vacancy page
  const expectedPath = '/vacancy/' + pending.vacancyId;
  const actualPath = window.location.pathname;
  if (!actualPath.includes(pending.vacancyId)) {
    autoLog.warn('Wrong page: expected ' + expectedPath + ' got ' + actualPath);
    return { success: false, reason: 'Не на странице вакансии' };
  }

  // Wait for page to fully render
  await waitForPageReady();
  autoLog.info('Page ready, looking for apply button...');

  // Try to find and click the apply button
  const applyResult = await clickApplyButton();
  if (!applyResult.clicked) {
    autoLog.error('Could not find/click apply button: ' + applyResult.reason);
    await markAsApplied(pending.vacancyId);
    return { success: false, reason: applyResult.reason };
  }

  // Wait for popup/modal to appear
  autoLog.info('Apply button clicked, waiting for popup...');
  const popupResult = await waitForPopupAndSubmit();
  if (!popupResult.success) {
    autoLog.warn('Popup handling: ' + popupResult.reason);
    // Even if popup submission failed, the click may have worked
    await markAsApplied(pending.vacancyId);
    rateLimiter.recordAction();
    return { success: true, reason: 'Клик выполнен (попап не обработан)' };
  }

  // Success!
  rateLimiter.recordAction();
  await incrementApplied();
  await markAsApplied(pending.vacancyId);
  autoLog.info('Successfully applied to vacancy ' + pending.vacancyId);

  // Process next in queue after delay
  await processNextInQueue();
  return { success: true };
}

/**
 * Apply to all eligible vacancies (mass apply).
 * Filters by status and match score, builds a queue, and starts processing.
 * @param {Array} vacancies - List of vacancy objects
 * @param {number} [minScore=70] - Minimum match score to apply
 * @returns {Promise<{processed: number, reason?: string}>}
 */
export async function applyToAll(vacancies, minScore, resume) {
  minScore = minScore || 70;

  // Set resume for cover letter generation before navigating
  if (resume) {
    setActiveResumeForCoverLetter(resume);
  }

  const eligible = vacancies.filter(v => v.status === 'new' && v.hasReply)
    .filter(v => v.matchScore === null || v.matchScore >= minScore)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  if (eligible.length === 0) {
    autoLog.info('No eligible vacancies for mass apply');
    return { processed: 0, reason: 'Нет подходящих вакансий' };
  }

  autoLog.info('Mass apply: ' + eligible.length + ' vacancies (score >= ' + minScore + ')');

  // Build queue with all eligible vacancies
  const queue = [];
  for (const v of eligible) {
    if (!await isAlreadyApplied(v.id)) {
      queue.push({ vacancyId: v.id, timestamp: Date.now() });
    }
  }

  if (queue.length === 0) {
    return { processed: 0, reason: 'Все вакансии уже в очереди/откликнуты' };
  }

  await setQueue(queue);
  autoLog.info('Queue set: ' + queue.length + ' vacancies');

  // Start with the first vacancy
  const first = queue[0];
  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) {
    autoLog.warn('Rate limit: ' + rateCheck.reason);
    return { processed: 0, reason: rateCheck.reason };
  }

  // Navigate to first vacancy
  const url = 'https://hh.ru/vacancy/' + first.vacancyId;
  autoLog.info('Starting mass apply, navigating to: ' + url);
  window.location.href = url;
  return { processed: 0, reason: 'Переход на первую вакансию (очередь: ' + queue.length + ')' };
}
