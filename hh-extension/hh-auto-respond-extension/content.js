(() => {
  // src/lib/anti-hallucination.js
  function safeGetText(el, fallback) {
    fallback = fallback || "";
    if (!el || !(el instanceof Element)) return fallback;
    if (el.offsetParent === null && document.body.contains(el)) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return fallback;
    }
    const text = (el.textContent || "").trim();
    return text.length > 0 ? text : fallback;
  }
  function safeGetAttr(el, attr, fallback) {
    fallback = fallback || "";
    if (!el || !(el instanceof Element)) return fallback;
    const v = el.getAttribute(attr);
    return v !== null ? v : fallback;
  }
  function validateVacancyData(v) {
    const errors = [];
    if (!v || typeof v !== "object") return { valid: false, errors: ["not an object"] };
    if (!v.title || typeof v.title !== "string" || v.title.trim().length < 3) errors.push("bad title");
    if (!v.company || typeof v.company !== "string") errors.push("bad company");
    if (!v.url || typeof v.url !== "string" || !v.url.startsWith("https://hh.ru/")) errors.push("bad url");
    if (!v.id || typeof v.id !== "string") errors.push("bad id");
    return { valid: errors.length === 0, errors };
  }
  function extractVacancyId(url) {
    if (!url || typeof url !== "string") return "";
    const m = url.match(/\/vacancy\/(\d+)/);
    return m ? m[1] : "";
  }
  function waitForElement(selectors, timeout, root) {
    timeout = timeout || 1e4;
    root = root || document;
    const checkVisible = (el) => {
      if (!el) return false;
      const container = root === document ? document.body : root;
      if (!container.contains(el)) return false;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    return new Promise((resolve) => {
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel);
          if (checkVisible(el)) {
            resolve(el);
            return;
          }
        } catch (e) {
        }
      }
      const startTime = Date.now();
      const observer = new MutationObserver(() => {
        if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(null);
          return;
        }
        for (const sel of selectors) {
          try {
            const el = root.querySelector(sel);
            if (checkVisible(el)) {
              observer.disconnect();
              resolve(el);
              return;
            }
          } catch (e) {
          }
        }
      });
      observer.observe(root.body || root, { childList: true, subtree: true });
    });
  }
  function safeClick(el, label) {
    if (!el || !(el instanceof Element) || el.disabled) return false;
    if (!document.body.contains(el)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    el.click();
    return true;
  }
  function safeInput(el, text, label) {
    if (!el || !(el instanceof HTMLElement) || el.disabled || el.readOnly) return false;
    if (typeof text !== "string" || text.length === 0) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) {
      setter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function createLogger(module) {
    return {
      info: (action, data) => console.debug("[HH-AR][" + module + "] " + action, data || ""),
      warn: (action, data) => console.warn("[HH-AR][" + module + "] " + action, data || ""),
      error: (action, data) => console.error("[HH-AR][" + module + "] " + action, data || "")
    };
  }

  // src/lib/storage.js
  var DEFAULT_SETTINGS = {
    mode: "manual",
    dailyLimit: 200,
    minMatchScore: 60,
    letterTone: "formal",
    searchInterval: 300,
    autoScroll: true,
    showMatchScore: true,
    confirmBeforeApply: true
  };
  var DEFAULT_STATS = {
    totalApplied: 0,
    appliedToday: 0,
    interviewInvites: 0,
    responsesReceived: 0,
    skipsToday: 0,
    errorsToday: 0,
    lastActivity: null
  };
  async function getAllSettings() {
    try {
      const d = await chrome.storage.local.get("settings");
      return Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  async function getStats() {
    try {
      await checkDailyReset();
      const d = await chrome.storage.local.get("stats");
      return Object.assign({}, DEFAULT_STATS, d.stats || {});
    } catch (e) {
      return Object.assign({}, DEFAULT_STATS);
    }
  }
  async function incrementApplied() {
    const stats = await getStats();
    const settings = await getAllSettings();
    if (stats.appliedToday >= settings.dailyLimit) return { allowed: false, remaining: 0 };
    stats.appliedToday++;
    stats.totalApplied++;
    stats.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
    await chrome.storage.local.set({ stats });
    return { allowed: true, remaining: settings.dailyLimit - stats.appliedToday };
  }
  async function isAlreadyApplied(id) {
    try {
      const d = await chrome.storage.local.get("appliedVacancies");
      return (d.appliedVacancies || []).includes(id);
    } catch (e) {
      return false;
    }
  }
  async function markAsApplied(id) {
    try {
      const d = await chrome.storage.local.get("appliedVacancies");
      const arr = d.appliedVacancies || [];
      if (!arr.includes(id)) {
        arr.push(id);
        await chrome.storage.local.set({ appliedVacancies: arr });
      }
    } catch (e) {
    }
  }
  async function checkDailyReset() {
    try {
      const d = await chrome.storage.local.get("dailyResetDate");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (d.dailyResetDate !== today) {
        const sd = await chrome.storage.local.get("stats");
        const s = sd.stats || DEFAULT_STATS;
        s.appliedToday = 0;
        s.skipsToday = 0;
        s.errorsToday = 0;
        await chrome.storage.local.set({ stats: s, dailyResetDate: today });
      }
    } catch (e) {
    }
  }

  // src/lib/selectors.js
  var HH_SELECTORS = {
    // ── Vacancy Search ──
    vacancyCard: ['[data-qa="vacancy-serp__vacancy"]', '[class*="vacancy-serp-item"]'],
    vacancyTitleLink: ['a[data-qa="serp-item__title"]', 'a[data-qa="vacancy-serp__vacancy-title"]'],
    vacancyTitleText: ['[data-qa="serp-item__title-text"]'],
    vacancyCompany: ['[data-qa="vacancy-serp__vacancy-employer-text"]', 'a[data-qa="vacancy-serp__vacancy-employer"]'],
    vacancySalary: ['[data-qa="vacancy-serp__compensation"]'],
    vacancyLocation: ['[data-qa="vacancy-serp__vacancy-address"]'],
    vacancyExperience: ['[data-qa^="vacancy-serp__vacancy-work-experience"]'],
    vacancyTags: [".bloko-tag__text", '[data-qa*="tag"]'],
    replyButton: ['[data-qa="vacancy-serp__vacancy_response"]', '[data-qa="vacancy-response-link-top"]'],
    nextPage: ['[data-qa="pager-next"]'],
    // ── Vacancy Page ──
    vacancyTitleOnPage: ['[data-qa="vacancy-title"]', "h1.bloko-header-section-1"],
    vacancyCompanyOnPage: ['[data-qa="vacancy-company-name"]', 'a[data-qa="vacancy-company-name"]'],
    vacancyDescription: ['[data-qa="vacancy-description"]'],
    vacancyDescriptionContent: ['[data-qa="vacancy-description"] .vacancy-description-content'],
    vacancySkills: ['[data-qa="skills-element"]'],
    vacancySkillsOnPage: ['[data-qa="vacancy-serp__vacancy-skills"] .bloko-tag__text', '[data-qa="skills-element"]'],
    responsePopup: ['[data-qa="vacancy-response-submit-popup"]'],
    addCoverLetter: ['[data-qa="add-cover-letter"]'],
    coverLetterInput: ['textarea[data-qa="vacancy-response-popup-form-letter-input"]'],
    submitButton: ['[data-qa="vacancy-response-submit-popup"]'],
    alertMagritte: ['[data-qa="magritte-alert"]'],
    relocationConfirm: ['[data-qa="relocation-warning-confirm"]'],
    testTaskWarning: ['[data-qa="test-task-required"]'],
    alreadyApplied: ['[data-qa="already-applied"]'],
    indirectEmployerAlert: ['[data-qa="indirect-employer-alert"]'],
    // ── Resume Page ──
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
      ".bloko-tag__text",
      '[data-qa="bloko-tag__text"]'
    ],
    resumeSkillLevel3: ['[data-qa="skill-level-title-3"]'],
    resumeSkillLevel2: ['[data-qa="skill-level-title-2"]'],
    resumeSkillLevel1: ['[data-qa="skill-level-title-1"]'],
    resumePersonalName: [
      '[data-qa="resume-personal-name"]'
    ],
    // ── Resume List Page (applicant/resumes) ──
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
    // ── Negotiations ──
    negotiationsChatItem: ['[data-qa="negotiations-chat-item"]', '[class*="negotiations-chat"]'],
    negotiationsChatUnread: ['[data-qa="negotiations-chat-unread"]', '[class*="unread"]'],
    // ── Auth ──
    loginEmailInput: ['input[name="username"]', 'input[type="email"]', 'input[data-qa="login-input-username"]'],
    loginPasswordInput: ['input[name="password"]', 'input[type="password"]', 'input[data-qa="login-input-password"]'],
    loginCaptchaImage: ['img[src*="captcha"]', ".g-recaptcha"],
    logged_in_indicator: ['[data-qa="mainmenu_applicant"]', '[data-qa="mainmenu_user_name"]', 'a[data-qa="mainmenu_myResumes"]']
  };
  function getSelectors(name) {
    const s = HH_SELECTORS[name];
    return s && Array.isArray(s) ? [...s] : [];
  }
  function findElement(name, root) {
    root = root || document;
    const selectors = getSelectors(name);
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (!el) continue;
        if (root === document) {
          if (!document.body.contains(el)) continue;
        } else {
          if (!root.contains(el)) continue;
        }
        const style = window.getComputedStyle(el);
        if (style.display !== "none" && style.visibility !== "hidden") return el;
      } catch (e) {
      }
    }
    return null;
  }
  function findAllElements(name, root) {
    root = root || document;
    const selectors = getSelectors(name);
    for (const sel of selectors) {
      try {
        const els = root.querySelectorAll(sel);
        if (els && els.length > 0) return Array.from(els);
      } catch (e) {
      }
    }
    return [];
  }

  // src/parsers/vacancy-list.js
  var parserLog = createLogger("Parser");
  async function parseVacanciesFromPage() {
    const cards = findAllElements("vacancyCard");
    parserLog.info("Found " + cards.length + " vacancy cards");
    if (cards.length === 0) return [];
    const vacancies = [];
    let appliedIds = [], blacklisted = [];
    try {
      const d1 = await chrome.storage.local.get("appliedVacancies");
      appliedIds = d1.appliedVacancies || [];
      const d2 = await chrome.storage.local.get("blacklistedCompanies");
      blacklisted = d2.blacklistedCompanies || [];
    } catch (e) {
    }
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const titleEl = findElement("vacancyTitleLink", card);
      const title = safeGetText(titleEl);
      if (!title) continue;
      const url = safeGetAttr(titleEl, "href", "");
      const id = extractVacancyId(url.startsWith("/") ? "https://hh.ru" + url : url);
      if (!id) continue;
      const company = safeGetText(findElement("vacancyCompany", card));
      const salary = safeGetText(findElement("vacancySalary", card), "");
      const location = safeGetText(findElement("vacancyLocation", card), "");
      const experience = safeGetText(findElement("vacancyExperience", card), "");
      const tagEls = card.querySelectorAll('.bloko-tag__text, [data-qa="bloko-tag"]');
      const skills = [];
      tagEls.forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t && t.length < 50) skills.push(t);
      });
      const replyBtn = findElement("replyButton", card);
      const hasReply = replyBtn !== null;
      const vacancy = {
        id,
        title: title.trim(),
        company: (company || "").trim(),
        salary: salary || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430",
        location: (location || "").trim(),
        experience: (experience || "").trim(),
        skills,
        url: url.startsWith("/") ? "https://hh.ru" + url : url,
        hasReply,
        status: "new",
        parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
        matchScore: null
      };
      const validation = validateVacancyData(vacancy);
      if (!validation.valid) {
        parserLog.warn("Card #" + i + " invalid: " + validation.errors.join(", "));
        continue;
      }
      if (appliedIds.includes(vacancy.id)) vacancy.status = "applied";
      if (blacklisted.includes(vacancy.company)) vacancy.status = "blacklisted";
      vacancies.push(vacancy);
    }
    parserLog.info("Parsed " + vacancies.length + "/" + cards.length + " valid vacancies");
    return vacancies;
  }

  // src/parsers/resume-detail.js
  var resumeLog = createLogger("Resume");
  function getResumePageType() {
    const path = window.location.pathname;
    if (/\/resume\/[a-f0-9]+/.test(path)) return "resume";
    if (path.includes("/applicant/resumes")) return "resume-list";
    return "other";
  }
  async function expandHiddenSections() {
    const expandButtons = document.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
    const clicked = [];
    expandButtons.forEach((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0451") || text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435") || text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451") || text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435") || text.includes("\u0440\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C") || text.includes("expand")) {
        try {
          btn.click();
          clicked.push(text);
        } catch (e) {
        }
      }
    });
    if (clicked.length > 0) {
      resumeLog.info("Expanded hidden sections: " + clicked.join(", "));
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  function diagnoseResumeDOM() {
    console.log("%c[HH-AR][DIAG] \u2550\u2550\u2550 DOM DIAGNOSTIC DUMP \u2550\u2550\u2550", "color:#2964FF;font-weight:bold;font-size:14px");
    console.log("[HH-AR][DIAG] URL:", window.location.href);
    console.log("[HH-AR][DIAG] Page type:", getResumePageType());
    const allQa = document.querySelectorAll("[data-qa]");
    const qaMap = {};
    allQa.forEach((el) => {
      const qa = el.getAttribute("data-qa");
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || "").trim().substring(0, 80);
      const key = qa;
      if (!qaMap[key]) qaMap[key] = [];
      qaMap[key].push({ tag, text: text || "(empty)", class: (el.className || "").toString().substring(0, 60) });
    });
    const groups = {};
    Object.keys(qaMap).sort().forEach((qa) => {
      const prefix = qa.split("__")[0].split("-")[0].split("_")[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(qa);
    });
    console.log("%c[HH-AR][DIAG] Total data-qa elements: " + allQa.length, "color:#22c55e");
    console.log("%c[HH-AR][DIAG] Unique data-qa values: " + Object.keys(qaMap).length, "color:#22c55e");
    console.group("%c[HH-AR][DIAG] All data-qa values:", "color:#2964FF");
    console.table(Object.keys(qaMap).sort().map((qa) => ({
      "data-qa": qa,
      "count": qaMap[qa].length,
      "tag": qaMap[qa][0].tag,
      "sample_text": qaMap[qa][0].text,
      "sample_class": qaMap[qa][0].class
    })));
    console.groupEnd();
    console.group("%c[HH-AR][DIAG] Groups by prefix:", "color:#2964FF");
    Object.keys(groups).sort().forEach((prefix) => {
      console.log("%c  " + prefix + " (" + groups[prefix].length + "):", "color:#f59e0b", groups[prefix].join(", "));
    });
    console.groupEnd();
    console.group('%c[HH-AR][DIAG] Resume blocks (.resume-block, [data-qa*="resume"]):', "color:#2964FF");
    const resumeBlocks = document.querySelectorAll('[data-qa*="resume"], .resume-block, [class*="resume"]');
    resumeBlocks.forEach((block, i) => {
      const qa = block.getAttribute("data-qa") || "(no data-qa)";
      const cls = (block.className || "").toString().substring(0, 100);
      const text = (block.textContent || "").trim().substring(0, 120);
      console.log("  Block #" + i + ":", { qa, cls, text });
    });
    console.groupEnd();
    console.group('%c[HH-AR][DIAG] Bloko tags (.bloko-tag, [data-qa*="tag"]):', "color:#2964FF");
    const tags = document.querySelectorAll('.bloko-tag, .bloko-tag__text, [data-qa*="tag"], [data-qa*="skill"]');
    const tagTexts = [];
    tags.forEach((tag) => {
      const t = (tag.textContent || "").trim();
      if (t && t.length < 100 && !tagTexts.includes(t)) {
        tagTexts.push(t);
        console.log("  Tag:", t, "| data-qa:", tag.getAttribute("data-qa") || "(none)", "| class:", (tag.className || "").toString().substring(0, 60));
      }
    });
    console.log("  Total unique tags:", tagTexts.length);
    console.groupEnd();
    console.group("%c[HH-AR][DIAG] Selector check (resume selectors):", "color:#2964FF");
    const resumeSelectorKeys = Object.keys(HH_SELECTORS).filter((k) => k.startsWith("resume"));
    resumeSelectorKeys.forEach((key) => {
      const sels = HH_SELECTORS[key];
      let found = false;
      for (const sel of sels) {
        try {
          const el = document.querySelector(sel);
          if (el && document.body.contains(el)) {
            console.log("%c  \u2713 " + key + " \u2192 " + sel, "color:#22c55e", "text:", (el.textContent || "").trim().substring(0, 60));
            found = true;
            break;
          }
        } catch (e) {
        }
      }
      if (!found) {
        console.log("%c  \u2717 " + key + " \u2192 none matched", "color:#ef4444", "tried:", sels);
      }
    });
    console.groupEnd();
    console.group("%c[HH-AR][DIAG] Headings (h1-h3):", "color:#2964FF");
    document.querySelectorAll("h1, h2, h3").forEach((h) => {
      console.log("  " + h.tagName + ":", (h.textContent || "").trim().substring(0, 100), "| data-qa:", h.getAttribute("data-qa") || "(none)");
    });
    console.groupEnd();
    console.group('%c[HH-AR][DIAG] Page sections (section, [data-qa*="block"]):', "color:#2964FF");
    const sections = document.querySelectorAll('section, [data-qa*="block"], .bloko-column');
    sections.forEach((s, i) => {
      const qa = s.getAttribute("data-qa") || "(none)";
      const heading = s.querySelector('h2, h3, [data-qa*="title"]');
      const headingText = heading ? (heading.textContent || "").trim().substring(0, 80) : "(no heading)";
      console.log("  Section #" + i + ":", qa, "| heading:", headingText);
    });
    console.groupEnd();
    console.group("%c[HH-AR][DIAG] Experience block inner structure:", "color:#ef4444;font-weight:bold");
    const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCard) {
      console.log("  experienceBlock FOUND, children:", expCard.children.length);
      const expQa = expCard.querySelectorAll("[data-qa]");
      expQa.forEach((el, i) => {
        console.log("  expQa[" + i + "]:", el.getAttribute("data-qa"), "| tag:", el.tagName, "| text:", (el.textContent || "").trim().substring(0, 100));
      });
      Array.from(expCard.children).forEach((child, i) => {
        const qa = child.getAttribute("data-qa") || "(no data-qa)";
        const tag = child.tagName;
        const text = (child.textContent || "").trim().substring(0, 150);
        const subQa = Array.from(child.querySelectorAll("[data-qa]")).map((e) => e.getAttribute("data-qa"));
        console.log("  child[" + i + "]:", { tag, qa, text, subDataQa: subQa });
      });
    } else {
      console.log("  experienceBlock NOT FOUND");
    }
    console.groupEnd();
    console.group("%c[HH-AR][DIAG] Education block inner structure:", "color:#ef4444;font-weight:bold");
    const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
    if (eduCard) {
      console.log("  educationBlock FOUND, children:", eduCard.children.length);
      const eduQa = eduCard.querySelectorAll("[data-qa]");
      eduQa.forEach((el, i) => {
        console.log("  eduQa[" + i + "]:", el.getAttribute("data-qa"), "| tag:", el.tagName, "| text:", (el.textContent || "").trim().substring(0, 100));
      });
      Array.from(eduCard.children).forEach((child, i) => {
        const qa = child.getAttribute("data-qa") || "(no data-qa)";
        const tag = child.tagName;
        const text = (child.textContent || "").trim().substring(0, 150);
        const subQa = Array.from(child.querySelectorAll("[data-qa]")).map((e) => e.getAttribute("data-qa"));
        console.log("  child[" + i + "]:", { tag, qa, text, subDataQa: subQa });
      });
    } else {
      console.log("  educationBlock NOT FOUND");
    }
    console.groupEnd();
    console.log("%c[HH-AR][DIAG] \u2550\u2550\u2550 END DUMP \u2550\u2550\u2550", "color:#2964FF;font-weight:bold");
    console.log("%c[HH-AR][DIAG] \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0412\u0415\u0421\u042C \u0432\u044B\u0432\u043E\u0434 \u0438\u0437 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C \u043C\u043D\u0435.", "color:#ef4444;font-size:13px");
  }
  function parseResume() {
    const t0 = performance.now();
    const resume = {
      id: "",
      url: window.location.href,
      title: "",
      salary: "",
      gender: "",
      age: "",
      address: "",
      specializations: [],
      skills: [],
      skillLevels: {},
      experience: [],
      education: [],
      languages: [],
      additionalInfo: "",
      parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
      _debug: { found: [], missing: [] }
    };
    const hashMatch = window.location.pathname.match(/\/resume\/([a-f0-9]+)/);
    resume.id = hashMatch ? hashMatch[1] : "";
    const dbg = (key, val) => {
      if (val) resume._debug.found.push(key + ": " + (typeof val === "string" ? '"' + val.substring(0, 60) + '"' : val));
      else resume._debug.missing.push(key);
      return val;
    };
    const titleEl = document.querySelector('[data-qa="resume-block-title-position"]');
    if (titleEl) {
      resume.title = dbg("resumeTitle (data-qa)", safeGetText(titleEl));
    }
    if (!resume.title) {
      const h1 = document.querySelector("h1");
      if (h1) resume.title = dbg("resumeTitle (h1)", (h1.textContent || "").trim());
    }
    const salaryEl = document.querySelector('[data-qa="resume-block-salary"]');
    if (salaryEl) {
      resume.salary = dbg("resumeSalary (data-qa)", safeGetText(salaryEl));
    }
    const personalText = [];
    const posCard = document.querySelector('[data-qa="resume-position-card"]');
    if (posCard) {
      posCard.querySelectorAll("span, div, p, a").forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t && t.length > 0 && t.length < 200) personalText.push(t);
      });
    }
    const titleContainer = titleEl ? titleEl.closest("div[data-qa], section") || titleEl.parentElement : null;
    if (titleContainer) {
      titleContainer.querySelectorAll("span, div, p, a").forEach((el) => {
        if (el === titleEl || titleEl.contains(el)) return;
        const t = (el.textContent || "").trim();
        if (t && t.length > 0 && t.length < 200 && !personalText.includes(t)) personalText.push(t);
      });
    }
    const genderPatterns = [/\bмужчина\b/i, /\bженщина\b/i, /\bмужской\b/i, /\bженский\b/i, /\bmale\b/i, /\bfemale\b/i];
    const agePattern = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
    const agePattern2 = /(\d{2})\s*years?\s*old/i;
    for (const t of personalText) {
      if (!resume.gender) {
        for (const gp of genderPatterns) {
          const m = t.match(gp);
          if (m) {
            resume.gender = dbg("resumeGender", m[0]);
            break;
          }
        }
      }
      if (!resume.age) {
        const m = t.match(agePattern) || t.match(agePattern2);
        if (m) {
          resume.age = dbg("resumeAge", m[1] + " \u043B\u0435\u0442");
        }
      }
      if (!resume.address && t.length > 3) {
        const isGender = genderPatterns.some((p) => p.test(t));
        const isAge = agePattern.test(t) || agePattern2.test(t);
        if (!isGender && !isAge && !t.includes("\u0440\u0443\u0431") && !t.includes("USD") && !t.includes("\u0437/\u043F") && !t.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C") && !t.includes("\u0434\u043E\u0445\u043E\u0434") && t !== resume.salary && t !== resume.title) {
          if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
            resume.address = dbg("resumeAddress", t);
          }
        }
      }
    }
    const skillsCard = document.querySelector('[data-qa="skills-card"]');
    if (skillsCard) {
      resume._debug.found.push('skillsBlock (data-qa="skills-card")');
      const skillLevelEls = skillsCard.querySelectorAll('[data-qa^="skill-level-title-"]');
      skillLevelEls.forEach((el) => {
        const qa = el.getAttribute("data-qa") || "";
        const lvlMatch = qa.match(/skill-level-title-(\d)/);
        if (lvlMatch) {
          const lvl = lvlMatch[1];
          const text = (el.textContent || "").trim();
          const labels = { "3": "\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0439", "2": "\u0421\u0440\u0435\u0434\u043D\u0438\u0439", "1": "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439" };
          resume.skillLevels[lvl] = labels[lvl] || text;
          resume._debug.found.push("skillLevel" + lvl + ": " + (labels[lvl] || text));
        }
      });
      const skillTags = skillsCard.querySelectorAll('[data-qa^="skill-tag-"]');
      skillTags.forEach((tag) => {
        const text = (tag.textContent || "").trim();
        if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
          resume.skills.push(text);
        }
      });
      const blokoTags = skillsCard.querySelectorAll(".bloko-tag__text");
      blokoTags.forEach((tag) => {
        const text = (tag.textContent || "").trim();
        if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
          resume.skills.push(text);
        }
      });
    } else {
      resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
    }
    if (resume.skills.length > 0) {
      resume._debug.found.push("skills: " + resume.skills.length + " tags");
    } else if (!resume._debug.found.some((f) => f.startsWith("skillsBlock"))) {
      resume._debug.missing.push("skills (no tags found)");
    }
    const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');
    const allCompanyCards = document.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const uniqueCards = [];
    const cardSet = /* @__PURE__ */ new Set();
    allCompanyCards.forEach((c) => {
      if (!cardSet.has(c)) {
        cardSet.add(c);
        uniqueCards.push(c);
      }
    });
    resumeLog.info("Experience: total company-cards on page: " + uniqueCards.length);
    function parseCompanyCard(card) {
      const job = {};
      const cellLeft = card.querySelector('[data-qa="cell-left-side"]');
      if (cellLeft) {
        const cellTexts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        if (cellTexts.length >= 1) {
          job.company = (cellTexts[0].textContent || "").trim();
        }
        if (cellTexts.length >= 2) {
          job.duration = (cellTexts[1].textContent || "").trim();
        }
      }
      const stepContent = card.querySelector('[data-qa="magritte-stepper-step-content"]');
      if (stepContent) {
        const stepCellLeft = stepContent.querySelector('[data-qa="cell-left-side"]');
        if (stepCellLeft) {
          const stepTexts = stepCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
          if (stepTexts.length >= 1) {
            job.position = (stepTexts[0].textContent || "").trim();
          }
          if (stepTexts.length >= 2) {
            let rawPeriod = (stepTexts[1].textContent || "").trim();
            rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, "").trim();
            job.period = rawPeriod;
          }
        }
        const fullStepText = (stepContent.textContent || "").trim();
        let desc = fullStepText;
        const posText = job.position || "";
        const periodText = job.period || "";
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
      return job.company || job.position ? job : null;
    }
    const expEntries = [];
    uniqueCards.forEach((card) => {
      const job = parseCompanyCard(card);
      if (job) expEntries.push(job);
    });
    if (expCard) {
      resume._debug.found.push('experienceBlock (data-qa="resume-list-card-experience")');
    } else {
      resume._debug.missing.push("experienceBlock (no container, but " + uniqueCards.length + " cards found)");
    }
    resume.experience = expEntries;
    if (expEntries.length > 0) {
      resume._debug.found.push("experience: " + expEntries.length + " entries");
    } else {
      resume._debug.missing.push("experience (0 entries extracted)");
    }
    const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
    if (eduCard) {
      resume._debug.found.push('educationBlock (data-qa="resume-list-card-education")');
      const eduEntries = [];
      const eduUiTexts = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;
      const eduCells = eduCard.querySelectorAll('[data-qa="cell-left-side"]');
      resumeLog.info("Education: found " + eduCells.length + " cell-left-side elements");
      eduCells.forEach((cell) => {
        const edu = {};
        const cellTexts = cell.querySelectorAll('[data-qa="cell-text-content"]');
        cellTexts.forEach((ct) => {
          const t = (ct.textContent || "").trim();
          if (!t || t.length < 2) return;
          if (eduUiTexts.test(t)) return;
          if (!edu.name) {
            edu.name = t;
          } else if (!edu.description) {
            edu.description = t;
          } else if (!edu.year && /\d{4}/.test(t)) {
            edu.year = t.match(/\d{4}/)?.[0] || t;
          }
        });
        if (edu.name && !eduUiTexts.test(edu.name) && edu.name.length > 3) {
          eduEntries.push(edu);
        }
      });
      if (eduEntries.length === 0) {
        resumeLog.info("Education: fallback to direct children of eduCard");
        Array.from(eduCard.children).forEach((child) => {
          const edu = {};
          const linkEl = child.querySelector("a");
          if (linkEl) {
            const t = (linkEl.textContent || "").trim();
            if (!eduUiTexts.test(t)) edu.name = t;
          }
          if (!edu.name) {
            const textEls = child.querySelectorAll("span, div, p");
            for (const el of textEls) {
              const t = (el.textContent || "").trim();
              if (t.length > 3 && /[А-Яа-яЁё]/.test(t) && !/^\d/.test(t) && !/\d{4}/.test(t) && !eduUiTexts.test(t)) {
                edu.name = t;
                break;
              }
            }
          }
          const spans = child.querySelectorAll("span, div");
          for (const sp of spans) {
            const t = (sp.textContent || "").trim();
            if (/^\d{4}$/.test(t) || /\d{4}/.test(t) && t.length < 15) {
              edu.year = t;
              break;
            }
          }
          if (edu.name && !eduUiTexts.test(edu.name) && edu.name.length > 2) {
            eduEntries.push(edu);
          }
        });
      }
      if (eduEntries.length === 0) {
        resumeLog.info("Education: fallback to full text scan");
        const fullText = (eduCard.textContent || "").trim();
        const lines = fullText.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 3);
        for (const line of lines) {
          if (/[А-Яа-яЁё]{3,}/.test(line) && line.length < 200) {
            const yearMatch = line.match(/(\d{4})/);
            eduEntries.push({
              name: line.replace(/\d{4}/g, "").trim().substring(0, 100),
              year: yearMatch ? yearMatch[1] : ""
            });
          }
        }
      }
      resume.education = eduEntries;
      if (eduEntries.length > 0) {
        resume._debug.found.push("education: " + eduEntries.length + " entries");
      } else {
        resume._debug.missing.push("education (0 entries extracted)");
      }
    } else {
      resume._debug.missing.push('educationBlock (no data-qa="resume-list-card-education")');
    }
    const langTags = document.querySelectorAll('[data-qa="resume-about-card"] .bloko-tag__text, [data-qa="resume-position-card"] .bloko-tag__text');
    langTags.forEach((tag) => {
      const t = (tag.textContent || "").trim();
      if (t && t.length > 0 && !resume.skills.includes(t)) {
        resume.languages.push(t);
      }
    });
    if (resume.languages.length > 0) {
      resume._debug.found.push("languages: " + resume.languages.join(", "));
    }
    const aboutCard = document.querySelector('[data-qa="resume-about-card"]');
    if (aboutCard) {
      const text = (aboutCard.textContent || "").trim();
      if (text.length > 10) {
        resume.additionalInfo = text;
        resume._debug.found.push('additionalBlock (data-qa="resume-about-card")');
      }
    }
    const elapsed = (performance.now() - t0).toFixed(1);
    resumeLog.info("Resume parsed in " + elapsed + "ms");
    resumeLog.info("Found: " + resume._debug.found.length + " | Missing: " + resume._debug.missing.length);
    resumeLog.info("Skills: " + resume.skills.length + " | Experience: " + resume.experience.length + " | Education: " + resume.education.length);
    console.log("[HH-AR][Resume] Parsed resume:", JSON.stringify({
      id: resume.id,
      title: resume.title,
      salary: resume.salary,
      skills: resume.skills,
      experienceCount: resume.experience.length,
      educationCount: resume.education.length,
      languages: resume.languages,
      debug: resume._debug
    }, null, 2));
    return resume;
  }
  function parseResumeList() {
    const resumes = [];
    const links = document.querySelectorAll('a[href*="/resume/"]');
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) return;
      const id = hashMatch[1];
      if (resumes.find((r) => r.id === id)) return;
      resumes.push({
        id,
        title: safeGetText(link) || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
        url: href.startsWith("http") ? href : "https://hh.ru" + href
      });
    });
    resumeLog.info("Resume list: " + resumes.length + " resumes found");
    return resumes;
  }

  // src/lib/rate-limiter.js
  var rateLimiter = {
    limits: { maxPerDay: 200, maxPerHour: 30, minIntervalMs: 3e4, burstMax: 5, burstPauseMs: 12e4 },
    lastActionTime: 0,
    burstCount: 0,
    hourlyCount: 0,
    currentHour: (/* @__PURE__ */ new Date()).getHours(),
    adaptiveFactor: 1,
    async check() {
      const stats = await getStats();
      const settings = await getAllSettings();
      const now = Date.now();
      if (stats.appliedToday >= (settings.dailyLimit || this.limits.maxPerDay))
        return { allowed: false, reason: "\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442: " + stats.appliedToday + "/" + settings.dailyLimit };
      const ch = (/* @__PURE__ */ new Date()).getHours();
      if (ch !== this.currentHour) {
        this.hourlyCount = 0;
        this.currentHour = ch;
      }
      if (this.hourlyCount >= this.limits.maxPerHour)
        return { allowed: false, reason: "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043B\u0438\u043C\u0438\u0442", waitMs: 36e5 };
      if (now - this.lastActionTime < this.limits.minIntervalMs * this.adaptiveFactor)
        return { allowed: false, reason: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u044B\u0441\u0442\u0440\u043E", waitMs: this.limits.minIntervalMs };
      if (this.burstCount >= this.limits.burstMax)
        return { allowed: false, reason: "Burst pause (5 \u043F\u043E\u0434\u0440\u044F\u0434)", waitMs: this.limits.burstPauseMs };
      return { allowed: true };
    },
    recordAction() {
      this.lastActionTime = Date.now();
      this.burstCount++;
      this.hourlyCount++;
    },
    adaptiveSlowdown(reason) {
      const f = { "429": 2, slow: 1.5, captcha: 1.3 }[reason] || 1;
      this.adaptiveFactor = Math.min(5, this.adaptiveFactor * f);
    },
    resetBurst() {
      this.burstCount = 0;
    }
  };
  var rate_limiter_default = rateLimiter;

  // src/lib/timing.js
  function gaussianRandom(mean, stddev) {
    mean = mean || 10;
    stddev = stddev || 4;
    let u1 = Math.max(1e-10, Math.min(1 - 1e-10, Math.random()));
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
    return Math.max(2, z * stddev + mean);
  }
  function randomDelay() {
    return new Promise((r) => setTimeout(r, gaussianRandom() * 1e3));
  }
  function simulateReading() {
    const delay = 5e3 + Math.random() * 7e3;
    return new Promise((r) => setTimeout(r, delay));
  }
  async function simulateTyping(el, text) {
    if (!el || typeof text !== "string") return;
    for (const ch of text) {
      el.value = (el.value || "") + ch;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 90));
    }
  }

  // src/engine/auto-respond.js
  var autoLog = createLogger("AutoRespond");
  async function applyToVacancy(vacancyId) {
    autoLog.info("Apply to vacancy: " + vacancyId);
    const rateCheck = await rate_limiter_default.check();
    if (!rateCheck.allowed) {
      autoLog.warn(rateCheck.reason);
      return { success: false, reason: rateCheck.reason };
    }
    if (await isAlreadyApplied(vacancyId)) return { success: false, reason: "Already applied" };
    const limitCheck = await incrementApplied();
    if (!limitCheck.allowed) return { success: false, reason: "Daily limit" };
    const url = "https://hh.ru/vacancy/" + vacancyId;
    await chrome.storage.local.set({ pendingApply: { vacancyId, timestamp: Date.now() } });
    window.location.href = url;
    return { success: false, reason: "Navigating (page reload expected)" };
  }
  async function continueApply(pending) {
    autoLog.info("Continue apply on vacancy page");
    await markAsApplied(pending.vacancyId);
    return { success: true };
  }
  async function applyToAll(vacancies, minScore) {
    minScore = minScore || 60;
    const eligible = vacancies.filter((v) => v.status === "new" && v.hasReply).filter((v) => v.matchScore === null || v.matchScore >= minScore).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    autoLog.info("Auto-apply " + eligible.length + " vacancies (score >= " + minScore + ")");
    for (const v of eligible) {
      const rc = await rate_limiter_default.check();
      if (!rc.allowed) break;
      await applyToVacancy(v.id);
      await randomDelay();
    }
  }

  // src/ui/state.js
  var panelState = {
    isOpen: false,
    isLoggedIn: null,
    status: "idle",
    activeTab: null,
    vacancies: [],
    stats: {},
    resume: null,
    resumeList: [],
    negotiations: [],
    activeConversation: null,
    settings: {
      dailyLimit: 200,
      hourlyLimit: 30,
      minInterval: 30,
      burstDetection: true,
      adaptiveSlowdown: true,
      captchaAutoPause: true,
      captchaPauseTime: 5,
      dailyResetTime: "00:00",
      autoAuthCheck: true,
      notifications: true,
      logging: true,
      shadowDOM: true
    },
    logs: [],
    dailyStats: {
      totalApplied: 0,
      invitations: 0,
      errors429: 0
    },
    blacklist: [],
    massApply: {
      running: false,
      minMatch: 70,
      maxApply: 20,
      progress: 0
    }
  };
  var refs = {
    fabEl: null,
    sidebarEl: null,
    backdropEl: null,
    shadowRoot: null
  };

  // src/ui/styles.js
  function getSidebarCSS() {
    return `:host { all: initial; }
*, *::before, *::after { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; box-sizing: border-box; line-height: 1.5; }
:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

/* Panel shell */
.fab-panel { width: 720px; height: 100vh; position: fixed; right: 0; top: 0; z-index: 1000;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column;
  letter-spacing: -0.01em;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.03), 0 8px 40px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04);
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease; }
.fab-panel.hidden { transform: translateX(100%); opacity: 0; pointer-events: none; }

/* Tab sections */
.tab-section { display: none; flex: 1; overflow-y: auto; padding: 16px; opacity: 0; transition: opacity 0.2s ease; }
.tab-section::-webkit-scrollbar { width: 3px; }
.tab-section::-webkit-scrollbar-track { background: transparent; }
.tab-section::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.tab-section::-webkit-scrollbar-thumb:hover { background: #059669; }
.tab-section.active { display: block; opacity: 1; }

/* Tab buttons */
.tab-btn { position: relative; padding: 10px 6px; font-size: 12px; font-weight: 500; color: #52525B;
  background: none; border: none; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 4px; flex: 1; border-radius: 8px; }
.tab-btn:hover { color: #18181b; background: rgba(0,0,0,0.04); }
.tab-btn.active { color: #059669; font-weight: 600; background: rgba(5,150,105,0.06);
  text-shadow: 0 0 8px rgba(5,150,105,0.12); }
.tab-btn.active::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%);
  width:20px; height:3px; background:#059669; border-radius:99px;
  transition: width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.2s ease; }

/* Cards */
.card { background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 14px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); }
.card:hover { transform: translateY(-0.5px); box-shadow: 0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8); }

/* Animations */
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeIn 0.25s ease; }
@keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.pulse-dot { animation: pulseDot 2s infinite; }
@keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
.slide-right { animation: slideRight 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.shimmer { background: linear-gradient(90deg, transparent 0%, rgba(5,150,105,0.08) 50%, transparent 100%);
  background-size: 200% 100%; animation: shimmer 2s infinite; }
@keyframes blink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
.typing-cursor::after { content:'|'; animation: blink 1s infinite; color: #059669; font-weight: 300; font-size: 14px; }

/* KPI ring */
@keyframes ringFill { from { stroke-dashoffset: 339.292; } }
.kpi-ring-bg { fill: none; stroke: #f4f4f5; stroke-width: 8; }
.kpi-ring-fill { fill: none; stroke: url(#kpiGrad); stroke-width: 8; stroke-linecap: round;
  stroke-dasharray: 339.292; stroke-dashoffset: 123.89; animation: ringFill 1.2s ease-out;
  transform: rotate(-90deg); transform-origin: center; }
@keyframes countdown { from { width: 100%; } to { width: 0%; } }
.countdown-bar { animation: countdown 48s linear infinite; }
@keyframes slideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.kpi-stat { animation: slideUp 0.4s ease backwards; }
.kpi-stat:nth-child(1) { animation-delay: 0.1s; }
.kpi-stat:nth-child(2) { animation-delay: 0.2s; }
.kpi-stat:nth-child(3) { animation-delay: 0.3s; }

/* Progress bar */
.progress-bar { height: 6px; background: #f4f4f5; border-radius: 3px; overflow: hidden; }
.progress-bar .fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
@keyframes progressShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.progress-bar .fill.fill-green { background-image: linear-gradient(90deg, #059669 0%, #34D399 40%, #059669 60%, #10B981 100%);
  background-size: 200% 100%; animation: progressShimmer 2.5s linear infinite; }

/* Toggle switch */
.toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
.toggle input { display: none; }
.toggle .slider { position: absolute; inset: 0; background: #d4d4d8; border-radius: 11px; transition: background 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; }
.toggle .slider::before { content:''; position:absolute; left:2px; top:2px; width:18px; height:18px;
  background:#fff; border-radius:50%; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.toggle input:checked + .slider { background: #059669; box-shadow: 0 0 8px rgba(5,150,105,0.3); }
.toggle input:checked + .slider::before { transform: translateX(18px); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

/* Badges */
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; }
.badge-green { background: #D1FAE5; color: #065F46; border: 1px solid rgba(5,150,105,0.15); }
.badge-amber { background: #FEF3C7; color: #92400E; border: 1px solid rgba(217,119,6,0.15); }
.badge-red { background: #FEE2E2; color: #B91C1C; border: 1px solid rgba(220,38,38,0.15); }
.badge-blue { background: #DBEAFE; color: #1E40AF; border: 1px solid rgba(37,99,235,0.15); }
.badge-zinc { background: #F4F4F5; color: #52525B; }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); letter-spacing: -0.01em; }
.btn-primary { background: #059669; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-primary:hover { background: #047857; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(5,150,105,0.25); }
.btn-primary:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-outline { background: transparent; border: 1px solid #d4d4d8; color: #3f3f46;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.btn-outline:hover { background: rgba(5,150,105,0.06); border-color: rgba(5,150,105,0.25); color: #059669; }
.btn-danger { background: #DC2626; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-danger:hover { background: #B91C1C; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(220,38,38,0.25); }
.btn-danger:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* Vacancy items */
.vacancy-item { display: flex; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); border-left: 2px solid transparent; }
.vacancy-item:hover { background: #f9fafb; border-color: rgba(5,150,105,0.15); border-left-color: #059669;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

/* Log entry */
.log-entry { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
.log-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

/* Timeline */
.timeline-toggle { cursor: pointer; user-select: none; }
.timeline-toggle:hover { background: #FAFAFA; }
.timeline-body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s; opacity: 0; }
.timeline-body.open { max-height: 2000px; opacity: 1; }
.timeline-chevron { transition: transform 0.3s; }
.timeline-chevron.open { transform: rotate(180deg); }
.tl-item { position: relative; padding-left: 24px; padding-bottom: 4px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 0; width: 1.5px; background: #e4e4e7; }
.tl-item:last-child::before { display: none; }
.tl-dot { position: absolute; left: 1px; top: 5px; width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.08); z-index: 1;
  transition: transform 0.2s, box-shadow 0.2s; }
.tl-item:first-child .tl-dot { box-shadow: 0 0 0 3px rgba(5,150,105,0.15), 0 0 0 1px rgba(0,0,0,0.08); }

/* Sub-accordion */
.sub-toggle { cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; margin: 0 -8px; border-radius: 6px; transition: background 0.15s; }
.sub-toggle:hover { background: rgba(0,0,0,0.03); }
.sub-body { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s, padding 0.35s; opacity: 0; padding-top: 0; }
.sub-body.open { max-height: 500px; opacity: 1; padding-top: 6px; }
.sub-chevron { transition: transform 0.25s; flex-shrink: 0; }
.sub-chevron.open { transform: rotate(180deg); }

/* AI reply cards */
.ai-reply-card { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(5,150,105,0.15);
  border-left: 3px solid rgba(5,150,105,0.25); background: #ffffff; cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); margin-bottom: 6px; }
.ai-reply-card:hover { background: #ECFDF5; border-color: rgba(5,150,105,0.3); border-left-color: #059669;
  transform: translateY(-1px); box-shadow: 0 2px 12px rgba(5,150,105,0.1); }
.ai-reply-card:last-child { margin-bottom: 0; }
.ai-source { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.ai-src-resume { background: #D1FAE5; color: #065F46; }
.ai-src-vacancy { background: #DBEAFE; color: #1E40AF; }
.ai-src-context { background: #FEF3C7; color: #78350F; }

/* Skill tags */
.skill-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 500; transition: all 0.15s ease; }
.skill-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.skill-match { background: #D1FAE5; color: #065F46; }
.skill-miss { background: #FEE2E2; color: #B91C1C; }
.skill-extra { background: #DBEAFE; color: #1E40AF; }

/* Conversation items */
.conv-item { transition: all 0.2s ease; border-radius: 8px; }
.conv-item:hover { background: #FAFAFA; }
.conv-item.active { box-shadow: inset 3px 0 0 #059669; }

/* Blacklist items */
.bl-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #FEF2F2; border-radius: 8px; border-left: 3px solid #FECACA; }
.bl-item .btn-bl-del { padding: 4px 10px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.15s ease; }
.bl-item .btn-bl-del:hover { background: #DC2626; color: #fff; }

/* Inputs / selects / textareas */
.fab-panel input, .fab-panel select, .fab-panel textarea { background: #FAFAFA;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.15s; }
.fab-panel input::placeholder, .fab-panel textarea::placeholder { color: #a1a1aa; }
.fab-panel input:focus, .fab-panel select:focus, .fab-panel textarea:focus {
  border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); background: #ffffff; outline: none; }

/* Range input */
.fab-panel input[type="range"] { -webkit-appearance: none; appearance: none;
  height: 4px; background: #e4e4e7; border-radius: 2px; outline: none; border: none; padding: 0; }
.fab-panel input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; border-radius: 50%; background: #ffffff; border: 2px solid #059669;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; transition: box-shadow 0.15s; }
.fab-panel input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0 1px 6px rgba(5,150,105,0.3), 0 1px 3px rgba(0,0,0,0.12); }
.fab-panel input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%;
  background: #ffffff; border: 2px solid #059669; box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; }
.fab-panel input[type="range"]::-moz-range-track { height: 4px; background: #e4e4e7; border-radius: 2px; border: none; }

/* FAB pulse */
@keyframes fabPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(5,150,105,0.4); }
  50% { box-shadow: 0 4px 20px rgba(5,150,105,0.4), 0 0 0 8px rgba(5,150,105,0.12); } }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 10000;
  padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 500;
  background: #18181b; color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards; }
@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(-8px); } }

/* Layout: header, tabbar, content, footer */
.har-header { padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.har-close-btn:hover { background: #f4f4f5; color: #18181b; }
.har-tabbar { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); flex-shrink: 0; padding: 0 4px; }
.har-content { flex: 1; overflow-y: auto; }
.har-footer { padding: 10px 16px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9)); }
.har-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: har-spin 0.8s linear infinite; }
@keyframes har-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* Score ring (vacancy match) */
.score-ring { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; position: relative; flex-shrink: 0;
  background: conic-gradient(#059669 0deg, #059669 calc(var(--score) * 3.6deg), #e4e4e7 calc(var(--score) * 3.6deg)); }
.score-ring span { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #059669; }
.score-ring.high span { color: #059669; }
.score-ring.medium span { color: #D97706; }
.score-ring.low span { color: #DC2626; }
`;
  }

  // src/ui/html.js
  function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function scoreClass(s) {
    return s >= 70 ? "high" : s >= 40 ? "medium" : "low";
  }
  var ICONS = {
    briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
    chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    refresh: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>',
    rocket: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    search: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 2v4m0 12v4m-8-10H2m20 0h-2"/><circle cx="12" cy="12" r="4"/></svg>',
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    envelope: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    ai: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0"/></svg>',
    clock: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    code: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    money: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    bubble: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
  };
  function getSidebarHTML() {
    return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace("currentColor", "#fff").replace('width="16" height="16"', 'width="16" height="16"')}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50;display:inline-block;"></span>
            \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...
          </div>
        </div>
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${ICONS.close}
      </button>
    </div>
    <div class="har-content">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
        <div class="har-spinner"></div>
        <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3>
        <p style="font-size:13px;color:#71717a;line-height:1.5;">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p>
      </div>
    </div>
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`;
  }
  function getLoggedInHTML(userName) {
    const name = userName && userName !== "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" ? esc(userName) : "";
    return `
    ${getHeaderHTML(name)}
    ${getTabBarHTML()}
    ${getOverviewSection()}
    ${getResumeSection()}
    ${getVacanciesSection()}
    ${getNegotiationsSection()}
    ${getSettingsSection()}
    ${getStatsSection()}
    <div class="har-footer">
      <span style="font-size:11px;color:#71717a;">HH Copilot v1.7.0</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;"></span>
        <span style="font-size:11px;color:#71717a;">chrome.storage</span>
      </div>
    </div>`;
  }
  function getHeaderHTML(userName) {
    const name = userName ? esc(userName) : "";
    const badgeLabel = name ? name : "\u041E\u043D\u043B\u0430\u0439\u043D";
    return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace("currentColor", "#fff").replace('width="16" height="16"', 'width="16" height="16"')}
        </div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div id="header-auth-status" style="font-size:11px;color:#71717a;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            ${name ? name : "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D"}
          </div>
        </div>
      </div>
      <div id="authIndicator" class="badge badge-green" style="cursor:pointer;" title="\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438">
        <span style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:4px;"></span>
        ${badgeLabel}
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#71717a;">
        ${ICONS.close}
      </button>
    </div>`;
  }
  function getTabBarHTML() {
    const tabs = [
      { id: "overview", label: "\u041E\u0431\u0437\u043E\u0440", icon: ICONS.briefcase },
      { id: "resume", label: "\u0420\u0435\u0437\u044E\u043C\u0435", icon: ICONS.file },
      { id: "vacancies", label: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438", icon: ICONS.folder },
      { id: "negotiations", label: "\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B", icon: ICONS.chat },
      { id: "settings", label: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", icon: ICONS.gear },
      { id: "stats", label: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", icon: ICONS.chart }
    ];
    return `<div class="har-tabbar">${tabs.map(
      (t) => `<button class="tab-btn ${t.id === "overview" ? "active" : ""}" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`
    ).join("")}</div>`;
  }
  function getOverviewSection() {
    return `<div class="tab-section active" id="tab-overview">
    ${overviewAuthCard()}
    ${overviewKPIHero()}
    ${overviewRateLimits()}
    ${overviewQuickActions()}
    ${overviewTimeline()}
  </div>`;
  }
  function overviewAuthCard() {
    return `<div class="card fade-in" style="margin-bottom:12px;border-left:3px solid #059669;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:12px;font-weight:600;">\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F HH.ru</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 <code style="font-size:11px;background:#f4f4f5;padding:1px 4px;border-radius:3px;">[data-qa="mainmenu_applicant"]</code></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge badge-green" id="authBadge"><span class="pulse-dot" style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:3px;"></span> \u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D</span>
        <button class="btn btn-outline btn-sm" data-action="check-auth">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C</button>
      </div>
    </div>
  </div>`;
  }
  function overviewKPIHero() {
    return `<div class="card fade-in" style="margin-bottom:12px;padding:18px;background:linear-gradient(135deg,rgba(5,150,105,0.03) 0%,rgba(16,185,129,0.05) 50%,rgba(37,99,235,0.03) 100%);border:1px solid rgba(5,150,105,0.1);">
    <div style="display:flex;gap:18px;align-items:stretch;">
      ${kpiRing()}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
        ${kpiHourly()}
        ${kpiApplied()}
        ${kpiInvitations()}
      </div>
    </div>
  </div>`;
  }
  function kpiRing() {
    return `<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
    <svg width="108" height="108" viewBox="0 0 120 120">
      <defs><linearGradient id="kpiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#34D399"/>
      </linearGradient></defs>
      <circle class="kpi-ring-bg" cx="60" cy="60" r="54"/>
      <circle class="kpi-ring-fill" cx="60" cy="60" r="54"/>
    </svg>
    <div style="position:absolute;top:50%;left:42px;transform:translateY(-50%);text-align:center;">
      <div id="kpi-daily-count" style="font-size:26px;font-weight:800;color:#18181b;line-height:1;">0</div>
      <div style="font-size:11px;color:#71717a;font-weight:500;">\u0438\u0437 200</div>
    </div>
    <div style="font-size:11px;font-weight:600;color:#059669;margin-top:6px;letter-spacing:0.3px;">\u0414\u041D\u0415\u0412\u041D\u041E\u0419 \u041B\u0418\u041C\u0418\u0422</div>
  </div>`;
  }
  function kpiHourly() {
    return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.sun}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-hourly-count" style="font-size:18px;font-weight:700;color:#18181b;">0</span>
        <span style="font-size:12px;color:#71717a;">/30 \u0447\u0430\u0441</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <div style="flex:1;height:4px;background:#f4f4f5;border-radius:2px;overflow:hidden;">
          <div id="kpi-hourly-bar" class="progress-bar" style="height:100%;"><div class="fill" style="width:0%;background:linear-gradient(90deg,#D97706,#F59E0B);"></div></div>
        </div>
        <span id="kpi-countdown" style="font-size:11px;color:#B45309;font-weight:600;white-space:nowrap;">--</span>
      </div>
    </div>
  </div>`;
  }
  function kpiApplied() {
    return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#D1FAE5,#A7F3D0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.mail}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-applied-count" style="font-size:18px;font-weight:700;color:#059669;">0</span>
        <span style="font-size:11px;color:#71717a;">\u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-applied-delta" style="color:#059669;font-weight:600;">+0</span> \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0447\u0430\u0441
      </div>
    </div>
  </div>`;
  }
  function kpiInvitations() {
    return `<div class="kpi-stat" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.7);border-radius:10px;border:1px solid rgba(0,0,0,0.04);">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#DBEAFE,#BFDBFE);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ICONS.envelope}</div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span id="kpi-invitations-count" style="font-size:18px;font-weight:700;color:#2563EB;">0</span>
        <span style="font-size:11px;color:#71717a;">\u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-top:2px;">
        <span id="kpi-inv-delta" style="color:#2563EB;font-weight:600;">+0</span> \u043D\u043E\u0432\u044B\u0445 \u0437\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F
      </div>
    </div>
  </div>`;
  }
  function overviewRateLimits() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:600;">\u0421\u043A\u043E\u0440\u0438\u043D\u0433 \u0438 \u043B\u0438\u043C\u0438\u0442\u044B</span>
      <span class="badge badge-green" id="rl-status-badge">\u041D\u043E\u0440\u043C\u0430</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">\u041C\u0438\u043D. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
        <div style="font-size:14px;font-weight:600;">30 \u0441\u0435\u043A</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">Burst detection</div>
        <div style="font-size:14px;font-weight:600;color:#059669;">\u0412\u044B\u043A\u043B</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">429 \u043E\u0448\u0438\u0431\u043E\u043A</div>
        <div id="rl-429-count" style="font-size:14px;font-weight:600;">0</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#71717a;">CAPTCHA</div>
        <div id="rl-captcha-status" style="font-size:14px;font-weight:600;color:#059669;">\u041D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0430</div>
      </div>
    </div>
  </div>`;
  }
  function overviewQuickActions() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" data-action="apply-all">${ICONS.rocket} \u041C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A</button>
      <button class="btn btn-outline" data-tab-switch="vacancies">${ICONS.check} \u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</button>
      <button class="btn btn-outline" data-tab-switch="resume">${ICONS.file} \u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0440\u0435\u0437\u044E\u043C\u0435</button>
      <button class="btn btn-outline" data-action="reset-daily">${ICONS.refresh} \u0421\u0431\u0440\u043E\u0441 \u0434\u043D\u0435\u0432\u043D\u044B\u0445</button>
    </div>
  </div>`;
  }
  function overviewTimeline() {
    return `<div class="card fade-in">
    <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="activity">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:12px;font-weight:600;">\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C</div>
        <div style="display:flex;gap:-4px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#059669;border:2px solid #fff;margin-left:-3px;position:relative;z-index:3;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid #fff;margin-left:-3px;position:relative;z-index:2;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#D97706;border:2px solid #fff;margin-left:-3px;position:relative;z-index:1;"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="tl-event-count" style="font-size:11px;color:#71717a;">0 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</span>
        ${ICONS.chevronDown}
      </div>
    </div>
    <div class="timeline-body" id="tl-activity-body" style="margin-top:4px;">
      <div id="tl-activity-list">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</div>
      </div>
    </div>
  </div>`;
  }
  function getResumeSection() {
    return `<div class="tab-section" id="tab-resume">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div id="res-title" style="font-size:13px;font-weight:600;">\u0420\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E</div>
            <div id="res-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" \u0434\u043B\u044F \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">\u043D\u0435 \u0441\u043F\u0430\u0440\u0441\u0435\u043D\u043E</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430</div>
        </div>
        <div style="padding-top:12px;padding-left:24px;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            ${ICONS.refresh} \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
          </button>
        </div>
      </div>
    </div>
    <div id="res-skills-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">\u041D\u0430\u0432\u044B\u043A\u0438 \u0438\u0437 \u0440\u0435\u0437\u044E\u043C\u0435</span>
        <span class="badge badge-zinc" id="res-skills-count">0 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</span>
      </div>
      <div id="res-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>
    <div id="res-gap-section" class="card fade-in" style="display:none;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</div>
      <div id="res-gap-content" style="font-size:11px;color:#71717a;">\u0410\u043D\u0430\u043B\u0438\u0437 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043F\u043E\u0441\u043B\u0435 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</div>
    </div>
  </div>`;
  }
  function getVacanciesSection() {
    return `<div class="tab-section" id="tab-vacancies">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u043E\u0438\u0441\u043A\u0430 hh.ru</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="refresh">${ICONS.check} \u0421\u043F\u0430\u0440\u0441\u0438\u0442\u044C</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u041D\u0430\u0439\u0434\u0435\u043D\u043E</div>
          <div id="vac-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Match > 70%</div>
          <div id="vac-high-match" style="font-size:16px;font-weight:700;color:#059669;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</div>
          <div id="vac-blacklisted" style="font-size:16px;font-weight:700;color:#DC2626;">0</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="vac-search" placeholder="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <select id="vac-status-filter" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
          <option value="all">\u0412\u0441\u0435</option>
          <option value="new">New</option>
          <option value="applied">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u043E</option>
          <option value="blacklisted">Blacklist</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#71717a;white-space:nowrap;">Min score:</span>
        <input type="range" id="vac-score-range" min="0" max="100" value="0" style="flex:1;">
        <span id="vac-score-label" style="font-size:11px;font-weight:600;color:#71717a;min-width:32px;text-align:right;">0%</span>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;">\u041C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A</div>
        <span id="mass-status" class="badge badge-zinc">\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D</span>
      </div>
      <div id="mass-progress" style="display:none;margin-bottom:10px;">
        <div class="progress-bar"><div id="mass-fill" class="fill fill-green" style="width:0%;"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span id="mass-count" style="font-size:11px;color:#71717a;">0 / 20</span>
          <span id="mass-eta" style="font-size:11px;color:#71717a;">ETA: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u0435</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>\u041F\u0430\u0443\u0437\u0430</button>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
    </div>
  </div>`;
  }
  function getNegotiationsSection() {
    return `<div class="tab-section" id="tab-negotiations">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">\u041E\u0442\u0441\u043B\u0435\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0441 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C\u0438</div>
        </div>
        <span id="neg-count-badge" class="badge badge-blue">0 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445</span>
      </div>
      <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
        <div style="padding:24px;text-align:center;font-size:11px;color:#71717a;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</div>
      </div>
    </div>
    <div id="neg-chat-area" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;flex-direction:column;max-height:340px;">
        <div id="neg-chat-header" style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;flex-shrink:0;"></div>
        <div id="neg-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:10px;"></div>
        <div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <input type="text" id="neg-chat-input" placeholder="\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435..." style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
          <button class="btn btn-primary" style="padding:8px 12px;">${ICONS.send}</button>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">\u0428\u0430\u0431\u043B\u043E\u043D\u044B \u0438 \u0432\u0432\u043E\u0434</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435</span>
            <span style="font-size:11px;color:#71717a;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u044D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:500;">\u042D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</div>
              <div style="font-size:11px;color:#71717a;">\u041F\u043E\u0441\u0438\u043C\u0432\u043E\u043B\u044C\u043D\u044B\u0439 \u0432\u0432\u043E\u0434 (\u0430\u043D\u0442\u0438\u0431\u043E\u0442)</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <input type="number" value="80" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
              <span style="font-size:11px;color:#71717a;">\u043C\u0441</span>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label style="font-size:11px;font-weight:500;">\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E</label>
              <span style="font-size:11px;color:#71717a;">{position} {experience} {skills}</span>
            </div>
            <textarea id="cover-letter-text" style="width:100%;height:64px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041C\u0435\u043D\u044F \u0437\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043B\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position}. \u0423 \u043C\u0435\u043D\u044F {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. \u0413\u043E\u0442\u043E\u0432 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  }
  function getSettingsSection() {
    return `<div class="tab-section" id="tab-settings">
    ${settingsRateLimits()}
    ${settingsCaptcha()}
    ${settingsBlacklist()}
    ${settingsDailyReset()}
    ${settingsGeneral()}
  </div>`;
  }
  function settingsRateLimits() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">\u041B\u0438\u043C\u0438\u0442\u044B \u0438 \u0440\u0435\u0439\u0442-\u043B\u0438\u043C\u0438\u0442\u0438\u043D\u0433</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingRow("\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442", "\u041C\u0430\u043A\u0441. \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u0432 \u0434\u0435\u043D\u044C", "number", "s-daily-limit", 200, "/ \u0434\u0435\u043D\u044C")}
      ${settingRow("\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043B\u0438\u043C\u0438\u0442", "\u041C\u0430\u043A\u0441. \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u0432 \u0447\u0430\u0441", "number", "s-hourly-limit", 30, "/ \u0447\u0430\u0441")}
      ${settingRow("\u041C\u0438\u043D. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B", "\u041C\u0435\u0436\u0434\u0443 \u043E\u0442\u043A\u043B\u0438\u043A\u0430\u043C\u0438", "number", "s-min-interval", 30, "\u0441\u0435\u043A")}
      ${settingToggle("Burst detection", "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u0440\u0438 \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u0435 429", "s-burst", true)}
      ${settingToggle("Adaptive slowdown", "\u0423\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u0430 \u043F\u0440\u0438 429/CAPTCHA", "s-adaptive", true)}
    </div>
  </div>`;
  }
  function settingsCaptcha() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">CAPTCHA \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle("\u0410\u0432\u0442\u043E-\u043F\u0430\u0443\u0437\u0430 \u043F\u0440\u0438 CAPTCHA", "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0442\u043A\u043B\u0438\u043A\u0438 \u0438 \u0443\u0432\u0435\u0434\u043E\u043C\u0438\u0442\u044C", "s-captcha", true)}
      ${settingRow("\u0412\u0440\u0435\u043C\u044F \u043F\u0430\u0443\u0437\u044B", "\u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u0435\u043C", "number", "s-captcha-time", 5, "\u043C\u0438\u043D")}
    </div>
  </div>`;
  }
  function settingsBlacklist() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">\u0420\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B</div>
      </div>
      <span id="bl-count-badge" class="badge badge-zinc">0 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439</span>
    </div>
    <div id="bl-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="bl-input" placeholder="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438..." style="flex:1;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;">
      <button class="btn btn-outline btn-sm" data-action="bl-add">+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C</button>
    </div>
  </div>`;
  }
  function settingsDailyReset() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u0441\u0431\u0440\u043E\u0441</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">\u0410\u0432\u0442\u043E-\u0441\u0431\u0440\u043E\u0441 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u043E\u0432</div>
          <div style="font-size:11px;color:#71717a;">\u0412\u0440\u0435\u043C\u044F \u0441\u0431\u0440\u043E\u0441\u0430 (chrome.alarms)</div>
        </div>
        <input type="time" id="s-reset-time" value="00:00" style="padding:4px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u0431\u0440\u043E\u0441</div>
          <div style="font-size:11px;color:#71717a;">\u0427\u0435\u0440\u0435\u0437 chrome.alarms API</div>
        </div>
        <span id="s-reset-countdown" style="font-size:11px;font-weight:600;color:#71717a;">--</span>
      </div>
      <button class="btn btn-outline" style="align-self:flex-start;" data-action="reset-daily">${ICONS.refresh} \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441</button>
    </div>
  </div>`;
  }
  function settingsGeneral() {
    return `<div class="card fade-in">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">\u041E\u0431\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle("\u0410\u0432\u0442\u043E-\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438", "", "s-auth-check", true)}
      ${settingToggle("\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F", "", "s-notifications", true)}
      ${settingToggle("\u041B\u043E\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", "", "s-logging", true)}
      ${settingToggle("Shadow DOM \u0438\u0437\u043E\u043B\u044F\u0446\u0438\u044F", "", "s-shadow-dom", true)}
    </div>
  </div>`;
  }
  function settingRow(label, hint, type, id, value, suffix) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${type}" id="${id}" value="${value}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:11px;color:#71717a;">${suffix}</span>
    </div>
  </div>`;
  }
  function settingToggle(label, hint, id, checked) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ""}
    </div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? "checked" : ""}><span class="slider"></span></label>
  </div>`;
  }
  function getStatsSection() {
    return `<div class="tab-section" id="tab-stats">
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button class="btn btn-sm btn-primary stats-period-btn active" data-period="today">\u0421\u0435\u0433\u043E\u0434\u043D\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="week">\u041D\u0435\u0434\u0435\u043B\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="month">\u041C\u0435\u0441\u044F\u0446</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="all">\u0412\u0441\u0451 \u0432\u0440\u0435\u043C\u044F</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u0412\u0441\u0435\u0433\u043E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</div>
        <div id="stat-total" style="font-size:22px;font-weight:700;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</div>
        <div id="stat-invitations" style="font-size:22px;font-weight:700;color:#2563EB;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F</div>
        <div id="stat-conversion" style="font-size:22px;font-weight:700;color:#059669;">0%</div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:12px;">\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0437\u0430 \u043D\u0435\u0434\u0435\u043B\u044E</div>
      <div id="stat-chart" style="display:flex;align-items:flex-end;gap:6px;height:100px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u043E\u0440\u043E\u043D\u043A\u0430 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438</div>
      <div id="stat-funnel" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043B\u0438\u043C\u0438\u0442\u043E\u0432</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">429 \u043E\u0448\u0438\u0431\u043E\u043A (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-429" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">CAPTCHA (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-captcha" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Adaptive slowdowns</div>
          <div id="stat-slowdowns" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">\u0421\u0440. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
          <div id="stat-avg-interval" style="font-size:16px;font-weight:700;">--</div>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">\u041B\u043E\u0433 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439</span>
        <button class="btn btn-outline btn-sm" data-action="clear-log">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C</button>
      </div>
      <div id="activity-log">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>
      </div>
    </div>
  </div>`;
  }

  // src/ui/auth.js
  function checkAuth() {
    const selectors = [
      '[data-qa="mainmenu_applicant"]',
      '[data-qa="mainmenu_user_name"]',
      'a[data-qa="mainmenu_myResumes"]',
      '[data-qa="mainmenu"] sup',
      ".supernova-nav__item--applicant",
      'a[href*="/applicant/"]',
      'a[href*="/account"]',
      ".bloko-header-hamburger",
      '[data-qa="mainmenu"] a[href*="resumes"]',
      ".mainmenu__item--applicant",
      '[data-qa="mainmenu"]',
      ".HH-React-Header-Nav",
      'nav[class*="nav"] a[href*="resumes"]'
      // Cookie fallback: если есть cookie с именем пользователя, точно авторизован
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        if (document.body.contains(el)) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") {
            console.log("[HH-AR][Auth] Found auth element:", sel);
            return true;
          }
        }
      } catch (e) {
      }
    }
    const cookies = document.cookie || "";
    if (cookies.includes("hhruuid") || cookies.includes("_HH-RU") || cookies.includes("hhtoken")) {
      console.log("[HH-AR][Auth] Found auth cookie");
      return true;
    }
    console.log("[HH-AR][Auth] No auth indicators found");
    return false;
  }
  function getUserName() {
    const nameSelectors = [
      '[data-qa="mainmenu_user_name"]',
      ".supernova-nav__item--applicant",
      'a[href*="/applicant/"]'
    ];
    for (const sel of nameSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const name = (el.textContent || "").trim();
          if (name && name.length > 0 && name.length < 100) {
            console.log("[HH-AR][Auth] User name from:", sel, "=", name);
            return name;
          }
        }
      } catch (e) {
      }
    }
    console.log("[HH-AR][Auth] Could not extract user name, using default");
    return "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C";
  }

  // src/ui/fab.js
  var FAB_ICONS = {
    loading: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
    locked: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    briefcase: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
    close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };
  function createFab(onClick) {
    if (refs.fabEl) return;
    refs.fabEl = document.createElement("div");
    refs.fabEl.id = "hh-ar-fab";
    refs.fabEl.setAttribute("role", "button");
    refs.fabEl.setAttribute("aria-label", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C HH Copilot");
    refs.fabEl.style.cssText = "position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#059669,#10B981);box-shadow:0 4px 20px rgba(5,150,105,0.4);transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s;animation:fabPulse 2.5s ease-in-out infinite;";
    refs.fabEl.innerHTML = FAB_ICONS.briefcase;
    refs.fabEl.addEventListener("mouseenter", () => {
      refs.fabEl.style.transform = "scale(1.1)";
    });
    refs.fabEl.addEventListener("mouseleave", () => {
      refs.fabEl.style.transform = "scale(1)";
    });
    refs.fabEl.addEventListener("click", onClick);
    document.body.appendChild(refs.fabEl);
  }
  function updateFabIcon() {
    if (!refs.fabEl) return;
    if (panelState.isLoggedIn === null) {
      refs.fabEl.style.background = "#94a3b8";
      refs.fabEl.style.boxShadow = "0 4px 20px rgba(148,163,184,0.3)";
      refs.fabEl.style.animation = "none";
      refs.fabEl.innerHTML = FAB_ICONS.loading;
      refs.fabEl.setAttribute("title", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E");
    } else if (!panelState.isLoggedIn) {
      refs.fabEl.style.background = "#ef4444";
      refs.fabEl.style.boxShadow = "0 4px 20px rgba(239,68,68,0.4)";
      refs.fabEl.style.animation = "none";
      refs.fabEl.innerHTML = FAB_ICONS.locked;
      refs.fabEl.setAttribute("title", "HH Copilot: \u041D\u0415 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D \u043D\u0430 hh.ru");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D");
    } else if (panelState.isOpen) {
      refs.fabEl.style.background = "#059669";
      refs.fabEl.style.opacity = "0";
      refs.fabEl.style.transform = "scale(0) rotate(180deg)";
      refs.fabEl.style.pointerEvents = "none";
      refs.fabEl.setAttribute("title", "HH Copilot: \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
    } else {
      refs.fabEl.style.background = "linear-gradient(135deg,#059669,#10B981)";
      refs.fabEl.style.boxShadow = "0 4px 20px rgba(5,150,105,0.4)";
      refs.fabEl.style.opacity = "1";
      refs.fabEl.style.transform = "scale(1)";
      refs.fabEl.style.pointerEvents = "auto";
      refs.fabEl.style.animation = "fabPulse 2.5s ease-in-out infinite";
      refs.fabEl.innerHTML = FAB_ICONS.briefcase;
      refs.fabEl.setAttribute("title", "HH Copilot: \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F.");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
    }
  }

  // src/ui/tabs/vacancies.js
  function renderVacancyList() {
    const list = refs.shadowRoot?.getElementById("har-vlist");
    if (!list) return;
    if (!panelState.vacancies.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">\u041D\u0435\u0442 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.<br>\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u043E\u0438\u0441\u043A\u0430.</div>';
      return;
    }
    list.innerHTML = panelState.vacancies.slice(0, 50).map((v) => {
      const score = v.matchScore != null ? v.matchScore : 0;
      const sc = score > 0 ? `<div class="score-ring" style="--score:${score};"><span>${score}%</span></div>` : "";
      const applyBtn = v.hasReply && v.status === "new" ? `<button class="btn btn-primary btn-sm" data-action="apply" data-id="${esc(v.id)}">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F</button>` : "";
      const badge = v.status === "applied" ? '<span class="badge badge-green">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u0430</span>' : v.status === "blacklisted" ? '<span class="badge badge-red">BL</span>' : "";
      const shimmerClass = score >= 70 && v.status === "new" ? " shimmer" : "";
      const opacity = v.status === "blacklisted" ? "opacity:0.4;" : v.status === "applied" ? "opacity:0.5;" : "";
      return `<div class="vacancy-item${shimmerClass}" data-title="${esc(v.title)}" data-status="${esc(v.status || "new")}" data-score="${score}" style="${opacity}">
      <div style="flex-shrink:0;">${sc}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <a href="${esc(v.url)}" target="_blank" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${esc(v.title)}</a>
          ${badge}
        </div>
        <div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;">
          <span>${esc(v.company)}</span>
          ${v.salary && v.salary !== "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" ? `<span style="color:#18181b;font-weight:500;">${esc(v.salary)}</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#71717a;">${esc(v.location)}</span>
          ${applyBtn}
        </div>
      </div>
    </div>`;
    }).join("");
  }
  function renderStatsValues() {
    const s = panelState.stats;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const applied = s.appliedToday || 0;
    const limit = s.dailyLimit || 200;
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val;
    };
    set("sv-applied", applied);
    set("sv-remain", limit - applied);
    set("sv-errors", s.errorsToday || 0);
    const fill = el("pf");
    if (fill) fill.style.width = Math.min(100, applied / limit * 100) + "%";
    const text = el("pt");
    if (text) text.textContent = applied + " / " + limit;
  }

  // src/ui/tabs/resumes.js
  function renderResumeListPanel() {
    const container = refs.shadowRoot?.getElementById("har-resume-content");
    if (!container) return;
    const list = panelState.resumeList;
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="har-empty">\u0421\u043F\u0438\u0441\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u0443\u0441\u0442.<br>\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" \u0434\u043B\u044F \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430.</div>';
      return;
    }
    container.innerHTML = '<div class="har-resume-list-header">\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: ' + list.length + "</div>" + list.map((r) => {
      const isActive = panelState.resume && panelState.resume.id === r.id;
      return '<div class="har-resume-list-item ' + (isActive ? "har-resume-list-active" : "") + '"><a href="' + esc(r.url) + '" target="_blank" class="har-resume-list-link">' + esc(r.title) + "</a>" + (isActive ? '<span class="har-resume-loaded-badge">loaded</span>' : "") + "</div>";
    }).join("") + '<div class="har-resume-list-hint">Click to open resume in new tab, then press "Load" on that page.</div>';
    container.querySelectorAll(".har-resume-list-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(link.getAttribute("href"), "_blank");
      });
    });
  }
  function renderResumePanel() {
    const container = refs.shadowRoot?.getElementById("har-resume-content");
    if (!container) return;
    const r = panelState.resume;
    if (!r || !r.id) {
      if (panelState.resumeList && panelState.resumeList.length > 0) {
        renderResumeListPanel();
        return;
      }
      const pageType = getResumePageType();
      let hint = 'Go to your resume page on hh.ru<br>and click "Load from current page".';
      if (pageType === "resume-list") {
        hint = 'Click "Load" to see your resumes listed on this page.';
      }
      container.innerHTML = '<div class="har-empty">Resume not loaded yet.<br>' + hint + "</div>";
      return;
    }
    const skillsHtml = r.skills.length > 0 ? '<div class="har-tag-list">' + r.skills.map((s) => '<span class="har-tag">' + esc(s) + "</span>").join("") + "</div>" : '<div class="har-empty" style="padding:8px">\u041D\u0430\u0432\u044B\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</div>';
    const expHtml = r.experience.length > 0 ? r.experience.map((j) => '<div class="har-exp-item"><div class="har-exp-pos">' + esc(j.position || "?") + '</div><div class="har-exp-meta">' + esc(j.company || "") + (j.period ? " &middot; " + esc(j.period) : "") + "</div>" + (j.description ? '<div class="har-exp-desc">' + esc(j.description) + "</div>" : "") + "</div>").join("") : '<div class="har-empty" style="padding:8px">\u041E\u043F\u044B\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D</div>';
    const eduHtml = r.education.length > 0 ? r.education.map((e) => '<div class="har-edu-item"><span>' + esc(e.name) + "</span>" + (e.year ? ' <span class="har-edu-year">' + esc(e.year) + "</span>" : "") + "</div>").join("") : "";
    const langHtml = r.languages.length > 0 ? '<div class="har-tag-list">' + r.languages.map((l) => '<span class="har-tag har-tag-lang">' + esc(l) + "</span>").join("") + "</div>" : "";
    const debugHtml = '<div class="har-debug"><details><summary>Debug (' + r._debug.found.length + " found, " + r._debug.missing.length + ' missing)</summary><div class="har-debug-body">' + r._debug.found.map((f) => '<div style="color:#22c55e">\u2713 ' + esc(f) + "</div>").join("") + r._debug.missing.map((m) => '<div style="color:#ef4444">\u2717 ' + esc(m) + "</div>").join("") + "</div></details></div>";
    container.innerHTML = `
    <div class="har-resume-card">
      <div class="har-resume-header">
        <div class="har-resume-title">${esc(r.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F")}</div>
        ${r.salary ? '<div class="har-resume-salary">' + esc(r.salary) + "</div>" : ""}
        <div class="har-resume-meta">${esc(r.gender)} ${esc(r.age)}${r.address ? " &middot; " + esc(r.address) : ""}</div>
      </div>
      ${r.specializations.length > 0 ? '<div class="har-resume-section"><div class="har-section-subtitle">\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438</div><div class="har-tag-list">' + r.specializations.map((s) => '<span class="har-tag">' + esc(s) + "</span>").join("") + "</div></div>" : ""}
      <div class="har-resume-section">
        <div class="har-section-subtitle">\u041D\u0430\u0432\u044B\u043A\u0438 (${r.skills.length})</div>
        ${skillsHtml}
      </div>
      <div class="har-resume-section">
        <div class="har-section-subtitle">\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B (${r.experience.length})</div>
        ${expHtml}
      </div>
      ${eduHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435</div>' + eduHtml + "</div>" : ""}
      ${langHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">\u042F\u0437\u044B\u043A\u0438</div>' + langHtml + "</div>" : ""}
      ${r.additionalInfo ? '<div class="har-resume-section"><div class="har-section-subtitle">\u0414\u043E\u043F. \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F</div><div style="font-size:12px;color:#475569;padding:4px 0">' + esc(r.additionalInfo) + "</div></div>" : ""}
      ${debugHtml}
      <div style="font-size:10px;color:#94a3b8;padding:8px 0">Parsed: ${r.parsedAt}</div>
      <a href="${esc(r.url)}" target="_blank" class="har-btn har-btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open on hh.ru</a>
    </div>`;
  }

  // src/ui/tabs/overview.js
  function renderOverviewKPI() {
    const s = panelState.stats;
    const applied = s.appliedToday || 0;
    const limit = panelState.settings.dailyLimit || 200;
    const hourly = s.hourlyApplied || 0;
    const hourlyLimit = panelState.settings.hourlyLimit || 30;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    if (!el) return;
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val;
    };
    set("kpi-daily-count", applied);
    set("kpi-hourly-count", hourly);
    set("kpi-applied-count", applied);
    set("kpi-invitations-count", panelState.dailyStats.invitations || 0);
    set("rl-429-count", panelState.dailyStats.errors429 || 0);
    const hourlyBar = el("kpi-hourly-bar")?.querySelector(".fill");
    if (hourlyBar) hourlyBar.style.width = Math.min(100, hourly / hourlyLimit * 100) + "%";
  }
  function addTimelineEvent(type, text, detail) {
    const list = refs.shadowRoot?.getElementById("tl-activity-list");
    if (!list) return;
    const colors = {
      apply: "#059669",
      invitation: "#2563EB",
      captcha: "#D97706",
      error: "#DC2626",
      info: "#71717a",
      resume: "#7C3AED",
      parsing: "#059669",
      reset: "#71717a"
    };
    const labels = {
      apply: "\u041E\u0422\u041A\u041B\u0418\u041A",
      invitation: "\u041F\u0420\u0418\u0413\u041B\u0410\u0428\u0415\u041D\u0418\u0415",
      captcha: "CAPTCHA",
      error: "\u041E\u0428\u0418\u0411\u041A\u0410",
      info: "\u0418\u041D\u0424\u041E",
      resume: "\u0420\u0415\u0417\u042E\u041C\u0415",
      parsing: "\u041F\u0410\u0420\u0421\u0418\u041D\u0413",
      reset: "\u0421\u0411\u0420\u041E\u0421"
    };
    const color = colors[type] || "#71717a";
    const label = labels[type] || "\u0421\u041E\u0411\u042B\u0422\u0418\u0415";
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const entry = document.createElement("div");
    entry.className = "tl-item";
    entry.innerHTML = `<div class="tl-dot" style="background:${color};"></div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;">
      <span style="font-size:11px;"><b style="color:${color};">[${label}]</b> ${esc(text)}</span>
      <span style="font-size:11px;color:#71717a;flex-shrink:0;margin-left:8px;">${time}</span>
    </div>
    ${detail ? `<div style="font-size:11px;color:#71717a;margin-top:1px;">${esc(detail)}</div>` : ""}`;
    const placeholder = list.querySelector('div[style*="text-align:center"]');
    if (placeholder) list.innerHTML = "";
    list.prepend(entry);
    const count = list.querySelectorAll(".tl-item").length;
    const countEl = refs.shadowRoot?.getElementById("tl-event-count");
    if (countEl) countEl.textContent = count + " " + declension(count, ["\u0441\u043E\u0431\u044B\u0442\u0438\u0435", "\u0441\u043E\u0431\u044B\u0442\u0438\u044F", "\u0441\u043E\u0431\u044B\u0442\u0438\u0439"]);
  }
  function declension(n, forms) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  // src/ui/tabs/stats.js
  var DAYS = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"];
  function renderStats() {
    renderKPIs();
    renderWeeklyChart();
    renderFunnel();
    renderLog();
  }
  function renderKPIs() {
    const s = panelState.stats;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val;
    };
    const total = s.totalApplied || 0;
    const inv = panelState.dailyStats.invitations || 0;
    set("stat-total", total);
    set("stat-invitations", inv);
    set("stat-conversion", total > 0 ? (inv / total * 100).toFixed(1) + "%" : "0%");
    set("stat-429", panelState.dailyStats.errors429 || 0);
  }
  function renderWeeklyChart() {
    const chart = refs.shadowRoot?.getElementById("stat-chart");
    if (!chart) return;
    const data = panelState.weeklyData || [30, 45, 25, 55, 60, 20, 10];
    const max = Math.max(...data, 1);
    chart.innerHTML = data.map((val, i) => {
      const pct = val / max * 100;
      const isWeekend = i >= 5;
      const grad = isWeekend ? "linear-gradient(180deg,#047857,#059669)" : "linear-gradient(180deg,#059669,#10B981)";
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:100%;border-radius:4px;background:${grad};height:${Math.max(pct, 4)}%;transition:height 0.5s ease;"></div>
      <span style="font-size:11px;color:#71717a;">${DAYS[i]}</span>
    </div>`;
    }).join("");
  }
  function renderFunnel() {
    const container = refs.shadowRoot?.getElementById("stat-funnel");
    if (!container) return;
    const stages = [
      { label: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043E", value: 342, color: "#3f3f46" },
      { label: "Match > 60%", value: 222, color: "#D97706" },
      { label: "\u041E\u0442\u043A\u043B\u0438\u043A\u0438", value: 147, color: "#059669" },
      { label: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F", value: 23, color: "#2563EB" },
      { label: "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F", value: 8, color: "#7C3AED" }
    ];
    const max = stages[0].value;
    container.innerHTML = stages.map((s) => {
      const pct = s.value / max * 100;
      return `<div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:11px;color:#71717a;width:90px;flex-shrink:0;">${s.label}</span>
      <div class="progress-bar" style="flex:1;"><div class="fill" style="width:${Math.max(pct, 2)}%;background:${s.color};"></div></div>
      <span style="font-size:11px;font-weight:600;width:40px;text-align:right;">${s.value}</span>
    </div>`;
    }).join("");
  }
  function addLogEntry(level, text) {
    const container = refs.shadowRoot?.getElementById("activity-log");
    if (!container) return;
    const colors = { success: "#059669", info: "#2563EB", warn: "#D97706", error: "#DC2626" };
    const labels = { success: "\u041E\u041A", info: "\u0418\u041D\u0424\u041E", warn: "\u0412\u0410\u0420\u041D", error: "\u041E\u0428\u0418\u0411\u041A\u0410" };
    const color = colors[level] || "#71717a";
    const label = labels[level] || level.toUpperCase();
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const placeholder = container.querySelector('div[style*="text-align:center"]');
    if (placeholder) container.innerHTML = "";
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.setAttribute("data-level", level);
    entry.innerHTML = `<div class="log-dot" style="background:${color};"></div>
    <div style="flex:1;">
      <div style="font-size:11px;"><b style="color:${color};">[${label}]</b> ${esc(text)}</div>
      <div style="font-size:11px;color:#71717a;">${time}</div>
    </div>`;
    container.prepend(entry);
  }
  function renderLog() {
  }
  function clearLog() {
    const container = refs.shadowRoot?.getElementById("activity-log");
    if (container) container.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>';
  }

  // src/ui/tabs/negotiations.js
  var CONV_COLORS = ["#D1FAE5,#065F46", "#DBEAFE,#1E40AF", "#FFFBEB,#B45309", "#F3E8FF,#7C3AED", "#FCE7F3,#DB2777"];
  function renderNegotiationList() {
    const list = refs.shadowRoot?.getElementById("neg-list");
    const badge = refs.shadowRoot?.getElementById("neg-count-badge");
    if (!list) return;
    const convs = panelState.negotiations || [];
    if (badge) badge.textContent = convs.length + " " + (convs.length === 1 ? "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439" : "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445");
    if (convs.length === 0) {
      list.innerHTML = '<div style="padding:24px;text-align:center;font-size:11px;color:#71717a;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</div>';
      return;
    }
    list.innerHTML = convs.map((c, i) => {
      const [bg, fg] = CONV_COLORS[i % CONV_COLORS.length].split(",");
      const initials = c.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      const isActive = panelState.activeConversation === c.id;
      return `<div class="conv-item ${isActive ? "active" : ""}" data-conv-id="${esc(c.id)}" tabindex="0" role="button"
      style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;${isActive ? "background:#ECFDF5;" : ""}">
      <div style="width:36px;height:36px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${fg};flex-shrink:0;">${esc(initials)}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;font-weight:600;">${esc(c.name)}</span>
          <span style="font-size:11px;color:#71717a;">${esc(c.time || "")}</span>
        </div>
        <div style="font-size:11px;color:#71717a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.preview || "")}</div>
      </div>
      ${c.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:#059669;flex-shrink:0;"></div>' : ""}
    </div>`;
    }).join("");
  }
  function renderChatMessages() {
    const area = refs.shadowRoot?.getElementById("neg-chat-area");
    const header = refs.shadowRoot?.getElementById("neg-chat-header");
    const messages = refs.shadowRoot?.getElementById("neg-chat-messages");
    if (!area || !header || !messages) return;
    const conv = panelState.negotiations.find((c) => c.id === panelState.activeConversation);
    if (!conv) {
      area.style.display = "none";
      return;
    }
    area.style.display = "";
    const [bg, fg] = CONV_COLORS[0].split(",");
    const initials = conv.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    header.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${fg};">${esc(initials)}</div>
    <div>
      <div style="font-size:12px;font-weight:600;">${esc(conv.name)}</div>
      <div style="font-size:11px;color:#059669;">\u041E\u043D\u043B\u0430\u0439\u043D</div>
    </div>`;
    messages.innerHTML = (conv.messages || []).map((m) => {
      if (m.from === "user") {
        return `<div style="align-self:flex-end;max-width:85%;">
        <div style="background:#059669;color:#fff;border-radius:12px;border-top-right-radius:4px;padding:8px 12px;">
          <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
        </div>
      </div>`;
      }
      return `<div style="align-self:flex-start;max-width:85%;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;border-top-left-radius:4px;padding:8px 12px;">
        <div style="font-size:11px;font-weight:600;color:#059669;margin-bottom:3px;">${esc(conv.name)}</div>
        <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
      </div>
    </div>`;
    }).join("");
  }

  // src/ui/tabs/settings.js
  function renderBlacklist() {
    const list = refs.shadowRoot?.getElementById("bl-list");
    const badge = refs.shadowRoot?.getElementById("bl-count-badge");
    if (!list) return;
    const bl = panelState.blacklist || [];
    if (badge) badge.textContent = bl.length + " " + declension2(bl.length, ["\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F", "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438", "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439"]);
    if (bl.length === 0) {
      list.innerHTML = '<div style="padding:8px;text-align:center;font-size:11px;color:#71717a;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442</div>';
      return;
    }
    list.innerHTML = bl.map(
      (name) => `<div class="bl-item" data-bl-name="${esc(name)}">
      <span style="font-size:12px;">${esc(name)}</span>
      <button class="btn-bl-del" data-bl-remove="${esc(name)}">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
    </div>`
    ).join("");
  }
  function renderSettingsValues() {
    const el = (id) => refs.shadowRoot?.getElementById(id);
    if (!el) return;
    const set = (id, val) => {
      const e = el(id);
      if (e) e.value = val;
    };
    const chk = (id, val) => {
      const e = el(id);
      if (e) e.checked = val;
    };
    set("s-daily-limit", panelState.settings.dailyLimit);
    set("s-hourly-limit", panelState.settings.hourlyLimit);
    set("s-min-interval", panelState.settings.minInterval);
    set("s-captcha-time", panelState.settings.captchaPauseTime);
    set("s-reset-time", panelState.settings.dailyResetTime);
    chk("s-burst", panelState.settings.burstDetection);
    chk("s-adaptive", panelState.settings.adaptiveSlowdown);
    chk("s-captcha", panelState.settings.captchaAutoPause);
    chk("s-auth-check", panelState.settings.autoAuthCheck);
    chk("s-notifications", panelState.settings.notifications);
    chk("s-logging", panelState.settings.logging);
    chk("s-shadow-dom", panelState.settings.shadowDOM);
  }
  function declension2(n, forms) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  // src/ui/panel.js
  var panelLog = createLogger("Panel");
  function updateAuthState() {
    const was = panelState.isLoggedIn;
    const now = checkAuth();
    if (was !== now) {
      panelState.isLoggedIn = now;
      panelLog.info("Auth: " + (now ? "LOGGED IN" : "NOT LOGGED IN"));
      renderSidebarContent();
      updateFabIcon();
    }
  }
  function createSidebar() {
    if (refs.sidebarEl) return;
    refs.backdropEl = document.createElement("div");
    refs.backdropEl.id = "hh-ar-backdrop";
    refs.backdropEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;";
    refs.backdropEl.addEventListener("click", () => {
      if (panelState.isOpen) toggleSidebar();
    });
    refs.sidebarEl = document.createElement("div");
    refs.sidebarEl.id = "hh-ar-sidebar";
    refs.sidebarEl.style.cssText = "position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);";
    refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = getSidebarCSS();
    refs.shadowRoot.appendChild(style);
    const container = document.createElement("div");
    container.className = "fab-panel";
    container.innerHTML = getSidebarHTML();
    refs.shadowRoot.appendChild(container);
    bindSidebarEvents(container);
    document.body.appendChild(refs.backdropEl);
    document.body.appendChild(refs.sidebarEl);
  }
  function toggleSidebar() {
    if (!refs.sidebarEl) createSidebar();
    if (!refs.fabEl) createFab(toggleSidebar);
    panelState.isOpen = !panelState.isOpen;
    refs.sidebarEl.style.transform = panelState.isOpen ? "translateX(0)" : "translateX(100%)";
    if (refs.backdropEl) {
      refs.backdropEl.style.opacity = panelState.isOpen ? "1" : "0";
      refs.backdropEl.style.pointerEvents = panelState.isOpen ? "auto" : "none";
    }
    updateFabIcon();
    panelLog.info("Sidebar " + (panelState.isOpen ? "opened" : "closed"));
  }
  function renderSidebarContent() {
    const content = refs.shadowRoot?.querySelector(".har-content");
    if (!content) return;
    if (panelState.isLoggedIn === null) {
      content.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <div class="har-spinner"></div>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3>
      <p style="font-size:13px;color:#71717a;line-height:1.5;">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p>
    </div>`;
      return;
    }
    if (!panelState.isLoggedIn) {
      content.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 hh.ru</h3>
      <p style="font-size:13px;color:#71717a;line-height:1.5;margin-bottom:24px;">\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0451\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E.<br>\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0434\u043B\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438.</p>
      <a href="https://hh.ru/account/login" target="_blank" class="btn btn-primary" style="text-decoration:none;">\u0412\u043E\u0439\u0442\u0438 \u043D\u0430 hh.ru</a>
      <button class="btn btn-outline" id="har-retry-auth" style="margin-top:8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430</button>
    </div>`;
      return;
    }
    const container = refs.shadowRoot?.querySelector(".fab-panel");
    if (!container) return;
    const userName = getUserName();
    container.innerHTML = getLoggedInHTML(userName);
    bindAllEvents(container);
    renderInitialData();
    const headerStatus = refs.shadowRoot?.getElementById("header-auth-status");
    if (headerStatus && userName !== "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C") {
      headerStatus.innerHTML = `<span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>${esc(userName)}`;
    }
    if (refs.fabEl && userName !== "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C") {
      refs.fabEl.setAttribute("title", "HH Copilot: " + userName + ". \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F.");
    }
  }
  function renderInitialData() {
    renderOverviewKPI();
    renderVacancyList();
    renderStatsValues();
    renderStats();
    renderBlacklist();
    renderSettingsValues();
    renderNegotiationList();
  }
  function switchTab(tabId) {
    panelState.activeTab = tabId;
    const sr = refs.shadowRoot;
    if (!sr) return;
    sr.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    sr.querySelectorAll(".tab-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "tab-" + tabId);
    });
    if (tabId === "resume") renderResumePanel();
    if (tabId === "stats") renderStats();
    if (tabId === "negotiations") renderNegotiationList();
  }
  function toggleTimeline(toggleEl) {
    const body = toggleEl.nextElementSibling;
    const chevron = toggleEl.querySelector(".timeline-chevron");
    if (!body) return;
    const isOpen = body.classList.toggle("open");
    if (chevron) chevron.classList.toggle("open", isOpen);
  }
  function toggleSub(subId, chevId) {
    const sr = refs.shadowRoot;
    const sub = sr?.getElementById(subId);
    const chev = sr?.getElementById(chevId);
    if (sub) sub.classList.toggle("open");
    if (chev) chev.classList.toggle("open");
  }
  function bindAllEvents(container) {
    bindTabClicks(container);
    bindSidebarClicks(container);
    bindTimelineToggles(container);
    bindInputChanges(container);
  }
  function bindTabClicks(container) {
    container.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
  }
  function bindSidebarClicks(container) {
    container.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest('[data-action="close-panel"]')) {
        toggleSidebar();
        return;
      }
      const applyBtn = t.closest('[data-action="apply"]');
      if (applyBtn) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("hh-ar-apply", { detail: { vacancyId: applyBtn.dataset.id } }));
        return;
      }
      if (t.closest('[data-action="apply-all"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-apply-all"));
        return;
      }
      if (t.closest('[data-action="pause"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-toggle-status"));
        return;
      }
      if (t.closest('[data-action="refresh"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-refresh"));
        return;
      }
      if (t.closest('[data-action="check-auth"]')) {
        updateAuthState();
        return;
      }
      if (t.closest("#har-retry-auth")) {
        updateAuthState();
        return;
      }
      if (t.closest("#authIndicator")) {
        updateAuthState();
        return;
      }
      if (t.closest('[data-action="load-resume"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-load-resume"));
        return;
      }
      const tabSwitch = t.closest("[data-tab-switch]");
      if (tabSwitch) {
        switchTab(tabSwitch.dataset.tabSwitch);
        return;
      }
      if (t.closest('[data-action="reset-daily"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-reset-daily"));
        return;
      }
      if (t.closest('[data-action="diagnose-dom"]')) {
        diagnoseResumeDOM();
        return;
      }
      if (t.closest('[data-action="bl-add"]')) {
        addBlacklistItem();
        return;
      }
      const blRemove = t.closest("[data-bl-remove]");
      if (blRemove) {
        removeBlacklistItem(blRemove.dataset.blRemove);
        return;
      }
      if (t.closest('[data-action="clear-log"]')) {
        clearLog();
        return;
      }
      const convItem = t.closest("[data-conv-id]");
      if (convItem) {
        selectConversation(convItem.dataset.convId);
        return;
      }
    });
  }
  function bindTimelineToggles(container) {
    container.addEventListener("click", (e) => {
      const tl = e.target.closest("[data-timeline]");
      if (tl) {
        toggleTimeline(tl);
        return;
      }
      const sub = e.target.closest("[data-sub-toggle]");
      if (sub) {
        toggleSub(sub.dataset.subId, sub.dataset.chevId);
        return;
      }
    });
    container.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const tl = e.target.closest("[data-timeline]") || e.target.closest("[data-sub-toggle]");
        if (tl) {
          e.preventDefault();
          tl.click();
        }
      }
    });
  }
  function bindInputChanges(container) {
    const scoreRange = container.querySelector("#vac-score-range");
    const scoreLabel = container.querySelector("#vac-score-label");
    if (scoreRange && scoreLabel) {
      scoreRange.addEventListener("input", () => {
        scoreLabel.textContent = scoreRange.value + "%";
        filterVacancies();
      });
    }
    const searchInput = container.querySelector("#vac-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => filterVacancies());
    }
    const statusFilter = container.querySelector("#vac-status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", () => filterVacancies());
    }
  }
  function addBlacklistItem() {
    const input = refs.shadowRoot?.getElementById("bl-input");
    if (!input || !input.value.trim()) return;
    const name = input.value.trim();
    if (!panelState.blacklist.includes(name)) {
      panelState.blacklist.push(name);
      input.value = "";
      renderBlacklist();
      addLogEntry("info", "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F \u0432 \u0427\u0421: " + name);
    }
  }
  function removeBlacklistItem(name) {
    panelState.blacklist = panelState.blacklist.filter((n) => n !== name);
    renderBlacklist();
  }
  function selectConversation(convId) {
    panelState.activeConversation = convId;
    renderNegotiationList();
    renderChatMessages();
  }
  function filterVacancies() {
    const search = (refs.shadowRoot?.getElementById("vac-search")?.value || "").toLowerCase();
    const status = refs.shadowRoot?.getElementById("vac-status-filter")?.value || "all";
    const minScore = parseInt(refs.shadowRoot?.getElementById("vac-score-range")?.value || "0", 10);
    const items = refs.shadowRoot?.querySelectorAll("#har-vlist .vacancy-item");
    let visible = 0;
    items.forEach((item) => {
      const title = (item.dataset.title || "").toLowerCase();
      const itemStatus = item.dataset.status || "new";
      const itemScore = parseInt(item.dataset.score || "0", 10);
      const matchTitle = !search || title.includes(search);
      const matchStatus = status === "all" || itemStatus === status;
      const matchScore = itemScore >= minScore;
      item.style.display = matchTitle && matchStatus && matchScore ? "" : "none";
      if (matchTitle && matchStatus && matchScore) visible++;
    });
  }
  function updateVacancies(vacancies) {
    panelState.vacancies = (vacancies || []).filter((v) => v && v.id && v.title);
    renderVacancyList();
    updateVacancyCounts();
  }
  function updateStats(stats) {
    Object.assign(panelState.stats, stats);
    renderStatsValues();
    renderOverviewKPI();
  }
  function setStatus(status) {
    panelState.status = status;
  }
  function createPanel() {
    createFab(toggleSidebar);
    createSidebar();
    setTimeout(updateAuthState, 1500);
    setInterval(updateAuthState, 5e3);
  }
  function updateVacancyCounts() {
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const vacs = panelState.vacancies;
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val;
    };
    set("vac-total", vacs.length);
    set("vac-high-match", vacs.filter((v) => (v.matchScore || 0) >= 70).length);
    set("vac-blacklisted", vacs.filter((v) => v.status === "blacklisted").length);
  }

  // src/content/main.js
  var mainLog = createLogger("Main");
  var pageInitialized = false;
  window.__hhDiagnose = diagnoseResumeDOM;
  async function init() {
    mainLog.info("Loaded: " + window.location.href);
    await checkDailyReset();
    createPanel();
    try {
      const d = await chrome.storage.local.get("myResume");
      if (d.myResume && d.myResume.id) {
        panelState.resume = d.myResume;
        mainLog.info("Loaded saved resume: " + d.myResume.title);
      }
    } catch (e) {
    }
    pollAuth();
    window.addEventListener("hh-ar-apply", async (e) => {
      if (!panelState.isLoggedIn) return;
      await applyToVacancy(e.detail.vacancyId);
    });
    window.addEventListener("hh-ar-apply-all", async () => {
      if (!panelState.isLoggedIn) return;
      await applyToAll(panelState.vacancies);
    });
    window.addEventListener("hh-ar-refresh", async () => {
      if (!panelState.isLoggedIn) return;
      const v = await parseVacanciesFromPage();
      updateVacancies(v);
    });
    window.addEventListener("hh-ar-load-resume", async () => {
      if (!panelState.isLoggedIn) return;
      const path = window.location.pathname;
      if (/\/resume\/[a-f0-9]+/.test(path)) {
        await expandHiddenSections();
        const resume = parseResume();
        if (resume.id) {
          panelState.resume = resume;
          await chrome.storage.local.set({ myResume: resume });
          mainLog.info("Resume loaded and saved: " + resume.title);
        } else {
          mainLog.warn("Could not parse resume from current page (no id)");
        }
      } else if (path.includes("/applicant/resumes")) {
        const list = parseResumeList();
        if (list.length > 0) {
          panelState.resumeList = list;
          mainLog.info("Resume list loaded: " + list.length + " resumes");
        } else {
          mainLog.warn("No resumes found on list page");
        }
      } else {
        mainLog.warn("Cannot parse resume from this page (" + path + "). Go to /resume/{hash} or /applicant/resumes");
      }
    });
  }
  function pollAuth() {
    if (checkAuth()) {
      mainLog.info("User logged in");
      if (!pageInitialized) {
        pageInitialized = true;
        updateAuthState();
        initPageLogic();
      }
      return;
    }
    setTimeout(pollAuth, 2e3);
  }
  async function initPageLogic() {
    const path = window.location.pathname;
    mainLog.info("Page: " + path);
    if (path.startsWith("/search/vacancy")) {
      const vacancies = await parseVacanciesFromPage();
      updateVacancies(vacancies);
      const stats = await getStats();
      updateStats(stats);
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const fresh = await parseVacanciesFromPage();
          updateVacancies(fresh);
        }, 1500);
      }).observe(document.body, { childList: true, subtree: true });
      mainLog.info("SPA observer active");
    } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
      await expandHiddenSections();
      const resume = parseResume();
      if (resume.id) {
        panelState.resume = resume;
        await chrome.storage.local.set({ myResume: resume });
        mainLog.info("Auto-parsed resume: " + resume.title);
      }
      const { pendingApply } = await chrome.storage.local.get("pendingApply");
      if (pendingApply?.vacancyId) {
        const age = Date.now() - (pendingApply.timestamp || 0);
        if (age < 12e4) {
          await chrome.storage.local.remove("pendingApply");
          await continueApply(pendingApply);
        } else {
          await chrome.storage.local.remove("pendingApply");
        }
      }
    } else if (path.startsWith("/applicant/resumes")) {
      const resumeList = parseResumeList();
      panelState.resumeList = resumeList;
      mainLog.info("Resume list page: " + resumeList.length + " resumes");
    } else if (/^\/vacancy\/\d+/.test(path)) {
      const { pendingApply } = await chrome.storage.local.get("pendingApply");
      if (pendingApply?.vacancyId) {
        const age = Date.now() - (pendingApply.timestamp || 0);
        if (age < 12e4) {
          await chrome.storage.local.remove("pendingApply");
          await continueApply(pendingApply);
        } else {
          await chrome.storage.local.remove("pendingApply");
        }
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
//# sourceMappingURL=content.js.map
