/**
 * PARSER: RESUME DETAIL — Contacts (phone, email, telegram).
 * Extracted from parse-resume-personal.js for anti-monolith compliance.
 */

// Known hh.ru system accounts to exclude from telegram detection
const HH_SYSTEM_ACCOUNTS = ['hh_ru_official', 'hhru', 'hh_ru', 'hhcareers', 'headhunter_ru'];

export function parseContacts(dbg, resume) {
  // ── Phone ──
  // Strategy 1: data-qa selectors (may include label text)
  const phoneSelectors = [
    '[data-qa="resume-contact-phone"] a',
    '[data-qa="resume-contact-phone"]',
    '[data-qa*="contact-phone"] a',
    '[data-qa*="contact-phone"]'
  ];
  for (const sel of phoneSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      // Prefer href (tel:) — clean phone number without label
      const href = el.getAttribute('href') || '';
      if (href.startsWith('tel:')) {
        resume.phone = dbg('phone (tel:)', href.replace('tel:', '').trim());
        break;
      }
      // Extract phone from text via regex (avoids label glue like "Мобильный телефон+7...")
      const text = (el.textContent || '').trim();
      const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
      if (phoneMatch) {
        resume.phone = dbg('phone (data-qa regex)', phoneMatch[0]);
        break;
      }
    }
  }

  // Strategy 2: search for tel: links in contact block
  if (!resume.phone) {
    const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const telLinks = contactBlock.querySelectorAll('a[href^="tel:"]');
      if (telLinks.length > 0) {
        resume.phone = dbg('phone (tel link)', telLinks[0].getAttribute('href').replace('tel:', '').trim());
      }
    }
  }

  // Strategy 3: regex in contact block text
  if (!resume.phone) {
    const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || '';
      const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
      if (phoneMatch) resume.phone = dbg('phone (regex)', phoneMatch[0]);
    }
  }

  // ── Email ──
  // Strategy 1: mailto: link (cleanest — just the email, no label)
  const mailtoLink = document.querySelector('a[href^="mailto:"]');
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
      const el = document.querySelector(sel);
      if (el) {
        const href = el.getAttribute('href') || '';
        if (href.startsWith('mailto:')) {
          const email = href.replace('mailto:', '').split('?')[0].trim();
          if (email && email.includes('@')) { resume.email = dbg('email (href)', email); break; }
        }
        // Extract email from text via regex (avoids label glue like "Электронная почтаfoo@bar.com")
        const text = (el.textContent || '').trim();
        const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) { resume.email = dbg('email (regex from data-qa)', emailMatch[0]); break; }
      }
    }
  }

  // Strategy 3: regex in contact block text
  if (!resume.email) {
    const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || '';
      const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) resume.email = dbg('email (regex)', emailMatch[0]);
    }
  }

  // ── Telegram ──
  // ONLY look within the contacts block — avoid hh.ru footer/nav links
  const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
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
