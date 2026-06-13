/**
 * LIB: RESUME FETCH RESUME — Diagnostics & Visibility
 * ======================================================
 * Pre-parse diagnostic logging and visibility decision resolution.
 * Split from resume-fetch-resume.js for anti-monolith compliance.
 */

import { createLogger } from './anti-hallucination.js';
import { VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN } from './resume-constants.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Log pre-parse diagnostic info (experience cards, date ranges, scripts).
 */
export function logPreParseDiagnostics(html, doc) {
  const preExpCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const preStepperItems = doc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
  const preShowAll = html.match(/Показать все|показать ещё|Посмотреть всё|Развернуть/gi);
  fetchLog.info('Pre-parse: ' + preExpCards.length + ' company-cards, ' +
    preStepperItems.length + ' stepper-items, ' +
    (preShowAll ? preShowAll.length : 0) + ' "show all" buttons in HTML');

  const expCardHtml = doc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCardHtml) {
    fetchLog.info('ExpCard HTML snippet (first 2000 chars): ' + expCardHtml.outerHTML.substring(0, 2000));
  }

  const MONTHS_RE = /(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}\s*[—\-–]\s*(?:(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}|настоящее\s*время|по\s+настоящее\s+время|сейчас|по\s+сейчас)/gi;
  const allDateRanges = html.match(MONTHS_RE) || [];
  fetchLog.info('Full HTML date ranges: ' + allDateRanges.length + ' found: ' + JSON.stringify(allDateRanges));

  const numDateRanges = html.match(/\d{2}\.\d{4}\s*[—\-–]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s*время|сейчас|по\s+сейчас)/gi) || [];
  fetchLog.info('Numeric date ranges: ' + numDateRanges.length + ' found: ' + JSON.stringify(numDateRanges));

  const scripts = doc.querySelectorAll('script:not([src])');
  let expScriptCount = 0;
  scripts.forEach(s => {
    const t = s.textContent || '';
    if (/experience|работ[аеы]|компани|должност|career/i.test(t)) {
      expScriptCount++;
      if (expScriptCount <= 3) fetchLog.info('Script with experience keywords (first 500 chars): ' + t.substring(0, 500));
    }
  });
  fetchLog.info('Scripts with experience keywords: ' + expScriptCount + ' of ' + scripts.length);
}

/**
 * Resolve visibility decision from multiple sources (page + list).
 */
export function resolveVisibilityDecision(resume, pageVis, listMeta, visDiagEntry) {
  const listVis = listMeta ? listMeta.visibility : 'no-list-meta';
  fetchLog.info('[VIS-DIAG] === Visibility decision for ' + (resume.id ? resume.id.substring(0, 8) : 'unknown') + ' ===');
  fetchLog.info('[VIS-DIAG] Sources: page=' + pageVis + ', list=' + listVis);

  if (pageVis === VISIBILITY_HIDDEN) {
    resume.visibility = VISIBILITY_HIDDEN; resume.hidden = true;
    visDiagEntry.decision = VISIBILITY_HIDDEN; visDiagEntry.decisionReason = 'page-detected-hidden';
  } else if (listMeta && listMeta.visibility === VISIBILITY_HIDDEN) {
    resume.visibility = VISIBILITY_HIDDEN; resume.hidden = true;
    visDiagEntry.decision = VISIBILITY_HIDDEN; visDiagEntry.decisionReason = 'list-detected-hidden (page=' + pageVis + ')';
  } else if (pageVis === VISIBILITY_VISIBLE) {
    resume.visibility = VISIBILITY_VISIBLE; resume.hidden = false;
    visDiagEntry.decision = VISIBILITY_VISIBLE; visDiagEntry.decisionReason = 'page-detected-visible';
  } else if (listMeta && listMeta.visibility === VISIBILITY_VISIBLE) {
    resume.visibility = VISIBILITY_VISIBLE; resume.hidden = false;
    visDiagEntry.decision = VISIBILITY_VISIBLE; visDiagEntry.decisionReason = 'list-detected-visible (page=UNKNOWN)';
  } else {
    resume.visibility = VISIBILITY_UNKNOWN; resume.hidden = false;
    visDiagEntry.decision = VISIBILITY_UNKNOWN; visDiagEntry.decisionReason = 'both-sources-unknown';
  }
  fetchLog.info('[VIS-DIAG] Decision: ' + visDiagEntry.decision + ' (' + visDiagEntry.decisionReason + ')');
}
