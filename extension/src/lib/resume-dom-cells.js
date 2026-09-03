/**
 * LIB: RESUME DOM CELLS
 * =====================
 * Shared low-level readers for hh.ru resume DOM cells (cell-left-side /
 * cell-text-content). Single home for the position/period/company/duration
 * parsing used by experience strategies (DOM + iframe) and company cards.
 */

const PERIOD_SUFFIX_PATTERN = /\s*\(\d[^)]+\)$/;

/** Read trimmed cell-text-content strings from a cell-left-side element. */
export function readCellTexts(cellLeft) {
  const texts = [];
  cellLeft.querySelectorAll('[data-qa="cell-text-content"]').forEach((el) => {
    texts.push((el.textContent || "").trim());
  });
  return texts;
}

/** Strip trailing "(N ...)" duration suffix from a period string. */
export function stripDurationSuffix(period) {
  return period.replace(PERIOD_SUFFIX_PATTERN, "").trim();
}

/**
 * Parse { position, period } from a stepper item element.
 * Returns null when the item has no cell-left-side container.
 */
export function parseStepperJob(step) {
  const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
  if (!cellLeft) return null;
  const texts = readCellTexts(cellLeft);
  const job = {};
  if (texts.length >= 1) job.position = texts[0];
  if (texts.length >= 2) job.period = stripDurationSuffix(texts[1]);
  return job;
}

/** Parse { company, duration } from a company card element. */
export function parseCardHead(card) {
  const job = {};
  const cellLeft = card.querySelector('[data-qa="cell-left-side"]');
  if (!cellLeft) return job;
  const texts = readCellTexts(cellLeft);
  if (texts.length >= 1) job.company = texts[0];
  if (texts.length >= 2) job.duration = texts[1];
  return job;
}

/** Deduplicate DOM elements, preserving first-occurrence order. */
export function dedupElements(elements) {
  const seen = new Set();
  const unique = [];
  elements.forEach((el) => {
    if (!seen.has(el)) {
      seen.add(el);
      unique.push(el);
    }
  });
  return unique;
}

/**
 * Strategy 1: parse company cards with parseFn, collect stepper elements.
 * Appends entries, marks used stepper subtrees.
 */
export function parseCardsInto(cards, parseFn, entries, used) {
  cards.forEach((card) => {
    const job = parseFn(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) used.add(stepEl);
  });
}

/**
 * Strategy 2: parse stepper items NOT covered by company cards.
 * Pushes jobs that have a position or a period.
 */
export function parseUncoveredSteppers(stepperItems, used, uniqueCards, entries) {
  stepperItems.forEach((step) => {
    if (used.has(step)) return;
    const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
    if (parentCard && uniqueCards.includes(parentCard)) return;
    const job = parseStepperJob(step);
    if (job && (job.position || job.period)) entries.push(job);
  });
}

/** Strategy 3: parse all stepper items, keep jobs with a position. */
export function parseStepperFallback(allStepperItems, entries) {
  allStepperItems.forEach((step) => {
    const job = parseStepperJob(step);
    if (job && job.position) entries.push(job);
  });
}

/**
 * Collect personal-data candidate texts from a position card
 * plus neighbouring title container (deduped, length-capped).
 */
export function collectPersonalTexts(scopeEl, titleEl) {
  const personalText = [];
  if (scopeEl) {
    scopeEl.querySelectorAll("span, div, p, a").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t && t.length > 0 && t.length < 200) personalText.push(t);
    });
  }
  const titleContainer = titleEl ? titleEl.closest("div[data-qa], section") || titleEl.parentElement : null;
  if (titleContainer) {
    titleContainer.querySelectorAll("span, div, p, a").forEach((el) => {
      if (el === titleEl || titleEl.contains(el)) return;
      const t = (el.textContent || "").trim();
      if (t && t.length > 0 && t.length < 200 && !personalText.includes(t)) personalText.push(t);
    });
  }
  return personalText;
}
