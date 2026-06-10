/**
 * PARSER: RESUME DETAIL — parseResume()
 * =======================================
 * Parses a single resume page (/resume/{hash}).
 * Delegates section parsing to specialised sub-modules.
 */

import { safeGetText, createLogger } from '../../lib/anti-hallucination.js';
import { parsePersonalData, parseSalaryConditions, parseSkills, parseExperience, parseLanguagesAndAbout, parseContacts } from './parse-resume-sections.js';
import { parseEducation } from './parse-resume-education.js';
import { TITLE_SUFFIX_NOISE, VISIBILITY_UNKNOWN } from '../../lib/resume-constants.js';

const resumeLog = createLogger('Resume');

// ═══════════════════════════════════════════════
// PARSE SINGLE RESUME
// ═══════════════════════════════════════════════

export function parseResume() {
  const t0 = performance.now();
  const resume = {
    id: '', url: window.location.href,
    name: '', title: '', salary: '', gender: '', age: '', address: '',
    employmentType: '', workFormat: '', schedule: '', relocation: '',
    phone: '', email: '', telegram: '',
    specializations: [], skills: [], skillLevels: {},
    experience: [], education: [], languages: [],
    additionalInfo: '', parsedAt: new Date().toISOString(),
    visibility: VISIBILITY_UNKNOWN, hidden: false,
    _debug: { found: [], missing: [] }
  };

  const hashMatch = window.location.pathname.match(/\/resume\/([a-f0-9]+)/);
  resume.id = hashMatch ? hashMatch[1] : '';

  const dbg = (key, val) => {
    if (val) resume._debug.found.push(key + ': ' + (typeof val === 'string' ? '"' + val.substring(0, 60) + '"' : val));
    else resume._debug.missing.push(key);
    return val;
  };

  // ═════════════════════════════════════════
  // ЗАГОЛОВОК И ЗАРПЛАТА
  // ═════════════════════════════════════════
  const titleEl = document.querySelector('[data-qa="resume-block-title-position"]');
  if (titleEl) {
    resume.title = dbg('resumeTitle (data-qa)', safeGetText(titleEl));
  }
  // Fallback: h1
  if (!resume.title) {
    const h1 = document.querySelector('h1');
    if (h1) resume.title = dbg('resumeTitle (h1)', (h1.textContent || '').trim());
  }

  // Clean title: remove trailing hh.ru noise like "Постоянная работа"
  if (resume.title) {
    resume.title = resume.title.replace(TITLE_SUFFIX_NOISE, '').trim();
  }

  const salaryEl = document.querySelector('[data-qa="resume-block-salary"]');
  if (salaryEl) {
    resume.salary = dbg('resumeSalary (data-qa)', safeGetText(salaryEl));
  }

  // ═════════════════════════════════════════
  // SECTION PARSERS
  // ═════════════════════════════════════════
  parsePersonalData(titleEl, dbg, resume);
  parseSalaryConditions(dbg, resume);
  parseSkills(dbg, resume);
  parseExperience(dbg, resume);
  parseEducation(dbg, resume);
  parseLanguagesAndAbout(dbg, resume);
  parseContacts(dbg, resume);

  // ═════════════════════════════════════════
  // ИТОГО
  // ═════════════════════════════════════════
  const elapsed = (performance.now() - t0).toFixed(1);
  resumeLog.info('Resume parsed in ' + elapsed + 'ms');
  resumeLog.info('Found: ' + resume._debug.found.length + ' | Missing: ' + resume._debug.missing.length);
  resumeLog.info('Skills: ' + resume.skills.length + ' | Experience: ' + resume.experience.length + ' | Education: ' + resume.education.length);
  console.log('[HH-AR][Resume] Parsed resume:', JSON.stringify({
    id: resume.id, title: resume.title, salary: resume.salary,
    skills: resume.skills, experienceCount: resume.experience.length,
    educationCount: resume.education.length, languages: resume.languages,
    debug: resume._debug
  }, null, 2));

  return resume;
}