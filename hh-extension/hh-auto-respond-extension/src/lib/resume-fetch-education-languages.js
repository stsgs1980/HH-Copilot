/**
 * Education, languages, and "about me" section parsers.
 */
import { parseEducationFromDoc } from './resume-fetch-parse-edu.js';

/**
 * Parse education section from the resume document.
 * @param {Document} doc - Parsed document
 * @param {Function} dbg - Debug helper
 * @param {object} resume - Resume object to populate
 */
export function parseEducationFromDocSection(doc, dbg, resume) {
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

/**
 * Parse languages and "about me" section from the resume document.
 * @param {Document} doc - Parsed document
 * @param {Function} dbg - Debug helper
 * @param {object} resume - Resume object to populate
 */
export function parseLanguagesAndAbout(doc, dbg, resume) {
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
