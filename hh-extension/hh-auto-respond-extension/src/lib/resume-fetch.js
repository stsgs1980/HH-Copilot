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
  parseExperienceFromDoc(doc, dbg, resume, html);
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

function parseExperienceFromDoc(doc, dbg, resume, html) {
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
  if (html && entries.length === 0) {
    const scriptParsed = parseExperienceFromScripts(doc, html);
    if (scriptParsed.length > 0) {
      fetchLog.info('Strategy 5 (script JSON): found ' + scriptParsed.length + ' experiences');
      resume._debug.found.push('experience (script JSON): ' + scriptParsed.length);
      entries.push(...scriptParsed);
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

  // Find the experience section boundaries in HTML
  const expStartPatterns = [
    /data-qa="resume-list-card-experience"/i,
    /<h[23][^>]*>.*?опыт\s+работы.*?<\/h[23]>/i,
    /data-qa="resume-block-experience"/i,
  ];
  const expEndPatterns = [
    /data-qa="resume-list-card-education"/i,
    /data-qa="resume-block-education"/i,
    /<h[23][^>]*>.*?образование.*?<\/h[23]>/i,
    /data-qa="resume-list-card-/i,
  ];

  let expStart = -1;
  for (const pat of expStartPatterns) {
    const m = html.match(pat);
    if (m) { expStart = m.index; break; }
  }
  if (expStart === -1) {
    // No experience section found — can't parse
    return [];
  }

  let expEnd = html.length;
  for (const pat of expEndPatterns) {
    const m = html.match(pat);
    if (m && m.index > expStart && m.index < expEnd) {
      expEnd = m.index;
    }
  }

  const expHtml = html.substring(expStart, expEnd);
  fetchLog.info('Text pattern: experience section ' + expStart + '-' + expEnd + ' (' + expHtml.length + ' chars)');

  // Find all date ranges in the experience section
  const dateRanges = [];
  let match;
  while ((match = DATE_RANGE_RE.exec(expHtml)) !== null) {
    dateRanges.push({
      index: match.index,
      text: match[0]
    });
  }

  fetchLog.info('Text pattern: found ' + dateRanges.length + ' date ranges in experience section');

  if (dateRanges.length <= alreadyFound) {
    // No additional date ranges found beyond what we already parsed
    return [];
  }

  // For each date range, extract the surrounding text to find position and company
  const entries = [];
  for (let i = 0; i < dateRanges.length; i++) {
    const dr = dateRanges[i];
    // Look backward from the date range for position/company text
    // The position is usually 50-500 chars before the date range
    const lookBack = expHtml.substring(Math.max(0, dr.index - 600), dr.index);
    // The description is usually after the date range until the next entry
    const nextIdx = (i + 1 < dateRanges.length) ? dateRanges[i + 1].index : expHtml.length;
    const lookForward = expHtml.substring(dr.index + dr.text.length, Math.min(nextIdx, dr.index + dr.text.length + 500));

    // Strip HTML tags for text extraction
    const textBefore = stripHtmlTags(lookBack);
    const textAfter = stripHtmlTags(lookForward);

    const job = {};
    job.period = dr.text;

    // Try to find position: usually the last meaningful text before the date
    // Position is typically on a separate line or in a <b>/<strong> tag
    const linesBefore = textBefore.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
    // Last non-date line before the date range is likely the position
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const line = linesBefore[j];
      // Skip if it looks like a date or duration
      if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
      // Skip if too short or too long
      if (line.length < 3 || line.length > 200) continue;
      // This is likely the position
      job.position = line;
      break;
    }

    // Try to find company: usually 1-2 lines before the position
    if (job.position) {
      const posIdx = linesBefore.lastIndexOf(job.position);
      for (let j = posIdx - 1; j >= Math.max(0, posIdx - 3); j--) {
        const line = linesBefore[j];
        if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
        if (line.length < 3 || line.length > 200) continue;
        if (line === job.position) continue;
        job.company = line;
        break;
      }
    }

    // Description: text after the date range (first meaningful paragraph)
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
 * hh.ru may embed full resume data in <script type="application/json"> or
 * in BEM/React hydration state.
 */
function parseExperienceFromScripts(doc, html) {
  const entries = [];

  // Look for JSON blobs in script tags that contain experience data
  const scripts = doc.querySelectorAll('script[type="application/json"], script:not([src])');
  for (const script of scripts) {
    const text = script.textContent || '';
    if (text.length < 200) continue;

    // Check if this script contains experience-related data
    if (!/experience|работ[аеы]|компани|должност/i.test(text)) continue;

    try {
      // Try to find experience array in JSON
      // Pattern: "experience":[{...}] or "experience":[{...}]
      const expMatch = text.match(/"experience"\s*:\s*\[/);
      if (expMatch) {
        // Try to extract the array
        const startIdx = text.indexOf('[', expMatch.index + 12);
        if (startIdx !== -1) {
          // Find matching closing bracket
          let depth = 0;
          let endIdx = startIdx;
          for (let i = startIdx; i < text.length; i++) {
            if (text[i] === '[') depth++;
            if (text[i] === ']') depth--;
            if (depth === 0) { endIdx = i + 1; break; }
          }
          const jsonStr = text.substring(startIdx, endIdx);
          try {
            const expArray = JSON.parse(jsonStr);
            if (Array.isArray(expArray)) {
              expArray.forEach(item => {
                const job = {};
                if (item.position || item.name) job.position = item.position || item.name;
                if (item.company || item.organization) job.company = item.company || item.organization;
                if (item.start || item.startDate) {
                  const end = item.end || item.endDate || 'настоящее время';
                  job.period = (item.start || item.startDate) + ' — ' + end;
                }
                if (item.description) job.description = item.description;
                if (job.position || job.company) entries.push(job);
              });
              if (entries.length > 0) {
                fetchLog.info('Script JSON: found ' + entries.length + ' experiences from embedded JSON');
                return entries;
              }
            }
          } catch (e) {
            // JSON parse failed, continue to next script
          }
        }
      }
    } catch (e) {
      // Continue to next script
    }
  }

  // Fallback: try to extract from raw HTML using window.__INITIAL_STATE__ or similar patterns
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
    /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
    /"resumeStore"\s*:\s*(\{.+?\})\s*[,}]/s,
  ];

  for (const pat of statePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const state = JSON.parse(m[1]);
        // Navigate to experience data
        const exp = state?.resume?.experience || state?.experience ||
                    state?.resumeStore?.resume?.experience;
        if (Array.isArray(exp)) {
          exp.forEach(item => {
            const job = {};
            if (item.position) job.position = item.position;
            if (item.company) job.company = item.company;
            if (item.startDate) {
              job.period = item.startDate + ' — ' + (item.endDate || 'настоящее время');
            }
            if (job.position || job.company) entries.push(job);
          });
          if (entries.length > 0) return entries;
        }
      } catch (e) {
        // JSON parse failed, continue
      }
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
