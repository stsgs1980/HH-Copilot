/**
 * LIB: RESUME FETCH PARSE
 * ==========================
 * DOM-level parsers for fetched resume HTML: company card, personal data.
 * Contacts parser extracted to resume-fetch-parse-contacts.js (AHG Rule 12).
 * Education parser is in resume-fetch-parse-edu.js.
 */

export { parseContactsFromDoc } from "./resume-fetch-parse-contacts.js";
import { collectPersonalTexts, parseCardHead, parseStepperJob } from "./resume-dom-cells.js";

// ===============================================
// COMPANY CARD PARSER
// ===============================================

export function parseCompanyCardFromDoc(card) {
  const job = parseCardHead(card);

  const stepContent = card.querySelector('[data-qa="magritte-stepper-step-content"]');
  if (stepContent) {
    Object.assign(job, parseStepperJob(stepContent));
    const description = extractStepDescription(stepContent, job.position || "", job.period || "");
    if (description) job.description = description;
  }

  return job.company || job.position ? job : null;
}

function extractStepDescription(stepContent, posText, periodText) {
  let desc = (stepContent.textContent || "").trim();
  if (posText && desc.startsWith(posText)) {
    desc = desc.substring(posText.length);
  }
  if (periodText && desc.startsWith(periodText)) {
    desc = desc.substring(periodText.length);
  }
  desc = desc.trim();
  return desc.length > 20 ? desc : "";
}

// ===============================================
// PERSONAL DATA PARSER
// ===============================================

const GENDER_PATTERNS = [/(?:^|\s)(мужчина|женщина|мужской|женский|male|female)(?:$|\s)/i];
const AGE_PATTERN = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
const AGE_PATTERN2 = /(\d{2})\s*years?\s*old/i;
const EMPLOYMENT_META_PATTERN =
  /тип занятости|формат работы|график работы|полная занятость|частичная занятость|проектная работа|стажировка|удаленная работа|гибридный формат/i;
export function parsePersonalDataFromDoc(doc, titleEl, dbg, resume) {
  const posCard = doc.querySelector('[data-qa="resume-position-card"]');
  const personalText = collectPersonalTexts(posCard, titleEl);
  for (const t of personalText) {
    if (!resume.gender) {
      for (const gp of GENDER_PATTERNS) {
        const m = t.match(gp);
        if (m) {
          resume.gender = dbg("resumeGender", m[0]);
          break;
        }
      }
    }
    if (!resume.age) {
      const m = t.match(AGE_PATTERN) || t.match(AGE_PATTERN2);
      if (m) {
        resume.age = dbg("resumeAge", m[1] + " лет");
      }
    }
    if (!resume.address && t.length > 3) {
      const isGender = GENDER_PATTERNS.some((p) => p.test(t));
      const isAge = AGE_PATTERN.test(t) || AGE_PATTERN2.test(t);
      const isEmploymentMeta = EMPLOYMENT_META_PATTERN.test(t);
      if (
        !isGender &&
        !isAge &&
        !isEmploymentMeta &&
        !t.includes("руб") &&
        !t.includes("USD") &&
        !t.includes("з/п") &&
        !t.includes("уровень") &&
        !t.includes("доход") &&
        t !== resume.salary &&
        t !== resume.title
      ) {
        if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
          resume.address = dbg("resumeAddress", t);
        }
      }
    }
  }
}
