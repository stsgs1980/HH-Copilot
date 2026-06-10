/**
 * ENGINE: AUTO-RESPOND
 * ========================
 * Handles automated vacancy apply workflow:
 * rate limiting, navigation, click-based apply actions.
 *
 * STRATEGY:
 * 1. applyToVacancy(id) — saves to queue + navigates to vacancy page
 * 2. On vacancy page load → continueApply() → find "Откликнуться" button → click
 * 3. Wait for popup → click submit → mark applied → process next in queue
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { findElement, findAllElements } from '../lib/selectors.js';
import rateLimiter from '../lib/rate-limiter.js';
import { isAlreadyApplied, incrementApplied, markAsApplied } from '../lib/storage.js';
import { randomDelay, simulateReading } from '../lib/timing.js';

const autoLog = createLogger('AutoRespond');

// ═══════════════════════════════════════════════
// APPLY QUEUE (persisted in chrome.storage)
// ═══════════════════════════════════════════════

async function getQueue() {
  try {
    const d = await chrome.storage.local.get('applyQueue');
    return d.applyQueue || [];
  } catch (e) { return []; }
}

async function setQueue(queue) {
  await chrome.storage.local.set({ applyQueue: queue });
}

async function dequeueNext() {
  const queue = await getQueue();
  if (queue.length === 0) return null;
  const next = queue[0];
  await setQueue(queue.slice(1));
  return next;
}

async function clearQueue() {
  await chrome.storage.local.remove('applyQueue');
}

// ═══════════════════════════════════════════════
// SINGLE APPLY
// ═══════════════════════════════════════════════

export async function applyToVacancy(vacancyId) {
  autoLog.info('Apply to vacancy: ' + vacancyId);
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

// ═══════════════════════════════════════════════
// CONTINUE APPLY (called on vacancy page load)
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// FIND & CLICK APPLY BUTTON
// ═══════════════════════════════════════════════

async function waitForPageReady() {
  // Wait for vacancy title or main content to appear
  for (let i = 0; i < 30; i++) {
    const title = findElement('vacancyTitleOnPage');
    if (title) return;
    await new Promise(r => setTimeout(r, 500));
  }
  // Even if title not found by selector, page might still be loaded
  autoLog.warn('Timeout waiting for vacancy title, proceeding anyway');
}

async function clickApplyButton() {
  // Strategy: try multiple known selectors for the "Откликнуться" button
  // on vacancy detail pages

  const applySelectors = [
    // Primary: Magritte-style button
    '[data-qa="vacancy-response-apply"]',
    // Alternative: link/button variants
    '[data-qa="vacancy-response-link-top"]',
    'a[data-qa="vacancy-response-apply"]',
    'button[data-qa="vacancy-response-apply"]',
    // Fallback: look for text content "Откликнуться"
    'a[href*="/vacancy/response"]',
    // Bloko-style older UI
    '.vacancy-response-btn',
    '[class*="vacancy-response"] button',
    '[class*="vacancy-response"] a',
  ];

  // First, check if already applied
  const alreadyApplied = findElement('alreadyApplied');
  if (alreadyApplied) {
    return { clicked: false, reason: 'Вы уже откликнулись' };
  }

  // Also check for archived/removed vacancy
  const vacancyBody = document.querySelector('[data-qa="vacancy-description"]');
  if (!vacancyBody && document.body.textContent.includes('Вакансия недоступна')) {
    return { clicked: false, reason: 'Вакансия недоступна/удалена' };
  }

  // Try each selector with retries
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const sel of applySelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        if (!document.body.contains(el)) continue;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        autoLog.info('Found apply button: ' + sel + ' (attempt ' + (attempt + 1) + ')');

        // Click with human-like delay
        await randomDelay();
        el.click();
        autoLog.info('Clicked apply button');
        return { clicked: true };
      } catch (e) { /* invalid selector, skip */ }
    }

    // Wait and retry if not found
    if (attempt < 2) {
      autoLog.info('Apply button not found, retrying in 1s...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Last resort: brute-force text search
  const allLinks = document.querySelectorAll('a, button');
  for (const el of allLinks) {
    const text = (el.textContent || '').trim().toLowerCase();
    if (text === 'откликнуться' || text === 'откликнуться на вакансию') {
      autoLog.info('Found apply button via text search: "' + text + '"');
      await randomDelay();
      el.click();
      return { clicked: true };
    }
  }

  // Dump DOM info for debugging
  autoLog.warn('No apply button found. URL: ' + window.location.href);
  const bodySnippet = document.body?.innerText?.substring(0, 500) || 'empty';
  autoLog.warn('Page snippet: ' + bodySnippet);

  return { clicked: false, reason: 'Кнопка "Откликнуться" не найдена на странице' };
}

// ═══════════════════════════════════════════════
// POPUP HANDLING
// ═══════════════════════════════════════════════

async function waitForPopupAndSubmit() {
  // After clicking "Откликнуться", a popup/modal should appear
  // We need to find the submit button and click it

  const popupSelectors = [
    '[data-qa="vacancy-response-submit-popup"]',
    '[data-qa="vacancy-response-popup-submit"]',
    'button[data-qa="vacancy-response-submit-popup"]',
    '[class*="response-popup"] button[type="submit"]',
    '[class*="response-popup"] [data-qa*="submit"]',
  ];

  // Wait for popup (up to 8 seconds)
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));

    for (const sel of popupSelectors) {
      try {
        const btn = document.querySelector(sel);
        if (!btn) continue;
        if (!document.body.contains(btn)) continue;

        const style = window.getComputedStyle(btn);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        autoLog.info('Found submit button in popup: ' + sel);

        // Check for optional cover letter input
        const letterInput = findElement('coverLetterInput');
        if (letterInput) {
          autoLog.info('Cover letter input found (skipping — empty letter)');
        }

        // Handle relocation warning if present
        const relocationBtn = findElement('relocationConfirm');
        if (relocationBtn) {
          autoLog.info('Confirming relocation warning...');
          relocationBtn.click();
          await new Promise(r => setTimeout(r, 500));
        }

        // Click submit
        await randomDelay();
        btn.click();
        autoLog.info('Clicked submit button');
        return { success: true };
      } catch (e) { /* skip */ }
    }
  }

  // Check if maybe the popup was a simple redirect (no popup needed)
  // or the page already shows "already applied"
  const alreadyEl = findElement('alreadyApplied');
  if (alreadyEl) {
    autoLog.info('Popup not needed — already applied indicator found');
    return { success: true };
  }

  autoLog.warn('Popup/submit button not found after 8s');
  return { success: false, reason: 'Попап не появился или кнопка отправки не найдена' };
}

// ═══════════════════════════════════════════════
// MASS APPLY
// ═══════════════════════════════════════════════

export async function applyToAll(vacancies, minScore) {
  minScore = minScore || 70;
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

// ═══════════════════════════════════════════════
// QUEUE PROCESSING (after successful apply)
// ═══════════════════════════════════════════════

async function processNextInQueue() {
  const queue = await getQueue();
  if (queue.length === 0) {
    autoLog.info('Queue empty — mass apply complete');
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
  if (age > 600000) { // 10 minutes — skip stale queue items
    autoLog.warn('Queue item too old, skipping');
    await processNextInQueue();
    return;
  }

  autoLog.info('Processing next: vacancy ' + next.vacancyId);
  const url = 'https://hh.ru/vacancy/' + next.vacancyId;
  window.location.href = url;
}
