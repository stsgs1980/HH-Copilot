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
    vacancies: [],
    stats: {},
    resume: null,
    resumeList: [],
    activeTab: null
  };
  var refs = {
    fabEl: null,
    sidebarEl: null,
    backdropEl: null,
    shadowRoot: null
  };

  // src/ui/styles.js
  function getSidebarCSS() {
    return "@keyframes har-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes har-pulse{0%,100%{opacity:1}50%{opacity:.5}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}.har-sidebar{height:100%;display:flex;flex-direction:column;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;color:#1a1a1a}.har-header{padding:16px 20px;background:linear-gradient(135deg,#2964FF,#6366f1);color:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:space-between}.har-header h3{margin:0;font-size:16px;font-weight:700}.har-version{font-size:10px;opacity:.7}.har-content{flex:1;overflow-y:auto}.har-user-bar{display:flex;align-items:center;gap:12px;padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.har-avatar{width:36px;height:36px;border-radius:50%;background:#2964FF;display:flex;align-items:center;justify-content:center}.har-user-info{flex:1}.har-user-name{font-size:13px;font-weight:600}.har-user-status{font-size:11px;color:#22c55e}.har-dot{width:8px;height:8px;border-radius:50%;background:#9ca3af}.har-dot-idle{background:#9ca3af}.har-dot-running{background:#22c55e;animation:har-pulse 1.5s infinite}.har-dot-paused{background:#f59e0b}.har-dot-error{background:#ef4444}.har-auth-box{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center}.har-spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#2964FF;border-radius:50%;animation:har-spin .8s linear infinite;margin-bottom:20px}.har-lock-icon{margin-bottom:20px}.har-auth-box h3{font-size:18px;font-weight:700;margin:0 0 12px}.har-auth-box p{font-size:13px;color:#64748b;line-height:1.6;margin:0 0 24px}.har-stats{display:flex;padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;gap:12px}.har-stat{text-align:center;flex:1}.har-stat-val{display:block;font-weight:800;font-size:22px;color:#2964FF}.har-stat-lbl{display:block;font-size:10px;color:#64748b;text-transform:uppercase;margin-top:2px}.har-progress{padding:8px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.har-progress-bar{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden}.har-progress-fill{height:100%;background:linear-gradient(90deg,#2964FF,#6366f1);border-radius:2px;transition:width .5s}.har-progress-text{font-size:10px;color:#94a3b8;text-align:right;margin-top:4px}.har-actions{padding:12px 20px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #e2e8f0}.har-btn{padding:10px 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;text-align:center}.har-btn-primary{background:#2964FF;color:#fff}.har-btn-primary:hover{background:#1d4ed8}.har-btn-secondary{background:#f1f5f9;color:#475569}.har-btn-secondary:hover{background:#e2e8f0}.har-btn-block{width:100%;display:block;margin:6px 0}.har-section-title{padding:10px 20px 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}.har-vacancy-list{flex:1;overflow-y:auto}.har-vcard{padding:10px 20px;border-bottom:1px solid #f1f5f9;transition:background .15s}.har-vcard:hover{background:#f8fafc}.har-vcard.applied{opacity:.5}.har-vcard.blacklisted{opacity:.3}.har-vhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}.har-vtitle{font-weight:600;color:#2964FF;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.har-vtitle:hover{text-decoration:underline}.har-score{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap}.sc-high{background:#dcfce7;color:#166534}.sc-medium{background:#fef9c3;color:#854d0e}.sc-low{background:#fee2e2;color:#991b1b}.har-vmeta{display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px}.har-vsalary{color:#1a1a1a;font-weight:500}.har-vfoot{display:flex;align-items:center;justify-content:space-between}.har-vfoot>span:first-child{font-size:11px;color:#94a3b8}.har-btn-apply{padding:4px 12px;background:#2964FF;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer}.har-btn-apply:hover{background:#1d4ed8}.har-badge{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600}.ba{background:#dbeafe;color:#1d4ed8}.bb{background:#fee2e2;color:#991b1b}.har-empty{padding:24px 20px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6}.har-tabs{display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc}.har-tab{flex:1;padding:10px 16px;border:none;background:none;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}.har-tab:hover{color:#1a1a1a;background:#f1f5f9}.har-tab-active{color:#2964FF;border-bottom-color:#2964FF;background:#fff}.har-tab-content{flex:1;overflow-y:auto}.har-resume-card{padding:16px 20px}.har-resume-header{margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0}.har-resume-title{font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:4px}.har-resume-salary{font-size:14px;font-weight:600;color:#2964FF;margin-bottom:4px}.har-resume-meta{font-size:12px;color:#64748b}.har-resume-section{margin-bottom:12px}.har-section-subtitle{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}.har-tag-list{display:flex;flex-wrap:wrap;gap:4px}.har-tag{display:inline-block;padding:3px 8px;background:#eff6ff;color:#2964FF;border-radius:4px;font-size:11px;font-weight:500}.har-tag-lang{background:#f0fdf4;color:#166534}.har-exp-item{padding:8px 0;border-bottom:1px solid #f1f5f9}.har-exp-pos{font-size:13px;font-weight:600;color:#1a1a1a}.har-exp-meta{font-size:11px;color:#64748b;margin-top:2px}.har-exp-desc{font-size:11px;color:#475569;margin-top:4px;line-height:1.4}.har-edu-item{font-size:12px;color:#475569;padding:4px 0}.har-edu-year{color:#94a3b8;font-size:11px}.har-debug{margin-top:12px;padding-top:8px;border-top:1px solid #f1f5f9}.har-debug summary{font-size:10px;color:#94a3b8;cursor:pointer;padding:4px 0}.har-debug-body{font-size:10px;font-family:monospace;padding:8px 0;line-height:1.8}.har-resume-list-header{padding:10px 20px;font-size:12px;font-weight:700;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0}.har-resume-list-item{padding:8px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;transition:background .15s}.har-resume-list-item:hover{background:#f8fafc}.har-resume-list-active{background:#eff6ff;border-left:3px solid #2964FF}.har-resume-list-link{flex:1;font-size:13px;font-weight:500;color:#2964FF;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.har-resume-list-link:hover{text-decoration:underline}.har-resume-loaded-badge{font-size:9px;padding:2px 6px;background:#dcfce7;color:#166534;border-radius:4px;font-weight:600;white-space:nowrap}.har-resume-list-hint{padding:10px 20px;font-size:11px;color:#94a3b8;line-height:1.5}";
  }

  // src/ui/html.js
  function getSidebarHTML() {
    return '<div class="har-header"><h3>HH Auto-Respond</h3><span class="har-version">v1.3.0</span></div><div class="har-content"><div class="har-auth-box"><div class="har-spinner"></div><h3>\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3><p>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p></div></div>';
  }
  function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function scoreClass(s) {
    return s >= 70 ? "high" : s >= 40 ? "medium" : "low";
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
  function createFab(onClick) {
    if (refs.fabEl) return;
    refs.fabEl = document.createElement("div");
    refs.fabEl.id = "hh-ar-fab";
    refs.fabEl.style.cssText = "position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.18);transition:right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,background 0.2s;background:#94a3b8;";
    refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
    refs.fabEl.addEventListener("mouseenter", () => {
      refs.fabEl.style.transform = "scale(1.08)";
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
      refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
    } else if (!panelState.isLoggedIn) {
      refs.fabEl.style.background = "#ef4444";
      refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
    } else if (panelState.isOpen) {
      refs.fabEl.style.background = "#2964FF";
      refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else {
      refs.fabEl.style.background = "#2964FF";
      refs.fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
    }
  }

  // src/ui/tabs/vacancies.js
  function renderVacancyList() {
    const list = refs.shadowRoot?.getElementById("har-vlist");
    if (!list) return;
    if (!panelState.vacancies.length) {
      list.innerHTML = '<div class="har-empty">\u041D\u0435\u0442 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.<br>\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u043E\u0438\u0441\u043A\u0430.</div>';
      return;
    }
    list.innerHTML = panelState.vacancies.slice(0, 50).map((v) => {
      const sc = v.matchScore != null ? '<span class="har-score sc-' + scoreClass(v.matchScore) + '">' + v.matchScore + "%</span>" : "";
      const apply = v.hasReply && v.status === "new" ? '<button class="har-btn-apply" data-action="apply" data-id="' + v.id + '">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F</button>' : "";
      const badge = v.status === "applied" ? '<span class="har-badge ba">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u0430</span>' : v.status === "blacklisted" ? '<span class="har-badge bb">\u0427\u0421</span>' : "";
      return '<div class="har-vcard ' + (v.status || "") + '"><div class="har-vhead"><a href="' + v.url + '" target="_blank" class="har-vtitle">' + esc(v.title) + "</a>" + sc + '</div><div class="har-vmeta"><span>' + esc(v.company) + "</span>" + (v.salary && v.salary !== "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" ? '<span class="har-vsalary">' + esc(v.salary) + "</span>" : "") + '</div><div class="har-vfoot"><span>' + esc(v.location) + "</span>" + apply + badge + "</div></div>";
    }).join("");
  }
  function renderStatsValues() {
    const s = panelState.stats;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const applied = s.appliedToday || 0;
    const limit = s.dailyLimit || 200;
    if (el("sv-applied")) el("sv-applied").textContent = applied;
    if (el("sv-remain")) el("sv-remain").textContent = limit - applied;
    if (el("sv-errors")) el("sv-errors").textContent = s.errorsToday || 0;
    if (el("pf")) el("pf").style.width = Math.min(100, applied / limit * 100) + "%";
    if (el("pt")) el("pt").textContent = applied + " / " + limit;
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

  // src/ui/panel.js
  var panelLog = createLogger("Panel");
  function updateAuthState() {
    const was = panelState.isLoggedIn;
    const now = checkAuth();
    console.log("[HH-AR][Auth] updateAuthState: was=" + was + ", now=" + now + ", url=" + window.location.href);
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
    refs.backdropEl.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999998;opacity:0;pointer-events:none;transition:opacity 0.3s;";
    refs.backdropEl.addEventListener("click", () => {
      if (panelState.isOpen) toggleSidebar();
    });
    refs.sidebarEl = document.createElement("div");
    refs.sidebarEl.id = "hh-ar-sidebar";
    refs.sidebarEl.style.cssText = "position:fixed;top:0;right:0;width:720px;height:100vh;z-index:999999;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);";
    refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = getSidebarCSS();
    refs.shadowRoot.appendChild(style);
    const container = document.createElement("div");
    container.className = "har-sidebar";
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
    refs.fabEl.style.right = panelState.isOpen ? "380px" : "24px";
    updateFabIcon();
    panelLog.info("Sidebar " + (panelState.isOpen ? "opened" : "closed"));
  }
  function renderSidebarContent() {
    const content = refs.shadowRoot?.querySelector(".har-content");
    if (!content) return;
    if (panelState.isLoggedIn === null) {
      content.innerHTML = '<div class="har-auth-box"><div class="har-spinner"></div><h3>\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3><p>\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p></div>';
    } else if (!panelState.isLoggedIn) {
      content.innerHTML = '<div class="har-auth-box"><div class="har-lock-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><h3>\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 hh.ru</h3><p>\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0451\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E.<br>\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0434\u043B\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438.</p><a href="https://hh.ru/account/login" target="_blank" class="har-btn har-btn-primary har-btn-block">\u0412\u043E\u0439\u0442\u0438 \u043D\u0430 hh.ru</a><button class="har-btn har-btn-secondary har-btn-block" id="har-retry-auth">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430</button></div>';
    } else {
      renderLoggedInContent(content);
    }
  }
  function renderLoggedInContent(content) {
    const name = getUserName();
    content.innerHTML = `
    <div class="har-user-bar">
      <div class="har-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="har-user-info"><div class="har-user-name">${esc(name)}</div><div class="har-user-status">\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D</div></div>
      <div class="har-dot har-dot-${panelState.status}"></div>
    </div>
    <div class="har-tabs">
      <button class="har-tab ${!panelState.activeTab || panelState.activeTab === "vacancies" ? "har-tab-active" : ""}" data-tab="vacancies">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438</button>
      <button class="har-tab ${panelState.activeTab === "resume" ? "har-tab-active" : ""}" data-tab="resume">\u041C\u043E\u0451 \u0440\u0435\u0437\u044E\u043C\u0435</button>
    </div>
    <div class="har-tab-content" id="har-tab-vacancies" style="${panelState.activeTab === "resume" ? "display:none" : ""}">
      <div class="har-stats">
        <div class="har-stat"><span class="har-stat-val" id="sv-applied">0</span><span class="har-stat-lbl">\u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</span></div>
        <div class="har-stat"><span class="har-stat-val" id="sv-remain">200</span><span class="har-stat-lbl">\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C</span></div>
        <div class="har-stat"><span class="har-stat-val" id="sv-errors">0</span><span class="har-stat-lbl">\u043E\u0448\u0438\u0431\u043E\u043A</span></div>
      </div>
      <div class="har-progress"><div class="har-progress-bar"><div class="har-progress-fill" id="pf"></div></div><div class="har-progress-text" id="pt">0 / 200</div></div>
      <div class="har-actions">
        <button class="har-btn har-btn-primary" data-action="apply-all">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u0435</button>
        <div style="display:flex;gap:8px"><button class="har-btn har-btn-secondary" data-action="pause" style="flex:1">\u041F\u0430\u0443\u0437\u0430</button><button class="har-btn har-btn-secondary" data-action="refresh" style="flex:1">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C</button></div>
      </div>
      <div class="har-section-title">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435</div>
      <div class="har-vacancy-list" id="har-vlist"><div class="har-empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
    </div>
    <div class="har-tab-content" id="har-tab-resume" style="${!panelState.activeTab || panelState.activeTab !== "resume" ? "display:none" : ""}">
      <div id="har-resume-content"><div class="har-empty">\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0430 hh.ru<br>\u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C".</div></div>
      <button class="har-btn har-btn-primary har-btn-block" data-action="load-resume" style="margin:12px 20px">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B</button>
      <button class="har-btn har-btn-secondary har-btn-block" data-action="diagnose-dom" style="margin:0 20px 8px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b">\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430 DOM</button>
      <button class="har-btn har-btn-secondary har-btn-block" data-action="goto-resume" style="margin:0 20px 12px">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u043F\u0438\u0441\u043A\u0443 \u0440\u0435\u0437\u044E\u043C\u0435</button>
    </div>`;
    bindTabEvents(content);
    renderVacancyList();
    renderStatsValues();
    if (panelState.activeTab === "resume") renderResumePanel();
  }
  function bindTabEvents(container) {
    container.querySelectorAll(".har-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        panelState.activeTab = tabName;
        const vacDiv = refs.shadowRoot?.getElementById("har-tab-vacancies");
        const resDiv = refs.shadowRoot?.getElementById("har-tab-resume");
        if (vacDiv) vacDiv.style.display = tabName === "vacancies" ? "" : "none";
        if (resDiv) resDiv.style.display = tabName === "resume" ? "" : "none";
        refs.shadowRoot?.querySelectorAll(".har-tab").forEach((t) => {
          t.classList.toggle("har-tab-active", t.dataset.tab === tabName);
        });
        if (tabName === "resume") renderResumePanel();
      });
    });
  }
  function bindSidebarEvents(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="apply"]');
      if (btn) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("hh-ar-apply", { detail: { vacancyId: btn.dataset.id } }));
        return;
      }
      if (e.target.closest('[data-action="apply-all"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-apply-all"));
        return;
      }
      if (e.target.closest('[data-action="pause"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-toggle-status"));
        return;
      }
      if (e.target.closest('[data-action="refresh"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-refresh"));
        return;
      }
      if (e.target.closest("#har-retry-auth")) {
        updateAuthState();
        return;
      }
      if (e.target.closest('[data-action="load-resume"]')) {
        window.dispatchEvent(new CustomEvent("hh-ar-load-resume"));
        return;
      }
      if (e.target.closest('[data-action="goto-resume"]')) {
        window.open("https://hh.ru/applicant/resumes", "_blank");
        return;
      }
      if (e.target.closest('[data-action="diagnose-dom"]')) {
        diagnoseResumeDOM();
        return;
      }
    });
  }
  function updateVacancies(vacancies) {
    panelState.vacancies = (vacancies || []).filter((v) => v && v.id && v.title);
    renderVacancyList();
  }
  function updateStats(stats) {
    Object.assign(panelState.stats, stats);
    renderStatsValues();
  }
  function setStatus(status) {
    panelState.status = status;
    const dot = refs.shadowRoot?.querySelector(".har-dot");
    if (dot) dot.className = "har-dot har-dot-" + status;
  }
  function createPanel() {
    createFab(toggleSidebar);
    createSidebar();
    setTimeout(updateAuthState, 1500);
    setInterval(updateAuthState, 5e3);
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
