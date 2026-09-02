/**
 * LIB: RESUME FETCH PARSE CONTACTS
 * =================================
 * Contacts parser (phone, email, telegram) extracted from
 * resume-fetch-parse.js (AHG Rule 12).
 */

const HH_SYSTEM_ACCOUNTS = ["hh_ru_official", "hhru", "hh_ru", "hhcareers", "headhunter_ru"];

export function parseContactsFromDoc(doc, dbg, resume) {
  const phoneSelectors = [
    '[data-qa="resume-contact-phone"] a',
    '[data-qa="resume-contact-phone"]',
    '[data-qa*="contact-phone"] a',
    '[data-qa*="contact-phone"]',
  ];
  for (const sel of phoneSelectors) {
    const el = doc.querySelector(sel);
    if (el) {
      const href = el.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        resume.phone = dbg("phone (tel:)", href.replace("tel:", "").trim());
        break;
      }
      const text = (el.textContent || "").trim();
      const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
      if (phoneMatch) {
        resume.phone = dbg("phone (data-qa regex)", phoneMatch[0]);
        break;
      }
    }
  }

  if (!resume.phone) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const telLinks = contactBlock.querySelectorAll('a[href^="tel:"]');
      if (telLinks.length > 0) {
        resume.phone = dbg("phone (tel link)", telLinks[0].getAttribute("href").replace("tel:", "").trim());
      }
    }
  }

  if (!resume.phone) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || "";
      const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
      if (phoneMatch) resume.phone = dbg("phone (regex)", phoneMatch[0]);
    }
  }

  const mailtoLink = doc.querySelector('a[href^="mailto:"]');
  if (mailtoLink) {
    const href = mailtoLink.getAttribute("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].trim();
    if (email && email.includes("@")) resume.email = dbg("email (mailto)", email);
  }

  if (!resume.email) {
    const emailSelectors = ['[data-qa="resume-contact-email"] a', '[data-qa="resume-contact-email"]'];
    for (const sel of emailSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const href = el.getAttribute("href") || "";
        if (href.startsWith("mailto:")) {
          const email = href.replace("mailto:", "").split("?")[0].trim();
          if (email && email.includes("@")) {
            resume.email = dbg("email (href)", email);
            break;
          }
        }
        const text = (el.textContent || "").trim();
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          resume.email = dbg("email (regex from data-qa)", emailMatch[0]);
          break;
        }
      }
    }
  }

  if (!resume.email) {
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = contactBlock.textContent || "";
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) resume.email = dbg("email (regex)", emailMatch[0]);
    }
  }

  const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
  if (contactBlock) {
    const contactLinks = contactBlock.querySelectorAll('a[href*="t.me/"]');
    for (const link of contactLinks) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/t\.me\/(\w+)/);
      if (match && !HH_SYSTEM_ACCOUNTS.includes(match[1].toLowerCase())) {
        resume.telegram = dbg("telegram", "@" + match[1]);
        break;
      }
    }
    if (!resume.telegram) {
      const text = contactBlock.textContent || "";
      const matches = text.matchAll(/@(\w{4,})/g);
      for (const m of matches) {
        if (!HH_SYSTEM_ACCOUNTS.includes(m[1].toLowerCase())) {
          resume.telegram = dbg("telegram (@)", "@" + m[1]);
          break;
        }
      }
    }
  }
}
