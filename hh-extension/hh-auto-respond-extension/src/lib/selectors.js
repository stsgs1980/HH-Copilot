/**
 * LIB: SELECTORS
 * ===============
 * HH.ru DOM selectors for vacancy, resume, auth elements.
 * Uses data-qa attributes (Magritte-compatible) and Bloko BEM classes.
 */

// ===============================================
// SELECTORS MAP
// ===============================================

export const HH_SELECTORS = {
  // -- Vacancy Search --
  // ~= matches word in space-separated data-qa (e.g. "vacancy-serp__vacancy vacancy-serp-item_clickme")
  vacancyCard: ['[data-qa~="vacancy-serp__vacancy"]', '[data-qa="vacancy-serp__vacancy"]', '[class*="vacancy-serp-item"]'],
  vacancyTitleLink: ['a[data-qa="serp-item__title"]', 'a[data-qa="vacancy-serp__vacancy-title"]', 'a[href*="/vacancy/"]'],
  vacancyTitleText: ['[data-qa="serp-item__title-text"]'],
  vacancyCompany: ['[data-qa="vacancy-serp__vacancy-employer-text"]', 'a[data-qa="vacancy-serp__vacancy-employer"]'],
  vacancySalary: ['[data-qa="vacancy-serp__compensation"]'],
  vacancyLocation: ['[data-qa="vacancy-serp__vacancy-address"]'],
  vacancyExperience: ['[data-qa^="vacancy-serp__vacancy-work-experience"]'],
  vacancyTags: ['.bloko-tag__text', '[data-qa*="tag"]'],
  replyButton: ['[data-qa="vacancy-serp__vacancy_response"]', '[data-qa="vacancy-response-link-top"]'],
  nextPage: ['[data-qa="pager-next"]'],
  // -- Main Page: Vacancy of the Day --
  vacancyOfTheDayCard: ['[data-qa="vacancy_of_the_day_title"]'],
  vacancyOfTheDayTitle: ['[data-qa="vacancy_of_the_day_title"]'],
  vacancyOfTheDayCompensation: ['[data-qa="vacancy_of_the_day_compensation"]'],
  vacancyOfTheDayCompany: ['[data-qa="vacancy_of_the_day_company"]'],
  vacancyOfTheDayReply: ['[data-qa="vacancy-response-link-top-again"]'],
  // -- Vacancy Page --
  vacancyTitleOnPage: ['[data-qa="vacancy-title"]', 'h1.bloko-header-section-1'],
  vacancyCompanyOnPage: ['[data-qa="vacancy-company-name"]', 'a[data-qa="vacancy-company-name"]'],
  vacancyDescription: ['[data-qa="vacancy-description"]'],
  vacancyDescriptionContent: ['[data-qa="vacancy-description"] .vacancy-description-content'],
  vacancySkills: ['[data-qa="skills-element"]'],
  vacancySkillsOnPage: ['[data-qa="vacancy-serp__vacancy-skills"] .bloko-tag__text', '[data-qa="skills-element"]'],
  // Apply button on vacancy detail page
  vacancyApplyButton: [
    '[data-qa="vacancy-response-apply"]',
    '[data-qa="vacancy-response-link-top"]',
    'a[data-qa="vacancy-response-apply"]',
    'button[data-qa="vacancy-response-apply"]',
    'a[href*="/vacancy/response"]',
    '[class*="vacancy-response"] button',
    '[class*="vacancy-response"] a'
  ],
  // Popup / modal that appears after clicking apply
  responsePopup: ['[data-qa="vacancy-response-submit-popup"]', '[data-qa="vacancy-response-popup-submit"]'],
  addCoverLetter: ['[data-qa="add-cover-letter"]'],
  coverLetterInput: ['textarea[data-qa="vacancy-response-popup-form-letter-input"]'],
  submitButton: ['button[data-qa="vacancy-response-submit-popup"]', '[data-qa="vacancy-response-popup-submit"]', '[class*="response-popup"] button[type="submit"]'],
  alertMagritte: ['[data-qa="magritte-alert"]'],
  relocationConfirm: ['[data-qa="relocation-warning-confirm"]'],
  testTaskWarning: ['[data-qa="test-task-required"]'],
  alreadyApplied: ['[data-qa="already-applied"]', '[data-qa="vacancy-response-already-sent"]'],
  indirectEmployerAlert: ['[data-qa="indirect-employer-alert"]'],
  // -- Resume Page --
  // MAGRITE: hashed CSS-classes НЕ работают!
  // Только data-qa и Bloko BEM (бесхэшовые) классы.
  // parseResume() дополнительно использует автообнаружение по h2-заголовкам.
  resumeTitle: [
    '[data-qa="resume-block-title-position"]',
    'h2[data-qa="resume-block-title-position"]'
  ],
  resumeSalary: [
    '[data-qa="resume-block-salary"]',
    '[data-qa*="salary"]'
  ],
  resumeSkillsTable: [
    '[data-qa="skills-table"]',
    '[data-qa*="skill"]'
  ],
  resumeSkillTag: [
    '.bloko-tag__text',
    '[data-qa="bloko-tag__text"]'
  ],
  resumeSkillLevel3: ['[data-qa="skill-level-title-3"]'],
  resumeSkillLevel2: ['[data-qa="skill-level-title-2"]'],
  resumeSkillLevel1: ['[data-qa="skill-level-title-1"]'],
  resumePersonalName: [
    '[data-qa="resume-personal-name"]'
  ],
  // -- Resume List Page (applicant/resumes) --
  resumeListItem: [
    '[data-qa="resume-list-item"]'
  ],
  resumeListTitle: [
    '[data-qa="resume-list-item-title"]',
    'a[href*="/resume/"]'
  ],
  resumeListLink: [
    'a[href*="/resume/"]'
  ],
  // -- Negotiations (/applicant/negotiations) --
  negotiationsList:        ['[data-qa="negotiations-list"]'],
  negotiationsItem:        ['[data-qa="negotiations-item"]'],
  negotiationsItemVacancy: ['[data-qa="negotiations-item-vacancy"]'],
  negotiationsItemCompany: ['[data-qa="negotiations-item-company"]'],
  negotiationsItemDate:    ['[data-qa="negotiations-item-date"]'],
  negotiationsItemTag:     ['[data-qa^="negotiations-tag"]'],
  // -- Chatik (/chat) --
  chatikLayout:              ['[data-qa="chatik-layout"]'],
  chatikChatItem:            ['[data-qa^="chatik-open-chat-"]'],
  chatikCheckboxOnlyUnread:  ['[data-qa="chatik-checkbox-only-unread"]'],
  chatCellCreationTime:      ['[data-qa="chat-cell-creation-time"]'],
  chatCellMeta:              ['[data-qa="chat-cell-meta"]'],
  statusIconDelivered:       ['[data-qa="status-icon-delivered"]'],
  statusIconRead:            ['[data-qa="status-icon-read"]'],
  // -- Auth --
  loginEmailInput: ['input[name="username"]', 'input[type="email"]', 'input[data-qa="login-input-username"]'],
  loginPasswordInput: ['input[name="password"]', 'input[type="password"]', 'input[data-qa="login-input-password"]'],
  loginCaptchaImage: ['img[src*="captcha"]', '.g-recaptcha'],
  logged_in_indicator: ['[data-qa="mainmenu_applicant"]', '[data-qa="mainmenu_user_name"]', 'a[data-qa="mainmenu_myResumes"]']
};

// ===============================================
// SELECTOR HELPERS
// ===============================================

export function getSelectors(name) {
  const s = HH_SELECTORS[name];
  return (s && Array.isArray(s)) ? [...s] : [];
}

export function findElement(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (!el) continue;
      // НЕ проверяем offsetParent (null для fixed/transform элементов)
      if (root === document) {
        if (!document.body.contains(el)) continue;
      } else {
        if (!root.contains(el)) continue;
      }
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') return el;
    } catch (e) {}
  }
  return null;
}

export function findAllElements(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els && els.length > 0) return Array.from(els);
    } catch (e) {}
  }
  return [];
}
