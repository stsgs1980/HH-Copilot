/**
 * RESUME FETCH -- Skills parsing (5 strategies)
 * ==============================================
 * Extracted from resume-fetch-resume.js for anti-monolith compliance.
 * Handles skill extraction from a fetched resume HTML document.
 *
 * Strategies:
 *   1. data-qa="skills-card"
 *   2. data-qa="skills-table"
 *   3. Section with "Навыки" heading
 *   4. Any container with skill-related data-qa
 *   5. Magritte-style skill tags
 */


/**
 * Parse skills from a fetched HTML document.
 * @param {Document} doc -- parsed HTML document
 * @param {Function} dbg -- debug logger (key, value) => value
 * @param {Object} resume -- resume object to populate
 */
export function parseSkillsFromDoc(doc, dbg, resume) {
  // Strategy 1: data-qa="skills-card"
  const skillsCard = doc.querySelector('[data-qa="skills-card"]');

  if (skillsCard) {
    resume._debug.found.push('skillsBlock (data-qa="skills-card")');
    _extractSkillsFromDocContainer(skillsCard, doc, dbg, resume);
  } else {
    resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');

    // Strategy 2: data-qa="skills-table"
    const skillsTable = doc.querySelector('[data-qa="skills-table"]');
    if (skillsTable) {
      resume._debug.found.push('skillsBlock (data-qa="skills-table" fallback)');
      _extractSkillsFromDocContainer(skillsTable, doc, dbg, resume);
    }

    // Strategy 3: Section with "Навыки" heading
    if (resume.skills.length === 0) {
      const skillsSection = _findSkillsSectionByHeadingInDoc(doc);
      if (skillsSection) {
        resume._debug.found.push('skillsBlock (heading "Навыки" fallback)');
        _extractSkillsFromDocContainer(skillsSection, doc, dbg, resume);
      }
    }

    // Strategy 4: Any container with skill-related data-qa
    if (resume.skills.length === 0) {
      const skillElements = doc.querySelectorAll('[data-qa*="skill"]');
      if (skillElements.length > 0) {
        const topContainer = _findTopmostSkillContainerInDoc(skillElements);
        if (topContainer) {
          resume._debug.found.push('skillsBlock (data-qa*="skill" fallback)');
          _extractSkillsFromDocContainer(topContainer, doc, dbg, resume);
        }
      }
    }

    // Strategy 5: Magritte-style skill tags
    if (resume.skills.length === 0) {
      const magritteSkills = _findMagritteSkillTagsInDoc(doc);
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
  }
}

/**
 * Extract skills from a container element in a parsed HTML document.
 */
function _extractSkillsFromDocContainer(container, doc, dbg, resume) {
  // Skill levels
  const skillLevelEls = container.querySelectorAll('[data-qa^="skill-level-title-"]');
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
  // Skill tags (all known patterns)
  container.querySelectorAll(
    '[data-qa^="skill-tag-"], .bloko-tag__text, [data-qa^="resume-skill"], [data-qa*="skill-tag"], [data-qa="skills-element"]'
  ).forEach(tag => {
    const text = (tag.textContent || '').trim();
    if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
      resume.skills.push(text);
    }
  });
}

/**
 * Find "Навыки" section by heading text in a parsed HTML document.
 */
function _findSkillsSectionByHeadingInDoc(doc) {
  const headings = doc.querySelectorAll('h2, h3, [data-qa^="resume-block-title"]');
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
 * Find topmost container with skill-related data-qa in a parsed HTML document.
 */
function _findTopmostSkillContainerInDoc(skillElements) {
  const parents = [];
  for (const el of skillElements) {
    let p = el.parentElement;
    while (p && p !== el.ownerDocument.body) {
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
 * Scan for Magritte-style skill tags in a parsed HTML document.
 */
function _findMagritteSkillTagsInDoc(doc) {
  const skills = [];
  const tagSelectors = [
    '[data-qa^="resume-skill"]',
    '[data-qa*="skill-tag"]',
    '[data-qa="skills-element"]',
  ];
  for (const sel of tagSelectors) {
    doc.querySelectorAll(sel).forEach(el => {
      const text = (el.textContent || '').trim();
      if (text && text.length > 1 && text.length < 100) {
        skills.push(text);
      }
    });
  }
  return skills;
}
