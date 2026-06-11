/**
 * PARSER: RESUME DETAIL — parseResume()
 * =======================================
 * Parses a single resume page (/resume/{hash}).
 * Delegates section parsing to specialised sub-modules.
 */

import { safeGetText, createLogger } from '../../lib/anti-hallucination.js';
import { parseSkills, parseExperience, parseLanguagesAndAbout } from './parse-resume-sections.js';
import { deriveSkillsFromExperience } from '../../lib/derive-skills.js';
import { parsePersonalData } from './parse-resume-personal.js';
import { parseSalaryConditions } from './parse-resume-conditions.js';
import { parseContacts } from './parse-resume-contacts.js';
import { parseEducation } from './parse-resume-education.js';
import { TITLE_SUFFIX_NOISE, VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, hasHiddenIndicator, normalizeWs } from '../../lib/resume-constants.js';

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
    specializations: [], skills: [], skillLevels: {}, derivedSkills: [],
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

  // Derive skills from experience descriptions (after parseExperience populated them)
  deriveSkillsFromExperience(resume);

  // ═════════════════════════════════════════
  // VISIBILITY — detect from DOM on the resume page itself
  // ═════════════════════════════════════════
  // On a live resume page, React has already hydrated, so we can check
  // for visibility indicators directly in the DOM.

  // Strategy 0: Check resume-visibility-card (PRIMARY for Magritte)
  // data-qa="resume-visibility-card" contains "не видно никому" (hidden)
  // or "видно всем работодателям" (visible)
  const visCard = document.querySelector('[data-qa="resume-visibility-card"]');
  if (visCard) {
    const cardText = normalizeWs(visCard.textContent || '').toLowerCase();
    if (cardText.includes('не видно никому') || cardText.includes('не\u00A0видно никому')) {
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
    } else if (cardText.includes('видно всем') || cardText.includes('видно\u00A0всем')) {
      resume.visibility = VISIBILITY_VISIBLE;
      resume.hidden = false;
    } else {
      // Unknown text in visibility card — fall through to other strategies
      resumeLog.info('Unknown visibility card text: "' + cardText.substring(0, 80) + '"');
    }
  }

  if (resume.visibility === VISIBILITY_UNKNOWN) {
  const hiddenMsg = document.querySelector('[data-qa="resume-hidden-message"], [data-qa*="resume-hidden"], [data-qa="resume-make-visible"], [data-qa*="make-visible"]');
  if (hiddenMsg) {
    resume.visibility = VISIBILITY_HIDDEN;
    resume.hidden = true;
  } else if (hasHiddenIndicator(document.body ? document.body.textContent : '')) {
    // Check body text for "Многие не видят" / "Сделать видимым"
    resume.visibility = VISIBILITY_HIDDEN;
    resume.hidden = true;
  } else {
    // Check for "Сделать видимым" button (or any button with "видим" text)
    const allBtns = document.querySelectorAll('button, a, [role="button"]');
    let foundMakeVisible = false;
    let foundHideResume = false;
    for (const btn of allBtns) {
      const text = normalizeWs((btn.textContent || '')).toLowerCase();
      const qa = (btn.getAttribute('data-qa') || '').toLowerCase();
      if (text.includes('сделать видимым') || qa.includes('make-visible') || qa.includes('show-resume')) {
        foundMakeVisible = true;
        break;
      }
      if (text.includes('скрыть резюме') || qa.includes('hide-resume') || qa.includes('resume-action-hide')) {
        foundHideResume = true;
        break;
      }
    }
    if (foundMakeVisible) {
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
    } else if (foundHideResume) {
      // If there's a "Скрыть резюме" button, the resume IS visible
      resume.visibility = VISIBILITY_VISIBLE;
      resume.hidden = false;
    } else {
      // Check for partial match: "не видят" / "не видно" (covers "Многие не видят", "не видно никому")
      const bodyText = normalizeWs(document.body ? document.body.textContent : '').toLowerCase();
      if (bodyText.includes('не видят') || bodyText.includes('не видно')) {
        resume.visibility = VISIBILITY_HIDDEN;
        resume.hidden = true;
      } else {
        // If we're on the resume page and there's no hidden indicator at all,
        // the resume is most likely visible (we're on the LIVE hydrated page)
        resume.visibility = VISIBILITY_VISIBLE;
        resume.hidden = false;
      }
    }
  }
  } // end if (resume.visibility === VISIBILITY_UNKNOWN)

  // ═════════════════════════════════════════
  // ИТОГО
  // ═════════════════════════════════════════
  const elapsed = (performance.now() - t0).toFixed(1);
  resumeLog.info('Resume parsed in ' + elapsed + 'ms');
  resumeLog.info('Found: ' + resume._debug.found.length + ' | Missing: ' + resume._debug.missing.length);
  resumeLog.info('Skills: ' + resume.skills.length + ' | Derived: ' + (resume.derivedSkills ? resume.derivedSkills.length : 0) + ' | Experience: ' + resume.experience.length + ' | Education: ' + resume.education.length);
  console.log('[HH-AR][Resume] Parsed resume:', JSON.stringify({
    id: resume.id, title: resume.title, salary: resume.salary,
    skills: resume.skills, experienceCount: resume.experience.length,
    educationCount: resume.education.length, languages: resume.languages,
    debug: resume._debug
  }, null, 2));

  return resume;
}