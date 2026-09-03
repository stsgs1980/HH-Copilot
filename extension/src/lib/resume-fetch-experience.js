/**
 * Experience parsing -- Strategies 1-3 (DOM-based).
 *
 * Parse experience entries from a DOM document using:
 * - Strategy 1: company cards (data-qa="profile-experience-company-card")
 * - Strategy 2: remaining stepper items not covered by company cards
 * - Strategy 3: fallback -- all stepper items directly
 */

import { parseCompanyCardFromDoc } from "./resume-fetch-parse.js";

/**
 * Parse experience entries from a DOM document using Strategies 1-3.
 * @param {Document} doc - Parsed document from DOMParser
 * @param {object} resume - Resume object to populate (experience, _debug)
 * @returns {Array} Parsed experience entries
 */
export function parseExperienceFromDocStrategies1to3(doc, resume) {
  const allCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const uniqueCards = dedupElements(allCards);

  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: parse company cards (each card wraps a stepper item)
  parseCardsInto(uniqueCards, parseCompanyCardFromDoc, entries, usedStepperElements);

  const expCard = doc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    resume._debug.found.push("experienceBlock");

    // Strategy 2: parse remaining stepper items NOT covered by company cards
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = entries.length;

    parseUncoveredSteppers(stepperItems, usedStepperElements, uniqueCards, entries);

    const stepperAdded = entries.length - alreadyParsed;
    if (stepperAdded > 0) {
      resume._debug.found.push("experience (stepper supplement): +" + stepperAdded);
    }

    // Strategy 3: if still 0 entries, try broader text-based parsing
    if (entries.length === 0) {
      const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      parseStepperFallback(allStepperItems, entries);
      if (entries.length > 0) {
        resume._debug.found.push("experience (stepper full fallback): " + entries.length);
      }
    }
  } else {
    resume._debug.missing.push("experienceBlock (no container, " + uniqueCards.length + " cards)");
  }

  return entries;
}
