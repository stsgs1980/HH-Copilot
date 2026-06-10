/**
 * Single resume parsing — fetches and parses a resume page.
 *
 * Orchestrates all section parsers (header, skills, experience, education, languages)
 * and runs experience strategies 1-6 in sequence.
 */
import { createLogger } from './anti-hallucination.js';
import { fetchHtml, htmlToDoc, safeGetText } from './resume-fetch-helpers.js';
import { parsePersonalDataFromDoc } from './resume-fetch-parse.js';
import { TITLE_SUFFIX_NOISE, VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, hasHiddenIndicator, normalizeWs, VISIBILITY_HIDDEN_DATA_QA } from './resume-constants.js';
import { parseExperienceFromDocStrategies1to3 } from './resume-fetch-experience.js';
import { parseExperienceFromHtmlText } from './resume-fetch-strategy4-text.js';
import { parseExperienceFromScripts } from './resume-fetch-strategy5-scripts.js';
import { fetchExpandedExperience } from './resume-fetch-strategy6-expand.js';
import { parseEducationFromDocSection, parseLanguagesAndAbout } from './resume-fetch-education-languages.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Fetch and parse a single resume from its URL.
 * @param {string} resumeUrl - URL of the resume page
 * @param {object} [listMeta] - Optional metadata from the resume list
 *   (e.g. { visibility, hidden, title } from extractResumeLinks + extractVisibilityStatus)
 * @returns {object} Parsed resume object
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

  // Debug: count ALL date-range patterns in the full HTML
  const MONTHS_RE = /(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}\s*[—\-–]\s*(?:(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}|настоящее\s*время|по\s+настоящее\s+время|сейчас|по\s+сейчас)/gi;
  const allDateRanges = html.match(MONTHS_RE) || [];
  fetchLog.info('Full HTML date ranges: ' + allDateRanges.length + ' found: ' + JSON.stringify(allDateRanges));

  // Debug: also check for numeric date patterns
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

  // ═══ Detect visibility from resume detail page HTML ═══
  // This is MORE RELIABLE than the list page because the resume detail page
  // includes visibility indicators even in SSR HTML (e.g. "Многие не видят",
  // "Сделать видимым" button, data-qa attributes).
  const pageVis = detectVisibilityFromResumePage(doc, html);
  if (pageVis === VISIBILITY_HIDDEN) {
    resume.visibility = VISIBILITY_HIDDEN;
    resume.hidden = true;
    fetchLog.info('Resume page visibility: HIDDEN (overrides list)');
  } else if (pageVis === VISIBILITY_VISIBLE) {
    // Page explicitly shows visible — override list meta too
    resume.visibility = VISIBILITY_VISIBLE;
    resume.hidden = false;
    fetchLog.info('Resume page visibility: VISIBLE');
  } else {
    // UNKNOWN from page — fall back to list metadata
    if (listMeta) {
      if (listMeta.visibility) resume.visibility = listMeta.visibility;
      if (listMeta.hidden !== undefined) resume.hidden = listMeta.hidden;
      if (listMeta.title && listMeta.title !== 'Untitled') {
        resume._listTitle = listMeta.title;
      }
    }
    fetchLog.info('Resume page visibility: UNKNOWN, using list meta: ' + resume.visibility);
  }
  // Always carry over list title
  if (listMeta && listMeta.title && listMeta.title !== 'Untitled') {
    resume._listTitle = listMeta.title;
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

// ── Section parsers ──

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

// ── Experience orchestrator (Strategies 1-6) ──

async function parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl) {
  // Strategies 1-3: DOM-based parsing
  const entries = parseExperienceFromDocStrategies1to3(doc, resume);

  // Strategy 4: Parse experience from raw HTML text patterns
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
// VISIBILITY DETECTION FROM RESUME DETAIL PAGE
// ═══════════════════════════════════════════════

/**
 * Detect visibility status from the resume detail page HTML.
 * This is MORE RELIABLE than the list page because hh.ru includes
 * visibility indicators in the resume detail SSR HTML.
 *
 * Strategies:
 * 1. data-qa attributes (e.g. data-qa="resume-make-visible")
 * 2. Text indicators in the page body (Многие не видят, Сделать видимым)
 * 3. Script/hydration JSON (hidden: true)
 * 4. Specific button text (Скрыть резюме = visible, Сделать видимым = hidden)
 *
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @returns {string} VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, or VISIBILITY_UNKNOWN
 */
function detectVisibilityFromResumePage(doc, html) {
  // Strategy 1: Check for hidden-specific data-qa attributes
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const found = doc.querySelector(sel);
    if (found) {
      fetchLog.info('PageVis: found hidden via data-qa: ' + sel);
      return VISIBILITY_HIDDEN;
    }
  }

  // Strategy 2: Check for "Сделать видимым" button or link
  // This button appears on hidden resumes in the owner's view
  const allButtons = doc.querySelectorAll('button, a');
  for (const btn of allButtons) {
    const text = normalizeWs((btn.textContent || '')).toLowerCase();
    if (text.includes('сделать видимым')) {
      fetchLog.info('PageVis: found "Сделать видимым" button');
      return VISIBILITY_HIDDEN;
    }
    // "Скрыть резюме" button means the resume IS currently visible
    if (text.includes('скрыть резюме') || text.includes('скрыть')) {
      const qa = btn.getAttribute('data-qa') || '';
      if (qa.includes('hide') || qa.includes('hidden') || text.includes('скрыть резюме')) {
        fetchLog.info('PageVis: found "Скрыть резюме" button → visible');
        return VISIBILITY_VISIBLE;
      }
    }
  }

  // Strategy 3: Check page text for hidden indicators (in body, not scripts)
  const bodyText = doc.body ? normalizeWs(doc.body.textContent || '') : '';
  if (hasHiddenIndicator(bodyText)) {
    fetchLog.info('PageVis: found hidden indicator in body text');
    return VISIBILITY_HIDDEN;
  }

  // Strategy 4: Check raw HTML for hidden indicators (with &nbsp; normalization)
  const htmlForSearch = html.replace(/&nbsp;/g, ' ').toLowerCase();
  const htmlNorm = normalizeWs(htmlForSearch);
  if (hasHiddenIndicator(htmlNorm)) {
    fetchLog.info('PageVis: found hidden indicator in raw HTML');
    return VISIBILITY_HIDDEN;
  }

  // Strategy 5: Check script/hydration JSON for hidden status
  const scriptEls = doc.querySelectorAll('script:not([src])');
  for (const script of scriptEls) {
    const t = script.textContent || '';
    if (t.length < 50) continue;
    // Look for visibility-related JSON near resume data
    if (/"hidden"\s*:\s*true/.test(t) || /"isHidden"\s*:\s*true/.test(t) ||
        /"visibility"\s*:\s*"hidden"/.test(t) || /"status"\s*:\s*"hidden"/.test(t)) {
      // Verify this is about the current resume, not something else
      // For now, presence of these patterns in resume page scripts is a strong signal
      fetchLog.info('PageVis: found hidden pattern in script JSON');
      return VISIBILITY_HIDDEN;
    }
  }

  // Strategy 6: If we find a "Скрыть" action link/button specific to this resume
  const hideLink = doc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
  if (hideLink) {
    fetchLog.info('PageVis: found "hide resume" action → resume is VISIBLE');
    return VISIBILITY_VISIBLE;
  }

  fetchLog.info('PageVis: no visibility indicators found → UNKNOWN');
  return VISIBILITY_UNKNOWN;
}
