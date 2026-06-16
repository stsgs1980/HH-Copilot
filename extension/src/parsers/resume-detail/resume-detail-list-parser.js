/**
 * Resume list parser -- parses /applicant/resumes page from live DOM.
 * Split from resume-detail/index.js for anti-monolith compliance.
 */
import { createLogger } from '../../lib/anti-hallucination.js';
import {
  MIN_HASH_LEN, cleanResumeTitle,
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  RESUME_CARD_SELECTORS,
  detectVisibilityFromCard, detectVisibilityFromLinkText, findCardForLink,
  stripScripts, hasHiddenIndicator
} from '../../lib/resume-constants.js';

const resumeLog = createLogger('Resume');

/**
 * Parse resume list from the live DOM on /applicant/resumes.
 * Uses multiple strategies for visibility detection.
 */
export function parseResumeList() {
  const resumes = [];
  const links = document.querySelectorAll('a[href]');
  const seen = new Set();

  // Strategy 0: Link text detection (MOST RELIABLE for Magritte)
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
    if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
    if (!hashMatch) return;
    const id = hashMatch[1];
    if (id.length < MIN_HASH_LEN) return;
    if (seen.has(id)) return;
    seen.add(id);

    const rawLinkText = link.textContent || '';
    const title = cleanResumeTitle(rawLinkText, 'Без названия');
    const vis = detectVisibilityFromLinkText(rawLinkText);

    resumes.push({ id, title, url: href.startsWith('http') ? href : 'https://hh.ru' + href, visibility: vis.visibility, hidden: vis.hidden });
    resumeLog.info('  Link: ' + id.substring(0, 8) + '="' + title.substring(0, 30) + '"=' + vis.visibility + ' (method=' + vis.method + ')');
  });

  const allDetected = resumes.every(r => r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE);
  if (allDetected && resumes.length > 0) {
    resumeLog.info('Strategy 0: all ' + resumes.length + ' resumes detected from link text');
  } else {
    const unknownResumes = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    resumeLog.info('Strategy 0: ' + (resumes.length - unknownResumes.length) + ' detected, ' + unknownResumes.length + ' unknown -- trying data-qa cards');

    // Strategy 1: data-qa card containers
    let filled = 0;
    for (const sel of RESUME_CARD_SELECTORS) {
      const cards = document.querySelectorAll(sel);
      if (cards.length === 0) continue;
      resumeLog.info('Strategy 1: Found ' + cards.length + ' cards with selector: ' + sel);
      cards.forEach(card => {
        const cardLink = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
        if (!cardLink) return;
        const cardHref = cardLink.getAttribute('href') || '';
        let cardHashMatch = cardHref.match(/\/resume\/([a-f0-9]+)/);
        if (!cardHashMatch) cardHashMatch = cardHref.match(/[?&]resume=([a-f0-9]+)/);
        if (!cardHashMatch) return;
        const cardId = cardHashMatch[1];
        const resume = resumes.find(r => r.id === cardId);
        if (!resume || resume.visibility !== VISIBILITY_UNKNOWN) return;
        const result = detectVisibilityFromCard(card);
        resume.visibility = result.visibility;
        resume.hidden = result.hidden;
        filled++;
        resumeLog.info('  Card: ' + cardId.substring(0, 8) + '=' + result.visibility + ' (method=' + result.method + ')');
      });
      if (filled > 0) break;
    }

    // Strategy 2: DOM walking for remaining unknowns
    const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      resumeLog.info('Strategy 2: DOM walking for ' + stillUnknown.length + ' unknown resumes');
      stillUnknown.forEach(resume => {
        const link = document.querySelector('a[href*="' + resume.id + '"]');
        if (!link) return;
        const card = findCardForLink(link);
        if (card) {
          const result = detectVisibilityFromCard(card);
          resume.visibility = result.visibility;
          resume.hidden = result.hidden;
          resumeLog.info('  Walk: ' + resume.id.substring(0, 8) + '=' + result.visibility + ' (method=' + result.method + ')');
        }
      });
    }

    // Strategy 3: Proximity search for remaining unknowns
    const finalUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (finalUnknown.length > 0) {
      resumeLog.info('Strategy 3: proximity search for ' + finalUnknown.length + ' remaining unknowns');
      const pageHtml = stripScripts(document.body.innerHTML || '');
      const pageLower = pageHtml.toLowerCase();
      finalUnknown.forEach(resume => {
        const hashPos = pageLower.indexOf(resume.id.toLowerCase());
        if (hashPos === -1) return;
        let searchEnd = hashPos + 5000;
        resumes.forEach(other => {
          if (other.id === resume.id) return;
          const otherPos = pageLower.indexOf(other.id.toLowerCase());
          if (otherPos > hashPos && otherPos < searchEnd) searchEnd = otherPos;
        });
        const zone = pageLower.substring(Math.max(0, hashPos - 500), searchEnd);
        const isHidden = hasHiddenIndicator(zone);
        resume.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_VISIBLE;
        resume.hidden = isHidden;
        resumeLog.info('  Proximity: ' + resume.id.substring(0, 8) + '=' + resume.visibility);
      });
    }
  }

  // Summary
  const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
  if (stillUnknown.length > 0) {
    resumeLog.info('List visibility: ' + stillUnknown.length + ' resumes still UNKNOWN -- will be resolved by detail page detection');
  }
  const hiddenCount = resumes.filter(r => r.visibility === VISIBILITY_HIDDEN).length;
  const visibleCount = resumes.filter(r => r.visibility === VISIBILITY_VISIBLE).length;
  const unknownCount = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
  resumeLog.info('Resume list: ' + resumes.length + ' total (' + hiddenCount + ' hidden, ' + visibleCount + ' visible, ' + unknownCount + ' unknown)');

  return resumes;
}
