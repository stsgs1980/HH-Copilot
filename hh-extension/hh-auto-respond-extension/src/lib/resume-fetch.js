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
  parseExperienceFromDoc(doc, dbg, resume);
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

function parseExperienceFromDoc(doc, dbg, resume) {
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
    // hh.ru may render some experiences only as stepper items without company-card wrapper
    // (e.g. when "Показать все" sections are SSR'd but not wrapped in company-card)
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = entries.length;

    stepperItems.forEach(step => {
      // Skip stepper items already covered by company cards
      if (usedStepperElements.has(step)) return;
      // Skip if this stepper is nested inside a company card we already parsed
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
  resume.experience = entries;
  if (entries.length > 0) resume._debug.found.push('experience: ' + entries.length);
  else resume._debug.missing.push('experience (0 entries)');
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
