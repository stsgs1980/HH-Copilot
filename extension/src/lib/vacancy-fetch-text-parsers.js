/**
 * VACANCY FETCH -- Text Strategy: Section & Skills Parsers
 * =========================================================
 * Internal parsers for vacancy description sections, key skills,
 * and skill derivation from description text.
 *
 * Split from vacancy-fetch-text.js (AHG Rule 12).
 * v1.9.42.0
 */

import { SKILL_PATTERNS } from './skill-dictionary.js';

/**
 * Parse salary element from document into vacancy.salary.
 *
 * @param {Document} doc
 * @param {Object} vacancy -- mutated in-place
 */
export function parseSalaryFromDoc(doc, vacancy) {
  const salEl = doc.querySelector('[data-qa="vacancy-salary"]');
  if (!salEl) return;
  const raw = (salEl.textContent || '').trim().replace(/\s+/g, ' ');
  vacancy.salary.raw = raw;

  const nums = raw.match(/\d[\d\s]*\d/g);
  if (nums && nums.length > 0) {
    const parsed = nums.map(n => parseInt(n.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
    if (raw.startsWith('от') || raw.startsWith('from')) {
      vacancy.salary.min = parsed[0] || null;
    } else if (raw.startsWith('до') || raw.startsWith('up to')) {
      vacancy.salary.max = parsed[0] || null;
    } else if (parsed.length >= 2) {
      vacancy.salary.min = parsed[0];
      vacancy.salary.max = parsed[1];
    } else if (parsed.length === 1) {
      vacancy.salary.min = parsed[0];
    }
  }

  if (raw.includes('за год') || raw.includes('в год')) vacancy.salary.period = 'year';
  else if (raw.includes('за час') || raw.includes('в час')) vacancy.salary.period = 'hour';
  else vacancy.salary.period = 'month';

  vacancy.salary.net = raw.includes('на руки') || raw.includes('после вычета');

  if (raw.includes('руб.') || raw.includes('руб')) vacancy.salary.currency = 'RUB';
  else if (raw.includes('$') || raw.includes('USD')) vacancy.salary.currency = 'USD';
  else if (raw.includes('евро') || raw.includes('EUR')) vacancy.salary.currency = 'EUR';
}

/**
 * Parse description element into vacancy.description
 * (text, html, headings, sections).
 *
 * @param {Document} doc
 * @param {Object} vacancy -- mutated in-place
 */
export function parseDescriptionFromDoc(doc, vacancy) {
  const descEl = doc.querySelector('[data-qa="vacancy-description"]');
  if (!descEl) return;

  vacancy.description.text = (descEl.textContent || '').trim();
  vacancy.description.html = descEl.innerHTML;

  const headings = [];
  descEl.querySelectorAll('p > strong, p > b, h2, h3, h4').forEach(el => {
    const t = (el.textContent || '').trim();
    if (t.length > 3 && t.length < 200) headings.push(t);
  });
  vacancy.description.headings = headings;

  vacancy.description.sections = splitDescriptionSections(descEl);
}

/**
 * Split description element into semantic sections by heading.
 * Sections: responsibilities, requirements, advantages, conditions, other.
 *
 * @param {Element} root -- description container element
 * @returns {Object} { responsibilities, requirements, advantages, conditions, other }
 */
export function splitDescriptionSections(root) {
  const sectionPatterns = {
    responsibilities: /что предстоит делать|обязанности|задачи|вы будете|роль|what you.*do|responsibilities|duties/i,
    requirements: /наши ожидания|требования|требуемый опыт|мы ожидаем|what we expect|requirements|qualifications/i,
    advantages: /будет преимуществом|плюсом|желательно|nice to have|bonus|advantage/i,
    conditions: /условия|что предлагаем|что мы предлагаем|бенефиты|benefits|conditions|we offer/i,
  };

  const result = { responsibilities: '', requirements: '', advantages: '', conditions: '', other: '' };
  const children = root.children;
  let currentSection = 'other';
  const buffers = { other: [] };

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const text = (el.textContent || '').trim();
    if (!text) continue;

    const isHeading = el.tagName.match(/^H[2-4]$/) ||
      (el.tagName === 'P' && (el.querySelector('strong, b') !== null));

    if (isHeading) {
      let matched = false;
      for (const [key, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(text)) {
          currentSection = key;
          if (!buffers[key]) buffers[key] = [];
          matched = true;
          break;
        }
      }
      if (!matched) {
        currentSection = 'other';
        buffers.other.push(text);
      }
    } else {
      if (!buffers[currentSection]) buffers[currentSection] = [];
      buffers[currentSection].push(text);
    }
  }

  for (const [key, buf] of Object.entries(buffers)) {
    if (result[key] !== undefined) {
      result[key] = buf.join('\n');
    } else {
      result.other += (result.other ? '\n' : '') + buf.join('\n');
    }
  }

  return result;
}

/**
 * Parse key skills from document into vacancy.keySkills and
 * derive additional skills from description text.
 *
 * @param {Document} doc
 * @param {Object} vacancy -- mutated in-place
 */
export function parseKeySkillsFromDoc(doc, vacancy) {
  const domSkills = [];

  // Strategy 1: Official [data-qa="skills-element"]
  const skillItems = doc.querySelectorAll('[data-qa="skills-element"]');
  skillItems.forEach(el => {
    const tagText = el.querySelector('.bloko-tag__text');
    const t = tagText ? tagText.textContent.trim() : el.textContent.trim();
    if (t && !domSkills.includes(t)) domSkills.push(t);
  });

  // Strategy 2a: Broader [data-qa*="skill"]
  if (domSkills.length === 0) {
    const broaderSkills = doc.querySelectorAll('[data-qa*="skill"]');
    broaderSkills.forEach(el => {
      const t = (el.textContent || '').trim();
      if (t && t.length > 1 && t.length < 80 && !domSkills.includes(t)) {
        const parent = el.parentElement;
        if (parent && parent.querySelectorAll('[data-qa*="skill"]').length === 1) {
          domSkills.push(t);
        }
      }
    });
  }

  // Strategy 2b: Bloko tags in skill containers
  if (domSkills.length === 0) {
    const skillsContainer = doc.querySelector(
      '[data-qa="vacancy-key-skills"], [data-qa="skills-block"], .vacancy-key-skills'
    );
    if (skillsContainer) {
      skillsContainer.querySelectorAll('.bloko-tag__text').forEach(tag => {
        const t = (tag.textContent || '').trim();
        if (t && !domSkills.includes(t)) domSkills.push(t);
      });
    }
  }

  vacancy.keySkills = domSkills;

  // Strategy 3: Derive skills from description text
  const descText = getDescriptionText(vacancy);
  const derivedFromDesc = deriveSkillsFromText(descText);

  if (domSkills.length > 0 && derivedFromDesc.length > 0) {
    const domSkillsLower = new Set(domSkills.map(s => normalizeSkill(s)));
    for (const ds of derivedFromDesc) {
      if (!domSkillsLower.has(normalizeSkill(ds))) {
        vacancy.derivedSkills.push(ds);
      }
    }
    vacancy._skillsSource = vacancy.derivedSkills.length > 0 ? 'dom+derived' : 'dom';
  } else if (domSkills.length > 0) {
    vacancy._skillsSource = 'dom';
  } else if (derivedFromDesc.length > 0) {
    vacancy.keySkills = derivedFromDesc;
    vacancy.derivedSkills = [];
    vacancy._skillsSource = 'derived';
  } else {
    vacancy._skillsSource = 'none';
  }
}

// ===============================================
// INTERNAL HELPERS
// ===============================================

function getDescriptionText(vacancy) {
  if (vacancy.description && vacancy.description.text) {
    let text = vacancy.description.text;
    if (vacancy.description.headings) {
      text += '\n' + vacancy.description.headings.join('\n');
    }
    return text;
  }
  return '';
}

function deriveSkillsFromText(text) {
  if (!text || text.length < 10) return [];

  const found = [];
  const foundLower = new Set();

  for (const { skill, patterns } of SKILL_PATTERNS) {
    const skillLower = normalizeSkill(skill);
    if (foundLower.has(skillLower)) continue;

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        found.push(skill);
        foundLower.add(skillLower);
        break;
      }
    }
  }

  return found;
}

function normalizeSkill(name) {
  return name.toLowerCase().trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}
