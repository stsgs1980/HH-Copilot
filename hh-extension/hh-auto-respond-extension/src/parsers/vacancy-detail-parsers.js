/**
 * VACANCY DETAIL — Salary, Experience & Description parsers
 * ==========================================================
 * Extracted from vacancy-detail.js for anti-monolith compliance.
 */

/**
 * Parse salary from the vacancy page.
 */
export function parseSalary(vacancy) {
  const salEl = document.querySelector('[data-qa="vacancy-salary"]');
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

  if (raw.includes('₽') || raw.includes('руб')) vacancy.salary.currency = 'RUB';
  else if (raw.includes('$') || raw.includes('USD')) vacancy.salary.currency = 'USD';
  else if (raw.includes('€') || raw.includes('EUR')) vacancy.salary.currency = 'EUR';
}

/**
 * Parse experience requirement from the vacancy page.
 */
export function parseExperience(vacancy) {
  const expEl = document.querySelector('[data-qa="vacancy-experience"], [data-qa*="work-experience"], [data-qa*="experience"]');
  if (!expEl) return;
  const raw = (expEl.textContent || '').trim();
  vacancy.experience.raw = raw;

  if (raw.includes('Нет опыта') || raw.includes('нет опыта') || raw.includes('Не требуется')) {
    vacancy.experience.min = 0;
    vacancy.experience.max = 0;
    return;
  }

  const moreMatch = raw.match(/более\s*(\d+)/i);
  if (moreMatch) {
    vacancy.experience.min = parseInt(moreMatch[1], 10);
    return;
  }

  const rangeMatch = raw.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (rangeMatch) {
    vacancy.experience.min = parseInt(rangeMatch[1], 10);
    vacancy.experience.max = parseInt(rangeMatch[2], 10);
    return;
  }

  const singleMatch = raw.match(/(\d+)\s*(год|лет)/i);
  if (singleMatch) {
    vacancy.experience.min = parseInt(singleMatch[1], 10);
  }
}

/**
 * Parse vacancy description and split into sections.
 */
export function parseDescription(vacancy) {
  const descEl = document.querySelector('[data-qa="vacancy-description"]');
  if (!descEl) return;

  vacancy.description.text = (descEl.textContent || '').trim();
  vacancy.description.html = descEl.innerHTML;

  const headings = [];
  descEl.querySelectorAll('p > strong, p > b, h2, h3, h4').forEach(el => {
    const t = (el.textContent || '').trim();
    if (t.length > 3 && t.length < 200) headings.push(t);
  });
  vacancy.description.headings = headings;

  const sections = splitDescriptionSections(descEl);
  vacancy.description.sections = sections;
}

/**
 * Split description DOM into named sections based on heading patterns.
 */
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
      (el.tagName === 'P' && (el.querySelector('strong, b') || el.querySelector('strong, b')));

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
