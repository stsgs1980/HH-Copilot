/**
 * VACANCY FETCH -- Strategy 2: Text fetch + DOMParser
 * =====================================================
 * Fetches vacancy HTML via fetch() and parses it with DOMParser.
 * Fallback when iframe is blocked or cross-origin restricted.
 *
 * Also contains parseVacancyDetailFromDoc() -- shared parser used by
 * both text-fetch and iframe strategies. Extracts vacancy data from
 * a Document object (from DOMParser or iframe.contentDocument).
 *
 * IMPORTANT: DOMParser-parsed HTML does NOT execute JavaScript,
 * so React/Magritte components may not be hydrated. This means:
 *   - data-qa attributes are available (SSR-rendered)
 *   - Key skills section is usually present in SSR output
 *   - Description text is always available
 *   - Some dynamic elements may be missing
 *
 * v1.9.29.0
 */

import { createLogger } from './anti-hallucination.js';
import { SKILL_PATTERNS } from './skill-dictionary.js';
import { parseExperienceString } from './parse-experience.js';

const fetchLog = createLogger('VacFetchText');

/**
 * Fetch vacancy HTML and parse via DOMParser.
 * Returns a full vacancy detail object or null on failure.
 *
 * @param {string} vacancyUrl -- Full URL like https://hh.ru/vacancy/12345
 * @returns {Promise<Object|null>}
 */
export async function fetchVacancyViaText(vacancyUrl) {
  fetchLog.info('Fetching vacancy via text: ' + vacancyUrl);

  try {
    const resp = await fetch(vacancyUrl, {
      credentials: 'include',
      headers: { Accept: 'text/html' }
    });

    if (!resp.ok) {
      fetchLog.warn('fetch returned ' + resp.status + ' for ' + vacancyUrl);
      return null;
    }

    const html = await resp.text();
    fetchLog.info('Fetched ' + html.length + ' chars for ' + vacancyUrl);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const vacancy = parseVacancyDetailFromDoc(doc, vacancyUrl);

    if (vacancy) {
      vacancy._fetchMethod = 'text';
      fetchLog.info(
        'Text parsed: "' + vacancy.title.substring(0, 40) + '" | ' +
        'skills=' + vacancy.keySkills.length + ' derived=' + vacancy.derivedSkills.length
      );
    }

    return vacancy;
  } catch (err) {
    fetchLog.warn('Text fetch failed for ' + vacancyUrl + ': ' + err.message);
    return null;
  }
}

// ===============================================
// SHARED DOCUMENT PARSER
// ===============================================

/**
 * Parse a vacancy detail from a Document object.
 * Works with both DOMParser output and iframe.contentDocument.
 * This is the core parser -- no dependency on global `document`.
 *
 * @param {Document} doc -- Parsed document (from DOMParser or iframe)
 * @param {string} url -- Full vacancy URL
 * @returns {Object|null} Vacancy detail object or null
 */
export function parseVacancyDetailFromDoc(doc, url) {
  // Extract vacancy ID from URL
  const idMatch = url.match(/\/vacancy\/(\d+)/);
  if (!idMatch) {
    fetchLog.warn('Cannot extract vacancy ID from URL: ' + url);
    return null;
  }

  const vacancy = {
    id: idMatch[1],
    url: url.split('?')[0].split('#')[0],
    title: '',
    company: '',
    companyUrl: '',
    salary: { raw: '', min: null, max: null, currency: 'RUB', period: 'month', net: true },
    location: '',
    experience: { raw: '', min: null, max: null },
    employment: '',
    schedule: '',
    keySkills: [],
    derivedSkills: [],
    _skillsSource: 'none',
    description: { text: '', html: '', headings: [], sections: {} },
    hiringFormat: '',
    isRemote: false,
    hasApplyButton: false,
    parsedAt: new Date().toISOString(),
    source: 'detail',
  };

  // -- Title --
  const titleEl = doc.querySelector('[data-qa="vacancy-title"]');
  if (titleEl) {
    vacancy.title = (titleEl.textContent || '').trim();
  }
  if (!vacancy.title) {
    const h1 = doc.querySelector('h1');
    if (h1) vacancy.title = (h1.textContent || '').trim();
  }
  if (!vacancy.title) {
    fetchLog.warn('No title found in document');
    return null;
  }

  // -- Company --
  const companyEl = doc.querySelector(
    '[data-qa="vacancy-company-name"], [data-qa="vacancy-company"]'
  );
  if (companyEl) {
    vacancy.company = (companyEl.textContent || '').trim();
    const companyLink = companyEl.closest('a') || companyEl.querySelector('a');
    if (companyLink) {
      vacancy.companyUrl = companyLink.getAttribute('href') || '';
    }
  }

  // -- Salary --
  parseSalaryFromDoc(doc, vacancy);

  // -- Location --
  const addrEl = doc.querySelector(
    '[data-qa="vacancy-address-with-map"], [data-qa="vacancy-view-raw-address"]'
  );
  if (addrEl) {
    vacancy.location = (addrEl.textContent || '').trim().replace(/\s+/g, ' ');
  }

  // -- Experience --
  parseExperienceFromDoc(doc, vacancy);

  // -- Employment type --
  const empEl = doc.querySelector(
    '[data-qa="common-employment-text"], [data-qa*="employment"]'
  );
  if (empEl) vacancy.employment = (empEl.textContent || '').trim();

  // -- Schedule --
  const schedEl = doc.querySelector(
    '[data-qa="work-schedule-by-days-text"], [data-qa*="work-schedule"], [data-qa*="schedule"]'
  );
  if (schedEl) vacancy.schedule = (schedEl.textContent || '').trim();

  // -- Remote --
  vacancy.isRemote = !!doc.querySelector('[data-qa="vacancy-label-work-schedule-remote"]');

  // -- Description (BEFORE skills -- text is used for derivation) --
  parseDescriptionFromDoc(doc, vacancy);

  // -- Key Skills --
  parseKeySkillsFromDoc(doc, vacancy);

  // -- Hiring format --
  const hireEl = doc.querySelector('[data-qa="vacancy-hiring-formats"]');
  if (hireEl) vacancy.hiringFormat = (hireEl.textContent || '').trim().replace(/\s+/g, ' ');

  // -- Apply button --
  vacancy.hasApplyButton = !!doc.querySelector(
    '[data-qa="vacancy-response-link-top"], [data-qa="vacancy-apply-button"]'
  );

  return vacancy;
}

// ===============================================
// SECTION PARSERS (from Document, not global)
// ===============================================

function parseSalaryFromDoc(doc, vacancy) {
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

function parseExperienceFromDoc(doc, vacancy) {
  const expEl = doc.querySelector(
    '[data-qa="vacancy-experience"], [data-qa*="work-experience"], [data-qa*="experience"]'
  );
  if (!expEl) return;
  const raw = (expEl.textContent || '').trim();
  vacancy.experience = parseExperienceString(raw);
}

function parseDescriptionFromDoc(doc, vacancy) {
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

function splitDescriptionSections(root) {
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

function parseKeySkillsFromDoc(doc, vacancy) {
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
    vacancy.keySkills = derivedFromDesc;
    vacancy.derivedSkills = [];
    vacancy._skillsSource = 'derived';
  } else {
    vacancy._skillsSource = 'none';
  }
}

// ===============================================
// HELPERS
// ===============================================

function _getDescriptionText(vacancy) {
  if (vacancy.description && vacancy.description.text) {
    let text = vacancy.description.text;
    if (vacancy.description.headings) {
      text += '\n' + vacancy.description.headings.join('\n');
    }
    return text;
  }
  return '';
}

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

function _normalizeSkill(name) {
  return name.toLowerCase().trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}
