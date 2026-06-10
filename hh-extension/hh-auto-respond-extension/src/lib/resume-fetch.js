/**
 * LIB: RESUME FETCH -- Fetch-based resume sync from ANY hh.ru page.
 * Flow: fetchResumeList() -> fetchAndParseResume() -> syncAllResumes()
 */

import { createLogger } from './anti-hallucination.js';
import { gaussianDelay } from './timing.js';
import { fetchHtml, htmlToDoc, safeGetText, extractResumeLinks, extractFromScripts, extractVisibilityStatus } from './resume-fetch-helpers.js';
import { parseCompanyCardFromDoc, parseEducationFromDoc, parsePersonalDataFromDoc } from './resume-fetch-parse.js';
import { TITLE_SUFFIX_NOISE, VISIBILITY_UNKNOWN } from './resume-constants.js';

const fetchLog = createLogger('ResumeFetch');

// ═══════════════════════════════════════════════
// PARSE RESUME LIST FROM FETCHED HTML
// ═══════════════════════════════════════════════

export async function fetchResumeList() {
  fetchLog.info('Fetching /applicant/resumes ...');
  let html;
  try {
    html = await fetchHtml('https://hh.ru/applicant/resumes');
  } catch (err) {
    fetchLog.error('Failed to fetch /applicant/resumes: ' + err.message);
    return [];
  }

  // Check if we got a login redirect (HTML too short = likely redirect page)
  if (!html || html.length < 500) {
    fetchLog.warn('Got very short response (' + (html ? html.length : 0) + ' chars), likely redirect');
    return [];
  }

  const doc = htmlToDoc(html);
  const allAnchors = doc.querySelectorAll('a[href]');
  fetchLog.info('Fetched HTML: ' + html.length + ' chars, ' + allAnchors.length + ' links');

  const resumes = extractResumeLinks(allAnchors);

  // Extract visibility status from raw HTML (proximity-based, not fragile DOM walking)
  extractVisibilityStatus(doc, resumes, html);

  // Fallback: try to find resume IDs in embedded script data (BEM/React hydration)
  if (resumes.length === 0) {
    fetchLog.info('No links found, trying embedded script data...');
    const scriptResumes = extractFromScripts(doc, html);
    if (scriptResumes.length > 0) return scriptResumes;
  }

  // Fallback: try parsing current page DOM if we're on /applicant/resumes
  if (resumes.length === 0 && window.location.pathname.includes('/applicant/resumes')) {
    fetchLog.info('No links from fetch, trying current page DOM...');
    const domLinks = document.querySelectorAll('a[href]');
    const domResumes = extractResumeLinks(domLinks);
    if (domResumes.length > 0) {
      fetchLog.info('Found ' + domResumes.length + ' resumes from current page DOM');
      return domResumes;
    }
  }

  fetchLog.info('Resume list: ' + resumes.length + ' resumes found');
  return resumes;
}

// ═══════════════════════════════════════════════
// PARSE SINGLE RESUME FROM FETCHED HTML
// ═══════════════════════════════════════════════

/**
 * Fetch and parse a single resume from its URL.
 * @param {string} resumeUrl - URL of the resume page
 * @param {object} [listMeta] - Optional metadata from the resume list
 *   (e.g. { visibility, hidden, title } from extractResumeLinks + extractVisibilityStatus)
 */
export async function fetchAndParseResume(resumeUrl, listMeta) {
  fetchLog.info('Fetching resume: ' + resumeUrl);
  const html = await fetchHtml(resumeUrl);
  const doc = htmlToDoc(html);

  fetchLog.info('Resume HTML: ' + html.length + ' chars');

  // Debug: count experience cards and stepper items in fetched HTML
  const preDoc = htmlToDoc(html);
  const preExpCards = preDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const preStepperItems = preDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
  const preShowAll = html.match(/Показать все|показать ещё|Посмотреть всё|Развернуть/gi);
  fetchLog.info('Pre-parse: ' + preExpCards.length + ' company-cards, ' +
    preStepperItems.length + ' stepper-items, ' +
    (preShowAll ? preShowAll.length : 0) + ' "show all" buttons in HTML');

  // Debug: dump experience section HTML snippet for analysis
  const expCardHtml = preDoc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCardHtml) {
    const snippet = expCardHtml.outerHTML.substring(0, 2000);
    fetchLog.info('ExpCard HTML snippet (first 2000 chars): ' + snippet);
  }

  // Debug: count ALL date-range patterns in the full HTML (not just experience section)
  const ENDINGS_CURRENT = 'настоящее\\s*время|по\\s+настоящее\\s+время|сейчас|по\\s+сейчас';
  const MONTHS_RE = /(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}\s*[—\-–]\s*(?:(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}|настоящее\s*время|по\s+настоящее\s+время|сейчас|по\s+сейчас)/gi;
  const allDateRanges = html.match(MONTHS_RE) || [];
  fetchLog.info('Full HTML date ranges: ' + allDateRanges.length + ' found: ' + JSON.stringify(allDateRanges));

  // Debug: also check for numeric date patterns like "01.2020" or "2020-2023"
  const numDateRanges = html.match(/\d{2}\.\d{4}\s*[—\-–]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s*время|сейчас|по\s+сейчас)/gi) || [];
  fetchLog.info('Numeric date ranges: ' + numDateRanges.length + ' found: ' + JSON.stringify(numDateRanges));

  // Debug: search for "experience" or "работ" in script tags
  const scripts = preDoc.querySelectorAll('script:not([src])');
  let expScriptCount = 0;
  scripts.forEach(s => {
    const t = s.textContent || '';
    if (/experience|работ[аеы]|компани|должност|career/i.test(t)) {
      expScriptCount++;
      if (expScriptCount <= 3) {
        fetchLog.info('Script with experience keywords (first 500 chars): ' + t.substring(0, 500));
      }
    }
  });
  fetchLog.info('Scripts with experience keywords: ' + expScriptCount + ' of ' + scripts.length);

  // Store HTML for diagnostic access
  window.__hhLastFetchHtml = html;
  window.__hhLastFetchDoc = doc;

  // Extract id from URL: /resume/{hex} or ?resume={hex}
  let hashMatch = resumeUrl.match(/\/resume\/([a-f0-9]+)/);
  if (!hashMatch) hashMatch = resumeUrl.match(/[?&]resume=([a-f0-9]+)/);
  const id = hashMatch ? hashMatch[1] : '';

  const resume = {
    id, url: resumeUrl,
    title: '', salary: '', gender: '', age: '', address: '',
    specializations: [], skills: [], skillLevels: {},
    experience: [], education: [], languages: [],
    additionalInfo: '', parsedAt: new Date().toISOString(),
    visibility: VISIBILITY_UNKNOWN,
    hidden: false,
    _debug: { found: [], missing: [] }
  };

  // Carry over metadata from the resume list (visibility status, etc.)
  if (listMeta) {
    if (listMeta.visibility) resume.visibility = listMeta.visibility;
    if (listMeta.hidden !== undefined) resume.hidden = listMeta.hidden;
    // Use list title as fallback if parseHeader finds nothing
    if (listMeta.title && listMeta.title !== 'Untitled') {
      resume._listTitle = listMeta.title;
    }
  }

  const dbg = (key, val) => {
    if (val) resume._debug.found.push(key + ': ' + (typeof val === 'string' ? '"' + val.substring(0, 60) + '"' : val));
    else resume._debug.missing.push(key);
    return val;
  };

  parseHeader(doc, dbg, resume);
  // Clean title: remove trailing noise like "Постоянная работа" that hh.ru appends
  if (resume.title) {
    resume.title = resume.title.replace(TITLE_SUFFIX_NOISE, '').trim();
  }
  parsePersonalDataFromDoc(doc, doc.querySelector('[data-qa="resume-block-title-position"]'), dbg, resume);
  parseSkillsFromDoc(doc, dbg, resume);
  await parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl);
  parseEducationFromDocSection(doc, dbg, resume);
  parseLanguagesAndAbout(doc, dbg, resume);

  fetchLog.info('Parsed: ' + resume.title + ' | Skills: ' + resume.skills.length +
    ' | Exp: ' + resume.experience.length + ' | Edu: ' + resume.education.length);
  return resume;
}

// ═══════════════════════════════════════════════
// SECTION PARSERS (delegated)
// ═══════════════════════════════════════════════

function parseHeader(doc, dbg, resume) {
  const titleEl = doc.querySelector('[data-qa="resume-block-title-position"]');
  if (titleEl) resume.title = dbg('resumeTitle (data-qa)', safeGetText(titleEl));
  if (!resume.title) {
    const h1 = doc.querySelector('h1');
    if (h1) resume.title = dbg('resumeTitle (h1)', (h1.textContent || '').trim());
  }
  const salaryEl = doc.querySelector('[data-qa="resume-block-salary"]');
  if (salaryEl) resume.salary = dbg('resumeSalary (data-qa)', safeGetText(salaryEl));
}

function parseSkillsFromDoc(doc, dbg, resume) {
  const skillsCard = doc.querySelector('[data-qa="skills-card"]');
  if (!skillsCard) {
    resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
    return;
  }
  resume._debug.found.push('skillsBlock (data-qa="skills-card")');
  const skillLevelEls = skillsCard.querySelectorAll('[data-qa^="skill-level-title-"]');
  skillLevelEls.forEach(el => {
    const qa = el.getAttribute('data-qa') || '';
    const lvlMatch = qa.match(/skill-level-title-(\d)/);
    if (lvlMatch) {
      const lvl = lvlMatch[1];
      const labels = { '3': 'Продвинутый', '2': 'Средний', '1': 'Начальный' };
      resume.skillLevels[lvl] = labels[lvl] || (el.textContent || '').trim();
      resume._debug.found.push('skillLevel' + lvl);
    }
  });
  skillsCard.querySelectorAll('[data-qa^="skill-tag-"], .bloko-tag__text').forEach(tag => {
    const text = (tag.textContent || '').trim();
    if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
      resume.skills.push(text);
    }
  });
  if (resume.skills.length > 0) {
    resume._debug.found.push('skills: ' + resume.skills.length + ' tags');
  }
}

async function parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl) {
  const allCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach(c => { if (!seen.has(c)) { seen.add(c); uniqueCards.push(c); } });

  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: parse company cards (each card wraps a stepper item)
  uniqueCards.forEach(card => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    // Track which stepper elements are already covered by company cards
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  const expCard = doc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    resume._debug.found.push('experienceBlock');

    // Strategy 2: parse remaining stepper items NOT covered by company cards
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = entries.length;

    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position || job.period) entries.push(job);
    });

    const stepperAdded = entries.length - alreadyParsed;
    if (stepperAdded > 0) {
      resume._debug.found.push('experience (stepper supplement): +' + stepperAdded);
    }

    // Strategy 3: if still 0 entries, try broader text-based parsing
    if (entries.length === 0) {
      const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      allStepperItems.forEach(step => {
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
        if (job.position) entries.push(job);
      });
      if (entries.length > 0) {
        resume._debug.found.push('experience (stepper full fallback): ' + entries.length);
      }
    }
  } else {
    resume._debug.missing.push('experienceBlock (no container, ' + uniqueCards.length + ' cards)');
  }

  // Strategy 4: Parse experience from raw HTML text patterns
  // hh.ru SSR may only render 3 company-cards but ALL date ranges are in the HTML
  // Look for date patterns like "январь 2020 — настоящее время" to find ALL experiences
  if (html && entries.length > 0) {
    const textParsed = parseExperienceFromHtmlText(html, entries.length);
    if (textParsed.length > entries.length) {
      fetchLog.info('Strategy 4 (text patterns): found ' + textParsed.length + ' experiences (was ' + entries.length + ')');
      resume._debug.found.push('experience (text pattern supplement): ' + textParsed.length);
      entries.length = 0;
      entries.push(...textParsed);
    }
  }

  // Strategy 5: Parse experience from Magritte <script> hydration JSON
  // IMPORTANT: Run ALWAYS (not just when entries === 0) because SSR only
  // renders 3 company-cards but script state may contain ALL experience data.
  if (html) {
    const scriptParsed = parseExperienceFromScripts(doc, html);
    if (scriptParsed.length > entries.length) {
      fetchLog.info('Strategy 5 (script JSON): found ' + scriptParsed.length + ' experiences (was ' + entries.length + ')');
      resume._debug.found.push('experience (script JSON): ' + scriptParsed.length);
      entries.length = 0;
      entries.push(...scriptParsed);
    } else if (scriptParsed.length > 0) {
      fetchLog.info('Strategy 5 (script JSON): found ' + scriptParsed.length + ' experiences (not more than ' + entries.length + ', skipping)');
    }
  }

  // Strategy 6: Fetch expanded experience via AJAX/API endpoints
  // hh.ru only renders 3 experience cards in SSR; the rest are loaded lazily
  // when the user clicks "Развернуть". We need to find that button's AJAX URL
  // and fetch the remaining experience entries.
  if (html && entries.length > 0 && entries.length < 20) {
    try {
      const expandedEntries = await fetchExpandedExperience(doc, html, resume.id, entries.length, resumeUrl);
      if (expandedEntries.length > entries.length) {
        fetchLog.info('Strategy 6 (expanded fetch): found ' + expandedEntries.length + ' experiences (was ' + entries.length + ')');
        resume._debug.found.push('experience (expanded fetch): ' + expandedEntries.length);
        entries.length = 0;
        entries.push(...expandedEntries);
      }
    } catch (err) {
      fetchLog.warn('Strategy 6 failed: ' + err.message);
    }
  }

  resume.experience = entries;
  if (entries.length > 0) resume._debug.found.push('experience: ' + entries.length);
  else resume._debug.missing.push('experience (0 entries)');
}

// ═══════════════════════════════════════════════
// STRATEGY 4: TEXT-BASED EXPERIENCE PARSING
// ═══════════════════════════════════════════════

/**
 * Parse experience entries from raw HTML using date-range text patterns.
 * hh.ru renders ALL experiences in the SSR HTML, but only the first N
 * have data-qa="profile-experience-company-card". The rest are in the HTML
 * but without proper data-qa wrappers.
 *
 * Strategy: find date ranges → extract surrounding text → build experience entries
 */
function parseExperienceFromHtmlText(html, alreadyFound) {
  // Russian month names used by hh.ru in date ranges
  const MONTHS = 'январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья]';
  const DATE_RANGE_RE = new RegExp(
    '(' + MONTHS + ')\\s*\\d{4}\\s*[—\\-–]\\s*(?:(' + MONTHS + ')\\s*\\d{4}|настоящее\\s*время|по\\s+настоящее\\s+время)',
    'gi'
  );

  // Also try numeric date patterns: "01.2020 — настоящее время"
  const NUM_DATE_RE = /\d{2}\.\d{4}\s*[—\-–]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s+время)/gi;

  // Search the ENTIRE HTML for date ranges first (section boundaries may be wrong)
  const allDateRanges = [];
  let match;
  while ((match = DATE_RANGE_RE.exec(html)) !== null) {
    allDateRanges.push({ index: match.index, text: match[0] });
  }
  // Also search for numeric dates
  while ((match = NUM_DATE_RE.exec(html)) !== null) {
    allDateRanges.push({ index: match.index, text: match[0] });
  }

  fetchLog.info('Text pattern: found ' + allDateRanges.length + ' date ranges in FULL HTML');

  if (allDateRanges.length <= alreadyFound) {
    fetchLog.info('Text pattern: no more date ranges than already found (' + alreadyFound + ')');
    return [];
  }

  // Try to find the experience section boundaries for context extraction
  const expStartPatterns = [
    /data-qa="resume-list-card-experience"/i,
    /<h[23][^>]*>.*?опыт\s+работы.*?<\/h[23]>/i,
    /data-qa="resume-block-experience"/i,
    /Опыт\s+работы/i,
  ];
  const expEndPatterns = [
    /data-qa="resume-list-card-education"/i,
    /data-qa="resume-block-education"/i,
    /<h[23][^>]*>.*?образование.*?<\/h[23]>/i,
    /Образование/i,
  ];

  let expStart = -1;
  for (const pat of expStartPatterns) {
    const m = html.match(pat);
    if (m) { expStart = m.index; break; }
  }

  let expEnd = html.length;
  if (expStart !== -1) {
    for (const pat of expEndPatterns) {
      const m = html.match(pat);
      if (m && m.index > expStart && m.index < expEnd) {
        expEnd = m.index;
      }
    }
  }

  fetchLog.info('Text pattern: experience section ' + expStart + '-' + expEnd);

  // Filter date ranges that are within the experience section (or near it)
  // If expStart is -1 (section not found), use all date ranges
  const expDateRanges = allDateRanges.filter(dr => {
    if (expStart === -1) return true;
    // Date range should be after the section start (with some margin)
    // and before the section end (with some margin)
    return dr.index >= expStart - 200 && dr.index <= expEnd + 200;
  });

  fetchLog.info('Text pattern: ' + expDateRanges.length + ' date ranges in experience section');

  if (expDateRanges.length <= alreadyFound) {
    return [];
  }

  // For each date range, extract the surrounding text to find position and company
  const entries = [];
  for (let i = 0; i < expDateRanges.length; i++) {
    const dr = expDateRanges[i];
    const searchBase = (expStart !== -1) ? html.substring(expStart, expEnd) : html;
    const searchOffset = (expStart !== -1) ? expStart : 0;
    const relIndex = dr.index - searchOffset;

    const lookBack = searchBase.substring(Math.max(0, relIndex - 800), relIndex);
    const nextIdx = (i + 1 < expDateRanges.length) ? expDateRanges[i + 1].index - searchOffset : searchBase.length;
    const lookForward = searchBase.substring(relIndex + dr.text.length, Math.min(nextIdx, relIndex + dr.text.length + 800));

    const textBefore = stripHtmlTags(lookBack);
    const textAfter = stripHtmlTags(lookForward);

    const job = {};
    job.period = dr.text;

    // Try to find position: last meaningful text before the date
    const linesBefore = textBefore.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const line = linesBefore[j];
      if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
      if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
      if (line.length < 3 || line.length > 200) continue;
      job.position = line;
      break;
    }

    // Try to find company: 1-3 lines before the position
    if (job.position) {
      const posIdx = linesBefore.lastIndexOf(job.position);
      for (let j = posIdx - 1; j >= Math.max(0, posIdx - 4); j--) {
        const line = linesBefore[j];
        if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
        if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
        if (line.length < 3 || line.length > 200) continue;
        if (line === job.position) continue;
        job.company = line;
        break;
      }
    }

    // Description: text after the date range
    const linesAfter = textAfter.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    if (linesAfter.length > 0 && linesAfter[0].length > 20) {
      job.description = linesAfter[0].substring(0, 300);
    }

    if (job.position || job.company || job.period) {
      entries.push(job);
    }
  }

  return entries;
}

/**
 * Strip HTML tags from a string, replacing them with newlines.
 */
function stripHtmlTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════
// STRATEGY 5: SCRIPT JSON EXPERIENCE PARSING
// ═══════════════════════════════════════════════

/**
 * Try to extract experience data from Magritte <script> hydration JSON.
 * hh.ru embeds ALL resume data in <script> tags for React hydration.
 * The SSR HTML only renders 3 company-cards, but the script state
 * contains the FULL experience list for client-side "Развернуть" expansion.
 *
 * We look in multiple script locations:
 * 1. <script type="application/json"> — Magritte component state
 * 2. <script> with window.__INITIAL_STATE__ or __PRELOADED_STATE__
 * 3. <script> with BEM blocks containing experience data
 * 4. Raw HTML search for JSON patterns with experience arrays
 */
function parseExperienceFromScripts(doc, html) {
  const entries = [];

  // ── Pass 1: Look for structured JSON in script tags ──
  const scripts = doc.querySelectorAll('script[type="application/json"], script:not([src])');
  for (const script of scripts) {
    const text = script.textContent || '';
    if (text.length < 100) continue;

    // Check if this script contains experience-related data
    if (!/experience|работ[аеы]|компани|должност|career|position/i.test(text)) continue;

    fetchLog.info('Strategy 5: examining script (' + text.length + ' chars, first 300: ' +
      text.substring(0, 300).replace(/\n/g, ' '));

    // Try multiple JSON extraction approaches
    const fromStructured = extractExperienceFromStructuredJson(text);
    if (fromStructured.length > 0) {
      fetchLog.info('Strategy 5: found ' + fromStructured.length + ' from structured JSON');
      return fromStructured;
    }

    // Try to find experience array in any JSON-like structure
    const fromArray = extractExperienceFromArray(text);
    if (fromArray.length > 0) {
      fetchLog.info('Strategy 5: found ' + fromArray.length + ' from JSON array scan');
      return fromArray;
    }
  }

  // ── Pass 2: Look for window.__INITIAL_STATE__ or __PRELOADED_STATE__ ──
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
  ];

  for (const pat of statePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const state = JSON.parse(m[1]);
        const exp = findExperienceInObject(state, 0);
        if (exp && exp.length > 0) {
          fetchLog.info('Strategy 5: found ' + exp.length + ' from window state');
          return exp;
        }
      } catch (e) {
        fetchLog.info('Strategy 5: state JSON parse failed: ' + e.message);
      }
    }
  }

  // ── Pass 3: Look for "resumeStore" or "resume" patterns in raw HTML ──
  const storePatterns = [
    /"resumeStore"\s*:\s*(\{[\s\S]+?\})\s*[,}]/,
    /"resume"\s*:\s*(\{[\s\S]{0,50000}?"experience"\s*:\s*\[[\s\S]+?\])\s*[,}]/,
  ];

  for (const pat of storePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const store = JSON.parse(m[1]);
        const exp = findExperienceInObject(store, 0);
        if (exp && exp.length > 0) {
          fetchLog.info('Strategy 5: found ' + exp.length + ' from store pattern');
          return exp;
        }
      } catch (e) {
        fetchLog.info('Strategy 5: store JSON parse failed: ' + e.message);
      }
    }
  }

  // ── Pass 4: Deep scan — find ANY JSON array containing objects with date fields ──
  // Magritte serializes components as JSON arrays. Look for arrays of objects
  // that have start/end date properties or position/company strings.
  const deepScan = deepScanForExperience(html);
  if (deepScan.length > 0) {
    fetchLog.info('Strategy 5: found ' + deepScan.length + ' from deep scan');
    return deepScan;
  }

  return entries;
}

/**
 * Extract experience from structured JSON patterns.
 * Looks for "experience":[...] pattern and parses the array.
 */
function extractExperienceFromStructuredJson(text) {
  const entries = [];

  // Pattern: "experience":[{...}] — direct experience array
  const expMatch = text.match(/"experience"\s*:\s*\[/);
  if (expMatch) {
    const startIdx = text.indexOf('[', expMatch.index + 12);
    if (startIdx !== -1) {
      const jsonStr = extractJsonArray(text, startIdx);
      if (jsonStr) {
        try {
          const expArray = JSON.parse(jsonStr);
          if (Array.isArray(expArray)) {
            expArray.forEach(item => {
              const job = buildEntryFromApiItem(item);
              if (job.position || job.company) entries.push(job);
            });
            if (entries.length > 0) return entries;
          }
        } catch (e) {
          fetchLog.info('Strategy 5: structured JSON parse failed: ' + e.message);
        }
      }
    }
  }

  return entries;
}

/**
 * Extract a JSON array starting at startIdx from text.
 * Handles nested brackets properly.
 */
function extractJsonArray(text, startIdx) {
  if (text[startIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"' && !escapeNext) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0) return text.substring(startIdx, i + 1);
  }
  return null;
}

/**
 * Scan text for JSON arrays containing objects with experience-like properties.
 * Uses a more flexible approach than structured parsing.
 */
function extractExperienceFromArray(text) {
  const entries = [];

  // Find all arrays in the text that might contain experience objects
  // Look for patterns like: [{"position":"...", ...}, ...]
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const arrStart = text.indexOf('[{', searchFrom);
    if (arrStart === -1) break;

    const jsonStr = extractJsonArray(text, arrStart);
    if (!jsonStr || jsonStr.length < 50 || jsonStr.length > 200000) {
      searchFrom = arrStart + 2;
      continue;
    }

    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr) || arr.length === 0) {
        searchFrom = arrStart + 2;
        continue;
      }

      // Check if this looks like an experience array
      const firstItem = arr[0];
      if (firstItem && typeof firstItem === 'object') {
        const hasExpFields = firstItem.position || firstItem.company ||
          firstItem.startDate || firstItem.start || firstItem.organization ||
          firstItem.name && (firstItem.start || firstItem.startDate);

        if (hasExpFields) {
          arr.forEach(item => {
            const job = buildEntryFromApiItem(item);
            if (job.position || job.company) entries.push(job);
          });
          if (entries.length > 0) return entries;
        }
      }
    } catch (e) {
      // Not valid JSON, continue
    }

    searchFrom = arrStart + 2;
  }

  return entries;
}

/**
 * Recursively search an object for an array containing experience-like objects.
 */
function findExperienceInObject(obj, depth) {
  if (depth > 6 || !obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
      const first = obj[0];
      if (first.position || first.company || first.startDate ||
          first.start || first.organization) {
        const entries = [];
        obj.forEach(item => {
          const job = buildEntryFromApiItem(item);
          if (job.position || job.company) entries.push(job);
        });
        return entries.length > 0 ? entries : null;
      }
    }
    return null;
  }
  // Prioritize known keys
  const priorityKeys = ['experience', 'jobs', 'positions', 'career', 'workHistory'];
  for (const key of priorityKeys) {
    if (obj[key]) {
      const result = findExperienceInObject(obj[key], depth + 1);
      if (result) return result;
    }
  }
  for (const key of Object.keys(obj)) {
    if (priorityKeys.includes(key)) continue; // already checked
    const result = findExperienceInObject(obj[key], depth + 1);
    if (result) return result;
  }
  return null;
}

/**
 * Deep scan raw HTML for JSON arrays containing objects with date-like properties.
 * This is the last resort — looks for ANY array of objects that have
 * recognizable date fields (year, month, start, end).
 */
function deepScanForExperience(html) {
  const entries = [];

  // Look for arrays with objects containing "year" or "month" fields
  // which are common in Magritte component state
  const yearArrayPattern = /\[\{[^]]*?"year"\s*:\s*\d{4}[^]]*?\}/g;
  let match;
  while ((match = yearArrayPattern.exec(html)) !== null) {
    const startIdx = match.index;
    // Find the actual start of the array
    let arrStart = startIdx;
    while (arrStart > 0 && html[arrStart - 1] !== '[') arrStart--;
    if (html[arrStart] !== '[') continue;

    const jsonStr = extractJsonArrayFromHtml(html, arrStart);
    if (!jsonStr) continue;

    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr) || arr.length === 0) continue;

      // Check if these look like experience entries
      const hasDates = arr.some(item =>
        item.year || item.start?.year || item.startDate?.year ||
        item.end?.year || item.endDate?.year
      );
      if (!hasDates) continue;

      // Check if any items have position/company-like fields
      const hasExpFields = arr.some(item =>
        item.position || item.company || item.name ||
        item.organization || item.title
      );
      if (!hasExpFields) continue;

      arr.forEach(item => {
        const job = buildEntryFromApiItem(item);
        if (job.position || job.company) entries.push(job);
      });
      if (entries.length > 0) return entries;
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  return entries;
}

/**
 * Extract JSON array from raw HTML starting at a given position.
 * More robust than extractJsonArray because it handles HTML entities and
 * truncated JSON.
 */
function extractJsonArrayFromHtml(html, startIdx) {
  if (startIdx >= html.length || html[startIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  for (let i = startIdx; i < html.length && i < startIdx + 500000; i++) {
    const ch = html[i];
    if (ch === '"' && (i === 0 || html[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0) return html.substring(startIdx, i + 1);
  }
  return null;
}

// ═══════════════════════════════════════════════
// STRATEGY 6: FETCH EXPANDED EXPERIENCE
// ═══════════════════════════════════════════════

/**
 * Try to fetch full experience data when SSR only renders 3 entries.
 *
 * hh.ru's resume page has a "Свернуть"/"Развернуть" button in the experience
 * section. In SSR, only 3 company-cards are rendered. Clicking "Развернуть"
 * triggers an AJAX load that adds the remaining experience entries.
 *
 * We try multiple approaches:
 *  1. Find the "Развернуть" button's AJAX URL in data-attributes or Magritte state
 *  2. Try internal applicant API endpoints
 *  3. Try re-fetching with expansion query parameters
 *  4. Look for "loadMore" / "fetchUrl" patterns in script tags
 *
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @param {string} resumeId - Resume hash ID
 * @param {number} currentCount - Number of experience entries already found
 * @param {string} resumeUrl - Original resume URL (for re-fetching)
 * @returns {Array} Experience entries (may be same count or more)
 */
async function fetchExpandedExperience(doc, html, resumeId, currentCount, resumeUrl) {
  fetchLog.info('Strategy 6: starting (currentCount=' + currentCount + ', resumeId=' + (resumeId || 'none') + ')');

  // ── Step 1: Find "Развернуть" / "Показать все" button URLs ──
  const expansionUrls = findExpansionUrls(doc, html, resumeId);
  fetchLog.info('Strategy 6: found ' + expansionUrls.length + ' candidate expansion URLs');
  expansionUrls.forEach((u, i) => {
    fetchLog.info('  URL ' + i + ': ' + u.url + ' (source: ' + u.source + ')');
  });

  // ── Step 2: Try each expansion URL ──
  for (const { url, source } of expansionUrls) {
    try {
      fetchLog.info('Strategy 6: fetching [' + source + '] ' + url);
      const result = await tryFetchExpandedUrl(url, currentCount);
      if (result && result.length > currentCount) {
        fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + result.length + ' experiences');
        return result;
      }
    } catch (err) {
      fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
    }
  }

  // ── Step 3: Try applicant internal API ──
  // Even though the public API (api.hh.ru) was closed in Dec 2025,
  // the internal applicant API may still work for the logged-in user.
  if (resumeId) {
    const apiUrls = [
      { url: 'https://hh.ru/applicant/api/v1/resumes/' + resumeId, source: 'applicant-api-v1' },
      { url: 'https://hh.ru/applicant/api/resumes/' + resumeId, source: 'applicant-api' },
      { url: 'https://hh.ru/applicant/resumes/api/get?resumeId=' + resumeId, source: 'resumes-api-get' },
    ];

    for (const { url, source } of apiUrls) {
      try {
        fetchLog.info('Strategy 6: trying API [' + source + '] ' + url);
        const resp = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          }
        });

        if (!resp.ok) {
          fetchLog.info('Strategy 6: [' + source + '] returned ' + resp.status);
          continue;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await resp.json();
          fetchLog.info('Strategy 6: [' + source + '] returned JSON with keys: ' +
            (typeof data === 'object' ? Object.keys(data).slice(0, 10).join(',') : typeof data));

          // Try to extract experience from the JSON
          const jsonEntries = parseExperienceFromJson(data);
          if (jsonEntries.length > currentCount) {
            fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + jsonEntries.length + ' experiences');
            return jsonEntries;
          }
          fetchLog.info('Strategy 6: [' + source + '] JSON had ' + jsonEntries.length + ' experiences (need > ' + currentCount + ')');
        }
      } catch (err) {
        fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
      }
    }
  }

  // ── Step 4: Try re-fetching with expansion query parameters ──
  if (resumeUrl) {
    const expandVariants = [
      { url: resumeUrl + '&expand=experience_items', source: 'expand-experience-items' },
      { url: resumeUrl + '&showAll=true', source: 'showAll' },
      { url: resumeUrl + '&full=true', source: 'full' },
      { url: resumeUrl + '&expand=all', source: 'expand-all' },
    ];

    for (const { url, source } of expandVariants) {
      try {
        fetchLog.info('Strategy 6: trying param [' + source + '] ' + url);
        const expandedHtml = await fetchHtml(url);
        const expandedDoc = htmlToDoc(expandedHtml);
        const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
        const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');

        fetchLog.info('Strategy 6: [' + source + '] returned HTML with ' +
          expCards.length + ' company-cards, ' + stepperItems.length + ' stepper-items');

        if (expCards.length > currentCount || stepperItems.length > currentCount) {
          const parsed = parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
          if (parsed.length > currentCount) {
            fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + parsed.length + ' experiences');
            return parsed;
          }
        }
      } catch (err) {
        fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
      }
    }
  }

  fetchLog.info('Strategy 6: all approaches exhausted, returning current count: ' + currentCount);
  return [];
}

/**
 * Find candidate expansion URLs from the "Развернуть" button and Magritte state.
 */
function findExpansionUrls(doc, html, resumeId) {
  const urls = [];
  const seen = new Set();

  const addUrl = (url, source) => {
    if (!url || url.length < 5) return;
    // Normalize to full URL
    const fullUrl = url.startsWith('http') ? url : 'https://hh.ru' + url;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    urls.push({ url: fullUrl, source });
  };

  // ── Source 1: "Развернуть" / "Показать все" button data-attributes ──
  const expSection = doc.querySelector('[data-qa="resume-list-card-experience"]');
  const searchRoot = expSection || doc;
  const allButtons = searchRoot.querySelectorAll('button, a[href], [data-url], [data-action-url], [data-fetch-url]');
  allButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    const isExpandBtn = text.includes('показать все') || text.includes('показать ещё') ||
      text.includes('посмотреть всё') || text.includes('посмотреть все') ||
      text.includes('развернуть') || text.includes('expand') ||
      btn.getAttribute('data-qa') === 'profile-experience-viewAll';

    if (!isExpandBtn) return;

    fetchLog.info('Strategy 6: found expand button: text="' + text.substring(0, 50) +
      '" data-qa="' + (btn.getAttribute('data-qa') || '') + '"' +
      ' outerHTML=' + btn.outerHTML.substring(0, 200));

    // Check href
    const href = btn.getAttribute('href') || '';
    if (href && href !== '#' && href !== 'javascript:void(0)') {
      addUrl(href, 'button-href');
    }

    // Check all data-* URL attributes on the button and its ancestors
    const dataAttrs = ['data-url', 'data-action-url', 'data-fetch-url', 'data-load-url',
      'data-api-url', 'data-endpoint', 'data-href', 'data-target'];
    let el = btn;
    for (let i = 0; i < 5 && el; i++) {
      for (const attr of dataAttrs) {
        const val = el.getAttribute(attr) || '';
        if (val && val.length > 5 && val !== '#') {
          addUrl(val, 'button-' + attr + '-ancestor' + i);
        }
      }
      el = el.parentElement;
    }
  });

  // ── Source 2: Magritte script state — look for expansion URLs ──
  const scripts = doc.querySelectorAll('script:not([src])');
  scripts.forEach(script => {
    const text = script.textContent || '';
    if (text.length < 200) return;

    // Look for URLs in Magritte component state
    // Pattern: "url":"..." or "fetchUrl":"..." or "loadMore":"..."
    const urlPatterns = [
      /["'](?:url|fetchUrl|loadMore|nextPage|apiUrl|endpoint|actionUrl|href|target)["']\s*:\s*["']([^"']+)["']/gi,
      /["'](?:loadMore|fetchUrl|nextPage|loadMoreUrl)["']\s*:\s*["']([^"']+)["']/gi,
    ];

    for (const pat of urlPatterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        const val = m[1];
        // Only add URLs that look like they're related to experience/resume expansion
        if (val && (val.includes('experience') || val.includes('resume') ||
            val.includes('expand') || val.includes('show') || val.includes('load') ||
            val.includes('applicant'))) {
          addUrl(val, 'script-url-pattern');
        }
      }
    }

    // Also look for /applicant/resumes/view or /resume/ paths
    const pathMatches = text.matchAll(/["'](\/applicant\/[^"']+)["']/g);
    for (const m of pathMatches) {
      addUrl(m[1], 'script-applicant-path');
    }
  });

  // ── Source 3: Known API patterns ──
  if (resumeId) {
    addUrl('https://hh.ru/applicant/resumes/view?resume=' + resumeId + '&expand=experience_items',
      'known-pattern-expand-items');
    addUrl('https://hh.ru/applicant/resumes/mine/' + resumeId + '/experience',
      'known-pattern-experience-endpoint');
  }

  return urls;
}

/**
 * Try fetching an expansion URL and parsing the result.
 * Handles both JSON and HTML responses.
 */
async function tryFetchExpandedUrl(url, currentCount) {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'text/html, application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
  });

  if (!resp.ok) {
    fetchLog.info('Strategy 6: ' + url + ' returned ' + resp.status);
    return null;
  }

  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await resp.json();
    const jsonEntries = parseExperienceFromJson(data);
    fetchLog.info('Strategy 6: JSON response had ' + jsonEntries.length + ' experiences');
    return jsonEntries;
  }

  // HTML response
  const expandedHtml = await resp.text();
  const expandedDoc = htmlToDoc(expandedHtml);
  const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');

  fetchLog.info('Strategy 6: HTML response had ' + expCards.length + ' company-cards, ' +
    stepperItems.length + ' stepper-items (' + expandedHtml.length + ' chars)');

  if (expCards.length > currentCount || stepperItems.length > currentCount) {
    return parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
  }

  // Even if no more cards, try script parsing on the expanded HTML
  // (the expanded data might be in a script tag)
  const scriptParsed = parseExperienceFromScripts(expandedDoc, expandedHtml);
  if (scriptParsed.length > currentCount) {
    return scriptParsed;
  }

  return null;
}

/**
 * Parse experience entries from a JSON API response.
 * Handles hh.ru API format: { experience: [{ position, company, start, end, ... }] }
 */
function parseExperienceFromJson(data) {
  const entries = [];

  // Navigate to experience array
  const exp = data?.experience || data?.resume?.experience ||
              data?.result?.experience || data?.items;

  if (!Array.isArray(exp)) {
    // Try recursive search for an array with experience-like objects
    const found = findExperienceArray(data);
    if (found) {
      found.forEach(item => {
        const job = buildEntryFromApiItem(item);
        if (job.position || job.company) entries.push(job);
      });
    }
    return entries;
  }

  exp.forEach(item => {
    const job = buildEntryFromApiItem(item);
    if (job.position || job.company) entries.push(job);
  });

  return entries;
}

function buildEntryFromApiItem(item) {
  const job = {};
  // hh.ru API fields
  if (item.position) job.position = item.position;
  if (item.name && !job.position) job.position = item.name;
  if (item.company) job.company = typeof item.company === 'string' ? item.company : item.company?.name || '';
  if (item.organization && !job.company) job.company = item.organization;
  if (item.start || item.startDate) {
    const start = item.start || item.startDate;
    const isCurrent = !!(item.current || item.untilNow);
    const rawEnd = item.end || item.endDate;
    const end = rawEnd || (isCurrent ? 'настоящее время' : '');
    if (typeof start === 'string') {
      job.period = start + ' — ' + end;
    } else if (start && start.year) {
      const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
      const startStr = (start.month ? months[start.month - 1] + ' ' : '') + start.year;
      let endStr = 'настоящее время';
      if (end && typeof end === 'object' && end.year) {
        endStr = (end.month ? months[end.month - 1] + ' ' : '') + end.year;
      } else if (end && typeof end === 'string' && end.length > 0) {
        endStr = end;
      }
      job.period = startStr + ' — ' + endStr;
    }
  }
  if (item.description) job.description = item.description;
  return job;
}

/**
 * @deprecated Use findExperienceInObject instead (more flexible)
 * Recursively search for an array containing experience-like objects.
 * Depth-limited to avoid infinite recursion.
 */
function findExperienceArray(obj, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 4 || !obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    // Check if this looks like an experience array
    if (obj.length > 0 && obj[0] && (obj[0].position || obj[0].company || obj[0].startDate)) {
      return obj;
    }
    return null;
  }
  for (const key of Object.keys(obj)) {
    const result = findExperienceArray(obj[key], depth + 1);
    if (result) return result;
  }
  return null;
}

/**
 * Parse experience from an expanded HTML document.
 * Uses the same strategies as the main parser but starts fresh.
 */
function parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount) {
  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: company cards
  const allCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach(c => { if (!seen.has(c)) { seen.add(c); uniqueCards.push(c); } });

  uniqueCards.forEach(card => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  // Strategy 2: stepper supplement
  const expCard = expandedDoc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position || job.period) entries.push(job);
    });
  }

  // Strategy 3: text patterns if still not enough
  if (entries.length <= currentCount && expandedHtml) {
    const textParsed = parseExperienceFromHtmlText(expandedHtml, entries.length);
    if (textParsed.length > entries.length) {
      entries.length = 0;
      entries.push(...textParsed);
    }
  }

  return entries;
}

function parseEducationFromDocSection(doc, dbg, resume) {
  const eduCard = doc.querySelector('[data-qa="resume-list-card-education"]');
  if (!eduCard) {
    resume._debug.missing.push('educationBlock');
    return;
  }
  resume._debug.found.push('educationBlock');
  const entries = parseEducationFromDoc(eduCard);
  resume.education = entries;
  if (entries.length > 0) resume._debug.found.push('education: ' + entries.length);
  else resume._debug.missing.push('education (0 entries)');
}

function parseLanguagesAndAbout(doc, dbg, resume) {
  const langTags = doc.querySelectorAll('[data-qa="resume-about-card"] .bloko-tag__text, [data-qa="resume-position-card"] .bloko-tag__text');
  langTags.forEach(tag => {
    const t = (tag.textContent || '').trim();
    if (t && t.length > 0 && !resume.skills.includes(t)) resume.languages.push(t);
  });
  if (resume.languages.length > 0) resume._debug.found.push('languages: ' + resume.languages.join(', '));

  const aboutCard = doc.querySelector('[data-qa="resume-about-card"]');
  if (aboutCard) {
    const text = (aboutCard.textContent || '').trim();
    if (text.length > 10) {
      resume.additionalInfo = text;
      resume._debug.found.push('additionalBlock');
    }
  }
}

// ═══════════════════════════════════════════════
// SYNC ALL RESUMES (orchestrator)
// ═══════════════════════════════════════════════

export async function syncAllResumes({ onProgress, onComplete, onError } = {}) {
  fetchLog.info('syncAllResumes: starting ...');

  try {
    const list = await fetchResumeList();
    if (list.length === 0) {
      fetchLog.warn('syncAllResumes: no resumes found');
      if (onComplete) onComplete([]);
      return [];
    }

    if (onProgress) onProgress(0, list.length, 'Загрузка списка резюме...');

    const results = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (onProgress) onProgress(i, list.length, 'Парсинг: ' + item.title);

      try {
        const resume = await fetchAndParseResume(item.url, item);
        // If parseHeader didn't find a title, use the one from the list
        if ((!resume.title || resume.title === '') && resume._listTitle) {
          resume.title = resume._listTitle;
        }
        delete resume._listTitle;
        if (resume.id) results.push(resume);
        else fetchLog.warn('No id for ' + item.url);
      } catch (err) {
        fetchLog.error('Failed: ' + item.url + ': ' + err.message);
        if (onError) onError(item, err);
      }

      if (i < list.length - 1) await gaussianDelay(2000, 5000);
    }

    fetchLog.info('Done. ' + results.length + '/' + list.length + ' parsed');
    if (onProgress) onProgress(list.length, list.length, 'Готово');
    if (onComplete) onComplete(results);
    return results;
  } catch (err) {
    fetchLog.error('Fatal: ' + err.message);
    if (onError) onError(null, err);
    throw err;
  }
}
