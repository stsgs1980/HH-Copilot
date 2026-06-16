/**
 * LIB: RESUME FETCH PARSE
 * ==========================
 * DOM-level parsers for fetched resume HTML: company card, personal data.
 * Education parser is in resume-fetch-parse-edu.js.
 */


// ===============================================
// COMPANY CARD PARSER
// ===============================================

export function parseCompanyCardFromDoc(card) {
  const job = {};

  const cellLeft = card.querySelector('[data-qa="cell-left-side"]');
  if (cellLeft) {
    const cellTexts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
    if (cellTexts.length >= 1) {
      job.company = (cellTexts[0].textContent || '').trim();
    }
    if (cellTexts.length >= 2) {
      job.duration = (cellTexts[1].textContent || '').trim();
    }
  }

  const stepContent = card.querySelector('[data-qa="magritte-stepper-step-content"]');
  if (stepContent) {
    const stepCellLeft = stepContent.querySelector('[data-qa="cell-left-side"]');
    if (stepCellLeft) {
      const stepTexts = stepCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      if (stepTexts.length >= 1) {
        job.position = (stepTexts[0].textContent || '').trim();
      }
      if (stepTexts.length >= 2) {
        let rawPeriod = (stepTexts[1].textContent || '').trim();
        rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, '').trim();
        job.period = rawPeriod;
      }
    }
    const fullStepText = (stepContent.textContent || '').trim();
    let desc = fullStepText;
    const posText = job.position || '';
    const periodText = job.period || '';
    if (posText && desc.startsWith(posText)) {
      desc = desc.substring(posText.length);
    }
    if (periodText && desc.startsWith(periodText)) {
      desc = desc.substring(periodText.length);
    }
    desc = desc.trim();
    if (desc.length > 20) {
      job.description = desc;
    }
  }

  return (job.company || job.position) ? job : null;
}

// ===============================================
// PERSONAL DATA PARSER
// ===============================================

const GENDER_PATTERNS = [/(?:^|\s)(мужчина|женщина|мужской|женский|male|female)(?:$|\s)/i];
const AGE_PATTERN = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
const AGE_PATTERN2 = /(\d{2})\s*years?\s*old/i;

// ===============================================
// CONTACTS PARSER (phone, email, telegram)
// ===============================================

// Known hh.ru system accounts to exclude from telegram detection
const HH_SYSTEM_ACCOUNTS = ['hh_ru_official', 'hhru', 'hh_ru', 'hhcareers', 'headhunter_ru'];

export function parseContactsFromDoc(doc, dbg, resume) {
  // -- Phone --
  // Strategy 1: data-qa selectors (may include label text)
  const phoneSelectors = [
    '[data-qa="resume-contact-phone"] a',
    '[data-qa="resume-contact-phone"]',
    '[data-qa*="contact-phone"] a',
    '[data-qa*="contact-phone"]'
  ];
  for (const sel of phoneSelectors) {
    const el = doc.querySelector(sel);
    if (el) {
      // Prefer href (tel:) -- clean phone number without label
      const href = el.getAttribute('href') || '';
      if (href.startsWith('tel:')) {
        resume.phone = dbg('phone (tel:)', href.replace('tel:', '').trim());
        break;
      }
      // Extract phone from text via regex (avoids label glue like "Мобильный телефон+7...")
      const text = (el.textContent || '').trim();
      const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
      if (phoneMatch) {
        resume.phone = dbg('phone (data-qa regex)', phoneMatch[0]);
        break;
      }
    }
  }

  // Strategy 2: search for tel: links in contact block
  if (!resume.phone) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const telLinks = contactBlock.querySelectorAll('a[href^="tel:"]');
      if (telLinks.length > 0) {
        resume.phone = dbg('phone (tel link)', telLinks[0].getAttribute('href').replace('tel:', '').trim());
      }
    }
  }

  // Strategy 3: regex in contact block text
  if (!resume.phone) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || '';
      const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
      if (phoneMatch) resume.phone = dbg('phone (regex)', phoneMatch[0]);
    }
  }

  // -- Email --
  // Strategy 1: mailto: link (cleanest -- just the email, no label)
  const mailtoLink = doc.querySelector('a[href^="mailto:"]');
  if (mailtoLink) {
    const href = mailtoLink.getAttribute('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].trim();
    if (email && email.includes('@')) resume.email = dbg('email (mailto)', email);
  }

  // Strategy 2: data-qa selector with label stripping
  if (!resume.email) {
    const emailSelectors = [
      '[data-qa="resume-contact-email"] a',
      '[data-qa="resume-contact-email"]'
    ];
    for (const sel of emailSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        // Prefer href if it's a mailto link
        const href = el.getAttribute('href') || '';
        if (href.startsWith('mailto:')) {
          const email = href.replace('mailto:', '').split('?')[0].trim();
          if (email && email.includes('@')) { resume.email = dbg('email (href)', email); break; }
        }
        // Extract email from text via regex (avoids label glue like "Электронная почтаfoo@bar.com")
        const text = (el.textContent || '').trim();
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) { resume.email = dbg('email (regex from data-qa)', emailMatch[0]); break; }
      }
    }
  }

  // Strategy 3: regex in contact block text
  if (!resume.email) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || '';
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) resume.email = dbg('email (regex)', emailMatch[0]);
    }
  }

  // -- Telegram --
  // ONLY look within the contacts block -- avoid hh.ru footer/nav links
  const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
  if (contactBlock) {
    // Strategy 1: t.me/ links in contact block
    const contactLinks = contactBlock.querySelectorAll('a[href*="t.me/"]');
    for (const link of contactLinks) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/t\.me\/(\w+)/);
      if (match && !HH_SYSTEM_ACCOUNTS.includes(match[1].toLowerCase())) {
        resume.telegram = dbg('telegram', '@' + match[1]);
        break;
      }
    }
    // Strategy 2: @username in contact block text (exclude system accounts)
    if (!resume.telegram) {
      const text = contactBlock.textContent || '';
      const matches = text.matchAll(/@(\w{4,})/g);
      for (const m of matches) {
        if (!HH_SYSTEM_ACCOUNTS.includes(m[1].toLowerCase())) {
          resume.telegram = dbg('telegram (@)', '@' + m[1]);
          break;
        }
      }
    }
  }
}

export function parsePersonalDataFromDoc(doc, titleEl, dbg, resume) {
  const personalText = [];
  const posCard = doc.querySelector('[data-qa="resume-position-card"]');
  if (posCard) {
    posCard.querySelectorAll('span, div, p, a').forEach(el => {
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200) personalText.push(t);
    });
  }
  const titleContainer = titleEl ? titleEl.closest('div[data-qa], section') || titleEl.parentElement : null;
  if (titleContainer) {
    titleContainer.querySelectorAll('span, div, p, a').forEach(el => {
      if (el === titleEl || titleEl.contains(el)) return;
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200 && !personalText.includes(t)) personalText.push(t);
    });
  }

  for (const t of personalText) {
    if (!resume.gender) {
      for (const gp of GENDER_PATTERNS) {
        const m = t.match(gp);
        if (m) { resume.gender = dbg('resumeGender', m[0]); break; }
      }
    }
    if (!resume.age) {
      const m = t.match(AGE_PATTERN) || t.match(AGE_PATTERN2);
      if (m) { resume.age = dbg('resumeAge', m[1] + ' лет'); }
    }
    if (!resume.address && t.length > 3) {
      const isGender = GENDER_PATTERNS.some(p => p.test(t));
      const isAge = AGE_PATTERN.test(t) || AGE_PATTERN2.test(t);
      if (!isGender && !isAge && !t.includes('руб') && !t.includes('USD') &&
          !t.includes('з/п') && !t.includes('уровень') && !t.includes('доход') &&
          t !== resume.salary && t !== resume.title) {
        if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
          resume.address = dbg('resumeAddress', t);
        }
      }
    }
  }
}
