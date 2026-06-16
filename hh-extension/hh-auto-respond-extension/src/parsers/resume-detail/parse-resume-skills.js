/**
 * PARSER: RESUME DETAIL -- Skills extraction (5 strategies)
 * ==========================================================
 * Extracted from parse-resume-sections.js for anti-monolith compliance.
 * Handles skill extraction from the live DOM (current page).
 *
 * Strategies:
 *   1. data-qa="skills-card"
 *   2. data-qa="skills-table"
 *   3. Section with "Навыки" heading
 *   4. Any container with skill-related data-qa
 *   5. Magritte-style skill tags
 */

import { createLogger } from '../../lib/anti-hallucination.js';

const _resumeLog = createLogger('Resume');

/**
 * Parse skills from the current page DOM.
 * @param {Function} dbg -- debug logger (key, value) => value
 * @param {Object} resume -- resume object to populate
 */
export function parseSkills(dbg, resume) {
  // Strategy 1: data-qa="skills-card"
  const skillsCard = document.querySelector('[data-qa="skills-card"]');

  if (skillsCard) {
    resume._debug.found.push('skillsBlock (data-qa="skills-card")');
    _extractSkillsFromContainer(skillsCard, resume);
  } else {
    resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');

    // Strategy 2: data-qa="skills-table"
    const skillsTable = document.querySelector('[data-qa="skills-table"]');
    if (skillsTable) {
      resume._debug.found.push('skillsBlock (data-qa="skills-table" fallback)');
      _extractSkillsFromContainer(skillsTable, resume);
    }

    // Strategy 3: Section with "Навыки" heading
    if (resume.skills.length === 0) {
      const skillsSection = _findSkillsSectionByHeading();
      if (skillsSection) {
        resume._debug.found.push('skillsBlock (heading "Навыки" fallback)');
        _extractSkillsFromContainer(skillsSection, resume);
      }
    }

    // Strategy 4: Any container with skill-related data-qa
    if (resume.skills.length === 0) {
      const skillContainers = document.querySelectorAll('[data-qa*="skill"]');
      if (skillContainers.length > 0) {
        const topContainer = _findTopmostSkillContainer(skillContainers);
        if (topContainer) {
          resume._debug.found.push('skillsBlock (data-qa*="skill" fallback)');
          _extractSkillsFromContainer(topContainer, resume);
        }
      }
    }

    // Strategy 5: Magritte resume-block-item with skill tags
    if (resume.skills.length === 0) {
      const magritteSkills = _findMagritteSkillTags();
      if (magritteSkills.length > 0) {
        resume._debug.found.push('skillsBlock (Magritte tag scan fallback)');
        for (const text of magritteSkills) {
          if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
            resume.skills.push(text);
          }
        }
      }
    }
  }

  if (resume.skills.length > 0) {
    resume._debug.found.push('skills: ' + resume.skills.length + ' tags');
  } else if (!resume._debug.found.some(f => f.startsWith('skillsBlock'))) {
    resume._debug.missing.push('skills (no tags found)');
  }
}

/**
 * Extract skills, skill levels, and tag texts from a given container element.
 * Shared by all fallback strategies.
 */
function _extractSkillsFromContainer(container, resume) {
  // Skill levels
  const skillLevelEls = container.querySelectorAll('[data-qa^="skill-level-title-"]');
  skillLevelEls.forEach(el => {
    const qa = el.getAttribute('data-qa') || '';
    const lvlMatch = qa.match(/skill-level-title-(\d)/);
    if (lvlMatch) {
      const lvl = lvlMatch[1];
      const text = (el.textContent || '').trim();
      const labels = { '3': 'Продвинутый', '2': 'Средний', '1': 'Начальный' };
      resume.skillLevels[lvl] = labels[lvl] || text;
      resume._debug.found.push('skillLevel' + lvl + ': ' + (labels[lvl] || text));
    }
  });
  // Skill tags (data-qa)
  const skillTags = container.querySelectorAll('[data-qa^="skill-tag-"]');
  skillTags.forEach(tag => {
    const text = (tag.textContent || '').trim();
    if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
      resume.skills.push(text);
    }
  });
  // Bloko tags
  const blokoTags = container.querySelectorAll('.bloko-tag__text');
  blokoTags.forEach(tag => {
    const text = (tag.textContent || '').trim();
    if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
      resume.skills.push(text);
    }
  });
  // Magritte-style tags
  const magritteTags = container.querySelectorAll('[data-qa^="resume-skill"], [data-qa^="skill-tag"], [data-qa*="skill-tag"]');
  magritteTags.forEach(tag => {
    const text = (tag.textContent || '').trim();
    if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
      resume.skills.push(text);
    }
  });
}

/**
 * Find the "Навыки" section by looking for heading elements.
 */
function _findSkillsSectionByHeading() {
  const headings = document.querySelectorAll('h2, h3, [data-qa^="resume-block-title"]');
  for (const h of headings) {
    const text = (h.textContent || '').trim().toLowerCase();
    if (text === 'навыки' || text.startsWith('навыки') || text === 'ключевые навыки' || text.startsWith('ключевые навыки')) {
      let container = h.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        const tags = container.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"], [data-qa^="resume-skill"]');
        if (tags.length > 0) return container;
        container = container.parentElement;
      }
      let sibling = h.nextElementSibling;
      for (let i = 0; i < 3 && sibling; i++) {
        const tags = sibling.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"]');
        if (tags.length > 0) return sibling;
        sibling = sibling.nextElementSibling;
      }
    }
  }
  return null;
}

/**
 * Find the topmost container that holds skill-related data-qa elements.
 */
function _findTopmostSkillContainer(skillElements) {
  const parents = [];
  for (const el of skillElements) {
    let p = el.parentElement;
    while (p && p !== document.body) {
      parents.push(p);
      p = p.parentElement;
    }
  }
  for (const p of parents) {
    const skillChildren = p.querySelectorAll('[data-qa*="skill"]');
    if (skillChildren.length >= 2 && skillChildren.length <= 200) return p;
  }
  if (skillElements.length > 0) {
    return skillElements[0].closest('[data-qa="resume-block-item"]') ||
           skillElements[0].closest('section') ||
           skillElements[0].parentElement;
  }
  return null;
}

/**
 * Scan for Magritte-style skill tags on the page.
 */
function _findMagritteSkillTags() {
  const skills = [];
  const tagSelectors = [
    '[data-qa^="resume-skill"]',
    '[data-qa*="skill-tag"]',
    '[data-qa="skills-element"]',
  ];
  for (const sel of tagSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      const text = (el.textContent || '').trim();
      if (text && text.length > 1 && text.length < 100) {
        skills.push(text);
      }
    });
  }
  return skills;
}
