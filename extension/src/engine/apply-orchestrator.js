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

import { createLogger } from "../lib/anti-hallucination.js";
import rateLimiter from "../lib/rate-limiter.js";
import {
  getAllSettings,
  getSkippedVacancies,
  incrementApplied,
  isAlreadyApplied,
  markAsApplied,
  markAsSkipped,
} from "../lib/storage.js";
import {
  clickApplyButton,
  setActiveResumeForCoverLetter,
  waitForPageReady,
  waitForPopupAndSubmit,
} from "./apply-actions.js";
import { getQueue, processNextInQueue, setQueue } from "./apply-queue.js";

const autoLog = createLogger("AutoRespond");

/**
 * Apply to a single vacancy by ID.
 * Saves to queue and navigates to the vacancy page.
 * @param {string} vacancyId
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function applyToVacancy(vacancyId, resume) {
  autoLog.info("Apply to vacancy: " + vacancyId);

  // Set resume for cover letter generation before navigating
  if (resume) {
    setActiveResumeForCoverLetter(resume);
  }

  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) {
    autoLog.warn(rateCheck.reason);
    return { success: false, reason: rateCheck.reason };
  }
  if (await isAlreadyApplied(vacancyId)) return { success: false, reason: "Уже откликнулся" };

  // Save to queue so after page reload we know what to do
  const queue = await getQueue();
  if (!queue.find((q) => q.vacancyId === vacancyId)) {
    queue.push({ vacancyId, timestamp: Date.now() });
    await setQueue(queue);
  }

  // Navigate to vacancy page
  const url = "https://hh.ru/vacancy/" + vacancyId;
  autoLog.info("Navigating to: " + url);
  window.location.href = url;
  return { success: false, reason: "Переход на страницу вакансии..." };
}

/**
 * Continue the apply process after navigating to a vacancy page.
 * Called on vacancy page load. Finds and clicks the apply button,
 * handles the popup, and processes the next item in queue.
 * @param {{vacancyId: string}} pending - Queue item for the current vacancy
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function continueApply(pending) {
  autoLog.info("Continue apply on vacancy page: " + pending.vacancyId);

  // Verify we're on the correct vacancy page
  const expectedPath = "/vacancy/" + pending.vacancyId;
  const actualPath = window.location.pathname;
  if (!actualPath.includes(pending.vacancyId)) {
    autoLog.warn("Wrong page: expected " + expectedPath + " got " + actualPath);
    auditApply(pending.vacancyId, "failed", "Не на странице вакансии");
    return { success: false, reason: "Не на странице вакансии" };
  }

  // Dry-run rehearsal flag (settings) -- no real applies downstream
  const settings = await getAllSettings();
  const dryRun = settings.dryRun === true;

  // Wait for page to fully render
  await waitForPageReady();
  autoLog.info("Page ready, looking for apply button...");

  // Try to find and click the apply button
  const applyResult = await clickApplyButton({ dryRun });
  if (!applyResult.clicked) {
    autoLog.error("Could not find/click apply button: " + applyResult.reason);
    await markAsSkipped(pending.vacancyId, "no-apply-button: " + applyResult.reason);
    auditApply(pending.vacancyId, "skipped", "no-apply-button: " + applyResult.reason);
    return { success: false, reason: applyResult.reason, skipped: true };
  }

  // Wait for popup/modal to appear
  autoLog.info("Apply button clicked, waiting for popup...");
  const popupResult = await waitForPopupAndSubmit({ dryRun });
  if (!popupResult.success) {
    autoLog.warn("Popup handling: " + popupResult.reason);
    // Click happened (action on hh.ru) but submission unconfirmed -- honest outcome
    await markAsSkipped(pending.vacancyId, "popup-not-handled: " + popupResult.reason);
    rateLimiter.recordAction();
    auditApply(pending.vacancyId, "skipped", "popup-not-handled: " + popupResult.reason);
    return { success: false, reason: popupResult.reason, skipped: true };
  }

  if (dryRun) {
    autoLog.info("DRY-RUN: would apply to " + pending.vacancyId);
    await processNextInQueue();
    return { success: true, dryRun: true };
  }

  // Success!
  rateLimiter.recordAction();
  await incrementApplied();
  await markAsApplied(pending.vacancyId);
  autoLog.info("Successfully applied to vacancy " + pending.vacancyId);
  auditApply(pending.vacancyId, "applied", "");

  // Process next in queue after delay
  await processNextInQueue();
  return { success: true };
}

/**
 * Fire-and-forget audit entry to background "log" case.
 * Never throws (headless/test env without chrome -- silent).
 */
function auditApply(vacancyId, outcome, reason) {
  try {
    chrome.runtime.sendMessage({ type: "log", entry: { action: "apply", vacancyId, outcome, reason } });
  } catch (_e) {}
}

/**
 * Preview mass apply: filter/sort eligible vacancies without side effects.
 * No setQueue, no navigation -- returns ids for user confirmation.
 * @param {Array} vacancies - List of vacancy objects
 * @param {number} [minScore=70] - Minimum match score to apply
 * @returns {Promise<{ok: boolean, queue: string[], skippedPreviously: number, minScore: number, reason?: string}>}
 */
export async function previewApplyAll(vacancies, minScore) {
  minScore = minScore || 70;

  const eligible = (vacancies || [])
    .filter((v) => v.status === "new" && v.hasReply)
    .filter((v) => v.matchScore === null || v.matchScore >= minScore)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  if (eligible.length === 0) {
    autoLog.info("No eligible vacancies for mass apply");
    return { ok: false, queue: [], skippedPreviously: 0, minScore, reason: "Нет подходящих вакансий" };
  }

  autoLog.info("Mass apply preview: " + eligible.length + " vacancies (score >= " + minScore + ")");

  // Single bulk read of skipped list (no per-item storage round-trips).
  const skippedIds = new Set((await getSkippedVacancies()).map((s) => s && s.id));
  const prevSkipped = [];
  const queue = [];
  for (const v of eligible) {
    if (await isAlreadyApplied(v.id)) continue;
    if (skippedIds.has(v.id)) {
      prevSkipped.push(v);
      continue;
    }
    queue.push(v.id);
  }

  if (queue.length === 0) {
    return {
      ok: false,
      queue: [],
      skippedPreviously: prevSkipped.length,
      minScore,
      reason: "Все вакансии уже в очереди/откликнуты",
    };
  }

  return { ok: true, queue, skippedPreviously: prevSkipped.length, minScore };
}

/**
 * Start mass apply from a previewed id list: persist queue, rate-check, navigate.
 * @param {string[]} queueIds - Vacancy ids from previewApplyAll
 * @param {Object} [resume] - Active resume for cover letter generation
 * @returns {Promise<{processed: number, skippedPreviously?: number, reason?: string}>}
 */
export async function startApplyAll(queueIds, resume) {
  // Set resume for cover letter generation before navigating
  if (resume) {
    setActiveResumeForCoverLetter(resume);
  }

  const queue = (queueIds || []).map((id) => ({ vacancyId: id, timestamp: Date.now() }));
  if (queue.length === 0) {
    return { processed: 0, reason: "Пустая очередь" };
  }

  await setQueue(queue);
  autoLog.info("Queue set: " + queue.length + " vacancies");

  // Start with the first vacancy
  const first = queue[0];
  const rateCheck = await rateLimiter.check();
  if (!rateCheck.allowed) {
    autoLog.warn("Rate limit: " + rateCheck.reason);
    return { processed: 0, reason: rateCheck.reason };
  }

  // Navigate to first vacancy
  const url = "https://hh.ru/vacancy/" + first.vacancyId;
  autoLog.info("Starting mass apply, navigating to: " + url);
  window.location.href = url;
  return { processed: 0, reason: "Переход на первую вакансию (очередь: " + queue.length + ")" };
}

/**
 * Apply to all eligible vacancies (mass apply).
 * Thin wrapper: preview + start. Kept for backward compatibility.
 * @param {Array} vacancies - List of vacancy objects
 * @param {number} [minScore=70] - Minimum match score to apply
 * @returns {Promise<{processed: number, skippedPreviously?: number, reason?: string}>}
 */
export async function applyToAll(vacancies, minScore, resume) {
  const preview = await previewApplyAll(vacancies, minScore);
  if (!preview.ok) {
    return { processed: 0, skippedPreviously: preview.skippedPreviously, reason: preview.reason };
  }
  const started = await startApplyAll(preview.queue, resume);
  return { ...started, skippedPreviously: preview.skippedPreviously };
}
