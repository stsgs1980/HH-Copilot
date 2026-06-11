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
    employmentType: '', workFormat: '', schedule: '', relocation: '',
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
  parseSalaryConditionsFromDoc(doc, dbg, resume);
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

// ── Salary conditions (employment, format, schedule, relocation) ──

function parseSalaryConditionsFromDoc(doc, dbg, resume) {
  const posCard = doc.querySelector('[data-qa="resume-position-card"]');
  if (!posCard) { resume._debug.missing.push('salaryConditions (no position-card)'); return; }

  const texts = [];
  posCard.querySelectorAll('span, p, div').forEach(el => {
    if (el.children.length > 5) return;
    const t = (el.textContent || '').trim();
    if (t && t.length > 2 && t.length < 100) texts.push(t);
  });

  // NOTE: \b does NOT work with Cyrillic in JS (\w = [a-zA-Z0-9_] only),
  //       so we use (^|\s) / ($|[,;\s]) boundaries instead.
  const empPatterns = [
    /(?:^|\s)(Полная занятость|Постоянная работа)(?:$|[,;\s])/i,
    /(?:^|\s)(Частичная занятость)(?:$|[,;\s])/i,
    /(?:^|\s)(Проектная работа)(?:$|[,;\s])/i,
    /(?:^|\s)(Стажировка)(?:$|[,;\s])/i,
    /(?:^|\s)(Волонтёрство)(?:$|[,;\s])/i,
  ];
  const fmtPatterns = [
    /(?:^|\s)(На месте работодателя|Офис|В офисе)(?:$|[,;\s])/i,
    /(?:^|\s)(Удал[а-яё]+(?: работа)?|Удалённо)(?:$|[,;\s])/i,
    /(?:^|\s)(Гибрид|Смешанный формат)(?:$|[,;\s])/i,
  ];
  const schedPatterns = [
    /(?:^|\s)(Гибкий график)(?:$|[,;\s])/i, /(?:^|\s)(Полный день)(?:$|[,;\s])/i,
    /(?:^|\s)(Сменный график)(?:$|[,;\s])/i, /(?:^|\s)(Вахтовый метод)(?:$|[,;\s])/i,
  ];
  const relocPatterns = [
    /(?:^|\s)(Не готов к переезду)(?:$|[,;\s])/i, /(?:^|\s)(Готов к переезду)(?:$|[,;\s])/i,
    /(?:^|\s)(Хочу переехать)(?:$|[,;\s])/i,
  ];

  for (const t of texts) {
    if (!resume.employmentType) {
      for (const p of empPatterns) { const m = t.match(p); if (m) { resume.employmentType = dbg('employmentType', m[1]); break; } }
    }
    if (!resume.workFormat) {
      const fmtMatches = [];
      for (const p of fmtPatterns) { const m = t.match(p); if (m) fmtMatches.push(m[1]); }
      if (fmtMatches.length > 0) resume.workFormat = dbg('workFormat', fmtMatches.join(', '));
    }
    if (!resume.schedule) { for (const p of schedPatterns) { const m = t.match(p); if (m) { resume.schedule = dbg('schedule', m[1]); break; } } }
    if (!resume.relocation) { for (const p of relocPatterns) { const m = t.match(p); if (m) { resume.relocation = dbg('relocation', m[1]); break; } } }
  }
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
