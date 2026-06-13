/**
 * PARSER: VACANCY DETAIL — Skills Extraction
 * =============================================
 * Multi-strategy skill extraction for vacancy pages.
 * Split from vacancy-detail.js for anti-monolith compliance.
 *
 * Strategies:
 *   1. [data-qa="skills-element"] — official hh.ru skill tags
 *   2. Broader DOM scan — [data-qa*="skill"], .bloko-tag__text in skill containers
 *   3. Description text extraction via SKILL_PATTERNS dictionary
 *
 * v1.9.19.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { SKILL_PATTERNS } from '../lib/skill-dictionary.js';

const skillLog = createLogger('VacSkills');

/**
 * Parse vacancy key skills using multiple strategies.
 * Populates vacancy.keySkills and vacancy.derivedSkills.
 * Sets vacancy._skillsSource to indicate which strategy won.
 *
 * @param {Object} vacancy — vacancy object (description must already be parsed)
 */
export function parseKeySkills(vacancy) {
  const domSkills = [];

  // ── Strategy 1: Official [data-qa="skills-element"] ──
  const skillItems = document.querySelectorAll('[data-qa="skills-element"]');
  skillItems.forEach(el => {
    const tagText = el.querySelector('.bloko-tag__text');
    const t = tagText ? tagText.textContent.trim() : el.textContent.trim();
    if (t && !domSkills.includes(t)) domSkills.push(t);
  });

  // ── Strategy 2a: Broader [data-qa*="skill"] scan ──
  if (domSkills.length === 0) {
    const broaderSkills = document.querySelectorAll('[data-qa*="skill"]');
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

  // ── Strategy 2b: Bloko tags in known skill containers ──
  if (domSkills.length === 0) {
    const skillsContainer = document.querySelector(
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

  // ── Strategy 3: Description text extraction via SKILL_PATTERNS ──
  const descText = _getDescriptionText(vacancy);
  const derivedFromDesc = _deriveSkillsFromText(descText);

  if (domSkills.length > 0 && derivedFromDesc.length > 0) {
    const domSkillsLower = new Set(domSkills.map(s => _normalizeSkill(s)));
    for (const ds of derivedFromDesc) {
      if (!domSkillsLower.has(_normalizeSkill(ds))) {
        vacancy.derivedSkills.push(ds);
      }
    }
    vacancy._skillsSource = vacancy.derivedSkills.length > 0 ? 'dom+derived' : 'dom';
  } else if (domSkills.length > 0) {
    vacancy._skillsSource = 'dom';
  } else if (derivedFromDesc.length > 0) {
    // No DOM skills — use derived skills as keySkills for scoring
    vacancy.keySkills = derivedFromDesc;
    vacancy.derivedSkills = [];
    vacancy._skillsSource = 'derived';
  } else {
    vacancy._skillsSource = 'none';
  }

  skillLog.info('KeySkills: ' + domSkills.length + ' DOM + ' +
    (vacancy._skillsSource === 'derived' ? '0' : vacancy.derivedSkills.length) +
    ' derived | source: ' + vacancy._skillsSource);
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Get description text for skill extraction.
 * Tries already-parsed description, falls back to DOM.
 */
function _getDescriptionText(vacancy) {
  if (vacancy.description && vacancy.description.text) {
    let text = vacancy.description.text;
    if (vacancy.description.headings) {
      text += '\n' + vacancy.description.headings.join('\n');
    }
    return text;
  }

  const descEl = document.querySelector('[data-qa="vacancy-description"]');
  if (descEl) {
    return (descEl.textContent || '').trim();
  }

  return '';
}

/**
 * Derive skills from text using SKILL_PATTERNS dictionary.
 * Scans text with all patterns and returns matched skill names.
 */
function _deriveSkillsFromText(text) {
  if (!text || text.length < 10) return [];

  const found = [];
  const foundLower = new Set();

  for (const { skill, patterns } of SKILL_PATTERNS) {
    const skillLower = _normalizeSkill(skill);
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

/**
 * Normalize a skill name for comparison.
 * Must match the normalization in match-scorer.js v1.9.19.0.
 */
function _normalizeSkill(name) {
  return name.toLowerCase().trim()
    .replace(/[-–—]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}
