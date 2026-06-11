/**
 * Single resume parsing — fetches and parses a resume page.
 *
 * Thin orchestrator — delegates to focused modules:
 *   - resume-fetch-resume-page-vis.js — page-level visibility detection + decision
 *   - resume-fetch-resume-exp-orch.js  — experience strategies 1-6 + iframe vis override
 *   - resume-fetch-parse.js           — personal data + company card parsing
 *   - resume-fetch-parse-edu.js       — education parsing
 *   - resume-fetch-education-languages.js — education section, languages, about me
 *   - resume-fetch-resume-diag.js     — pre-parse diagnostics + visibility resolution
 */
import { createLogger } from './anti-hallucination.js';
import { fetchHtml, htmlToDoc, safeGetText } from './resume-fetch-helpers.js';
import { parsePersonalDataFromDoc, parseContactsFromDoc } from './resume-fetch-parse.js';
import { TITLE_SUFFIX_NOISE, VISIBILITY_UNKNOWN } from './resume-constants.js';
import { detectVisibilityFromResumePage } from './resume-fetch-resume-page-vis.js';
import { parseExperienceFromDoc } from './resume-fetch-resume-exp-orch.js';
import { parseEducationFromDocSection, parseLanguagesAndAbout } from './resume-fetch-education-languages.js';
import { logPreParseDiagnostics, resolveVisibilityDecision } from './resume-fetch-resume-diag.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Fetch and parse a single resume from its URL.
 * @param {string} resumeUrl - URL of the resume page
 * @param {object} [listMeta] - Optional metadata from the resume list
 * @returns {object} Parsed resume object
 */
export async function fetchAndParseResume(resumeUrl, listMeta) {
  fetchLog.info('Fetching resume: ' + resumeUrl);
  const html = await fetchHtml(resumeUrl);
  const doc = htmlToDoc(html);
  fetchLog.info('Resume HTML: ' + html.length + ' chars');

  logPreParseDiagnostics(html, doc);

  window.__hhLastFetchHtml = html;
  window.__hhLastFetchDoc = doc;

  let hashMatch = resumeUrl.match(/\/resume\/([a-f0-9]+)/);
  if (!hashMatch) hashMatch = resumeUrl.match(/[?&]resume=([a-f0-9]+)/);
  const id = hashMatch ? hashMatch[1] : '';

  const resume = {
    id, url: resumeUrl,
    title: '', salary: '', gender: '', age: '', address: '',
    phone: '', email: '', telegram: '',
    specializations: [], skills: [], skillLevels: {},
    experience: [], education: [], languages: [],
    additionalInfo: '', parsedAt: new Date().toISOString(),
    visibility: VISIBILITY_UNKNOWN,
    hidden: false,
    _debug: { found: [], missing: [] }
  };

  // Detect visibility from resume detail page HTML
  const pageVisResult = detectVisibilityFromResumePage(doc, html);
  const pageVis = pageVisResult.visibility;
  const pageTrace = pageVisResult.trace || [];

  const visDiagEntry = {
    id: id || 'unknown',
    title: '(will be set after parse)',
    pageVis, pageTrace,
    listVis: listMeta ? listMeta.visibility : 'no-list-meta',
    listHidden: listMeta ? listMeta.hidden : undefined,
    decision: null, decisionReason: null,
    timestamp: new Date().toISOString()
  };

  resolveVisibilityDecision(resume, pageVis, listMeta, visDiagEntry);
  resume._visDiag = visDiagEntry;

  if (listMeta && listMeta.title && listMeta.title !== 'Untitled') {
    resume._listTitle = listMeta.title;
  }

  // Parse all sections
  const dbg = (key, val) => {
    if (val) resume._debug.found.push(key + ': ' + (typeof val === 'string' ? '"' + val.substring(0, 60) + '"' : val));
    else resume._debug.missing.push(key);
    return val;
  };

  parseHeader(doc, dbg, resume);
  if (resume.title) resume.title = resume.title.replace(TITLE_SUFFIX_NOISE, '').trim();
  parsePersonalDataFromDoc(doc, doc.querySelector('[data-qa="resume-block-title-position"]'), dbg, resume);
  parseSkillsFromDoc(doc, dbg, resume);
  await parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl);
  parseEducationFromDocSection(doc, dbg, resume);
  parseLanguagesAndAbout(doc, dbg, resume);
  parseContactsFromDoc(doc, dbg, resume);

  if (resume._visDiag) resume._visDiag.title = resume.title || '(no title)';

  fetchLog.info('Parsed: ' + resume.title + ' | Skills: ' + resume.skills.length +
    ' | Exp: ' + resume.experience.length + ' | Edu: ' + resume.education.length);
  return resume;
}

// ── Section parsers (small enough to stay in this file) ──

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
