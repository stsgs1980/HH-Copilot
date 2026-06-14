/**
 * VACANCY DIAGNOSTIC -- Heuristic detectors
 * ==========================================
 * Extracted from vacancy-diagnostic.js for anti-monolith compliance.
 * Individual field detection functions for vacancy page diagnostics.
 */

export function detectTitle() {
  const qa = document.querySelector('[data-qa="vacancy-title"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim(), tag: qa.tagName };
  const h1 = document.querySelector('h1');
  if (h1) return { source: 'h1', value: h1.textContent.trim(), tag: 'H1' };
  return { source: null, value: null };
}

export function detectCompany() {
  const qa = document.querySelector('[data-qa="vacancy-company-name"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim(), tag: qa.tagName, href: qa.href || null };
  const sideCompany = document.querySelector('.vacancy-company-name a, [class*="company-name"] a');
  if (sideCompany) return { source: 'class-heuristic', value: sideCompany.textContent.trim(), tag: sideCompany.tagName, href: sideCompany.href || null };
  return { source: null, value: null };
}

export function detectSalary() {
  const qa = document.querySelector('[data-qa="vacancy-salary"], [data-qa="vacancy-serp__compensation"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  const bloko = document.querySelector('.vacancy-salary, [class*="vacancy-salary"]');
  if (bloko) return { source: 'class-heuristic', value: bloko.textContent.trim() };
  const h1 = document.querySelector('h1');
  if (h1) {
    const parent = h1.parentElement;
    if (parent) {
      const salaryEl = Array.from(parent.children).find(c =>
        /[\d\u00A0]+\s*\u20BD|[\d\u00A0]+\s*руб/i.test(c.textContent)
      );
      if (salaryEl) return { source: 'sibling-heuristic', value: salaryEl.textContent.trim() };
    }
  }
  return { source: null, value: null };
}

export function detectLocation() {
  const qa = document.querySelector('[data-qa="vacancy-view-location"], [data-qa*="location"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

export function detectExperience() {
  const qa = document.querySelector('[data-qa="vacancy-experience"], [data-qa*="experience"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

export function detectEmployment() {
  const qa = document.querySelector('[data-qa="vacancy-employment-mode"], [data-qa*="employment"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

export function detectSchedule() {
  const qa = document.querySelector('[data-qa="vacancy-work-schedule"], [data-qa*="schedule"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

export function detectKeySkills() {
  const qaItems = document.querySelectorAll('[data-qa="skills-element"]');
  if (qaItems.length > 0) {
    const texts = [];
    qaItems.forEach(el => {
      const tagText = el.querySelector('.bloko-tag__text');
      const t = tagText ? tagText.textContent.trim() : el.textContent.trim();
      if (t) texts.push(t);
    });
    if (texts.length > 0) return { source: 'data-qa', value: texts, count: texts.length };
  }
  const tagSection = document.querySelector('[data-qa="skills-element"]');
  if (tagSection) {
    const tags = tagSection.querySelectorAll('.bloko-tag__text');
    const texts = [];
    tags.forEach(el => { const t = (el.textContent || '').trim(); if (t) texts.push(t); });
    if (texts.length > 0) return { source: 'bloko-tags', value: texts, count: texts.length };
  }
  return { source: null, value: null, count: 0 };
}

export function detectDescription() {
  const qa = document.querySelector('[data-qa="vacancy-description"]');
  if (qa) {
    return {
      source: 'data-qa',
      found: true,
      textLength: qa.textContent.length,
      htmlLength: qa.innerHTML.length,
      textSnippet: qa.textContent.substring(0, 800).trim(),
      headings: extractHeadings(qa),
    };
  }
  return { source: null, found: false };
}

export function detectBrandedDescription() {
  const branded = document.querySelector('[data-qa="vacancy-branded-description"], .vacancy-branded-description, [class*="branded"]');
  if (branded) {
    return {
      source: 'data-qa/class',
      found: true,
      textLength: branded.textContent.length,
      htmlLength: branded.innerHTML.length,
      textSnippet: branded.textContent.substring(0, 300).trim(),
    };
  }
  return { source: null, found: false };
}

export function extractHeadings(root) {
  const headings = [];
  root.querySelectorAll('p > strong, h2, h3, h4, p > b').forEach(el => {
    const t = (el.textContent || '').trim();
    if (t.length > 5 && t.length < 150) headings.push(t);
  });
  return headings;
}

export function detectInfoBlocks() {
  const blocks = [];
  const infoItems = document.querySelectorAll('[data-qa*="vacancy-"]');
  const seen = new Set();
  infoItems.forEach(el => {
    const qa = el.getAttribute('data-qa');
    if (!qa || seen.has(qa)) return;
    seen.add(qa);
    blocks.push({
      dataQa: qa,
      tag: el.tagName,
      text: (el.textContent || '').substring(0, 120).trim().replace(/\s+/g, ' '),
      children: el.children.length,
    });
  });
  return blocks;
}
