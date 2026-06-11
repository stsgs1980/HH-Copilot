(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lib/anti-hallucination.js
  var anti_hallucination_exports = {};
  __export(anti_hallucination_exports, {
    createLogger: () => createLogger,
    extractVacancyId: () => extractVacancyId,
    safeClick: () => safeClick,
    safeGetAttr: () => safeGetAttr,
    safeGetText: () => safeGetText,
    safeInput: () => safeInput,
    validateVacancyData: () => validateVacancyData,
    waitForElement: () => waitForElement
  });
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
      info: (action, data) => console.log("[HH-AR][" + module + "] " + action, data || ""),
      warn: (action, data) => console.warn("[HH-AR][" + module + "] " + action, data || ""),
      error: (action, data) => console.error("[HH-AR][" + module + "] " + action, data || "")
    };
  }
  var init_anti_hallucination = __esm({
    "src/lib/anti-hallucination.js"() {
    }
  });

  // src/lib/storage-settings.js
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
  var DEFAULT_SETTINGS, DEFAULT_STATS;
  var init_storage_settings = __esm({
    "src/lib/storage-settings.js"() {
      DEFAULT_SETTINGS = {
        mode: "manual",
        dailyLimit: 200,
        minMatchScore: 60,
        letterTone: "formal",
        searchInterval: 300,
        autoScroll: true,
        showMatchScore: true,
        confirmBeforeApply: true
      };
      DEFAULT_STATS = {
        totalApplied: 0,
        appliedToday: 0,
        interviewInvites: 0,
        responsesReceived: 0,
        skipsToday: 0,
        errorsToday: 0,
        lastActivity: null
      };
    }
  });

  // src/lib/storage-queue.js
  async function getAppliedVacancies() {
    try {
      const d = await chrome.storage.local.get("appliedVacancies");
      return d.appliedVacancies || [];
    } catch (e) {
      return [];
    }
  }
  async function isAlreadyApplied(id) {
    const appliedIds = await getAppliedVacancies();
    return appliedIds.includes(id);
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
  async function getMyResumes() {
    try {
      const d = await chrome.storage.local.get("myResumes");
      return d.myResumes || [];
    } catch (e) {
      return [];
    }
  }
  async function saveMyResume(resume) {
    if (!resume || !resume.id) return;
    const resumes = await getMyResumes();
    const idx = resumes.findIndex((r) => r.id === resume.id);
    if (idx >= 0) {
      resumes[idx] = resume;
    } else {
      resumes.push(resume);
    }
    await chrome.storage.local.set({ myResumes: resumes });
    return resumes;
  }
  async function saveMyResumes(resumes) {
    await chrome.storage.local.set({ myResumes: resumes });
  }
  async function clearMyResumes() {
    await chrome.storage.local.set({ myResumes: [] });
  }
  async function getSyncQueue() {
    try {
      const d = await chrome.storage.local.get("syncQueue");
      return d.syncQueue || [];
    } catch (e) {
      return [];
    }
  }
  async function setSyncQueue(queue) {
    await chrome.storage.local.set({ syncQueue: queue });
  }
  async function dequeueSyncItem() {
    const queue = await getSyncQueue();
    if (queue.length === 0) return null;
    const next = queue[0];
    await setSyncQueue(queue.slice(1));
    return next;
  }
  async function clearSyncQueue() {
    await chrome.storage.local.remove("syncQueue");
  }
  async function getActiveResume() {
    try {
      const d = await chrome.storage.local.get("myResume");
      return d.myResume || null;
    } catch (e) {
      return null;
    }
  }
  async function setActiveResume(resume) {
    await chrome.storage.local.set({ myResume: resume });
  }
  async function clearActiveResume() {
    await chrome.storage.local.remove("myResume");
  }
  async function getApplyQueue() {
    try {
      const d = await chrome.storage.local.get("applyQueue");
      return d.applyQueue || [];
    } catch (e) {
      return [];
    }
  }
  async function setApplyQueue(queue) {
    await chrome.storage.local.set({ applyQueue: queue });
  }
  async function getBlacklistedCompanies() {
    try {
      const d = await chrome.storage.local.get("blacklistedCompanies");
      return d.blacklistedCompanies || [];
    } catch (e) {
      return [];
    }
  }
  async function setBlacklistedCompanies(list) {
    await chrome.storage.local.set({ blacklistedCompanies: list });
  }
  async function addBlacklistedCompany(name) {
    const list = await getBlacklistedCompanies();
    if (!list.includes(name)) {
      list.push(name);
      await setBlacklistedCompanies(list);
    }
  }
  async function removeBlacklistedCompany(name) {
    const list = await getBlacklistedCompanies();
    const filtered = list.filter((n) => n !== name);
    await setBlacklistedCompanies(filtered);
  }
  var init_storage_queue = __esm({
    "src/lib/storage-queue.js"() {
    }
  });

  // src/lib/storage.js
  var init_storage = __esm({
    "src/lib/storage.js"() {
      init_storage_settings();
      init_storage_queue();
    }
  });

  // src/lib/rate-limiter.js
  var rateLimiter, rate_limiter_default;
  var init_rate_limiter = __esm({
    "src/lib/rate-limiter.js"() {
      init_storage();
      rateLimiter = {
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
      rate_limiter_default = rateLimiter;
    }
  });

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
  function gaussianDelay(minMs, maxMs) {
    minMs = minMs || 2e3;
    maxMs = maxMs || 5e3;
    const mean = (minMs + maxMs) / 2;
    const stddev = (maxMs - minMs) / 4;
    const delay = Math.max(minMs, gaussianRandom(mean / 1e3, stddev / 1e3) * 1e3);
    return new Promise((r) => setTimeout(r, delay));
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
  var init_timing = __esm({
    "src/lib/timing.js"() {
    }
  });

  // src/engine/apply-queue.js
  async function getQueue() {
    return getApplyQueue();
  }
  async function setQueue(queue) {
    await setApplyQueue(queue);
  }
  async function dequeueNext() {
    const queue = await getApplyQueue();
    if (queue.length === 0) return null;
    const next = queue[0];
    await setApplyQueue(queue.slice(1));
    return next;
  }
  async function clearQueue() {
    await setApplyQueue([]);
  }
  async function processNextInQueue() {
    const queue = await getApplyQueue();
    if (queue.length === 0) {
      autoLog.info("Queue empty \u2014 mass apply complete");
      return;
    }
    autoLog.info("Queue has " + queue.length + " more vacancies");
    const rateCheck = await rate_limiter_default.check();
    if (!rateCheck.allowed) {
      autoLog.warn("Rate limit hit: " + rateCheck.reason + ". Queue preserved for later.");
      return;
    }
    await simulateReading();
    const next = await dequeueNext();
    if (!next) return;
    const age = Date.now() - (next.timestamp || 0);
    if (age > QUEUE_ITEM_MAX_AGE) {
      autoLog.warn("Queue item too old, skipping");
      await processNextInQueue();
      return;
    }
    autoLog.info("Processing next: vacancy " + next.vacancyId);
    const url = "https://hh.ru/vacancy/" + next.vacancyId;
    window.location.href = url;
  }
  var autoLog, QUEUE_ITEM_MAX_AGE;
  var init_apply_queue = __esm({
    "src/engine/apply-queue.js"() {
      init_anti_hallucination();
      init_rate_limiter();
      init_timing();
      init_storage();
      autoLog = createLogger("AutoRespond");
      QUEUE_ITEM_MAX_AGE = 6e5;
    }
  });

  // src/lib/selectors.js
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
  var HH_SELECTORS;
  var init_selectors = __esm({
    "src/lib/selectors.js"() {
      HH_SELECTORS = {
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
    }
  });

  // src/engine/apply-actions.js
  async function waitForPageReady() {
    for (let i = 0; i < 30; i++) {
      const title = findElement("vacancyTitleOnPage");
      if (title) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    autoLog2.warn("Timeout waiting for vacancy title, proceeding anyway");
  }
  async function clickApplyButton() {
    const alreadyApplied = findElement("alreadyApplied");
    if (alreadyApplied) {
      return { clicked: false, reason: "\u0412\u044B \u0443\u0436\u0435 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u043B\u0438\u0441\u044C" };
    }
    const vacancyBody = document.querySelector('[data-qa="vacancy-description"]');
    if (!vacancyBody && document.body.textContent.includes("\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430")) {
      return { clicked: false, reason: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430/\u0443\u0434\u0430\u043B\u0435\u043D\u0430" };
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const sel of APPLY_BUTTON_SELECTORS) {
        try {
          const el = document.querySelector(sel);
          if (!el) continue;
          if (!document.body.contains(el)) continue;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          autoLog2.info("Found apply button: " + sel + " (attempt " + (attempt + 1) + ")");
          await randomDelay();
          el.click();
          autoLog2.info("Clicked apply button");
          return { clicked: true };
        } catch (e) {
        }
      }
      if (attempt < 2) {
        autoLog2.info("Apply button not found, retrying in 1s...");
        await new Promise((r) => setTimeout(r, 1e3));
      }
    }
    const allLinks = document.querySelectorAll("a, button");
    for (const el of allLinks) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === "\u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F" || text === "\u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E") {
        autoLog2.info('Found apply button via text search: "' + text + '"');
        await randomDelay();
        el.click();
        return { clicked: true };
      }
    }
    autoLog2.warn("No apply button found. URL: " + window.location.href);
    const bodySnippet = document.body?.innerText?.substring(0, 500) || "empty";
    autoLog2.warn("Page snippet: " + bodySnippet);
    return { clicked: false, reason: '\u041A\u043D\u043E\u043F\u043A\u0430 "\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435' };
  }
  async function waitForPopupAndSubmit() {
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500));
      for (const sel of POPUP_SUBMIT_SELECTORS) {
        try {
          const btn = document.querySelector(sel);
          if (!btn) continue;
          if (!document.body.contains(btn)) continue;
          const style = window.getComputedStyle(btn);
          if (style.display === "none" || style.visibility === "hidden") continue;
          autoLog2.info("Found submit button in popup: " + sel);
          const letterInput = findElement("coverLetterInput");
          if (letterInput) {
            autoLog2.info("Cover letter input found (skipping \u2014 empty letter)");
          }
          const relocationBtn = findElement("relocationConfirm");
          if (relocationBtn) {
            autoLog2.info("Confirming relocation warning...");
            relocationBtn.click();
            await new Promise((r) => setTimeout(r, 500));
          }
          await randomDelay();
          btn.click();
          autoLog2.info("Clicked submit button");
          return { success: true };
        } catch (e) {
        }
      }
    }
    const alreadyEl = findElement("alreadyApplied");
    if (alreadyEl) {
      autoLog2.info("Popup not needed \u2014 already applied indicator found");
      return { success: true };
    }
    autoLog2.warn("Popup/submit button not found after 8s");
    return { success: false, reason: "\u041F\u043E\u043F\u0430\u043F \u043D\u0435 \u043F\u043E\u044F\u0432\u0438\u043B\u0441\u044F \u0438\u043B\u0438 \u043A\u043D\u043E\u043F\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" };
  }
  var autoLog2, APPLY_BUTTON_SELECTORS, POPUP_SUBMIT_SELECTORS;
  var init_apply_actions = __esm({
    "src/engine/apply-actions.js"() {
      init_anti_hallucination();
      init_selectors();
      init_timing();
      autoLog2 = createLogger("AutoRespond");
      APPLY_BUTTON_SELECTORS = [
        '[data-qa="vacancy-response-apply"]',
        '[data-qa="vacancy-response-link-top"]',
        'a[data-qa="vacancy-response-apply"]',
        'button[data-qa="vacancy-response-apply"]',
        'a[href*="/vacancy/response"]',
        ".vacancy-response-btn",
        '[class*="vacancy-response"] button',
        '[class*="vacancy-response"] a'
      ];
      POPUP_SUBMIT_SELECTORS = [
        '[data-qa="vacancy-response-submit-popup"]',
        '[data-qa="vacancy-response-popup-submit"]',
        'button[data-qa="vacancy-response-submit-popup"]',
        '[class*="response-popup"] button[type="submit"]',
        '[class*="response-popup"] [data-qa*="submit"]'
      ];
    }
  });

  // src/engine/apply-orchestrator.js
  async function applyToVacancy(vacancyId) {
    autoLog3.info("Apply to vacancy: " + vacancyId);
    const rateCheck = await rate_limiter_default.check();
    if (!rateCheck.allowed) {
      autoLog3.warn(rateCheck.reason);
      return { success: false, reason: rateCheck.reason };
    }
    if (await isAlreadyApplied(vacancyId)) return { success: false, reason: "\u0423\u0436\u0435 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u043B\u0441\u044F" };
    const queue = await getQueue();
    if (!queue.find((q) => q.vacancyId === vacancyId)) {
      queue.push({ vacancyId, timestamp: Date.now() });
      await setQueue(queue);
    }
    const url = "https://hh.ru/vacancy/" + vacancyId;
    autoLog3.info("Navigating to: " + url);
    window.location.href = url;
    return { success: false, reason: "\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438..." };
  }
  async function continueApply(pending) {
    autoLog3.info("Continue apply on vacancy page: " + pending.vacancyId);
    const expectedPath = "/vacancy/" + pending.vacancyId;
    const actualPath = window.location.pathname;
    if (!actualPath.includes(pending.vacancyId)) {
      autoLog3.warn("Wrong page: expected " + expectedPath + " got " + actualPath);
      return { success: false, reason: "\u041D\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438" };
    }
    await waitForPageReady();
    autoLog3.info("Page ready, looking for apply button...");
    const applyResult = await clickApplyButton();
    if (!applyResult.clicked) {
      autoLog3.error("Could not find/click apply button: " + applyResult.reason);
      await markAsApplied(pending.vacancyId);
      return { success: false, reason: applyResult.reason };
    }
    autoLog3.info("Apply button clicked, waiting for popup...");
    const popupResult = await waitForPopupAndSubmit();
    if (!popupResult.success) {
      autoLog3.warn("Popup handling: " + popupResult.reason);
      await markAsApplied(pending.vacancyId);
      rate_limiter_default.recordAction();
      return { success: true, reason: "\u041A\u043B\u0438\u043A \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D (\u043F\u043E\u043F\u0430\u043F \u043D\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D)" };
    }
    rate_limiter_default.recordAction();
    await incrementApplied();
    await markAsApplied(pending.vacancyId);
    autoLog3.info("Successfully applied to vacancy " + pending.vacancyId);
    await processNextInQueue();
    return { success: true };
  }
  async function applyToAll(vacancies, minScore) {
    minScore = minScore || 70;
    const eligible = vacancies.filter((v) => v.status === "new" && v.hasReply).filter((v) => v.matchScore === null || v.matchScore >= minScore).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    if (eligible.length === 0) {
      autoLog3.info("No eligible vacancies for mass apply");
      return { processed: 0, reason: "\u041D\u0435\u0442 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439" };
    }
    autoLog3.info("Mass apply: " + eligible.length + " vacancies (score >= " + minScore + ")");
    const queue = [];
    for (const v of eligible) {
      if (!await isAlreadyApplied(v.id)) {
        queue.push({ vacancyId: v.id, timestamp: Date.now() });
      }
    }
    if (queue.length === 0) {
      return { processed: 0, reason: "\u0412\u0441\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0443\u0436\u0435 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438/\u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044B" };
    }
    await setQueue(queue);
    autoLog3.info("Queue set: " + queue.length + " vacancies");
    const first = queue[0];
    const rateCheck = await rate_limiter_default.check();
    if (!rateCheck.allowed) {
      autoLog3.warn("Rate limit: " + rateCheck.reason);
      return { processed: 0, reason: rateCheck.reason };
    }
    const url = "https://hh.ru/vacancy/" + first.vacancyId;
    autoLog3.info("Starting mass apply, navigating to: " + url);
    window.location.href = url;
    return { processed: 0, reason: "\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043D\u0430 \u043F\u0435\u0440\u0432\u0443\u044E \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E (\u043E\u0447\u0435\u0440\u0435\u0434\u044C: " + queue.length + ")" };
  }
  var autoLog3;
  var init_apply_orchestrator = __esm({
    "src/engine/apply-orchestrator.js"() {
      init_anti_hallucination();
      init_rate_limiter();
      init_storage();
      init_apply_queue();
      init_apply_actions();
      autoLog3 = createLogger("AutoRespond");
    }
  });

  // src/engine/index.js
  var engine_exports = {};
  __export(engine_exports, {
    applyToAll: () => applyToAll,
    applyToVacancy: () => applyToVacancy,
    clearQueue: () => clearQueue,
    clickApplyButton: () => clickApplyButton,
    continueApply: () => continueApply,
    dequeueNext: () => dequeueNext,
    getQueue: () => getQueue,
    setQueue: () => setQueue,
    waitForPageReady: () => waitForPageReady,
    waitForPopupAndSubmit: () => waitForPopupAndSubmit
  });
  var init_engine = __esm({
    "src/engine/index.js"() {
      init_apply_orchestrator();
      init_apply_queue();
      init_apply_actions();
    }
  });

  // src/parsers/vacancy-list.js
  async function parseVacanciesFromPage() {
    const cards = findAllElements("vacancyCard");
    parserLog.info("Found " + cards.length + " vacancy cards");
    if (cards.length === 0) return [];
    const vacancies = [];
    let appliedIds = [], blacklisted = [];
    try {
      appliedIds = await getAppliedVacancies();
      blacklisted = await getBlacklistedCompanies();
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
  var parserLog;
  var init_vacancy_list = __esm({
    "src/parsers/vacancy-list.js"() {
      init_selectors();
      init_anti_hallucination();
      init_storage();
      parserLog = createLogger("Parser");
    }
  });

  // src/parsers/resume-detail/parse-company-card.js
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
  var init_parse_company_card = __esm({
    "src/parsers/resume-detail/parse-company-card.js"() {
    }
  });

  // src/parsers/resume-detail/parse-resume-sections.js
  function parseSkills(dbg, resume) {
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
  }
  function parseExperience(dbg, resume) {
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
    const expEntries = [];
    const usedStepperElements = /* @__PURE__ */ new Set();
    uniqueCards.forEach((card) => {
      const job = parseCompanyCard(card);
      if (job) expEntries.push(job);
      const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
      if (stepEl) usedStepperElements.add(stepEl);
    });
    if (expCard) {
      const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      const alreadyParsed = expEntries.length;
      stepperItems.forEach((step) => {
        if (usedStepperElements.has(step)) return;
        let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
        if (parentCard && cardSet.has(parentCard)) return;
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
        if (texts.length >= 2) {
          let rawPeriod = (texts[1].textContent || "").trim();
          rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, "").trim();
          job.period = rawPeriod;
        }
        const parent = step.parentElement;
        if (parent) {
          const parentCellLeft = parent.querySelector('[data-qa="cell-left-side"]');
          if (parentCellLeft && parentCellLeft !== cellLeft) {
            const parentTexts = parentCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
            if (parentTexts.length >= 1 && !job.company) job.company = (parentTexts[0].textContent || "").trim();
            if (parentTexts.length >= 2 && !job.duration) job.duration = (parentTexts[1].textContent || "").trim();
          }
        }
        if (job.position || job.company) expEntries.push(job);
      });
      const stepperAdded = expEntries.length - alreadyParsed;
      if (stepperAdded > 0) {
        resumeLog.info("Experience: +" + stepperAdded + " from stepper items not in company-cards");
        resume._debug.found.push("experience (stepper supplement): +" + stepperAdded);
      }
    }
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
  }
  function parseLanguagesAndAbout(dbg, resume) {
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
  }
  var resumeLog;
  var init_parse_resume_sections = __esm({
    "src/parsers/resume-detail/parse-resume-sections.js"() {
      init_anti_hallucination();
      init_parse_company_card();
      resumeLog = createLogger("Resume");
    }
  });

  // src/parsers/resume-detail/parse-resume-personal.js
  function parsePersonalData(titleEl, dbg, resume) {
    const personalText = [];
    const nameEl = document.querySelector('[data-qa="resume-personal-name"]');
    if (nameEl) {
      const nameText = (nameEl.textContent || "").trim();
      if (nameText && nameText.length > 1 && nameText.length < 100) {
        resume.name = dbg("resumeName (data-qa)", nameText);
      }
    }
    if (!resume.name) {
      const posCard2 = document.querySelector('[data-qa="resume-position-card"]');
      if (posCard2) {
        const candidates = posCard2.querySelectorAll("span, div, p, h1, h2, h3");
        for (const el of candidates) {
          const t = (el.textContent || "").trim();
          if (t && t.length > 2 && t.length < 80 && t !== resume.title && t !== resume.salary && /^[А-ЯЁ][а-яё]+ [А-ЯЁ]/.test(t) && !/\d/.test(t)) {
            resume.name = dbg("resumeName (fallback)", t);
            break;
          }
        }
      }
    }
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
    const genderPatterns = [/(?:^|\s)(мужчина|женщина|мужской|женский|male|female)(?:$|\s)/i];
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
        const isName = resume.name && t === resume.name;
        if (!isGender && !isAge && !isName && !t.includes("\u0440\u0443\u0431") && !t.includes("USD") && !t.includes("\u0437/\u043F") && !t.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C") && !t.includes("\u0434\u043E\u0445\u043E\u0434") && t !== resume.salary && t !== resume.title) {
          if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
            resume.address = dbg("resumeAddress", t);
          }
        }
      }
    }
  }
  var resumeLog2;
  var init_parse_resume_personal = __esm({
    "src/parsers/resume-detail/parse-resume-personal.js"() {
      init_anti_hallucination();
      resumeLog2 = createLogger("Resume");
    }
  });

  // src/parsers/resume-detail/parse-resume-conditions.js
  function parseSalaryConditions(dbg, resume) {
    const posCard = document.querySelector('[data-qa="resume-position-card"]');
    if (!posCard) {
      resume._debug.missing.push("salaryConditions (no position-card)");
      return;
    }
    const texts = [];
    posCard.querySelectorAll("span, p, div").forEach((el) => {
      if (el.children.length > 5) return;
      const t = (el.textContent || "").trim();
      if (t && t.length > 2 && t.length < 100) texts.push(t);
    });
    const empPatterns = [
      /(?:^|\s)(Полная занятость|Постоянная работа)(?:$|[,;\s])/i,
      /(?:^|\s)(Частичная занятость)(?:$|[,;\s])/i,
      /(?:^|\s)(Проектная работа)(?:$|[,;\s])/i,
      /(?:^|\s)(Стажировка)(?:$|[,;\s])/i,
      /(?:^|\s)(Волонтёрство)(?:$|[,;\s])/i
    ];
    const fmtPatterns = [
      /(?:^|\s)(На месте работодателя|Офис|В офисе)(?:$|[,;\s])/i,
      /(?:^|\s)(Удал[а-яё]+(?: работа)?|Удалённо)(?:$|[,;\s])/i,
      /(?:^|\s)(Гибрид|Смешанный формат)(?:$|[,;\s])/i
    ];
    const schedPatterns = [
      /(?:^|\s)(Гибкий график)(?:$|[,;\s])/i,
      /(?:^|\s)(Полный день)(?:$|[,;\s])/i,
      /(?:^|\s)(Сменный график)(?:$|[,;\s])/i,
      /(?:^|\s)(Вахтовый метод)(?:$|[,;\s])/i
    ];
    const relocPatterns = [
      /(?:^|\s)(Не готов к переезду)(?:$|[,;\s])/i,
      /(?:^|\s)(Готов к переезду)(?:$|[,;\s])/i,
      /(?:^|\s)(Хочу переехать)(?:$|[,;\s])/i
    ];
    for (const t of texts) {
      if (!resume.employmentType) {
        for (const p of empPatterns) {
          const m = t.match(p);
          if (m) {
            resume.employmentType = dbg("employmentType", m[1]);
            break;
          }
        }
      }
      if (!resume.workFormat) {
        const fmtMatches = [];
        for (const p of fmtPatterns) {
          const m = t.match(p);
          if (m) fmtMatches.push(m[1]);
        }
        if (fmtMatches.length > 0) {
          resume.workFormat = dbg("workFormat", fmtMatches.join(", "));
        }
      }
      if (!resume.schedule) {
        for (const p of schedPatterns) {
          const m = t.match(p);
          if (m) {
            resume.schedule = dbg("schedule", m[1]);
            break;
          }
        }
      }
      if (!resume.relocation) {
        for (const p of relocPatterns) {
          const m = t.match(p);
          if (m) {
            resume.relocation = dbg("relocation", m[1]);
            break;
          }
        }
      }
    }
  }
  var init_parse_resume_conditions = __esm({
    "src/parsers/resume-detail/parse-resume-conditions.js"() {
    }
  });

  // src/parsers/resume-detail/parse-resume-contacts.js
  function parseContacts(dbg, resume) {
    const phoneSelectors = [
      '[data-qa="resume-contact-phone"] a',
      '[data-qa="resume-contact-phone"]',
      '[data-qa*="contact-phone"] a',
      '[data-qa*="contact-phone"]'
    ];
    for (const sel of phoneSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const href = el.getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          resume.phone = dbg("phone (tel:)", href.replace("tel:", "").trim());
          break;
        }
        const text = (el.textContent || "").trim();
        const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
        if (phoneMatch) {
          resume.phone = dbg("phone (data-qa regex)", phoneMatch[0]);
          break;
        }
      }
    }
    if (!resume.phone) {
      const contactBlock2 = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const telLinks = contactBlock2.querySelectorAll('a[href^="tel:"]');
        if (telLinks.length > 0) {
          resume.phone = dbg("phone (tel link)", telLinks[0].getAttribute("href").replace("tel:", "").trim());
        }
      }
    }
    if (!resume.phone) {
      const contactBlock2 = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const text = contactBlock2.textContent || "";
        const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
        if (phoneMatch) resume.phone = dbg("phone (regex)", phoneMatch[0]);
      }
    }
    const mailtoLink = document.querySelector('a[href^="mailto:"]');
    if (mailtoLink) {
      const href = mailtoLink.getAttribute("href") || "";
      const email = href.replace("mailto:", "").split("?")[0].trim();
      if (email && email.includes("@")) resume.email = dbg("email (mailto)", email);
    }
    if (!resume.email) {
      const emailSelectors = [
        '[data-qa="resume-contact-email"] a',
        '[data-qa="resume-contact-email"]'
      ];
      for (const sel of emailSelectors) {
        const el = document.querySelector(sel);
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
          const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            resume.email = dbg("email (regex from data-qa)", emailMatch[0]);
            break;
          }
        }
      }
    }
    if (!resume.email) {
      const contactBlock2 = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const text = contactBlock2.textContent || "";
        const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) resume.email = dbg("email (regex)", emailMatch[0]);
      }
    }
    const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
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
  var HH_SYSTEM_ACCOUNTS;
  var init_parse_resume_contacts = __esm({
    "src/parsers/resume-detail/parse-resume-contacts.js"() {
      HH_SYSTEM_ACCOUNTS = ["hh_ru_official", "hhru", "hh_ru", "hhcareers", "headhunter_ru"];
    }
  });

  // src/parsers/resume-detail/parse-resume-education.js
  function parseEducation(dbg, resume) {
    const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
    if (!eduCard) {
      resume._debug.missing.push('educationBlock (no data-qa="resume-list-card-education")');
      return;
    }
    resume._debug.found.push('educationBlock (data-qa="resume-list-card-education")');
    const eduEntries = [];
    const eduUiTexts = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;
    const eduCells = eduCard.querySelectorAll('[data-qa="cell-left-side"]');
    resumeLog3.info("Education: found " + eduCells.length + " cell-left-side elements");
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
        } else if (!edu.degree && /^(Бакалавр|Магистр|Специалист|Кандидат наук|Доктор наук|Аспирант|Среднее|Высшее)/i.test(t)) {
          edu.degree = t;
        } else if (!edu.year && /\d{4}/.test(t)) {
          edu.year = t.match(/\d{4}/)?.[0] || t;
        }
      });
      if (edu.name && !eduUiTexts.test(edu.name) && edu.name.length > 3) {
        eduEntries.push(edu);
      }
    });
    if (eduEntries.length === 0) {
      resumeLog3.info("Education: fallback to direct children of eduCard");
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
      resumeLog3.info("Education: fallback to full text scan");
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
  }
  var resumeLog3;
  var init_parse_resume_education = __esm({
    "src/parsers/resume-detail/parse-resume-education.js"() {
      init_anti_hallucination();
      resumeLog3 = createLogger("Resume");
    }
  });

  // src/lib/resume-constants-core.js
  function normalizeWs(text) {
    if (!text) return "";
    return text.replace(/[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, " ").trim();
  }
  function hasVisibleIndicator(text) {
    if (!text) return false;
    const lower = normalizeWs(text).toLowerCase();
    return VISIBLE_INDICATORS.some((ind) => lower.includes(ind));
  }
  function hasHiddenIndicator(text) {
    if (!text) return false;
    const lower = normalizeWs(text).toLowerCase();
    return HIDDEN_INDICATORS.some((ind) => lower.includes(ind));
  }
  function stripScripts(html) {
    if (!html) return "";
    return html.replace(/<script[\s\S]*?<\/script>/gi, "");
  }
  function findCardForLink(linkEl) {
    if (!linkEl) return null;
    let el = linkEl;
    for (let i = 0; i < 8; i++) {
      if (!el || el === document.body || el === document.documentElement) break;
      for (const sel of RESUME_CARD_SELECTORS) {
        if (el.matches && el.matches(sel)) return el;
      }
      el = el.parentElement;
    }
    el = linkEl;
    for (let i = 0; i < 8; i++) {
      if (!el || el === document.body || el === document.documentElement) break;
      const parent = el.parentElement;
      if (parent) {
        const textLen = (parent.textContent || "").length;
        if (textLen > 200) return parent;
      }
      el = parent;
    }
    return null;
  }
  var coreLog, MIN_HASH_LEN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN, HIDDEN_INDICATORS, VISIBLE_INDICATORS, RESUME_CARD_SELECTORS, VISIBILITY_HIDDEN_DATA_QA;
  var init_resume_constants_core = __esm({
    "src/lib/resume-constants-core.js"() {
      init_anti_hallucination();
      coreLog = createLogger("ResumeConst");
      MIN_HASH_LEN = 30;
      VISIBILITY_VISIBLE = "visible";
      VISIBILITY_HIDDEN = "hidden";
      VISIBILITY_UNKNOWN = "unknown";
      HIDDEN_INDICATORS = ["\u043C\u043D\u043E\u0433\u0438\u0435 \u043D\u0435 \u0432\u0438\u0434\u044F\u0442", "\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C", "\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443", "\u043D\u0435 \u0432\u0438\u0434\u043D\u043E"];
      VISIBLE_INDICATORS = ["\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C", "\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C"];
      RESUME_CARD_SELECTORS = [
        '[data-qa="resume-list-item"]',
        '[data-qa="resume-list-item-wrap"]',
        '[data-qa="resume-list-item-wrapper"]',
        '[data-qa*="resume-list-item"]',
        '[data-qa*="resume-card"]'
      ];
      VISIBILITY_HIDDEN_DATA_QA = [
        '[data-qa="resume-status-hidden"]',
        '[data-qa="resume-hidden-message"]',
        '[data-qa="resume-make-visible"]',
        '[data-qa*="resume-hidden"]',
        '[data-qa*="resume-status-hidden"]',
        '[data-qa*="make-visible"]'
      ];
    }
  });

  // src/lib/resume-constants-title.js
  function cleanResumeTitle(rawText, fallback) {
    fallback = fallback || "Untitled";
    if (!rawText) return fallback;
    let text = normalizeWs(rawText);
    for (const pattern of LINE_BREAK_INJECTORS) {
      pattern.lastIndex = 0;
      text = text.replace(pattern, "\n$&");
    }
    const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 2);
    let title = lines.find((l) => !UI_NOISE.test(l)) || "";
    title = title.replace(TITLE_SUFFIX_NOISE, "").trim();
    return title || fallback;
  }
  var UI_NOISE, TITLE_SUFFIX_NOISE, LINE_BREAK_INJECTORS;
  var init_resume_constants_title = __esm({
    "src/lib/resume-constants-title.js"() {
      init_resume_constants_core();
      UI_NOISE = /^(сделать видимым|скрыть|обновить|поднять|продлить|дублировать|удалить|перейти к вакансиям|перейти|постоянная работа|многие не видят|копировать|редактировать|частичная занятость|проектная работа|стажировка|волонтёрство)/i;
      TITLE_SUFFIX_NOISE = /\s*(Постоянная работа|Частичная занятость|Проектная работа|Стажировка|Волонтёрство)\s*$/i;
      LINE_BREAK_INJECTORS = [
        /Многие\s+не\s+видят[^\n]*/gi,
        /Сделать\s+видимым/gi,
        /Постоянная\s+работа/gi,
        /Частичная\s+занятость/gi,
        /Проектная\s+работа/gi,
        /Стажировка/gi,
        /Волонтёрство/gi,
        /Перейти\s+к\s+вакансиям/gi
      ];
    }
  });

  // src/lib/resume-constants-visibility.js
  function detectVisibilityFromLinkText(linkText) {
    if (!linkText) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: "no-link-text" };
    const isHidden = hasHiddenIndicator(linkText);
    if (isHidden) return { visibility: VISIBILITY_HIDDEN, hidden: true, method: "link-text" };
    return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: "link-text-no-indicator" };
  }
  function detectVisibilityFromCardText(cardText) {
    if (!cardText) return VISIBILITY_UNKNOWN;
    if (hasHiddenIndicator(cardText)) return VISIBILITY_HIDDEN;
    if (hasVisibleIndicator(cardText)) return VISIBILITY_VISIBLE;
    return VISIBILITY_UNKNOWN;
  }
  function detectVisibilityFromCard(cardEl) {
    if (!cardEl) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: "no-card" };
    for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
      const found = cardEl.querySelector(sel);
      if (found) return { visibility: VISIBILITY_HIDDEN, hidden: true, method: "data-qa:" + sel };
    }
    if (hasHiddenIndicator(cardEl.textContent || "")) {
      return { visibility: VISIBILITY_HIDDEN, hidden: true, method: "text-indicator" };
    }
    if (hasVisibleIndicator(cardEl.textContent || "")) {
      return { visibility: VISIBILITY_VISIBLE, hidden: false, method: "text-visible-indicator" };
    }
    return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: "card-no-indicators" };
  }
  var init_resume_constants_visibility = __esm({
    "src/lib/resume-constants-visibility.js"() {
      init_resume_constants_core();
    }
  });

  // src/lib/resume-constants.js
  var init_resume_constants = __esm({
    "src/lib/resume-constants.js"() {
      init_resume_constants_core();
      init_resume_constants_title();
      init_resume_constants_visibility();
    }
  });

  // src/parsers/resume-detail/parse-resume.js
  var parse_resume_exports = {};
  __export(parse_resume_exports, {
    parseResume: () => parseResume
  });
  function parseResume() {
    const t0 = performance.now();
    const resume = {
      id: "",
      url: window.location.href,
      name: "",
      title: "",
      salary: "",
      gender: "",
      age: "",
      address: "",
      employmentType: "",
      workFormat: "",
      schedule: "",
      relocation: "",
      phone: "",
      email: "",
      telegram: "",
      specializations: [],
      skills: [],
      skillLevels: {},
      experience: [],
      education: [],
      languages: [],
      additionalInfo: "",
      parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
      visibility: VISIBILITY_UNKNOWN,
      hidden: false,
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
    if (resume.title) {
      resume.title = resume.title.replace(TITLE_SUFFIX_NOISE, "").trim();
    }
    const salaryEl = document.querySelector('[data-qa="resume-block-salary"]');
    if (salaryEl) {
      resume.salary = dbg("resumeSalary (data-qa)", safeGetText(salaryEl));
    }
    parsePersonalData(titleEl, dbg, resume);
    parseSalaryConditions(dbg, resume);
    parseSkills(dbg, resume);
    parseExperience(dbg, resume);
    parseEducation(dbg, resume);
    parseLanguagesAndAbout(dbg, resume);
    parseContacts(dbg, resume);
    const visCard = document.querySelector('[data-qa="resume-visibility-card"]');
    if (visCard) {
      const cardText = normalizeWs(visCard.textContent || "").toLowerCase();
      if (cardText.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443") || cardText.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443")) {
        resume.visibility = VISIBILITY_HIDDEN;
        resume.hidden = true;
      } else if (cardText.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C") || cardText.includes("\u0432\u0438\u0434\u043D\u043E\xA0\u0432\u0441\u0435\u043C")) {
        resume.visibility = VISIBILITY_VISIBLE;
        resume.hidden = false;
      } else {
        resumeLog4.info('Unknown visibility card text: "' + cardText.substring(0, 80) + '"');
      }
    }
    if (resume.visibility === VISIBILITY_UNKNOWN) {
      const hiddenMsg = document.querySelector('[data-qa="resume-hidden-message"], [data-qa*="resume-hidden"], [data-qa="resume-make-visible"], [data-qa*="make-visible"]');
      if (hiddenMsg) {
        resume.visibility = VISIBILITY_HIDDEN;
        resume.hidden = true;
      } else if (hasHiddenIndicator(document.body ? document.body.textContent : "")) {
        resume.visibility = VISIBILITY_HIDDEN;
        resume.hidden = true;
      } else {
        const allBtns = document.querySelectorAll('button, a, [role="button"]');
        let foundMakeVisible = false;
        let foundHideResume = false;
        for (const btn of allBtns) {
          const text = normalizeWs(btn.textContent || "").toLowerCase();
          const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
          if (text.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C") || qa.includes("make-visible") || qa.includes("show-resume")) {
            foundMakeVisible = true;
            break;
          }
          if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435") || qa.includes("hide-resume") || qa.includes("resume-action-hide")) {
            foundHideResume = true;
            break;
          }
        }
        if (foundMakeVisible) {
          resume.visibility = VISIBILITY_HIDDEN;
          resume.hidden = true;
        } else if (foundHideResume) {
          resume.visibility = VISIBILITY_VISIBLE;
          resume.hidden = false;
        } else {
          const bodyText = normalizeWs(document.body ? document.body.textContent : "").toLowerCase();
          if (bodyText.includes("\u043D\u0435 \u0432\u0438\u0434\u044F\u0442") || bodyText.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E")) {
            resume.visibility = VISIBILITY_HIDDEN;
            resume.hidden = true;
          } else {
            resume.visibility = VISIBILITY_VISIBLE;
            resume.hidden = false;
          }
        }
      }
    }
    const elapsed = (performance.now() - t0).toFixed(1);
    resumeLog4.info("Resume parsed in " + elapsed + "ms");
    resumeLog4.info("Found: " + resume._debug.found.length + " | Missing: " + resume._debug.missing.length);
    resumeLog4.info("Skills: " + resume.skills.length + " | Experience: " + resume.experience.length + " | Education: " + resume.education.length);
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
  var resumeLog4;
  var init_parse_resume = __esm({
    "src/parsers/resume-detail/parse-resume.js"() {
      init_anti_hallucination();
      init_parse_resume_sections();
      init_parse_resume_personal();
      init_parse_resume_conditions();
      init_parse_resume_contacts();
      init_parse_resume_education();
      init_resume_constants();
      resumeLog4 = createLogger("Resume");
    }
  });

  // src/parsers/resume-detail/diagnose-elements.js
  function scanDataQaElements() {
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
  }
  function scanResumeBlocks() {
    console.group('%c[HH-AR][DIAG] Resume blocks (.resume-block, [data-qa*="resume"]):', "color:#2964FF");
    const resumeBlocks = document.querySelectorAll('[data-qa*="resume"], .resume-block, [class*="resume"]');
    resumeBlocks.forEach((block, i) => {
      const qa = block.getAttribute("data-qa") || "(no data-qa)";
      const cls = (block.className || "").toString().substring(0, 100);
      const text = (block.textContent || "").trim().substring(0, 120);
      console.log("  Block #" + i + ":", { qa, cls, text });
    });
    console.groupEnd();
  }
  function scanTags() {
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
  }
  var diagLog;
  var init_diagnose_elements = __esm({
    "src/parsers/resume-detail/diagnose-elements.js"() {
      init_anti_hallucination();
      diagLog = createLogger("DIAG");
    }
  });

  // src/parsers/resume-detail/diagnose-structure.js
  function checkSelectors() {
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
  }
  function scanHeadings() {
    console.group("%c[HH-AR][DIAG] Headings (h1-h3):", "color:#2964FF");
    document.querySelectorAll("h1, h2, h3").forEach((h) => {
      console.log("  " + h.tagName + ":", (h.textContent || "").trim().substring(0, 100), "| data-qa:", h.getAttribute("data-qa") || "(none)");
    });
    console.groupEnd();
  }
  function scanSections() {
    console.group('%c[HH-AR][DIAG] Page sections (section, [data-qa*="block"]):', "color:#2964FF");
    const sections = document.querySelectorAll('section, [data-qa*="block"], .bloko-column');
    sections.forEach((s, i) => {
      const qa = s.getAttribute("data-qa") || "(none)";
      const heading = s.querySelector('h2, h3, [data-qa*="title"]');
      const headingText = heading ? (heading.textContent || "").trim().substring(0, 80) : "(no heading)";
      console.log("  Section #" + i + ":", qa, "| heading:", headingText);
    });
    console.groupEnd();
  }
  var init_diagnose_structure = __esm({
    "src/parsers/resume-detail/diagnose-structure.js"() {
      init_selectors();
    }
  });

  // src/parsers/resume-detail/diagnose-blocks.js
  function dumpExperienceBlock() {
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
  }
  function dumpEducationBlock() {
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
  }
  var init_diagnose_blocks = __esm({
    "src/parsers/resume-detail/diagnose-blocks.js"() {
    }
  });

  // src/parsers/resume-detail/diagnose.js
  function diagnoseResumeDOM() {
    console.log("%c[HH-AR][DIAG] \u2550\u2550\u2550 DOM DIAGNOSTIC DUMP \u2550\u2550\u2550", "color:#2964FF;font-weight:bold;font-size:14px");
    console.log("[HH-AR][DIAG] URL:", window.location.href);
    console.log("[HH-AR][DIAG] Page type:", getResumePageType());
    scanDataQaElements();
    scanResumeBlocks();
    scanTags();
    checkSelectors();
    scanHeadings();
    scanSections();
    dumpExperienceBlock();
    dumpEducationBlock();
    console.log("%c[HH-AR][DIAG] \u2550\u2550\u2550 END DUMP \u2550\u2550\u2550", "color:#2964FF;font-weight:bold");
    console.log("%c[HH-AR][DIAG] \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0412\u0415\u0421\u042C \u0432\u044B\u0432\u043E\u0434 \u0438\u0437 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C \u043C\u043D\u0435.", "color:#ef4444;font-size:13px");
  }
  var init_diagnose = __esm({
    "src/parsers/resume-detail/diagnose.js"() {
      init_resume_detail();
      init_diagnose_elements();
      init_diagnose_structure();
      init_diagnose_blocks();
    }
  });

  // src/parsers/resume-detail/resume-detail-list-parser.js
  function parseResumeList() {
    const resumes = [];
    const links = document.querySelectorAll("a[href]");
    const seen = /* @__PURE__ */ new Set();
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
      if (!hashMatch) return;
      const id = hashMatch[1];
      if (id.length < MIN_HASH_LEN) return;
      if (seen.has(id)) return;
      seen.add(id);
      const rawLinkText = link.textContent || "";
      const title = cleanResumeTitle(rawLinkText, "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F");
      const vis = detectVisibilityFromLinkText(rawLinkText);
      resumes.push({ id, title, url: href.startsWith("http") ? href : "https://hh.ru" + href, visibility: vis.visibility, hidden: vis.hidden });
      resumeLog5.info("  Link: " + id.substring(0, 8) + '="' + title.substring(0, 30) + '"=' + vis.visibility + " (method=" + vis.method + ")");
    });
    const allDetected = resumes.every((r) => r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE);
    if (allDetected && resumes.length > 0) {
      resumeLog5.info("Strategy 0: all " + resumes.length + " resumes detected from link text");
    } else {
      const unknownResumes = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      resumeLog5.info("Strategy 0: " + (resumes.length - unknownResumes.length) + " detected, " + unknownResumes.length + " unknown \u2014 trying data-qa cards");
      let filled = 0;
      for (const sel of RESUME_CARD_SELECTORS) {
        const cards = document.querySelectorAll(sel);
        if (cards.length === 0) continue;
        resumeLog5.info("Strategy 1: Found " + cards.length + " cards with selector: " + sel);
        cards.forEach((card) => {
          const cardLink = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
          if (!cardLink) return;
          const cardHref = cardLink.getAttribute("href") || "";
          let cardHashMatch = cardHref.match(/\/resume\/([a-f0-9]+)/);
          if (!cardHashMatch) cardHashMatch = cardHref.match(/[?&]resume=([a-f0-9]+)/);
          if (!cardHashMatch) return;
          const cardId = cardHashMatch[1];
          const resume = resumes.find((r) => r.id === cardId);
          if (!resume || resume.visibility !== VISIBILITY_UNKNOWN) return;
          const result = detectVisibilityFromCard(card);
          resume.visibility = result.visibility;
          resume.hidden = result.hidden;
          filled++;
          resumeLog5.info("  Card: " + cardId.substring(0, 8) + "=" + result.visibility + " (method=" + result.method + ")");
        });
        if (filled > 0) break;
      }
      const stillUnknown2 = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      if (stillUnknown2.length > 0) {
        resumeLog5.info("Strategy 2: DOM walking for " + stillUnknown2.length + " unknown resumes");
        stillUnknown2.forEach((resume) => {
          const link = document.querySelector('a[href*="' + resume.id + '"]');
          if (!link) return;
          const card = findCardForLink(link);
          if (card) {
            const result = detectVisibilityFromCard(card);
            resume.visibility = result.visibility;
            resume.hidden = result.hidden;
            resumeLog5.info("  Walk: " + resume.id.substring(0, 8) + "=" + result.visibility + " (method=" + result.method + ")");
          }
        });
      }
      const finalUnknown = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      if (finalUnknown.length > 0) {
        resumeLog5.info("Strategy 3: proximity search for " + finalUnknown.length + " remaining unknowns");
        const pageHtml = stripScripts(document.body.innerHTML || "");
        const pageLower = pageHtml.toLowerCase();
        finalUnknown.forEach((resume) => {
          const hashPos = pageLower.indexOf(resume.id.toLowerCase());
          if (hashPos === -1) return;
          let searchEnd = hashPos + 5e3;
          resumes.forEach((other) => {
            if (other.id === resume.id) return;
            const otherPos = pageLower.indexOf(other.id.toLowerCase());
            if (otherPos > hashPos && otherPos < searchEnd) searchEnd = otherPos;
          });
          const zone = pageLower.substring(Math.max(0, hashPos - 500), searchEnd);
          const isHidden = hasHiddenIndicator(zone);
          resume.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_VISIBLE;
          resume.hidden = isHidden;
          resumeLog5.info("  Proximity: " + resume.id.substring(0, 8) + "=" + resume.visibility);
        });
      }
    }
    const stillUnknown = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      resumeLog5.info("List visibility: " + stillUnknown.length + " resumes still UNKNOWN \u2014 will be resolved by detail page detection");
    }
    const hiddenCount = resumes.filter((r) => r.visibility === VISIBILITY_HIDDEN).length;
    const visibleCount = resumes.filter((r) => r.visibility === VISIBILITY_VISIBLE).length;
    const unknownCount = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN).length;
    resumeLog5.info("Resume list: " + resumes.length + " total (" + hiddenCount + " hidden, " + visibleCount + " visible, " + unknownCount + " unknown)");
    return resumes;
  }
  var resumeLog5;
  var init_resume_detail_list_parser = __esm({
    "src/parsers/resume-detail/resume-detail-list-parser.js"() {
      init_anti_hallucination();
      init_resume_constants();
      resumeLog5 = createLogger("Resume");
    }
  });

  // src/parsers/resume-detail/resume-detail-debug-vis.js
  function debugVisibility() {
    const result = {
      url: window.location.href,
      strategy1_cards: [],
      strategy2_walks: [],
      strategy3_proximity: null,
      indicators: {},
      rawHtmlSnippets: {}
    };
    const RESUME_CARD_SELECTORS2 = [
      '[data-qa="resume-list-item"]',
      '[data-qa="resume-list-item-wrap"]',
      '[data-qa="resume-list-item-wrapper"]',
      '[data-qa*="resume-list-item"]',
      '[data-qa*="resume-card"]'
    ];
    RESUME_CARD_SELECTORS2.forEach((sel) => {
      const cards = document.querySelectorAll(sel);
      result.strategy1_cards.push({
        selector: sel,
        count: cards.length,
        samples: Array.from(cards).slice(0, 3).map((card) => ({
          tagName: card.tagName,
          textLength: (card.textContent || "").length,
          textPreview: (card.textContent || "").substring(0, 200).trim(),
          hasHiddenDataQa: VISIBILITY_HIDDEN_DATA_QA.some((qa) => card.querySelector(qa) !== null),
          linksInside: card.querySelectorAll('a[href*="resume"], a[href*="/resume/"]').length,
          outerHTMLPreview: card.outerHTML.substring(0, 300)
        }))
      });
    });
    const links = document.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
      if (!hashMatch) return;
      const id = hashMatch[1];
      if (id.length < MIN_HASH_LEN) return;
      let card = null;
      let el = link;
      for (let i = 0; i < 8; i++) {
        if (!el || el === document.body) break;
        for (const sel of RESUME_CARD_SELECTORS2) {
          if (el.matches && el.matches(sel)) {
            card = el;
            break;
          }
        }
        if (card) break;
        el = el.parentElement;
      }
      if (!card) {
        el = link;
        for (let i = 0; i < 8; i++) {
          if (!el || el === document.body) break;
          const parent = el.parentElement;
          if (parent && (parent.textContent || "").length > 200) {
            card = parent;
            break;
          }
          el = parent;
        }
      }
      result.strategy2_walks.push({
        id: id.substring(0, 12),
        href: href.substring(0, 80),
        linkText: (link.textContent || "").substring(0, 60).trim(),
        cardFound: !!card,
        cardTag: card ? card.tagName : null,
        cardTextPreview: card ? (card.textContent || "").substring(0, 300).trim() : null,
        cardVisibility: card ? detectVisibilityFromCard(card) : null,
        cardOuterHTMLPreview: card ? card.outerHTML.substring(0, 500) : null
      });
    });
    const pageHtml = document.body.innerHTML || "";
    const pageLower = pageHtml.toLowerCase();
    const normalizedPageText = normalizeWs(pageLower);
    HIDDEN_INDICATORS.forEach((ind) => {
      const positions = [];
      let idx = 0;
      while ((idx = normalizedPageText.indexOf(ind, idx)) !== -1) {
        positions.push({ position: idx, context: normalizedPageText.substring(Math.max(0, idx - 50), Math.min(normalizedPageText.length, idx + ind.length + 50)) });
        idx += ind.length;
      }
      result.indicators[ind] = { count: positions.length, occurrences: positions.slice(0, 5) };
    });
    const cleanHtml = stripScripts(pageHtml);
    const cleanNorm = normalizeWs(cleanHtml.toLowerCase());
    HIDDEN_INDICATORS.forEach((ind) => {
      const pos = cleanNorm.indexOf(ind);
      result.rawHtmlSnippets[ind] = {
        foundInClean: pos !== -1,
        positionInClean: pos,
        contextInClean: pos !== -1 ? cleanNorm.substring(Math.max(0, pos - 80), Math.min(cleanNorm.length, pos + ind.length + 80)) : null
      };
    });
    result.visibilityDataQa = VISIBILITY_HIDDEN_DATA_QA.map((sel) => ({
      selector: sel,
      count: document.querySelectorAll(sel).length,
      samples: Array.from(document.querySelectorAll(sel)).slice(0, 2).map((el) => ({
        tagName: el.tagName,
        textContent: (el.textContent || "").substring(0, 100).trim(),
        outerHTMLPreview: el.outerHTML.substring(0, 200)
      }))
    }));
    console.log("[HH-Copilot] Visibility diagnostic:", result);
    return result;
  }
  var init_resume_detail_debug_vis = __esm({
    "src/parsers/resume-detail/resume-detail-debug-vis.js"() {
      init_resume_constants();
    }
  });

  // src/parsers/resume-detail/index.js
  var resume_detail_exports = {};
  __export(resume_detail_exports, {
    debugVisibility: () => debugVisibility,
    diagnoseResumeDOM: () => diagnoseResumeDOM,
    expandHiddenSections: () => expandHiddenSections,
    getResumePageType: () => getResumePageType,
    parseResume: () => parseResume,
    parseResumeList: () => parseResumeList
  });
  function getResumePageType() {
    const path = window.location.pathname;
    if (/\/resume\/[a-f0-9]+/.test(path)) return "resume-detail";
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
      const resumeLog6 = (await Promise.resolve().then(() => (init_anti_hallucination(), anti_hallucination_exports))).createLogger("Resume");
      resumeLog6.info("Expanded hidden sections: " + clicked.join(", "));
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  var init_resume_detail = __esm({
    "src/parsers/resume-detail/index.js"() {
      init_parse_resume();
      init_diagnose();
      init_resume_detail_list_parser();
      init_resume_detail_debug_vis();
    }
  });

  // src/parsers/resume-detail.js
  var init_resume_detail2 = __esm({
    "src/parsers/resume-detail.js"() {
      init_resume_detail();
    }
  });

  // src/ui/state.js
  function setActiveResumeState(resume) {
    panelState.resume = resume;
    panelState._resumeCleared = false;
  }
  function clearResumeState() {
    panelState.resume = null;
    panelState._resumeCleared = true;
    panelState.resumeList = [];
  }
  function setMyResumes(list) {
    panelState.myResumes = list;
  }
  function setResumeList(list) {
    panelState.resumeList = list;
  }
  function setAuthState(val) {
    panelState.isLoggedIn = val;
  }
  function togglePanelOpen() {
    panelState.isOpen = !panelState.isOpen;
  }
  function setVacancies(vacancies) {
    panelState.vacancies = (vacancies || []).filter((v) => v && v.id && v.title);
  }
  function setStatus(status) {
    panelState.status = status;
  }
  function setActiveTab(tabId) {
    panelState.activeTab = tabId;
  }
  function setActiveConversation(convId) {
    panelState.activeConversation = convId;
  }
  function removeFromBlacklist(name) {
    panelState.blacklist = panelState.blacklist.filter((n) => n !== name);
  }
  function updateStats(stats) {
    Object.assign(panelState.stats, stats);
  }
  function updateSettings(settings) {
    Object.assign(panelState.settings, settings);
  }
  var panelState, refs;
  var init_state = __esm({
    "src/ui/state.js"() {
      panelState = {
        isOpen: false,
        isLoggedIn: null,
        status: "idle",
        activeTab: null,
        vacancies: [],
        stats: {},
        resume: null,
        resumeList: [],
        myResumes: [],
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
        _resumeCleared: false,
        blacklist: [],
        massApply: {
          running: false,
          minMatch: 70,
          maxApply: 20,
          progress: 0
        }
      };
      refs = {
        fabEl: null,
        sidebarEl: null,
        backdropEl: null,
        shadowRoot: null
      };
    }
  });

  // src/ui/sidebar-css-core.js
  var SIDEBAR_CSS_CORE;
  var init_sidebar_css_core = __esm({
    "src/ui/sidebar-css-core.js"() {
      SIDEBAR_CSS_CORE = `:host { all: initial; }
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

/* FAB pulse */
@keyframes fabPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(5,150,105,0.4); }
  50% { box-shadow: 0 4px 20px rgba(5,150,105,0.4), 0 0 0 8px rgba(5,150,105,0.12); } }

/* Spinner */
.har-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: har-spin 0.8s linear infinite; }
@keyframes har-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
`;
    }
  });

  // src/ui/sidebar-css-components.js
  var SIDEBAR_CSS_COMPONENTS;
  var init_sidebar_css_components = __esm({
    "src/ui/sidebar-css-components.js"() {
      SIDEBAR_CSS_COMPONENTS = `
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
.btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none !important; pointer-events: none; }
.btn-primary:disabled { background: #94a3b8; box-shadow: none; }
.btn .btn-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: har-spin 0.6s linear infinite; vertical-align: middle; }
.btn-outline .btn-spinner { border-color: rgba(0,0,0,0.12); border-top-color: #059669; }

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
.sub-body.open { max-height: 2000px; opacity: 1; padding-top: 6px; overflow-y: auto; }
.sub-body.open::-webkit-scrollbar { width: 3px; }
.sub-body.open::-webkit-scrollbar-track { background: transparent; }
.sub-body.open::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.sub-body.open::-webkit-scrollbar-thumb:hover { background: #059669; }
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
  });

  // src/ui/sidebar-css.js
  var SIDEBAR_CSS;
  var init_sidebar_css = __esm({
    "src/ui/sidebar-css.js"() {
      init_sidebar_css_core();
      init_sidebar_css_components();
      SIDEBAR_CSS = SIDEBAR_CSS_CORE + SIDEBAR_CSS_COMPONENTS;
    }
  });

  // src/ui/styles.js
  function getSidebarCSS() {
    return SIDEBAR_CSS;
  }
  var init_styles = __esm({
    "src/ui/styles.js"() {
      init_sidebar_css();
    }
  });

  // src/ui/html/icons.js
  var ICONS;
  var init_icons = __esm({
    "src/ui/html/icons.js"() {
      ICONS = {
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
    }
  });

  // src/ui/html/helpers.js
  function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function scoreClass(s) {
    return s >= 70 ? "high" : s >= 40 ? "medium" : "low";
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
  var init_helpers = __esm({
    "src/ui/html/helpers.js"() {
    }
  });

  // src/ui/html/tabs/overview.js
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
        <button class="btn btn-sm" data-action="logout" style="background:#ef4444;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;">\u0412\u044B\u0445\u043E\u0434</button>
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
        <div style="font-size:11px;color:#71717a;">\u0414\u0435\u0442\u0435\u043A\u0446\u0438\u044F \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u043E\u0432</div>
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
      <button class="btn btn-outline" data-tab-switch="resume">${ICONS.file} \u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</button>
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
  var init_overview = __esm({
    "src/ui/html/tabs/overview.js"() {
      init_icons();
    }
  });

  // src/ui/html/tabs/resume.js
  function getResumeSection() {
    return `<div class="tab-section" id="tab-resume">
    <div id="res-sync-section" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="res-sync">
        <span style="font-size:12px;font-weight:600;">\u0412\u0441\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="badge badge-green" id="res-visible-count" style="font-size:10px;display:none;">0 \u0432\u0438\u0434\u0438\u043C\u044B\u0445</span>
          <span class="badge badge-amber" id="res-hidden-count" style="font-size:10px;display:none;">0 \u0441\u043A\u0440\u044B\u0442\u044B\u0445</span>
          <span class="badge badge-zinc" id="res-sync-count">0</span>
          <span class="timeline-chevron open"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="timeline-body open" id="res-sync-body" style="margin-top:10px;">
        <div id="res-sync-list" style="font-size:11px;color:#71717a;">
          \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435\xBB \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0440\u0435\u0437\u044E\u043C\u0435
        </div>
        <div id="res-cta-load" style="padding-top:6px;display:none;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg> \u0412\u0437\u044F\u0442\u044C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
          </button>
        </div>
        <div style="padding-top:6px;">
          <button class="btn btn-outline btn-sm" data-action="sync-resumes" style="width:100%;">
            ${ICONS.refresh} \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435
          </button>
        </div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div id="res-title" style="font-size:13px;font-weight:600;">\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</div>
            </div>
            <div id="res-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0432\u044B\u0448\u0435</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</div>
        </div>
      </div>
    </div>
    <div id="res-skills-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">\u041D\u0430\u0432\u044B\u043A\u0438 (\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435)</span>
        <span class="badge badge-zinc" id="res-skills-count">0 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</span>
      </div>
      <div id="res-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>
    <div id="res-score-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <!-- Header: ring + title + verdict -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="res-score-ring" style="width:48px;height:48px;border-radius:50%;background:conic-gradient(#059669 0deg 0deg,#e4e4e7 0deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#059669;" id="res-score-pct">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">\u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0435\u0437\u044E\u043C\u0435</div>
          <div id="res-score-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">\u0410\u043D\u0430\u043B\u0438\u0437 \u0433\u043B\u0430\u0437\u0430\u043C\u0438 HR \u0438 ATS</div>
        </div>
      </div>
      <!-- Two mini-scores: ATS + Experience -->
      <div id="res-score-bars" style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:10px;color:#71717a;">ATS-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C</span>
            <span id="res-ats-score" style="font-size:12px;font-weight:700;color:#059669;">0%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#e4e4e7;">
            <div id="res-ats-bar" style="height:100%;border-radius:2px;background:#059669;width:0%;transition:width .4s ease;"></div>
          </div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:10px;color:#71717a;">\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u043F\u044B\u0442\u0430</span>
            <span id="res-exp-score" style="font-size:12px;font-weight:700;color:#2563EB;">0%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#e4e4e7;">
            <div id="res-exp-bar" style="height:100%;border-radius:2px;background:#2563EB;width:0%;transition:width .4s ease;"></div>
          </div>
        </div>
      </div>
      <!-- Red flags -->
      <div id="res-red-flags" style="display:none;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#DC2626;">\u041A\u0440\u0430\u0441\u043D\u044B\u0435 \u0444\u043B\u0430\u0433\u0438</span>
        </div>
        <div id="res-red-flags-list" style="font-size:11px;"></div>
      </div>
      <!-- Strengths -->
      <div id="res-strengths" style="display:none;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#059669;">\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B</span>
        </div>
        <div id="res-strengths-list" style="font-size:11px;"></div>
      </div>
      <!-- Recommendations -->
      <div id="res-recommendations" style="display:none;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#D97706;">\u0427\u0442\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C</span>
        </div>
        <div id="res-recommendations-list" style="font-size:11px;"></div>
      </div>
    </div>
    <!-- Diagnostic tools (collapsed by default) -->
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="diag-tools">
        <span style="font-size:12px;font-weight:600;">\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430</span>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="diag-tools-body" style="margin-top:8px;">
        <div id="res-status-line" style="font-size:11px;color:#71717a;margin-bottom:8px;">\u0413\u043E\u0442\u043E\u0432\u043E</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-action="clear-resume">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C</button>
          <button class="btn btn-outline btn-sm" data-action="dump-resume">\u0414\u0430\u043C\u043F</button>
          <button class="btn btn-outline btn-sm" data-action="test-parse">\u0422\u0435\u0441\u0442</button>
        </div>
      </div>
    </div>
  </div>`;
  }
  var init_resume = __esm({
    "src/ui/html/tabs/resume.js"() {
      init_icons();
    }
  });

  // src/ui/html/tabs/vacancies.js
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
          <div style="font-size:11px;color:#71717a;">\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 > 70%</div>
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
          <option value="new">\u041D\u043E\u0432\u044B\u0435</option>
          <option value="applied">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u043E</option>
          <option value="blacklisted">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#71717a;white-space:nowrap;">\u041C\u0438\u043D. \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435:</span>
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
          <span id="mass-eta" style="font-size:11px;color:#71717a;">\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u0435</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>\u041F\u0430\u0443\u0437\u0430</button>
      </div>
    </div>
    <div id="res-gap-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <!-- Header + score ring -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="res-gap-ring" style="width:44px;height:44px;border-radius:50%;background:conic-gradient(#059669 0deg 280.8deg,#e4e4e7 280.8deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#059669;">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</div>
          <div id="res-gap-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">\u0420\u0435\u0437\u044E\u043C\u0435 vs \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438</div>
        </div>
        <button class="btn btn-outline btn-sm" data-action="analyze-skills">
          ${ICONS.ai} \u0410\u043D\u0430\u043B\u0438\u0437
        </button>
      </div>
      <!-- Stacked bar -->
      <div id="res-gap-bar" style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:12px;background:#f4f4f5;">
        <div id="res-gap-bar-match" style="width:0%;background:linear-gradient(90deg,#059669,#34D399);border-radius:3px 0 0 3px;"></div>
        <div id="res-gap-bar-miss" style="width:0%;background:linear-gradient(90deg,#DC2626,#F87171);"></div>
        <div id="res-gap-bar-extra" style="width:0%;background:linear-gradient(90deg,#2563EB,#60A5FA);border-radius:0 3px 3px 0;"></div>
      </div>
      <!-- Row 1: Match -->
      <div id="res-gap-match-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#059669;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#059669;">\u0421\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442</span>
          <span class="badge badge-green" id="res-gap-match-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-match-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 2: Gap -->
      <div id="res-gap-miss-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#DC2626;">\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442</span>
          <span class="badge badge-red" id="res-gap-miss-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-miss-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 3: Extra -->
      <div id="res-gap-extra-row" style="margin-bottom:10px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#2563EB;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#2563EB;">\u0412\u0430\u0448 \u043F\u043B\u044E\u0441</span>
          <span class="badge badge-blue" id="res-gap-extra-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-extra-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Recommendation -->
      <div id="res-gap-recommendation" style="display:none;background:#FFFBEB;border:1px solid rgba(217,119,6,0.15);border-radius:8px;padding:8px 10px;align-items:flex-start;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span id="res-gap-recommendation-text" style="font-size:11px;color:#92400E;line-height:1.5;"></span>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#71717a;font-size:12px;line-height:1.6;">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
    </div>
  </div>`;
  }
  var init_vacancies = __esm({
    "src/ui/html/tabs/vacancies.js"() {
      init_icons();
    }
  });

  // src/ui/html/tabs/negotiations.js
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
  var init_negotiations = __esm({
    "src/ui/html/tabs/negotiations.js"() {
      init_icons();
    }
  });

  // src/ui/html/tabs/settings.js
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
      ${settingToggle("\u0414\u0435\u0442\u0435\u043A\u0446\u0438\u044F \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u043E\u0432", "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043F\u0440\u0438 \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u0435 429", "s-burst", true)}
      ${settingToggle("\u0410\u0434\u0430\u043F\u0442\u0438\u0432\u043D\u043E\u0435 \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u0435", "\u0423\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u0430 \u043F\u0440\u0438 429/CAPTCHA", "s-adaptive", true)}
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
  var init_settings = __esm({
    "src/ui/html/tabs/settings.js"() {
      init_icons();
      init_helpers();
    }
  });

  // src/ui/html/tabs/stats.js
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
          <div style="font-size:11px;color:#71717a;">\u0410\u0434\u0430\u043F\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u0439</div>
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
  var init_stats = __esm({
    "src/ui/html/tabs/stats.js"() {
      init_icons();
    }
  });

  // src/ui/html/shell.js
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
      <span style="font-size:11px;color:#71717a;">HH Copilot v${"1.9.14"}</span>
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
      <span style="font-size:11px;color:#71717a;">HH Copilot v${"1.9.14"}</span>
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
  var init_shell = __esm({
    "src/ui/html/shell.js"() {
      init_icons();
      init_helpers();
      init_overview();
      init_resume();
      init_vacancies();
      init_negotiations();
      init_settings();
      init_stats();
    }
  });

  // src/ui/html/index.js
  var init_html = __esm({
    "src/ui/html/index.js"() {
      init_shell();
      init_helpers();
    }
  });

  // src/ui/html.js
  var init_html2 = __esm({
    "src/ui/html.js"() {
      init_html();
    }
  });

  // src/ui/auth-detection.js
  function isLoggedOut() {
    const url = window.location.pathname;
    if (/\/account\/login/.test(url) || /\/login/.test(url) || /\/signup/.test(url)) {
      return true;
    }
    const loginSelectors = [
      '[data-qa="login"]',
      '[data-qa="login-button"]',
      '[data-qa="account-login"]',
      '[data-qa="signup"]',
      '[data-qa="signup-button"]'
    ];
    for (const sel of loginSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && document.body.contains(el)) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") {
            return true;
          }
        }
      } catch (e) {
      }
    }
    const inputSelectors = [
      'input[name="login"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[type="password"]',
      '[data-qa="login-input"]',
      '[data-qa="login-email"]'
    ];
    for (const sel of inputSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && document.body.contains(el)) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") {
            return true;
          }
        }
      } catch (e) {
      }
    }
    const allButtons = document.querySelectorAll('a, button, [role="button"]');
    for (const el of allButtons) {
      if (!document.body.contains(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      try {
        const rect = el.getBoundingClientRect();
        if (rect.top > 120 || rect.bottom < 0) continue;
      } catch (e) {
        continue;
      }
      const text = (el.textContent || "").trim();
      if (text === "\u0412\u043E\u0439\u0442\u0438") {
        return true;
      }
    }
    return false;
  }
  function isLoggedIn() {
    const authSelectors = [
      // data-qa selectors (primary — hh.ru test automation attributes)
      '[data-qa="mainmenu_applicant"]',
      '[data-qa="mainmenu_user_name"]',
      'a[data-qa="mainmenu_myResumes"]',
      '[data-qa="mainmenu"] sup',
      // Notification badge in menu
      ".supernova-nav__item--applicant",
      // React nav applicant item
      ".mainmenu__item--applicant",
      // Classic nav applicant item
      // Links to applicant pages (only accessible when logged in)
      'a[href="/applicant/resumes"]',
      'a[href="/applicant/negotiations"]',
      'a[href="/applicant/vacancies"]',
      'a[href="/applicant/job_search"]',
      'a[href="/applicant/favorites"]',
      // Wildcard href match (but only in header/nav area)
      // These are checked below with position filtering
      // Additional data-qa patterns that may appear
      '[data-qa="applicant-menu"]',
      '[data-qa="user-menu"]',
      '[data-qa="header-user"]',
      '[data-qa="supernova-user-switcher"]'
    ];
    for (const sel of authSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        if (!document.body.contains(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display !== "none" && style.visibility !== "hidden") {
          return true;
        }
      } catch (e) {
      }
    }
    try {
      const navLinks = document.querySelectorAll('a[href*="/applicant/"]');
      for (const el of navLinks) {
        if (!document.body.contains(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect();
        if (rect.top > 120 || rect.bottom < 0) continue;
        return true;
      }
    } catch (e) {
    }
    return false;
  }
  var init_auth_detection = __esm({
    "src/ui/auth-detection.js"() {
    }
  });

  // src/ui/auth-check.js
  function checkAuth() {
    if (isLoggedOut()) {
      return false;
    }
    if (isLoggedIn()) {
      return true;
    }
    return false;
  }
  function checkCookiesViaBackground() {
    return new Promise((resolve) => {
      let settled = false;
      try {
        chrome.runtime.sendMessage(
          { type: "check-auth-cookies" },
          (response) => {
            if (settled) return;
            settled = true;
            if (chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            if (response && typeof response.hasAuthCookie === "boolean") {
              resolve(response.hasAuthCookie);
            } else {
              resolve(null);
            }
          }
        );
      } catch (e) {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 3e3);
    });
  }
  async function checkAuthAsync() {
    const syncResult = checkAuth();
    if (syncResult) {
      const cookieResult2 = await checkCookiesViaBackground();
      if (cookieResult2 === null) {
        return syncResult;
      }
      if (!cookieResult2) {
        console.log("[HH-AR][Auth] Async: sync=authorized, cookies=NO \u2192 false");
        return false;
      }
      return true;
    }
    const cookieResult = await checkCookiesViaBackground();
    if (cookieResult === true) {
      console.log("[HH-AR][Auth] Async: sync=not authorized, cookies=YES \u2192 true (cookie override)");
      return true;
    }
    return false;
  }
  function resetAuthCache() {
  }
  var init_auth_check = __esm({
    "src/ui/auth-check.js"() {
      init_auth_detection();
    }
  });

  // src/ui/auth-user.js
  function getUserName() {
    const nameSelectors = [
      '[data-qa="mainmenu_user_name"]',
      ".supernova-nav__item--applicant",
      '[data-qa="user-name"]',
      '[data-qa="supernova-user-switcher"]'
    ];
    for (const sel of nameSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const name = (el.textContent || "").trim();
          if (name && name.length > 0 && name.length < 100) {
            return name;
          }
        }
      } catch (e) {
      }
    }
    try {
      const links = document.querySelectorAll('a[href*="/applicant/"]');
      for (const el of links) {
        const rect = el.getBoundingClientRect();
        if (rect.top > 120) continue;
        const name = (el.textContent || "").trim();
        if (name && name.length > 1 && name.length < 100) {
          return name;
        }
      }
    } catch (e) {
    }
    return "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C";
  }
  var init_auth_user = __esm({
    "src/ui/auth-user.js"() {
    }
  });

  // src/ui/auth.js
  var init_auth = __esm({
    "src/ui/auth.js"() {
      init_auth_detection();
      init_auth_check();
      init_auth_user();
    }
  });

  // src/ui/fab.js
  function fabStyle(style, prop, value) {
    style.setProperty(prop, value, "important");
  }
  function createFab(onClick) {
    if (refs.fabEl) return;
    refs.fabEl = document.createElement("div");
    refs.fabEl.id = "hh-ar-fab";
    refs.fabEl.setAttribute("role", "button");
    refs.fabEl.setAttribute("aria-label", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C HH Copilot");
    const s = refs.fabEl.style;
    fabStyle(s, "position", "fixed");
    fabStyle(s, "bottom", "24px");
    fabStyle(s, "right", "24px");
    fabStyle(s, "width", "56px");
    fabStyle(s, "height", "56px");
    fabStyle(s, "border-radius", "50%");
    fabStyle(s, "cursor", "pointer");
    fabStyle(s, "z-index", "999999");
    fabStyle(s, "display", "flex");
    fabStyle(s, "align-items", "center");
    fabStyle(s, "justify-content", "center");
    fabStyle(s, "background", "linear-gradient(135deg,#059669,#10B981)");
    fabStyle(s, "box-shadow", "0 4px 20px rgba(5,150,105,0.4)");
    fabStyle(s, "transition", "right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s");
    fabStyle(s, "animation", "fabPulse 2.5s ease-in-out infinite");
    s.border = "none";
    refs.fabEl.innerHTML = FAB_ICONS.briefcase;
    refs.fabEl.addEventListener("mouseenter", () => {
      s.setProperty("transform", "scale(1.1)", "important");
    });
    refs.fabEl.addEventListener("mouseleave", () => {
      s.setProperty("transform", "scale(1)", "important");
    });
    refs.fabEl.addEventListener("click", onClick);
    document.body.appendChild(refs.fabEl);
  }
  function updateFabIcon() {
    if (!refs.fabEl) return;
    const s = refs.fabEl.style;
    if (panelState.isLoggedIn === null) {
      fabStyle(s, "background", "#94a3b8");
      fabStyle(s, "box-shadow", "0 4px 20px rgba(148,163,184,0.3)");
      fabStyle(s, "animation", "none");
      fabStyle(s, "opacity", "1");
      fabStyle(s, "transform", "scale(1)");
      fabStyle(s, "pointer-events", "auto");
      refs.fabEl.innerHTML = FAB_ICONS.loading;
      refs.fabEl.setAttribute("title", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E");
    } else if (!panelState.isLoggedIn) {
      fabStyle(s, "background", "#ef4444");
      fabStyle(s, "box-shadow", "0 4px 20px rgba(239,68,68,0.4)");
      fabStyle(s, "animation", "none");
      fabStyle(s, "opacity", "1");
      fabStyle(s, "transform", "scale(1)");
      fabStyle(s, "pointer-events", "auto");
      refs.fabEl.innerHTML = FAB_ICONS.locked;
      refs.fabEl.setAttribute("title", "HH Copilot: \u041D\u0415 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D \u043D\u0430 hh.ru");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D");
    } else if (panelState.isOpen) {
      fabStyle(s, "background", "#059669");
      fabStyle(s, "opacity", "0");
      fabStyle(s, "transform", "scale(0) rotate(180deg)");
      fabStyle(s, "pointer-events", "none");
      refs.fabEl.setAttribute("title", "HH Copilot: \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
    } else {
      fabStyle(s, "background", "linear-gradient(135deg,#059669,#10B981)");
      fabStyle(s, "box-shadow", "0 4px 20px rgba(5,150,105,0.4)");
      fabStyle(s, "opacity", "1");
      fabStyle(s, "transform", "scale(1)");
      fabStyle(s, "pointer-events", "auto");
      fabStyle(s, "animation", "fabPulse 2.5s ease-in-out infinite");
      refs.fabEl.innerHTML = FAB_ICONS.briefcase;
      refs.fabEl.setAttribute("title", "HH Copilot: \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F.");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
    }
  }
  var FAB_ICONS;
  var init_fab = __esm({
    "src/ui/fab.js"() {
      init_state();
      FAB_ICONS = {
        loading: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:har-spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
        locked: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
        briefcase: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
        close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      };
    }
  });

  // src/ui/tabs/resumes/resume-helpers-gap.js
  function updateSkillGapSection(r) {
    const section = refs.shadowRoot?.getElementById("res-gap-section");
    if (!section) return;
    if (!r || !r.skills || r.skills.length === 0) {
      section.style.display = "none";
      return;
    }
    const resumeSkills = normalizeSkills(r.skills);
    const vacancySkills = collectVacancySkills();
    if (vacancySkills.size === 0) {
      section.style.display = "none";
      return;
    }
    const match = [];
    const miss = [];
    const extra = [];
    for (const skill of resumeSkills) {
      if (vacancySkills.has(skill)) match.push(skill);
    }
    for (const skill of vacancySkills) {
      if (!resumeSkills.has(skill)) miss.push(skill);
    }
    for (const skill of resumeSkills) {
      if (!vacancySkills.has(skill)) extra.push(skill);
    }
    const total = resumeSkills.size + miss.length;
    const matchPct = total > 0 ? Math.round(match.length / total * 100) : 0;
    section.style.display = "";
    const ring = refs.shadowRoot?.getElementById("res-gap-ring");
    if (ring) {
      const deg = Math.round(matchPct * 3.6);
      ring.style.background = "conic-gradient(#059669 0deg " + deg + "deg, #e4e4e7 " + deg + "deg 360deg)";
      const inner = ring.querySelector("div");
      if (inner) inner.textContent = matchPct + "%";
    }
    const subtitle = refs.shadowRoot?.getElementById("res-gap-subtitle");
    if (subtitle) {
      const resumeTitle = r.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F";
      if (matchPct >= 80) {
        subtitle.textContent = resumeTitle + " \u2014 \u0442\u043E\u043F " + Math.round(100 - matchPct) + "% \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432";
      } else if (matchPct >= 50) {
        subtitle.textContent = resumeTitle + " \u2014 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 " + matchPct + "%";
      } else {
        subtitle.textContent = resumeTitle + " \u2014 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043D\u0430\u0432\u044B\u043A\u0438";
      }
    }
    const barMatch = refs.shadowRoot?.getElementById("res-gap-bar-match");
    const barMiss = refs.shadowRoot?.getElementById("res-gap-bar-miss");
    const barExtra = refs.shadowRoot?.getElementById("res-gap-bar-extra");
    if (barMatch && barMiss && barExtra) {
      barMatch.style.width = (total > 0 ? (match.length / total * 100).toFixed(1) : 0) + "%";
      barMiss.style.width = (total > 0 ? (miss.length / total * 100).toFixed(1) : 0) + "%";
      barExtra.style.width = (total > 0 ? (extra.length / total * 100).toFixed(1) : 0) + "%";
    }
    updateGapRow("res-gap-match-row", "res-gap-match-count", "res-gap-match-list", match, "skill-match");
    updateGapRow("res-gap-miss-row", "res-gap-miss-count", "res-gap-miss-list", miss, "skill-miss");
    updateGapRow("res-gap-extra-row", "res-gap-extra-count", "res-gap-extra-list", extra, "skill-extra");
    updateGapRecommendation(miss, matchPct);
  }
  function updateGapRow(rowId, countId, listId, skills, cssClass) {
    const row = refs.shadowRoot?.getElementById(rowId);
    const countEl = refs.shadowRoot?.getElementById(countId);
    const listEl = refs.shadowRoot?.getElementById(listId);
    if (!row) return;
    if (skills.length === 0) {
      row.style.display = "none";
      return;
    }
    row.style.display = "";
    if (countEl) countEl.textContent = skills.length;
    if (listEl) {
      const visible = skills.slice(0, 5);
      const remainder = skills.length - visible.length;
      let html = visible.map((s) => '<span class="skill-tag ' + cssClass + '">' + esc(s) + "</span>").join("");
      if (remainder > 0) {
        html += '<span style="font-size:11px;color:#71717a;padding:3px 0;">+' + remainder + "</span>";
      }
      listEl.innerHTML = html;
    }
  }
  function updateGapRecommendation(miss, matchPct) {
    const block = refs.shadowRoot?.getElementById("res-gap-recommendation");
    const text = refs.shadowRoot?.getElementById("res-gap-recommendation-text");
    if (!block || !text) return;
    if (miss.length === 0 || matchPct >= 90) {
      block.style.display = "none";
      return;
    }
    block.style.display = "flex";
    const topMiss = miss.slice(0, 3);
    const potentialPct = Math.min(95, matchPct + topMiss.length * 5);
    const boldSkills = topMiss.map((s) => "<b>" + esc(s) + "</b>").join(", ");
    text.innerHTML = "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 " + boldSkills + " \u0434\u043B\u044F \u0440\u043E\u0441\u0442\u0430 \u0434\u043E <b>" + potentialPct + "%</b> \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u0441 \u0440\u044B\u043D\u043A\u043E\u043C.";
  }
  function normalizeSkills(skills) {
    const set = /* @__PURE__ */ new Set();
    for (const s of skills) {
      const name = typeof s === "string" ? s : s.name || "";
      if (name) set.add(name.toLowerCase().trim());
    }
    return set;
  }
  function collectVacancySkills() {
    const skills = /* @__PURE__ */ new Set();
    const vacancies = panelState.vacancies || [];
    for (const v of vacancies) {
      if (v.tags && Array.isArray(v.tags)) {
        for (const t of v.tags) {
          const name = typeof t === "string" ? t : t.name || "";
          if (name) skills.add(name.toLowerCase().trim());
        }
      }
      if (v.skills && Array.isArray(v.skills)) {
        for (const s of v.skills) {
          const name = typeof s === "string" ? s : s.name || "";
          if (name) skills.add(name.toLowerCase().trim());
        }
      }
    }
    return skills;
  }
  var init_resume_helpers_gap = __esm({
    "src/ui/tabs/resumes/resume-helpers-gap.js"() {
      init_state();
      init_html2();
    }
  });

  // src/ui/tabs/resumes/resume-helpers.js
  var resume_helpers_exports = {};
  __export(resume_helpers_exports, {
    attachSubToggle: () => attachSubToggle,
    buildGrid: () => buildGrid,
    buildSubAccordion: () => buildSubAccordion,
    getInitials: () => getInitials,
    toggleSub: () => toggleSub,
    updateSkillGapSection: () => updateSkillGapSection,
    updateSkillsSection: () => updateSkillsSection
  });
  function getInitials(text) {
    if (!text) return "?";
    const words = text.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return text.substring(0, 2).toUpperCase();
  }
  function toggleSub(sectionId, chevronId) {
    const body = refs.shadowRoot?.getElementById(sectionId);
    const chev = refs.shadowRoot?.getElementById(chevronId);
    if (!body) return;
    body.classList.toggle("open");
    if (chev) chev.classList.toggle("open");
  }
  function buildSubAccordion(bodyId, chevronId, title, count, dotColor, contentHtml) {
    return '<div class="tl-dot" style="background:' + dotColor + ';"></div><div class="sub-toggle" tabindex="0" role="button" data-sub-toggle="' + bodyId + '" data-sub-chev="' + chevronId + '"><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:600;color:' + dotColor + ';">' + esc(title) + '</span><span style="font-size:11px;color:#71717a;">' + esc(count) + '</span></div><svg class="sub-chevron" id="' + chevronId + '" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="sub-body" id="' + bodyId + '">' + contentHtml + "</div>";
  }
  function buildGrid(pairs) {
    const rows = pairs.filter(([, val]) => val).map(
      ([label, val]) => '<span style="color:#71717a;">' + esc(label) + '</span><span style="font-weight:500;">' + esc(val) + "</span>"
    ).join("");
    if (!rows) return '<div style="padding:8px;font-size:11px;color:#71717a;">\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</div>';
    return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + rows + "</div></div>";
  }
  function attachSubToggle(bodyId, chevronId) {
    const toggleEl = refs.shadowRoot?.querySelector('[data-sub-toggle="' + bodyId + '"]');
    if (!toggleEl) return;
    toggleEl.addEventListener("click", () => {
      toggleSub(bodyId, chevronId);
    });
    toggleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSub(bodyId, chevronId);
      }
    });
  }
  function updateSkillsSection(r) {
    const section = refs.shadowRoot?.getElementById("res-skills-section");
    const list = refs.shadowRoot?.getElementById("res-skills-list");
    const count = refs.shadowRoot?.getElementById("res-skills-count");
    if (!section || !list) return;
    if (!r || !r.skills || r.skills.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    if (count) count.textContent = r.skills.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432";
    list.innerHTML = r.skills.map((s) => '<span class="skill-tag skill-match">' + esc(s) + "</span>").join("");
  }
  var init_resume_helpers = __esm({
    "src/ui/tabs/resumes/resume-helpers.js"() {
      init_state();
      init_html2();
      init_resume_helpers_gap();
    }
  });

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
    const r = panelState.resume;
    if (r && r.skills && r.skills.length > 0) {
      updateSkillGapSection(r);
    }
  }
  function renderStatsValues() {
    const s = panelState.stats;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const applied = s.appliedToday || 0;
    const limit = panelState.settings.dailyLimit || 200;
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
  var init_vacancies2 = __esm({
    "src/ui/tabs/vacancies.js"() {
      init_state();
      init_html2();
      init_resume_helpers();
    }
  });

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
  var init_overview2 = __esm({
    "src/ui/tabs/overview.js"() {
      init_state();
      init_html2();
    }
  });

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
  var init_settings2 = __esm({
    "src/ui/tabs/settings.js"() {
      init_state();
      init_html2();
    }
  });

  // src/ui/tabs/stats.js
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
      { label: "\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 > 60%", value: 222, color: "#D97706" },
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
  var DAYS;
  var init_stats2 = __esm({
    "src/ui/tabs/stats.js"() {
      init_state();
      init_html2();
      DAYS = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"];
    }
  });

  // src/ui/tabs/negotiations.js
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
  var CONV_COLORS;
  var init_negotiations2 = __esm({
    "src/ui/tabs/negotiations.js"() {
      init_state();
      init_html2();
      CONV_COLORS = ["#D1FAE5,#065F46", "#DBEAFE,#1E40AF", "#FFFBEB,#B45309", "#F3E8FF,#7C3AED", "#FCE7F3,#DB2777"];
    }
  });

  // src/ui/panel/render.js
  function renderSidebarContent() {
    const content = refs.shadowRoot?.querySelector(".har-content");
    if (!content) return;
    updateHeaderStatus();
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
    const headerStatus = refs.shadowRoot?.getElementById("header-auth-status");
    if (headerStatus && userName !== "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C") {
      headerStatus.innerHTML = `<span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>${esc(userName)}`;
    }
    if (refs.fabEl && userName !== "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C") {
      refs.fabEl.setAttribute("title", "HH Copilot: " + userName + ". \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F.");
    }
  }
  function updateHeaderStatus() {
    if (!refs.shadowRoot) return;
    const container = refs.shadowRoot?.querySelector(".fab-panel");
    if (!container) return;
    if (panelState.isLoggedIn === false) {
      const headerStatus = container.querySelector('.har-header div[style*="font-size:11px"]');
      if (headerStatus) {
        const dotColor = "#ef4444";
        headerStatus.innerHTML = `<span class="pulse-dot" style="width:6px;height:6px;background:${dotColor};border-radius:50%;display:inline-block;"></span>\u041D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D`;
      }
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
  var init_render = __esm({
    "src/ui/panel/render.js"() {
      init_state();
      init_html2();
      init_auth();
      init_vacancies2();
      init_overview2();
      init_stats2();
      init_negotiations2();
      init_settings2();
    }
  });

  // src/ui/tabs/resumes/render-my-resumes.js
  function renderMyResumesPanel() {
    const listEl = refs.shadowRoot?.getElementById("res-sync-list");
    const countEl = refs.shadowRoot?.getElementById("res-sync-count");
    if (!listEl) return;
    const resumes = panelState.myResumes || [];
    if (countEl) countEl.textContent = resumes.length;
    const visibleCountEl = refs.shadowRoot?.getElementById("res-visible-count");
    const hiddenCountEl = refs.shadowRoot?.getElementById("res-hidden-count");
    if (resumes.length > 0) {
      const visibleCount = resumes.filter((r) => (r.visibility || (r.hidden ? "hidden" : "unknown")) === "visible").length;
      const hiddenCount = resumes.filter((r) => (r.visibility || (r.hidden ? "hidden" : "unknown")) === "hidden").length;
      if (visibleCountEl) {
        visibleCountEl.textContent = visibleCount + " \u0432\u0438\u0434.";
        visibleCountEl.style.display = visibleCount > 0 ? "inline-flex" : "none";
      }
      if (hiddenCountEl) {
        hiddenCountEl.textContent = hiddenCount + " \u0441\u043A\u0440\u044B\u0442.";
        hiddenCountEl.style.display = hiddenCount > 0 ? "inline-flex" : "none";
      }
    } else {
      if (visibleCountEl) visibleCountEl.style.display = "none";
      if (hiddenCountEl) hiddenCountEl.style.display = "none";
    }
    const ctaLoadEl = refs.shadowRoot?.getElementById("res-cta-load");
    if (ctaLoadEl) {
      const pageType = getResumePageType();
      const hasActive = panelState.resume && panelState.resume.id;
      ctaLoadEl.style.display = pageType === "resume-detail" && !hasActive ? "block" : "none";
    }
    if (resumes.length === 0) {
      listEl.innerHTML = '<div style="padding:8px;text-align:center;">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435\xBB \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0440\u0435\u0437\u044E\u043C\u0435</div>';
      return;
    }
    listEl.innerHTML = resumes.map((r, idx) => {
      const skillCount = (r.skills || []).length;
      const expCount = (r.experience || []).length;
      const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
      const isActive = panelState.resume && panelState.resume.id === r.id;
      let visBadge = "";
      if (vis === "hidden") {
        visBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">\u0421\u043A\u0440\u044B\u0442\u043E</span>';
      } else if (vis === "visible") {
        visBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">\u0412\u0438\u0434\u0438\u043C\u043E</span>';
      } else {
        visBadge = '<span class="badge" style="font-size:9px;margin-left:4px;background:#e4e4e7;color:#71717a;">?</span>';
      }
      const radio = isActive ? '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="width:8px;height:8px;border-radius:50%;background:#059669;"></span></span>' : '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #d4d4d8;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></span>';
      const reparseIcon = isActive ? '<button class="btn btn-outline btn-sm" data-action="reparse-resume" title="' + (vis === "hidden" ? "\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0442\u044C \u0441\u043A\u0440\u044B\u0442\u043E\u0435" : "\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0442\u044C") + '" style="padding:2px 6px;font-size:13px;line-height:1;' + (vis === "hidden" ? "color:#b45309;border-color:#fbbf24;" : "") + '">\u21BB</button>' : "";
      return '<div class="har-my-resume-item" data-resume-idx="' + idx + '" style="padding:8px;border-bottom:1px solid #e4e4e7;cursor:pointer;display:flex;align-items:flex-start;gap:8px;' + (isActive ? "background:#f0fdf4;border-radius:6px;" : "") + (vis === "hidden" && !isActive ? "opacity:0.6;" : "") + '">' + radio + '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:12px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F") + "</span>" + visBadge + "</div>" + (r.salary ? '<div style="font-size:11px;color:#059669;">' + esc(r.salary) + "</div>" : "") + '<div style="font-size:10px;color:#71717a;">' + skillCount + " \u043D\u0430\u0432., " + expCount + " \u0437\u0430\u043F. \u043E\u043F\u044B\u0442\u0430</div></div>" + reparseIcon + "</div>";
    }).join("");
    listEl.querySelectorAll(".har-my-resume-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest('[data-action="reparse-resume"]')) return;
        const idx = parseInt(item.getAttribute("data-resume-idx"), 10);
        const resume = resumes[idx];
        if (!resume) return;
        setActiveResumeState(resume);
        setActiveResume(resume);
        renderResumePanel();
        renderMyResumesPanel();
      });
    });
  }
  function renderResumeListPanel() {
    const container = refs.shadowRoot?.getElementById("res-parsed-data");
    if (!container) return;
    const list = panelState.resumeList;
    if (!list || list.length === 0) {
      container.innerHTML = '<div class="har-empty">\u0421\u043F\u0438\u0441\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u0443\u0441\u0442.<br>\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C\xBB \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430.</div>';
      return;
    }
    container.innerHTML = '<div class="har-resume-list-header">\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: ' + list.length + "</div>" + list.map((r) => {
      const isActive = panelState.resume && panelState.resume.id === r.id;
      return '<div class="har-resume-list-item ' + (isActive ? "har-resume-list-active" : "") + '"><a href="' + esc(r.url) + '" target="_blank" class="har-resume-list-link">' + esc(r.title) + "</a>" + (isActive ? '<span class="har-resume-loaded-badge">\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E</span>' : "") + "</div>";
    }).join("") + '<div class="har-resume-list-hint">\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435 \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C\xBB.</div>';
    container.querySelectorAll(".har-resume-list-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(link.getAttribute("href"), "_blank");
      });
    });
  }
  var init_render_my_resumes = __esm({
    "src/ui/tabs/resumes/render-my-resumes.js"() {
      init_state();
      init_html2();
      init_render_resume_panel();
      init_resume_detail2();
      init_storage();
    }
  });

  // src/ui/tabs/resumes/section-builders.js
  function buildPersonalSection(r) {
    const count = [r.name, r.title, r.address, r.gender || r.age].filter(Boolean).length;
    return buildSubAccordion(
      "subPersonal",
      "chevPersonal",
      "\u041B\u0438\u0447\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435",
      count + " \u043F\u043E\u043B\u0435\u0439",
      "#059669",
      buildGrid([
        ["\u0418\u043C\u044F", r.name],
        ["\u041F\u043E\u0437\u0438\u0446\u0438\u044F", r.title],
        ["\u0413\u043E\u0440\u043E\u0434", r.address],
        ["\u041F\u043E\u043B", r.gender],
        ["\u0412\u043E\u0437\u0440\u0430\u0441\u0442", r.age]
      ])
    );
  }
  function buildSalarySection(r) {
    const count = [r.salary, r.employmentType, r.workFormat, r.schedule, r.relocation].filter(Boolean).length;
    return buildSubAccordion(
      "subSalary",
      "chevSalary",
      "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F",
      count + " \u043F\u043E\u043B\u0435\u0439",
      "#2563EB",
      buildGrid([
        ["\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430", r.salary],
        ["\u0417\u0430\u043D\u044F\u0442\u043E\u0441\u0442\u044C", r.employmentType],
        ["\u0424\u043E\u0440\u043C\u0430\u0442", r.workFormat],
        ["\u0413\u0440\u0430\u0444\u0438\u043A", r.schedule],
        ["\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u044F", r.relocation]
      ])
    );
  }
  function buildExperienceSection(r) {
    const expCount = (r.experience || []).length;
    const expContent = (r.experience || []).map((j, idx) => {
      const companyParts = [];
      if (j.company) companyParts.push(esc(j.company));
      if (j.period) companyParts.push(esc(j.period));
      const companyLine = companyParts.join(" \u2022 ");
      const isLast = idx === expCount - 1;
      return '<div style="margin-bottom:' + (isLast ? "0" : "8px") + ";padding-bottom:" + (isLast ? "0" : "8px") + ";" + (isLast ? "" : "border-bottom:1px solid rgba(0,0,0,0.05);") + '"><div style="font-weight:600;">' + esc(j.position || "?") + "</div>" + (companyLine ? '<div style="color:#71717a;margin-top:2px;">' + companyLine + "</div>" : "") + (j.description ? '<div style="color:#71717a;margin-top:3px;font-size:11px;">' + esc(j.description) + "</div>" : "") + "</div>";
    }).join("");
    return buildSubAccordion(
      "subExp",
      "chevExp",
      "\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B",
      expCount + " \u043C\u0435\u0441\u0442",
      "#B45309",
      expCount > 0 ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;">' + expContent + "</div>" : '<div style="padding:8px;font-size:11px;color:#71717a;">\u041E\u043F\u044B\u0442 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D</div>'
    );
  }
  function buildEducationSection(r) {
    const eduCount = (r.education || []).length;
    const eduContent = (r.education || []).map((e) => {
      return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;margin-bottom:6px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + (e.name ? '<span style="color:#71717a;">\u0412\u0423\u0417</span><span style="font-weight:500;">' + esc(e.name) + "</span>" : "") + (e.description ? '<span style="color:#71717a;">\u0424\u0430\u043A\u0443\u043B\u044C\u0442\u0435\u0442</span><span style="font-weight:500;">' + esc(e.description) + "</span>" : "") + (e.year ? '<span style="color:#71717a;">\u0413\u043E\u0434</span><span style="font-weight:500;">' + esc(e.year) + "</span>" : "") + (e.degree ? '<span style="color:#71717a;">\u0421\u0442\u0435\u043F\u0435\u043D\u044C</span><span style="font-weight:500;">' + esc(e.degree) + "</span>" : "") + "</div></div>";
    }).join("");
    return buildSubAccordion(
      "subEdu",
      "chevEdu",
      "\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435",
      eduCount + " \u0437\u0430\u043F\u0438\u0441\u0435\u0439",
      "#7C3AED",
      eduCount > 0 ? eduContent : '<div style="padding:8px;font-size:11px;color:#71717a;">\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E</div>'
    );
  }
  function buildLanguagesSection(r) {
    const langCount = (r.languages || []).length;
    const langContent = (r.languages || []).length > 0 ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + (r.languages || []).map((l) => {
      if (typeof l === "string") {
        const parts = l.split(/\s*[—–-]\s*/);
        const lang = parts[0] || l;
        const level = parts[1] || "\u2014";
        return '<span style="color:#71717a;">' + esc(lang) + '</span><span style="font-weight:500;">' + esc(level) + "</span>";
      }
      return '<span style="color:#71717a;">' + esc(l.name || l) + '</span><span style="font-weight:500;">' + esc(l.level || "\u2014") + "</span>";
    }).join("") + "</div></div>" : '<div style="padding:8px;font-size:11px;color:#71717a;">\u042F\u0437\u044B\u043A\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B</div>';
    return buildSubAccordion(
      "subLang",
      "chevLang",
      "\u042F\u0437\u044B\u043A\u0438",
      langCount + " \u044F\u0437\u044B\u043A\u043E\u0432",
      "#EC4899",
      langContent
    );
  }
  function buildContactsSection(r) {
    const contactCount = [r.phone, r.email, r.telegram].filter(Boolean).length;
    return buildSubAccordion(
      "subContacts",
      "chevContacts",
      "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B",
      contactCount + " \u043F\u043E\u043B\u0435\u0439",
      "#71717a",
      buildGrid([
        ["\u0422\u0435\u043B\u0435\u0444\u043E\u043D", r.phone],
        ["Email", r.email],
        ["Telegram", r.telegram]
      ])
    );
  }
  var init_section_builders = __esm({
    "src/ui/tabs/resumes/section-builders.js"() {
      init_html2();
      init_resume_helpers();
    }
  });

  // src/ui/tabs/resumes/resume-accordion-header.js
  function calcExperienceYears(resume) {
    if (!resume.experience || resume.experience.length === 0) return 0;
    let totalMonths = 0;
    for (const job of resume.experience) {
      if (job.period) {
        const yearMatch = job.period.match(/(\d+)\s*(лет|год|года|г\.)/i);
        const monthMatch = job.period.match(/(\d+)\s*мес/i);
        if (yearMatch) totalMonths += parseInt(yearMatch[1], 10) * 12;
        if (monthMatch) totalMonths += parseInt(monthMatch[1], 10);
      }
    }
    return Math.round(totalMonths / 12);
  }
  function yearWord(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return "\u043B\u0435\u0442";
    if (mod10 === 1) return "\u0433\u043E\u0434";
    if (mod10 >= 2 && mod10 <= 4) return "\u0433\u043E\u0434\u0430";
    return "\u043B\u0435\u0442";
  }
  function updateAccordionHeader(resume) {
    const titleEl = refs.shadowRoot?.getElementById("res-title");
    const subtitleEl = refs.shadowRoot?.getElementById("res-subtitle");
    const badgeEl = refs.shadowRoot?.getElementById("res-parsed-badge");
    const avatarEl = refs.shadowRoot?.getElementById("res-avatar");
    if (resume && resume.id) {
      if (titleEl) titleEl.textContent = "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435";
      if (subtitleEl) {
        const parts = [];
        if (resume.name) parts.push(resume.name);
        else if (resume.title) parts.push(resume.title);
        const expYears = calcExperienceYears(resume);
        if (expYears > 0) parts.push(expYears + " " + yearWord(expYears) + " \u043E\u043F\u044B\u0442\u0430");
        if (resume.skills && resume.skills.length) parts.push(resume.skills.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432");
        subtitleEl.textContent = parts.join(" \u2022 ") || "\u0420\u0435\u0437\u044E\u043C\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E";
      }
      if (badgeEl) {
        const vis = resume.visibility || (resume.hidden ? "hidden" : "unknown");
        if (vis === "hidden") {
          badgeEl.textContent = "\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 (\u0441\u043A\u0440\u044B\u0442\u043E)";
          badgeEl.className = "badge badge-amber";
        } else {
          badgeEl.textContent = "\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435";
          badgeEl.className = "badge badge-green";
        }
        badgeEl.style.fontSize = "11px";
      }
      if (avatarEl) {
        const initials = getInitials(resume.name || resume.title || resume.gender || "?");
        avatarEl.textContent = initials;
      }
    } else {
      if (titleEl) titleEl.textContent = "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435";
      if (subtitleEl) subtitleEl.textContent = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u043D\u0438\u0436\u0435";
      if (badgeEl) {
        badgeEl.textContent = "\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E";
        badgeEl.className = "badge badge-zinc";
        badgeEl.style.fontSize = "11px";
      }
      if (avatarEl) avatarEl.textContent = "?";
    }
  }
  var init_resume_accordion_header = __esm({
    "src/ui/tabs/resumes/resume-accordion-header.js"() {
      init_state();
      init_resume_helpers();
    }
  });

  // src/lib/quality-ats.js
  function analyzeATS(r) {
    const checks = [];
    let earned = 0;
    let total = 0;
    const add = (label, weight, passed, tip) => {
      checks.push({ label, weight, passed, tip });
      total += weight;
      if (passed) earned += weight;
    };
    add(
      "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B (\u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 email)",
      12,
      !!(r.phone || r.email),
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 email \u2014 ATS \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F"
    );
    const skillCount = (r.skills || []).length;
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 \u0443\u043A\u0430\u0437\u0430\u043D\u044B",
      15,
      skillCount > 0,
      "\u0411\u0435\u0437 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 ATS \u043D\u0435 \u043D\u0430\u0439\u0434\u0451\u0442 \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u0430\u043C"
    );
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 \u2265 5 (\u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u043F\u043E\u0440\u043E\u0433)",
      8,
      skillCount >= 5,
      "\u041C\u0435\u043D\u044C\u0448\u0435 5 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u2014 ATS-\u043F\u043E\u0438\u0441\u043A \u043D\u0435 \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u0432\u0430\u0441 \u043F\u043E \u0431\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432"
    );
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 \u2265 10 (\u0445\u043E\u0440\u043E\u0448\u0435\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435)",
      5,
      skillCount >= 10,
      "10+ \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u0437\u043D\u0430\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0440\u0430\u0441\u0448\u0438\u0440\u044F\u044E\u0442 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u0443\u044E \u0432\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C"
    );
    add(
      "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u043E\u0437\u0438\u0446\u0438\u0438",
      10,
      !!(r.title && r.title.length > 2),
      "\u0411\u0435\u0437 \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u0438 ATS \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u043D\u0435\u0441\u0442\u0438 \u0432\u0430\u0441 \u043A \u043D\u0443\u0436\u043D\u043E\u0439 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438"
    );
    add(
      "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F",
      5,
      !!r.salary,
      "\u041C\u043D\u043E\u0433\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0443\u044E\u0442 \u043F\u043E \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0435 \u2014 \u0431\u0435\u0437 \u043D\u0435\u0451 \u0432\u044B \u0432\u044B\u043F\u0430\u0434\u0430\u0435\u0442\u0435 \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u0430"
    );
    add(
      "\u041B\u043E\u043A\u0430\u0446\u0438\u044F/\u0433\u043E\u0440\u043E\u0434",
      5,
      !!(r.address && r.address.length > 2),
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0433\u043E\u0440\u043E\u0434 \u2014 \u0438\u043D\u0430\u0447\u0435 \u0444\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u043B\u043E\u043A\u0430\u0446\u0438\u0438 \u0432\u0430\u0441 \u043E\u0442\u0441\u0435\u0447\u0451\u0442"
    );
    const expCount = (r.experience || []).length;
    add(
      "\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B \u0443\u043A\u0430\u0437\u0430\u043D",
      12,
      expCount > 0,
      "\u0411\u0435\u0437 \u043E\u043F\u044B\u0442\u0430 ATS \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0444\u0438\u043B\u044C\u0442\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E \u0442\u0440\u0435\u0431\u0443\u0435\u043C\u043E\u043C\u0443 \u0441\u0442\u0430\u0436\u0443"
    );
    const expWithDesc = (r.experience || []).filter((e) => e.description && e.description.length > 30);
    add(
      "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043A \u043E\u043F\u044B\u0442\u0443",
      10,
      expCount > 0 && expWithDesc.length > 0,
      "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0439 ATS \u043D\u0435 \u043D\u0430\u0439\u0434\u0451\u0442 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u0432\u0430\u0448\u0435\u043C \u043E\u043F\u044B\u0442\u0435"
    );
    add(
      "\u0412\u0441\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0441 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C",
      5,
      expCount > 0 && expWithDesc.length === expCount,
      "\u041A\u0430\u0436\u0434\u0430\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0438\u043C\u0435\u0442\u044C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u2014 \u0438\u043D\u0430\u0447\u0435 ATS \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430"
    );
    add(
      "\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435",
      5,
      (r.education || []).length > 0,
      "\u041C\u043D\u043E\u0433\u0438\u0435 ATS-\u0444\u0438\u043B\u044C\u0442\u0440\u044B \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0433\u043E \u043E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u044F"
    );
    add(
      "\u0422\u0438\u043F \u0437\u0430\u043D\u044F\u0442\u043E\u0441\u0442\u0438",
      5,
      !!r.employmentType,
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0438\u043F \u0437\u0430\u043D\u044F\u0442\u043E\u0441\u0442\u0438 \u2014 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u0443\u0435\u0442 \u043F\u043E \u043D\u0435\u043C\u0443"
    );
    add(
      "\u0424\u043E\u0440\u043C\u0430\u0442 \u0440\u0430\u0431\u043E\u0442\u044B",
      3,
      !!r.workFormat,
      "\u0423\u0434\u0430\u043B\u0451\u043D\u043D\u0430\u044F/\u043E\u0444\u0438\u0441/\u0433\u0438\u0431\u0440\u0438\u0434 \u2014 \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439 \u0444\u0438\u043B\u044C\u0442\u0440 \u043D\u0430 hh.ru"
    );
    const score = total > 0 ? Math.round(earned / total * 100) : 0;
    return { score, checks, earned, total };
  }
  var init_quality_ats = __esm({
    "src/lib/quality-ats.js"() {
    }
  });

  // src/lib/quality-patterns.js
  var ACHIEVEMENT_VERBS, VAGUE_PHRASES, METRIC_PATTERNS;
  var init_quality_patterns = __esm({
    "src/lib/quality-patterns.js"() {
      ACHIEVEMENT_VERBS = [
        "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B",
        "\u0443\u043C\u0435\u043D\u044C\u0448\u0438\u043B",
        "\u0441\u043E\u043A\u0440\u0430\u0442\u0438\u043B",
        "\u043F\u043E\u0432\u044B\u0441\u0438\u043B",
        "\u0441\u043D\u0438\u0437\u0438\u043B",
        "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u0432\u043D\u0435\u0434\u0440\u0438\u043B",
        "\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u043B",
        "\u0441\u043E\u0437\u0434\u0430\u043B",
        "\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0430\u043B",
        "\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u0443\u0441\u043A\u043E\u0440\u0438\u043B",
        "\u0443\u043B\u0443\u0447\u0448\u0438\u043B",
        "\u043D\u0430\u0441\u0442\u0440\u043E\u0438\u043B",
        "\u043C\u0438\u0433\u0440\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u0440\u0435\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043B",
        "\u0441\u043F\u0440\u043E\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u043F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u043B",
        "\u0432\u044B\u043F\u0443\u0441\u0442\u0438\u043B",
        "\u0438\u043D\u0442\u0435\u0433\u0440\u0438\u0440\u043E\u0432\u0430\u043B",
        "\u0432\u044B\u0441\u0442\u0440\u043E\u0438\u043B",
        "\u043F\u043E\u0441\u0442\u0440\u043E\u0438\u043B",
        "\u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0438\u043B",
        "\u0434\u043E\u0441\u0442\u0438\u0433",
        "\u043F\u0435\u0440\u0435\u0432\u0451\u043B",
        "\u043F\u0435\u0440\u0435\u0432\u0435\u043B",
        "\u043E\u0431\u0443\u0447\u0438\u043B",
        "\u043D\u0430\u043B\u0430\u0434\u0438\u043B",
        "\u043E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u043B",
        "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B\u0430",
        "\u0443\u043C\u0435\u043D\u044C\u0448\u0438\u043B\u0430",
        "\u0441\u043E\u043A\u0440\u0430\u0442\u0438\u043B\u0430",
        "\u043F\u043E\u0432\u044B\u0441\u0438\u043B\u0430",
        "\u0441\u043D\u0438\u0437\u0438\u043B\u0430",
        "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B\u0430",
        "\u0432\u043D\u0435\u0434\u0440\u0438\u043B\u0430",
        "\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u043B\u0430",
        "\u0441\u043E\u0437\u0434\u0430\u043B\u0430",
        "\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0430",
        "\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B\u0430",
        "\u0443\u0441\u043A\u043E\u0440\u0438\u043B\u0430",
        "\u0443\u043B\u0443\u0447\u0448\u0438\u043B\u0430",
        "\u043D\u0430\u0441\u0442\u0440\u043E\u0438\u043B\u0430",
        "\u043C\u0438\u0433\u0440\u0438\u0440\u043E\u0432\u0430\u043B\u0430",
        "\u0440\u0435\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043B\u0430",
        "\u0441\u043F\u0440\u043E\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043B\u0430",
        "\u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043B\u0430",
        "\u043F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u043B\u0430",
        "\u0432\u044B\u043F\u0443\u0441\u0442\u0438\u043B\u0430"
      ];
      VAGUE_PHRASES = [
        "\u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432",
        "\u043F\u0440\u0438\u043D\u0438\u043C\u0430\u043B \u0443\u0447\u0430\u0441\u0442\u0438\u0435",
        "\u043F\u0440\u0438\u043D\u0438\u043C\u0430\u043B\u0430 \u0443\u0447\u0430\u0441\u0442\u0438\u0435",
        "\u043F\u043E\u043C\u043E\u0449\u044C \u0432",
        "\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u043B \u043F\u043E\u043C\u043E\u0449\u044C",
        "\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u043B\u0430 \u043F\u043E\u043C\u043E\u0449\u044C",
        "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441",
        "\u0437\u0430\u043D\u044F\u0442\u0438\u0435",
        "\u043F\u0440\u043E\u0446\u0435\u0441\u0441",
        "\u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435",
        "\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
        "\u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0436\u0434\u0435\u043D\u0438\u0435",
        "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435",
        "\u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435"
      ];
      METRIC_PATTERNS = [
        /(?:на|до|с|от)\s*\d+[\s]*%/,
        // на 15%, до 30%
        /\d+[\s]*(?:раз|крат)/,
        // в 3 раза
        /(?:более|свыше|больше)\s*\d+/,
        // более 100
        /\d+[\s]*(?:человек|сотрудник|пользовател|клиент|заказчик|проект|сервер|микросервис|репозитор|задач|тикет|тикит)/i,
        /\d+[\s]*(?:тыс|млн|миллион|тысяч)/i,
        // тыс. рублей
        /\d[\d\s]*(?:руб|\$|€)/,
        // деньги
        /(?:экономия|экономил|рост|прирост|снижение|сокращение|ускорение)\s.*\d/i
      ];
    }
  });

  // src/lib/quality-experience.js
  function analyzeExperience(r) {
    const exps = r.experience || [];
    const skills = r.skills || [];
    const title = r.title || "";
    if (exps.length === 0) {
      return { score: 0, checks: [], earned: 0, total: 0, metrics: {} };
    }
    const checks = [];
    let earned = 0;
    let total = 0;
    const add = (label, weight, passed, tip) => {
      checks.push({ label, weight, passed, tip });
      total += weight;
      if (passed) earned += weight;
    };
    const allDescriptions = exps.map((e) => e.description || "").filter((d) => d.length > 0);
    const descText = allDescriptions.join(" ");
    const hasMetrics = METRIC_PATTERNS.some((p) => p.test(descText));
    const metricCount = METRIC_PATTERNS.filter((p) => p.test(descText)).length;
    add(
      "\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445",
      18,
      hasMetrics,
      'HR \u0438\u0449\u0435\u0442 \u0446\u0438\u0444\u0440\u044B: "\u043D\u0430 30%", "\u0432 2 \u0440\u0430\u0437\u0430", "100+ \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432" \u2014 \u0431\u0435\u0437 \u043D\u0438\u0445 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 = \u043F\u0435\u0440\u0435\u0447\u0435\u043D\u044C \u043E\u0431\u044F\u0437\u0430\u043D\u043D\u043E\u0441\u0442\u0435\u0439'
    );
    add(
      "3+ \u043C\u0435\u0442\u0440\u0438\u043A\u0438",
      7,
      metricCount >= 3,
      "3 \u0438 \u0431\u043E\u043B\u0435\u0435 \u043C\u0435\u0442\u0440\u0438\u043A \u2014 \u0441\u0438\u0433\u043D\u0430\u043B \u0447\u0442\u043E \u0432\u044B \u0444\u043E\u043A\u0443\u0441\u0438\u0440\u0443\u0435\u0442\u0435\u0441\u044C \u043D\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430\u0445, \u0430 \u043D\u0435 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435"
    );
    const descLower = descText.toLowerCase();
    const achievementVerbCount = ACHIEVEMENT_VERBS.filter((v) => descLower.includes(v)).length;
    add(
      "\u0413\u043B\u0430\u0433\u043E\u043B\u044B \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439",
      12,
      achievementVerbCount > 0,
      '\u041D\u0430\u0447\u0438\u043D\u0430\u0439\u0442\u0435 \u0441 "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B", "\u0432\u043D\u0435\u0434\u0440\u0438\u043B", "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B" \u2014 \u044D\u0442\u043E \u044F\u0437\u044B\u043A \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432, \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u043D\u043D\u043E\u0441\u0442\u0435\u0439'
    );
    const vagueCount = VAGUE_PHRASES.filter((v) => descLower.includes(v)).length;
    add(
      "\u0411\u0435\u0437 \u0440\u0430\u0437\u043C\u044B\u0442\u044B\u0445 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043E\u043A",
      8,
      vagueCount === 0,
      '\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u0435 "\u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432", "\u043F\u043E\u043C\u043E\u0449\u044C \u0432" \u043D\u0430 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B'
    );
    const expsWithDesc = exps.filter((e) => e.description && e.description.length > 50);
    add(
      "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043A \u043F\u043E\u0437\u0438\u0446\u0438\u044F\u043C",
      10,
      expsWithDesc.length > 0,
      "HR \u043D\u0435 \u0432\u0438\u0434\u0438\u0442 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0432 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u2014 \u0447\u0442\u043E \u0432\u044B \u0442\u0430\u043C \u0434\u0435\u043B\u0430\u043B\u0438?"
    );
    add(
      "\u0412\u0441\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0441 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C \u226550 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
      5,
      exps.length > 0 && expsWithDesc.length === exps.length,
      "\u041A\u0430\u0436\u0434\u0430\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0437\u0430\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u0435\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0445\u043E\u0442\u044F \u0431\u044B \u0432 2-3 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F"
    );
    const skillLower = skills.map((s) => s.toLowerCase().trim());
    const skillsInDesc = skillLower.filter((s) => s.length > 2 && descLower.includes(s));
    const skillCoverage = skillLower.length > 0 ? Math.round(skillsInDesc.length / skillLower.length * 100) : 0;
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B \u0432 \u043E\u043F\u044B\u0442\u0435",
      10,
      skillsInDesc.length >= 3,
      "HR \u0441\u0432\u0435\u0440\u044F\u0435\u0442: \u043D\u0430\u0432\u044B\u043A\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445 \u043E\u043F\u044B\u0442\u0430"
    );
    const positions = exps.map((e) => e.position || "").filter((p) => p.length > 0);
    const hasProgression = detectProgression(positions);
    add(
      "\u041A\u0430\u0440\u044C\u0435\u0440\u043D\u044B\u0439 \u0440\u043E\u0441\u0442",
      8,
      hasProgression,
      "\u0420\u043E\u0441\u0442 \u043E\u0442 Junior \u2192 Middle \u2192 Senior \u2014 \u0441\u0438\u043B\u044C\u043D\u044B\u0439 \u0441\u0438\u0433\u043D\u0430\u043B \u0434\u043B\u044F HR"
    );
    const titleRelevant = title.length > 0 && positions.some(
      (p) => p.toLowerCase().includes(title.toLowerCase().split(/\s+/)[0]) || title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && p.toLowerCase().includes(w))
    );
    add(
      "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u0430 \u043E\u043F\u044B\u0442\u0443",
      7,
      titleRelevant || positions.length === 0,
      "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0439 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u2014 \u0438\u043D\u0430\u0447\u0435 HR \u0437\u0430\u043F\u0443\u0442\u0430\u0435\u0442\u0441\u044F"
    );
    const aboutLen = (r.additionalInfo || "").length;
    add(
      '\u0411\u043B\u043E\u043A "\u041E \u0441\u0435\u0431\u0435"',
      5,
      aboutLen > 50,
      "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u0430\u043C\u043C\u0430\u0440\u0438 \u0438\u0437 2-3 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u2014 \u043F\u0435\u0440\u0432\u043E\u0435, \u0447\u0442\u043E \u0447\u0438\u0442\u0430\u0435\u0442 HR"
    );
    const score = total > 0 ? Math.round(earned / total * 100) : 0;
    return {
      score,
      checks,
      earned,
      total,
      metrics: { metricCount, achievementVerbCount, vagueCount, skillCoverage }
    };
  }
  function detectProgression(positions) {
    if (positions.length < 2) return false;
    const lvl = (p) => {
      const pl = p.toLowerCase();
      if (/(?:^|[\s/(-])(intern|стажёр|стажер|junior|младш|trainee)(?:$|[\s/)-,.])/i.test(pl)) return 1;
      if (/(?:^|[\s/(-])(middle|средн)(?:$|[\s/)-,.])/i.test(pl)) return 2;
      if (/(?:^|[\s/(-])(senior|ведущ|старш|lead|principal|staff)(?:$|[\s/)-,.])/i.test(pl)) return 3;
      if (/(?:^|[\s/(-])(head|руководител|руководств|director|директор|начальник|cто|cto|vp)(?:$|[\s/)-,.])/i.test(pl)) return 4;
      return 2;
    };
    for (let i = 0; i < positions.length - 1; i++) {
      const currentLvl = lvl(positions[i]);
      for (let j = i + 1; j < positions.length; j++) {
        if (lvl(positions[j]) > currentLvl) return true;
      }
    }
    return false;
  }
  var init_quality_experience = __esm({
    "src/lib/quality-experience.js"() {
      init_quality_patterns();
    }
  });

  // src/lib/quality-date-helpers.js
  function findEmploymentGaps(exps) {
    const gaps = [];
    const parsedDates = exps.map((e) => parsePeriodDates(e.period || e.duration || ""));
    for (let i = 0; i < parsedDates.length - 1; i++) {
      const curr = parsedDates[i];
      const next = parsedDates[i + 1];
      if (curr.end && next.start) {
        const gapMonths = monthDiff(curr.end, next.start);
        if (gapMonths > 3) {
          const label = gapMonths >= 12 ? Math.round(gapMonths / 12) + " \u0433." : gapMonths + " \u043C\u0435\u0441.";
          gaps.push({ label, months: gapMonths });
        }
      }
    }
    return gaps;
  }
  function parsePeriodDates(period) {
    const result = { start: null, end: null };
    const m = period.match(
      /([а-яА-ЯёЁ]+\s+\d{4})\s*[—–-]\s*([а-яА-ЯёЁ]+\s+\d{4}|Настоящее\s+время|настоящее\s+время|по\s+настоящее)/i
    );
    if (m) {
      result.start = parseRuDate(m[1]);
      if (!/настоящее/i.test(m[2])) {
        result.end = parseRuDate(m[2]);
      }
      return result;
    }
    const m2 = period.match(/(\d{4})\s*[—–-]\s*(\d{4})/);
    if (m2) {
      result.start = new Date(parseInt(m2[1]), 0);
      result.end = new Date(parseInt(m2[2]), 11);
    }
    return result;
  }
  function parseDurationToMonths(duration) {
    if (!duration) return 0;
    let months = 0;
    const ym = duration.match(/(\d+)\s*(?:лет|год|года)/i);
    if (ym) months += parseInt(ym[1]) * 12;
    const mm = duration.match(/(\d+)\s*(?:мес)/i);
    if (mm) months += parseInt(mm[1]);
    return months;
  }
  function parseRuDate(str) {
    const s = str.trim().toLowerCase();
    for (const [prefix, month] of Object.entries(RU_MONTHS)) {
      if (s.startsWith(prefix)) {
        const year = parseInt(s.match(/\d{4}/)?.[0] || "0");
        if (year > 1990 && year <= 2030) return new Date(year, month);
      }
    }
    return null;
  }
  function monthDiff(d1, d2) {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  }
  var RU_MONTHS;
  var init_quality_date_helpers = __esm({
    "src/lib/quality-date-helpers.js"() {
      RU_MONTHS = {
        "\u044F\u043D\u0432\u0430\u0440": 0,
        "\u0444\u0435\u0432\u0440\u0430\u043B": 1,
        "\u043C\u0430\u0440\u0442": 2,
        "\u0430\u043F\u0440\u0435\u043B": 3,
        "\u043C\u0430": 4,
        "\u0438\u044E\u043D": 5,
        "\u0438\u044E\u043B": 6,
        "\u0430\u0432\u0433\u0443\u0441\u0442": 7,
        "\u0441\u0435\u043D\u0442\u044F\u0431\u0440": 8,
        "\u043E\u043A\u0442\u044F\u0431\u0440": 9,
        "\u043D\u043E\u044F\u0431\u0440": 10,
        "\u0434\u0435\u043A\u0430\u0431\u0440": 11
      };
    }
  });

  // src/lib/quality-flags.js
  function detectRedFlags(r) {
    const flags = [];
    const exps = r.experience || [];
    if (exps.length >= 2) {
      const gaps = findEmploymentGaps(exps);
      if (gaps.length > 0) {
        flags.push("\u041F\u0440\u043E\u0431\u0435\u043B \u0432 \u0441\u0442\u0430\u0436\u0435: " + gaps.map((g) => g.label).join(", ") + " \u2014 HR \u0441\u043F\u0440\u043E\u0441\u0438\u0442 \u043E\u0431 \u044D\u0442\u043E\u043C");
      }
    }
    const shortJobs = exps.filter((e) => {
      const months = parseDurationToMonths(e.duration || e.period || "");
      return months > 0 && months < 6;
    });
    if (shortJobs.length >= 2) {
      flags.push(shortJobs.length + " \u043C\u0435\u0441\u0442\u0430 < 6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u2014 \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043A\u0430\u043A \u043D\u0435\u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C");
    }
    const noDesc = exps.filter((e) => !e.description || e.description.length < 20);
    if (noDesc.length > 0 && exps.length > 0) {
      flags.push(noDesc.length + " \u0438\u0437 " + exps.length + " \u043F\u043E\u0437\u0438\u0446\u0438\u0439 \u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u2014 HR \u043D\u0435 \u043F\u043E\u0439\u043C\u0451\u0442 \u0432\u0430\u0448 \u0432\u043A\u043B\u0430\u0434");
    }
    if (!r.phone && !r.email) {
      flags.push("\u041D\u0435\u0442 \u043D\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430, \u043D\u0438 email \u2014 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F");
    }
    const allDesc = exps.map((e) => e.description || "").join(" ").toLowerCase();
    const vagueCount = VAGUE_PHRASES.filter((v) => allDesc.includes(v)).length;
    if (vagueCount >= 2) {
      flags.push('\u0420\u0430\u0437\u043C\u044B\u0442\u044B\u0435 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438: "\u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432", "\u043F\u043E\u043C\u043E\u0449\u044C \u0432" \u2014 \u0437\u0432\u0443\u0447\u0438\u0442 \u043A\u0430\u043A \u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C, \u0430 \u043D\u0435 \u0434\u0435\u044F\u0442\u0435\u043B\u044C');
    }
    if ((r.skills || []).length === 0) {
      flags.push("\u041D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043D\u0430\u0432\u044B\u043A\u0430 \u2014 ATS \u043D\u0435 \u043D\u0430\u0439\u0434\u0451\u0442 \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435");
    }
    if (!r.additionalInfo || r.additionalInfo.length < 20) {
      flags.push('\u041D\u0435\u0442 \u0431\u043B\u043E\u043A\u0430 "\u041E \u0441\u0435\u0431\u0435" \u2014 HR \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0441\u0442\u0440\u043E \u043F\u043E\u043D\u044F\u0442\u044C \u0432\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C');
    }
    return flags;
  }
  function detectStrengths(r) {
    const strengths = [];
    const exps = r.experience || [];
    const skills = r.skills || [];
    const allDesc = exps.map((e) => e.description || "").join(" ");
    const descLower = allDesc.toLowerCase();
    const metricCount = METRIC_PATTERNS.filter((p) => p.test(allDesc)).length;
    if (metricCount >= 3) {
      strengths.push("\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0432 \u043E\u043F\u044B\u0442\u0435 \u2014 " + metricCount + " \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430");
    } else if (metricCount >= 1) {
      strengths.push("\u0415\u0441\u0442\u044C \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u2014 \u043E\u0442\u043B\u0438\u0447\u043D\u043E, \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0435\u0449\u0451");
    }
    const verbCount = ACHIEVEMENT_VERBS.filter((v) => descLower.includes(v)).length;
    if (verbCount >= 3) {
      strengths.push("\u042F\u0437\u044B\u043A \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439 \u2014 " + verbCount + ' \u0433\u043B\u0430\u0433\u043E\u043B\u043E\u0432 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 ("\u0432\u043D\u0435\u0434\u0440\u0438\u043B", "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B")');
    } else if (verbCount >= 1) {
      strengths.push("\u0415\u0441\u0442\u044C \u0433\u043B\u0430\u0433\u043E\u043B\u044B \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439 \u2014 \u0443\u0441\u0438\u043B\u044C\u0442\u0435 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F");
    }
    if (skills.length >= 10) {
      strengths.push("\u0428\u0438\u0440\u043E\u043A\u0438\u0439 \u043D\u0430\u0431\u043E\u0440 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 (" + skills.length + ") \u2014 \u0445\u043E\u0440\u043E\u0448\u0435\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 ATS-\u043F\u043E\u0438\u0441\u043A\u0430");
    } else if (skills.length >= 5) {
      strengths.push("\u041D\u0435\u043F\u043B\u043E\u0445\u043E\u0439 \u043D\u0430\u0431\u043E\u0440 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 (" + skills.length + ") \u2014 \u043C\u043E\u0436\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0435\u0449\u0451");
    }
    const skillLower = skills.map((s) => s.toLowerCase().trim());
    const skillsInDesc = skillLower.filter((s) => s.length > 2 && descLower.includes(s));
    if (skillsInDesc.length >= 5) {
      strengths.push(skillsInDesc.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445 \u043E\u043F\u044B\u0442\u0430 \u2014 credibility");
    }
    const positions = exps.map((e) => e.position || "").filter((p) => p.length > 0);
    if (detectProgression(positions)) {
      strengths.push("\u041A\u0430\u0440\u044C\u0435\u0440\u043D\u044B\u0439 \u0440\u043E\u0441\u0442 \u0432 \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044F\u0445 \u2014 HR \u0432\u0438\u0434\u0438\u0442 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435");
    }
    if (r.phone && r.email) {
      strengths.push("\u041F\u043E\u043B\u043D\u044B\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B (\u0442\u0435\u043B\u0435\u0444\u043E\u043D + email) \u2014 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u043B\u0435\u0433\u043A\u043E \u0441\u0432\u044F\u0436\u0435\u0442\u0441\u044F");
    }
    if (r.additionalInfo && r.additionalInfo.length > 100) {
      strengths.push('\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 \u0431\u043B\u043E\u043A "\u041E \u0441\u0435\u0431\u0435" \u2014 HR \u0431\u044B\u0441\u0442\u0440\u043E \u043F\u043E\u0439\u043C\u0451\u0442 \u0432\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C');
    }
    const longDescs = exps.filter((e) => e.description && e.description.length > 200);
    if (longDescs.length >= 2) {
      strengths.push("\u0414\u0435\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043E\u043F\u044B\u0442\u0430 \u2014 HR \u0432\u0438\u0434\u0438\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u0438\u043A\u0443, \u0430 \u043D\u0435 \u043E\u0431\u0449\u0438\u0435 \u0444\u0440\u0430\u0437\u044B");
    }
    return strengths;
  }
  function buildRecommendations(ats, exp, flags, r) {
    const recs = [];
    const atsFailed = ats.checks.filter((c) => !c.passed).sort((a, b) => b.weight - a.weight);
    for (const c of atsFailed.slice(0, 2)) {
      recs.push({ priority: "critical", text: c.tip });
    }
    const expFailed = exp.checks.filter((c) => !c.passed).sort((a, b) => b.weight - a.weight);
    for (const c of expFailed.slice(0, 2)) {
      recs.push({ priority: "high", text: c.tip });
    }
    for (const f of flags.slice(0, 2)) {
      recs.push({ priority: "high", text: f });
    }
    if ((r.skills || []).length > 0 && (r.experience || []).length > 0) {
      const skillLower = (r.skills || []).map((s) => s.toLowerCase().trim());
      const descText = (r.experience || []).map((e) => e.description || "").join(" ").toLowerCase();
      const uncovered = skillLower.filter((s) => s.length > 2 && !descText.includes(s));
      if (uncovered.length > 3) {
        recs.push({
          priority: "medium",
          text: uncovered.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u043D\u0435 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u044E\u0442\u0441\u044F \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445 \u043E\u043F\u044B\u0442\u0430 \u2014 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0445 \u0432 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442"
        });
      }
    }
    return recs;
  }
  var init_quality_flags = __esm({
    "src/lib/quality-flags.js"() {
      init_quality_patterns();
      init_quality_experience();
      init_quality_date_helpers();
    }
  });

  // src/lib/resume-quality-analyzer.js
  function analyzeResumeQuality(r) {
    if (!r || !r.id) return {
      totalScore: 0,
      atsScore: 0,
      experienceScore: 0,
      redFlags: [],
      strengths: [],
      recommendations: [],
      details: { ats: { score: 0, checks: [] }, experience: { score: 0, checks: [], metrics: {} } }
    };
    const ats = analyzeATS(r);
    const exp = analyzeExperience(r);
    const flags = detectRedFlags(r);
    const strengths = detectStrengths(r);
    const recommendations = buildRecommendations(ats, exp, flags, r);
    const flagPenalty = Math.min(30, flags.length * 7);
    const totalScore = Math.max(0, Math.round(
      ats.score * 0.4 + exp.score * 0.4 + 100 * 0.2 - flagPenalty
    ));
    return {
      totalScore,
      atsScore: ats.score,
      experienceScore: exp.score,
      redFlags: flags,
      strengths,
      recommendations,
      details: { ats, experience: exp }
    };
  }
  var init_resume_quality_analyzer = __esm({
    "src/lib/resume-quality-analyzer.js"() {
      init_quality_ats();
      init_quality_experience();
      init_quality_flags();
    }
  });

  // src/ui/tabs/resumes/render-resume-panel.js
  function renderResumePanel() {
    const container = refs.shadowRoot?.getElementById("res-parsed-data");
    if (!container) return;
    const r = panelState.resume;
    if (!r || !r.id) {
      const synced = panelState.myResumes || [];
      if (!panelState._resumeCleared && synced.length > 0 && synced[0].id) {
        setActiveResumeState(synced[0]);
        setActiveResume(synced[0]);
        renderResumePanel();
        return;
      }
      if (panelState.resumeList && panelState.resumeList.length > 0) {
        renderResumeListPanel();
        return;
      }
      const pageType = getResumePageType();
      let hint = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0438\u0436\u0435 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0440\u0435\u0437\u044E\u043C\u0435.";
      if (pageType === "resume-list") {
        hint = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435\xBB \u043D\u0438\u0436\u0435.";
      } else if (pageType === "resume-detail") {
        hint = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0412\u0437\u044F\u0442\u044C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B\xBB \u043D\u0438\u0436\u0435.";
      }
      container.innerHTML = '<div class="har-empty">\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E.<br>' + hint + "</div>";
      updateAccordionHeader(null);
      return;
    }
    updateAccordionHeader(r);
    const body = refs.shadowRoot?.getElementById("res-parsing-body");
    if (body && !body.classList.contains("open")) {
      body.classList.add("open");
      const chevron = body.previousElementSibling?.querySelector(".timeline-chevron");
      if (chevron) chevron.classList.add("open");
    }
    const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
    container.innerHTML = '<div class="tl-item">' + buildPersonalSection(r) + '</div><div class="tl-item">' + buildSalarySection(r) + '</div><div class="tl-item">' + buildExperienceSection(r) + '</div><div class="tl-item">' + buildEducationSection(r) + '</div><div class="tl-item">' + buildLanguagesSection(r) + '</div><div class="tl-item">' + buildContactsSection(r) + "</div>" + (vis === "hidden" ? '<div style="font-size:10px;color:#92400e;padding:6px 4px 0 28px;">\u0421\u043A\u0440\u044B\u0442\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C \u2014 \u043C\u044D\u0442\u0447\u0438\u043D\u0433 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D</div>' : "");
    attachSubToggle("subPersonal", "chevPersonal");
    attachSubToggle("subSalary", "chevSalary");
    attachSubToggle("subExp", "chevExp");
    attachSubToggle("subEdu", "chevEdu");
    attachSubToggle("subLang", "chevLang");
    attachSubToggle("subContacts", "chevContacts");
    updateSkillsSection(r);
    updateResumeScore(r);
    renderMyResumesPanel();
  }
  function updateResumeScore(r) {
    const section = refs.shadowRoot?.getElementById("res-score-section");
    if (!section) return;
    if (!r || !r.id) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const result = analyzeResumeQuality(r);
    const pct = result.totalScore;
    const ring = refs.shadowRoot?.getElementById("res-score-ring");
    if (ring) {
      const deg = Math.round(pct * 3.6);
      const color = pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626";
      ring.style.background = "conic-gradient(" + color + " 0deg " + deg + "deg, #e4e4e7 " + deg + "deg 360deg)";
      const inner = ring.querySelector("div");
      if (inner) {
        inner.textContent = pct + "%";
        inner.style.color = color;
      }
    }
    const subtitle = refs.shadowRoot?.getElementById("res-score-subtitle");
    if (subtitle) {
      if (pct >= 80) subtitle.textContent = "\u0421\u0438\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u2014 ATS \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442, HR \u0437\u0430\u043C\u0435\u0442\u0438\u0442";
      else if (pct >= 60) subtitle.textContent = "\u0425\u043E\u0440\u043E\u0448\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u2014 \u0435\u0441\u0442\u044C \u0447\u0442\u043E \u0443\u0441\u0438\u043B\u0438\u0442\u044C";
      else if (pct >= 40) subtitle.textContent = "\u0421\u0440\u0435\u0434\u043D\u0435\u0435 \u2014 ATS \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0441\u0435\u044F\u0442\u044C, HR \u043D\u0435 \u0443\u0432\u0438\u0434\u0438\u0442 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438";
      else subtitle.textContent = "\u0421\u043B\u0430\u0431\u043E\u0435 \u2014 \u0432\u044B\u0441\u043E\u043A\u0430\u044F \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0441\u0442\u044C \u043E\u0442\u0441\u0435\u0432\u0430 \u043D\u0430 \u044D\u0442\u0430\u043F\u0435 ATS";
    }
    const atsScoreEl = refs.shadowRoot?.getElementById("res-ats-score");
    const atsBar = refs.shadowRoot?.getElementById("res-ats-bar");
    if (atsScoreEl) {
      const atsColor = result.atsScore >= 70 ? "#059669" : result.atsScore >= 40 ? "#D97706" : "#DC2626";
      atsScoreEl.textContent = result.atsScore + "%";
      atsScoreEl.style.color = atsColor;
    }
    if (atsBar) atsBar.style.width = result.atsScore + "%";
    const expScoreEl = refs.shadowRoot?.getElementById("res-exp-score");
    const expBar = refs.shadowRoot?.getElementById("res-exp-bar");
    if (expScoreEl) {
      const expColor = result.experienceScore >= 70 ? "#2563EB" : result.experienceScore >= 40 ? "#D97706" : "#DC2626";
      expScoreEl.textContent = result.experienceScore + "%";
      expScoreEl.style.color = expColor;
    }
    if (expBar) expBar.style.width = result.experienceScore + "%";
    const redFlagsContainer = refs.shadowRoot?.getElementById("res-red-flags");
    const redFlagsList = refs.shadowRoot?.getElementById("res-red-flags-list");
    if (redFlagsContainer && redFlagsList) {
      if (result.redFlags.length > 0) {
        redFlagsContainer.style.display = "";
        redFlagsList.innerHTML = result.redFlags.map(
          (f) => '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#FEF2F2;border-radius:6px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span style="color:#991B1B;line-height:1.4;">' + esc(f) + "</span></div>"
        ).join("");
      } else {
        redFlagsContainer.style.display = "none";
      }
    }
    const strengthsContainer = refs.shadowRoot?.getElementById("res-strengths");
    const strengthsList = refs.shadowRoot?.getElementById("res-strengths-list");
    if (strengthsContainer && strengthsList) {
      if (result.strengths.length > 0) {
        strengthsContainer.style.display = "";
        strengthsList.innerHTML = result.strengths.map(
          (s) => '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#F0FDF4;border-radius:6px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span style="color:#166534;line-height:1.4;">' + esc(s) + "</span></div>"
        ).join("");
      } else {
        strengthsContainer.style.display = "none";
      }
    }
    const recsContainer = refs.shadowRoot?.getElementById("res-recommendations");
    const recsList = refs.shadowRoot?.getElementById("res-recommendations-list");
    if (recsContainer && recsList) {
      if (result.recommendations.length > 0) {
        recsContainer.style.display = "";
        recsList.innerHTML = result.recommendations.map((rec) => {
          const priorityColor = rec.priority === "critical" ? "#991B1B" : rec.priority === "high" ? "#92400E" : "#71717a";
          const priorityBg = rec.priority === "critical" ? "#FEF2F2" : rec.priority === "high" ? "#FFFBEB" : "#FAFAFA";
          const priorityBorder = rec.priority === "critical" ? "1px solid rgba(220,38,38,0.15)" : rec.priority === "high" ? "1px solid rgba(217,119,6,0.15)" : "1px solid #e4e4e7";
          return '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:' + priorityBg + ";border:" + priorityBorder + ';border-radius:6px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg><span style="color:' + priorityColor + ';line-height:1.4;">' + esc(rec.text) + "</span></div>";
        }).join("");
      } else {
        recsContainer.style.display = "none";
      }
    }
  }
  var init_render_resume_panel = __esm({
    "src/ui/tabs/resumes/render-resume-panel.js"() {
      init_state();
      init_html2();
      init_resume_detail2();
      init_resume_helpers();
      init_render_my_resumes();
      init_section_builders();
      init_storage();
      init_resume_accordion_header();
      init_resume_quality_analyzer();
    }
  });

  // src/ui/tabs/resumes/index.js
  var init_resumes = __esm({
    "src/ui/tabs/resumes/index.js"() {
      init_render_resume_panel();
      init_render_my_resumes();
      init_resume_helpers();
      init_section_builders();
    }
  });

  // src/ui/tabs/resumes.js
  var init_resumes2 = __esm({
    "src/ui/tabs/resumes.js"() {
      init_resumes();
      init_resume_detail2();
    }
  });

  // src/lib/resume-fetch-helpers.js
  async function fetchHtml(url) {
    const resp = await fetch(url, {
      credentials: "include",
      headers: { "Accept": "text/html" }
    });
    if (!resp.ok) throw new Error("fetch " + url + " -> " + resp.status);
    return resp.text();
  }
  function htmlToDoc(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  }
  function safeGetText2(el, fallback) {
    fallback = fallback || "";
    if (!el || !(el instanceof Element)) return fallback;
    const text = (el.textContent || "").trim();
    return text.length > 0 ? text : fallback;
  }
  function extractResumeLinks(anchorList) {
    const resumes = [];
    anchorList.forEach((link) => {
      const href = link.getAttribute("href") || "";
      let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
      if (!hashMatch) return;
      const id = hashMatch[1];
      if (id.length < MIN_HASH_LEN) return;
      if (resumes.find((r) => r.id === id)) return;
      const rawLinkText = link.textContent || "";
      const vis = detectVisibilityFromLinkText(rawLinkText);
      const title = cleanResumeTitle(rawLinkText);
      const resumeUrl = "https://hh.ru/applicant/resumes/view?resume=" + id;
      resumes.push({ id, title, url: resumeUrl, visibility: vis.visibility, hidden: vis.hidden });
      if (vis.visibility !== VISIBILITY_UNKNOWN) {
        helperLog.info("LinkText visibility: " + id.substring(0, 8) + "=" + vis.visibility + " (method=" + vis.method + ', title="' + title.substring(0, 30) + '")');
      }
    });
    return resumes;
  }
  function extractFromScripts(doc, html) {
    const resumes = [];
    const scripts = doc.querySelectorAll("script");
    scripts.forEach((script) => {
      const text = script.textContent || "";
      const matches = text.matchAll(/resume[=/]\\?"?([a-f0-9]{32,})/g);
      for (const m of matches) {
        const id = m[1];
        if (!resumes.find((r) => r.id === id)) {
          resumes.push({
            id,
            title: "Resume " + id.substring(0, 8),
            url: "https://hh.ru/applicant/resumes/view?resume=" + id
          });
        }
      }
    });
    if (resumes.length === 0) {
      const jsonMatches = html.matchAll(/"resumeId"\s*:\s*"([a-f0-9]+)"/g);
      for (const m of jsonMatches) {
        const id = m[1];
        if (!resumes.find((r) => r.id === id)) {
          resumes.push({
            id,
            title: "Resume " + id.substring(0, 8),
            url: "https://hh.ru/applicant/resumes/view?resume=" + id
          });
        }
      }
    }
    if (resumes.length > 0) {
      helperLog.info("Found " + resumes.length + " resumes from script/JSON data");
    }
    return resumes;
  }
  var helperLog;
  var init_resume_fetch_helpers = __esm({
    "src/lib/resume-fetch-helpers.js"() {
      init_anti_hallucination();
      init_resume_constants();
      helperLog = createLogger("ResumeFetchH");
    }
  });

  // src/lib/resume-fetch-list-vis-strategies.js
  function extractVisibilityFromScripts(doc, resumes, html) {
    let found = false;
    const scripts = doc.querySelectorAll("script");
    scripts.forEach((script) => {
      const text = script.textContent || "";
      if (!text || text.length < 100) return;
      resumes.forEach((r) => {
        if (r.visibility !== VISIBILITY_UNKNOWN) return;
        const hashIdx = text.indexOf(r.id);
        if (hashIdx === -1) return;
        const nearby = text.substring(Math.max(0, hashIdx - 200), Math.min(text.length, hashIdx + 500));
        if (/"hidden"\s*:\s*true/.test(nearby) || /"visibility"\s*:\s*"hidden"/.test(nearby) || /"status"\s*:\s*"hidden"/.test(nearby) || /"isHidden"\s*:\s*true/.test(nearby)) {
          r.visibility = VISIBILITY_HIDDEN;
          r.hidden = true;
          found = true;
          visLog.info("  Script visibility: " + r.id.substring(0, 8) + "=hidden (JSON pattern)");
        }
      });
    });
    for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
      const qaMatch = sel.match(/data-qa="([^"]+)"/) || sel.match(/data-qa\*="([^"]+)"/);
      if (!qaMatch) continue;
      const qaValue = qaMatch[1];
      const qaPattern = 'data-qa="' + qaValue;
      const qaIdx = findAllPositions(html, qaPattern);
      if (qaIdx.length > 0) {
        visLog.info('  Found data-qa="' + qaValue + '" at positions: ' + qaIdx.join(", "));
        qaIdx.forEach((pos) => {
          const before = html.substring(Math.max(0, pos - 3e3), pos).toLowerCase();
          let nearestId = null;
          let nearestDist = Infinity;
          resumes.forEach((r) => {
            const idx = before.lastIndexOf(r.id.toLowerCase());
            if (idx !== -1 && before.length - idx < nearestDist) {
              nearestDist = before.length - idx;
              nearestId = r;
            }
          });
          if (nearestId && nearestId.visibility === VISIBILITY_UNKNOWN) {
            nearestId.visibility = VISIBILITY_HIDDEN;
            nearestId.hidden = true;
            found = true;
            visLog.info("  data-qa visibility: " + nearestId.id.substring(0, 8) + "=hidden");
          }
        });
      }
    }
    return found;
  }
  function runProximitySearch(resumes, html) {
    visLog.info("Strategy 3: proximity search with <script> stripping");
    const cleanHtml = stripScripts(html);
    const cleanLower = cleanHtml.toLowerCase();
    const cleanForSearch = cleanLower.replace(/&nbsp;/g, " ");
    const cleanIndicators = HIDDEN_INDICATORS.map((ind) => ({ text: ind, pos: cleanForSearch.indexOf(ind) }));
    const hasCleanIndicators = cleanIndicators.some((i) => i.pos !== -1);
    visLog.info("  Cleaned HTML: " + cleanHtml.length + " chars (was " + html.length + "), indicators: " + (hasCleanIndicators ? cleanIndicators.filter((i) => i.pos !== -1).map((i) => '"' + i.text + '"@' + i.pos).join(", ") : "NONE"));
    const hashPositions = resumes.map((r) => {
      const pos = cleanLower.indexOf(r.id.toLowerCase());
      return { id: r.id, pos };
    }).filter((h) => h.pos !== -1).sort((a, b) => a.pos - b.pos);
    if (hashPositions.length > 0) {
      visLog.info("  Hash positions in cleaned HTML: " + hashPositions.map((h) => h.id.substring(0, 8) + "@" + h.pos).join(", "));
    }
    resumes.forEach((r) => {
      if (r.visibility !== VISIBILITY_UNKNOWN) return;
      const myPos = cleanForSearch.indexOf(r.id.toLowerCase());
      if (myPos === -1) {
        visLog.info("  " + r.id.substring(0, 8) + ": hash not found in cleaned HTML");
        return;
      }
      const nextResume = hashPositions.find((h) => h.pos > myPos && h.id !== r.id);
      const boundary = nextResume ? nextResume.pos : cleanForSearch.length;
      const searchStart = Math.max(0, myPos - 500);
      const searchEnd = Math.min(myPos + SEARCH_RADIUS, boundary);
      const zone = cleanForSearch.substring(searchStart, searchEnd);
      const isHidden = hasHiddenIndicator(zone);
      r.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_UNKNOWN;
      r.hidden = isHidden;
      visLog.info("  " + r.id.substring(0, 8) + "=" + r.visibility + " (zone " + searchStart + "-" + searchEnd + ", next=" + (nextResume ? nextResume.id.substring(0, 8) : "none") + ", indicators=" + (isHidden ? "FOUND" : "none") + ")");
    });
  }
  function findAllPositions(html, pattern) {
    const positions = [];
    const lower = html.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(pattern, idx)) !== -1) {
      positions.push(idx);
      idx += pattern.length;
    }
    return positions;
  }
  var visLog, SEARCH_RADIUS;
  var init_resume_fetch_list_vis_strategies = __esm({
    "src/lib/resume-fetch-list-vis-strategies.js"() {
      init_anti_hallucination();
      init_resume_constants();
      visLog = createLogger("ResumeFetchH");
      SEARCH_RADIUS = 5e3;
    }
  });

  // src/lib/resume-fetch-list-vis.js
  function extractVisibilityStatus(doc, resumes, html) {
    if (resumes.length === 0) return;
    if (!html) {
      visLog2.warn("extractVisibilityStatus: no raw HTML provided, skipping");
      return;
    }
    const htmlLower = html.toLowerCase();
    let alreadyDetected = 0;
    let needDetection = 0;
    resumes.forEach((r) => {
      if (r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE) alreadyDetected++;
      else needDetection++;
    });
    resumes.forEach((r) => {
      const link = Array.from(doc.querySelectorAll("a[href]")).find((a) => {
        const h = a.getAttribute("href") || "";
        return h.includes(r.id);
      });
      if (link) {
        const raw = link.textContent || "";
        const norm = normalizeWs(raw);
        const hasInd = hasHiddenIndicator(raw);
        visLog2.info("  DEBUG " + r.id.substring(0, 8) + ": rawLen=" + raw.length + " hasNbsp=" + (raw.indexOf("\xA0") !== -1) + ' normalized="' + norm.substring(0, 80) + '" hasHidden=' + hasInd + " vis=" + r.visibility);
      }
    });
    visLog2.info("Visibility scan: " + resumes.length + " resumes (" + alreadyDetected + " already from link text, " + needDetection + " need detection)");
    if (needDetection === 0) {
      visLog2.info("All resumes already detected from link text \u2014 skipping other strategies");
      logVisibilitySummary(resumes);
      return;
    }
    const globalIndicators = HIDDEN_INDICATORS.map((ind) => ({ text: ind, pos: htmlLower.indexOf(ind) }));
    const hasAnyIndicators = globalIndicators.some((i) => i.pos !== -1);
    visLog2.info("Indicators in HTML: " + (hasAnyIndicators ? globalIndicators.filter((i) => i.pos !== -1).map((i) => '"' + i.text + '"@' + i.pos).join(", ") : "NONE FOUND"));
    let strategyUsed = false;
    for (const sel of RESUME_CARD_SELECTORS) {
      const cards = doc.querySelectorAll(sel);
      if (cards.length === 0) continue;
      visLog2.info("Strategy 1: Found " + cards.length + " cards with selector: " + sel);
      let matched = 0;
      cards.forEach((card) => {
        const link = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
        if (!link) return;
        const href = link.getAttribute("href") || "";
        let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
        if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
        if (!hashMatch) return;
        const id = hashMatch[1];
        const resume = resumes.find((r) => r.id === id);
        if (!resume || resume.visibility !== VISIBILITY_UNKNOWN) return;
        const result = detectVisibilityFromCard(card);
        resume.visibility = result.visibility;
        resume.hidden = result.hidden;
        matched++;
        visLog2.info("  Card: " + id.substring(0, 8) + "=" + result.visibility + " (method=" + result.method + ")");
      });
      if (matched > 0) {
        visLog2.info("Strategy 1: matched " + matched + "/" + needDetection + " unknown resumes via data-qa cards");
        break;
      }
    }
    const stillUnknown = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN).length;
    if (stillUnknown === 0) strategyUsed = true;
    else if (!strategyUsed) visLog2.info("Strategy 1: no data-qa cards matched, trying next strategy");
    if (!strategyUsed) {
      const scriptResult = extractVisibilityFromScripts(doc, resumes, html);
      if (scriptResult) {
        visLog2.info("Strategy 2: found visibility in script/hydration state");
        strategyUsed = true;
      }
    }
    if (!strategyUsed) {
      runProximitySearch(resumes, html);
      strategyUsed = true;
    }
    const unknownAfterAll = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (unknownAfterAll.length > 0) {
      visLog2.info("[VIS-DIAG] List: " + unknownAfterAll.length + " resumes still UNKNOWN \u2014 will be resolved by detail page detection");
      unknownAfterAll.forEach((r) => {
        visLog2.info("[VIS-DIAG]   List: " + r.id.substring(0, 8) + ' "' + (r.title || "").substring(0, 30) + '" \u2192 ' + r.visibility);
      });
    }
    logVisibilitySummary(resumes);
  }
  function logVisibilitySummary(resumes) {
    const summary = resumes.map((r) => r.id.substring(0, 8) + "=" + r.visibility).join(", ");
    visLog2.info("Visibility result: [" + summary + "]");
  }
  var visLog2;
  var init_resume_fetch_list_vis = __esm({
    "src/lib/resume-fetch-list-vis.js"() {
      init_anti_hallucination();
      init_resume_constants();
      init_resume_fetch_list_vis_strategies();
      visLog2 = createLogger("ResumeFetchH");
    }
  });

  // src/lib/resume-fetch-list.js
  async function fetchResumeList() {
    fetchLog.info("Fetching /applicant/resumes ...");
    let html;
    try {
      html = await fetchHtml("https://hh.ru/applicant/resumes");
    } catch (err) {
      fetchLog.error("Failed to fetch /applicant/resumes: " + err.message);
      return [];
    }
    if (!html || html.length < 500) {
      fetchLog.warn("Got very short response (" + (html ? html.length : 0) + " chars), likely redirect");
      return [];
    }
    const doc = htmlToDoc(html);
    const allAnchors = doc.querySelectorAll("a[href]");
    fetchLog.info("Fetched HTML: " + html.length + " chars, " + allAnchors.length + " links");
    const resumes = extractResumeLinks(allAnchors);
    extractVisibilityStatus(doc, resumes, html);
    if (resumes.length === 0) {
      fetchLog.info("No links found, trying embedded script data...");
      const scriptResumes = extractFromScripts(doc, html);
      if (scriptResumes.length > 0) return scriptResumes;
    }
    if (resumes.length === 0 && window.location.pathname.includes("/applicant/resumes")) {
      fetchLog.info("No links from fetch, trying current page DOM...");
      const domLinks = document.querySelectorAll("a[href]");
      const domResumes = extractResumeLinks(domLinks);
      if (domResumes.length > 0) {
        fetchLog.info("Found " + domResumes.length + " resumes from current page DOM");
        return domResumes;
      }
    }
    fetchLog.info("Resume list: " + resumes.length + " resumes found");
    return resumes;
  }
  var fetchLog;
  var init_resume_fetch_list = __esm({
    "src/lib/resume-fetch-list.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_list_vis();
      fetchLog = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-parse.js
  function parseCompanyCardFromDoc(card) {
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
  function parseContactsFromDoc(doc, dbg, resume) {
    const phoneSelectors = [
      '[data-qa="resume-contact-phone"] a',
      '[data-qa="resume-contact-phone"]',
      '[data-qa*="contact-phone"] a',
      '[data-qa*="contact-phone"]'
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
        const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
        if (phoneMatch) {
          resume.phone = dbg("phone (data-qa regex)", phoneMatch[0]);
          break;
        }
      }
    }
    if (!resume.phone) {
      const contactBlock2 = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const telLinks = contactBlock2.querySelectorAll('a[href^="tel:"]');
        if (telLinks.length > 0) {
          resume.phone = dbg("phone (tel link)", telLinks[0].getAttribute("href").replace("tel:", "").trim());
        }
      }
    }
    if (!resume.phone) {
      const contactBlock2 = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const text = contactBlock2.textContent || "";
        const phoneMatch = text.match(/(?:\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
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
      const emailSelectors = [
        '[data-qa="resume-contact-email"] a',
        '[data-qa="resume-contact-email"]'
      ];
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
          const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            resume.email = dbg("email (regex from data-qa)", emailMatch[0]);
            break;
          }
        }
      }
    }
    if (!resume.email) {
      const contactBlock2 = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
      if (contactBlock2) {
        const text = contactBlock2.textContent || "";
        const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) resume.email = dbg("email (regex)", emailMatch[0]);
      }
    }
    const contactBlock = doc.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const contactLinks = contactBlock.querySelectorAll('a[href*="t.me/"]');
      for (const link of contactLinks) {
        const href = link.getAttribute("href") || "";
        const match = href.match(/t\.me\/(\w+)/);
        if (match && !HH_SYSTEM_ACCOUNTS2.includes(match[1].toLowerCase())) {
          resume.telegram = dbg("telegram", "@" + match[1]);
          break;
        }
      }
      if (!resume.telegram) {
        const text = contactBlock.textContent || "";
        const matches = text.matchAll(/@(\w{4,})/g);
        for (const m of matches) {
          if (!HH_SYSTEM_ACCOUNTS2.includes(m[1].toLowerCase())) {
            resume.telegram = dbg("telegram (@)", "@" + m[1]);
            break;
          }
        }
      }
    }
  }
  function parsePersonalDataFromDoc(doc, titleEl, dbg, resume) {
    const personalText = [];
    const posCard = doc.querySelector('[data-qa="resume-position-card"]');
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
          resume.age = dbg("resumeAge", m[1] + " \u043B\u0435\u0442");
        }
      }
      if (!resume.address && t.length > 3) {
        const isGender = GENDER_PATTERNS.some((p) => p.test(t));
        const isAge = AGE_PATTERN.test(t) || AGE_PATTERN2.test(t);
        if (!isGender && !isAge && !t.includes("\u0440\u0443\u0431") && !t.includes("USD") && !t.includes("\u0437/\u043F") && !t.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C") && !t.includes("\u0434\u043E\u0445\u043E\u0434") && t !== resume.salary && t !== resume.title) {
          if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
            resume.address = dbg("resumeAddress", t);
          }
        }
      }
    }
  }
  var GENDER_PATTERNS, AGE_PATTERN, AGE_PATTERN2, HH_SYSTEM_ACCOUNTS2;
  var init_resume_fetch_parse = __esm({
    "src/lib/resume-fetch-parse.js"() {
      init_resume_fetch_helpers();
      GENDER_PATTERNS = [/(?:^|\s)(мужчина|женщина|мужской|женский|male|female)(?:$|\s)/i];
      AGE_PATTERN = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
      AGE_PATTERN2 = /(\d{2})\s*years?\s*old/i;
      HH_SYSTEM_ACCOUNTS2 = ["hh_ru_official", "hhru", "hh_ru", "hhcareers", "headhunter_ru"];
    }
  });

  // src/lib/resume-fetch-resume-page-vis.js
  function detectVisibilityFromResumePage(doc, html) {
    const diag = [];
    const visCard = doc.querySelector('[data-qa="resume-visibility-card"]');
    if (visCard) {
      const cardText = normalizeWs(visCard.textContent || "").toLowerCase();
      if (cardText.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443") || cardText.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443")) {
        diag.push('S0:visibility-card="\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443" \u2192 HIDDEN');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        return { visibility: VISIBILITY_HIDDEN, trace: diag };
      }
      if (cardText.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C") || cardText.includes("\u0432\u0438\u0434\u043D\u043E\xA0\u0432\u0441\u0435\u043C")) {
        diag.push('S0:visibility-card="\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" \u2192 VISIBLE');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        return { visibility: VISIBILITY_VISIBLE, trace: diag };
      }
      diag.push('S0:visibility-card-unknown="' + cardText.substring(0, 40) + '"');
    } else {
      diag.push("S0:no-visibility-card");
    }
    for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
      const found = doc.querySelector(sel);
      if (found) {
        diag.push("S1:data-qa=" + sel + " \u2192 HIDDEN");
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        return { visibility: VISIBILITY_HIDDEN, trace: diag };
      }
    }
    diag.push("S1:no-data-qa-hidden");
    const allButtons = doc.querySelectorAll("button, a");
    let btnDetails = [];
    for (const btn of allButtons) {
      const text = normalizeWs(btn.textContent || "").toLowerCase();
      const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C") || text.includes("\u0432\u0438\u0434\u0438\u043C")) {
        btnDetails.push('"' + text.substring(0, 40) + '"' + (qa ? "[qa=" + qa + "]" : ""));
      }
      if (text.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C")) {
        diag.push('S2:btn="\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C" \u2192 HIDDEN');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        visLog3.info("[VIS-DIAG] All vis-related buttons: " + JSON.stringify(btnDetails));
        return { visibility: VISIBILITY_HIDDEN, trace: diag, btnDetails };
      }
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435")) {
        diag.push('S2:btn="\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435" \u2192 VISIBLE');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        visLog3.info("[VIS-DIAG] All vis-related buttons: " + JSON.stringify(btnDetails));
        return { visibility: VISIBILITY_VISIBLE, trace: diag, btnDetails };
      }
    }
    diag.push("S2:no-key-buttons" + (btnDetails.length ? "(saw:" + btnDetails.length + " partial)" : ""));
    const bodyText = doc.body ? normalizeWs(doc.body.textContent || "") : "";
    if (hasHiddenIndicator(bodyText)) {
      const lower = bodyText.toLowerCase();
      for (const ind of ["\u043C\u043D\u043E\u0433\u0438\u0435 \u043D\u0435 \u0432\u0438\u0434\u044F\u0442", "\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C", "\u043D\u0435 \u0432\u0438\u0434\u043D\u043E"]) {
        const pos = lower.indexOf(ind);
        if (pos !== -1) {
          diag.push('S3:body has "' + ind + '" @' + pos + " \u2192 HIDDEN");
          break;
        }
      }
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
    if (hasVisibleIndicator(bodyText)) {
      diag.push("S3:body has visible indicator \u2192 VISIBLE");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push("S3:body-no-indicators");
    const htmlForSearch = html.replace(/&nbsp;/g, " ").toLowerCase();
    const htmlNorm = normalizeWs(htmlForSearch);
    if (hasHiddenIndicator(htmlNorm)) {
      const lower = htmlNorm.toLowerCase();
      for (const ind of ["\u043C\u043D\u043E\u0433\u0438\u0435 \u043D\u0435 \u0432\u0438\u0434\u044F\u0442", "\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C", "\u043D\u0435 \u0432\u0438\u0434\u043D\u043E"]) {
        const pos = lower.indexOf(ind);
        if (pos !== -1) {
          diag.push('S4:html has "' + ind + '" @' + pos + " \u2192 HIDDEN");
          break;
        }
      }
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
    if (hasVisibleIndicator(htmlNorm)) {
      diag.push("S4:html has visible indicator \u2192 VISIBLE");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push("S4:html-no-indicators");
    const scriptEls = doc.querySelectorAll("script:not([src])");
    let scriptPatterns = [];
    for (const script of scriptEls) {
      const t = script.textContent || "";
      if (t.length < 50) continue;
      const patterns = [
        { re: /"hidden"\s*:\s*true/, name: '"hidden":true' },
        { re: /"isHidden"\s*:\s*true/, name: '"isHidden":true' },
        { re: /"visibility"\s*:\s*"hidden"/, name: '"visibility":"hidden"' },
        { re: /"status"\s*:\s*"hidden"/, name: '"status":"hidden"' }
      ];
      for (const p of patterns) {
        if (p.re.test(t)) scriptPatterns.push(p.name);
      }
    }
    if (scriptPatterns.length > 0) {
      diag.push("S5:script=" + scriptPatterns.join(",") + " \u2192 HIDDEN");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag, scriptPatterns };
    }
    diag.push("S5:no-script-patterns");
    const hideLink = doc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
    if (hideLink) {
      const hideQa = hideLink.getAttribute("data-qa") || "";
      diag.push("S6:hide-link qa=" + hideQa + " \u2192 VISIBLE");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push("S6:no-hide-link");
    const allHideBtns = doc.querySelectorAll('[data-qa*="hide"], [data-qa*="hidden"]');
    if (allHideBtns.length > 0) {
      const hideQas = Array.from(allHideBtns).map((b) => b.getAttribute("data-qa")).filter(Boolean);
      diag.push("EXTRA:hide-qa=" + hideQas.join(","));
    }
    diag.push("\u2192 UNKNOWN");
    visLog3.info("[VIS-DIAG] " + diag.join(" | "));
    return { visibility: VISIBILITY_UNKNOWN, trace: diag };
  }
  var visLog3;
  var init_resume_fetch_resume_page_vis = __esm({
    "src/lib/resume-fetch-resume-page-vis.js"() {
      init_anti_hallucination();
      init_resume_constants();
      visLog3 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-experience.js
  function parseExperienceFromDocStrategies1to3(doc, resume) {
    const allCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const seen = /* @__PURE__ */ new Set();
    const uniqueCards = [];
    allCards.forEach((c) => {
      if (!seen.has(c)) {
        seen.add(c);
        uniqueCards.push(c);
      }
    });
    const entries = [];
    const usedStepperElements = /* @__PURE__ */ new Set();
    uniqueCards.forEach((card) => {
      const job = parseCompanyCardFromDoc(card);
      if (job) entries.push(job);
      const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
      if (stepEl) usedStepperElements.add(stepEl);
    });
    const expCard = doc.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCard) {
      resume._debug.found.push("experienceBlock");
      const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      const alreadyParsed = entries.length;
      stepperItems.forEach((step) => {
        if (usedStepperElements.has(step)) return;
        let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
        if (parentCard && uniqueCards.includes(parentCard)) return;
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || "").trim().replace(/\s*\(\d[^)]+\)$/, "").trim();
        if (job.position || job.period) entries.push(job);
      });
      const stepperAdded = entries.length - alreadyParsed;
      if (stepperAdded > 0) {
        resume._debug.found.push("experience (stepper supplement): +" + stepperAdded);
      }
      if (entries.length === 0) {
        const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
        allStepperItems.forEach((step) => {
          const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
          if (!cellLeft) return;
          const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
          const job = {};
          if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
          if (texts.length >= 2) job.period = (texts[1].textContent || "").trim().replace(/\s*\(\d[^)]+\)$/, "").trim();
          if (job.position) entries.push(job);
        });
        if (entries.length > 0) {
          resume._debug.found.push("experience (stepper full fallback): " + entries.length);
        }
      }
    } else {
      resume._debug.missing.push("experienceBlock (no container, " + uniqueCards.length + " cards)");
    }
    return entries;
  }
  var fetchLog2;
  var init_resume_fetch_experience = __esm({
    "src/lib/resume-fetch-experience.js"() {
      init_anti_hallucination();
      init_resume_fetch_parse();
      fetchLog2 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy4-text.js
  function parseExperienceFromHtmlText(html, alreadyFound) {
    const MONTHS = "\u044F\u043D\u0432\u0430\u0440[\u044C\u0435\u044F]|\u0444\u0435\u0432\u0440\u0430\u043B[\u044C\u044C\u044F]|\u043C\u0430\u0440\u0442[\u0430\u0435]?|\u0430\u043F\u0440\u0435\u043B[\u044C\u044C\u044F]|\u043C\u0430[\u0439\u0438\u044F]|\u0438\u044E\u043D[\u044C\u044C\u044F]|\u0438\u044E\u043B[\u044C\u044C\u044F]|\u0430\u0432\u0433\u0443\u0441\u0442[\u0430\u0435]?|\u0441\u0435\u043D\u0442\u044F\u0431\u0440[\u044C\u044C\u044F]|\u043E\u043A\u0442\u044F\u0431\u0440[\u044C\u044C\u044F]|\u043D\u043E\u044F\u0431\u0440[\u044C\u044C\u044F]|\u0434\u0435\u043A\u0430\u0431\u0440[\u044C\u044C\u044F]";
    const DATE_RANGE_RE = new RegExp(
      "(" + MONTHS + ")\\s*\\d{4}\\s*[\u2014\\-\u2013]\\s*(?:(" + MONTHS + ")\\s*\\d{4}|\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435\\s*\u0432\u0440\u0435\u043C\u044F|\u043F\u043E\\s+\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435\\s+\u0432\u0440\u0435\u043C\u044F)",
      "gi"
    );
    const NUM_DATE_RE = /\d{2}\.\d{4}\s*[—\-–]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s+время)/gi;
    const allDateRanges = [];
    let match;
    while ((match = DATE_RANGE_RE.exec(html)) !== null) {
      allDateRanges.push({ index: match.index, text: match[0] });
    }
    while ((match = NUM_DATE_RE.exec(html)) !== null) {
      allDateRanges.push({ index: match.index, text: match[0] });
    }
    fetchLog3.info("Text pattern: found " + allDateRanges.length + " date ranges in FULL HTML");
    if (allDateRanges.length <= alreadyFound) {
      fetchLog3.info("Text pattern: no more date ranges than already found (" + alreadyFound + ")");
      return [];
    }
    const expStartPatterns = [
      /data-qa="resume-list-card-experience"/i,
      /<h[23][^>]*>.*?опыт\s+работы.*?<\/h[23]>/i,
      /data-qa="resume-block-experience"/i,
      /Опыт\s+работы/i
    ];
    const expEndPatterns = [
      /data-qa="resume-list-card-education"/i,
      /data-qa="resume-block-education"/i,
      /<h[23][^>]*>.*?образование.*?<\/h[23]>/i,
      /Образование/i
    ];
    let expStart = -1;
    for (const pat of expStartPatterns) {
      const m = html.match(pat);
      if (m) {
        expStart = m.index;
        break;
      }
    }
    let expEnd = html.length;
    if (expStart !== -1) {
      for (const pat of expEndPatterns) {
        const m = html.match(pat);
        if (m && m.index > expStart && m.index < expEnd) {
          expEnd = m.index;
        }
      }
    }
    fetchLog3.info("Text pattern: experience section " + expStart + "-" + expEnd);
    const expDateRanges = allDateRanges.filter((dr) => {
      if (expStart === -1) return true;
      return dr.index >= expStart - 200 && dr.index <= expEnd + 200;
    });
    fetchLog3.info("Text pattern: " + expDateRanges.length + " date ranges in experience section");
    if (expDateRanges.length <= alreadyFound) {
      return [];
    }
    const entries = [];
    for (let i = 0; i < expDateRanges.length; i++) {
      const dr = expDateRanges[i];
      const searchBase = expStart !== -1 ? html.substring(expStart, expEnd) : html;
      const searchOffset = expStart !== -1 ? expStart : 0;
      const relIndex = dr.index - searchOffset;
      const lookBack = searchBase.substring(Math.max(0, relIndex - 800), relIndex);
      const nextIdx = i + 1 < expDateRanges.length ? expDateRanges[i + 1].index - searchOffset : searchBase.length;
      const lookForward = searchBase.substring(relIndex + dr.text.length, Math.min(nextIdx, relIndex + dr.text.length + 800));
      const textBefore = stripHtmlTags(lookBack);
      const textAfter = stripHtmlTags(lookForward);
      const job = {};
      job.period = dr.text;
      const linesBefore = textBefore.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 3);
      for (let j = linesBefore.length - 1; j >= 0; j--) {
        const line = linesBefore[j];
        if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
        if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
        if (line.length < 3 || line.length > 200) continue;
        job.position = line;
        break;
      }
      if (job.position) {
        const posIdx = linesBefore.lastIndexOf(job.position);
        for (let j = posIdx - 1; j >= Math.max(0, posIdx - 4); j--) {
          const line = linesBefore[j];
          if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
          if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
          if (line.length < 3 || line.length > 200) continue;
          if (line === job.position) continue;
          job.company = line;
          break;
        }
      }
      const linesAfter = textAfter.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 10);
      if (linesAfter.length > 0 && linesAfter[0].length > 20) {
        job.description = linesAfter[0].substring(0, 300);
      }
      if (job.position || job.company || job.period) {
        entries.push(job);
      }
    }
    return entries;
  }
  function stripHtmlTags(html) {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  }
  var fetchLog3;
  var init_resume_fetch_strategy4_text = __esm({
    "src/lib/resume-fetch-strategy4-text.js"() {
      init_anti_hallucination();
      fetchLog3 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-json-utils.js
  function extractJsonArray(text, startIdx) {
    if (text[startIdx] !== "[") return null;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "[") depth++;
      if (ch === "]") depth--;
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
    return null;
  }
  function extractJsonArrayFromHtml(html, startIdx) {
    if (startIdx >= html.length || html[startIdx] !== "[") return null;
    let depth = 0;
    let inString = false;
    for (let i = startIdx; i < html.length && i < startIdx + 5e5; i++) {
      const ch = html[i];
      if (ch === '"' && (i === 0 || html[i - 1] !== "\\")) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "[") depth++;
      if (ch === "]") depth--;
      if (depth === 0) return html.substring(startIdx, i + 1);
    }
    return null;
  }
  function buildEntryFromApiItem(item) {
    const job = {};
    if (item.position) job.position = item.position;
    if (item.name && !job.position) job.position = item.name;
    if (item.company) job.company = typeof item.company === "string" ? item.company : item.company?.name || "";
    if (item.organization && !job.company) job.company = item.organization;
    if (item.start || item.startDate) {
      const start = item.start || item.startDate;
      const isCurrent = !!(item.current || item.untilNow);
      const rawEnd = item.end || item.endDate;
      const end = rawEnd || (isCurrent ? "\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F" : "");
      if (typeof start === "string") {
        job.period = start + " \u2014 " + end;
      } else if (start && start.year) {
        const months = ["\u044F\u043D\u0432\u0430\u0440\u044C", "\u0444\u0435\u0432\u0440\u0430\u043B\u044C", "\u043C\u0430\u0440\u0442", "\u0430\u043F\u0440\u0435\u043B\u044C", "\u043C\u0430\u0439", "\u0438\u044E\u043D\u044C", "\u0438\u044E\u043B\u044C", "\u0430\u0432\u0433\u0443\u0441\u0442", "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044C", "\u043E\u043A\u0442\u044F\u0431\u0440\u044C", "\u043D\u043E\u044F\u0431\u0440\u044C", "\u0434\u0435\u043A\u0430\u0431\u0440\u044C"];
        const startStr = (start.month ? months[start.month - 1] + " " : "") + start.year;
        let endStr = "\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F";
        if (end && typeof end === "object" && end.year) {
          endStr = (end.month ? months[end.month - 1] + " " : "") + end.year;
        } else if (end && typeof end === "string" && end.length > 0) {
          endStr = end;
        }
        job.period = startStr + " \u2014 " + endStr;
      }
    }
    if (item.description) job.description = item.description;
    return job;
  }
  function findExperienceInObject(obj, depth) {
    if (depth > 6 || !obj || typeof obj !== "object") return null;
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && typeof obj[0] === "object") {
        const first = obj[0];
        if (first.position || first.company || first.startDate || first.start || first.organization) {
          const entries = [];
          obj.forEach((item) => {
            const job = buildEntryFromApiItem(item);
            if (job.position || job.company) entries.push(job);
          });
          return entries.length > 0 ? entries : null;
        }
      }
      return null;
    }
    const priorityKeys = ["experience", "jobs", "positions", "career", "workHistory"];
    for (const key of priorityKeys) {
      if (obj[key]) {
        const result = findExperienceInObject(obj[key], depth + 1);
        if (result) return result;
      }
    }
    for (const key of Object.keys(obj)) {
      if (priorityKeys.includes(key)) continue;
      const result = findExperienceInObject(obj[key], depth + 1);
      if (result) return result;
    }
    return null;
  }
  var fetchLog4;
  var init_resume_fetch_json_utils = __esm({
    "src/lib/resume-fetch-json-utils.js"() {
      init_anti_hallucination();
      fetchLog4 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy5-scanners.js
  function extractExperienceFromStructuredJson(text) {
    const entries = [];
    const expMatch = text.match(/"experience"\s*:\s*\[/);
    if (expMatch) {
      const startIdx = text.indexOf("[", expMatch.index + 12);
      if (startIdx !== -1) {
        const jsonStr = extractJsonArray(text, startIdx);
        if (jsonStr) {
          try {
            const expArray = JSON.parse(jsonStr);
            if (Array.isArray(expArray)) {
              expArray.forEach((item) => {
                const job = buildEntryFromApiItem(item);
                if (job.position || job.company) entries.push(job);
              });
              if (entries.length > 0) return entries;
            }
          } catch (e) {
            fetchLog5.info("Strategy 5: structured JSON parse failed: " + e.message);
          }
        }
      }
    }
    return entries;
  }
  function extractExperienceFromArray(text) {
    const entries = [];
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const arrStart = text.indexOf("[{", searchFrom);
      if (arrStart === -1) break;
      const jsonStr = extractJsonArray(text, arrStart);
      if (!jsonStr || jsonStr.length < 50 || jsonStr.length > 2e5) {
        searchFrom = arrStart + 2;
        continue;
      }
      try {
        const arr = JSON.parse(jsonStr);
        if (!Array.isArray(arr) || arr.length === 0) {
          searchFrom = arrStart + 2;
          continue;
        }
        const firstItem = arr[0];
        if (firstItem && typeof firstItem === "object") {
          const hasExpFields = firstItem.position || firstItem.company || firstItem.startDate || firstItem.start || firstItem.organization || firstItem.name && (firstItem.start || firstItem.startDate);
          if (hasExpFields) {
            arr.forEach((item) => {
              const job = buildEntryFromApiItem(item);
              if (job.position || job.company) entries.push(job);
            });
            if (entries.length > 0) return entries;
          }
        }
      } catch (e) {
      }
      searchFrom = arrStart + 2;
    }
    return entries;
  }
  function deepScanForExperience(html) {
    const entries = [];
    const yearArrayPattern = /\[\{[^]]*?"year"\s*:\s*\d{4}[^]]*?\}/g;
    let match;
    while ((match = yearArrayPattern.exec(html)) !== null) {
      const startIdx = match.index;
      let arrStart = startIdx;
      while (arrStart > 0 && html[arrStart - 1] !== "[") arrStart--;
      if (html[arrStart] !== "[") continue;
      const jsonStr = extractJsonArrayFromHtml(html, arrStart);
      if (!jsonStr) continue;
      try {
        const arr = JSON.parse(jsonStr);
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const hasDates = arr.some(
          (item) => item.year || item.start?.year || item.startDate?.year || item.end?.year || item.endDate?.year
        );
        if (!hasDates) continue;
        const hasExpFields = arr.some(
          (item) => item.position || item.company || item.name || item.organization || item.title
        );
        if (!hasExpFields) continue;
        arr.forEach((item) => {
          const job = buildEntryFromApiItem(item);
          if (job.position || job.company) entries.push(job);
        });
        if (entries.length > 0) return entries;
      } catch (e) {
      }
    }
    return entries;
  }
  var fetchLog5;
  var init_resume_fetch_strategy5_scanners = __esm({
    "src/lib/resume-fetch-strategy5-scanners.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      fetchLog5 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy5-scripts.js
  function parseExperienceFromScripts(doc, html) {
    const entries = [];
    const scripts = doc.querySelectorAll('script[type="application/json"], script:not([src])');
    for (const script of scripts) {
      const text = script.textContent || "";
      if (text.length < 100) continue;
      if (!/experience|работ[аеы]|компани|должност|career|position/i.test(text)) continue;
      fetchLog6.info("Strategy 5: examining script (" + text.length + " chars, first 300: " + text.substring(0, 300).replace(/\n/g, " "));
      const fromStructured = extractExperienceFromStructuredJson(text);
      if (fromStructured.length > 0) {
        fetchLog6.info("Strategy 5: found " + fromStructured.length + " from structured JSON");
        return fromStructured;
      }
      const fromArray = extractExperienceFromArray(text);
      if (fromArray.length > 0) {
        fetchLog6.info("Strategy 5: found " + fromArray.length + " from JSON array scan");
        return fromArray;
      }
    }
    const statePatterns = [
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
      /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/
    ];
    for (const pat of statePatterns) {
      const m = html.match(pat);
      if (m) {
        try {
          const state = JSON.parse(m[1]);
          const exp = findExperienceInObject(state, 0);
          if (exp && exp.length > 0) {
            fetchLog6.info("Strategy 5: found " + exp.length + " from window state");
            return exp;
          }
        } catch (e) {
          fetchLog6.info("Strategy 5: state JSON parse failed: " + e.message);
        }
      }
    }
    const storePatterns = [
      /"resumeStore"\s*:\s*(\{[\s\S]+?\})\s*[,}]/,
      /"resume"\s*:\s*(\{[\s\S]{0,50000}?"experience"\s*:\s*\[[\s\S]+?\])\s*[,}]/
    ];
    for (const pat of storePatterns) {
      const m = html.match(pat);
      if (m) {
        try {
          const store = JSON.parse(m[1]);
          const exp = findExperienceInObject(store, 0);
          if (exp && exp.length > 0) {
            fetchLog6.info("Strategy 5: found " + exp.length + " from store pattern");
            return exp;
          }
        } catch (e) {
          fetchLog6.info("Strategy 5: store JSON parse failed: " + e.message);
        }
      }
    }
    const deepScan = deepScanForExperience(html);
    if (deepScan.length > 0) {
      fetchLog6.info("Strategy 5: found " + deepScan.length + " from deep scan");
      return deepScan;
    }
    return entries;
  }
  var fetchLog6;
  var init_resume_fetch_strategy5_scripts = __esm({
    "src/lib/resume-fetch-strategy5-scripts.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      init_resume_fetch_strategy5_scanners();
      fetchLog6 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-iframe-vis-dom.js
  function checkVisibilityCard(iframeDoc) {
    const visCard = iframeDoc.querySelector('[data-qa="resume-visibility-card"]');
    if (visCard) {
      const cardText = normalizeWs(visCard.textContent || "").toLowerCase();
      if (cardText.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443") || cardText.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443")) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S0:visibility-card="\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443" \u2192 HIDDEN' };
      }
      if (cardText.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C") || cardText.includes("\u0432\u0438\u0434\u043D\u043E\xA0\u0432\u0441\u0435\u043C")) {
        return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S0:visibility-card="\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" \u2192 VISIBLE' };
      }
      return { visibility: null, trace: 'iframe-S0:visibility-card-unknown-text="' + cardText.substring(0, 60) + '"' };
    }
    return { visibility: null, trace: "iframe-S0:no-visibility-card" };
  }
  function checkHiddenDataQa(iframeDoc) {
    for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
      const found = iframeDoc.querySelector(sel);
      if (found) {
        return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S1:data-qa=" + sel + " \u2192 HIDDEN" };
      }
    }
    return { visibility: null, trace: "iframe-S1:no-data-qa-hidden" };
  }
  function checkKeyButtons(allButtons) {
    for (const btn of allButtons) {
      const text = normalizeWs(btn.textContent || "").toLowerCase();
      const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
      if (text.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C") || qa.includes("make-visible") || qa.includes("show-resume")) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S2:btn="\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C" \u2192 HIDDEN' };
      }
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435") || qa.includes("hide-resume") || qa.includes("resume-action-hide")) {
        return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S2:btn="\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435" \u2192 VISIBLE' };
      }
    }
    return { visibility: null, trace: "iframe-S2:no-key-buttons" };
  }
  function checkHideLink(iframeDoc) {
    const hideLink = iframeDoc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
    if (hideLink) {
      return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S4:hide-link-found \u2192 VISIBLE" };
    }
    return { visibility: null, trace: "iframe-S4:no-hide-link" };
  }
  function collectDiagButtons(iframeDoc) {
    const buttons = [];
    const allButtons = iframeDoc.querySelectorAll('button, a, [role="button"]');
    for (const btn of allButtons) {
      const text = normalizeWs(btn.textContent || "").toLowerCase();
      const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
      const href = (btn.getAttribute("href") || "").toLowerCase();
      if (text.includes("\u0432\u0438\u0434\u0438\u043C") || text.includes("\u0441\u043A\u0440\u044B\u0442\u044C") || text.includes("\u0441\u043A\u0440\u044B\u0442") || qa.includes("visible") || qa.includes("hide") || qa.includes("hidden") || qa.includes("show") || href.includes("visible") || href.includes("hide")) {
        buttons.push({ text: text.substring(0, 50), qa, href: href.substring(0, 60), tag: btn.tagName });
      }
    }
    return { buttons, allButtons };
  }
  var init_resume_fetch_iframe_vis_dom = __esm({
    "src/lib/resume-fetch-iframe-vis-dom.js"() {
      init_resume_constants();
    }
  });

  // src/lib/resume-fetch-iframe-vis-adv.js
  function checkBodyIndicators(bodyText) {
    if (hasHiddenIndicator(bodyText)) {
      return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S3:body-has-hidden-indicator \u2192 HIDDEN" };
    }
    if (hasVisibleIndicator(bodyText)) {
      return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S3:body-has-visible-indicator \u2192 VISIBLE" };
    }
    return { visibility: null, trace: "iframe-S3:body-no-indicators" };
  }
  function checkBodyVisibilityText(bodyText) {
    const bodyLower = bodyText.toLowerCase();
    if (bodyLower.includes("\u043D\u0435 \u0432\u0438\u0434\u044F\u0442") || bodyLower.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u044F\u0442") || bodyLower.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E")) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S5:body-has-"\u043D\u0435 \u0432\u0438\u0434\u044F\u0442/\u043D\u0435 \u0432\u0438\u0434\u043D\u043E" \u2192 HIDDEN' };
    }
    if (bodyLower.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C")) {
      return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S5:body-has-"\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" \u2192 VISIBLE' };
    }
    return { visibility: null, trace: null };
  }
  function checkScriptPatterns(iframeDoc) {
    try {
      const scripts = iframeDoc.querySelectorAll("script:not([src])");
      for (const script of scripts) {
        const t = script.textContent || "";
        if (t.length < 50) continue;
        if (/"hidden"\s*:\s*true/.test(t) || /"isHidden"\s*:\s*true/.test(t) || /"visibility"\s*:\s*"hidden"/.test(t) || /"status"\s*:\s*"hidden"/.test(t)) {
          return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S6:script-has-hidden-pattern \u2192 HIDDEN" };
        }
        if (/"hidden"\s*:\s*false/.test(t) || /"visibility"\s*:\s*"visible"/.test(t)) {
          return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S6:script-has-visible-pattern \u2192 VISIBLE" };
        }
      }
    } catch (e) {
      return { visibility: null, trace: "iframe-S6:script-check-error(" + e.message.substring(0, 30) + ")" };
    }
    return { visibility: null, trace: "iframe-S6:no-script-patterns" };
  }
  function checkNotificationBanners(iframeDoc) {
    const notifSelectors = [
      '[data-qa="resume-visibility-notification"]',
      '[data-qa*="visibility-notification"]',
      '[data-qa*="resume-notification"]',
      '[class*="resume-hidden"]',
      '[class*="resume-visibility"]',
      ".resume-status-hidden"
    ];
    for (const sel of notifSelectors) {
      const el = iframeDoc.querySelector(sel);
      if (el) {
        const elText = normalizeWs(el.textContent || "").toLowerCase();
        if (elText.includes("\u043D\u0435 \u0432\u0438\u0434\u044F\u0442") || elText.includes("\u0441\u043A\u0440\u044B\u0442") || elText.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C")) {
          return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S7:notification=" + sel + ' text="' + elText.substring(0, 40) + '" \u2192 HIDDEN' };
        }
      }
    }
    return { visibility: null, trace: "iframe-S7:no-notification-hidden" };
  }
  function checkActionLinks(iframeDoc) {
    const actionLinks = iframeDoc.querySelectorAll('a[href*="visible"], a[href*="show"], a[href*="publish"]');
    for (const link of actionLinks) {
      const href = (link.getAttribute("href") || "").toLowerCase();
      const linkText = normalizeWs(link.textContent || "").toLowerCase();
      if (href.includes("publish") || href.includes("make_visible") || href.includes("show")) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S8:action-link href="' + href.substring(0, 60) + '" text="' + linkText.substring(0, 40) + '" \u2192 HIDDEN' };
      }
    }
    return { visibility: null, trace: "iframe-S8:no-action-links" };
  }
  function collectVisRelatedElements(iframeDoc) {
    const visElements = [];
    const visRelated = iframeDoc.querySelectorAll('[data-qa*="resume"], [data-qa*="visibility"]');
    for (const el of visRelated) {
      const elQa = el.getAttribute("data-qa") || "";
      const elText = normalizeWs(el.textContent || "").substring(0, 60);
      if (elText.includes("\u0441\u043A\u0440\u044B\u0442") || elText.includes("\u0432\u0438\u0434\u0438\u043C") || elText.includes("\u043D\u0435 \u0432\u0438\u0434\u044F\u0442")) {
        visElements.push({ qa: elQa, text: elText });
      }
    }
    return visElements;
  }
  var init_resume_fetch_iframe_vis_adv = __esm({
    "src/lib/resume-fetch-iframe-vis-adv.js"() {
      init_resume_constants();
    }
  });

  // src/lib/resume-fetch-iframe-vis.js
  function tryStrategy(result, trace) {
    if (result.trace) trace.push(result.trace);
    return result.visibility !== null;
  }
  function detectVisibilityFromIframeDoc(iframeDoc) {
    const trace = [];
    const { buttons: diagButtons, allButtons } = collectDiagButtons(iframeDoc);
    visLog4.info("[VIS-IFRAME] Diagnostic buttons: " + JSON.stringify(diagButtons));
    let r = checkVisibilityCard(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkHiddenDataQa(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkKeyButtons(allButtons);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    const bodyText = iframeDoc.body ? normalizeWs(iframeDoc.body.textContent || "") : "";
    r = checkBodyIndicators(bodyText);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkHideLink(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkBodyVisibilityText(bodyText);
    if (r.trace) trace.push(r.trace);
    if (r.visibility) return { visibility: r.visibility, trace };
    r = checkScriptPatterns(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkNotificationBanners(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    r = checkActionLinks(iframeDoc);
    if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };
    const visElements = collectVisRelatedElements(iframeDoc);
    if (visElements.length > 0) {
      visLog4.info("[VIS-IFRAME] Related elements: " + JSON.stringify(visElements));
    }
    trace.push("\u2192 UNKNOWN");
    visLog4.info("[VIS-IFRAME] All strategies exhausted. Buttons found: " + diagButtons.length + ", Related elements: " + visElements.length);
    return { visibility: VISIBILITY_UNKNOWN, trace };
  }
  var visLog4;
  var init_resume_fetch_iframe_vis = __esm({
    "src/lib/resume-fetch-iframe-vis.js"() {
      init_anti_hallucination();
      init_resume_constants();
      init_resume_fetch_iframe_vis_dom();
      init_resume_fetch_iframe_vis_adv();
      visLog4 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy6-iframe.js
  async function fetchExpandedExperienceViaIframe(resumeUrl, currentCount) {
    fetchLog7.info("Strategy 6 iframe: loading " + resumeUrl);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;opacity:0;pointer-events:none;border:none;";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.src = resumeUrl;
    document.body.appendChild(iframe);
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("iframe load timeout (15s)")), 15e3);
        iframe.addEventListener("load", () => {
          clearTimeout(timeout);
          resolve();
        });
        iframe.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("iframe load error"));
        });
      });
      await new Promise((r) => setTimeout(r, 4e3));
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error("Cannot access iframe document (cross-origin or blocked)");
      }
      const iframeDiag = buildIframeDiag(iframeDoc, iframe);
      const iframeVisResult = detectVisibilityFromIframeDoc(iframeDoc);
      iframeVisResult.iframeDiag = iframeDiag;
      fetchLog7.info("[VIS-DIAG] iframe visibility: " + iframeVisResult.visibility + " (trace: " + iframeVisResult.trace.join(" \u2192 ") + ")");
      const preCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
      const preSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      fetchLog7.info("Strategy 6 iframe: before expand \u2014 " + preCards.length + " company-cards, " + preSteppers.length + " stepper-items");
      const clicked = clickExpandButtons(iframeDoc);
      fetchLog7.info("Strategy 6 iframe: clicked " + clicked + " expand buttons");
      if (clicked > 0) {
        await new Promise((r) => setTimeout(r, 2e3));
      }
      const postCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
      const postSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      fetchLog7.info("Strategy 6 iframe: after expand \u2014 " + postCards.length + " company-cards, " + postSteppers.length + " stepper-items");
      const entries = parseExperienceFromIframeDoc(iframeDoc);
      fetchLog7.info("Strategy 6 iframe: parsed " + entries.length + " experience entries");
      return { entries, iframeVis: iframeVisResult.visibility, iframeVisTrace: iframeVisResult.trace, iframeDiag: iframeVisResult.iframeDiag };
    } finally {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (e) {
      }
    }
  }
  function buildIframeDiag(iframeDoc, iframe) {
    const diag = {};
    try {
      diag.finalUrl = iframe.contentWindow?.location?.href || "(no access)";
    } catch (e) {
      diag.finalUrl = "(cross-origin blocked: " + e.message + ")";
    }
    diag.title = iframeDoc.title || "(no title)";
    diag.bodyTextLen = iframeDoc.body ? (iframeDoc.body.textContent || "").length : 0;
    diag.bodyTextSnippet = iframeDoc.body ? normalizeWs(iframeDoc.body.textContent || "").substring(0, 1500) : "(no body)";
    const allQa = iframeDoc.querySelectorAll("[data-qa]");
    diag.dataQaList = Array.from(allQa).slice(0, 50).map((el) => {
      const qa = el.getAttribute("data-qa") || "";
      const text = normalizeWs(el.textContent || "").substring(0, 60);
      return qa + (text ? '="' + text + '"' : "");
    });
    const allActions = iframeDoc.querySelectorAll('button, a, [role="button"]');
    diag.actionTexts = Array.from(allActions).slice(0, 30).map((el) => {
      return normalizeWs(el.textContent || "").substring(0, 50);
    }).filter((t) => t.length > 2);
    fetchLog7.info("[VIS-IFRAME-DIAG] url=" + diag.finalUrl);
    fetchLog7.info('[VIS-IFRAME-DIAG] title="' + diag.title + '"');
    fetchLog7.info("[VIS-IFRAME-DIAG] bodyLen=" + diag.bodyTextLen);
    fetchLog7.info("[VIS-IFRAME-DIAG] bodySnippet=" + diag.bodyTextSnippet.substring(0, 500));
    fetchLog7.info("[VIS-IFRAME-DIAG] dataQa count=" + allQa.length + ", sample: " + JSON.stringify(diag.dataQaList.slice(0, 20)));
    fetchLog7.info("[VIS-IFRAME-DIAG] actions: " + JSON.stringify(diag.actionTexts));
    return diag;
  }
  function clickExpandButtons(iframeDoc) {
    const expandButtons = iframeDoc.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
    let clicked = 0;
    expandButtons.forEach((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text.includes("\u0440\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C") || text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435") || text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451") || text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0451") || text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435") || text.includes("expand")) {
        try {
          btn.click();
          clicked++;
        } catch (e) {
        }
      }
    });
    return clicked;
  }
  function parseExperienceFromIframeDoc(iframeDoc) {
    const allCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const seen = /* @__PURE__ */ new Set();
    const uniqueCards = [];
    allCards.forEach((c) => {
      if (!seen.has(c)) {
        seen.add(c);
        uniqueCards.push(c);
      }
    });
    const entries = [];
    const usedStepperElements = /* @__PURE__ */ new Set();
    uniqueCards.forEach((card) => {
      const job = parseCompanyCardFromDoc(card);
      if (job) entries.push(job);
      const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
      if (stepEl) usedStepperElements.add(stepEl);
    });
    const expCard = iframeDoc.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCard) {
      const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      stepperItems.forEach((step) => {
        if (usedStepperElements.has(step)) return;
        let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
        if (parentCard && uniqueCards.includes(parentCard)) return;
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || "").trim().replace(/\s*\(\d[^)]+\)$/, "").trim();
        if (job.position || job.period) entries.push(job);
      });
    }
    if (entries.length === 0 && expCard) {
      const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      allStepperItems.forEach((step) => {
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || "").trim().replace(/\s*\(\d[^)]+\)$/, "").trim();
        if (job.position) entries.push(job);
      });
    }
    return entries;
  }
  var fetchLog7;
  var init_resume_fetch_strategy6_iframe = __esm({
    "src/lib/resume-fetch-strategy6-iframe.js"() {
      init_anti_hallucination();
      init_resume_fetch_parse();
      init_resume_constants();
      init_resume_fetch_iframe_vis();
      fetchLog7 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy6-api.js
  async function tryApplicantApi(resumeId, currentCount) {
    if (!resumeId) return [];
    const apiUrls = [
      { url: "https://hh.ru/applicant/api/v1/resumes/" + resumeId, source: "applicant-api-v1" },
      { url: "https://hh.ru/applicant/api/resumes/" + resumeId, source: "applicant-api" },
      { url: "https://hh.ru/applicant/resumes/api/get?resumeId=" + resumeId, source: "resumes-api-get" }
    ];
    for (const { url, source } of apiUrls) {
      try {
        fetchLog8.info("Strategy 6: trying API [" + source + "] " + url);
        const resp = await fetch(url, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        if (!resp.ok) {
          fetchLog8.info("Strategy 6: [" + source + "] returned " + resp.status);
          continue;
        }
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await resp.json();
          fetchLog8.info("Strategy 6: [" + source + "] returned JSON with keys: " + (typeof data === "object" ? Object.keys(data).slice(0, 10).join(",") : typeof data));
          const jsonEntries = parseExperienceFromJson(data);
          if (jsonEntries.length > currentCount) {
            fetchLog8.info("Strategy 6: SUCCESS from " + source + " \u2014 got " + jsonEntries.length + " experiences");
            return jsonEntries;
          }
          fetchLog8.info("Strategy 6: [" + source + "] JSON had " + jsonEntries.length + " experiences (need > " + currentCount + ")");
        }
      } catch (err) {
        fetchLog8.info("Strategy 6: [" + source + "] error: " + err.message);
      }
    }
    return [];
  }
  function parseExperienceFromJson(data) {
    const entries = [];
    const exp = data?.experience || data?.resume?.experience || data?.result?.experience || data?.items;
    if (!Array.isArray(exp)) {
      const found = findExperienceInObject(data, 0);
      if (found) {
        found.forEach((item) => {
          const job = buildEntryFromApiItem(item);
          if (job.position || job.company) entries.push(job);
        });
      }
      return entries;
    }
    exp.forEach((item) => {
      const job = buildEntryFromApiItem(item);
      if (job.position || job.company) entries.push(job);
    });
    return entries;
  }
  function parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount) {
    const entries = [];
    const usedStepperElements = /* @__PURE__ */ new Set();
    const allCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const seen = /* @__PURE__ */ new Set();
    const uniqueCards = [];
    allCards.forEach((c) => {
      if (!seen.has(c)) {
        seen.add(c);
        uniqueCards.push(c);
      }
    });
    uniqueCards.forEach((card) => {
      const job = parseCompanyCardFromDoc(card);
      if (job) entries.push(job);
      const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
      if (stepEl) usedStepperElements.add(stepEl);
    });
    const expCard = expandedDoc.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCard) {
      const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      stepperItems.forEach((step) => {
        if (usedStepperElements.has(step)) return;
        let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
        if (parentCard && uniqueCards.includes(parentCard)) return;
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || "").trim().replace(/\s*\(\d[^)]+\)$/, "").trim();
        if (job.position || job.period) entries.push(job);
      });
    }
    if (entries.length <= currentCount && expandedHtml) {
      const textParsed = parseExperienceFromHtmlText(expandedHtml, entries.length);
      if (textParsed.length > entries.length) {
        entries.length = 0;
        entries.push(...textParsed);
      }
    }
    return entries;
  }
  var fetchLog8;
  var init_resume_fetch_strategy6_api = __esm({
    "src/lib/resume-fetch-strategy6-api.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      init_resume_fetch_parse();
      init_resume_fetch_strategy4_text();
      fetchLog8 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy6-urls.js
  function findExpansionUrls(doc, html, resumeId) {
    const urls = [];
    const seen = /* @__PURE__ */ new Set();
    const addUrl = (url, source) => {
      if (!url || url.length < 5) return;
      const fullUrl = url.startsWith("http") ? url : "https://hh.ru" + url;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      urls.push({ url: fullUrl, source });
    };
    const expSection = doc.querySelector('[data-qa="resume-list-card-experience"]');
    const searchRoot = expSection || doc;
    const allButtons = searchRoot.querySelectorAll("button, a[href], [data-url], [data-action-url], [data-fetch-url]");
    allButtons.forEach((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      const isExpandBtn = text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435") || text.includes("\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451") || text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0451") || text.includes("\u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0432\u0441\u0435") || text.includes("\u0440\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C") || text.includes("expand") || btn.getAttribute("data-qa") === "profile-experience-viewAll";
      if (!isExpandBtn) return;
      fetchLog9.info('Strategy 6: found expand button: text="' + text.substring(0, 50) + '" data-qa="' + (btn.getAttribute("data-qa") || "") + '" outerHTML=' + btn.outerHTML.substring(0, 200));
      const href = btn.getAttribute("href") || "";
      if (href && href !== "#" && href !== "javascript:void(0)") {
        addUrl(href, "button-href");
      }
      const dataAttrs = [
        "data-url",
        "data-action-url",
        "data-fetch-url",
        "data-load-url",
        "data-api-url",
        "data-endpoint",
        "data-href",
        "data-target"
      ];
      let el = btn;
      for (let i = 0; i < 5 && el; i++) {
        for (const attr of dataAttrs) {
          const val = el.getAttribute(attr) || "";
          if (val && val.length > 5 && val !== "#") {
            addUrl(val, "button-" + attr + "-ancestor" + i);
          }
        }
        el = el.parentElement;
      }
    });
    const scripts = doc.querySelectorAll("script:not([src])");
    scripts.forEach((script) => {
      const text = script.textContent || "";
      if (text.length < 200) return;
      const urlPatterns = [
        /["'](?:url|fetchUrl|loadMore|nextPage|apiUrl|endpoint|actionUrl|href|target)["']\s*:\s*["']([^"']+)["']/gi,
        /["'](?:loadMore|fetchUrl|nextPage|loadMoreUrl)["']\s*:\s*["']([^"']+)["']/gi
      ];
      for (const pat of urlPatterns) {
        let m;
        while ((m = pat.exec(text)) !== null) {
          const val = m[1];
          if (val && (val.includes("experience") || val.includes("resume") || val.includes("expand") || val.includes("show") || val.includes("load") || val.includes("applicant"))) {
            addUrl(val, "script-url-pattern");
          }
        }
      }
      const pathMatches = text.matchAll(/["'](\/applicant\/[^"']+)["']/g);
      for (const m of pathMatches) {
        addUrl(m[1], "script-applicant-path");
      }
    });
    if (resumeId) {
      addUrl(
        "https://hh.ru/applicant/resumes/view?resume=" + resumeId + "&expand=experience_items",
        "known-pattern-expand-items"
      );
      addUrl(
        "https://hh.ru/applicant/resumes/mine/" + resumeId + "/experience",
        "known-pattern-experience-endpoint"
      );
    }
    return urls;
  }
  async function tryFetchExpandedUrl(url, currentCount) {
    const resp = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "text/html, application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    if (!resp.ok) {
      fetchLog9.info("Strategy 6: " + url + " returned " + resp.status);
      return null;
    }
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      const jsonEntries = parseExperienceFromJson(data);
      fetchLog9.info("Strategy 6: JSON response had " + jsonEntries.length + " experiences");
      return jsonEntries;
    }
    const expandedHtml = await resp.text();
    const expandedDoc = htmlToDoc(expandedHtml);
    const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog9.info("Strategy 6: HTML response had " + expCards.length + " company-cards, " + stepperItems.length + " stepper-items (" + expandedHtml.length + " chars)");
    if (expCards.length > currentCount || stepperItems.length > currentCount) {
      return parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
    }
    const scriptParsed = parseExperienceFromScripts(expandedDoc, expandedHtml);
    if (scriptParsed.length > currentCount) {
      return scriptParsed;
    }
    return null;
  }
  var fetchLog9;
  var init_resume_fetch_strategy6_urls = __esm({
    "src/lib/resume-fetch-strategy6-urls.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_parse();
      init_resume_fetch_strategy5_scripts();
      init_resume_fetch_strategy6_api();
      fetchLog9 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy6-expand.js
  async function fetchExpandedExperience(doc, html, resumeId, currentCount, resumeUrl) {
    fetchLog10.info("Strategy 6: starting (currentCount=" + currentCount + ", resumeId=" + (resumeId || "none") + ")");
    let iframeVis = null;
    let iframeVisTrace = null;
    let iframeDiag = null;
    try {
      const iframeResult = await fetchExpandedExperienceViaIframe(resumeUrl, currentCount);
      iframeVis = iframeResult.iframeVis;
      iframeVisTrace = iframeResult.iframeVisTrace;
      iframeDiag = iframeResult.iframeDiag;
      if (iframeResult.entries.length > currentCount) {
        fetchLog10.info("Strategy 6: SUCCESS via iframe \u2014 got " + iframeResult.entries.length + " experiences, vis=" + iframeVis);
        return {
          entries: iframeResult.entries,
          iframeVis,
          iframeVisTrace,
          iframeDiag
        };
      }
      fetchLog10.info("Strategy 6: iframe got " + iframeResult.entries.length + " entries (not more than " + currentCount + "), but visibility=" + iframeVis);
    } catch (err) {
      fetchLog10.info("Strategy 6: iframe approach failed: " + err.message);
    }
    const withVis = (result) => {
      if (iframeVis) {
        result.iframeVis = iframeVis;
        result.iframeVisTrace = iframeVisTrace;
        result.iframeDiag = iframeDiag;
      }
      return result;
    };
    const expansionUrls = findExpansionUrls(doc, html, resumeId);
    fetchLog10.info("Strategy 6: found " + expansionUrls.length + " candidate expansion URLs");
    expansionUrls.forEach((u, i) => {
      fetchLog10.info("  URL " + i + ": " + u.url + " (source: " + u.source + ")");
    });
    for (const { url, source } of expansionUrls) {
      try {
        fetchLog10.info("Strategy 6: fetching [" + source + "] " + url);
        const urlEntries = await tryFetchExpandedUrl(url, currentCount);
        if (urlEntries && urlEntries.length > currentCount) {
          fetchLog10.info("Strategy 6: SUCCESS from " + source + " \u2014 got " + urlEntries.length + " experiences");
          return withVis({ entries: urlEntries });
        }
      } catch (err) {
        fetchLog10.info("Strategy 6: [" + source + "] error: " + err.message);
      }
    }
    const apiEntries = await tryApplicantApi(resumeId, currentCount);
    if (apiEntries.length > currentCount) {
      return withVis({ entries: apiEntries });
    }
    if (resumeUrl) {
      const expandVariants = [
        { url: resumeUrl + "&expand=experience_items", source: "expand-experience-items" },
        { url: resumeUrl + "&showAll=true", source: "showAll" },
        { url: resumeUrl + "&full=true", source: "full" },
        { url: resumeUrl + "&expand=all", source: "expand-all" }
      ];
      for (const { url, source } of expandVariants) {
        try {
          fetchLog10.info("Strategy 6: trying param [" + source + "] " + url);
          const expandedHtml = await fetchHtml(url);
          const expandedDoc = htmlToDoc(expandedHtml);
          const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
          const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
          fetchLog10.info("Strategy 6: [" + source + "] returned HTML with " + expCards.length + " company-cards, " + stepperItems.length + " stepper-items");
          if (expCards.length > currentCount || stepperItems.length > currentCount) {
            const parsed = parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
            if (parsed.length > currentCount) {
              fetchLog10.info("Strategy 6: SUCCESS from " + source + " \u2014 got " + parsed.length + " experiences");
              return withVis({ entries: parsed });
            }
          }
        } catch (err) {
          fetchLog10.info("Strategy 6: [" + source + "] error: " + err.message);
        }
      }
    }
    fetchLog10.info("Strategy 6: all approaches exhausted, returning current count: " + currentCount + ", vis=" + iframeVis);
    return withVis({ entries: [] });
  }
  var fetchLog10;
  var init_resume_fetch_strategy6_expand = __esm({
    "src/lib/resume-fetch-strategy6-expand.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_strategy6_iframe();
      init_resume_fetch_strategy6_urls();
      init_resume_fetch_strategy6_api();
      fetchLog10 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-resume-exp-orch.js
  async function parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl) {
    const entries = parseExperienceFromDocStrategies1to3(doc, resume);
    if (html && entries.length > 0) {
      const textParsed = parseExperienceFromHtmlText(html, entries.length);
      if (textParsed.length > entries.length) {
        expLog.info("Strategy 4 (text patterns): found " + textParsed.length + " experiences (was " + entries.length + ")");
        resume._debug.found.push("experience (text pattern supplement): " + textParsed.length);
        entries.length = 0;
        entries.push(...textParsed);
      }
    }
    if (html) {
      const scriptParsed = parseExperienceFromScripts(doc, html);
      if (scriptParsed.length > entries.length) {
        expLog.info("Strategy 5 (script JSON): found " + scriptParsed.length + " experiences (was " + entries.length + ")");
        resume._debug.found.push("experience (script JSON): " + scriptParsed.length);
        entries.length = 0;
        entries.push(...scriptParsed);
      } else if (scriptParsed.length > 0) {
        expLog.info("Strategy 5 (script JSON): found " + scriptParsed.length + " experiences (not more than " + entries.length + ", skipping)");
      }
    }
    let iframeVis = null;
    let iframeVisTrace = null;
    let iframeDiag = null;
    if (html && entries.length > 0 && entries.length < 20) {
      try {
        const s6result = await fetchExpandedExperience(doc, html, resume.id, entries.length, resumeUrl);
        if (s6result.iframeVis) {
          iframeVis = s6result.iframeVis;
          iframeVisTrace = s6result.iframeVisTrace;
          iframeDiag = s6result.iframeDiag || null;
        }
        if (s6result.entries && s6result.entries.length > entries.length) {
          expLog.info("Strategy 6 (expanded fetch): found " + s6result.entries.length + " experiences (was " + entries.length + ")");
          resume._debug.found.push("experience (expanded fetch): " + s6result.entries.length);
          entries.length = 0;
          entries.push(...s6result.entries);
        }
      } catch (err) {
        expLog.warn("Strategy 6 failed: " + err.message);
      }
    }
    resume.experience = entries;
    if (entries.length > 0) resume._debug.found.push("experience: " + entries.length);
    else resume._debug.missing.push("experience (0 entries)");
    applyIframeVisibilityOverride(resume, iframeVis, iframeVisTrace, iframeDiag);
  }
  function applyIframeVisibilityOverride(resume, iframeVis, iframeVisTrace, iframeDiag) {
    if (!iframeVis) return;
    const prevVis = resume.visibility;
    const prevReason = resume._visDiag?.decisionReason || "";
    if (iframeVis === VISIBILITY_HIDDEN && prevVis !== VISIBILITY_HIDDEN) {
      expLog.info("[VIS-DIAG] iframe OVERRIDE: " + (resume.id ? resume.id.substring(0, 8) : "?") + " was " + prevVis + ", iframe says HIDDEN \u2192 overriding");
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
      if (resume._visDiag) {
        resume._visDiag.decision = VISIBILITY_HIDDEN;
        resume._visDiag.decisionReason = "iframe-detected-hidden (overrode " + prevVis + ", was: " + prevReason + ")";
        resume._visDiag.pageTrace = (resume._visDiag.pageTrace || []).concat(iframeVisTrace || []);
      }
    } else if (iframeVis === VISIBILITY_VISIBLE && prevVis === VISIBILITY_UNKNOWN) {
      expLog.info("[VIS-DIAG] iframe OVERRIDE: " + (resume.id ? resume.id.substring(0, 8) : "?") + " was UNKNOWN, iframe says VISIBLE \u2192 overriding");
      resume.visibility = VISIBILITY_VISIBLE;
      resume.hidden = false;
      if (resume._visDiag) {
        resume._visDiag.decision = VISIBILITY_VISIBLE;
        resume._visDiag.decisionReason = "iframe-detected-visible (overrode UNKNOWN, was: " + prevReason + ")";
        resume._visDiag.pageTrace = (resume._visDiag.pageTrace || []).concat(iframeVisTrace || []);
      }
    } else {
      expLog.info("[VIS-DIAG] iframe CONFIRMED: " + (resume.id ? resume.id.substring(0, 8) : "?") + " is " + prevVis + ", iframe agrees (" + iframeVis + ")");
      if (resume._visDiag && iframeVisTrace) {
        resume._visDiag.pageTrace = (resume._visDiag.pageTrace || []).concat(iframeVisTrace);
      }
    }
    if (resume._visDiag) {
      resume._visDiag.iframeRan = true;
      resume._visDiag.iframeVis = iframeVis;
      if (iframeDiag) resume._visDiag.iframeDiag = iframeDiag;
    }
  }
  var expLog;
  var init_resume_fetch_resume_exp_orch = __esm({
    "src/lib/resume-fetch-resume-exp-orch.js"() {
      init_anti_hallucination();
      init_resume_constants();
      init_resume_fetch_experience();
      init_resume_fetch_strategy4_text();
      init_resume_fetch_strategy5_scripts();
      init_resume_fetch_strategy6_expand();
      expLog = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-parse-edu.js
  function parseEducationFromDoc(eduCard) {
    const eduEntries = [];
    const eduCells = eduCard.querySelectorAll('[data-qa="cell-left-side"]');
    eduCells.forEach((cell) => {
      const edu = parseEduCell(cell);
      if (edu) eduEntries.push(edu);
    });
    if (eduEntries.length === 0) {
      Array.from(eduCard.children).forEach((child) => {
        const edu = parseEduChild(child);
        if (edu) eduEntries.push(edu);
      });
    }
    if (eduEntries.length === 0) {
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
    return eduEntries;
  }
  function parseEduCell(cell) {
    const edu = {};
    const cellTexts = cell.querySelectorAll('[data-qa="cell-text-content"]');
    cellTexts.forEach((ct) => {
      const t = (ct.textContent || "").trim();
      if (!t || t.length < 2) return;
      if (EDU_UI_TEXTS.test(t)) return;
      if (!edu.name) {
        edu.name = t;
      } else if (!edu.description) {
        edu.description = t;
      } else if (!edu.year && /\d{4}/.test(t)) {
        edu.year = t.match(/\d{4}/)?.[0] || t;
      }
    });
    if (edu.name && !EDU_UI_TEXTS.test(edu.name) && edu.name.length > 3) return edu;
    return null;
  }
  function parseEduChild(child) {
    const edu = {};
    const linkEl = child.querySelector("a");
    if (linkEl) {
      const t = (linkEl.textContent || "").trim();
      if (!EDU_UI_TEXTS.test(t)) edu.name = t;
    }
    if (!edu.name) {
      const textEls = child.querySelectorAll("span, div, p");
      for (const el of textEls) {
        const t = (el.textContent || "").trim();
        if (t.length > 3 && /[А-Яа-яЁё]/.test(t) && !/^\d/.test(t) && !/\d{4}/.test(t) && !EDU_UI_TEXTS.test(t)) {
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
    if (edu.name && !EDU_UI_TEXTS.test(edu.name) && edu.name.length > 2) return edu;
    return null;
  }
  var EDU_UI_TEXTS;
  var init_resume_fetch_parse_edu = __esm({
    "src/lib/resume-fetch-parse-edu.js"() {
      EDU_UI_TEXTS = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;
    }
  });

  // src/lib/resume-fetch-education-languages.js
  function parseEducationFromDocSection(doc, dbg, resume) {
    const eduCard = doc.querySelector('[data-qa="resume-list-card-education"]');
    if (!eduCard) {
      resume._debug.missing.push("educationBlock");
      return;
    }
    resume._debug.found.push("educationBlock");
    const entries = parseEducationFromDoc(eduCard);
    resume.education = entries;
    if (entries.length > 0) resume._debug.found.push("education: " + entries.length);
    else resume._debug.missing.push("education (0 entries)");
  }
  function parseLanguagesAndAbout2(doc, dbg, resume) {
    const langTags = doc.querySelectorAll('[data-qa="resume-about-card"] .bloko-tag__text, [data-qa="resume-position-card"] .bloko-tag__text');
    langTags.forEach((tag) => {
      const t = (tag.textContent || "").trim();
      if (t && t.length > 0 && !resume.skills.includes(t)) resume.languages.push(t);
    });
    if (resume.languages.length > 0) resume._debug.found.push("languages: " + resume.languages.join(", "));
    const aboutCard = doc.querySelector('[data-qa="resume-about-card"]');
    if (aboutCard) {
      const text = (aboutCard.textContent || "").trim();
      if (text.length > 10) {
        resume.additionalInfo = text;
        resume._debug.found.push("additionalBlock");
      }
    }
  }
  var init_resume_fetch_education_languages = __esm({
    "src/lib/resume-fetch-education-languages.js"() {
      init_resume_fetch_parse_edu();
    }
  });

  // src/lib/resume-fetch-resume-diag.js
  function logPreParseDiagnostics(html, doc) {
    const preExpCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const preStepperItems = doc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const preShowAll = html.match(/Показать все|показать ещё|Посмотреть всё|Развернуть/gi);
    fetchLog11.info("Pre-parse: " + preExpCards.length + " company-cards, " + preStepperItems.length + " stepper-items, " + (preShowAll ? preShowAll.length : 0) + ' "show all" buttons in HTML');
    const expCardHtml = doc.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCardHtml) {
      fetchLog11.info("ExpCard HTML snippet (first 2000 chars): " + expCardHtml.outerHTML.substring(0, 2e3));
    }
    const MONTHS_RE = /(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}\s*[—\-–]\s*(?:(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}|настоящее\s*время|по\s+настоящее\s+время|сейчас|по\s+сейчас)/gi;
    const allDateRanges = html.match(MONTHS_RE) || [];
    fetchLog11.info("Full HTML date ranges: " + allDateRanges.length + " found: " + JSON.stringify(allDateRanges));
    const numDateRanges = html.match(/\d{2}\.\d{4}\s*[—\-–]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s*время|сейчас|по\s+сейчас)/gi) || [];
    fetchLog11.info("Numeric date ranges: " + numDateRanges.length + " found: " + JSON.stringify(numDateRanges));
    const scripts = doc.querySelectorAll("script:not([src])");
    let expScriptCount = 0;
    scripts.forEach((s) => {
      const t = s.textContent || "";
      if (/experience|работ[аеы]|компани|должност|career/i.test(t)) {
        expScriptCount++;
        if (expScriptCount <= 3) fetchLog11.info("Script with experience keywords (first 500 chars): " + t.substring(0, 500));
      }
    });
    fetchLog11.info("Scripts with experience keywords: " + expScriptCount + " of " + scripts.length);
  }
  function resolveVisibilityDecision(resume, pageVis, listMeta, visDiagEntry) {
    const listVis = listMeta ? listMeta.visibility : "no-list-meta";
    fetchLog11.info("[VIS-DIAG] === Visibility decision for " + (resume.id ? resume.id.substring(0, 8) : "unknown") + " ===");
    fetchLog11.info("[VIS-DIAG] Sources: page=" + pageVis + ", list=" + listVis);
    if (pageVis === VISIBILITY_HIDDEN) {
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
      visDiagEntry.decision = VISIBILITY_HIDDEN;
      visDiagEntry.decisionReason = "page-detected-hidden";
    } else if (listMeta && listMeta.visibility === VISIBILITY_HIDDEN) {
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
      visDiagEntry.decision = VISIBILITY_HIDDEN;
      visDiagEntry.decisionReason = "list-detected-hidden (page=" + pageVis + ")";
    } else if (pageVis === VISIBILITY_VISIBLE) {
      resume.visibility = VISIBILITY_VISIBLE;
      resume.hidden = false;
      visDiagEntry.decision = VISIBILITY_VISIBLE;
      visDiagEntry.decisionReason = "page-detected-visible";
    } else if (listMeta && listMeta.visibility === VISIBILITY_VISIBLE) {
      resume.visibility = VISIBILITY_VISIBLE;
      resume.hidden = false;
      visDiagEntry.decision = VISIBILITY_VISIBLE;
      visDiagEntry.decisionReason = "list-detected-visible (page=UNKNOWN)";
    } else {
      resume.visibility = VISIBILITY_UNKNOWN;
      resume.hidden = false;
      visDiagEntry.decision = VISIBILITY_UNKNOWN;
      visDiagEntry.decisionReason = "both-sources-unknown";
    }
    fetchLog11.info("[VIS-DIAG] Decision: " + visDiagEntry.decision + " (" + visDiagEntry.decisionReason + ")");
  }
  var fetchLog11;
  var init_resume_fetch_resume_diag = __esm({
    "src/lib/resume-fetch-resume-diag.js"() {
      init_anti_hallucination();
      init_resume_constants();
      fetchLog11 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-resume.js
  async function fetchAndParseResume(resumeUrl, listMeta) {
    fetchLog12.info("Fetching resume: " + resumeUrl);
    const html = await fetchHtml(resumeUrl);
    const doc = htmlToDoc(html);
    fetchLog12.info("Resume HTML: " + html.length + " chars");
    logPreParseDiagnostics(html, doc);
    window.__hhLastFetchHtml = html;
    window.__hhLastFetchDoc = doc;
    let hashMatch = resumeUrl.match(/\/resume\/([a-f0-9]+)/);
    if (!hashMatch) hashMatch = resumeUrl.match(/[?&]resume=([a-f0-9]+)/);
    const id = hashMatch ? hashMatch[1] : "";
    const resume = {
      id,
      url: resumeUrl,
      title: "",
      salary: "",
      gender: "",
      age: "",
      address: "",
      phone: "",
      email: "",
      telegram: "",
      employmentType: "",
      workFormat: "",
      schedule: "",
      relocation: "",
      specializations: [],
      skills: [],
      skillLevels: {},
      experience: [],
      education: [],
      languages: [],
      additionalInfo: "",
      parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
      visibility: VISIBILITY_UNKNOWN,
      hidden: false,
      _debug: { found: [], missing: [] }
    };
    const pageVisResult = detectVisibilityFromResumePage(doc, html);
    const pageVis = pageVisResult.visibility;
    const pageTrace = pageVisResult.trace || [];
    const visDiagEntry = {
      id: id || "unknown",
      title: "(will be set after parse)",
      pageVis,
      pageTrace,
      listVis: listMeta ? listMeta.visibility : "no-list-meta",
      listHidden: listMeta ? listMeta.hidden : void 0,
      decision: null,
      decisionReason: null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    resolveVisibilityDecision(resume, pageVis, listMeta, visDiagEntry);
    resume._visDiag = visDiagEntry;
    if (listMeta && listMeta.title && listMeta.title !== "Untitled") {
      resume._listTitle = listMeta.title;
    }
    const dbg = (key, val) => {
      if (val) resume._debug.found.push(key + ": " + (typeof val === "string" ? '"' + val.substring(0, 60) + '"' : val));
      else resume._debug.missing.push(key);
      return val;
    };
    parseHeader(doc, dbg, resume);
    parseSalaryConditionsFromDoc(doc, dbg, resume);
    if (resume.title) resume.title = resume.title.replace(TITLE_SUFFIX_NOISE, "").trim();
    parsePersonalDataFromDoc(doc, doc.querySelector('[data-qa="resume-block-title-position"]'), dbg, resume);
    parseSkillsFromDoc(doc, dbg, resume);
    await parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl);
    parseEducationFromDocSection(doc, dbg, resume);
    parseLanguagesAndAbout2(doc, dbg, resume);
    parseContactsFromDoc(doc, dbg, resume);
    if (resume._visDiag) resume._visDiag.title = resume.title || "(no title)";
    fetchLog12.info("Parsed: " + resume.title + " | Skills: " + resume.skills.length + " | Exp: " + resume.experience.length + " | Edu: " + resume.education.length);
    return resume;
  }
  function parseHeader(doc, dbg, resume) {
    const titleEl = doc.querySelector('[data-qa="resume-block-title-position"]');
    if (titleEl) resume.title = dbg("resumeTitle (data-qa)", safeGetText2(titleEl));
    if (!resume.title) {
      const h1 = doc.querySelector("h1");
      if (h1) resume.title = dbg("resumeTitle (h1)", (h1.textContent || "").trim());
    }
    const salaryEl = doc.querySelector('[data-qa="resume-block-salary"]');
    if (salaryEl) resume.salary = dbg("resumeSalary (data-qa)", safeGetText2(salaryEl));
  }
  function parseSalaryConditionsFromDoc(doc, dbg, resume) {
    const posCard = doc.querySelector('[data-qa="resume-position-card"]');
    if (!posCard) {
      resume._debug.missing.push("salaryConditions (no position-card)");
      return;
    }
    const texts = [];
    posCard.querySelectorAll("span, p, div").forEach((el) => {
      if (el.children.length > 5) return;
      const t = (el.textContent || "").trim();
      if (t && t.length > 2 && t.length < 100) texts.push(t);
    });
    const empPatterns = [
      /(?:^|\s)(Полная занятость|Постоянная работа)(?:$|[,;\s])/i,
      /(?:^|\s)(Частичная занятость)(?:$|[,;\s])/i,
      /(?:^|\s)(Проектная работа)(?:$|[,;\s])/i,
      /(?:^|\s)(Стажировка)(?:$|[,;\s])/i,
      /(?:^|\s)(Волонтёрство)(?:$|[,;\s])/i
    ];
    const fmtPatterns = [
      /(?:^|\s)(На месте работодателя|Офис|В офисе)(?:$|[,;\s])/i,
      /(?:^|\s)(Удал[а-яё]+(?: работа)?|Удалённо)(?:$|[,;\s])/i,
      /(?:^|\s)(Гибрид|Смешанный формат)(?:$|[,;\s])/i
    ];
    const schedPatterns = [
      /(?:^|\s)(Гибкий график)(?:$|[,;\s])/i,
      /(?:^|\s)(Полный день)(?:$|[,;\s])/i,
      /(?:^|\s)(Сменный график)(?:$|[,;\s])/i,
      /(?:^|\s)(Вахтовый метод)(?:$|[,;\s])/i
    ];
    const relocPatterns = [
      /(?:^|\s)(Не готов к переезду)(?:$|[,;\s])/i,
      /(?:^|\s)(Готов к переезду)(?:$|[,;\s])/i,
      /(?:^|\s)(Хочу переехать)(?:$|[,;\s])/i
    ];
    for (const t of texts) {
      if (!resume.employmentType) {
        for (const p of empPatterns) {
          const m = t.match(p);
          if (m) {
            resume.employmentType = dbg("employmentType", m[1]);
            break;
          }
        }
      }
      if (!resume.workFormat) {
        const fmtMatches = [];
        for (const p of fmtPatterns) {
          const m = t.match(p);
          if (m) fmtMatches.push(m[1]);
        }
        if (fmtMatches.length > 0) resume.workFormat = dbg("workFormat", fmtMatches.join(", "));
      }
      if (!resume.schedule) {
        for (const p of schedPatterns) {
          const m = t.match(p);
          if (m) {
            resume.schedule = dbg("schedule", m[1]);
            break;
          }
        }
      }
      if (!resume.relocation) {
        for (const p of relocPatterns) {
          const m = t.match(p);
          if (m) {
            resume.relocation = dbg("relocation", m[1]);
            break;
          }
        }
      }
    }
  }
  function parseSkillsFromDoc(doc, dbg, resume) {
    const skillsCard = doc.querySelector('[data-qa="skills-card"]');
    if (!skillsCard) {
      resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
      return;
    }
    resume._debug.found.push('skillsBlock (data-qa="skills-card")');
    const skillLevelEls = skillsCard.querySelectorAll('[data-qa^="skill-level-title-"]');
    skillLevelEls.forEach((el) => {
      const qa = el.getAttribute("data-qa") || "";
      const lvlMatch = qa.match(/skill-level-title-(\d)/);
      if (lvlMatch) {
        const lvl = lvlMatch[1];
        const labels = { "3": "\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0439", "2": "\u0421\u0440\u0435\u0434\u043D\u0438\u0439", "1": "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439" };
        resume.skillLevels[lvl] = labels[lvl] || (el.textContent || "").trim();
        resume._debug.found.push("skillLevel" + lvl);
      }
    });
    skillsCard.querySelectorAll('[data-qa^="skill-tag-"], .bloko-tag__text').forEach((tag) => {
      const text = (tag.textContent || "").trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
    if (resume.skills.length > 0) {
      resume._debug.found.push("skills: " + resume.skills.length + " tags");
    }
  }
  var fetchLog12;
  var init_resume_fetch_resume = __esm({
    "src/lib/resume-fetch-resume.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_parse();
      init_resume_constants();
      init_resume_fetch_resume_page_vis();
      init_resume_fetch_resume_exp_orch();
      init_resume_fetch_education_languages();
      init_resume_fetch_resume_diag();
      fetchLog12 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-vis-fallback.js
  function applyVisibilityFallback(results, visDiag) {
    const stillUnknown = results.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length === 0) return;
    const iframeRan = stillUnknown.filter((r) => r._visDiag?.iframeRan);
    const iframeNotRan = stillUnknown.filter((r) => !r._visDiag?.iframeRan);
    if (iframeNotRan.length > 0) {
      fetchLog13.info("[VIS-DIAG] Final fallback: " + iframeNotRan.length + " resumes UNKNOWN (iframe not run) \u2192 defaulting to VISIBLE");
      visDiag.summary.unknownFallbackToVisible = iframeNotRan.length;
      iframeNotRan.forEach((r) => {
        fetchLog13.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" UNKNOWN\u2192VISIBLE (iframe not run)');
        r.visibility = VISIBILITY_VISIBLE;
        r.hidden = false;
        const diagEntry = visDiag.resumes.find((d) => d.id === r.id);
        if (diagEntry) {
          diagEntry.finalVisibility = VISIBILITY_VISIBLE;
          diagEntry.decisionReason += " [FALLBACK: UNKNOWN\u2192VISIBLE, iframe not run]";
        }
      });
    }
    if (iframeRan.length > 0) {
      fetchLog13.info("[VIS-DIAG] Keeping UNKNOWN for " + iframeRan.length + " resumes (iframe ran but returned UNKNOWN)");
      iframeRan.forEach((r) => {
        fetchLog13.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" \u2192 UNKNOWN (iframe ran, no indicators found)');
        const diagEntry = visDiag.resumes.find((d) => d.id === r.id);
        if (diagEntry) {
          diagEntry.finalVisibility = VISIBILITY_UNKNOWN;
          diagEntry.decisionReason += " [KEPT UNKNOWN: iframe ran, no indicators]";
        }
      });
    }
  }
  function finalizeVisDiag(results, visDiag) {
    results.forEach((r) => {
      const diagEntry = visDiag.resumes.find((d) => d.id === r.id);
      if (diagEntry && !diagEntry.finalVisibility) {
        diagEntry.finalVisibility = r.visibility;
      }
    });
    visDiag.summary.total = results.length;
    visDiag.summary.visible = results.filter((r) => r.visibility === VISIBILITY_VISIBLE).length;
    visDiag.summary.hidden = results.filter((r) => r.visibility === "hidden").length;
    visDiag.summary.unknown = results.filter((r) => r.visibility === VISIBILITY_UNKNOWN).length;
    visDiag.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    fetchLog13.info("[VIS-DIAG] \u2550\u2550\u2550 FINAL VISIBILITY SUMMARY \u2550\u2550\u2550");
    fetchLog13.info("[VIS-DIAG] Total: " + visDiag.summary.total + ", Visible: " + visDiag.summary.visible + ", Hidden: " + visDiag.summary.hidden + ", Unknown: " + visDiag.summary.unknown + ", Fallbacks: " + visDiag.summary.unknownFallbackToVisible);
    results.forEach((r) => {
      fetchLog13.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" \u2192 ' + r.visibility);
    });
    window.__hhVisDiag = visDiag;
    try {
      window.postMessage({ type: "HH-AR-VISDIAG", payload: visDiag }, "*");
    } catch (e) {
      fetchLog13.warn("[VIS-DIAG] Could not send to page world: " + e.message);
    }
    fetchLog13.info("[VIS-DIAG] Diagnostic dump available: __hhVis() / __hhVisTable() / window.__hhVisDiag");
  }
  var fetchLog13;
  var init_resume_fetch_vis_fallback = __esm({
    "src/lib/resume-fetch-vis-fallback.js"() {
      init_anti_hallucination();
      init_resume_constants();
      fetchLog13 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch.js
  var resume_fetch_exports = {};
  __export(resume_fetch_exports, {
    fetchAndParseResume: () => fetchAndParseResume,
    fetchResumeList: () => fetchResumeList,
    syncAllResumes: () => syncAllResumes
  });
  async function syncAllResumes({ onProgress, onComplete, onError } = {}) {
    fetchLog14.info("syncAllResumes: starting ...");
    const visDiag = {
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: null,
      listSource: null,
      listRawHtmlLength: 0,
      resumes: [],
      summary: { total: 0, visible: 0, hidden: 0, unknown: 0, unknownFallbackToVisible: 0 }
    };
    try {
      const list = await fetchResumeList();
      visDiag.listSource = "fetch";
      visDiag.listRawHtmlLength = window.__hhLastFetchHtml?.length || 0;
      if (list.length === 0) {
        fetchLog14.warn("syncAllResumes: no resumes found");
        visDiag.summary.total = 0;
        visDiag.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        window.__hhVisDiag = visDiag;
        if (onComplete) onComplete([]);
        return [];
      }
      list.forEach((item) => {
        visDiag.resumes.push({
          id: item.id,
          title: item.title,
          url: item.url,
          listVis: item.visibility,
          listHidden: item.hidden,
          pageVis: null,
          pageTrace: null,
          decision: null,
          decisionReason: null,
          finalVisibility: null
        });
      });
      const visibleCount = list.filter((r) => {
        const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
        return vis !== "hidden";
      }).length;
      const hiddenCount = list.length - visibleCount;
      if (hiddenCount > 0) {
        fetchLog14.info("syncAllResumes: " + visibleCount + " visible, " + hiddenCount + " hidden");
      }
      if (onProgress) onProgress(0, list.length, "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 \u0440\u0435\u0437\u044E\u043C\u0435...");
      const results = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const vis = item.visibility || (item.hidden ? "hidden" : "unknown");
        const label = vis === "hidden" ? "\u041F\u0430\u0440\u0441\u0438\u043D\u0433 (\u0441\u043A\u0440\u044B\u0442\u043E): " : "\u041F\u0430\u0440\u0441\u0438\u043D\u0433: ";
        if (onProgress) onProgress(i, list.length, label + item.title);
        try {
          const resume = await fetchAndParseResume(item.url, item);
          if ((!resume.title || resume.title === "") && resume._listTitle) {
            resume.title = resume._listTitle;
          }
          delete resume._listTitle;
          if (resume.id) results.push(resume);
          else fetchLog14.warn("No id for " + item.url);
          const diagEntry = visDiag.resumes.find((r) => r.id === resume.id);
          if (diagEntry) {
            if (resume.title && resume.title !== "" && resume.title !== "Untitled") {
              diagEntry.title = resume.title;
            }
            if (resume._visDiag) {
              diagEntry.pageVis = resume._visDiag.pageVis;
              diagEntry.pageTrace = resume._visDiag.pageTrace;
              diagEntry.decision = resume._visDiag.decision;
              diagEntry.decisionReason = resume._visDiag.decisionReason;
              if (resume._visDiag.iframeVis) diagEntry.iframeVis = resume._visDiag.iframeVis;
              if (resume._visDiag.iframeDiag) diagEntry.iframeDiag = resume._visDiag.iframeDiag;
            }
          }
        } catch (err) {
          fetchLog14.error("Failed: " + item.url + ": " + err.message);
          if (onError) onError(item, err);
          const diagEntry = visDiag.resumes.find((r) => r.id === item.id);
          if (diagEntry) {
            diagEntry.pageVis = "error";
            diagEntry.pageTrace = ["ERROR: " + err.message];
            diagEntry.decision = "error";
            diagEntry.decisionReason = "fetch-failed";
          }
        }
        if (i < list.length - 1) await gaussianDelay(2e3, 5e3);
      }
      applyVisibilityFallback(results, visDiag);
      finalizeVisDiag(results, visDiag);
      fetchLog14.info("Done. " + results.length + "/" + list.length + " parsed");
      if (onProgress) onProgress(list.length, list.length, "\u0413\u043E\u0442\u043E\u0432\u043E");
      if (onComplete) onComplete(results);
      return results;
    } catch (err) {
      fetchLog14.error("Fatal: " + err.message);
      visDiag.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      visDiag.error = err.message;
      window.__hhVisDiag = visDiag;
      try {
        window.postMessage({ type: "HH-AR-VISDIAG", payload: visDiag }, "*");
      } catch (e) {
      }
      if (onError) onError(null, err);
      throw err;
    }
  }
  var fetchLog14;
  var init_resume_fetch = __esm({
    "src/lib/resume-fetch.js"() {
      init_anti_hallucination();
      init_timing();
      init_resume_fetch_list();
      init_resume_fetch_resume();
      init_resume_constants();
      init_resume_fetch_vis_fallback();
      fetchLog14 = createLogger("ResumeFetch");
    }
  });

  // src/ui/panel/panel-diagnostics.js
  function setStatusLine(text) {
    const el = refs.shadowRoot?.getElementById("res-status-line");
    if (el) el.textContent = text;
  }
  function clearResumeData() {
    console.log("[HH-AR][Diag] Clearing resume data...");
    clearResumeState();
    clearActiveResume().then(() => {
      console.log("[HH-AR][Diag] myResume removed from storage");
      setStatusLine("\u0420\u0435\u0437\u044E\u043C\u0435 \u043E\u0447\u0438\u0449\u0435\u043D\u043E \u0438\u0437 \u043F\u0430\u043C\u044F\u0442\u0438 \u0438 storage");
      renderResumePanel();
    });
  }
  function dumpResumeToConsole() {
    console.log("[HH-AR][Diag] === DUMP START ===");
    console.log("[HH-AR][Diag] panelState.resume:", JSON.stringify(panelState.resume, null, 2));
    console.log("[HH-AR][Diag] panelState.resumeList:", panelState.resumeList?.length);
    console.log("[HH-AR][Diag] panelState.myResumes:", panelState.myResumes?.length);
    console.log("[HH-AR][Diag] panelState.vacancies:", panelState.vacancies?.length);
    console.log("[HH-AR][Diag] URL:", window.location.href);
    console.log("[HH-AR][Diag] Auth:", panelState.isLoggedIn);
    console.log("[HH-AR][Diag] === DUMP END ===");
    setStatusLine("\u0414\u0430\u043C\u043F \u0432\u044B\u0432\u0435\u0434\u0435\u043D \u0432 \u043A\u043E\u043D\u0441\u043E\u043B\u044C (F12)");
  }
  async function testParseResume() {
    console.log("[HH-AR][Diag] === TEST PARSE START ===");
    setStatusLine("\u0422\u0435\u0441\u0442 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430...");
    const path = window.location.pathname;
    console.log("[HH-AR][Diag] Current path:", path);
    console.log("[HH-AR][Diag] Is resume page:", /\/resume\/[a-f0-9]+/.test(path));
    console.log("[HH-AR][Diag] Is edit page:", /\/resume\/edit\//.test(path));
    console.log("[HH-AR][Diag] Is resumes list:", path.includes("/applicant/resumes"));
    if (/\/resume\/[a-f0-9]+/.test(path)) {
      try {
        let resume;
        if (/\/resume\/edit\//.test(path)) {
          const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
          if (editMatch) {
            const viewUrl = "https://hh.ru/applicant/resumes/view?resume=" + editMatch[1];
            console.log("[HH-AR][Diag] Edit page, fetching view:", viewUrl);
            const { fetchAndParseResume: fetchAndParseResume2 } = await Promise.resolve().then(() => (init_resume_fetch(), resume_fetch_exports));
            resume = await fetchAndParseResume2(viewUrl);
          } else {
            setStatusLine("\u041E\u0448\u0438\u0431\u043A\u0430: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C ID \u0438\u0437 URL");
            return;
          }
        } else {
          const { expandHiddenSections: expandHiddenSections2 } = await Promise.resolve().then(() => (init_resume_detail(), resume_detail_exports));
          const { parseResume: parseResume2 } = await Promise.resolve().then(() => (init_parse_resume(), parse_resume_exports));
          await expandHiddenSections2();
          resume = parseResume2();
        }
        console.log("[HH-AR][Diag] Parse result:", JSON.stringify(resume, null, 2));
        console.log("[HH-AR][Diag] Experience count:", resume.experience?.length);
        console.log("[HH-AR][Diag] Skills count:", resume.skills?.length);
        console.log("[HH-AR][Diag] Debug found:", resume._debug?.found);
        console.log("[HH-AR][Diag] Debug missing:", resume._debug?.missing);
        const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
        if (hasUsefulData) {
          setActiveResumeState(resume);
          await setActiveResume(resume);
          renderResumePanel();
          setStatusLine("\u0421\u043F\u0430\u0440\u0441\u0435\u043D\u043E: " + resume.experience?.length + " \u043C\u0435\u0441\u0442, " + resume.skills?.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432");
        } else {
          setStatusLine("\u041E\u0448\u0438\u0431\u043A\u0430: \u043D\u0435\u0442 \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 (id=" + resume.id + ")");
        }
      } catch (err) {
        console.error("[HH-AR][Diag] Parse error:", err);
        setStatusLine("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430: " + err.message);
      }
    } else {
      setStatusLine("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 /resume/{hash} \u0434\u043B\u044F \u0442\u0435\u0441\u0442\u0430");
      console.log("[HH-AR][Diag] Not on resume page, cannot test parse");
    }
    console.log("[HH-AR][Diag] === TEST PARSE END ===");
  }
  var init_panel_diagnostics = __esm({
    "src/ui/panel/panel-diagnostics.js"() {
      init_state();
      init_resumes2();
      init_storage();
    }
  });

  // src/ui/panel/helpers.js
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
    removeFromBlacklist(name);
    renderBlacklist();
  }
  function selectConversation(convId) {
    setActiveConversation(convId);
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
  var init_helpers2 = __esm({
    "src/ui/panel/helpers.js"() {
      init_state();
      init_settings2();
      init_stats2();
      init_negotiations2();
    }
  });

  // src/ui/panel/sidebar-events.js
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
        resetAuthCache();
        updateAuthStateAsync();
        return;
      }
      if (t.closest("#har-retry-auth")) {
        resetAuthCache();
        updateAuthStateAsync();
        return;
      }
      if (t.closest("#authIndicator")) {
        resetAuthCache();
        updateAuthStateAsync();
        return;
      }
      if (t.closest('[data-action="logout"]')) {
        window.location.href = "https://hh.ru/account/logout";
        return;
      }
      if (t.closest('[data-action="load-resume"]')) {
        const btn = t.closest('[data-action="load-resume"]');
        if (btn) {
          const origHTML = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<span class="btn-spinner"></span> \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...';
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origHTML;
          }, 3e4);
          const onDone = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-load-resume-done", onDone);
          };
          window.addEventListener("hh-ar-load-resume-done", onDone);
        }
        window.dispatchEvent(new CustomEvent("hh-ar-load-resume"));
        return;
      }
      if (t.closest('[data-action="reparse-resume"]')) {
        const btn = t.closest('[data-action="reparse-resume"]');
        const resume = panelState.resume;
        if (!resume || !resume.id) return;
        const resumeUrl = resume.url || "https://hh.ru/applicant/resumes/view?resume=" + resume.id;
        if (btn) {
          const origHTML = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<span class="btn-spinner"></span>';
          const onDone = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-load-resume-done", onDone);
          };
          window.addEventListener("hh-ar-load-resume-done", onDone);
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            window.removeEventListener("hh-ar-load-resume-done", onDone);
          }, 3e4);
        }
        window.dispatchEvent(new CustomEvent("hh-ar-reparse-resume", { detail: { resumeUrl } }));
        return;
      }
      if (t.closest('[data-action="sync-resumes"]')) {
        const btn = t.closest('[data-action="sync-resumes"]');
        if (btn) {
          const origHTML = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<span class="btn-spinner"></span> \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F...';
          const onDone = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-sync-done", onDone);
          };
          window.addEventListener("hh-ar-sync-done", onDone);
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            window.removeEventListener("hh-ar-sync-done", onDone);
          }, 6e4);
        }
        window.dispatchEvent(new CustomEvent("hh-ar-sync-resumes"));
        return;
      }
      if (t.closest('[data-action="analyze-skills"]')) {
        Promise.resolve().then(() => (init_resume_helpers(), resume_helpers_exports)).then((m) => m.updateSkillGapSection(panelState.resume));
        return;
      }
      if (t.closest('[data-action="clear-resume"]')) {
        clearResumeData();
        return;
      }
      if (t.closest('[data-action="dump-resume"]')) {
        dumpResumeToConsole();
        return;
      }
      if (t.closest('[data-action="test-parse"]')) {
        testParseResume();
        return;
      }
      const tabSwitch = t.closest("[data-tab-switch]");
      if (tabSwitch) {
        Promise.resolve().then(() => (init_events(), events_exports)).then((m) => m.switchTabPublic(tabSwitch.dataset.tabSwitch));
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
  var init_sidebar_events = __esm({
    "src/ui/panel/sidebar-events.js"() {
      init_state();
      init_panel();
      init_auth();
      init_panel_diagnostics();
      init_helpers2();
      init_resume_detail2();
      init_stats2();
      init_negotiations2();
      init_resumes2();
    }
  });

  // src/ui/panel/events.js
  var events_exports = {};
  __export(events_exports, {
    bindAllEvents: () => bindAllEvents,
    bindTabClicks: () => bindTabClicks,
    switchTabPublic: () => switchTabPublic
  });
  function switchTab(tabId) {
    setActiveTab(tabId);
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
  function switchTabPublic(tabId) {
    switchTab(tabId);
  }
  function toggleTimeline(toggleEl) {
    const body = toggleEl.nextElementSibling;
    const chevron = toggleEl.querySelector(".timeline-chevron");
    if (!body) return;
    const isOpen = body.classList.toggle("open");
    if (chevron) chevron.classList.toggle("open", isOpen);
  }
  function toggleSub2(subId, chevId) {
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
  function bindTimelineToggles(container) {
    container.addEventListener("click", (e) => {
      const tl = e.target.closest("[data-timeline]");
      if (tl) {
        toggleTimeline(tl);
        return;
      }
      const sub = e.target.closest("[data-sub-toggle]");
      if (sub) {
        toggleSub2(sub.dataset.subId, sub.dataset.chevId);
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
        filterVacancies2();
      });
    }
    const searchInput = container.querySelector("#vac-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => filterVacancies2());
    }
    const statusFilter = container.querySelector("#vac-status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", () => filterVacancies2());
    }
  }
  function filterVacancies2() {
    const search = (refs.shadowRoot?.getElementById("vac-search")?.value || "").toLowerCase();
    const status = refs.shadowRoot?.getElementById("vac-status-filter")?.value || "all";
    const minScore = parseInt(refs.shadowRoot?.getElementById("vac-score-range")?.value || "0", 10);
    const items = refs.shadowRoot?.querySelectorAll("#har-vlist .vacancy-item");
    items?.forEach((item) => {
      const title = (item.dataset.title || "").toLowerCase();
      const itemStatus = item.dataset.status || "new";
      const itemScore = parseInt(item.dataset.score || "0", 10);
      const matchTitle = !search || title.includes(search);
      const matchStatus = status === "all" || itemStatus === status;
      const matchScore = itemScore >= minScore;
      item.style.display = matchTitle && matchStatus && matchScore ? "" : "none";
    });
  }
  var init_events = __esm({
    "src/ui/panel/events.js"() {
      init_state();
      init_resumes2();
      init_stats2();
      init_negotiations2();
      init_sidebar_events();
    }
  });

  // src/ui/panel/index.js
  function updateAuthState(forceUI = false) {
    const was = panelState.isLoggedIn;
    const now = checkAuth();
    if (was !== now || forceUI) {
      setAuthState(now);
      panelLog.info("Auth: " + (now ? "LOGGED IN" : "NOT LOGGED IN"));
      renderSidebarContent();
      if (panelState.isLoggedIn) {
        const container = refs.shadowRoot?.querySelector(".fab-panel");
        if (container) {
          bindAllEvents(container);
          renderInitialData();
        }
        if (was !== true) {
          Promise.resolve().then(() => (init_main(), main_exports)).then((m) => m.initPageLogic()).catch(() => {
          });
        }
      }
      updateFabIcon();
      if (forceUI) showAuthFeedback(now);
    }
  }
  async function updateAuthStateAsync() {
    const was = panelState.isLoggedIn;
    const now = await checkAuthAsync();
    if (was !== now) {
      setAuthState(now);
      panelLog.info("Auth (async): " + (now ? "LOGGED IN" : "NOT LOGGED IN"));
      renderSidebarContent();
      if (panelState.isLoggedIn) {
        const container = refs.shadowRoot?.querySelector(".fab-panel");
        if (container) {
          bindAllEvents(container);
          renderInitialData();
        }
        if (was !== true) {
          Promise.resolve().then(() => (init_main(), main_exports)).then((m) => m.initPageLogic()).catch(() => {
          });
        }
      }
      updateFabIcon();
    }
    showAuthFeedback(now);
  }
  function showAuthFeedback(isLoggedIn2) {
    if (isLoggedIn2) {
      const badge = refs.shadowRoot?.getElementById("authBadge");
      if (badge) {
        badge.style.transition = "transform 0.15s";
        badge.style.transform = "scale(1.15)";
        setTimeout(() => {
          badge.style.transform = "scale(1)";
        }, 200);
      }
      const card = refs.shadowRoot?.querySelector("#tab-overview .card");
      if (card) {
        const desc = card.querySelector('div[style*="color:#71717a;"]');
        if (desc) {
          const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const orig = desc.textContent;
          desc.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E: " + time;
          setTimeout(() => {
            desc.textContent = orig;
          }, 3e3);
        }
      }
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
    bindTabClicks(container);
    document.body.appendChild(refs.backdropEl);
    document.body.appendChild(refs.sidebarEl);
  }
  function toggleSidebar() {
    if (!refs.sidebarEl) createSidebar();
    if (!refs.fabEl) createFab(toggleSidebar);
    togglePanelOpen();
    refs.sidebarEl.style.transform = panelState.isOpen ? "translateX(0)" : "translateX(100%)";
    if (refs.backdropEl) {
      refs.backdropEl.style.opacity = panelState.isOpen ? "1" : "0";
      refs.backdropEl.style.pointerEvents = panelState.isOpen ? "auto" : "none";
    }
    updateFabIcon();
    panelLog.info("Sidebar " + (panelState.isOpen ? "opened" : "closed"));
  }
  function updateVacancies(vacancies) {
    setVacancies(vacancies);
    renderVacancyList();
    updateVacancyCounts();
    if (panelState.resume) updateSkillGapSection(panelState.resume);
  }
  function updateStats2(stats) {
    updateStats(stats);
    renderStatsValues();
    renderOverviewKPI();
  }
  function setStatus2(status) {
    setStatus(status);
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
  var panelLog;
  var init_panel = __esm({
    "src/ui/panel/index.js"() {
      init_anti_hallucination();
      init_state();
      init_styles();
      init_html2();
      init_auth();
      init_fab();
      init_vacancies2();
      init_resume_helpers();
      init_overview2();
      init_settings2();
      init_render();
      init_events();
      panelLog = createLogger("Panel");
    }
  });

  // src/ui/panel.js
  var init_panel2 = __esm({
    "src/ui/panel.js"() {
      init_panel();
      init_render();
    }
  });

  // src/content/main-page-handlers.js
  async function initPageLogic() {
    if (pageInitialized) return;
    pageInitialized = true;
    pageLog.info("User logged in -- initializing page logic");
    const path = window.location.pathname;
    pageLog.info("Page: " + path);
    if (path.startsWith("/search/vacancy")) {
      await handleVacancySearchPage();
    } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
      await handleResumeDetailPage(path);
    } else if (path.startsWith("/applicant/resumes")) {
      await handleResumeListPage();
    } else if (/^\/vacancy\/\d+/.test(path)) {
      await handleVacancyDetailPage(path);
    }
  }
  function resetPageInit() {
    pageInitialized = false;
  }
  async function handleVacancySearchPage() {
    const vacancies = parseVacanciesFromPage();
    updateVacancies(vacancies);
    const stats = getStats();
    updateStats2(stats);
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const fresh = parseVacanciesFromPage();
        updateVacancies(fresh);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info("SPA observer active");
  }
  async function handleResumeDetailPage(path) {
    if (/\/resume\/edit\//.test(path)) {
      const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
      if (editMatch) {
        const resumeId = editMatch[1];
        const viewUrl = "https://hh.ru/applicant/resumes/view?resume=" + resumeId;
        pageLog.info("Edit page detected, fetching view: " + viewUrl);
        try {
          const resume = await fetchAndParseResume(viewUrl);
          if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
            await saveResumeToState(resume);
            pageLog.info("Auto-fetched resume (from edit page): " + resume.title);
          }
        } catch (err) {
          pageLog.warn("Failed to fetch resume from edit page: " + err.message);
        }
      }
    } else {
      await expandHiddenSections();
      const resume = parseResume();
      if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
        await saveResumeToState(resume);
        pageLog.info("Auto-parsed resume: " + resume.title);
      }
    }
  }
  async function handleResumeListPage() {
    const resumeList = parseResumeList();
    setResumeList(resumeList);
    const list = await getMyResumes();
    setMyResumes(list);
    renderMyResumesPanel();
    pageLog.info("Resume list page: " + resumeList.length + " resumes");
  }
  async function handleVacancyDetailPage(path) {
    pageLog.info("Vacancy detail page detected");
    try {
      const queue = await getApplyQueue();
      if (queue.length > 0) {
        const vacancyId = path.replace("/vacancy/", "").split("?")[0].split("#")[0];
        const pending = queue.find((q) => q.vacancyId === vacancyId);
        if (pending) {
          const updatedQueue = queue.filter((q) => q.vacancyId !== vacancyId);
          await setApplyQueue(updatedQueue);
          pageLog.info("Processing apply for vacancy " + vacancyId);
          setTimeout(async () => {
            await continueApply(pending);
          }, 2e3);
        } else {
          pageLog.info("Queue has items but none for current vacancy (" + vacancyId + ")");
        }
      } else {
        pageLog.info("No apply queue");
      }
    } catch (e) {
      pageLog.error("Error processing apply queue: " + e.message);
    }
  }
  async function saveResumeToState(resume) {
    setActiveResumeState(resume);
    await setActiveResume(resume);
    saveMyResume(resume).then(() => {
      getMyResumes().then((list) => {
        setMyResumes(list);
        renderMyResumesPanel();
      });
    });
  }
  var pageLog, pageInitialized;
  var init_main_page_handlers = __esm({
    "src/content/main-page-handlers.js"() {
      init_anti_hallucination();
      init_storage();
      init_vacancy_list();
      init_resume_detail2();
      init_resume_fetch();
      init_engine();
      init_panel2();
      init_resumes2();
      init_state();
      pageLog = createLogger("Main");
      pageInitialized = false;
    }
  });

  // src/content/main-resume-loader.js
  async function handleLoadResume() {
    if (!panelState.isLoggedIn) return;
    const path = window.location.pathname;
    setStatus2("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E \u0440\u0435\u0437\u044E\u043C\u0435...");
    showResumeLoading("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E \u0440\u0435\u0437\u044E\u043C\u0435...");
    try {
      if (/\/resume\/[a-f0-9]+/.test(path)) {
        await loadFromResumePage(path);
      } else if (path.includes("/applicant/resumes")) {
        await loadFromResumeListPage();
      } else {
        await loadFromSyncedData();
      }
    } catch (err) {
      loadLog.error("Load resume error: " + err.message);
      setStatus2("\u041E\u0448\u0438\u0431\u043A\u0430: " + err.message);
    } finally {
      window.dispatchEvent(new CustomEvent("hh-ar-load-resume-done"));
    }
  }
  async function handleReparseResume(e) {
    if (!panelState.isLoggedIn) return;
    const resumeUrl = e.detail?.resumeUrl;
    if (!resumeUrl) {
      loadLog.warn("Reparse: no resumeUrl provided");
      return;
    }
    setStatus2("\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0437\u044E\u043C\u0435...");
    showResumeLoading("\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0437\u044E\u043C\u0435...");
    try {
      const resume = await fetchAndParseResume(resumeUrl);
      const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
      if (hasUsefulData) {
        setActiveResumeState(resume);
        await setActiveResume(resume);
        await saveMyResume(resume);
        setMyResumes(await getMyResumes());
        renderResumePanel();
        renderMyResumesPanel();
        setStatus2("\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0435\u043D\u043E: " + (resume.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"));
        loadLog.info("Reparse: fetched and saved: " + resume.title);
      } else {
        setStatus2("\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0434\u0430\u043B\u043E \u0434\u0430\u043D\u043D\u044B\u0445");
        loadLog.warn("Reparse: parse result has no useful data");
      }
    } catch (err) {
      loadLog.error("Reparse error: " + err.message);
      setStatus2("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0432\u0430\u043D\u0438\u044F: " + err.message);
    } finally {
      window.dispatchEvent(new CustomEvent("hh-ar-load-resume-done"));
    }
  }
  async function loadFromResumePage(path) {
    let resume;
    if (/\/resume\/edit\//.test(path)) {
      const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
      if (!editMatch) {
        setStatus2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C ID \u0440\u0435\u0437\u044E\u043C\u0435 \u0438\u0437 URL");
        return;
      }
      const resumeId = editMatch[1];
      const viewUrl = "https://hh.ru/applicant/resumes/view?resume=" + resumeId;
      loadLog.info("Edit page detected, fetching view: " + viewUrl);
      try {
        resume = await fetchAndParseResume(viewUrl);
        loadLog.info("Fetched resume from edit page: " + resume.title);
      } catch (err) {
        loadLog.error("Failed to fetch resume from edit page: " + err.message);
        setStatus2("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: " + err.message);
        return;
      }
    } else {
      await expandHiddenSections();
      resume = parseResume();
    }
    const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
    if (hasUsefulData) {
      setActiveResumeState(resume);
      await setActiveResume(resume);
      await saveMyResume(resume);
      setMyResumes(await getMyResumes());
      renderResumePanel();
      renderMyResumesPanel();
      setStatus2("\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E: " + (resume.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"));
      loadLog.info("Resume loaded and saved: " + resume.title);
    } else {
      setStatus2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 (\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445)");
      loadLog.warn("Parse result has no useful data \u2014 not saving. Found: " + JSON.stringify(resume._debug?.found) + " Missing: " + JSON.stringify(resume._debug?.missing));
    }
  }
  async function loadFromResumeListPage() {
    const list = parseResumeList();
    if (list.length > 0) {
      setResumeList(list);
      renderResumeListPanel();
      loadLog.info("Resume list loaded: " + list.length + " resumes");
    }
    const synced = panelState.myResumes || [];
    if (synced.length > 0 && synced[0].id) {
      setActiveResumeState(synced[0]);
      setActiveResume(synced[0]);
      renderResumePanel();
      setStatus2("\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: " + list.length + ". \u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E: " + (synced[0].title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"));
    } else {
      setStatus2("\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: " + list.length + ". \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C\xBB \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438");
    }
  }
  async function loadFromSyncedData() {
    const synced = panelState.myResumes || [];
    if (synced.length > 0 && synced[0].id) {
      setActiveResumeState(synced[0]);
      setActiveResume(synced[0]);
      renderResumePanel();
      renderMyResumesPanel();
      setStatus2("\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E \u0438\u0437 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: " + (synced[0].title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"));
      loadLog.info("Loaded resume from synced data: " + synced[0].title);
    } else {
      setStatus2("\u041D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0440\u0435\u0437\u044E\u043C\u0435. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \xAB\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435\xBB");
      loadLog.info("No synced resumes available on non-resume page");
    }
  }
  function showResumeLoading(message) {
    const container = refs.shadowRoot?.getElementById("res-parsed-data");
    if (!container) return;
    container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;gap:12px;"><div class="har-spinner"></div><div style="font-size:12px;color:#71717a;font-weight:500;">' + esc2(message || "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...") + "</div></div>";
    const body = refs.shadowRoot?.getElementById("res-parsing-body");
    if (body && !body.classList.contains("open")) {
      body.classList.add("open");
      const chevron = body.previousElementSibling?.querySelector(".timeline-chevron");
      if (chevron) chevron.classList.add("open");
    }
  }
  function esc2(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var loadLog;
  var init_main_resume_loader = __esm({
    "src/content/main-resume-loader.js"() {
      init_anti_hallucination();
      init_storage();
      init_resume_detail2();
      init_resume_fetch();
      init_panel2();
      init_resumes2();
      init_state();
      loadLog = createLogger("Main");
    }
  });

  // src/content/main-sync.js
  async function handleSyncResumes() {
    if (!panelState.isLoggedIn) return;
    if (syncInProgress) {
      syncLog.warn("Sync already in progress");
      return;
    }
    syncInProgress = true;
    setStatus2("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0440\u0435\u0437\u044E\u043C\u0435...");
    syncLog.info("Sync: starting fetch-based resume sync");
    try {
      await clearMyResumes();
      setMyResumes([]);
      renderMyResumesPanel();
      const results = await syncAllResumes({
        onProgress: (done, total, msg) => {
          syncLog.info("Sync: [" + done + "/" + total + "] " + msg);
          setStatus2("\u0421\u0438\u043D\u0445\u0440.: " + done + "/" + total + " \u2014 " + msg);
          renderSyncProgress(done, total, msg);
        },
        onError: (item, err) => {
          syncLog.error("Sync: error for " + (item ? item.title : "unknown") + ": " + err.message);
        }
      });
      for (const resume of results) {
        await saveMyResume(resume);
      }
      setMyResumes(await getMyResumes());
      renderMyResumesPanel();
      if (results.length > 0) {
        const firstVisible = results.find((r) => {
          const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
          return vis !== "hidden";
        });
        const active = firstVisible || results[0];
        setActiveResumeState(active);
        await setActiveResume(active);
        renderResumePanel();
      }
      setStatus2("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E " + results.length + " \u0440\u0435\u0437\u044E\u043C\u0435");
      syncLog.info("Sync: complete. " + results.length + " resumes saved");
    } catch (err) {
      syncLog.error("Sync: fatal error: " + err.message);
      setStatus2("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: " + err.message);
    } finally {
      syncInProgress = false;
      window.dispatchEvent(new CustomEvent("hh-ar-sync-done"));
    }
  }
  function renderSyncProgress(done, total, msg) {
    const listEl = refs.shadowRoot?.getElementById("res-sync-list");
    if (!listEl) return;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    listEl.innerHTML = '<div style="padding:8px;text-align:center;"><div style="font-size:12px;font-weight:600;margin-bottom:6px;">' + esc3(msg) + '</div><div style="background:#e4e4e7;border-radius:4px;height:6px;overflow:hidden;"><div style="background:#059669;height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.3s;"></div></div><div style="font-size:10px;color:#71717a;margin-top:4px;">' + done + " / " + total + "</div></div>";
  }
  function esc3(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var syncLog, syncInProgress;
  var init_main_sync = __esm({
    "src/content/main-sync.js"() {
      init_anti_hallucination();
      init_storage();
      init_resume_fetch();
      init_panel2();
      init_resumes2();
      init_state();
      syncLog = createLogger("Main");
      syncInProgress = false;
    }
  });

  // src/content/main.js
  var main_exports = {};
  async function init() {
    mainLog.info("Loaded: " + window.location.href);
    await checkDailyReset();
    try {
      const [stats, settings] = await Promise.all([getStats(), getAllSettings()]);
      updateStats(stats);
      updateSettings(settings);
      mainLog.info("Boot: stats + settings loaded from storage");
    } catch (e) {
      mainLog.warn("Boot: failed to load stats/settings: " + e.message);
    }
    createPanel();
    await loadSavedResumes();
    window.addEventListener("hh-ar-apply", async (e) => {
      if (!panelState.isLoggedIn) return;
      const { applyToVacancy: applyToVacancy2 } = await Promise.resolve().then(() => (init_engine(), engine_exports));
      await applyToVacancy2(e.detail.vacancyId);
    });
    window.addEventListener("hh-ar-apply-all", async () => {
      if (!panelState.isLoggedIn) return;
      const { applyToAll: applyToAll2 } = await Promise.resolve().then(() => (init_engine(), engine_exports));
      await applyToAll2(panelState.vacancies);
    });
    window.addEventListener("hh-ar-refresh", async () => {
      if (!panelState.isLoggedIn) return;
      const v = await parseVacanciesFromPage();
      updateVacancies(v);
    });
    window.addEventListener("hh-ar-load-resume", handleLoadResume);
    window.addEventListener("hh-ar-reparse-resume", handleReparseResume);
    window.addEventListener("hh-ar-sync-resumes", handleSyncResumes);
  }
  async function loadSavedResumes() {
    try {
      const savedResume = await getActiveResume();
      if (savedResume && savedResume.id) {
        if (savedResume.visibility === void 0) {
          savedResume.visibility = savedResume.hidden ? "hidden" : VISIBILITY_UNKNOWN;
          await setActiveResume(savedResume);
        }
        if (savedResume.title && TITLE_SUFFIX_NOISE.test(savedResume.title)) {
          savedResume.title = savedResume.title.replace(TITLE_SUFFIX_NOISE, "").trim();
          await setActiveResume(savedResume);
        }
        setActiveResumeState(savedResume);
        mainLog.info("Loaded saved resume: " + savedResume.title);
      }
    } catch (e) {
    }
    try {
      setMyResumes(await getMyResumes());
      if (panelState.myResumes.length > 0) {
        mainLog.info("Loaded " + panelState.myResumes.length + " saved resumes");
        let needsSave = false;
        panelState.myResumes.forEach((r) => {
          if (r.visibility === void 0) {
            r.visibility = r.hidden ? "hidden" : VISIBILITY_UNKNOWN;
            needsSave = true;
          }
          if (r.title && TITLE_SUFFIX_NOISE.test(r.title)) {
            r.title = r.title.replace(TITLE_SUFFIX_NOISE, "").trim();
            needsSave = true;
          }
        });
        if (needsSave) {
          await saveMyResumes(panelState.myResumes);
          mainLog.info("Migrated resume data: added visibility, cleaned titles");
        }
        renderMyResumesPanel();
      }
    } catch (e) {
    }
  }
  var mainLog;
  var init_main = __esm({
    "src/content/main.js"() {
      init_anti_hallucination();
      init_storage();
      init_vacancy_list();
      init_resume_detail2();
      init_panel2();
      init_resumes2();
      init_resume_constants();
      init_state();
      init_main_page_handlers();
      init_main_resume_loader();
      init_main_sync();
      mainLog = createLogger("Main");
      window.__hhDiagnose = diagnoseResumeDOM;
      window.__hhDebugVisibility = debugVisibility;
      window.__hhVisDiag = null;
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
      else init();
    }
  });
  init_main();
})();
