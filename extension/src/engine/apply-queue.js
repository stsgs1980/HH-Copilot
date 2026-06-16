/**
 * ENGINE: APPLY QUEUE
 * ========================
 * Queue management for automated vacancy apply workflow.
 * Delegates storage to lib/storage.js for centralized access.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import rateLimiter from '../lib/rate-limiter.js';
import { simulateReading } from '../lib/timing.js';
import { getApplyQueue, setApplyQueue } from '../lib/storage.js';

const autoLog = createLogger('AutoRespond');

/**
 * Get the current apply queue.
 * @returns {Promise<Array<{vacancyId: string, timestamp: number}>>}
 */
export async function getQueue() {
  return getApplyQueue();
}

/**
 * Replace the entire apply queue.
 * @param {Array} queue
 */
export async function setQueue(queue) {
  await setApplyQueue(queue);
}

/**
 * Remove the first item from queue and return it.
 * @returns {Promise<{vacancyId: string, timestamp: number}|null>}
 */
export async function dequeueNext() {
  const queue = await getApplyQueue();
  if (queue.length === 0) return null;
  const next = queue[0];
  await setApplyQueue(queue.slice(1));
  return next;
}

/**
 * Clear the entire apply queue.
 */
export async function clearQueue() {
  await setApplyQueue([]);
}

/** Max age for a queue item before it's considered stale (10 minutes). */
const QUEUE_ITEM_MAX_AGE = 600000;

/**
 * Process the next item in the apply queue after a successful apply.
 * Checks rate limits, adds human-like delay, then navigates to next vacancy.
 */
export async function processNextInQueue() {
  const queue = await getApplyQueue();
  if (queue.length === 0) {
    autoLog.info('Queue empty -- mass apply complete');
    return;
  }

  autoLog.info('Queue has ' + queue.length + ' more vacancies');

  // Rate check before proceeding
  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) {
    autoLog.warn('Rate limit hit: ' + rateCheck.reason + '. Queue preserved for later.');
    return;
  }

  // Delay before next apply (human-like)
  await simulateReading();

  // Get next from queue and navigate
  const next = await dequeueNext();
  if (!next) return;

  const age = Date.now() - (next.timestamp || 0);
  if (age > QUEUE_ITEM_MAX_AGE) {
    autoLog.warn('Queue item too old, skipping');
    await processNextInQueue();
    return;
  }

  autoLog.info('Processing next: vacancy ' + next.vacancyId);
  const url = 'https://hh.ru/vacancy/' + next.vacancyId;
  window.location.href = url;
}
