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
    if (m) return m[1];
    const qp = url.match(/[?&]vacancyId=(\d+)/);
    if (qp) return qp[1];
    return "";
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
        } catch (_e) {
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
          } catch (_e) {
          }
        }
      });
      observer.observe(root.body || root, { childList: true, subtree: true });
    });
  }
  function safeClick(el, _label) {
    if (!el || !(el instanceof Element) || el.disabled) return false;
    if (!document.body.contains(el)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    el.click();
    return true;
  }
  function safeInput(el, text, _label) {
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
    } catch (_e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  async function getStats() {
    try {
      await checkDailyReset();
      const d = await chrome.storage.local.get("stats");
      return Object.assign({}, DEFAULT_STATS, d.stats || {});
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
    }
  }
  async function getMyResumes() {
    try {
      const d = await chrome.storage.local.get("myResumes");
      return d.myResumes || [];
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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

  // src/lib/storage-vacancies.js
  async function getVacancyDetails() {
    try {
      const d = await chrome.storage.local.get("vacancyDetails");
      return d.vacancyDetails || [];
    } catch (_e) {
      return [];
    }
  }
  async function getVacancyDetail(id) {
    const details = await getVacancyDetails();
    return details.find((d) => d.id === id) || null;
  }
  async function saveVacancyDetail(detail) {
    if (!detail || !detail.id) return;
    const details = await getVacancyDetails();
    const idx = details.findIndex((d) => d.id === detail.id);
    if (idx >= 0) {
      details[idx] = { ...details[idx], ...detail };
    } else {
      details.push(detail);
    }
    if (details.length > 200) {
      details.sort((a, b) => (b.parsedAt || "").localeCompare(a.parsedAt || ""));
      details.length = 200;
    }
    await chrome.storage.local.set({ vacancyDetails: details });
    return details;
  }
  async function removeVacancyDetail(id) {
    const details = await getVacancyDetails();
    const filtered = details.filter((d) => d.id !== id);
    await chrome.storage.local.set({ vacancyDetails: filtered });
  }
  async function clearVacancyDetails() {
    await chrome.storage.local.set({ vacancyDetails: [] });
  }
  async function getVacancyScores() {
    try {
      const d = await chrome.storage.local.get("vacancyScores");
      return d.vacancyScores || [];
    } catch (_e) {
      return [];
    }
  }
  async function saveVacancyScore(id, score, breakdown, details) {
    if (!id) return;
    const scores = await getVacancyScores();
    const idx = scores.findIndex((s) => s.id === id);
    const entry = { id, score, breakdown, details, computedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (idx >= 0) {
      scores[idx] = entry;
    } else {
      scores.push(entry);
    }
    if (scores.length > 500) {
      scores.sort((a, b) => (b.computedAt || "").localeCompare(a.computedAt || ""));
      scores.length = 500;
    }
    await chrome.storage.local.set({ vacancyScores: scores });
  }
  async function getVacancyScore(id) {
    const scores = await getVacancyScores();
    return scores.find((s) => s.id === id) || null;
  }
  var init_storage_vacancies = __esm({
    "src/lib/storage-vacancies.js"() {
    }
  });

  // src/lib/storage.js
  var storage_exports = {};
  __export(storage_exports, {
    DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
    DEFAULT_STATS: () => DEFAULT_STATS,
    addBlacklistedCompany: () => addBlacklistedCompany,
    checkDailyReset: () => checkDailyReset,
    clearActiveResume: () => clearActiveResume,
    clearMyResumes: () => clearMyResumes,
    clearSyncQueue: () => clearSyncQueue,
    clearVacancyDetails: () => clearVacancyDetails,
    dequeueSyncItem: () => dequeueSyncItem,
    getActiveResume: () => getActiveResume,
    getAllSettings: () => getAllSettings,
    getAppliedVacancies: () => getAppliedVacancies,
    getApplyQueue: () => getApplyQueue,
    getBlacklistedCompanies: () => getBlacklistedCompanies,
    getMyResumes: () => getMyResumes,
    getStats: () => getStats,
    getSyncQueue: () => getSyncQueue,
    getVacancyDetail: () => getVacancyDetail,
    getVacancyDetails: () => getVacancyDetails,
    getVacancyScore: () => getVacancyScore,
    getVacancyScores: () => getVacancyScores,
    incrementApplied: () => incrementApplied,
    isAlreadyApplied: () => isAlreadyApplied,
    markAsApplied: () => markAsApplied,
    removeBlacklistedCompany: () => removeBlacklistedCompany,
    removeVacancyDetail: () => removeVacancyDetail,
    saveMyResume: () => saveMyResume,
    saveMyResumes: () => saveMyResumes,
    saveVacancyDetail: () => saveVacancyDetail,
    saveVacancyScore: () => saveVacancyScore,
    setActiveResume: () => setActiveResume,
    setApplyQueue: () => setApplyQueue,
    setBlacklistedCompanies: () => setBlacklistedCompanies,
    setSyncQueue: () => setSyncQueue
  });
  var init_storage = __esm({
    "src/lib/storage.js"() {
      init_storage_settings();
      init_storage_queue();
      init_storage_vacancies();
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
    const u1 = Math.max(1e-10, Math.min(1 - 1e-10, Math.random()));
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
    return z * stddev + mean;
  }
  function randomDelay() {
    return new Promise((r) => setTimeout(r, Math.max(2e3, gaussianRandom() * 1e3)));
  }
  function gaussianDelay(minMs, maxMs) {
    minMs = minMs || 2e3;
    maxMs = maxMs || 5e3;
    const mean = (minMs + maxMs) / 2;
    const stddev = (maxMs - minMs) / 4;
    const delay = Math.max(minMs, Math.min(maxMs, gaussianRandom(mean / 1e3, stddev / 1e3) * 1e3));
    return new Promise((r) => setTimeout(r, delay));
  }
  function simulateReading() {
    const delay = 5e3 + Math.random() * 7e3;
    return new Promise((r) => setTimeout(r, delay));
  }
  async function simulateTyping(el, text, opts) {
    if (!el || typeof text !== "string") return false;
    if (el.hasAttribute && el.hasAttribute("readonly")) {
      return false;
    }
    const baseDelay = opts && opts.baseDelay || 30;
    const jitter = opts && opts.jitter || 90;
    const punctDelay = opts && opts.punctDelay || 300;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : null;
    const PUNCT = /* @__PURE__ */ new Set([".", ",", "!", "?", ";", ":", "\u2014", "\u2013"]);
    for (const ch of text) {
      if (nativeSetter) {
        nativeSetter.call(el, (el.value || "") + ch);
      } else {
        el.value = (el.value || "") + ch;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const delay = PUNCT.has(ch) ? punctDelay + Math.random() * 100 : baseDelay + Math.random() * jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
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
      autoLog.info("Queue empty -- mass apply complete");
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
      } catch (_e) {
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
      } catch (_e) {
      }
    }
    return [];
  }
  var HH_SELECTORS;
  var init_selectors = __esm({
    "src/lib/selectors.js"() {
      HH_SELECTORS = {
        // -- Vacancy Search --
        // ~= matches word in space-separated data-qa (e.g. "vacancy-serp__vacancy vacancy-serp-item_clickme")
        vacancyCard: ['[data-qa~="vacancy-serp__vacancy"]', '[data-qa="vacancy-serp__vacancy"]', '[class*="vacancy-serp-item"]'],
        vacancyTitleLink: ['a[data-qa="serp-item__title"]', 'a[data-qa="vacancy-serp__vacancy-title"]', 'a[href*="/vacancy/"]'],
        vacancyTitleText: ['[data-qa="serp-item__title-text"]'],
        vacancyCompany: ['[data-qa="vacancy-serp__vacancy-employer-text"]', 'a[data-qa="vacancy-serp__vacancy-employer"]'],
        vacancySalary: ['[data-qa="vacancy-serp__compensation"]'],
        vacancyLocation: ['[data-qa="vacancy-serp__vacancy-address"]'],
        vacancyExperience: ['[data-qa^="vacancy-serp__vacancy-work-experience"]'],
        vacancyTags: [".bloko-tag__text", '[data-qa*="tag"]'],
        replyButton: ['[data-qa="vacancy-serp__vacancy_response"]', '[data-qa="vacancy-response-link-top"]'],
        nextPage: ['[data-qa="pager-next"]'],
        // -- Main Page: Vacancy of the Day --
        vacancyOfTheDayCard: ['[data-qa="vacancy_of_the_day_title"]'],
        vacancyOfTheDayTitle: ['[data-qa="vacancy_of_the_day_title"]'],
        vacancyOfTheDayCompensation: ['[data-qa="vacancy_of_the_day_compensation"]'],
        vacancyOfTheDayCompany: ['[data-qa="vacancy_of_the_day_company"]'],
        vacancyOfTheDayReply: ['[data-qa="vacancy-response-link-top-again"]'],
        // -- Vacancy Page --
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
          ".bloko-tag__text",
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
        // Research: docs/research/04-negotiations-dom-analysis.md
        // Only data-qa is reliable (Magritte hashes break classes). Fallback chains:
        //   primary data-qa -> relaxed data-qa (prefix or word-match) -> Bloko BEM class (no hashes)
        negotiationsList: ['[data-qa="negotiations-list"]', '[data-qa^="negotiations-list"]', ".bloko-columns-item"],
        negotiationsItem: ['[data-qa="negotiations-item"]', '[data-qa~="negotiations-item"]', '[class*="negotiations-item"]:not([class*="negotiations-item-"])'],
        negotiationsItemCheckbox: ['[data-qa="negotiations-item-checkbox"]', 'input[type="checkbox"][data-qa*="negotiations"]'],
        negotiationsItemVacancy: ['[data-qa="negotiations-item-vacancy"]', '[data-qa^="negotiations-item-vacancy"]', '[class*="negotiations-item-vacancy"]'],
        negotiationsItemCompany: ['[data-qa="negotiations-item-company"]', '[data-qa^="negotiations-item-company"]', '[class*="negotiations-item-company"]'],
        negotiationsItemDate: ['[data-qa="negotiations-item-date"]', '[data-qa^="negotiations-item-date"]', '[class*="negotiations-item-date"]'],
        negotiationsItemTag: ['[data-qa^="negotiations-tag"]', '[data-qa~="negotiations-tag"]', ".bloko-tag", '[class*="negotiations-tag"]'],
        // -- Negotiations: employer-side statistics (optional, not always present) --
        negotiationsEmployerStats: ['[data-qa="negotiations-employer-statistics"]', '[data-qa^="negotiations-employer"]', '[class*="negotiations-employer"]'],
        // -- Chatik (/chat) --
        chatikLayout: ['[data-qa="chatik-layout"]'],
        chatikChatItem: ['[data-qa^="chatik-open-chat-"]'],
        chatikCheckboxOnlyUnread: ['[data-qa="chatik-checkbox-only-unread"]'],
        chatCellCreationTime: ['[data-qa="chat-cell-creation-time"]'],
        chatCellMeta: ['[data-qa="chat-cell-meta"]'],
        statusIconDelivered: ['[data-qa="status-icon-delivered"]'],
        statusIconRead: ['[data-qa="status-icon-read"]'],
        // -- Auth --
        loginEmailInput: ['input[name="username"]', 'input[type="email"]', 'input[data-qa="login-input-username"]'],
        loginPasswordInput: ['input[name="password"]', 'input[type="password"]', 'input[data-qa="login-input-password"]'],
        loginCaptchaImage: ['img[src*="captcha"]', ".g-recaptcha"],
        logged_in_indicator: ['[data-qa="mainmenu_applicant"]', '[data-qa="mainmenu_user_name"]', 'a[data-qa="mainmenu_myResumes"]']
      };
    }
  });

  // src/lib/skill-synonyms-data-sales.js
  var SALES_MANAGEMENT_SYNONYM_GROUPS;
  var init_skill_synonyms_data_sales = __esm({
    "src/lib/skill-synonyms-data-sales.js"() {
      SALES_MANAGEMENT_SYNONYM_GROUPS = [
        // ===========================================
        // ПРОДАЖИ / ПЕРЕГОВОРЫ
        // ===========================================
        [
          "\u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B",
          "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0432\u043E\u0437\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C\u0438",
          "\u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B",
          "\u0434\u0435\u043B\u043E\u0432\u043E\u0435 \u043E\u0431\u0449\u0435\u043D\u0438\u0435",
          "\u0434\u0435\u043B\u043E\u0432\u0430\u044F \u043A\u043E\u043C\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F",
          "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
          "\u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u043E\u0432"
        ],
        [
          "\u043F\u0440\u044F\u043C\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u0445\u043E\u043B\u043E\u0434\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u0445\u043E\u043B\u043E\u0434\u043D\u044B\u0435 \u0437\u0432\u043E\u043D\u043A\u0438",
          "\u0438\u0441\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0437\u0432\u043E\u043D\u043A\u0438"
        ],
        [
          "b2b \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u043F\u0440\u043E\u0434\u0430\u0436\u0438 b2b",
          "\u043A\u043E\u0440\u043F\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u043F\u0440\u043E\u0434\u0430\u0436\u0438 \u044E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u043B\u0438\u0446\u0430\u043C"
        ],
        [
          "b2c \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u043F\u0440\u043E\u0434\u0430\u0436\u0438 b2c",
          "\u0440\u043E\u0437\u043D\u0438\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
          "\u043F\u0440\u043E\u0434\u0430\u0436\u0438 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u043B\u0438\u0446\u0430\u043C"
        ],
        [
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C\u0438",
          "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043E\u0442\u0434\u0435\u043B\u043E\u043C \u043F\u0440\u043E\u0434\u0430\u0436",
          "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043E\u0442\u0434\u0435\u043B\u043E\u043C",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0442\u0434\u0435\u043B\u043E\u043C \u043F\u0440\u043E\u0434\u0430\u0436"
        ],
        [
          "\u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
          "\u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438",
          "\u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F \u043F\u0440\u043E\u0434\u0430\u0436",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u043E\u0440\u043E\u043D\u043A\u043E\u0439"
        ],
        [
          "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C\u0438",
          "\u043A\u043B\u0438\u0435\u043D\u0442\u043E\u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0441\u0442\u044C",
          "\u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432",
          "\u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432",
          "\u043A\u043B\u0438\u0435\u043D\u0442\u0441\u043A\u0438\u0439 \u0441\u0435\u0440\u0432\u0438\u0441"
        ],
        [
          "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
          "\u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u0440\u043E\u0434\u0430\u0436",
          "\u043E\u0442\u0447\u0435\u0442\u043D\u043E\u0441\u0442\u044C \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C",
          "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u0447\u0435\u0442\u043D\u043E\u0441\u0442\u0438"
        ],
        // ===========================================
        // УПРАВЛЕНИЕ / ЛИДЕРСТВО
        // ===========================================
        [
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
          "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
          "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B",
          "\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B",
          "\u043B\u0438\u0434\u0435\u0440\u0441\u0442\u0432\u043E"
        ],
        [
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0447\u0435\u0441\u043A\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u0438",
          "\u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442",
          "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u043E\u043C"
        ],
        [
          "\u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u0441\u0442\u0438\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E"
        ],
        [
          "\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
          "\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0431\u0438\u0437\u043D\u0435\u0441 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0430\u043C\u0438",
          "\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u0432",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0430\u043C\u0438"
        ],
        [
          "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
          "\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0438",
          "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
          "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442"
        ],
        [
          "\u0434\u0435\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
          "\u043F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u0434\u0430\u0447",
          "\u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447"
        ]
      ];
    }
  });

  // src/lib/skill-synonyms-data-marketing-finance.js
  var MARKETING_FINANCE_SYNONYM_GROUPS;
  var init_skill_synonyms_data_marketing_finance = __esm({
    "src/lib/skill-synonyms-data-marketing-finance.js"() {
      MARKETING_FINANCE_SYNONYM_GROUPS = [
        // ===========================================
        // МАРКЕТИНГ / АНАЛИТИКА
        // ===========================================
        [
          "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
          "\u043F\u0440\u043E\u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435",
          "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u044B\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F",
          "\u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0440\u044B\u043D\u043A\u0430",
          "\u0430\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432"
        ],
        [
          "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430",
          "\u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445",
          "data driven",
          "business intelligence"
        ],
        [
          "\u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
          "digital \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
          "\u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
          "\u043E\u043D\u043B\u0430\u0439\u043D \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433"
        ],
        // ===========================================
        // ФИНАНСЫ
        // ===========================================
        [
          "p&l",
          "\u043F\u043B\u0430\u043D \u0444\u0430\u043A\u0442",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u0431\u044B\u043B\u044C\u044E",
          "\u043E\u0442\u0447\u0435\u0442 \u043E \u043F\u0440\u0438\u0431\u044B\u043B\u044F\u0445 \u0438 \u0443\u0431\u044B\u0442\u043A\u0430\u0445",
          "profit and loss"
        ],
        [
          "\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437",
          "\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
          "\u0431\u0438\u0437\u043D\u0435\u0441 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
          "\u0431\u044E\u0434\u0436\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435"
        ]
      ];
    }
  });

  // src/lib/skill-synonyms-data-product-hr-it.js
  var PRODUCT_HR_IT_SYNONYM_GROUPS;
  var init_skill_synonyms_data_product_hr_it = __esm({
    "src/lib/skill-synonyms-data-product-hr-it.js"() {
      PRODUCT_HR_IT_SYNONYM_GROUPS = [
        // ===========================================
        // ПРОЕКТЫ / ПРОДУКТ
        // ===========================================
        [
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
          "project management",
          "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438"
        ],
        [
          "\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u044B\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442",
          "\u043F\u0440\u043E\u0434\u0430\u043A\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442",
          "product management",
          "product owner"
        ],
        [
          "\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430",
          "go to market",
          "gtm",
          "\u0432\u044B\u0432\u043E\u0434 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430 \u043D\u0430 \u0440\u044B\u043D\u043E\u043A"
        ],
        // ===========================================
        // HR / КАДРЫ
        // ===========================================
        [
          "\u043F\u043E\u0434\u0431\u043E\u0440 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u0440\u0435\u043A\u0440\u0443\u0442\u0438\u043D\u0433",
          "\u043D\u0430\u0439\u043C \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432",
          "\u043F\u043E\u0434\u0431\u043E\u0440 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432"
        ],
        [
          "\u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u043E\u043D\u0431\u043E\u0440\u0434\u0438\u043D\u0433",
          "onboarding"
        ],
        [
          "\u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
          "\u0430\u0441\u0441\u0435\u0441\u0441\u043C\u0435\u043D\u0442",
          "performance review"
        ],
        // ===========================================
        // ЛОГИСТИКА / СЕТЬ
        // ===========================================
        [
          "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C\u0438",
          "\u0437\u0430\u043A\u0443\u043F\u043A\u0438",
          "vendor management",
          "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C\u0438"
        ],
        [
          "\u0440\u0438\u0442\u0435\u0439\u043B",
          "\u0440\u043E\u0437\u043D\u0438\u0447\u043D\u0430\u044F \u0442\u043E\u0440\u0433\u043E\u0432\u043B\u044F",
          "\u0442\u043E\u0440\u0433\u043E\u0432\u0430\u044F \u0441\u0435\u0442\u044C",
          "fmcg"
        ],
        // ===========================================
        // IT -- related tech skills
        // ===========================================
        [
          "javascript",
          "js",
          "ecmascript"
        ],
        [
          "typescript",
          "ts"
        ],
        [
          "ci/cd",
          "continuous integration",
          "continuous delivery"
        ],
        [
          "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u0432",
          "\u0440\u043E\u0431\u043E\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u0432",
          "rpa",
          "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F"
        ]
      ];
    }
  });

  // src/lib/skill-synonyms.js
  function buildSynonymIndex() {
    const index = /* @__PURE__ */ new Map();
    const allMembers = /* @__PURE__ */ new Set();
    for (const group of SYNONYM_GROUPS) {
      const normalizedGroup = group.map((s) => normalize(s));
      for (const skill of normalizedGroup) {
        allMembers.add(skill);
        if (!index.has(skill)) {
          index.set(skill, /* @__PURE__ */ new Set());
        }
        for (const other of normalizedGroup) {
          if (other !== skill) {
            index.get(skill).add(other);
          }
        }
      }
    }
    _allGroupMembers = allMembers;
    return index;
  }
  function normalize(name) {
    return (name || "").toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
  }
  function stripSkillPrefix(normalized) {
    for (const prefix of SKILL_PREFIXES) {
      if (normalized.startsWith(prefix)) {
        const stripped = normalized.slice(prefix.length).trim();
        if (stripped.length > 0) return stripped;
      }
    }
    return normalized;
  }
  function contentWords(normalized) {
    return normalized.split(/\s+/).filter((w) => w.length >= STEM_MIN_WORD);
  }
  function crudeStem(word) {
    return word.toLowerCase().substring(0, STEM_LEN);
  }
  function stemMatchSkills(normA, normB) {
    const wordsA = contentWords(normA);
    const wordsB = contentWords(normB);
    if (wordsA.length === 0 || wordsB.length === 0) return false;
    for (const wa of wordsA) {
      const sa = crudeStem(wa);
      for (const wb of wordsB) {
        if (sa === crudeStem(wb)) return true;
      }
    }
    return false;
  }
  function findSynonymMatch(skillA, skillSet) {
    if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
    const normA = normalize(skillA);
    const synonyms = _synonymIndex.get(normA);
    if (synonyms) {
      for (const syn of synonyms) {
        if (skillSet.has(syn)) return syn;
      }
    }
    const stripped = stripSkillPrefix(normA);
    if (stripped !== normA) {
      const strippedSynonyms = _synonymIndex.get(stripped);
      if (strippedSynonyms) {
        for (const syn of strippedSynonyms) {
          if (skillSet.has(syn)) return syn;
        }
      }
    }
    if (!_allGroupMembers) buildSynonymIndex();
    for (const resumeSkill of skillSet) {
      if (!_allGroupMembers.has(resumeSkill)) continue;
      const groupSynonyms = _synonymIndex.get(resumeSkill);
      if (!groupSynonyms) continue;
      for (const member of groupSynonyms) {
        if (stemMatchSkills(normA, member)) return resumeSkill;
      }
    }
    return null;
  }
  function getSynonyms(skill) {
    if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
    return _synonymIndex.get(normalize(skill)) || /* @__PURE__ */ new Set();
  }
  function areSynonyms(skillA, skillB) {
    if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
    const synonyms = _synonymIndex.get(normalize(skillA));
    return synonyms ? synonyms.has(normalize(skillB)) : false;
  }
  var SYNONYM_GROUPS, _synonymIndex, _allGroupMembers, SKILL_PREFIXES, STEM_MIN_WORD, STEM_LEN, SYNONYM_WEIGHT;
  var init_skill_synonyms = __esm({
    "src/lib/skill-synonyms.js"() {
      init_skill_synonyms_data_sales();
      init_skill_synonyms_data_marketing_finance();
      init_skill_synonyms_data_product_hr_it();
      SYNONYM_GROUPS = [
        ...SALES_MANAGEMENT_SYNONYM_GROUPS,
        ...MARKETING_FINANCE_SYNONYM_GROUPS,
        ...PRODUCT_HR_IT_SYNONYM_GROUPS
      ];
      _synonymIndex = null;
      _allGroupMembers = null;
      SKILL_PREFIXES = [
        "\u043D\u0430\u0432\u044B\u043A\u0438 ",
        "\u043D\u0430\u0432\u044B\u043A ",
        "\u0443\u043C\u0435\u043D\u0438\u0435 ",
        "\u0437\u043D\u0430\u043D\u0438\u0435 "
      ];
      STEM_MIN_WORD = 4;
      STEM_LEN = 4;
      SYNONYM_WEIGHT = 0.5;
    }
  });

  // src/lib/role-implied-skills.js
  function normalize2(str) {
    return (str || "").toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
  }
  function getRoleImpliedSkills(title) {
    const result = /* @__PURE__ */ new Set();
    if (!title) return result;
    const normalizedTitle = normalize2(title);
    for (const group of ROLE_SKILL_MAP) {
      const triggered = group.triggers.some((trigger) => normalizedTitle.includes(normalize2(trigger)));
      if (!triggered) continue;
      const excluded = group.exclude.some((exc) => normalizedTitle.includes(normalize2(exc)));
      if (excluded) continue;
      for (const skill of group.implied) {
        result.add(normalize2(skill));
      }
    }
    return result;
  }
  function isSkillImpliedByRole(skill, title) {
    return getRoleImpliedSkills(title).has(normalize2(skill));
  }
  var ROLE_SKILL_MAP, IMPLIED_WEIGHT;
  var init_role_implied_skills = __esm({
    "src/lib/role-implied-skills.js"() {
      ROLE_SKILL_MAP = [
        // ===========================================
        // РУКОВОДИТЕЛЬ / ДИРЕКТОР / НАЧАЛЬНИК / HEAD
        // ===========================================
        {
          triggers: ["\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B", "\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440", "\u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A", "head of", "director", "chief", "vp", "c\u0442\u043E", "cto", "ceo", "coo", "cfo"],
          exclude: ["\u0437\u0430\u043C\u0435\u0441\u0442\u0438\u0442\u0435\u043B\u044C", "\u0437\u0430\u043C ", "\u0437\u0430\u043C.", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "assistant", "deputy", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440"],
          implied: [
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
            "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
            "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043A\u043E\u043B\u043B\u0435\u043A\u0442\u0438\u0432\u043E\u043C",
            "\u0434\u0435\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u0434\u0430\u0447",
            "\u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
            "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
            "\u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F",
            "\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043F\u0440\u0438\u043D\u044F\u0442\u0438\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0439",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u043E\u043C"
          ]
        },
        // ===========================================
        // РУКОВОДИТЕЛЬ ОТДЕЛА ПРОДАЖ (комбинация)
        // ===========================================
        {
          triggers: ["\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043E\u0442\u0434\u0435\u043B", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043F\u0440\u043E\u0434\u0430\u0436", "head of sales", "\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", "\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u0440\u043E\u0434\u0430\u0436", "\u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440", "\u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u043E\u0442\u0434\u0435\u043B \u043F\u0440\u043E\u0434\u0430\u0436"],
          exclude: ["\u0437\u0430\u043C\u0435\u0441\u0442\u0438\u0442\u0435\u043B\u044C", "\u0437\u0430\u043C ", "\u0437\u0430\u043C.", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "deputy"],
          implied: [
            // From leadership
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
            "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
            "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043A\u043E\u043B\u043B\u0435\u043A\u0442\u0438\u0432\u043E\u043C",
            "\u0434\u0435\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
            "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
            "\u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F",
            "\u043F\u0440\u0438\u043D\u044F\u0442\u0438\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0439",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u043E\u043C",
            // From sales
            "\u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B",
            "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
            "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C\u0438",
            "\u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
            "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
            "\u043F\u0440\u044F\u043C\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
            "\u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
            "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
            "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0432\u043E\u0437\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C\u0438",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C\u0438",
            "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043E\u0442\u0434\u0435\u043B\u043E\u043C \u043F\u0440\u043E\u0434\u0430\u0436",
            "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F \u043F\u0440\u043E\u0434\u0430\u0436",
            "kpi"
          ]
        },
        // ===========================================
        // МЕНЕДЖЕР ПО ПРОДАЖАМ
        // ===========================================
        {
          triggers: ["\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u0434\u0430\u0436", "sales manager", "sales representative", "\u0442\u043E\u0440\u0433\u043E\u0432\u044B\u0439 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043B\u044C", "\u0430\u0433\u0435\u043D\u0442 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C"],
          exclude: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440", "junior"],
          implied: [
            "\u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B",
            "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
            "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C\u0438",
            "\u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
            "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
            "\u043F\u0440\u044F\u043C\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
            "\u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
            "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436",
            "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0432\u043E\u0437\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C\u0438",
            "\u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432"
          ]
        },
        // ===========================================
        // МАРКЕТОЛОГ
        // ===========================================
        {
          triggers: ["\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433", "marketing manager", "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u0443", "digital \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433", "director of marketing", "\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u043E \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u0443", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433", "cmo"],
          exclude: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440"],
          implied: [
            "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
            "\u043F\u0440\u043E\u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435",
            "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u044B\u0435 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u044F",
            "\u0430\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432",
            "\u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
            "digital \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
            "\u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430",
            "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430"
          ]
        },
        // ===========================================
        // HR-СПЕЦИАЛИСТ
        // ===========================================
        {
          triggers: ["hr", "\u043A\u0430\u0434\u0440\u043E\u0432", "\u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440", "recruiter", "hr \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "hr \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C hr", "\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", "hr director", "hrbp"],
          exclude: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440"],
          implied: [
            "\u043F\u043E\u0434\u0431\u043E\u0440 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0440\u0435\u043A\u0440\u0443\u0442\u0438\u043D\u0433",
            "\u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043E\u043D\u0431\u043E\u0440\u0434\u0438\u043D\u0433",
            "\u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
            "\u043A\u0430\u0434\u0440\u043E\u0432\u043E\u0435 \u0434\u0435\u043B\u043E\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0441\u0442\u0432\u043E"
          ]
        },
        // ===========================================
        // ПРОЕКТНЫЙ МЕНЕДЖЕР
        // ===========================================
        {
          triggers: ["project manager", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043F\u0440\u043E\u0435\u043A\u0442", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u0435\u043A\u0442", "pm ", "\u043F\u0440\u043E\u0434\u0436\u0435\u043A\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440"],
          exclude: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440"],
          implied: [
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
            "project management",
            "\u0434\u0435\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0437\u0430\u0434\u0430\u0447",
            "\u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F",
            "\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439",
            "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435"
          ]
        },
        // ===========================================
        // ФИНАНСОВЫЙ СПЕЦИАЛИСТ
        // ===========================================
        {
          triggers: ["\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432", "\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440", "accountant", "cfo", "financial", "\u044D\u043A\u043E\u043D\u043E\u043C\u0438\u0441\u0442", "\u0430\u0443\u0434\u0438\u0442\u043E\u0440", "auditor"],
          exclude: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A", "\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440"],
          implied: [
            "\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437",
            "\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u0431\u044E\u0434\u0436\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
            "\u043E\u0442\u0447\u0435\u0442\u043D\u043E\u0441\u0442\u044C",
            "\u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445",
            "p&l"
          ]
        }
      ];
      IMPLIED_WEIGHT = 0.4;
    }
  });

  // src/lib/match-scorer-skills.js
  function scoreSkills(resume, vacancy) {
    const resumeSkills = normalizeSkillSet(resume.skills || []);
    const derivedSkills = normalizeSkillSet(resume.derivedSkills || []);
    let vacancySkillsRaw = vacancy.keySkills || [];
    if (vacancySkillsRaw.length === 0 && vacancy.derivedSkills && vacancy.derivedSkills.length > 0) {
      skillLog.info("No vacancy keySkills -- using derivedSkills (" + vacancy.derivedSkills.length + ")");
      vacancySkillsRaw = vacancy.derivedSkills;
    }
    const vacancySkills = normalizeSkillSet(vacancySkillsRaw);
    const allResumeSkills = /* @__PURE__ */ new Set([...resumeSkills, ...derivedSkills]);
    if (vacancySkills.size === 0) {
      return { score: 0, matching: [], missing: [], extra: [], derivedMatch: [], synonymMatch: [], impliedMatch: [] };
    }
    const matching = [];
    const derivedMatch = [];
    const synonymMatch = [];
    const impliedMatch = [];
    const missing = [];
    const roleImplied = getRoleImpliedSkills(resume.title || "");
    const allResume = /* @__PURE__ */ new Set([...resumeSkills, ...derivedSkills]);
    for (const skill of vacancySkills) {
      if (resumeSkills.has(skill)) {
        matching.push(skill);
      } else if (derivedSkills.has(skill)) {
        derivedMatch.push(skill);
      } else {
        const synMatch = findSynonymMatch(skill, allResume);
        if (synMatch) {
          synonymMatch.push(skill + " ~ " + synMatch);
        } else if (roleImplied.has(skill)) {
          impliedMatch.push(skill);
        } else {
          missing.push(skill);
        }
      }
    }
    const extra = [];
    for (const skill of allResumeSkills) {
      if (!vacancySkills.has(skill)) extra.push(skill);
    }
    const explicitWeight = 1;
    const derivedWeight = 0.7;
    const effectiveMatches = matching.length * explicitWeight + derivedMatch.length * derivedWeight + synonymMatch.length * SYNONYM_WEIGHT + impliedMatch.length * IMPLIED_WEIGHT;
    const vacSkillCount = vacancySkills.size;
    let confidenceFactor = 1;
    if (vacSkillCount === 1) {
      confidenceFactor = 0.3;
    } else if (vacSkillCount === 2) {
      confidenceFactor = 0.5;
    } else if (vacSkillCount <= 4) {
      confidenceFactor = 0.7;
    }
    const ratio = vacancySkills.size > 0 ? effectiveMatches / vacancySkills.size : 0;
    const score = Math.min(40, Math.round(ratio * 40 * confidenceFactor));
    skillLog.info("explicit=" + matching.length + " derived=" + derivedMatch.length + " synonym=" + synonymMatch.length + " implied=" + impliedMatch.length + " missing=" + missing.length + " -> " + score + "/40");
    return { score, matching, missing, extra, derivedMatch, synonymMatch, impliedMatch };
  }
  function normalizeSkillSet(skills) {
    const set = /* @__PURE__ */ new Set();
    for (const s of skills) {
      const name = typeof s === "string" ? s : s.name || "";
      if (name) {
        set.add(
          name.toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ")
          // collapse multiple spaces
        );
      }
    }
    return set;
  }
  var skillLog;
  var init_match_scorer_skills = __esm({
    "src/lib/match-scorer-skills.js"() {
      init_anti_hallucination();
      init_skill_synonyms();
      init_role_implied_skills();
      skillLog = createLogger("Scorer:Skills");
    }
  });

  // src/lib/match-scorer-title.js
  function scoreTitle(resume, vacancy) {
    const resumeTitle = (resume.title || "").toLowerCase().trim();
    const vacancyTitle = (vacancy.title || "").toLowerCase().trim();
    if (!resumeTitle || !vacancyTitle) {
      return { score: 0, similarity: 0 };
    }
    if (resumeTitle === vacancyTitle) {
      return { score: 30, similarity: 1 };
    }
    const resumeWords = tokenize(resumeTitle);
    const vacancyWords = tokenize(vacancyTitle);
    if (vacancyWords.length === 0) {
      return { score: 0, similarity: 0 };
    }
    let overlapCount = 0;
    for (const w of vacancyWords) {
      if (resumeWords.has(w)) {
        overlapCount++;
      } else {
        if (stemMatchAny(w, resumeWords)) {
          overlapCount += 0.7;
        }
      }
    }
    const similarity = Math.min(1, overlapCount / vacancyWords.size);
    const bonus = titleBonus(resumeTitle, vacancyTitle);
    const rawScore = similarity * 25 + bonus;
    const score = Math.min(30, Math.round(rawScore));
    return { score, similarity: Math.round(similarity * 100) / 100 };
  }
  function crudeStem2(word) {
    return word.length >= STEM_MIN_LEN ? word.substring(0, STEM_LEN2) : word;
  }
  function buildStemMap(words) {
    const map = /* @__PURE__ */ new Map();
    for (const w of words) {
      const s = crudeStem2(w);
      if (s.length < STEM_MIN_LEN) continue;
      if (!map.has(s)) map.set(s, []);
      map.get(s).push(w);
    }
    return map;
  }
  function stemMatchAny(word, wordSet) {
    if (word.length < STEM_MIN_LEN) return false;
    const stem = crudeStem2(word);
    for (const other of wordSet) {
      if (other === word) continue;
      if (other.length < STEM_MIN_LEN) continue;
      if (crudeStem2(other) === stem) return true;
    }
    return false;
  }
  function titleBonus(resumeTitle, vacancyTitle) {
    for (const entry of ABBR_MAP) {
      const abbr = entry.a.toLowerCase();
      const resumeHas = resumeTitle.includes(abbr);
      const vacancyHas = vacancyTitle.includes(abbr);
      if (resumeHas && vacancyHas) continue;
      const resumeHasFull = resumeHas || entry.f.some((f) => resumeTitle.includes(f.toLowerCase()));
      const vacancyHasFull = vacancyHas || entry.f.some((f) => vacancyTitle.includes(f.toLowerCase()));
      if (resumeHasFull && vacancyHasFull) {
        if (!resumeHas || !vacancyHas || entry.f.length > 0) {
          return 5;
        }
      }
    }
    return 0;
  }
  function tokenize(text) {
    const stopWords = /* @__PURE__ */ new Set([
      "\u0432",
      "\u043D\u0430",
      "\u0438",
      "\u0441",
      "\u043E\u0442",
      "\u0434\u043E",
      "\u0437\u0430",
      "\u043F\u043E",
      "\u0438\u0437",
      "\u043A",
      "\u043E",
      "\u043D\u0435",
      "\u043D\u043E",
      "\u0438\u043B\u0438",
      "\u0434\u043B\u044F",
      "\u043A\u0430\u043A",
      "\u043F\u0440\u0438",
      "\u0431\u0435\u0437",
      "the",
      "a",
      "an",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "and",
      "or",
      "from",
      "by"
    ]);
    const words = /* @__PURE__ */ new Set();
    text.split(/[-\s\u2013\u2014/,|]+/).forEach((w) => {
      const clean = w.replace(/[^a-zа-яё0-9#+.]/g, "").trim();
      if (clean.length >= 2 && !stopWords.has(clean)) words.add(clean);
    });
    return words;
  }
  var ABBR_MAP, STEM_MIN_LEN, STEM_LEN2;
  var init_match_scorer_title = __esm({
    "src/lib/match-scorer-title.js"() {
      ABBR_MAP = [
        // -- IT / Development --
        { a: "\u0440\u043E\u043F", f: ["\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043E\u0442\u0434\u0435\u043B\u0430 \u043F\u0440\u043E\u0434\u0430\u0436"] },
        { a: "\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0441\u0442", f: ["\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "devops", f: ["\u0434\u0435\u0432\u043E\u043F\u0441", "\u0438\u043D\u0436\u0435\u043D\u0435\u0440 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438", "\u0441\u0438\u0441\u0430\u0434\u043C\u0438\u043D"] },
        { a: "frontend", f: ["\u0444\u0440\u043E\u043D\u0442\u0435\u043D\u0434", "front-end", "front end", "\u0432\u0435\u0431-\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "\u0444\u0440\u043E\u043D\u0442\u0435\u043D\u0434", f: ["frontend", "front-end", "front end", "\u0432\u0435\u0431-\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "backend", f: ["\u0431\u044D\u043A\u0435\u043D\u0434", "back-end", "back end", "\u0441\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u0439 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "\u0431\u044D\u043A\u0435\u043D\u0434", f: ["backend", "back-end", "back end", "\u0441\u0435\u0440\u0432\u0435\u0440\u043D\u044B\u0439 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "fullstack", f: ["\u0444\u0443\u043B\u0441\u0442\u0435\u043A", "full-stack", "full stack", "\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0441\u0442 \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0446\u0438\u043A\u043B\u0430"] },
        { a: "\u0444\u0443\u043B\u0441\u0442\u0435\u043A", f: ["fullstack", "full-stack", "full stack", "\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0441\u0442 \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0446\u0438\u043A\u043B\u0430"] },
        { a: "c#", f: ["csharp", "\u0441\u0438 \u0448\u0430\u0440\u043F"] },
        { a: ".net", f: ["dotnet", "\u0434\u043E\u0442\u043D\u0435\u0442"] },
        { a: "qa", f: ["quality assurance", "\u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0449\u0438\u043A", "\u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0449\u0438\u043A \u043F\u043E"] },
        { a: "\u0441\u0438\u0441\u0430\u0434\u043C\u0438\u043D", f: ["\u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440", "\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432"] },
        { a: "android", f: ["\u0430\u043D\u0434\u0440\u043E\u0438\u0434"] },
        { a: "ios", f: ["\u0430\u0439\u043E\u0441", "\u0430\u0439\u0444\u043E\u043D\u0435", "iphone"] },
        { a: "1\u0441", f: ["1\u0441:\u043F\u0440\u0435\u0434\u043F\u0440\u0438\u044F\u0442\u0438\u0435", "1\u0441-\u0431\u0438\u0442\u0440\u0438\u043A\u0441"] },
        { a: "ml", f: ["machine learning", "\u043C\u0430\u0448\u0438\u043D\u043D\u043E\u0435 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435"] },
        { a: "data scientist", f: ["\u0434\u0430\u0442\u0430 \u0441\u0430\u0435\u043D\u0442\u0438\u0441\u0442", "\u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0434\u0430\u043D\u043D\u044B\u0445"] },
        { a: "tech lead", f: ["\u0442\u0435\u0445\u043B\u0438\u0434", "\u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043B\u0438\u0434", "\u0432\u0435\u0434\u0443\u0449\u0438\u0439 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "\u0442\u0435\u0445\u043B\u0438\u0434", f: ["tech lead", "\u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043B\u0438\u0434", "\u0432\u0435\u0434\u0443\u0449\u0438\u0439 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A"] },
        { a: "team lead", f: ["\u0442\u0438\u043C\u043B\u0438\u0434", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u0433\u0440\u0443\u043F\u043F\u044B \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0438"] },
        { a: "\u0442\u0438\u043C\u043B\u0438\u0434", f: ["team lead", "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u0433\u0440\u0443\u043F\u043F\u044B \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0438"] },
        { a: "cto", f: ["\u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440"] },
        { a: "pm", f: ["project manager", "\u043F\u0440\u043E\u0434\u0436\u0435\u043A\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432"] },
        { a: "sre", f: ["site reliability engineer", "\u0438\u043D\u0436\u0435\u043D\u0435\u0440 \u043D\u0430\u0434\u0435\u0436\u043D\u043E\u0441\u0442\u0438"] },
        { a: "dba", f: ["\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0431\u0430\u0437 \u0434\u0430\u043D\u043D\u044B\u0445"] },
        // -- Sales --
        { a: "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", f: ["\u0442\u043E\u0440\u0433\u043E\u0432\u044B\u0439 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043B\u044C", "\u0430\u0433\u0435\u043D\u0442 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C", "sales manager"] },
        { a: "sales manager", f: ["\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C"] },
        { a: "b2b", f: ["b2b \u043F\u0440\u043E\u0434\u0430\u0436\u0438"] },
        { a: "kAM", f: ["key account manager", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C"] },
        // -- Marketing --
        { a: "smm", f: ["\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u0441\u043E\u0446\u0441\u0435\u0442\u044F\u043C", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0441\u043E\u0446\u0441\u0435\u0442\u044F\u043C", "\u0441\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u0435\u0442\u0438"] },
        { a: "seo", f: ["\u043F\u043E\u0438\u0441\u043A\u043E\u0432\u0430\u044F \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0441\u0435\u043E"] },
        { a: "ppc", f: ["\u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043D\u0430\u044F \u0440\u0435\u043A\u043B\u0430\u043C\u0430", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0440\u0435\u043A\u043B\u0430\u043C\u0435"] },
        { a: "prm", f: ["pr \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u0441\u0432\u044F\u0437\u044F\u043C \u0441 \u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C\u044E"] },
        { a: "content manager", f: ["\u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440", "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u043E \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0443"] },
        { a: "digital", f: ["\u0434\u0438\u0434\u0436\u0438\u0442\u0430\u043B", "\u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433"] },
        { a: "growth hacker", f: ["\u0433\u0440\u043E\u0443\u0441 \u0445\u0430\u043A\u0435\u0440", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0440\u043E\u0441\u0442\u0443"] },
        { a: "targetolog", f: ["\u0442\u0430\u0440\u0433\u0435\u0442\u043E\u043B\u043E\u0433", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u0442\u0430\u0440\u0433\u0435\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0439 \u0440\u0435\u043A\u043B\u0430\u043C\u0435"] },
        { a: "copywriter", f: ["\u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442\u0435\u0440", "\u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442\u0435\u0440"] },
        // -- HR --
        { a: "hr", f: ["\u043A\u0430\u0434\u0440\u043E\u0432\u0438\u043A", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", "hr \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442"] },
        { a: "hrbp", f: ["hr \u0431\u0438\u0437\u043D\u0435\u0441-\u043F\u0430\u0440\u0442\u043D\u0435\u0440", "\u0431\u0438\u0437\u043D\u0435\u0441-\u043F\u0430\u0440\u0442\u043D\u0435\u0440 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443"] },
        { a: "recruiter", f: ["\u0440\u0435\u043A\u0440\u0443\u0442\u0435\u0440", "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u043F\u043E \u043F\u043E\u0434\u0431\u043E\u0440\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430"] },
        { a: "hr-\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440", f: ["\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443", "hr director"] },
        // -- Finance --
        { a: "cfo", f: ["\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440"] },
        { a: "\u4F1A\u8BA1\u5E08", f: ["\u0431\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440"] },
        { a: "\u0430\u0443\u0434\u0438\u0442\u043E\u0440", f: ["\u0430\u0443\u0434\u0438\u0442\u043E\u0440"] },
        { a: "analyst", f: ["\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A"] },
        // -- General / Admin --
        { a: "assistant", f: ["\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442", "\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A"] },
        { a: "a/pm", f: ["\u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430"] },
        { a: "ceo", f: ["\u0433\u0435\u043D\u0435\u0440\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440"] },
        { a: "coo", f: ["\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440"] },
        { a: "cmo", f: ["\u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440 \u043F\u043E \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u0443"] },
        { a: "vp", f: ["\u0432\u0438\u0446\u0435-\u043F\u0440\u0435\u0437\u0438\u0434\u0435\u043D\u0442"] },
        { a: "head of", f: ["\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", "\u0433\u043B\u0430\u0432\u0430"] },
        { a: "lead", f: ["\u0432\u0435\u0434\u0443\u0449\u0438\u0439", "\u043B\u0438\u0434\u0435\u0440"] },
        { a: "senior", f: ["\u0441\u0442\u0430\u0440\u0448\u0438\u0439", "\u0441\u0435\u043D\u044C\u043E\u0440"] },
        { a: "junior", f: ["\u043C\u043B\u0430\u0434\u0448\u0438\u0439", "\u044E\u043D\u0438\u043E\u0440"] },
        { a: "middle", f: ["\u043C\u0438\u0434\u043B", "\u043F\u0440\u043E\u043C\u0435\u0436\u0443\u0442\u043E\u0447\u043D\u044B\u0439"] },
        { a: "\u0441\u0442\u0430\u0436\u0435\u0440", f: ["\u0441\u0442\u0430\u0436\u0451\u0440", "intern", "\u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430\u043D\u0442"] },
        { a: "intern", f: ["\u0441\u0442\u0430\u0436\u0435\u0440", "\u0441\u0442\u0430\u0436\u0451\u0440", "\u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430\u043D\u0442"] }
      ];
      STEM_MIN_LEN = 4;
      STEM_LEN2 = 5;
    }
  });

  // src/lib/match-scorer-salary.js
  function scoreSalary(resume, vacancy) {
    const resumeSalary = parseResumeSalary(resume.salary || "");
    let vacSalary = vacancy.salary || {};
    if (typeof vacSalary === "string") {
      vacSalary = parseVacancySalaryString(vacSalary);
    }
    if (!resumeSalary && !vacSalary.min && !vacSalary.max) {
      return { score: 8, reason: "no-data" };
    }
    if (!resumeSalary) {
      return { score: 8, reason: "resume-no-salary" };
    }
    if (!vacSalary.min && !vacSalary.max) {
      return { score: 8, reason: "vacancy-no-salary" };
    }
    const vacMin = vacSalary.min || 0;
    const vacMax = vacSalary.max || Infinity;
    if (resumeSalary >= vacMin && resumeSalary <= vacMax) {
      return { score: 15, reason: "within-range" };
    }
    if (resumeSalary < vacMin && resumeSalary >= vacMin * 0.8) {
      return { score: 12, reason: "slightly-below" };
    }
    if (resumeSalary > vacMax && resumeSalary <= vacMax * 1.2) {
      return { score: 10, reason: "slightly-above" };
    }
    if (resumeSalary < vacMin) {
      return { score: 5, reason: "below-range" };
    }
    return { score: 3, reason: "above-range" };
  }
  function parseResumeSalary(salaryStr) {
    if (!salaryStr || typeof salaryStr !== "string") return null;
    const nums = salaryStr.match(/\d[\d\s]*\d/g);
    if (!nums || nums.length === 0) return null;
    return parseInt(nums[0].replace(/\s/g, ""), 10) || null;
  }
  function parseVacancySalaryString(salaryStr) {
    if (!salaryStr || typeof salaryStr !== "string") return {};
    const cleaned = salaryStr.replace(/[руб.$евроруб.]/gi, "").replace(/\s+/g, " ");
    const nums = cleaned.match(/\d[\d\s]*\d/g);
    if (!nums || nums.length === 0) return {};
    const parsed = nums.map((n) => parseInt(n.replace(/\s/g, ""), 10)).filter((n) => !isNaN(n));
    if (parsed.length === 0) return {};
    const lowerStr = salaryStr.toLowerCase();
    if (/^от|^from/i.test(lowerStr) && parsed.length >= 1) {
      return { min: parsed[0], max: null };
    }
    if (/^до|^up\s*to/i.test(lowerStr) && parsed.length >= 1) {
      return { min: null, max: parsed[0] };
    }
    if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
    return { min: parsed[0], max: parsed[1] };
  }
  var init_match_scorer_salary = __esm({
    "src/lib/match-scorer-salary.js"() {
    }
  });

  // src/lib/parse-experience.js
  function parseExperienceString(raw) {
    if (!raw) return { raw: "", min: null, max: null };
    const text = raw.toLowerCase().trim();
    if (/нет\s*опыт|не\s*требу|без\s*опыт/.test(text)) {
      return { raw, min: 0, max: 0 };
    }
    const moreMatch = text.match(/(?:более|от|свыше)\s+(\d+)/);
    if (moreMatch) {
      return { raw, min: parseInt(moreMatch[1], 10), max: null };
    }
    const rangeMatch = text.match(/(\d+)\s*[\u2013\u2014-\s]+\s*(\d+)/);
    if (rangeMatch) {
      return { raw, min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
    }
    const exactMatch = text.match(/(\d+)\s*(?:год|лет)/);
    if (exactMatch) {
      return { raw, min: parseInt(exactMatch[1], 10), max: null };
    }
    const monthOnlyMatch = text.match(/(\d+)\s*мес/);
    if (monthOnlyMatch) {
      const years = parseInt(monthOnlyMatch[1], 10) / 12;
      return { raw, min: Math.round(years * 10) / 10, max: Math.round(years * 10) / 10 };
    }
    return { raw, min: null, max: null };
  }
  var init_parse_experience = __esm({
    "src/lib/parse-experience.js"() {
    }
  });

  // src/lib/match-scorer-experience.js
  function scoreExperience(resume, vacancy) {
    let vacExp = vacancy.experience || {};
    if (typeof vacExp === "string") {
      vacExp = parseExperienceString(vacExp);
    }
    if (vacExp.min === 0 && vacExp.max === 0) {
      return { score: 15, reason: "no-experience-required" };
    }
    const resumeYears = calcResumeYears(resume.experience || []);
    if (resumeYears === null) {
      return { score: 8, reason: "unknown-resume-exp" };
    }
    if (vacExp.min == null && vacExp.max == null) {
      return { score: 8, reason: "unknown-vacancy-exp" };
    }
    const vacMin = vacExp.min || 0;
    const vacMax = vacExp.max || 99;
    if (resumeYears >= vacMin && resumeYears <= vacMax) {
      return { score: 15, reason: "within-range" };
    }
    if (resumeYears < vacMin && resumeYears >= vacMin - 1) {
      return { score: 10, reason: "slightly-below" };
    }
    if (resumeYears > vacMax) {
      return { score: 8, reason: "overqualified" };
    }
    return { score: 3, reason: "below-range" };
  }
  function calcResumeYears(experience) {
    if (!Array.isArray(experience) || experience.length === 0) return null;
    let totalMonths = 0;
    for (const exp of experience) {
      if (exp.duration && typeof exp.duration === "object") {
        totalMonths += (exp.duration.years || 0) * 12 + (exp.duration.months || 0);
      } else if (typeof exp.duration === "string") {
        const yearMatch = exp.duration.match(/(\d+)\s*(год|лет)/i);
        const monthMatch = exp.duration.match(/(\d+)\s*мес/i);
        if (yearMatch) totalMonths += parseInt(yearMatch[1], 10) * 12;
        if (monthMatch) totalMonths += parseInt(monthMatch[1], 10);
      }
    }
    if (totalMonths === 0) return null;
    return Math.round(totalMonths / 12 * 10) / 10;
  }
  var init_match_scorer_experience = __esm({
    "src/lib/match-scorer-experience.js"() {
      init_parse_experience();
    }
  });

  // src/lib/location-city-data.js
  var CITY_REGIONS, REGION_IDS, CITY_ABBREVIATIONS;
  var init_location_city_data = __esm({
    "src/lib/location-city-data.js"() {
      CITY_REGIONS = {
        // Москва и МО
        "\u043C\u043E\u0441\u043A\u0432\u0430": "moscow",
        "\u043C\u0441\u043A": "moscow",
        "\u043C\u043E\u0441\u043A\u0432\u0430 \u0433\u043E\u0440\u043E\u0434": "moscow",
        "\u0431\u0430\u043B\u0430\u0448\u0438\u0445\u0430": "moscow",
        "\u043B\u044E\u0431\u0435\u0440\u0446\u044B": "moscow",
        "\u043C\u044B\u0442\u0438\u0449\u0438": "moscow",
        "\u0445\u0438\u043C\u043A\u0438": "moscow",
        "\u043A\u0440\u0430\u0441\u043D\u043E\u0433\u043E\u0440\u0441\u043A": "moscow",
        "\u043F\u043E\u0434\u043E\u043B\u044C\u0441\u043A": "moscow",
        "\u043E\u0434\u0438\u043D\u0446\u043E\u0432\u043E": "moscow",
        "\u0434\u043E\u043C\u043E\u0434\u0435\u0434\u043E\u0432\u043E": "moscow",
        "\u0440\u0435\u0443\u0442\u043E\u0432": "moscow",
        "\u043A\u043E\u0440\u043E\u043B\u0451\u0432": "moscow",
        "\u044D\u043B\u0435\u043A\u0442\u0440\u043E\u0441\u0442\u0430\u043B\u044C": "moscow",
        "\u0436\u0443\u043A\u043E\u0432\u0441\u043A\u0438\u0439": "moscow",
        "\u0440\u0430\u043C\u0435\u043D\u0441\u043A\u043E\u0435": "moscow",
        "\u0434\u043E\u043B\u0433\u043E\u043F\u0440\u0443\u0434\u043D\u044B\u0439": "moscow",
        "\u043F\u0443\u0449\u0438\u043D\u043E": "moscow",
        "\u043A\u043E\u043B\u043E\u043C\u043D\u0430": "moscow",
        "\u0441\u0435\u0440\u0433\u0438\u0435\u0432 \u043F\u043E\u0441\u0430\u0434": "moscow",
        "\u043F\u043E\u0434\u043C\u043E\u0441\u043A\u043E\u0432\u044C\u0435": "moscow",
        "\u043C\u043E\u0441\u043A\u043E\u0432\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "moscow",
        "\u043C\u043E": "moscow",
        // Санкт-Петербург и ЛО
        "\u0441\u0430\u043D\u043A\u0442-\u043F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433": "spb",
        "\u043F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433": "spb",
        "\u0441\u043F\u0431": "spb",
        "\u043F\u0438\u0442\u0435\u0440": "spb",
        "\u043B\u0435\u043D\u0438\u043D\u0433\u0440\u0430\u0434\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "spb",
        "\u043B\u043E": "spb",
        "\u0432\u0441\u0435\u0432\u043E\u043B\u043E\u0436\u0441\u043A": "spb",
        "\u0433\u0430\u0442\u0447\u0438\u043D\u0430": "spb",
        "\u0432\u044B\u0431\u043E\u0440\u0433": "spb",
        "\u043F\u0443\u0448\u043A\u0438\u043D": "spb",
        "\u043A\u0440\u0430\u0441\u043D\u043E\u0435 \u0441\u0435\u043B\u043E": "spb",
        "\u043A\u043E\u043B\u043F\u0438\u043D\u043E": "spb",
        "\u043F\u0435\u0442\u0435\u0440\u0433\u043E\u0444": "spb",
        // Новосибирск и НСО
        "\u043D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A": "novosibirsk",
        "\u043D\u0441\u043A": "novosibirsk",
        "\u0431\u0435\u0440\u0434\u0441\u043A": "novosibirsk",
        "\u0430\u043A\u0430\u0434\u0435\u043C\u0433\u043E\u0440\u043E\u0434\u043E\u043A": "novosibirsk",
        "\u043D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "novosibirsk",
        // Екатеринбург и Свердловская область
        "\u0435\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433": "ekaterinburg",
        "\u0435\u043A\u0431": "ekaterinburg",
        "\u0432\u0435\u0440\u0445\u043D\u044F\u044F \u043F\u044B\u0448\u043C\u0430": "ekaterinburg",
        "\u043D\u0438\u0436\u043D\u0438\u0439 \u0442\u0430\u0433\u0438\u043B": "ekaterinburg",
        "\u043A\u0430\u043C\u0435\u043D\u0441\u043A-\u0443\u0440\u0430\u043B\u044C\u0441\u043A\u0438\u0439": "ekaterinburg",
        "\u0441\u0432\u0435\u0440\u0434\u043B\u043E\u0432\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "ekaterinburg",
        // Казань и Татарстан
        "\u043A\u0430\u0437\u0430\u043D\u044C": "kazan",
        "\u043D\u0430\u0431\u0435\u0440\u0435\u0436\u043D\u044B\u0435 \u0447\u0435\u043B\u043D\u044B": "kazan",
        "\u0430\u043B\u044C\u043C\u0435\u0442\u044C\u0435\u0432\u0441\u043A": "kazan",
        "\u0442\u0430\u0442\u0430\u0440\u0441\u0442\u0430\u043D": "kazan",
        "\u0440\u0435\u0441\u043F\u0443\u0431\u043B\u0438\u043A\u0430 \u0442\u0430\u0442\u0430\u0440\u0441\u0442\u0430\u043D": "kazan",
        // Нижний Новгород
        "\u043D\u0438\u0436\u043D\u0438\u0439 \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434": "nizhny",
        "\u043D\u0438\u0436\u043D\u0438\u0439": "nizhny",
        "\u043D\u043D": "nizhny",
        "\u043D\u0438\u0436\u0435\u0433\u043E\u0440\u043E\u0434\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "nizhny",
        "\u0434\u0437\u0435\u0440\u0436\u0438\u043D\u0441\u043A": "nizhny",
        // Челябинск
        "\u0447\u0435\u043B\u044F\u0431\u0438\u043D\u0441\u043A": "chelyabinsk",
        "\u043C\u0430\u0433\u043D\u0438\u0442\u043E\u0433\u043E\u0440\u0441\u043A": "chelyabinsk",
        "\u043C\u0438\u0430\u0441\u0441": "chelyabinsk",
        "\u0447\u0435\u043B\u044F\u0431\u0438\u043D\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "chelyabinsk",
        // Самара
        "\u0441\u0430\u043C\u0430\u0440\u0430": "samara",
        "\u0442\u043E\u043B\u044C\u044F\u0442\u0442\u0438": "samara",
        "\u0441\u044B\u0437\u0440\u0430\u043D\u044C": "samara",
        "\u0441\u0430\u043C\u0430\u0440\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "samara",
        // Омск
        "\u043E\u043C\u0441\u043A": "omsk",
        "\u043E\u043C\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "omsk",
        // Ростов-на-Дону
        "\u0440\u043E\u0441\u0442\u043E\u0432-\u043D\u0430-\u0434\u043E\u043D\u0443": "rostov",
        "\u0440\u043E\u0441\u0442\u043E\u0432": "rostov",
        "\u0440\u043E\u0441\u0442\u043E\u0432\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "rostov",
        "\u0442\u0430\u0433\u0430\u043D\u0440\u043E\u0433": "rostov",
        "\u0432\u043E\u043B\u0433\u043E\u0434\u043E\u043D\u0441\u043A": "rostov",
        "\u0431\u0430\u0442\u0430\u0439\u0441\u043A": "rostov",
        // Уфа
        "\u0443\u0444\u0430": "ufa",
        "\u0441\u0442\u0435\u0440\u043B\u0438\u0442\u0430\u043C\u0430\u043A": "ufa",
        "\u0431\u0430\u0448\u043A\u043E\u0440\u0442\u043E\u0441\u0442\u0430\u043D": "ufa",
        // Красноярск
        "\u043A\u0440\u0430\u0441\u043D\u043E\u044F\u0440\u0441\u043A": "krasnoyarsk",
        "\u043A\u0440\u0430\u0441\u043D\u043E\u044F\u0440\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "krasnoyarsk",
        "\u043D\u043E\u0440\u0438\u043B\u044C\u0441\u043A": "krasnoyarsk",
        // Воронеж
        "\u0432\u043E\u0440\u043E\u043D\u0435\u0436": "voronezh",
        "\u0432\u043E\u0440\u043E\u043D\u0435\u0436\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "voronezh",
        // Пермь
        "\u043F\u0435\u0440\u043C\u044C": "perm",
        "\u0431\u0435\u0440\u0435\u0437\u043D\u0438\u043A\u0438": "perm",
        "\u043F\u0435\u0440\u043C\u0441\u043A\u0438\u0439 \u043A\u0440\u0430\u0439": "perm",
        // Волгоград
        "\u0432\u043E\u043B\u0433\u043E\u0433\u0440\u0430\u0434": "volgograd",
        "\u0432\u043E\u043B\u0433\u043E\u0433\u0440\u0430\u0434\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "volgograd",
        "\u0432\u043E\u043B\u0436\u0441\u043A\u0438\u0439": "volgograd",
        // Краснодар
        "\u043A\u0440\u0430\u0441\u043D\u043E\u0434\u0430\u0440": "krasnodar",
        "\u0441\u043E\u0447\u0438": "krasnodar",
        "\u043D\u043E\u0432\u043E\u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A": "krasnodar",
        "\u043A\u0440\u0430\u0441\u043D\u043E\u0434\u0430\u0440\u0441\u043A\u0438\u0439 \u043A\u0440\u0430\u0439": "krasnodar",
        // Другие крупные города
        "\u0442\u044E\u043C\u0435\u043D\u044C": "tyumen",
        "\u0442\u044E\u043C\u0435\u043D\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C": "tyumen",
        "\u0438\u0440\u043A\u0443\u0442\u0441\u043A": "irkutsk",
        "\u0431\u0430\u0440\u043D\u0430\u0443\u043B": "barnaul",
        "\u0443\u043B\u0430\u043D-\u0443\u0434\u044D": "ulanude",
        "\u0432\u043B\u0430\u0434\u0438\u0432\u043E\u0441\u0442\u043E\u043A": "vladivostok",
        "\u0445\u0430\u0431\u0430\u0440\u043E\u0432\u0441\u043A": "khabarovsk",
        "\u044F\u043A\u0443\u0442\u0441\u043A": "yakutsk",
        "\u0442\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A": "novosibirsk",
        // typo correction
        "\u043D-\u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434": "nizhny",
        "\u043D \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434": "nizhny",
        "\u0435\u043A-\u0431\u0443\u0440\u0433": "ekaterinburg"
      };
      REGION_IDS = new Set(Object.values(CITY_REGIONS));
      CITY_ABBREVIATIONS = {
        "\u043C\u0441\u043A": "\u043C\u043E\u0441\u043A\u0432\u0430",
        "\u0441\u043F\u0431": "\u0441\u0430\u043D\u043A\u0442-\u043F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433",
        "\u043D\u0441\u043A": "\u043D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A",
        "\u0435\u043A\u0431": "\u0435\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433",
        "\u043D\u043D": "\u043D\u0438\u0436\u043D\u0438\u0439 \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434",
        "\u0440\u043D": "\u0440\u043E\u0441\u0442\u043E\u0432-\u043D\u0430-\u0434\u043E\u043D\u0443",
        "\u043D-\u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434": "\u043D\u0438\u0436\u043D\u0438\u0439 \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434",
        "\u043D \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434": "\u043D\u0438\u0436\u043D\u0438\u0439 \u043D\u043E\u0432\u0433\u043E\u0440\u043E\u0434",
        "\u0435\u043A-\u0431\u0443\u0440\u0433": "\u0435\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433",
        "\u043C\u043E": "\u043C\u043E\u0441\u043A\u0432\u0430",
        "\u043B\u043E": "\u0441\u0430\u043D\u043A\u0442-\u043F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433"
      };
    }
  });

  // src/lib/match-scorer-location.js
  function normalizeLocation(text) {
    if (!text || typeof text !== "string") return "";
    let s = text.toLowerCase().trim();
    s = s.replace(/,?\s*(россия|рф)\s*/g, "");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }
  function identifyCity(locationText) {
    if (!locationText) return null;
    const norm = normalizeLocation(locationText);
    if (!norm) return null;
    const firstWord = norm.split(/[\s,]+/)[0];
    if (CITY_ABBREVIATIONS[firstWord]) {
      return CITY_ABBREVIATIONS[firstWord];
    }
    const sortedKeys = Object.keys(CITY_REGIONS).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
    for (const cityKey of sortedKeys) {
      if (norm.includes(cityKey)) return cityKey;
    }
    const segments = norm.split(",").map((s) => s.trim()).filter(Boolean);
    if (segments.length > 0) {
      const candidate = segments[0];
      if (CITY_REGIONS[candidate]) return candidate;
      if (CITY_ABBREVIATIONS[candidate]) return CITY_ABBREVIATIONS[candidate];
    }
    return null;
  }
  function getRegion(city) {
    if (!city) return null;
    return CITY_REGIONS[city] || null;
  }
  function detectWorkFormat(text) {
    if (!text || typeof text !== "string") return "unknown";
    const lower = text.toLowerCase();
    if (/гибрид|hybrid/i.test(lower)) return "hybrid";
    const hasRemote = /удал[её]нн|remote|дистанцион/.test(lower);
    const hasOffice = /[а-яё]{3,}/.test(lower.replace(/удал[её]нн|remote|дистанцион|работа|формат|можн/g, "").trim());
    if (hasRemote && hasOffice) return "hybrid";
    if (hasRemote) return "remote";
    if (hasOffice) return "office";
    return "unknown";
  }
  function scoreLocation(resume, vacancy) {
    const resumeAddr = resume.address || "";
    const resumeWorkFormat = resume.workFormat || "";
    const resumeFormat = detectWorkFormat(resumeWorkFormat || resumeAddr);
    const vacLocation = vacancy.location || "";
    const vacSchedule = vacancy.schedule || "";
    let vacFormat = vacSchedule;
    if (vacFormat === "unknown" || !vacFormat) {
      vacFormat = detectWorkFormat(vacLocation);
    }
    const resumeCity = identifyCity(resumeAddr);
    const vacCity = identifyCity(vacLocation);
    const resumeRegion = getRegion(resumeCity);
    const vacRegion = getRegion(vacCity);
    locLog.info('resume: addr="' + resumeAddr + '" city=' + (resumeCity || "?") + " region=" + (resumeRegion || "?") + " format=" + resumeFormat);
    locLog.info('vacancy: loc="' + vacLocation + '" city=' + (vacCity || "?") + " region=" + (vacRegion || "?") + " schedule=" + vacFormat);
    if (resumeFormat === "remote" && vacFormat === "remote") {
      return { score: 12, reason: "remote-remote" };
    }
    if (resumeFormat === "remote" && (vacFormat === "office" || vacFormat === "hybrid")) {
      return { score: 12, reason: "remote-can-do-office" };
    }
    if ((resumeFormat === "office" || resumeFormat === "unknown") && vacFormat === "remote") {
      if (resumeFormat === "unknown") {
        return { score: 10, reason: "unknown-format-remote-vacancy" };
      }
      return { score: 8, reason: "office-wants-remote" };
    }
    if (resumeFormat === "hybrid") {
      if (vacFormat === "hybrid") return { score: 13, reason: "hybrid-hybrid" };
      if (vacFormat === "office") return { score: 12, reason: "hybrid-can-do-office" };
      if (vacFormat === "remote") return { score: 12, reason: "hybrid-can-do-remote" };
    }
    if (resumeCity && vacCity && resumeCity === vacCity) {
      return { score: 15, reason: "same-city" };
    }
    if (resumeRegion && vacRegion && resumeRegion === vacRegion && resumeCity !== vacCity) {
      return { score: 12, reason: "nearby-region" };
    }
    if (resumeCity && vacCity) {
      return { score: 8, reason: "different-city" };
    }
    if (!resumeAddr && !vacLocation) {
      return { score: 8, reason: "no-data" };
    }
    if (!resumeAddr) {
      return { score: 8, reason: "no-resume-location" };
    }
    if (!vacLocation) {
      return { score: 8, reason: "no-vacancy-location" };
    }
    return { score: 8, reason: "unknown-city" };
  }
  var locLog;
  var init_match_scorer_location = __esm({
    "src/lib/match-scorer-location.js"() {
      init_anti_hallucination();
      init_location_city_data();
      locLog = createLogger("Scorer:Location");
    }
  });

  // src/lib/match-scorer.js
  function computeMatchScore(resume, vacancy) {
    if (!resume || !vacancy) {
      return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0 }, details: {} };
    }
    const skillResult = scoreSkills(resume, vacancy);
    const titleResult = scoreTitle(resume, vacancy);
    const salaryResult = scoreSalary(resume, vacancy);
    const expResult = scoreExperience(resume, vacancy);
    const locResult = scoreLocation(resume, vacancy);
    const breakdown = {
      skills: Math.round(skillResult.score * W_SKILLS),
      title: Math.round(titleResult.score * W_TITLE),
      salary: Math.round(salaryResult.score * W_SALARY),
      experience: Math.round(expResult.score * W_EXP),
      location: locResult.score
    };
    let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience + breakdown.location);
    if (titleResult.score === 0 && titleResult.similarity === 0) {
      total = Math.min(total, 25);
    } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
      total = Math.min(total, 40);
    }
    const details = {
      matchingSkills: skillResult.matching,
      derivedMatchSkills: skillResult.derivedMatch,
      synonymMatchSkills: skillResult.synonymMatch,
      impliedMatchSkills: skillResult.impliedMatch,
      missingSkills: skillResult.missing,
      extraSkills: skillResult.extra,
      titleSimilarity: titleResult.similarity,
      salaryMatch: salaryResult.reason,
      experienceMatch: expResult.reason,
      locationMatch: locResult.reason
    };
    scoreLog.info("Score " + total + "%: skills=" + breakdown.skills + " title=" + breakdown.title + " salary=" + breakdown.salary + " exp=" + breakdown.experience + " loc=" + breakdown.location);
    return { total, breakdown, details };
  }
  var scoreLog, W_SKILLS, W_TITLE, W_SALARY, W_EXP;
  var init_match_scorer = __esm({
    "src/lib/match-scorer.js"() {
      init_anti_hallucination();
      init_match_scorer_skills();
      init_match_scorer_title();
      init_match_scorer_salary();
      init_match_scorer_experience();
      init_match_scorer_location();
      scoreLog = createLogger("Scorer");
      W_SKILLS = 35 / 40;
      W_TITLE = 25 / 30;
      W_SALARY = 15 / 15;
      W_EXP = 10 / 15;
    }
  });

  // src/lib/cover-letter-format.js
  function formatSkillList(skills) {
    if (!skills || skills.length === 0) return "";
    if (skills.length === 1) return skills[0];
    if (skills.length === 2) return skills[0] + " \u0438 " + skills[1];
    return skills.slice(0, -1).join(", ") + " \u0438 " + skills[skills.length - 1];
  }
  function restoreOriginalCase(normalizedSkills, vacancy, resume) {
    if (!normalizedSkills || normalizedSkills.length === 0) return [];
    const caseMap = /* @__PURE__ */ new Map();
    const vacSources = [vacancy.keySkills, vacancy.skills, vacancy.derivedSkills];
    for (const arr of vacSources) {
      if (!Array.isArray(arr)) continue;
      for (const s of arr) {
        const name = typeof s === "string" ? s : s?.name || "";
        if (name) caseMap.set(normalizeSkillName(name), name);
      }
    }
    if (resume) {
      const resSources = [resume.skills, resume.derivedSkills];
      for (const arr of resSources) {
        if (!Array.isArray(arr)) continue;
        for (const s of arr) {
          const name = typeof s === "string" ? s : s?.name || "";
          if (name) caseMap.set(normalizeSkillName(name), name);
        }
      }
    }
    return normalizedSkills.map((ns) => caseMap.get(ns) || ns);
  }
  function normalizeSkillName(name) {
    return name.toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
  }
  function pluralYears(n) {
    const abs = Math.abs(n) % 100;
    const lastDigit = abs % 10;
    if (abs > 10 && abs < 20) return "\u043B\u0435\u0442";
    if (lastDigit > 1 && lastDigit < 5) return "\u0433\u043E\u0434\u0430";
    if (lastDigit === 1) return "\u0433\u043E\u0434";
    return "\u043B\u0435\u0442";
  }
  function pluralMonths(n) {
    const abs = Math.abs(n) % 100;
    const lastDigit = abs % 10;
    if (abs > 10 && abs < 20) return "\u043C\u0435\u0441\u044F\u0446\u0435\u0432";
    if (lastDigit > 1 && lastDigit < 5) return "\u043C\u0435\u0441\u044F\u0446\u0430";
    if (lastDigit === 1) return "\u043C\u0435\u0441\u044F\u0446";
    return "\u043C\u0435\u0441\u044F\u0446\u0435\u0432";
  }
  var init_cover_letter_format = __esm({
    "src/lib/cover-letter-format.js"() {
    }
  });

  // src/lib/cover-letter-placeholders.js
  function extractPlaceholders(vacancy, resume) {
    const p = {};
    p.position = vacancy.title || "\u044D\u0442\u0443 \u043F\u043E\u0437\u0438\u0446\u0438\u044E";
    p.company = vacancy.company || "\u0432\u0430\u0448\u0443 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044E";
    p.experience = extractExperienceText(resume);
    const matchResult = resume ? computeMatchScore(resume, vacancy) : null;
    const matchingSkills = matchResult ? matchResult.details.matchingSkills || [] : [];
    const derivedMatches = matchResult ? matchResult.details.derivedMatchSkills || [] : [];
    const matchingOriginal = restoreOriginalCase(matchingSkills, vacancy, resume);
    const derivedOriginal = restoreOriginalCase(derivedMatches, vacancy, resume);
    const allMatches = [...matchingOriginal, ...derivedOriginal].slice(0, MAX_SKILLS_MENTION);
    p.skills = allMatches.length > 0 ? formatSkillList(allMatches) : vacancy.keySkills && vacancy.keySkills.length > 0 ? formatSkillList(vacancy.keySkills.slice(0, MAX_SKILLS_MENTION)) : "\u0441\u0444\u0435\u0440\u0435 \u0434\u0435\u044F\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438";
    p.matching = allMatches.length > 0 ? allMatches.join(", ") : "";
    p.matching_sentence = allMatches.length > 0 ? "\u041C\u043E\u0439 \u043E\u043F\u044B\u0442 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 " + formatSkillList(allMatches) + ", \u0447\u0442\u043E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F\u043C \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438. " : "";
    p.requirements = extractRequirementsText(vacancy);
    return p;
  }
  function extractExperienceText(resume) {
    if (!resume) return "relevant";
    if (resume.experienceTotal) {
      return resume.experienceTotal;
    }
    if (resume.experience && Array.isArray(resume.experience) && resume.experience.length > 0) {
      let totalMonths = 0;
      for (const entry of resume.experience) {
        if (entry.duration) {
          const years = entry.duration.match(/(\d+)\s*(лет|год|года)/i);
          const months = entry.duration.match(/(\d+)\s*(месяц|месяца|месяцев)/i);
          if (years) totalMonths += parseInt(years[1], 10) * 12;
          if (months) totalMonths += parseInt(months[1], 10);
        } else if (entry.period) {
          const periodMonths = parsePeriodToMonths(entry.period);
          if (periodMonths > 0) totalMonths += periodMonths;
        }
      }
      if (totalMonths > 0) {
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        if (years > 0 && months > 0) {
          return years + " " + pluralYears(years) + " " + months + " " + pluralMonths(months);
        } else if (years > 0) {
          return years + " " + pluralYears(years);
        } else {
          return months + " " + pluralMonths(months);
        }
      }
    }
    if (resume.experience && resume.experience.length > 0) {
      return "\u043E\u043F\u044B\u0442 \u0432 " + resume.experience[0].position || "\u0441\u0444\u0435\u0440\u0435";
    }
    return "relevant";
  }
  function parsePeriodToMonths(period) {
    if (!period) return 0;
    const months = {
      "\u044F\u043D\u0432": 1,
      "\u0444\u0435\u0432": 2,
      "\u043C\u0430\u0440": 3,
      "\u0430\u043F\u0440": 4,
      "\u043C\u0430\u044F": 5,
      "\u0438\u044E\u043D": 6,
      "\u0438\u044E\u043B": 7,
      "\u0430\u0432\u0433": 8,
      "\u0441\u0435\u043D": 9,
      "\u043E\u043A\u0442": 10,
      "\u043D\u043E\u044F": 11,
      "\u0434\u0435\u043A": 12,
      "jan": 1,
      "feb": 2,
      "mar": 3,
      "apr": 4,
      "may": 5,
      "jun": 6,
      "jul": 7,
      "aug": 8,
      "sep": 9,
      "oct": 10,
      "nov": 11,
      "dec": 12
    };
    const rangeMatch = period.match(/(\w{3})\s*(\d{4})\s*[\u2013\u2014-]\s*(?:(\w{3})\s*(\d{4})|(настоящее|настоящее время|present|сейчас))/i);
    if (!rangeMatch) return 0;
    const startMonth = months[rangeMatch[1].toLowerCase().substring(0, 3)] || 1;
    const startYear = parseInt(rangeMatch[2], 10);
    let endMonth, endYear;
    if (rangeMatch[5]) {
      const now = /* @__PURE__ */ new Date();
      endMonth = now.getMonth() + 1;
      endYear = now.getFullYear();
    } else {
      endMonth = months[rangeMatch[3].toLowerCase().substring(0, 3)] || 1;
      endYear = parseInt(rangeMatch[4], 10);
    }
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
    return Math.max(0, totalMonths);
  }
  function extractRequirementsText(vacancy) {
    if (vacancy.description && vacancy.description.sections) {
      const sections = vacancy.description.sections;
      if (sections.requirements && sections.requirements.length > 10) {
        return extractKeyPhrases(sections.requirements, MAX_REQUIREMENTS_QUOTE);
      }
      if (sections.responsibilities && sections.responsibilities.length > 10) {
        return extractKeyPhrases(sections.responsibilities, MAX_REQUIREMENTS_QUOTE);
      }
    }
    if (vacancy.description && vacancy.description.text && vacancy.description.text.length > 20) {
      return extractKeyPhrases(vacancy.description.text, MAX_REQUIREMENTS_QUOTE);
    }
    return "";
  }
  function extractKeyPhrases(text, maxPhrases) {
    if (!text) return "";
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 150);
    const scored = lines.map((line) => {
      let score = 0;
      if (/^[--->]/.test(line)) score += 2;
      if (/зна(?:ние|ю|ния)|владел|опыт|умение|работа\s*с|пониман/i.test(line)) score += 3;
      if (line.length >= 15 && line.length <= 80) score += 1;
      return { line, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, maxPhrases).map((s) => s.line);
    return selected.join("; ");
  }
  var MAX_SKILLS_MENTION, MAX_REQUIREMENTS_QUOTE;
  var init_cover_letter_placeholders = __esm({
    "src/lib/cover-letter-placeholders.js"() {
      init_match_scorer();
      init_cover_letter_format();
      MAX_SKILLS_MENTION = 5;
      MAX_REQUIREMENTS_QUOTE = 3;
    }
  });

  // src/lib/cover-letter-rich.js
  function hasRichData(vacancy, resume) {
    if (!resume) return false;
    const hasKeySkills = vacancy.keySkills && vacancy.keySkills.length > 0;
    const hasDescription = vacancy.description && vacancy.description.text && vacancy.description.text.length > 50;
    const hasMatching = resume.skills && resume.skills.length > 0;
    return (hasKeySkills || hasDescription) && hasMatching;
  }
  function generateRichLetter(vacancy, resume, placeholders) {
    const parts = [];
    const company = placeholders.company !== "\u0432\u0430\u0448\u0443 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044E" ? " \u0432 " + placeholders.company : "";
    parts.push('\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041C\u0435\u043D\u044F \u0437\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043B\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F "' + placeholders.position + '"' + company + ".");
    const expText = placeholders.experience !== "relevant" ? " \u0418\u043C\u0435\u044E " + placeholders.experience + " \u043E\u043F\u044B\u0442\u0430." : "";
    if (expText) parts.push(expText);
    const matchResult = computeMatchScore(resume, vacancy);
    const matchingSkills = restoreOriginalCase(matchResult.details.matchingSkills || [], vacancy, resume);
    const derivedMatches = restoreOriginalCase(matchResult.details.derivedMatchSkills || [], vacancy, resume);
    if (matchingSkills.length > 0 || derivedMatches.length > 0) {
      const explicitList = matchingSkills.slice(0, 4);
      const derivedList = derivedMatches.slice(0, 2);
      let skillSentence = "\u0412\u043B\u0430\u0434\u0435\u044E " + formatSkillList(explicitList);
      if (derivedList.length > 0) {
        skillSentence += ", \u0442\u0430\u043A\u0436\u0435 \u0438\u043C\u0435\u044E \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043E\u043F\u044B\u0442 \u0432 " + formatSkillList(derivedList);
      }
      skillSentence += ".";
      parts.push(skillSentence);
    }
    if (vacancy.description && vacancy.description.sections) {
      const sections = vacancy.description.sections;
      const conditionsText = sections.conditions || "";
      if (conditionsText.length > 20) {
        const conditions = extractKeyPhrases(conditionsText, 2);
        if (conditions) {
          parts.push("\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u0438 (" + conditions + ") \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u043C\u043E\u0438\u043C \u043A\u0430\u0440\u044C\u0435\u0440\u043D\u044B\u043C \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F\u043C.");
        }
      }
    }
    if (matchResult.total >= 70) {
      parts.push("\u0423\u0432\u0435\u0440\u0435\u043D, \u0447\u0442\u043E \u043C\u043E\u0439 \u043E\u043F\u044B\u0442 \u0438 \u043D\u0430\u0432\u044B\u043A\u0438 \u043E\u0442\u043B\u0438\u0447\u043D\u043E \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u0440\u043E\u043B\u0438.");
    } else if (matchResult.total >= 40) {
      parts.push("\u041F\u043E\u043B\u0430\u0433\u0430\u044E, \u0447\u0442\u043E \u043C\u043E\u0439 \u043E\u043F\u044B\u0442 \u0431\u0443\u0434\u0435\u0442 \u043F\u043E\u043B\u0435\u0437\u0435\u043D \u0434\u043B\u044F \u0432\u0430\u0448\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.");
    }
    parts.push("\u0411\u0443\u0434\u0443 \u0440\u0430\u0434 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E. \u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0435!");
    const letter = parts.join(" ");
    return letter.length > 20 ? letter : null;
  }
  var init_cover_letter_rich = __esm({
    "src/lib/cover-letter-rich.js"() {
      init_match_scorer();
      init_cover_letter_format();
      init_cover_letter_placeholders();
    }
  });

  // src/lib/cover-letter-tone.js
  function validateTone(tone) {
    if (typeof tone !== "string") return "formal";
    return TONES.find((t) => t.id === tone) ? tone : "formal";
  }
  function getTemplateForTone(tone) {
    return TEMPLATES[validateTone(tone)] || DEFAULT_TEMPLATE_FORMAL;
  }
  function applyTone(text, tone) {
    if (!text || typeof text !== "string") return "";
    const t = validateTone(tone);
    let out = text;
    const knownGreetings = [
      "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435!",
      "\u0414\u043E\u0431\u0440\u044B\u0439 \u0434\u0435\u043D\u044C!",
      "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F!"
    ];
    for (const g of knownGreetings) {
      if (out.startsWith(g)) {
        out = out.slice(g.length).trimStart();
        break;
      }
    }
    const newGreeting = GREETINGS[t];
    if (newGreeting) {
      out = newGreeting + " " + out;
    }
    const knownClosings = [
      "\u0411\u0443\u0434\u0443 \u0440\u0430\u0434 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.",
      "\u0411\u0443\u0434\u0443 \u043E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u043F\u043E\u043E\u0431\u0449\u0430\u0442\u044C\u0441\u044F \u0438 \u0443\u0437\u043D\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043E \u043F\u043E\u0437\u0438\u0446\u0438\u0438!",
      "\u0413\u043E\u0442\u043E\u0432 \u043D\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F. \u041E\u0447\u0435\u043D\u044C \u0436\u0434\u0443 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438!"
    ];
    for (const c of knownClosings) {
      if (out.endsWith(c)) {
        out = out.slice(0, -c.length).trimEnd();
        break;
      }
    }
    const newClosing = CLOSINGS[t];
    if (newClosing) {
      out = out + " " + newClosing;
    }
    return out.trim();
  }
  var TONES, GREETINGS, CLOSINGS, DEFAULT_TEMPLATE_FORMAL, DEFAULT_TEMPLATE_FRIENDLY, DEFAULT_TEMPLATE_CONCISE, DEFAULT_TEMPLATE_ENTHUSIASTIC, TEMPLATES, _internal;
  var init_cover_letter_tone = __esm({
    "src/lib/cover-letter-tone.js"() {
      TONES = [
        { id: "formal", label: "\u0424\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u044B\u0439" },
        { id: "friendly", label: "\u0414\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439" },
        { id: "concise", label: "\u041A\u0440\u0430\u0442\u043A\u0438\u0439" },
        { id: "enthusiastic", label: "\u042D\u043D\u0442\u0443\u0437\u0438\u0430\u0441\u0442" }
      ];
      GREETINGS = {
        formal: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435!",
        friendly: "\u0414\u043E\u0431\u0440\u044B\u0439 \u0434\u0435\u043D\u044C!",
        concise: "",
        enthusiastic: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F!"
      };
      CLOSINGS = {
        formal: "\u0411\u0443\u0434\u0443 \u0440\u0430\u0434 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.",
        friendly: "\u0411\u0443\u0434\u0443 \u043E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u043F\u043E\u043E\u0431\u0449\u0430\u0442\u044C\u0441\u044F \u0438 \u0443\u0437\u043D\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043E \u043F\u043E\u0437\u0438\u0446\u0438\u0438!",
        concise: "",
        enthusiastic: "\u0413\u043E\u0442\u043E\u0432 \u043D\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F. \u041E\u0447\u0435\u043D\u044C \u0436\u0434\u0443 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438!"
      };
      DEFAULT_TEMPLATE_FORMAL = "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041C\u0435\u043D\u044F \u0437\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043B\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position} \u0432 {company}. \u0418\u043C\u0435\u044E {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. {matching_sentence}\u0411\u0443\u0434\u0443 \u0440\u0430\u0434 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.";
      DEFAULT_TEMPLATE_FRIENDLY = "\u0414\u043E\u0431\u0440\u044B\u0439 \u0434\u0435\u043D\u044C! \u041E\u0447\u0435\u043D\u044C \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u0430\u0441\u044C \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position} \u0432 {company}. \u0423 \u043C\u0435\u043D\u044F {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. {matching_sentence}\u0411\u0443\u0434\u0443 \u043E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u043F\u043E\u043E\u0431\u0449\u0430\u0442\u044C\u0441\u044F \u0438 \u0443\u0437\u043D\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043E \u043F\u043E\u0437\u0438\u0446\u0438\u0438!";
      DEFAULT_TEMPLATE_CONCISE = "\u0418\u043D\u0442\u0435\u0440\u0435\u0441\u0443\u0435\u0442 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position} \u0432 {company}. \u041E\u043F\u044B\u0442: {experience}. \u041D\u0430\u0432\u044B\u043A\u0438: {skills}. {matching_sentence}";
      DEFAULT_TEMPLATE_ENTHUSIASTIC = "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041E\u0447\u0435\u043D\u044C \u0440\u0430\u0434 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 {position} \u0432 {company}! \u0418\u043C\u0435\u044E {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. {matching_sentence}\u0413\u043E\u0442\u043E\u0432 \u043D\u0430\u0447\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F. \u041E\u0447\u0435\u043D\u044C \u0436\u0434\u0443 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438!";
      TEMPLATES = {
        formal: DEFAULT_TEMPLATE_FORMAL,
        friendly: DEFAULT_TEMPLATE_FRIENDLY,
        concise: DEFAULT_TEMPLATE_CONCISE,
        enthusiastic: DEFAULT_TEMPLATE_ENTHUSIASTIC
      };
      _internal = {
        GREETINGS,
        CLOSINGS,
        TEMPLATES
      };
    }
  });

  // src/lib/cover-letter-generator.js
  function generateCoverLetter(vacancy, resume, options) {
    if (!vacancy) {
      clLog.warn("No vacancy provided -- returning empty letter");
      return { text: "", placeholders: {}, method: "none", tone: "formal" };
    }
    const opts = options || {};
    const tone = validateTone(opts.tone);
    const template = opts.template || getTemplateForTone(tone);
    const maxLength = opts.maxLength || MAX_LETTER_LENGTH;
    const placeholders = extractPlaceholders(vacancy, resume);
    let text = fillTemplate(template, placeholders);
    if (!opts.template && hasRichData(vacancy, resume)) {
      const richLetter = generateRichLetter(vacancy, resume, placeholders);
      if (richLetter) {
        text = richLetter;
        clLog.info("Generated rich cover letter (" + text.length + " chars)");
      }
    }
    if (tone !== "formal" || !opts.template) {
      text = applyTone(text, tone);
    }
    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + "...";
      clLog.info("Truncated cover letter to " + maxLength + " chars");
    }
    return {
      text,
      placeholders,
      method: hasRichData(vacancy, resume) ? "rich" : "template",
      tone
    };
  }
  function fillTemplate(template, values) {
    if (!template) return "";
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = "{" + key + "}";
      result = result.split(placeholder).join(value || "");
    }
    return result;
  }
  function findVacancyData(vacancyId, vacancies) {
    if (Array.isArray(vacancies)) {
      const found = vacancies.find((v) => v.id === vacancyId);
      if (found) return found;
    }
    if (window.__hhVacDetail && window.__hhVacDetail.id === vacancyId) {
      return window.__hhVacDetail;
    }
    return null;
  }
  var clLog, DEFAULT_TEMPLATE, MAX_LETTER_LENGTH;
  var init_cover_letter_generator = __esm({
    "src/lib/cover-letter-generator.js"() {
      init_anti_hallucination();
      init_cover_letter_placeholders();
      init_cover_letter_rich();
      init_cover_letter_tone();
      clLog = createLogger("CoverLetter");
      DEFAULT_TEMPLATE = getTemplateForTone("formal");
      MAX_LETTER_LENGTH = 5e3;
    }
  });

  // src/lib/cover-letter-storage.js
  async function readSettings() {
    try {
      return await getAllSettings();
    } catch (_e) {
      return {};
    }
  }
  async function writeSettings(partial) {
    try {
      const current = await getAllSettings();
      const next = { ...current, ...partial };
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      return next;
    } catch (_e) {
      return null;
    }
  }
  async function getCoverLetterTemplate() {
    const settings = await readSettings();
    const tmpl = settings.coverLetterTemplate;
    if (typeof tmpl === "string" && tmpl.trim().length > 0) {
      return tmpl;
    }
    return getTemplateForTone("formal");
  }
  async function setCoverLetterTemplate(text) {
    if (typeof text !== "string") return false;
    const result = await writeSettings({ coverLetterTemplate: text });
    return result !== null;
  }
  async function getLetterTone() {
    const settings = await readSettings();
    return validateTone(settings.letterTone);
  }
  async function setLetterTone(tone) {
    const valid = validateTone(tone);
    const result = await writeSettings({ letterTone: valid });
    return result !== null;
  }
  async function getCoverLetterConfig() {
    const settings = await readSettings();
    const tone = validateTone(settings.letterTone);
    const tmpl = typeof settings.coverLetterTemplate === "string" && settings.coverLetterTemplate.trim().length > 0 ? settings.coverLetterTemplate : getTemplateForTone(tone);
    return { template: tmpl, tone };
  }
  var STORAGE_KEY;
  var init_cover_letter_storage = __esm({
    "src/lib/cover-letter-storage.js"() {
      init_storage_settings();
      init_cover_letter_tone();
      STORAGE_KEY = "settings";
    }
  });

  // src/engine/apply-actions-cover-letter.js
  function setActiveResumeForCoverLetter(resume) {
    _activeResume = resume;
  }
  async function fillCoverLetter(inputEl) {
    try {
      const urlMatch = window.location.pathname.match(/\/vacancy\/(\d+)/);
      const vacancyId = urlMatch ? urlMatch[1] : null;
      if (!vacancyId) {
        coverLog.info("Cannot extract vacancy ID for cover letter");
        return false;
      }
      let vacancy = window.__hhVacDetail || null;
      if (!vacancy || vacancy.id !== vacancyId) {
        try {
          vacancy = await getVacancyDetail(vacancyId);
        } catch (_e) {
          coverLog.warn("Could not load vacancy detail from storage");
        }
      }
      if (!vacancy) {
        coverLog.info("No vacancy data available for cover letter generation");
        return false;
      }
      const resume = _activeResume;
      const sidebarTemplate = readCustomTemplateFromSidebar();
      const stored = await getCoverLetterConfig();
      const template = sidebarTemplate || stored.template;
      const tone = stored.tone;
      const result = generateCoverLetter(vacancy, resume, { template, tone });
      if (!result.text || result.text.length < 10) {
        coverLog.info("Cover letter generation returned empty text (method: " + result.method + ")");
        return false;
      }
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputEl, result.text);
      } else {
        inputEl.value = result.text;
      }
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      coverLog.info(
        "Cover letter filled (" + result.text.length + " chars, method: " + result.method + ", skills: " + (result.placeholders.matching || "none") + ")"
      );
      return true;
    } catch (err) {
      coverLog.warn("Cover letter fill failed: " + err.message);
      return false;
    }
  }
  function readCustomTemplateFromSidebar() {
    try {
      const sidebarEl = document.querySelector("#hh-copilot-sidebar");
      if (!sidebarEl) return null;
      const shadowRoot = sidebarEl.shadowRoot;
      if (!shadowRoot) return null;
      const textarea = shadowRoot.getElementById("cover-letter-text");
      if (!textarea || !textarea.value) return null;
      return textarea.value;
    } catch (_e) {
      return null;
    }
  }
  var coverLog, _activeResume;
  var init_apply_actions_cover_letter = __esm({
    "src/engine/apply-actions-cover-letter.js"() {
      init_anti_hallucination();
      init_cover_letter_generator();
      init_storage_vacancies();
      init_cover_letter_storage();
      coverLog = createLogger("AutoRespond");
      _activeResume = null;
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
        } catch (_e) {
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
            await fillCoverLetter(letterInput);
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
        } catch (_e) {
        }
      }
    }
    const alreadyEl = findElement("alreadyApplied");
    if (alreadyEl) {
      autoLog2.info("Popup not needed -- already applied indicator found");
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
      init_apply_actions_cover_letter();
      init_apply_actions_cover_letter();
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
  async function applyToVacancy(vacancyId, resume) {
    autoLog3.info("Apply to vacancy: " + vacancyId);
    if (resume) {
      setActiveResumeForCoverLetter(resume);
    }
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
  async function applyToAll(vacancies, minScore, resume) {
    minScore = minScore || 70;
    if (resume) {
      setActiveResumeForCoverLetter(resume);
    }
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
    setActiveResumeForCoverLetter: () => setActiveResumeForCoverLetter,
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

  // src/parsers/resume-detail/parse-resume-skills.js
  function parseSkills(dbg, resume) {
    const skillsCard = document.querySelector('[data-qa="skills-card"]');
    if (skillsCard) {
      resume._debug.found.push('skillsBlock (data-qa="skills-card")');
      _extractSkillsFromContainer(skillsCard, resume);
    } else {
      resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
      const skillsTable = document.querySelector('[data-qa="skills-table"]');
      if (skillsTable) {
        resume._debug.found.push('skillsBlock (data-qa="skills-table" fallback)');
        _extractSkillsFromContainer(skillsTable, resume);
      }
      if (resume.skills.length === 0) {
        const skillsSection = _findSkillsSectionByHeading();
        if (skillsSection) {
          resume._debug.found.push('skillsBlock (heading "\u041D\u0430\u0432\u044B\u043A\u0438" fallback)');
          _extractSkillsFromContainer(skillsSection, resume);
        }
      }
      if (resume.skills.length === 0) {
        const skillContainers = document.querySelectorAll('[data-qa*="skill"]');
        if (skillContainers.length > 0) {
          const topContainer = _findTopmostSkillContainer(skillContainers);
          if (topContainer) {
            resume._debug.found.push('skillsBlock (data-qa*="skill" fallback)');
            _extractSkillsFromContainer(topContainer, resume);
          }
        }
      }
      if (resume.skills.length === 0) {
        const magritteSkills = _findMagritteSkillTags();
        if (magritteSkills.length > 0) {
          resume._debug.found.push("skillsBlock (Magritte tag scan fallback)");
          for (const text of magritteSkills) {
            if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
              resume.skills.push(text);
            }
          }
        }
      }
    }
    if (resume.skills.length > 0) {
      resume._debug.found.push("skills: " + resume.skills.length + " tags");
    } else if (!resume._debug.found.some((f) => f.startsWith("skillsBlock"))) {
      resume._debug.missing.push("skills (no tags found)");
    }
  }
  function _extractSkillsFromContainer(container, resume) {
    const skillLevelEls = container.querySelectorAll('[data-qa^="skill-level-title-"]');
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
    const skillTags = container.querySelectorAll('[data-qa^="skill-tag-"]');
    skillTags.forEach((tag) => {
      const text = (tag.textContent || "").trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
    const blokoTags = container.querySelectorAll(".bloko-tag__text");
    blokoTags.forEach((tag) => {
      const text = (tag.textContent || "").trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
    const magritteTags = container.querySelectorAll('[data-qa^="resume-skill"], [data-qa^="skill-tag"], [data-qa*="skill-tag"]');
    magritteTags.forEach((tag) => {
      const text = (tag.textContent || "").trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
  }
  function _findSkillsSectionByHeading() {
    const headings = document.querySelectorAll('h2, h3, [data-qa^="resume-block-title"]');
    for (const h of headings) {
      const text = (h.textContent || "").trim().toLowerCase();
      if (text === "\u043D\u0430\u0432\u044B\u043A\u0438" || text.startsWith("\u043D\u0430\u0432\u044B\u043A\u0438") || text === "\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438" || text.startsWith("\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438")) {
        let container = h.parentElement;
        for (let i = 0; i < 4 && container; i++) {
          const tags = container.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"], [data-qa^="resume-skill"]');
          if (tags.length > 0) return container;
          container = container.parentElement;
        }
        let sibling = h.nextElementSibling;
        for (let i = 0; i < 3 && sibling; i++) {
          const tags = sibling.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"]');
          if (tags.length > 0) return sibling;
          sibling = sibling.nextElementSibling;
        }
      }
    }
    return null;
  }
  function _findTopmostSkillContainer(skillElements) {
    const parents = [];
    for (const el of skillElements) {
      let p = el.parentElement;
      while (p && p !== document.body) {
        parents.push(p);
        p = p.parentElement;
      }
    }
    for (const p of parents) {
      const skillChildren = p.querySelectorAll('[data-qa*="skill"]');
      if (skillChildren.length >= 2 && skillChildren.length <= 200) return p;
    }
    if (skillElements.length > 0) {
      return skillElements[0].closest('[data-qa="resume-block-item"]') || skillElements[0].closest("section") || skillElements[0].parentElement;
    }
    return null;
  }
  function _findMagritteSkillTags() {
    const skills = [];
    const tagSelectors = [
      '[data-qa^="resume-skill"]',
      '[data-qa*="skill-tag"]',
      '[data-qa="skills-element"]'
    ];
    for (const sel of tagSelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const text = (el.textContent || "").trim();
        if (text && text.length > 1 && text.length < 100) {
          skills.push(text);
        }
      });
    }
    return skills;
  }
  var _resumeLog;
  var init_parse_resume_skills = __esm({
    "src/parsers/resume-detail/parse-resume-skills.js"() {
      init_anti_hallucination();
      _resumeLog = createLogger("Resume");
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
      const descParagraphs = [];
      const blockTexts = stepContent.querySelectorAll(
        '[data-qa="cell-text-content"], .magritte-text, p, [class*="text-"], li'
      );
      const posText = job.position || "";
      const periodText = job.period || "";
      const skipTexts = /* @__PURE__ */ new Set();
      if (posText) skipTexts.add(posText);
      if (periodText) skipTexts.add(periodText);
      if (job.duration) skipTexts.add(job.duration);
      blockTexts.forEach((el) => {
        const t = (el.textContent || "").trim();
        if (!t || t.length < 2) return;
        if (skipTexts.has(t)) return;
        if (posText && t.startsWith(posText) && t.length <= posText.length + 50) {
          const remaining = t.substring(posText.length).trim();
          if (!remaining || skipTexts.has(remaining)) return;
        }
        if (/^\(\d/.test(t) && /\)$/.test(t) && t.length < 40) return;
        if (el.closest('[data-qa="cell-left-side"]') && !el.matches("li")) return;
        descParagraphs.push(t);
      });
      if (descParagraphs.length === 0) {
        const fullStepText = (stepContent.textContent || "").trim();
        let desc = fullStepText;
        if (posText && desc.startsWith(posText)) {
          desc = desc.substring(posText.length);
        }
        if (periodText && desc.startsWith(periodText)) {
          desc = desc.substring(periodText.length);
        }
        desc = desc.trim();
        if (desc.length > 20) {
          desc = desc.replace(/\.\s*(?=[А-ЯЁA-Z])/g, ".\n");
          descParagraphs.push(...desc.split("\n").filter((s) => s.trim().length > 0));
        }
      }
      if (descParagraphs.length > 0) {
        job.description = descParagraphs.join("\n");
      }
    }
    return job.company || job.position ? job : null;
  }
  var init_parse_company_card = __esm({
    "src/parsers/resume-detail/parse-company-card.js"() {
    }
  });

  // src/parsers/resume-detail/parse-resume-sections.js
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
        const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
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
      init_parse_resume_skills();
      init_parse_company_card();
      resumeLog = createLogger("Resume");
    }
  });

  // src/lib/skill-dictionary-management-sales.js
  var MANAGEMENT_SKILLS, SALES_SKILLS;
  var init_skill_dictionary_management_sales = __esm({
    "src/lib/skill-dictionary-management-sales.js"() {
      MANAGEMENT_SKILLS = [
        { skill: "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439", patterns: [
          /управлен(?:ие|ием|ию)\s+(?:команд|коллектив)/i,
          /руководств(?:о|ом|у)\s+команд/i,
          /руководител(?:ь|я|ю)\s+(?:отдел|групп|направлен)/i,
          /создан(?:ие|ии)\s+(?:и\s+)?управлен/i,
          /команд(?:ы|у)\s+(?:с\s+\d|до\s+\d|от\s+\d|вырос|рост|расшир)/i,
          /управлен(?:ие|ием)\s+сотрудник/i
        ] },
        { skill: "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C\u0438", patterns: [
          /управлен(?:ие|ием|ию)\s+продаж/i,
          /руководств(?:о|ом|у)\s+(?:отдел(?:ом|\s+продаж))/i,
          /управлен(?:ие|ием)\s+отдел(?:ом|\s+)?продаж/i
        ] },
        { skill: "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0447\u0435\u0441\u043A\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u0438", patterns: [
          /управленческ/i,
          /менеджмент/i,
          /KPI/i,
          /СОП/i,
          /грейд(?:ы|овая|ов)/i,
          /систем(?:а|ы|у)\s+оценк/i
        ] },
        { skill: "\u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E \u043E\u0442\u0434\u0435\u043B\u043E\u043C", patterns: [
          /руководств(?:о|ом|у)\s+отдел/i,
          /начальник\s+отдел/i,
          /заведующ/i
        ] },
        { skill: "\u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B", patterns: [
          /развити[ея]\s+команд/i,
          /обучен(?:ие|ием|ию)\s+(?:команд|сотрудник|менеджер|персонал)/i,
          /наставничество/i,
          /менторство/i,
          /коучинг/i
        ] },
        { skill: "\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430", patterns: [
          /обучен(?:ие|ием|ию)\s+(?:персонал|сотрудник|менеджер|команд)/i,
          /тренинг/i,
          /повышени[ея]\s+квалифик/i,
          /проведени[ея]\s+обучен/i,
          /систем(?:а|ы|у)\s+обучен/i,
          /обучен(?:ие|ием)\s*[+,]/i,
          /обратн(?:ая|ой)\s+связь/i,
          /наставнич/i
        ] },
        { skill: "\u043D\u0430\u0432\u044B\u043A\u0438 \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u0438", patterns: [
          /презентац/i,
          /выступлен/i,
          /питчинг/i,
          /публичн(?:ые|ым|ая)\s+выступлен/i,
          /демонстрац(?:ия|ии|ию)\s+(?:продукт|решен|услуг)/i,
          /показ(?:ал|ала|ывать)?\s+(?:продукт|решен|возможност)/i
        ] },
        { skill: "\u0434\u0435\u043B\u043E\u0432\u043E\u0435 \u043E\u0431\u0449\u0435\u043D\u0438\u0435", patterns: [
          /делов(?:ое|ым|ая|ые)\s+(?:общен|коммуник|переговор)/i,
          /переговор(?:ы|ам|ами|ная)/i,
          /коммуникабельн/i
        ] },
        { skill: "\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", patterns: [
          /стратегиче/i,
          /стратеги[яю]\s+(?:развит|продаж|маркетинг)/i,
          /долгосрочн/i,
          /стратегич/i
        ] },
        { skill: "\u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435", patterns: [
          /операционн/i,
          /оптимизац/i,
          /бизнес-процесс/i,
          /процессн/i
        ] },
        { skill: "\u0434\u0435\u043B\u0435\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", patterns: [
          /делегирован/i,
          /распределени[ея]\s+задач/i,
          /постановк[ае]\s+задач/i
        ] },
        { skill: "\u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430", patterns: [
          /мотивац/i,
          /стимулирован/i,
          /поощрени[ея]/i
        ] }
      ];
      SALES_SKILLS = [
        { skill: "\u043F\u0440\u044F\u043C\u044B\u0435 \u043F\u0440\u043E\u0434\u0430\u0436\u0438", patterns: [
          /прям(?:ые|ых|ым)\s+продаж/i,
          /холодн(?:ые|ых|ым)\s+(?:звонк|контакт|продаж)/i,
          /активн(?:ые|ых|ым)\s+продаж/i,
          /исходящ/i,
          /торгов(?:ый|ая|ые)\s+представител/i,
          /менеджер\s+по\s+продаж/i,
          /территориальн(?:ый|ая|ые)\s+менеджер/i
        ] },
        { skill: "B2B \u043F\u0440\u043E\u0434\u0430\u0436\u0438", patterns: [
          /B2B/i,
          /бизнес[\s-]*(?:для|to)\s*бизнес/i,
          /корпоративн(?:ые|ым|ая)\s+(?:клиент|продаж)/i,
          /крупн(?:ые|ых|ым)\s+(?:клиент|B2B)/i
        ] },
        { skill: "B2C \u043F\u0440\u043E\u0434\u0430\u0436\u0438", patterns: [
          /B2C/i,
          /розничн(?:ые|ых|ым|ая)\s+продаж/i,
          /потребител(?:ь|ей|ям)\s+(?:сегмент|рынок|продаж)/i,
          /продаж[аиы]\s+(?:физическ|частн|потребител)/i,
          /consumer/i
        ] },
        { skill: "\u0432\u043E\u0440\u043E\u043D\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436", patterns: [
          /воронк[аеу]\s+продаж/i,
          /воронк[аеу]\s+конверс/i,
          /sales\s+funnel/i,
          /конверси[яю]\s+продаж/i
        ] },
        { skill: "\u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B", patterns: [
          /переговор(?:ы|ам|ами|ная)/i,
          /ведени[ея]\s+переговор/i,
          /заключени[ея]\s+(?:договор|контракт|сделок)/i
        ] },
        { skill: "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C\u0438", patterns: [
          /работ[аеу]\s+(?:с\s+)?клиент/i,
          /клиент(?:о|а)(?:ориентир|оориентир)/i,
          /обслуживан(?:ие|ием|ию)\s+клиент/i,
          /удержан(?:ие|ием|ию)\s+клиент/i
        ] },
        { skill: "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u0432\u043E\u0437\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C\u0438", patterns: [
          /возражени/i,
          /отработк[аеу]\s+возражен/i
        ] },
        { skill: "CRM", patterns: [
          new RegExp("(?<!\\p{L})CRM(?!\\p{L})", "iu"),
          // Unicode-aware boundary: blocks 'микроCRM' (RF-1)
          /customer\s+relationship/i,
          /управлен(?:ие|ием)\s+отношен/i
        ] },
        { skill: "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0441\u043A\u043E\u0439 \u0431\u0430\u0437\u044B", patterns: [
          /клиентск(?:ая|ой|ую)\s+баз/i,
          /баз[аеу]\s+(?:клиент|данных)/i,
          /ведени[ея]\s+баз/i
        ] },
        { skill: "\u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B", patterns: [
          /коммерческ/i,
          /услови[яю]\s+(?:сотрудничеств|контракт|договор)/i
        ] },
        { skill: "\u0430\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043E\u0432", patterns: [
          /конкурент/i,
          /конкурент(?:н|оспособ)/i,
          /анализ\s+рынк/i,
          /исследован(?:ие|ием|ию)\s+рынк/i
        ] }
      ];
    }
  });

  // src/lib/skill-dictionary-marketing-finance-it.js
  var MARKETING_SKILLS, FINANCE_SKILLS, IT_SKILLS;
  var init_skill_dictionary_marketing_finance_it = __esm({
    "src/lib/skill-dictionary-marketing-finance-it.js"() {
      MARKETING_SKILLS = [
        { skill: "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433", patterns: [
          /маркетинг/i,
          /продвижени[ея]\s+(?:продукт|бренд|услуг)/i
        ] },
        { skill: "\u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433", patterns: [
          /digital/i,
          /цифров/i,
          /интернет[\s-]*маркетинг/i,
          /онлайн[\s-]*маркетинг/i
        ] },
        { skill: "SMM", patterns: [
          /SMM/i,
          /социальн(?:ые|ых|ым)\s+сет/i,
          /social\s+media/i
        ] },
        { skill: "\u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433", patterns: [
          /контент[\s-]*маркетинг/i,
          /контент[\s-]*план/i,
          /контент[\s-]*стратег/i
        ] },
        { skill: "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", patterns: [
          /аналитик/i,
          /Google\s+Analytics/i,
          /Яндекс\s*Метрик/i,
          /веб[\s-]*аналитик/i
        ] },
        { skill: "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u0440\u043E\u0434\u0430\u0436", patterns: [
          /аналитик[аиы]?\s+продаж/i,
          /продажн?\s*аналитик/i,
          /анализ\s+продаж/i,
          /sales\s+analytics/i
        ] }
      ];
      FINANCE_SKILLS = [
        { skill: "\u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437", patterns: [
          /финансов[iыйе]\s+анализ/i,
          /прибыл(?:ь|и|ью)/i,
          /бюджетир/i
        ] },
        { skill: "P&L", patterns: [
          /P&L/i,
          /планов[а-яё]*\s+(?:и|&)\s*факт/i,
          /profit\s+and\s+loss/i,
          /отч[её]т\s+о\s+прибыл/i
        ] },
        { skill: "\u0431\u0438\u0437\u043D\u0435\u0441-\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", patterns: [
          /бизнес[\s-]*план/i,
          /бюджетир/i,
          /финансовое\s+планирован/i
        ] },
        { skill: "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438", patterns: [
          /проектн/i,
          /управлен(?:ие|ием|ию)\s+проект/i,
          // /\bPM\b/i removed (RF-1): too ambiguous (Product Manager, Performance Mgmt)
          /project\s+manag/i,
          /Agile/i,
          /Scrum/i,
          /Kanban/i,
          /спринт/i
        ] },
        { skill: "\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0440\u0438\u0441\u043A\u0430\u043C\u0438", patterns: [
          /управлен(?:ие|ием)\s+риск/i,
          /риск[\s-]*менеджмент/i,
          /минимизац/i
        ] }
      ];
      IT_SKILLS = [
        { skill: "Python", patterns: [
          /python/i,
          /django/i,
          /flask/i,
          /fastapi/i
        ] },
        { skill: "JavaScript", patterns: [
          /javascript/i,
          /\bJS\b/i,
          /ECMAScript/i
        ] },
        { skill: "TypeScript", patterns: [
          /typescript/i
          // /\bTS\b/ removed (RF-1): too ambiguous (Test Specialist, TS format)
        ] },
        { skill: "React", patterns: [
          /\breact\b/i,
          /\bredux\b/i,
          /\bnext\.?js\b/i
        ] },
        { skill: "SQL", patterns: [
          /\bsql\b/i,
          /mysql/i,
          /postgresql/i,
          /\bpostgres\b/i,
          /sqlite/i
        ] },
        { skill: "Git", patterns: [
          /\bgit\b/i,
          /github/i,
          /gitlab/i
        ] },
        { skill: "Docker", patterns: [
          /docker/i,
          /контейнеризац/i
        ] },
        { skill: "CI/CD", patterns: [
          /CI\/CD/i,
          /continuous\s+integr/i,
          /jenkins/i,
          /gitlab\s+ci/i
        ] },
        { skill: "Linux", patterns: [
          /linux/i,
          /ubuntu/i,
          /centos/i,
          /debian/i
        ] },
        { skill: "AWS", patterns: [
          /\bAWS\b/i,
          /amazon\s+web\s+services/i
        ] }
      ];
    }
  });

  // src/lib/skill-dictionary-product-hr-soft.js
  var PRODUCT_SKILLS, HR_SKILLS, LOGISTICS_SKILLS, SOFT_SKILLS;
  var init_skill_dictionary_product_hr_soft = __esm({
    "src/lib/skill-dictionary-product-hr-soft.js"() {
      PRODUCT_SKILLS = [
        { skill: "\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432\u044B\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u043C\u0435\u043D\u0442", patterns: [
          /продуктов/i,
          /product\s+manag/i,
          /продакт[\s-]*менеджер/i,
          /product\s+owner/i
        ] },
        { skill: "A/B \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", patterns: [
          /A\/B[\s-]*тест/i,
          /сплит[\s-]*тест/i,
          /мультивариантн/i
        ] },
        { skill: "\u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439", patterns: [
          /пользовател(?:ь|ей|ям)\s+исслед/i,
          /UX[\s-]*исслед/i,
          /custdev/i,
          /CustDev/i,
          /глубинн/i,
          /интервью/i
        ] },
        { skill: "Data-driven", patterns: [
          /data[\s-]*driven/i,
          /данные[\s-]*ориентир/i,
          /управлен(?:ие|ием)\s+на\s+основ/i
        ] }
      ];
      HR_SKILLS = [
        { skill: "\u043F\u043E\u0434\u0431\u043E\u0440 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430", patterns: [
          /подбор\s+персонал/i,
          /рекрутинг/i,
          /найм\s+сотрудник/i,
          /интервьюирован/i,
          /собеседован/i
        ] },
        { skill: "\u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430", patterns: [
          /адаптац/i,
          /онбординг/i,
          /onboarding/i
        ] },
        { skill: "\u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430", patterns: [
          /оценк[аеу]\s+персонал/i,
          /оценк[аеу]\s+сотрудник/i,
          /ассессмент/i,
          /performance\s+review/i
        ] }
      ];
      LOGISTICS_SKILLS = [
        { skill: "\u043B\u043E\u0433\u0438\u0441\u0442\u0438\u043A\u0430", patterns: [
          /логистик/i,
          /склад/i,
          /доставка/i,
          /цепочк[аеу]\s+постав/i,
          /supply\s+chain/i
        ] },
        { skill: "\u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C\u0438", patterns: [
          /поставщик/i,
          /закупк/i,
          /vendor\s+manag/i,
          /партн[её]р/i
        ] },
        { skill: "\u0440\u0438\u0442\u0435\u0439\u043B", patterns: [
          /ритейл/i,
          /розничн/i,
          /торгов[аяые]+\s+сет/i,
          /FMCG/i
        ] }
      ];
      SOFT_SKILLS = [
        { skill: "\u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u044F\u0437\u044B\u043A", patterns: [
          /английск/i,
          /English/i
        ] },
        { skill: "\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u0447\u0451\u0442\u043D\u043E\u0441\u0442\u0438", patterns: [
          /отч[её]тн/i,
          /отч[её]т(?:ы|ам|ами)/i,
          /dashboard/i,
          /дашборд/i,
          /метрик/i
        ] },
        { skill: "Excel", patterns: [
          /excel/i,
          /эксель/i,
          /Google\s+Sheets/i,
          /таблиц[аеу]\s+(?:excel|google)/i
        ] },
        { skill: "PowerPoint", patterns: [
          /powerpoint/i,
          /презентац/i,
          /keynote/i
        ] },
        { skill: "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u0432", patterns: [
          /автоматизац/i,
          /роботизац/i,
          /интеграции?\s+(?:с\s+)?CRM/i,
          /автоматизир/i
        ] },
        { skill: "\u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435", patterns: [
          /масштабир/i,
          /масштабирован/i,
          /scaling/i,
          /расширени[ея]\s+(?:команд|бизнес|отдел|продаж)/i
        ] },
        { skill: "\u0437\u0430\u043F\u0443\u0441\u043A \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430", patterns: [
          /запуск\s+(?:продукт|проект|бизнес|направлен)/i,
          /go[\s-]*to[\s-]*market/i,
          /\bGTM\b/i,
          /вывод\s+(?:на\s+рынок|продукт)/i
        ] },
        { skill: "\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0438", patterns: [
          /разработк[аеу]\s+стратег/i,
          /стратегиче/i,
          /формировани[ея]\s+стратег/i
        ] },
        { skill: "\u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445", patterns: [
          /анализ\s+данн/i,
          /data\s+analysis/i,
          /big\s+data/i,
          // /\bBI\b/i removed (RF-1): too ambiguous
          /business\s+intelligence/i
        ] },
        // ===========================================
        // ДОП. ПОЛЕЗНЫЕ
        // ===========================================
        { skill: "1\u0421", patterns: [
          /1[СCсc]/
        ] },
        { skill: "SAP", patterns: [
          /\bSAP\b/i
        ] },
        { skill: "Salesforce", patterns: [
          /salesforce/i
        ] },
        { skill: "\u043C\u043D\u043E\u0433\u043E\u0437\u0430\u0434\u0430\u0447\u043D\u043E\u0441\u0442\u044C", patterns: [
          /многозадачн/i,
          /мульти[\s-]*таск/i,
          /приоритизац/i
        ] },
        { skill: "\u0441\u0442\u0440\u0435\u0441\u0441\u043E\u0443\u0441\u0442\u043E\u0439\u0447\u0438\u0432\u043E\u0441\u0442\u044C", patterns: [
          /\bстрессоустойчив/i
          // RF-1: was /стресс/i -- 'был стресс' is not the skill
        ] },
        { skill: "LLM", patterns: [
          /\bLLMs?\b/i,
          /large\s+language\s+model/i,
          /языков[а-яё]+\s+модел/i,
          /GPT/i,
          /ChatGPT/i,
          /нейросет/i,
          /генеративн/i
        ] },
        { skill: "\u0446\u0435\u043B\u0435\u043F\u043E\u043B\u0430\u0433\u0430\u043D\u0438\u0435", patterns: [
          /целеполаган/i,
          /KPI/i,
          /OKR/i,
          /постановк[аеу]\s+целей/i
        ] }
      ];
    }
  });

  // src/lib/skill-dictionary.js
  function getAllSkillNames() {
    return SKILL_PATTERNS.map((s) => s.skill);
  }
  function countPatterns() {
    return SKILL_PATTERNS.reduce((sum, s) => sum + s.patterns.length, 0);
  }
  var SKILL_PATTERNS;
  var init_skill_dictionary = __esm({
    "src/lib/skill-dictionary.js"() {
      init_skill_dictionary_management_sales();
      init_skill_dictionary_marketing_finance_it();
      init_skill_dictionary_product_hr_soft();
      SKILL_PATTERNS = [
        ...MANAGEMENT_SKILLS,
        ...SALES_SKILLS,
        ...MARKETING_SKILLS,
        ...FINANCE_SKILLS,
        ...IT_SKILLS,
        ...PRODUCT_SKILLS,
        ...HR_SKILLS,
        ...LOGISTICS_SKILLS,
        ...SOFT_SKILLS
      ];
    }
  });

  // src/lib/derive-skills.js
  function buildSafeCorpus(corpus) {
    const sentences = corpus.split(/(?<=[.!?])\s+|\n/);
    const safe = sentences.filter((s) => {
      const trimmed = s.trim();
      if (trimmed.length < 8) return true;
      return !NEGATION_MARKERS.some((re) => re.test(trimmed));
    });
    return safe.join("\n");
  }
  function deriveSkillsFromExperience(resume) {
    if (!resume) return [];
    const textParts = [];
    if (resume.title) textParts.push(resume.title);
    if (Array.isArray(resume.experience)) {
      for (const exp of resume.experience) {
        if (exp.description) textParts.push(exp.description);
        if (exp.position) textParts.push(exp.position);
        if (exp.duties) textParts.push(exp.duties);
        if (exp.achievements) textParts.push(exp.achievements);
      }
    }
    if (resume.additionalInfo) textParts.push(resume.additionalInfo);
    if (resume.about) textParts.push(resume.about);
    const corpus = textParts.join("\n");
    if (!corpus || corpus.length < 10) {
      deriveLog.info("No text corpus for skill derivation");
      resume.derivedSkills = [];
      return [];
    }
    const safeCorpus = buildSafeCorpus(corpus);
    const existingSkills = new Set(
      (resume.skills || []).map((s) => s.toLowerCase().trim().replace(/\s+/g, " "))
    );
    const derived = [];
    for (const entry of SKILL_PATTERNS) {
      if (existingSkills.has(entry.skill.toLowerCase().trim())) continue;
      for (const pattern of entry.patterns) {
        if (pattern.test(safeCorpus)) {
          derived.push(entry.skill);
          break;
        }
      }
    }
    resume.derivedSkills = derived;
    deriveLog.info("Derived " + derived.length + " skills from experience text (" + corpus.length + " chars scanned)");
    if (derived.length > 0) {
      deriveLog.info("Derived skills: " + derived.join(", "));
    }
    return derived;
  }
  function matchVacancySkillsToExperience(resume, vacancySkillNames) {
    if (!resume || !Array.isArray(vacancySkillNames)) return [];
    const textParts = [];
    if (resume.title) textParts.push(resume.title);
    if (Array.isArray(resume.experience)) {
      for (const exp of resume.experience) {
        if (exp.description) textParts.push(exp.description);
        if (exp.position) textParts.push(exp.position);
      }
    }
    if (resume.additionalInfo) textParts.push(resume.additionalInfo);
    const corpus = textParts.join("\n");
    if (!corpus) return [];
    const safeCorpus = buildSafeCorpus(corpus).toLowerCase();
    const existingSkills = new Set(
      (resume.skills || []).map((s) => s.toLowerCase().trim())
    );
    const matched = [];
    for (const skill of vacancySkillNames) {
      const normalized = skill.toLowerCase().trim();
      if (existingSkills.has(normalized)) continue;
      if (safeCorpus.includes(normalized)) {
        matched.push(skill);
        continue;
      }
      for (const entry of SKILL_PATTERNS) {
        if (entry.skill.toLowerCase() === normalized) {
          for (const pattern of entry.patterns) {
            if (pattern.test(safeCorpus)) {
              matched.push(skill);
              break;
            }
          }
          break;
        }
      }
    }
    return matched;
  }
  var deriveLog, NEGATION_MARKERS;
  var init_derive_skills = __esm({
    "src/lib/derive-skills.js"() {
      init_skill_dictionary();
      init_anti_hallucination();
      deriveLog = createLogger("DeriveSkills");
      NEGATION_MARKERS = [
        // A. Explicit negation -- candidate says they DON'T do/have X
        // NOTE: \b does NOT work with Cyrillic (JS treats non-ASCII as non-word).
        //       Use (?<!\p{L}) / (?!\p{L}) with 'u' flag for Unicode-aware boundaries.
        new RegExp("(?<!\\p{L})\u043D\u0435\\s+(?:\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043B|\u043F\u0440\u0438\u043C\u0435\u043D\u044F\u043B|\u0438\u043C\u0435\u043B|\u0437\u043D\u0430\u043B|\u0440\u0430\u0431\u043E\u0442\u0430\u043B|\u0432\u043B\u0430\u0434\u0435\u043B|\u0443\u043C\u0435\u043B|\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E|\u043F\u0440\u0438\u043C\u0435\u043D\u044F\u044E|\u0440\u0430\u0431\u043E\u0442\u0430\u044E|\u0432\u043B\u0430\u0434\u0435\u044E|\u043A\u043E\u0434\u0438\u043B)(?!\\p{L})", "iu"),
        new RegExp("(?<!\\p{L})\u0431\u0435\u0437\\s+(?:\u043E\u043F\u044B\u0442\u0430|\u0437\u043D\u0430\u043D\u0438\u044F|\u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0438)(?!\\p{L})", "iu"),
        // B. Abandonment / past-tense attempts that didn't stick
        new RegExp("(?<!\\p{L})(?:\u0431\u0440\u043E\u0441\u0438\u043B|\u0437\u0430\u0431\u0440\u043E\u0441\u0438\u043B|\u043E\u0441\u0442\u0430\u0432\u0438\u043B|\u043D\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u043B|\u043D\u0435 \u0441\u0442\u0430\u043B)(?!\\p{L})", "iu"),
        // C. Company context -- the COMPANY seeks the skill, not the candidate
        new RegExp("(?<!\\p{L})\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F\\s+(?:\u0438\u0449\u0435\u0442|\u0442\u0440\u0435\u0431\u0443\u0435\u0442|\u043D\u0430\u043D\u0438\u043C\u0430\u0435\u0442|\u043D\u0443\u0436\u0435\u043D|\u043D\u0443\u0436\u043D\u044B)(?!\\p{L})", "iu"),
        new RegExp("(?<!\\p{L})(?:\u0438\u0449\u0435\u043C|\u0438\u0449\u0443|\u0442\u0440\u0435\u0431\u0443\u044E\u0442\u0441\u044F|\u043D\u0443\u0436\u043D\u044B)\\s+(?:\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A|\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442|\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440|\u0438\u043D\u0436\u0435\u043D\u0435\u0440)(?!\\p{L})", "iu"),
        // D. Access denied
        new RegExp("(?<!\\p{L})(?:\u0434\u043E\u0441\u0442\u0443\u043F[\u0430\u0443]?\\s*\u043D\u0435\\s+(?:\u0438\u043C\u0435\u043B|\u0431\u044B\u043B|\u043F\u043E\u043B\u0443\u0447\u0438\u043B)|\u043D\u0435\\s+\u0438\u043C\u0435\u043B\\s+\u0434\u043E\u0441\u0442\u0443\u043F)(?!\\p{L})", "iu"),
        // E. No practical application
        new RegExp("(?<!\\p{L})(?:\u043D\u0430\\s+\u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0435\\s+\u043D\u0435|\u043D\u0435\\s+\u043F\u0440\u0438\u043C\u0435\u043D\u044F\u043B\\s+\u043D\u0430\\s+\u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0435)(?!\\p{L})", "iu"),
        new RegExp("(?<!\\p{L})(?:\u0442\u043E\u043B\u044C\u043A\u043E\\s+(?:\u0447\u0438\u0442\u0430\u043B|\u0441\u043B\u044B\u0448\u0430\u043B|\u0437\u043D\u0430\u043B)\\s+\u043F\u0440\u043E)(?!\\p{L})", "iu")
      ];
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
        const isEmploymentMeta = /тип занятости|формат работы|график работы|полная занятость|частичная занятость|проектная работа|стажировка|удаленная работа|гибридный формат/i.test(t);
        if (!isGender && !isAge && !isName && !isEmploymentMeta && !t.includes("\u0440\u0443\u0431") && !t.includes("USD") && !t.includes("\u0437/\u043F") && !t.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C") && !t.includes("\u0434\u043E\u0445\u043E\u0434") && t !== resume.salary && t !== resume.title) {
          if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
            resume.address = dbg("resumeAddress", t);
          }
        }
      }
    }
  }
  var _resumeLog2;
  var init_parse_resume_personal = __esm({
    "src/parsers/resume-detail/parse-resume-personal.js"() {
      init_anti_hallucination();
      _resumeLog2 = createLogger("Resume");
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
        const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
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
        const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
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
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
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
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
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
    resumeLog2.info("Education: found " + eduCells.length + " cell-left-side elements");
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
      resumeLog2.info("Education: fallback to direct children of eduCard");
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
      resumeLog2.info("Education: fallback to full text scan");
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
  var resumeLog2;
  var init_parse_resume_education = __esm({
    "src/parsers/resume-detail/parse-resume-education.js"() {
      init_anti_hallucination();
      resumeLog2 = createLogger("Resume");
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
  var _coreLog, MIN_HASH_LEN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN, HIDDEN_INDICATORS, VISIBLE_INDICATORS, RESUME_CARD_SELECTORS, VISIBILITY_HIDDEN_DATA_QA;
  var init_resume_constants_core = __esm({
    "src/lib/resume-constants-core.js"() {
      init_anti_hallucination();
      _coreLog = createLogger("ResumeConst");
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
      derivedSkills: [],
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
    deriveSkillsFromExperience(resume);
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
        resumeLog3.info('Unknown visibility card text: "' + cardText.substring(0, 80) + '"');
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
    resumeLog3.info("Resume parsed in " + elapsed + "ms");
    resumeLog3.info("Found: " + resume._debug.found.length + " | Missing: " + resume._debug.missing.length);
    resumeLog3.info("Skills: " + resume.skills.length + " | Derived: " + (resume.derivedSkills ? resume.derivedSkills.length : 0) + " | Experience: " + resume.experience.length + " | Education: " + resume.education.length);
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
  var resumeLog3;
  var init_parse_resume = __esm({
    "src/parsers/resume-detail/parse-resume.js"() {
      init_anti_hallucination();
      init_parse_resume_sections();
      init_derive_skills();
      init_parse_resume_personal();
      init_parse_resume_conditions();
      init_parse_resume_contacts();
      init_parse_resume_education();
      init_resume_constants();
      resumeLog3 = createLogger("Resume");
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
  var _diagLog;
  var init_diagnose_elements = __esm({
    "src/parsers/resume-detail/diagnose-elements.js"() {
      init_anti_hallucination();
      _diagLog = createLogger("DIAG");
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
            console.log("%c  + " + key + " -> " + sel, "color:#22c55e", "text:", (el.textContent || "").trim().substring(0, 60));
            found = true;
            break;
          }
        } catch (_e) {
        }
      }
      if (!found) {
        console.log("%c  x " + key + " -> none matched", "color:#ef4444", "tried:", sels);
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
        const subQa = Array.from(child.querySelectorAll("[data-qa]")).map((e2) => e2.getAttribute("data-qa"));
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
        const subQa = Array.from(child.querySelectorAll("[data-qa]")).map((e2) => e2.getAttribute("data-qa"));
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
    console.log("%c[HH-AR][DIAG] === DOM DIAGNOSTIC DUMP ===", "color:#2964FF;font-weight:bold;font-size:14px");
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
    console.log("%c[HH-AR][DIAG] === END DUMP ===", "color:#2964FF;font-weight:bold");
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
      resumeLog4.info("  Link: " + id.substring(0, 8) + '="' + title.substring(0, 30) + '"=' + vis.visibility + " (method=" + vis.method + ")");
    });
    const allDetected = resumes.every((r) => r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE);
    if (allDetected && resumes.length > 0) {
      resumeLog4.info("Strategy 0: all " + resumes.length + " resumes detected from link text");
    } else {
      const unknownResumes = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      resumeLog4.info("Strategy 0: " + (resumes.length - unknownResumes.length) + " detected, " + unknownResumes.length + " unknown -- trying data-qa cards");
      let filled = 0;
      for (const sel of RESUME_CARD_SELECTORS) {
        const cards = document.querySelectorAll(sel);
        if (cards.length === 0) continue;
        resumeLog4.info("Strategy 1: Found " + cards.length + " cards with selector: " + sel);
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
          resumeLog4.info("  Card: " + cardId.substring(0, 8) + "=" + result.visibility + " (method=" + result.method + ")");
        });
        if (filled > 0) break;
      }
      const stillUnknown2 = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      if (stillUnknown2.length > 0) {
        resumeLog4.info("Strategy 2: DOM walking for " + stillUnknown2.length + " unknown resumes");
        stillUnknown2.forEach((resume) => {
          const link = document.querySelector('a[href*="' + resume.id + '"]');
          if (!link) return;
          const card = findCardForLink(link);
          if (card) {
            const result = detectVisibilityFromCard(card);
            resume.visibility = result.visibility;
            resume.hidden = result.hidden;
            resumeLog4.info("  Walk: " + resume.id.substring(0, 8) + "=" + result.visibility + " (method=" + result.method + ")");
          }
        });
      }
      const finalUnknown = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
      if (finalUnknown.length > 0) {
        resumeLog4.info("Strategy 3: proximity search for " + finalUnknown.length + " remaining unknowns");
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
          resumeLog4.info("  Proximity: " + resume.id.substring(0, 8) + "=" + resume.visibility);
        });
      }
    }
    const stillUnknown = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      resumeLog4.info("List visibility: " + stillUnknown.length + " resumes still UNKNOWN -- will be resolved by detail page detection");
    }
    const hiddenCount = resumes.filter((r) => r.visibility === VISIBILITY_HIDDEN).length;
    const visibleCount = resumes.filter((r) => r.visibility === VISIBILITY_VISIBLE).length;
    const unknownCount = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN).length;
    resumeLog4.info("Resume list: " + resumes.length + " total (" + hiddenCount + " hidden, " + visibleCount + " visible, " + unknownCount + " unknown)");
    return resumes;
  }
  var resumeLog4;
  var init_resume_detail_list_parser = __esm({
    "src/parsers/resume-detail/resume-detail-list-parser.js"() {
      init_anti_hallucination();
      init_resume_constants();
      resumeLog4 = createLogger("Resume");
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
        } catch (_e) {
        }
      }
    });
    if (clicked.length > 0) {
      const resumeLog5 = (await Promise.resolve().then(() => (init_anti_hallucination(), anti_hallucination_exports))).createLogger("Resume");
      resumeLog5.info("Expanded hidden sections: " + clicked.join(", "));
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
  var state_exports = {};
  __export(state_exports, {
    clearResumeState: () => clearResumeState,
    panelState: () => panelState,
    refs: () => refs,
    removeFromBlacklist: () => removeFromBlacklist,
    setActiveConversation: () => setActiveConversation,
    setActiveResumeState: () => setActiveResumeState,
    setActiveTab: () => setActiveTab,
    setAuthState: () => setAuthState,
    setMyResumes: () => setMyResumes,
    setNegotiations: () => setNegotiations,
    setResumeList: () => setResumeList,
    setStatus: () => setStatus,
    setVacancies: () => setVacancies,
    togglePanelOpen: () => togglePanelOpen,
    updateSettings: () => updateSettings,
    updateStats: () => updateStats
  });
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
  function setNegotiations(list) {
    panelState.negotiations = list || [];
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
        fabInspectorEl: null,
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
*, *::before, *::after { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; box-sizing: border-box; line-height: 1.5; -webkit-text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
html { font-size: 14px; font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

/* Panel shell */
.fab-panel { width: 720px; height: 100vh; position: fixed; right: 0; top: 0; z-index: 1000;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column;

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
.tab-btn { position: relative; padding: 10px 6px; font-size: 12px; font-weight: 500; color: #3f3f46;
  background: none; border: none; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 4px; flex: 1; border-radius: 8px; }
.tab-btn:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 8px; }
.tab-btn:hover { color: #18181b; background: rgba(0,0,0,0.04); }
.tab-btn.active { color: #047857; font-weight: 600; background: rgba(5,150,105,0.06);
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
.toggle input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.toggle input:focus-visible + .slider { outline: 2px solid #059669; outline-offset: 2px; }
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
/* sr-only text for spinner is added via HTML, not CSS ::after */
@keyframes har-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* === Reduced motion (WCAG 2.3.3) === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .fab-panel { transition: none !important; }
  .tab-section { transition: none !important; }
  .kpi-ring-fill { animation: none !important; stroke-dashoffset: 123.89; }
  .kpi-stat { animation: none !important; }
  .fade-in { animation: none !important; }
  .slide-right { animation: none !important; }
  .shimmer { animation: none !important; }
  .pulse-dot { animation: none !important; opacity: 1; }
  .typing-cursor::after { animation: none !important; opacity: 1; }
  .progress-bar .fill { animation: none !important; }
  .countdown-bar { animation: none !important; }
}
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
  font-size: 12px; font-weight: 600; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; overflow-wrap: break-word; }
.badge-green { background: #D1FAE5; color: #065F46; border: 1px solid rgba(5,150,105,0.15); }
.badge-amber { background: #FEF3C7; color: #92400E; border: 1px solid rgba(217,119,6,0.15); }
.badge-red { background: #FEE2E2; color: #B91C1C; border: 1px solid rgba(220,38,38,0.15); }
.badge-blue { background: #DBEAFE; color: #1E40AF; border: 1px solid rgba(37,99,235,0.15); }
.badge-zinc { background: #E4E4E7; color: #27272a; }

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
.btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; pointer-events: none; }
.btn-primary:disabled { background: #6b7280; box-shadow: none; }
.btn .btn-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: har-spin 0.6s linear infinite; vertical-align: middle; }
.btn-outline .btn-spinner { border-color: rgba(0,0,0,0.12); border-top-color: #059669; }

/* Vacancy items */
.vacancy-item { display: flex; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); border-left: 2px solid transparent; }
.vacancy-item:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 10px; }
.vacancy-item:hover { background: #f9fafb; border-color: rgba(5,150,105,0.15); border-left-color: #059669;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

/* Log entry */
.log-entry { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
.log-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

/* Timeline */
.timeline-toggle { cursor: pointer; user-select: none; }
.timeline-toggle:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
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
.sub-toggle:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
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
.ai-source { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
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
.skill-synonym { background: #FEF3C7; color: #92400E; }

/* Conversation items */
.conv-item { transition: all 0.2s ease; border-radius: 8px; }
.conv-item:hover { background: #FAFAFA; }
.conv-item.active { box-shadow: inset 3px 0 0 #059669; }

/* Blacklist items */
.bl-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #FEF2F2; border-radius: 8px; border-left: 3px solid #FECACA; }
.bl-item .btn-bl-del { padding: 4px 10px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; }
.bl-item .btn-bl-del:hover { background: #DC2626; color: #fff; }

/* Inputs / selects / textareas */
.fab-panel input, .fab-panel select, .fab-panel textarea { background: #FAFAFA;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.15s; }
.fab-panel input::placeholder, .fab-panel textarea::placeholder { color: #6b7280; }
.fab-panel input:focus, .fab-panel select:focus, .fab-panel textarea:focus {
  border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); background: #ffffff; outline: none; }
.fab-panel input:focus-visible, .fab-panel select:focus-visible, .fab-panel textarea:focus-visible {
  outline: 2px solid #059669; outline-offset: 2px; }

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
/* role=alert and aria-live=assertive must be set as HTML attributes, not CSS */
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
  background: conic-gradient(#059669 0deg, #059669 calc(var(--score) * 3.6deg), #e4e4e7 calc(var(--score) * 3.6deg));
  font-variant-numeric: tabular-nums; }
.score-ring span { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #047857; }
.score-ring.high span { color: #047857; }
.score-ring.medium span { color: #B45309; }
.score-ring.low span { color: #DC2626; }

/* === Guided Tour === */
/* Overlay, spotlight, tooltip use position:absolute inside .fab-panel
   because the sidebar host has CSS transform, which makes position:fixed
   relative to the host instead of the viewport. */
.hh-tour-overlay { position: absolute; cursor: pointer; z-index: 9999998; }
.hh-tour-spotlight { position: absolute; pointer-events: none; z-index: 9999999; }
.hh-tour-tooltip {
  position: absolute; width: 320px; max-width: calc(100% - 32px);
  background: #ffffff; border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden; z-index: 10000001;
  /* NO animation -- transform:scale() in keyframes breaks position:absolute coords */
}
.hh-tour-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px 0; }
.hh-tour-counter {
  font-size: 12px; font-weight: 600; color: #3b82f6;
  background: #eff6ff; padding: 2px 8px; border-radius: 99px; }
.hh-tour-skip {
  background: none; border: none; font-size: 12px; color: #52525b;
  cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: color 0.15s; }
.hh-tour-skip:hover { color: #18181b; }
.hh-tour-skip:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
.hh-tour-title {
  padding: 8px 14px 0; font-size: 14px; font-weight: 700; color: #18181b; }
.hh-tour-text {
  padding: 6px 14px 10px; font-size: 13px; line-height: 1.5; color: #52525b; }
.hh-tour-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid #f4f4f5; background: #fafafa; }
.hh-tour-prev, .hh-tour-next {
  border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px;
  font-weight: 600; cursor: pointer; transition: all 0.15s; }
.hh-tour-next { background: #059669; color: #fff; }
.hh-tour-next:hover { background: #047857; }
.hh-tour-next:focus-visible { outline: 2px solid #059669; outline-offset: 2px; }
.hh-tour-prev { background: #f4f4f5; color: #52525b; }
.hh-tour-prev:hover { background: #e4e4e7; }
.hh-tour-prev:focus-visible { outline: 2px solid #059669; outline-offset: 2px; }
.hh-tour-help {
  background: none; border: 1px solid #d4d4d8; border-radius: 50%;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 13px; font-weight: 700; color: #52525b;
  transition: all 0.15s; line-height: 1; }
.hh-tour-help:hover { background: #f4f4f5; color: #059669; border-color: #059669; }
.hh-tour-help:focus-visible { outline: 2px solid #059669; outline-offset: 2px; }

/* Visually hidden -- accessible to screen readers */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* Overflow word-break */
.fab-panel { overflow-wrap: break-word; word-break: break-word; }
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
  var L, ICONS;
  var init_icons = __esm({
    "src/ui/html/icons.js"() {
      L = (w, h, inner) => `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
      ICONS = {
        briefcase: L(16, 16, '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>'),
        file: L(16, 16, '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>'),
        folder: L(16, 16, '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
        chat: L(16, 16, '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>'),
        gear: L(16, 16, '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>'),
        chart: L(16, 16, '<path d="M5 21v-6"/><path d="M12 21V3"/><path d="M19 21V9"/>'),
        send: L(14, 14, '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'),
        close: L(16, 16, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
        search: L(12, 12, '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
        refresh: L(12, 12, '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
        rocket: L(12, 12, '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>'),
        sun: L(16, 16, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
        mail: L(16, 16, '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>'),
        envelope: L(16, 16, '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>'),
        ai: L(14, 14, '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>'),
        clock: L(10, 10, '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
        code: L(10, 10, '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'),
        money: L(10, 10, '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
        bubble: L(10, 10, '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>'),
        check: L(12, 12, '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
        chevronDown: L(14, 14, '<path d="m6 9 6 6 6-6"/>')
      };
    }
  });

  // src/ui/html/helpers.js
  function esc(s) {
    if (!s) return "";
    const normalized = s.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ");
    const d = document.createElement("div");
    d.textContent = normalized;
    return d.innerHTML;
  }
  function scoreClass(s) {
    return s >= 70 ? "high" : s >= 40 ? "medium" : "low";
  }
  function settingRow(label, hint, type, id, value, suffix) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <label for="${id}" style="font-size:12px;font-weight:500;">${label}</label>
      ${hint ? `<div style="font-size:12px;color:#52525b;">${hint}</div>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${type}" id="${id}" value="${value}" aria-label="${label}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:12px;color:#52525b;">${suffix}</span>
    </div>
  </div>`;
  }
  function settingToggle(label, hint, id, checked) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <label for="${id}" style="font-size:12px;font-weight:500;">${label}</label>
      ${hint ? `<div style="font-size:12px;color:#52525b;">${hint}</div>` : ""}
    </div>
    <label class="toggle" aria-label="${label}"><input type="checkbox" id="${id}" ${checked ? "checked" : ""} role="switch" aria-checked="${checked ? "true" : "false"}"><span class="slider"></span></label>
  </div>`;
  }
  var init_helpers = __esm({
    "src/ui/html/helpers.js"() {
    }
  });

  // src/ui/html/tabs/overview.js
  function getOverviewSection() {
    return `<div class="tab-section active" id="tab-overview" role="tabpanel" aria-labelledby="tabbtn-overview" tabindex="0">
    ${overviewAuthCard()}
    ${overviewKPIHero()}
    ${overviewRateLimits()}
    <div id="overview-negotiations" class="card fade-in" style="margin-bottom:12px;"></div>
    ${overviewQuickActions()}
    ${overviewTimeline()}
  </div>`;
  }
  function overviewAuthCard() {
    return `<div class="card fade-in" style="margin-bottom:12px;border-left:3px solid #059669;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:12px;font-weight:600;">\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F HH.ru</div>
        <div style="font-size:12px;color:#52525b;margin-top:2px;">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 <code style="font-size:11px;background:#f4f4f5;padding:1px 4px;border-radius:3px;">[data-qa="mainmenu_applicant"]</code></div>
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
    <svg width="108" height="108" viewBox="0 0 120 120" role="img" aria-label="\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442: 0 \u0438\u0437 200">
      <defs><linearGradient id="kpiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#34D399"/>
      </linearGradient></defs>
      <circle class="kpi-ring-bg" cx="60" cy="60" r="54"/>
      <circle class="kpi-ring-fill" cx="60" cy="60" r="54"/>
    </svg>
    <div style="position:absolute;top:50%;left:42px;transform:translateY(-50%);text-align:center;">
      <div id="kpi-daily-count" style="font-size:26px;font-weight:800;color:#18181b;line-height:1;">0</div>
      <div style="font-size:11px;color:#52525b;font-weight:500;">\u0438\u0437 200</div>
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
        <span style="font-size:12px;color:#52525b;">/30 \u0447\u0430\u0441</span>
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
        <span style="font-size:11px;color:#52525b;">\u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</span>
      </div>
      <div style="font-size:11px;color:#52525b;margin-top:2px;">
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
        <span style="font-size:11px;color:#52525b;">\u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</span>
      </div>
      <div style="font-size:11px;color:#52525b;margin-top:2px;">
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
        <div style="font-size:11px;color:#52525b;">\u041C\u0438\u043D. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
        <div style="font-size:14px;font-weight:600;">30 \u0441\u0435\u043A</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#52525b;">\u0414\u0435\u0442\u0435\u043A\u0446\u0438\u044F \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u043E\u0432</div>
        <div style="font-size:14px;font-weight:600;color:#059669;">\u0412\u044B\u043A\u043B</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#52525b;">429 \u043E\u0448\u0438\u0431\u043E\u043A</div>
        <div id="rl-429-count" style="font-size:14px;font-weight:600;">0</div>
      </div>
      <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
        <div style="font-size:11px;color:#52525b;">CAPTCHA</div>
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
    <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="activity" role="button" tabindex="0" aria-expanded="false" aria-controls="tl-activity-body">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-size:12px;font-weight:600;">\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C</div>
        <div style="display:flex;gap:-4px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#059669;border:2px solid #fff;margin-left:-3px;position:relative;z-index:3;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid #fff;margin-left:-3px;position:relative;z-index:2;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#D97706;border:2px solid #fff;margin-left:-3px;position:relative;z-index:1;"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="tl-event-count" style="font-size:11px;color:#52525b;">0 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</span>
        ${ICONS.chevronDown}
      </div>
    </div>
    <div class="timeline-body" id="tl-activity-body" style="margin-top:4px;">
      <div id="tl-activity-list">
        <div style="padding:12px;text-align:center;font-size:12px;color:#52525b;">\u041D\u0435\u0442 \u0441\u043E\u0431\u044B\u0442\u0438\u0439</div>
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
    return `<div class="tab-section" id="tab-resume" role="tabpanel" aria-labelledby="tabbtn-resume" tabindex="0">
    <div id="res-sync-section" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="res-sync" role="button" tabindex="0" aria-expanded="false" aria-controls="res-sync-body">
        <span style="font-size:12px;font-weight:600;">\u0412\u0441\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="badge badge-green" id="res-visible-count" style="font-size:10px;display:none;">0 \u0432\u0438\u0434\u0438\u043C\u044B\u0445</span>
          <span class="badge badge-amber" id="res-hidden-count" style="font-size:10px;display:none;">0 \u0441\u043A\u0440\u044B\u0442\u044B\u0445</span>
          <span class="badge badge-zinc" id="res-sync-count">0</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-sync-body" style="margin-top:10px;">
        <div id="res-sync-list" style="font-size:11px;color:#52525b;">
          \u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435" \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0440\u0435\u0437\u044E\u043C\u0435
        </div>
        <div id="res-cta-load" style="padding-top:6px;display:none;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> \u0412\u0437\u044F\u0442\u044C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
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
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing" role="button" tabindex="0" aria-expanded="false" aria-controls="res-parsing-body">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div id="res-title" style="font-size:13px;font-weight:600;">\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</div>
            </div>
            <div id="res-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0432\u044B\u0448\u0435</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#52525b;">\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435</div>
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
          <div id="res-score-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">\u0410\u043D\u0430\u043B\u0438\u0437 \u0433\u043B\u0430\u0437\u0430\u043C\u0438 HR \u0438 ATS</div>
        </div>
      </div>
      <!-- Two mini-scores: ATS + Experience -->
      <div id="res-score-bars" style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:12px;color:#52525b;">ATS-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C</span>
            <span id="res-ats-score" style="font-size:12px;font-weight:700;color:#059669;">0%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#e4e4e7;">
            <div id="res-ats-bar" style="height:100%;border-radius:2px;background:#059669;width:0%;transition:width .4s ease;"></div>
          </div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:12px;color:#52525b;">\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u043F\u044B\u0442\u0430</span>
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
          <span style="color:#DC2626;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg></span>
          <span style="font-size:11px;font-weight:600;color:#DC2626;">\u041A\u0440\u0430\u0441\u043D\u044B\u0435 \u0444\u043B\u0430\u0433\u0438</span>
        </div>
        <div id="res-red-flags-list" style="font-size:11px;"></div>
      </div>
      <!-- Strengths -->
      <div id="res-strengths" style="display:none;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <span style="color:#059669;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></span>
          <span style="font-size:11px;font-weight:600;color:#059669;">\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B</span>
        </div>
        <div id="res-strengths-list" style="font-size:11px;"></div>
      </div>
      <!-- Recommendations -->
      <div id="res-recommendations" style="display:none;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <span style="color:#D97706;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span>
          <span style="font-size:11px;font-weight:600;color:#D97706;">\u0427\u0442\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C</span>
        </div>
        <div id="res-recommendations-list" style="font-size:11px;"></div>
      </div>
    </div>
    <!-- Diagnostic tools (collapsed by default) -->
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="diag-tools" role="button" tabindex="0" aria-expanded="false" aria-controls="diag-tools-body">
        <span style="font-size:12px;font-weight:600;">\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430</span>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="diag-tools-body" style="margin-top:8px;">
        <div id="res-status-line" style="font-size:11px;color:#52525b;margin-bottom:8px;">\u0413\u043E\u0442\u043E\u0432\u043E</div>
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
    return `<div class="tab-section" id="tab-vacancies" role="tabpanel" aria-labelledby="tabbtn-vacancies" tabindex="0">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0430\u0440\u0441\u0438\u043D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439</div>
          <div style="font-size:11px;color:#52525b;margin-top:2px;">\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u043E\u0438\u0441\u043A\u0430 hh.ru</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="refresh">${ICONS.check} \u0421\u043F\u0430\u0440\u0441\u0438\u0442\u044C</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">\u041D\u0430\u0439\u0434\u0435\u043D\u043E</div>
          <div id="vac-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 > 70%</div>
          <div id="vac-high-match" style="font-size:16px;font-weight:700;color:#059669;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</div>
          <div id="vac-blacklisted" style="font-size:16px;font-weight:700;color:#DC2626;">0</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="vac-search" placeholder="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E..." aria-label="\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438" style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <select id="vac-status-filter" aria-label="\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0443" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
          <option value="all">\u0412\u0441\u0435</option>
          <option value="new">\u041D\u043E\u0432\u044B\u0435</option>
          <option value="applied">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u043E</option>
          <option value="blacklisted">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#52525b;white-space:nowrap;">\u041C\u0438\u043D. \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435:</span>
        <input type="range" id="vac-score-range" min="0" max="100" value="0" aria-label="\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u043E\u0446\u0435\u043D\u0442 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="flex:1;">
        <span id="vac-score-label" style="font-size:11px;font-weight:600;color:#52525b;min-width:32px;text-align:right;">0%</span>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-size:11px;color:#52525b;">\u0413\u0440\u0430\u0444\u0438\u043A:</span>
        <button class="btn btn-primary btn-sm vac-schedule-btn" data-schedule="all" style="padding:3px 8px;font-size:10px;border-radius:4px;">\u0412\u0441\u0435</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="remote" style="padding:3px 8px;font-size:10px;border-radius:4px;">\u0423\u0434\u0430\u043B\u0451\u043D\u043A\u0430</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="hybrid" style="padding:3px 8px;font-size:10px;border-radius:4px;">\u0413\u0438\u0431\u0440\u0438\u0434</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="office" style="padding:3px 8px;font-size:10px;border-radius:4px;">\u041E\u0444\u0438\u0441</button>
        <label style="display:flex;align-items:center;gap:4px;margin-left:auto;font-size:11px;color:#52525b;cursor:pointer;">
          <input type="checkbox" id="vac-hide-ads" style="margin:0;">
          \u0421\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u043A\u043B\u0430\u043C\u0443
        </label>
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
          <span id="mass-count" style="font-size:11px;color:#52525b;">0 / 20</span>
          <span id="mass-eta" style="font-size:11px;color:#52525b;">\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0432\u0441\u0435</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>\u041F\u0430\u0443\u0437\u0430</button>
      </div>
    </div>
    <div id="vac-match-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="vac-match-ring" style="width:48px;height:48px;border-radius:50%;background:conic-gradient(#e4e4e7 0deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#52525b;">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 \u0441 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0435\u0439</div>
          <div id="vac-match-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">\u041E\u0446\u0435\u043D\u0438\u0442\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <div style="flex:1;text-align:center;">
          <div id="vac-match-skills" style="font-size:16px;font-weight:700;color:#059669;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">\u041D\u0430\u0432\u044B\u043A\u0438</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-title" style="font-size:16px;font-weight:700;color:#2563EB;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">\u0414\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044C</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-salary" style="font-size:16px;font-weight:700;color:#D97706;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-exp" style="font-size:16px;font-weight:700;color:#7C3AED;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">\u041E\u043F\u044B\u0442</div>
        </div>
      </div>
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#f4f4f5;">
        <div id="vac-match-bar-skills" style="width:0%;background:linear-gradient(90deg,#059669,#34D399);border-radius:4px 0 0 4px;"></div>
        <div id="vac-match-bar-title" style="width:0%;background:linear-gradient(90deg,#2563EB,#60A5FA);"></div>
        <div id="vac-match-bar-salary" style="width:0%;background:linear-gradient(90deg,#D97706,#FBBF24);"></div>
        <div id="vac-match-bar-exp" style="width:0%;background:linear-gradient(90deg,#7C3AED,#A78BFA);border-radius:0 4px 4px 0;"></div>
      </div>
      <div id="vac-match-details" style="margin-top:10px;display:none;">
        <div id="vac-match-matching-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#059669;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#059669;">\u0421\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0449\u0438\u0435 \u043D\u0430\u0432\u044B\u043A\u0438</span>
          </div>
          <div id="vac-match-matching-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
        <div id="vac-match-derived-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#B45309;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#B45309;">\u0418\u0437 \u043E\u043F\u044B\u0442\u0430 \u0440\u0430\u0431\u043E\u0442\u044B</span>
          </div>
          <div id="vac-match-derived-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
        <div id="vac-match-missing-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#DC2626;">\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442</span>
          </div>
          <div id="vac-match-missing-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
      </div>
    </div>
    <div id="vac-cover-letter-card" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="vac-cover-letter" role="button" tabindex="0" aria-expanded="true" aria-controls="vac-cl-body">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:13px;font-weight:600;">\u0421\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u0438\u0441\u044C\u043C\u043E</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u0448\u0430\u0431\u043B\u043E\u043D</span>
            <span style="font-size:11px;color:#7c3aed;background:#f5f3ff;padding:1px 6px;border-radius:4px;">AI</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body open" id="vac-cl-body" style="margin-top:10px;">
        <div id="cl-ai-status" style="font-size:10px;color:#71717A;margin-bottom:6px;line-height:1.4;">\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442: \u0440\u0435\u0437\u044E\u043C\u0435 \u0438 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:8px;flex-wrap:wrap;">
          <label for="cover-letter-text" style="font-size:11px;font-weight:500;">\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E</label>
          <div style="display:flex;align-items:center;gap:4px;">
            <button id="cover-letter-ai-btn" type="button" aria-label="\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441 AI" style="font-size:11px;padding:3px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:500;">\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441 AI</button>
            <span style="font-size:11px;color:#52525b;">\u0422\u043E\u043D:</span>
            <select id="s-letter-tone" aria-label="\u0422\u043E\u043D \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0438\u0441\u044C\u043C\u0430" style="font-size:11px;padding:3px 6px;border:1px solid #e4e4e7;border-radius:6px;background:#fff;">
              <option value="formal">\u0424\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u044B\u0439</option>
              <option value="friendly">\u0414\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439</option>
              <option value="concise">\u041A\u0440\u0430\u0442\u043A\u0438\u0439</option>
              <option value="enthusiastic">\u042D\u043D\u0442\u0443\u0437\u0438\u0430\u0441\u0442</option>
            </select>
          </div>
        </div>
        <textarea id="cover-letter-text" style="width:100%;height:80px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041C\u0435\u043D\u044F \u0437\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043B\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F {position} \u0432 {company}. \u0418\u043C\u0435\u044E {experience} \u043E\u043F\u044B\u0442\u0430 \u0432 {skills}. {matching_sentence}\u0411\u0443\u0434\u0443 \u0440\u0430\u0434 \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u043D\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E.</textarea>
        <div id="cl-ai-toast" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;line-height:1.4;"></div>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
          <button id="cl-ai-log-copy-btn" type="button" aria-label="\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043B\u043E\u0433 AI-\u043A\u043D\u043E\u043F\u043A\u0438 \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430" style="font-size:10px;padding:2px 8px;background:#f4f4f5;color:#27272a;border:1px solid #e4e4e7;border-radius:6px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg> \u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043B\u043E\u0433 AI</button>
          <button id="cl-ai-log-clear-btn" type="button" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u0433 AI-\u043A\u043D\u043E\u043F\u043A\u0438" style="font-size:10px;padding:2px 8px;background:#f4f4f5;color:#27272a;border:1px solid #e4e4e7;border-radius:6px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u0433</button>
          <span id="cl-ai-log-status" style="font-size:10px;color:#71717a;">\u043B\u043E\u0433 \u043F\u0443\u0441\u0442</span>
        </div>
        <div style="font-size:10px;color:#71717A;margin-top:4px;line-height:1.4;">\u0410\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435: {position} -- \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044C, {company} -- \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F, {experience} -- \u0441\u0442\u0430\u0436, {skills} -- \u043D\u0430\u0432\u044B\u043A\u0438, {matching} -- \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F, {matching_sentence} -- \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F\u0445, {requirements} -- \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F. \u0428\u0430\u0431\u043B\u043E\u043D \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0432 storage \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.</div>
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
          <div id="res-gap-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">\u0420\u0435\u0437\u044E\u043C\u0435 vs \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438</div>
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
      <!-- Row 2: Synonym (v1.9.22.0 -- related skills) -->
      <div id="res-gap-synonym-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#D97706;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#D97706;">\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435</span>
          <span class="badge badge-amber" id="res-gap-synonym-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-synonym-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 3: Gap -->
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
        <span style="color:#D97706;flex-shrink:0;margin-top:1px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
        <span id="res-gap-recommendation-text" style="font-size:11px;color:#92400E;line-height:1.5;"></span>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</div></div>
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
    return `<div class="tab-section" id="tab-negotiations" role="tabpanel" aria-labelledby="tabbtn-negotiations" tabindex="0">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="neg-list" role="button" tabindex="0" aria-expanded="false" aria-controls="neg-list-body">
        <div>
          <div style="font-size:13px;font-weight:600;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B</div>
          <div style="font-size:11px;color:#52525b;margin-top:2px;">\u041E\u0442\u0441\u043B\u0435\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0441 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C\u0438</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="neg-count-badge" class="badge badge-blue">0 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="neg-list-body" style="margin-top:10px;">
        <div id="neg-error-toast" style="display:none;"></div>
        <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
          <div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</div>
        </div>
      </div>
    </div>
    <div id="neg-chat-area" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;flex-direction:column;max-height:340px;">
        <div id="neg-chat-header" style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;flex-shrink:0;"></div>
        <div id="neg-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:10px;" role="log" aria-live="polite" aria-label="\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439"></div>
        <div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <input type="text" id="neg-chat-input" placeholder="\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435..." aria-label="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435" style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
          <button class="btn btn-primary" style="padding:8px 12px;" aria-label="\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435">${ICONS.send}</button>
        </div>
        <div id="neg-ai-reply-area" style="display:none;"></div>
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter" role="button" tabindex="0" aria-expanded="false" aria-controls="cl-body">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">\u042D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u0430\u043D\u0442\u0438\u0431\u043E\u0442</span>
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">\u043F\u043E\u0441\u0438\u043C\u0432\u043E\u043B\u044C\u043D\u043E</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <label class="toggle" aria-label="\u042D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430"><input type="checkbox" id="neg-type-emulation" checked role="switch" aria-checked="true"><span class="slider"></span></label>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:500;">\u042D\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u043D\u0430\u0431\u043E\u0440\u0430</div>
            <div style="font-size:11px;color:#52525b;">\u041F\u043E\u0441\u0438\u043C\u0432\u043E\u043B\u044C\u043D\u044B\u0439 \u0432\u0432\u043E\u0434 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 (\u0430\u043D\u0442\u0438\u0431\u043E\u0442). \u0428\u0430\u0431\u043B\u043E\u043D \u043F\u0438\u0441\u044C\u043C\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438".</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <input type="number" id="neg-type-speed" value="80" aria-label="\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043D\u0430\u0431\u043E\u0440\u0430 \u0432 \u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0430\u0445" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
            <span style="font-size:11px;color:#52525b;">\u043C\u0441</span>
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
    return `<div class="tab-section" id="tab-settings" role="tabpanel" aria-labelledby="tabbtn-settings" tabindex="0">
    ${settingsAI()}
    ${settingsRateLimits()}
    ${settingsCaptcha()}
    ${settingsBlacklist()}
    ${settingsDailyReset()}
    ${settingsGeneral()}
  </div>`;
  }
  function settingsAI() {
    return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">AI-\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438</div>
    <div style="font-size:11px;color:#52525b;margin-bottom:10px;">\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0434\u043B\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438 \u043E\u0442\u0432\u0435\u0442\u043E\u0432 \u0432 \u0447\u0430\u0442\u0435. \u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0443\u0436\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B -- \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0438\u0437 \u043A\u043E\u0440\u043E\u0431\u043A\u0438.</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <label for="s-ai-base-url" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Base URL</label>
        <input type="text" id="s-ai-base-url" value="https://internal-api.z.ai/v1" placeholder="https://api.example.com/v1" aria-label="AI API base URL" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-api-key" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">API Key (\u043C\u0430\u0440\u043A\u0435\u0440)</label>
        <input type="text" id="s-ai-api-key" value="Z.ai" placeholder="Z.ai" aria-label="AI API key marker" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
        <div style="font-size:10px;color:#71717A;margin-top:3px;line-height:1.4;">\u041C\u0430\u0440\u043A\u0435\u0440 \u0434\u043B\u044F Authorization. \u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E "Z.ai" -- \u043D\u0435 \u043C\u0435\u043D\u044F\u0439 \u0431\u0435\u0437 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438.</div>
      </div>
      <div>
        <label for="s-ai-token" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">X-Token (JWT)</label>
        <textarea id="s-ai-token" rows="2" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." aria-label="ZAI JWT token" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;font-family:monospace;resize:vertical;"></textarea>
        <div style="font-size:10px;color:#71717A;margin-top:3px;line-height:1.4;">JWT-\u0442\u043E\u043A\u0435\u043D \u0438\u0437 z.ai web chat. \u0415\u0441\u043B\u0438 AI \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043B \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439 HTTP 401 -- \u0442\u043E\u043A\u0435\u043D \u0438\u0441\u0442\u0451\u043A, \u043E\u0431\u043D\u043E\u0432\u0438 \u0435\u0433\u043E: \u043E\u0442\u043A\u0440\u043E\u0439 <a href="https://chat.z.ai" target="_blank" rel="noopener">chat.z.ai</a> -> F12 -> Application -> Local Storage -> \u043D\u0430\u0439\u0434\u0438 "token" -> \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441\u044E\u0434\u0430.</div>
      </div>
      <div>
        <label for="s-ai-chat-id" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">X-Chat-Id</label>
        <input type="text" id="s-ai-chat-id" value="" placeholder="chat-xxxxxxxx-xxxx-..." aria-label="ZAI chat id" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-user-id" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">X-User-Id</label>
        <input type="text" id="s-ai-user-id" value="" placeholder="xxxxxxxx-xxxx-xxxx-..." aria-label="ZAI user id" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-model" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Model</label>
        <input type="text" id="s-ai-model" value="glm-4.5" placeholder="glm-4.5" aria-label="AI model name" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-timeout" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Timeout (\u043C\u0441)</label>
        <input type="number" id="s-ai-timeout" value="60000" min="5000" max="180000" step="1000" placeholder="60000" aria-label="AI request timeout in milliseconds" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
        <div style="font-size:10px;color:#71717A;margin-top:3px;line-height:1.4;">5 000--180 000 \u043C\u0441. \u0415\u0441\u043B\u0438 AI \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E -- \u0443\u0432\u0435\u043B\u0438\u0447\u044C \u0434\u043E 90 000--120 000.</div>
      </div>
      <div style="font-size:10px;color:#71717A;line-height:1.4;">\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 (debounce 500 \u043C\u0441). \u041F\u043E\u043B\u044F \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0432 chrome.storage.local \u043F\u043E\u0434 \u043A\u043B\u044E\u0447\u043E\u043C aiConfig.</div>
    </div>
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
        <div style="font-size:11px;color:#52525b;margin-top:2px;">\u0420\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B</div>
      </div>
      <span id="bl-count-badge" class="badge badge-zinc">0 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439</span>
    </div>
    <div id="bl-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="bl-input" placeholder="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438..." aria-label="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u0434\u043B\u044F \u0447\u0451\u0440\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430" style="flex:1;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
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
          <div style="font-size:11px;color:#52525b;">\u0412\u0440\u0435\u043C\u044F \u0441\u0431\u0440\u043E\u0441\u0430 (chrome.alarms)</div>
        </div>
        <input type="time" id="s-reset-time" value="00:00" aria-label="\u0412\u0440\u0435\u043C\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0433\u043E \u0441\u0431\u0440\u043E\u0441\u0430" style="padding:4px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u0431\u0440\u043E\u0441</div>
          <div style="font-size:11px;color:#52525b;">\u0427\u0435\u0440\u0435\u0437 chrome.alarms API</div>
        </div>
        <span id="s-reset-countdown" style="font-size:11px;font-weight:600;color:#52525b;">--</span>
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
    return `<div class="tab-section" id="tab-stats" role="tabpanel" aria-labelledby="tabbtn-stats" tabindex="0">
    <div style="display:flex;gap:6px;margin-bottom:12px;" role="radiogroup" aria-label="\u041F\u0435\u0440\u0438\u043E\u0434 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438">
      <button class="btn btn-sm btn-primary stats-period-btn active" data-period="today" role="radio" aria-checked="true">\u0421\u0435\u0433\u043E\u0434\u043D\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="week" role="radio" aria-checked="false">\u041D\u0435\u0434\u0435\u043B\u044F</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="month" role="radio" aria-checked="false">\u041C\u0435\u0441\u044F\u0446</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="all" role="radio" aria-checked="false">\u0412\u0441\u0451 \u0432\u0440\u0435\u043C\u044F</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u0412\u0441\u0435\u0433\u043E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432</div>
        <div id="stat-total" style="font-size:22px;font-weight:700;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439</div>
        <div id="stat-invitations" style="font-size:22px;font-weight:700;color:#2563EB;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">\u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u044F</div>
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
          <div style="font-size:11px;color:#52525b;">429 \u043E\u0448\u0438\u0431\u043E\u043A (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-429" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">CAPTCHA (\u0432\u0441\u0435\u0433\u043E)</div>
          <div id="stat-captcha" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">\u0410\u0434\u0430\u043F\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u0439</div>
          <div id="stat-slowdowns" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">\u0421\u0440. \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B</div>
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
        <div style="padding:12px;text-align:center;font-size:11px;color:#52525b;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>
      </div>
    </div>
  </div>`;
  }
  var init_stats = __esm({
    "src/ui/html/tabs/stats.js"() {
    }
  });

  // src/ui/html/shell.js
  function getSidebarHTML() {
    return `
    <div class="har-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace("currentColor", "#fff").replace('width="16" height="16"', 'width="16" height="16" aria-hidden="true"')}
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div style="font-size:12px;color:#52525b;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...
          </div>
        </div>
      </div>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#52525b;">
        ${ICONS.close}
      </button>
    </div>
    <div class="har-content">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
        <div class="har-spinner" role="status"><span class="sr-only">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...</span></div>
        <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...</h3>
        <p style="font-size:13px;color:#52525b;line-height:1.5;">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p>
      </div>
    </div>
    <div class="har-footer">
      <span style="font-size:12px;color:#52525b;">HH Copilot v${"1.9.77.0"}</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;" aria-hidden="true"></span>
        <span style="font-size:12px;color:#52525b;">\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E</span>
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
      <span style="font-size:12px;color:#52525b;">HH Copilot v${"1.9.77.0"}</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="width:6px;height:6px;background:#10B981;border-radius:50%;" aria-hidden="true"></span>
        <span style="font-size:12px;color:#52525b;">\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E</span>
      </div>
    </div>`;
  }
  function getHeaderHTML(userName) {
    const name = userName ? esc(userName) : "";
    const badgeLabel = name ? name : "\u041E\u043D\u043B\u0430\u0439\u043D";
    return `
    <div class="har-header" lang="ru">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#059669,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          ${ICONS.briefcase.replace("currentColor", "#fff").replace('width="16" height="16"', 'width="16" height="16" aria-hidden="true"')}
        </div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">HH Copilot</div>
          <div id="header-auth-status" style="font-size:12px;color:#52525b;display:flex;align-items:center;gap:4px;">
            <span class="pulse-dot" style="width:6px;height:6px;background:#10B981;border-radius:50%;display:inline-block;"></span>
            ${name ? name : "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D"}
          </div>
        </div>
      </div>
      <div id="authIndicator" class="badge badge-green" style="cursor:pointer;" title="\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438" role="button" tabindex="0" aria-label="\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E">
        <span style="width:5px;height:5px;background:#059669;border-radius:50%;display:inline-block;margin-right:4px;" aria-hidden="true"></span>
        ${badgeLabel}
      </div>
      <button class="hh-tour-help" data-action="start-tour" title="\u0413\u0438\u0434 \u043F\u043E \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044E" aria-label="\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0433\u0438\u0434 \u043F\u043E \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044E">?</button>
      <button id="hh-ar-inspector-toggle" class="har-close-btn" data-action="toggle-inspector" title="DOM Inspector: \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0430 hh.ru" aria-label="\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C DOM Inspector" aria-pressed="false"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#52525b;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
      </button>
      <button class="har-close-btn" data-action="close-panel" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C"
        style="width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#52525b;">
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
    return `<div class="har-tabbar" role="tablist" aria-label="\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0440\u0430\u0437\u0434\u0435\u043B\u044B">${tabs.map(
      (t, _i) => `<button class="tab-btn ${t.id === "overview" ? "active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${t.id === "overview"}" aria-controls="tab-${t.id}" id="tabbtn-${t.id}" tabindex="${t.id === "overview" ? 0 : -1}">${t.icon}<span>${t.label}</span></button>`
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

  // src/ui/fab-inspector-button.js
  function fabStyle(style, prop, value) {
    style.setProperty(prop, value, "important");
  }
  function createFabInspectorButton(onToggle) {
    if (refs.fabInspectorEl) return;
    if (typeof onToggle !== "function") return;
    const btn = document.createElement("div");
    btn.id = "hh-ar-fab-inspector";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C DOM-\u0438\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440");
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("title", "DOM-\u0438\u043D\u0441\u043F\u0435\u043A\u0442\u043E\u0440: \u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435");
    btn.setAttribute("tabindex", "0");
    const ib = btn.style;
    fabStyle(ib, "position", "fixed");
    fabStyle(ib, "bottom", "148px");
    fabStyle(ib, "right", "36px");
    fabStyle(ib, "width", "32px");
    fabStyle(ib, "height", "32px");
    fabStyle(ib, "border-radius", "50%");
    fabStyle(ib, "cursor", "pointer");
    fabStyle(ib, "z-index", "999998");
    fabStyle(ib, "display", "flex");
    fabStyle(ib, "align-items", "center");
    fabStyle(ib, "justify-content", "center");
    fabStyle(ib, "background", "#7c3aed");
    fabStyle(ib, "box-shadow", "0 2px 10px rgba(124,58,237,0.45)");
    fabStyle(ib, "transition", "transform 0.2s, opacity 0.3s, background 0.2s, box-shadow 0.2s");
    fabStyle(ib, "opacity", "0");
    fabStyle(ib, "pointer-events", "none");
    ib.border = "2px solid #fff";
    btn.innerHTML = INSPECTOR_ICON;
    btn.addEventListener("mouseenter", () => {
      ib.setProperty("transform", "scale(1.12)", "important");
    });
    btn.addEventListener("mouseleave", () => {
      ib.setProperty("transform", "scale(1)", "important");
    });
    btn.addEventListener("click", (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      onToggle(btn);
    });
    btn.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        e2.stopPropagation();
        onToggle(btn);
      }
    });
    btn.addEventListener("focus", () => {
      if (btn.matches(":focus-visible")) {
        ib.setProperty("outline", "3px solid #7c3aed", "important");
        ib.setProperty("outline-offset", "2px", "important");
      }
    });
    btn.addEventListener("blur", () => {
      ib.removeProperty("outline");
      ib.removeProperty("outline-offset");
    });
    document.body.appendChild(btn);
    refs.fabInspectorEl = btn;
  }
  function setFabInspectorActive(active) {
    if (!refs.fabInspectorEl) return;
    const ib = refs.fabInspectorEl.style;
    refs.fabInspectorEl.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) {
      fabStyle(ib, "background", "#9333ea");
      fabStyle(ib, "box-shadow", "0 0 0 4px rgba(147,51,234,0.35), 0 2px 12px rgba(124,58,237,0.6)");
    } else {
      fabStyle(ib, "background", "#7c3aed");
      fabStyle(ib, "box-shadow", "0 2px 10px rgba(124,58,237,0.45)");
    }
  }
  function hideFabInspector() {
    if (!refs.fabInspectorEl) return;
    const ib = refs.fabInspectorEl.style;
    fabStyle(ib, "opacity", "0");
    fabStyle(ib, "pointer-events", "none");
    fabStyle(ib, "transform", "scale(0.6)");
  }
  function showFabInspector() {
    if (!refs.fabInspectorEl) return;
    const ib = refs.fabInspectorEl.style;
    fabStyle(ib, "opacity", "1");
    fabStyle(ib, "pointer-events", "auto");
    fabStyle(ib, "transform", "scale(1)");
  }
  var INSPECTOR_ICON;
  var init_fab_inspector_button = __esm({
    "src/ui/fab-inspector-button.js"() {
      init_state();
      INSPECTOR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  });

  // src/ui/fab.js
  function fabStyle2(style, prop, value) {
    style.setProperty(prop, value, "important");
  }
  function createFab(onClick2, onInspectorToggle) {
    if (refs.fabEl) return;
    refs.fabEl = document.createElement("div");
    refs.fabEl.id = "hh-ar-fab";
    refs.fabEl.setAttribute("role", "button");
    refs.fabEl.setAttribute("aria-label", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C HH Copilot");
    refs.fabEl.setAttribute("tabindex", "0");
    const s = refs.fabEl.style;
    fabStyle2(s, "position", "fixed");
    fabStyle2(s, "bottom", "80px");
    fabStyle2(s, "right", "24px");
    fabStyle2(s, "width", "56px");
    fabStyle2(s, "height", "56px");
    fabStyle2(s, "border-radius", "50%");
    fabStyle2(s, "cursor", "pointer");
    fabStyle2(s, "z-index", "999999");
    fabStyle2(s, "display", "flex");
    fabStyle2(s, "align-items", "center");
    fabStyle2(s, "justify-content", "center");
    fabStyle2(s, "background", "linear-gradient(135deg,#059669,#10B981)");
    fabStyle2(s, "box-shadow", "0 4px 20px rgba(5,150,105,0.4)");
    fabStyle2(s, "transition", "right 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.2s,opacity 0.3s");
    fabStyle2(s, "animation", "fabPulse 2.5s ease-in-out infinite");
    s.border = "none";
    refs.fabEl.innerHTML = FAB_ICONS.briefcase;
    refs.fabEl.addEventListener("mouseenter", () => {
      s.setProperty("transform", "scale(1.1)", "important");
    });
    refs.fabEl.addEventListener("mouseleave", () => {
      s.setProperty("transform", "scale(1)", "important");
    });
    refs.fabEl.addEventListener("click", onClick2);
    refs.fabEl.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        onClick2();
      }
    });
    refs.fabEl.addEventListener("focus", () => {
      if (refs.fabEl.matches(":focus-visible")) {
        s.setProperty("outline", "3px solid #059669", "important");
        s.setProperty("outline-offset", "3px", "important");
      }
    });
    refs.fabEl.addEventListener("blur", () => {
      s.removeProperty("outline");
      s.removeProperty("outline-offset");
    });
    document.body.appendChild(refs.fabEl);
    if (typeof onInspectorToggle === "function") {
      createFabInspectorButton(onInspectorToggle);
    }
  }
  function updateFabIcon() {
    if (!refs.fabEl) return;
    const s = refs.fabEl.style;
    if (panelState.isLoggedIn === null) {
      fabStyle2(s, "background", "#94a3b8");
      fabStyle2(s, "box-shadow", "0 4px 20px rgba(148,163,184,0.3)");
      fabStyle2(s, "animation", "none");
      fabStyle2(s, "opacity", "1");
      fabStyle2(s, "transform", "scale(1)");
      fabStyle2(s, "pointer-events", "auto");
      refs.fabEl.innerHTML = FAB_ICONS.loading;
      refs.fabEl.setAttribute("title", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E...");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044E");
      hideFabInspector();
    } else if (!panelState.isLoggedIn) {
      fabStyle2(s, "background", "#ef4444");
      fabStyle2(s, "box-shadow", "0 4px 20px rgba(239,68,68,0.4)");
      fabStyle2(s, "animation", "none");
      fabStyle2(s, "opacity", "1");
      fabStyle2(s, "transform", "scale(1)");
      fabStyle2(s, "pointer-events", "auto");
      refs.fabEl.innerHTML = FAB_ICONS.locked;
      refs.fabEl.setAttribute("title", "HH Copilot: \u041D\u0415 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D \u043D\u0430 hh.ru");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D");
      hideFabInspector();
    } else if (panelState.isOpen) {
      fabStyle2(s, "background", "#059669");
      fabStyle2(s, "opacity", "0");
      fabStyle2(s, "transform", "scale(0) rotate(180deg)");
      fabStyle2(s, "pointer-events", "none");
      refs.fabEl.setAttribute("title", "HH Copilot: \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
      hideFabInspector();
    } else {
      fabStyle2(s, "background", "linear-gradient(135deg,#059669,#10B981)");
      fabStyle2(s, "box-shadow", "0 4px 20px rgba(5,150,105,0.4)");
      fabStyle2(s, "opacity", "1");
      fabStyle2(s, "transform", "scale(1)");
      fabStyle2(s, "pointer-events", "auto");
      fabStyle2(s, "animation", "fabPulse 2.5s ease-in-out infinite");
      refs.fabEl.innerHTML = FAB_ICONS.briefcase;
      refs.fabEl.setAttribute("title", "HH Copilot: \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F.");
      refs.fabEl.setAttribute("aria-label", "HH Copilot: \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C");
      showFabInspector();
    }
  }
  var FAB_ICONS, setFabInspectorActive2;
  var init_fab = __esm({
    "src/ui/fab.js"() {
      init_state();
      init_fab_inspector_button();
      FAB_ICONS = {
        loading: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:har-spin 1s linear infinite"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>',
        locked: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
        close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
      };
      setFabInspectorActive2 = setFabInspectorActive;
    }
  });

  // src/ui/dom-inspector-report.js
  function buildCssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 8) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += "#" + node.id;
        parts.unshift(part);
        break;
      }
      const cls = Array.from(node.classList || []).filter((c) => c && c.length < 60).slice(0, 3);
      if (cls.length > 0) part += "." + cls.join(".");
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(node) + 1;
          part += ":nth-of-type(" + idx + ")";
        }
      }
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }
  function buildElementReport(el) {
    if (!el || el.nodeType !== 1) return "";
    const cs = typeof getComputedStyle === "function" ? getComputedStyle(el) : {};
    const rect = el.getBoundingClientRect();
    const lines = [];
    lines.push("=== HH-Copilot DOM Inspector Report ===");
    lines.push("Time: " + (/* @__PURE__ */ new Date()).toISOString());
    lines.push("URL: " + (typeof location !== "undefined" ? location.href : "?"));
    lines.push("");
    lines.push("Tag: " + el.tagName.toLowerCase());
    lines.push("ID: " + (el.id || "(none)"));
    const classes = Array.from(el.classList || []);
    lines.push("Classes: " + (classes.length ? classes.join(" ") : "(none)"));
    lines.push("");
    lines.push("CSS Path: " + buildCssPath(el));
    lines.push("");
    lines.push("Text (truncated 400 chars):");
    const txt = (el.innerText || el.textContent || "").trim();
    lines.push(txt.length > 400 ? txt.slice(0, 400) + "...(+" + (txt.length - 400) + " more)" : txt);
    lines.push("");
    lines.push("Geometry:");
    lines.push("  rect: " + Math.round(rect.left) + "," + Math.round(rect.top) + " " + Math.round(rect.width) + "x" + Math.round(rect.height));
    lines.push("  offsetWidth: " + el.offsetWidth + "px");
    lines.push("  offsetHeight: " + el.offsetHeight + "px");
    lines.push("");
    lines.push("Computed style (key):");
    lines.push("  display: " + (cs.display || "?"));
    lines.push("  visibility: " + (cs.visibility || "?"));
    lines.push("  font: " + (cs.fontFamily || "?").slice(0, 80) + " / " + (cs.fontSize || "?") + " / " + (cs.lineHeight || "?"));
    lines.push("  color: " + (cs.color || "?"));
    lines.push("  background: " + (cs.backgroundColor || "?"));
    lines.push("  padding: " + (cs.padding || "?"));
    lines.push("  margin: " + (cs.margin || "?"));
    lines.push("  border: " + (cs.border || "?"));
    lines.push("");
    lines.push("Outer HTML (truncated 600 chars):");
    try {
      const html = el.outerHTML || "";
      lines.push(html.length > 600 ? html.slice(0, 600) + "...(+" + (html.length - 600) + " more)" : html);
    } catch (e2) {
      lines.push("(could not serialize: " + (e2.message || e2) + ")");
    }
    lines.push("");
    lines.push("=== end report ===");
    return lines.join("\n");
  }
  var init_dom_inspector_report = __esm({
    "src/ui/dom-inspector-report.js"() {
    }
  });

  // src/ui/dom-inspector-panel.js
  function imp(el, prop, value) {
    el.style.setProperty(prop, value, "important");
  }
  function getOverlay(state) {
    if (state.overlayEl) return state.overlayEl;
    const ov = document.createElement("div");
    ov.id = "hh-ar-inspector-overlay";
    imp(ov, "position", "fixed");
    imp(ov, "pointer-events", "none");
    imp(ov, "z-index", String(INSPECTOR_Z));
    imp(ov, "border", "2px solid #7c3aed");
    imp(ov, "background", "rgba(124,58,237,0.12)");
    imp(ov, "border-radius", "4px");
    imp(ov, "transition", "all 0.05s linear");
    imp(ov, "display", "none");
    imp(ov, "top", "0");
    imp(ov, "left", "0");
    imp(ov, "width", "0");
    imp(ov, "height", "0");
    document.body.appendChild(ov);
    state.overlayEl = ov;
    return ov;
  }
  function positionOverlay(state, el) {
    const ov = getOverlay(state);
    const r = el.getBoundingClientRect();
    ov.style.setProperty("display", "block", "important");
    ov.style.setProperty("top", r.top - 2 + "px", "important");
    ov.style.setProperty("left", r.left - 2 + "px", "important");
    ov.style.setProperty("width", r.width + 4 + "px", "important");
    ov.style.setProperty("height", r.height + 4 + "px", "important");
  }
  function hideOverlay(state) {
    if (state.overlayEl) {
      state.overlayEl.style.setProperty("display", "none", "important");
    }
  }
  function createPanelShell(state) {
    const panel = document.createElement("div");
    panel.id = "hh-ar-inspector-panel";
    imp(panel, "position", "fixed");
    imp(panel, "top", "12px");
    imp(panel, "right", "12px");
    imp(panel, "width", "380px");
    imp(panel, "max-height", "90vh");
    imp(panel, "overflow-y", "auto");
    imp(panel, "background", "#1f2937");
    imp(panel, "color", "#f3f4f6");
    imp(panel, "font-family", "ui-monospace, Menlo, Consolas, monospace");
    imp(panel, "font-size", "11px");
    imp(panel, "line-height", "1.45");
    imp(panel, "border-radius", "8px");
    imp(panel, "box-shadow", "0 8px 32px rgba(0,0,0,0.4)");
    imp(panel, "padding", "10px 12px");
    imp(panel, "z-index", String(INSPECTOR_Z + 1));
    imp(panel, "border", "1px solid #374151");
    document.body.appendChild(panel);
    state.panelEl = panel;
    return panel;
  }
  function mkBtn(iconSvg, label, color, onClick2) {
    const b = document.createElement("button");
    b.innerHTML = iconSvg + " " + label;
    imp(b, "font-size", "10px");
    imp(b, "padding", "3px 8px");
    imp(b, "background", color);
    imp(b, "color", "#fff");
    imp(b, "border", "0");
    imp(b, "border-radius", "4px");
    imp(b, "cursor", "pointer");
    imp(b, "font-family", "inherit");
    imp(b, "display", "inline-flex");
    imp(b, "align-items", "center");
    imp(b, "gap", "4px");
    b.addEventListener("click", onClick2);
    return b;
  }
  function renderPanel(state, el, onStop) {
    const panel = state.panelEl || createPanelShell(state);
    const report = buildElementReport(el);
    const cssPath = buildCssPath(el);
    panel.innerHTML = "";
    const header = document.createElement("div");
    imp(header, "display", "flex");
    imp(header, "justify-content", "space-between");
    imp(header, "align-items", "center");
    imp(header, "margin-bottom", "8px");
    imp(header, "padding-bottom", "6px");
    imp(header, "border-bottom", "1px solid #374151");
    header.innerHTML = '<span style="font-weight:600;color:#a78bfa;display:inline-flex;align-items:center;gap:4px;">' + INSPECTOR_ICONS.search + ' Inspector</span><span style="font-size:10px;color:#9ca3af;">Esc -- close</span>';
    panel.appendChild(header);
    const btns = document.createElement("div");
    imp(btns, "display", "flex");
    imp(btns, "gap", "6px");
    imp(btns, "margin-bottom", "8px");
    imp(btns, "flex-wrap", "wrap");
    btns.appendChild(mkBtn(INSPECTOR_ICONS.clipboard, "Copy report", "#059669", () => {
      copyToClipboard(report);
      flashToast("Report copied to clipboard");
    }));
    btns.appendChild(mkBtn(INSPECTOR_ICONS.mapPin, "Copy CSS path", "#2563eb", () => {
      copyToClipboard(cssPath);
      flashToast("CSS path copied");
    }));
    btns.appendChild(mkBtn(INSPECTOR_ICONS.refresh, "Re-pick", "#7c3aed", () => {
      state.frozen = false;
      state.currentEl = null;
      hideOverlay(state);
      renderPanelPlaceholder(state);
    }));
    btns.appendChild(mkBtn(INSPECTOR_ICONS.close, "Close", "#dc2626", () => {
      onStop();
    }));
    panel.appendChild(btns);
    const pre = document.createElement("pre");
    imp(pre, "white-space", "pre-wrap");
    imp(pre, "word-break", "break-all");
    imp(pre, "margin", "0");
    imp(pre, "font-family", "inherit");
    imp(pre, "font-size", "10px");
    imp(pre, "color", "#d1d5db");
    pre.textContent = report;
    panel.appendChild(pre);
  }
  function renderPanelPlaceholder(state) {
    const panel = state.panelEl || createPanelShell(state);
    panel.innerHTML = '<div style="color:#9ca3af;font-size:11px;display:flex;align-items:center;gap:6px;">' + INSPECTOR_ICONS.search + "<span>Hover any element and click.<br>Esc -- close.</span></div>";
  }
  function flashToast(msg) {
    let t = document.getElementById("hh-ar-inspector-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hh-ar-inspector-toast";
      imp(t, "position", "fixed");
      imp(t, "bottom", "24px");
      imp(t, "left", "50%");
      imp(t, "transform", "translateX(-50%)");
      imp(t, "background", "#1f2937");
      imp(t, "color", "#10b981");
      imp(t, "font-family", "ui-sans-serif, system-ui");
      imp(t, "font-size", "12px");
      imp(t, "padding", "6px 12px");
      imp(t, "border-radius", "6px");
      imp(t, "z-index", String(INSPECTOR_Z + 2));
      imp(t, "box-shadow", "0 4px 12px rgba(0,0,0,0.3)");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.setProperty("display", "block", "important");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.setProperty("display", "none", "important");
    }, 2e3);
  }
  function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
        }, () => fallbackCopy(text));
        return;
      }
    } catch (_e) {
    }
    fallbackCopy(text);
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
    } catch (_e) {
    }
  }
  var INSPECTOR_Z, INSPECTOR_ICONS;
  var init_dom_inspector_panel = __esm({
    "src/ui/dom-inspector-panel.js"() {
      init_dom_inspector_report();
      INSPECTOR_Z = 2147483e3;
      INSPECTOR_ICONS = {
        search: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>',
        clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>',
        mapPin: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
        refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
        close: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
      };
    }
  });

  // src/ui/dom-inspector.js
  function shouldIgnore(el) {
    if (!el) return true;
    const id = el.id || "";
    if (id === "hh-ar-inspector-overlay") return true;
    if (id === "hh-ar-inspector-panel") return true;
    if (id === "hh-ar-inspector-toast") return true;
    if (id === "hh-ar-inspector-fab") return true;
    if (id === "hh-ar-fab") return true;
    let p = el;
    while (p) {
      if (p.id === "hh-ar-inspector-panel") return true;
      if (p.id === "hh-ar-inspector-fab") return true;
      if (p.id === "hh-ar-fab") return true;
      p = p.parentElement;
    }
    return false;
  }
  function onMouseMove(e2) {
    if (inspectorState.frozen) return;
    const el = e2.target;
    if (shouldIgnore(el)) return;
    inspectorState.currentEl = el;
    positionOverlay(inspectorState, el);
  }
  function onClick(e2) {
    const el = e2.target;
    if (shouldIgnore(el)) return;
    e2.preventDefault();
    e2.stopPropagation();
    inspectorState.frozen = true;
    inspectorState.currentEl = el;
    positionOverlay(inspectorState, el);
    renderPanel(inspectorState, el, stopInspector);
    console.log("[DOM-Inspector] element picked:", buildCssPath(el));
  }
  function onKey(e2) {
    if (e2.key === "Escape") {
      if (inspectorState.frozen) {
        inspectorState.frozen = false;
        if (inspectorState.panelEl) {
          renderPanelPlaceholder(inspectorState);
        }
      } else {
        stopInspector();
      }
    }
  }
  function startInspector() {
    if (inspectorState.active) return;
    inspectorState.active = true;
    inspectorState.frozen = false;
    getOverlay(inspectorState);
    renderPanelPlaceholder(inspectorState);
    inspectorState.moveHandler = onMouseMove;
    inspectorState.clickHandler = onClick;
    inspectorState.keyHandler = onKey;
    document.addEventListener("mousemove", inspectorState.moveHandler, true);
    document.addEventListener("click", inspectorState.clickHandler, true);
    document.addEventListener("keydown", inspectorState.keyHandler, true);
    console.log("[DOM-Inspector] ON -- hover any element, click to freeze, Esc to exit");
    flashToast("Inspector ON -- click any element on the page");
  }
  function stopInspector() {
    if (!inspectorState.active) return;
    inspectorState.active = false;
    inspectorState.frozen = false;
    inspectorState.currentEl = null;
    if (inspectorState.moveHandler) {
      document.removeEventListener("mousemove", inspectorState.moveHandler, true);
    }
    if (inspectorState.clickHandler) {
      document.removeEventListener("click", inspectorState.clickHandler, true);
    }
    if (inspectorState.keyHandler) {
      document.removeEventListener("keydown", inspectorState.keyHandler, true);
    }
    inspectorState.moveHandler = null;
    inspectorState.clickHandler = null;
    inspectorState.keyHandler = null;
    hideOverlay(inspectorState);
    if (inspectorState.panelEl) {
      inspectorState.panelEl.remove();
      inspectorState.panelEl = null;
    }
    if (inspectorState.toggleBtn) {
      inspectorState.toggleBtn.setAttribute("aria-pressed", "false");
      inspectorState.toggleBtn.style.background = "transparent";
      inspectorState.toggleBtn.style.color = "#52525b";
    }
    console.log("[DOM-Inspector] OFF");
    flashToast("Inspector OFF");
  }
  function isInspectorActive() {
    return inspectorState.active;
  }
  function toggleInspector(btn) {
    if (btn) inspectorState.toggleBtn = btn;
    if (inspectorState.active) {
      stopInspector();
      return false;
    }
    startInspector();
    if (btn) {
      btn.setAttribute("aria-pressed", "true");
      btn.style.background = "#7c3aed";
      btn.style.color = "#fff";
    }
    return true;
  }
  var inspectorState, _internal2;
  var init_dom_inspector = __esm({
    "src/ui/dom-inspector.js"() {
      init_dom_inspector_panel();
      init_dom_inspector_report();
      inspectorState = {
        active: false,
        // hover-highlight mode ON
        frozen: false,
        // user clicked an element, highlight is locked
        overlayEl: null,
        // purple outline box
        panelEl: null,
        // info panel
        currentEl: null,
        // element currently hovered/clicked
        moveHandler: null,
        clickHandler: null,
        keyHandler: null,
        /** External toggle button (header) -- updated on start/stop for visual state. */
        toggleBtn: null
      };
      _internal2 = {
        inspectorState,
        shouldIgnore,
        buildCssPath
      };
    }
  });

  // src/lib/vacancy-skills-collector.js
  function normalizeSkillName2(name) {
    return (name || "").toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
  }
  function addNormalized(arr, target) {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      const name = typeof item === "string" ? item : item?.name || "";
      const norm = normalizeSkillName2(name);
      if (norm && norm.length > 1) target.add(norm);
    }
  }
  function collectDetailVacancySkills() {
    const detail = window.__hhVacDetail;
    if (!detail) return /* @__PURE__ */ new Set();
    const hasKeySkills = Array.isArray(detail.keySkills) && detail.keySkills.length > 0;
    if (hasKeySkills) {
      const skills = /* @__PURE__ */ new Set();
      addNormalized(detail.keySkills, skills);
      return skills;
    }
    const hasDerived = Array.isArray(detail.derivedSkills) && detail.derivedSkills.length > 0;
    if (hasDerived) {
      const skills = /* @__PURE__ */ new Set();
      addNormalized(detail.derivedSkills, skills);
      return skills;
    }
    return /* @__PURE__ */ new Set();
  }
  function collectAllVacancySkills(vacancies) {
    const skills = /* @__PURE__ */ new Set();
    const detail = window.__hhVacDetail;
    if (detail) {
      const hasKeySkills = Array.isArray(detail.keySkills) && detail.keySkills.length > 0;
      if (hasKeySkills) {
        addNormalized(detail.keySkills, skills);
      } else if (Array.isArray(detail.derivedSkills) && detail.derivedSkills.length > 0) {
        addNormalized(detail.derivedSkills, skills);
      }
    }
    if (Array.isArray(vacancies)) {
      for (const v of vacancies) {
        if (Array.isArray(v.keySkills) && v.keySkills.length > 0) {
          addNormalized(v.keySkills, skills);
        }
      }
    }
    return skills;
  }
  var init_vacancy_skills_collector = __esm({
    "src/lib/vacancy-skills-collector.js"() {
    }
  });

  // src/ui/tabs/resumes/resume-helpers-gap.js
  function updateSkillGapSection(r) {
    const section = refs.shadowRoot?.getElementById("res-gap-section");
    if (!section) return;
    if (!r || (!r.skills || r.skills.length === 0) && (!r.derivedSkills || r.derivedSkills.length === 0)) {
      showGapEmpty(section, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0441 \u043D\u0430\u0432\u044B\u043A\u0430\u043C\u0438 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430");
      return;
    }
    const resumeSkills = normalizeSkills(r.skills);
    const derivedSkills = normalizeSkills(r.derivedSkills || []);
    const allResumeSkills = /* @__PURE__ */ new Set([...resumeSkills, ...derivedSkills]);
    const vacancySkills = collectDetailVacancySkills();
    if (vacancySkills.size === 0) {
      showGapEmpty(section, "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0430 hh.ru \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043D\u0430\u0432\u044B\u043A\u043E\u0432");
      return;
    }
    const match = [];
    const synonym = [];
    const miss = [];
    const extra = [];
    for (const skill of allResumeSkills) {
      if (vacancySkills.has(skill)) match.push(skill);
    }
    for (const skill of vacancySkills) {
      if (allResumeSkills.has(skill)) {
      } else {
        const synMatch = findSynonymMatch(skill, allResumeSkills);
        if (synMatch) {
          synonym.push({ vacancy: skill, resume: synMatch });
        } else {
          miss.push(skill);
        }
      }
    }
    for (const skill of allResumeSkills) {
      if (!vacancySkills.has(skill)) extra.push(skill);
    }
    const effectiveMatch = match.length + synonym.length * SYNONYM_WEIGHT;
    const total = vacancySkills.size;
    const matchPct = total > 0 ? Math.round(effectiveMatch / total * 100) : 0;
    section.style.display = "";
    const hint = section.querySelector(".gap-empty-hint");
    if (hint) hint.style.display = "none";
    const inner = section.querySelector(".gap-inner");
    if (inner) inner.style.display = "";
    const ring = refs.shadowRoot?.getElementById("res-gap-ring");
    if (ring) {
      const deg = Math.round(matchPct * 3.6);
      ring.style.background = "conic-gradient(#059669 0deg " + deg + "deg, #e4e4e7 " + deg + "deg 360deg)";
      const inner2 = ring.querySelector("div");
      if (inner2) inner2.textContent = matchPct + "%";
    }
    const subtitle = refs.shadowRoot?.getElementById("res-gap-subtitle");
    if (subtitle) {
      const resumeTitle = r.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F";
      if (matchPct >= 80) {
        subtitle.textContent = resumeTitle + " -- \u0442\u043E\u043F " + Math.round(100 - matchPct) + "% \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432";
      } else if (matchPct >= 50) {
        subtitle.textContent = resumeTitle + " -- \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 " + matchPct + "%";
      } else {
        subtitle.textContent = resumeTitle + " -- \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043D\u0430\u0432\u044B\u043A\u0438";
      }
    }
    const barMatch = refs.shadowRoot?.getElementById("res-gap-bar-match");
    const barMiss = refs.shadowRoot?.getElementById("res-gap-bar-miss");
    const barExtra = refs.shadowRoot?.getElementById("res-gap-bar-extra");
    if (barMatch && barMiss && barExtra) {
      barMatch.style.width = (total > 0 ? (effectiveMatch / total * 100).toFixed(1) : 0) + "%";
      barMiss.style.width = (total > 0 ? (miss.length / total * 100).toFixed(1) : 0) + "%";
      barExtra.style.width = (total > 0 ? (extra.length / total * 100).toFixed(1) : 0) + "%";
    }
    updateGapRow("res-gap-match-row", "res-gap-match-count", "res-gap-match-list", match, "skill-match");
    updateSynonymGapRow("res-gap-synonym-row", "res-gap-synonym-count", "res-gap-synonym-list", synonym);
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
        html += '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + "</span>";
      }
      listEl.innerHTML = html;
    }
  }
  function updateSynonymGapRow(rowId, countId, listId, synonyms) {
    const row = refs.shadowRoot?.getElementById(rowId);
    const countEl = refs.shadowRoot?.getElementById(countId);
    const listEl = refs.shadowRoot?.getElementById(listId);
    if (!row) return;
    if (synonyms.length === 0) {
      row.style.display = "none";
      return;
    }
    row.style.display = "";
    if (countEl) countEl.textContent = synonyms.length;
    if (listEl) {
      const visible = synonyms.slice(0, 5);
      const remainder = synonyms.length - visible.length;
      let html = visible.map(
        (s) => '<span class="skill-tag skill-synonym" title="\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0439 \u043D\u0430\u0432\u044B\u043A: "' + esc(s.resume) + '" ~ "' + esc(s.vacancy) + '"">' + esc(s.vacancy) + " ~ " + esc(s.resume) + "</span>"
      ).join("");
      if (remainder > 0) {
        html += '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + "</span>";
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
      if (name) {
        set.add(
          name.toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ")
        );
      }
    }
    return set;
  }
  function showGapEmpty(section, message) {
    section.style.display = "";
    const inner = section.querySelector(".gap-inner");
    if (inner) inner.style.display = "none";
    let hint = section.querySelector(".gap-empty-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "gap-empty-hint";
      hint.style.cssText = "padding:16px;text-align:center;font-size:12px;color:#71717A;background:#F9FAFB;border-radius:8px;border:1px dashed #D4D4D8;";
      const header = section.querySelector(".gap-header") || section.firstElementChild;
      if (header && header.nextElementSibling) {
        header.after(hint);
      } else {
        section.prepend(hint);
      }
    }
    hint.innerHTML = '<div style="font-size:20px;margin-bottom:6px;">&#128270;</div>' + esc(message);
    hint.style.display = "";
  }
  var init_resume_helpers_gap = __esm({
    "src/ui/tabs/resumes/resume-helpers-gap.js"() {
      init_state();
      init_html2();
      init_vacancy_skills_collector();
      init_skill_synonyms();
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
    return '<div class="tl-dot" style="background:' + dotColor + ';"></div><div class="sub-toggle" tabindex="0" role="button" data-sub-toggle="' + bodyId + '" data-sub-chev="' + chevronId + '"><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:600;color:' + dotColor + ';">' + esc(title) + '</span><span style="font-size:11px;color:#52525b;">' + esc(count) + '</span></div><svg class="sub-chevron" id="' + chevronId + '" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div><div class="sub-body" id="' + bodyId + '">' + contentHtml + "</div>";
  }
  function buildGrid(pairs) {
    const rows = pairs.filter(([, val]) => val).map(
      ([label, val]) => '<span style="color:#52525b;">' + esc(label) + '</span><span style="font-weight:500;">' + esc(val) + "</span>"
    ).join("");
    if (!rows) return '<div style="padding:8px;font-size:11px;color:#52525b;">\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B</div>';
    return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + rows + "</div></div>";
  }
  function attachSubToggle(bodyId, chevronId) {
    const toggleEl = refs.shadowRoot?.querySelector('[data-sub-toggle="' + bodyId + '"]');
    if (!toggleEl) return;
    toggleEl.addEventListener("click", () => {
      toggleSub(bodyId, chevronId);
    });
    toggleEl.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        toggleSub(bodyId, chevronId);
      }
    });
  }
  function updateSkillsSection(r) {
    const section = refs.shadowRoot?.getElementById("res-skills-section");
    const list = refs.shadowRoot?.getElementById("res-skills-list");
    const count = refs.shadowRoot?.getElementById("res-skills-count");
    if (!section || !list) return;
    const explicit = r && r.skills ? r.skills : [];
    const derived = r && r.derivedSkills ? r.derivedSkills : [];
    if (explicit.length === 0 && derived.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const totalCount = explicit.length + derived.length;
    if (count) count.textContent = totalCount + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432";
    let html = explicit.map(
      (s) => '<span class="skill-tag skill-match">' + esc(s) + "</span>"
    ).join("");
    if (derived.length > 0) {
      html += '<div style="font-size:10px;color:#B45309;margin:6px 0 2px 0;font-weight:500;">\u0418\u0437 \u043E\u043F\u044B\u0442\u0430 \u0440\u0430\u0431\u043E\u0442\u044B:</div>';
      html += derived.map(
        (s) => '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;">' + esc(s) + "</span>"
      ).join("");
    }
    list.innerHTML = html;
  }
  var init_resume_helpers = __esm({
    "src/ui/tabs/resumes/resume-helpers.js"() {
      init_state();
      init_html2();
      init_resume_helpers_gap();
    }
  });

  // src/ui/tabs/vacancies-match.js
  function renderVacancyMatchScore(vacancyId, score, breakdown, details) {
    const section = refs.shadowRoot?.getElementById("vac-match-section");
    if (!section) return;
    if (!score && score !== 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const ring = refs.shadowRoot?.getElementById("vac-match-ring");
    if (ring) {
      const deg = Math.round(score * 3.6);
      const color = score >= 70 ? "#059669" : score >= 40 ? "#D97706" : "#DC2626";
      ring.style.background = "conic-gradient(" + color + " 0deg " + deg + "deg, #e4e4e7 " + deg + "deg 360deg)";
      const inner = ring.querySelector("div");
      if (inner) {
        inner.textContent = score + "%";
        inner.style.color = color;
      }
    }
    const subtitle = refs.shadowRoot?.getElementById("vac-match-subtitle");
    if (subtitle) {
      if (score >= 70) {
        subtitle.textContent = "\u041E\u0442\u043B\u0438\u0447\u043D\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 -- \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F";
      } else if (score >= 40) {
        subtitle.textContent = "\u0427\u0430\u0441\u0442\u0438\u0447\u043D\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 -- \u0441\u0442\u043E\u0438\u0442 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C";
      } else {
        subtitle.textContent = "\u041D\u0438\u0437\u043A\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 -- \u043D\u0430\u0432\u044B\u043A\u0438 \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442";
      }
    }
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const b = breakdown || { skills: 0, title: 0, salary: 0, experience: 0 };
    const set = (id, val) => {
      const e2 = el(id);
      if (e2) e2.textContent = val;
    };
    set("vac-match-skills", b.skills + "/40");
    set("vac-match-title", b.title + "/30");
    set("vac-match-salary", b.salary + "/15");
    set("vac-match-exp", b.experience + "/15");
    const total = Math.max(1, b.skills + b.title + b.salary + b.experience);
    const barSkills = el("vac-match-bar-skills");
    const barTitle = el("vac-match-bar-title");
    const barSalary = el("vac-match-bar-salary");
    const barExp = el("vac-match-bar-exp");
    if (barSkills) barSkills.style.width = (b.skills / total * 100).toFixed(1) + "%";
    if (barTitle) barTitle.style.width = (b.title / total * 100).toFixed(1) + "%";
    if (barSalary) barSalary.style.width = (b.salary / total * 100).toFixed(1) + "%";
    if (barExp) barExp.style.width = (b.experience / total * 100).toFixed(1) + "%";
    const detailsSection = el("vac-match-details");
    if (detailsSection && details) {
      const matching = details.matchingSkills || [];
      const derived = details.derivedMatchSkills || [];
      const missing = details.missingSkills || [];
      if (matching.length > 0 || derived.length > 0 || missing.length > 0) {
        detailsSection.style.display = "";
        renderSkillList(
          el,
          "vac-match-matching-skills",
          "vac-match-matching-list",
          matching,
          "#ECFDF5",
          "#059669",
          "#A7F3D0"
        );
        renderSkillList(
          el,
          "vac-match-derived-skills",
          "vac-match-derived-list",
          derived,
          "#FFFBEB",
          "#B45309",
          "#FDE68A"
        );
        renderSkillList(
          el,
          "vac-match-missing-skills",
          "vac-match-missing-list",
          missing,
          "#FEF2F2",
          "#DC2626",
          "#FECACA"
        );
      } else {
        detailsSection.style.display = "none";
      }
    }
  }
  function tryShowVacancyMatch() {
    const detail = window.__hhVacDetail;
    if (!detail || detail.matchScore === void 0) return;
    const resume = panelState.resume;
    if (resume) {
      const score = computeMatchScore(resume, detail);
      renderVacancyMatchScore(detail.id, score.total, score.breakdown, score.details);
    } else {
      renderVacancyMatchScore(detail.id, detail.matchScore, detail.matchBreakdown, null);
    }
  }
  function renderSkillList(el, rowId, listId, skills, bg, fg, border) {
    const row = el(rowId);
    const list = el(listId);
    if (!row || !list) return;
    if (skills.length > 0) {
      row.style.display = "";
      const visible = skills.slice(0, 6);
      const remainder = skills.length - visible.length;
      list.innerHTML = visible.map(
        (s) => '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:' + bg + ";color:" + fg + ";border:1px solid " + border + ';">' + esc(s) + "</span>"
      ).join("") + (remainder > 0 ? '<span style="font-size:11px;color:#52525b;padding:3px 0;">+' + remainder + "</span>" : "");
    } else {
      row.style.display = "none";
    }
  }
  var init_vacancies_match = __esm({
    "src/ui/tabs/vacancies-match.js"() {
      init_state();
      init_html2();
      init_match_scorer();
    }
  });

  // src/ui/tabs/vacancies.js
  function renderVacancyList() {
    const list = refs.shadowRoot?.getElementById("har-vlist");
    if (!list) return;
    if (!panelState.vacancies.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">\u041D\u0435\u0442 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439.<br>\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u043E\u0438\u0441\u043A\u0430.</div>';
      return;
    }
    const minMatch = panelState.settings?.minMatchScore || 60;
    const allVacancies = panelState.vacancies.slice(0, 50);
    const relevant = allVacancies.filter((v) => (v.matchScore != null ? v.matchScore : 0) >= minMatch);
    const irrelevant = allVacancies.filter((v) => (v.matchScore != null ? v.matchScore : 0) < minMatch);
    let html = relevant.map((v, idx) => renderVacancyItem(v, idx, false)).join("");
    if (irrelevant.length > 0) {
      html += '<div style="margin-top:8px;padding:8px 10px;background:#F4F4F5;border-radius:8px;border:1px solid #E4E4E7;">';
      html += '<button data-action="toggle-irrelevant" style="display:flex;align-items:center;gap:6px;width:100%;background:none;border:none;cursor:pointer;font-size:11px;color:#71717A;padding:0;">';
      html += '<svg class="irrelevant-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.15s;transform:rotate(180deg);"><polyline points="6 9 12 15 18 9"/></svg>';
      html += "<span>\u041D\u0438\u0437\u043A\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 (" + irrelevant.length + ")</span>";
      html += "</button>";
      html += '<div class="irrelevant-list" style="margin-top:6px;">';
      html += irrelevant.map((v, idx) => renderVacancyItem(v, relevant.length + idx, true)).join("");
      html += "</div></div>";
    }
    list.innerHTML = html;
    const r = panelState.resume;
    if (r && (r.skills && r.skills.length > 0 || r.derivedSkills && r.derivedSkills.length > 0)) {
      updateSkillGapSection(r);
    }
  }
  function renderVacancyItem(v, idx, dimmed) {
    const score = v.matchScore != null ? v.matchScore : 0;
    const sc = score > 0 ? '<div class="score-ring" style="--score:' + score + ';" role="img" aria-label="\u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 ' + score + '%"><span>' + score + "%</span></div>" : "";
    const applyBtn = v.hasReply && v.status === "new" ? '<button class="btn btn-primary btn-sm" data-action="apply" data-id="' + esc(v.id) + '">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F</button>' : "";
    const badge = v.status === "applied" ? '<span class="badge badge-green">\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u0430</span>' : v.status === "blacklisted" ? '<span class="badge badge-red">BL</span>' : v.isAd ? '<span class="badge badge-amber">\u0420\u0435\u043A\u043B\u0430\u043C\u0430</span>' : "";
    const enrichBadge = v.keySkills && v.keySkills.length > 0 ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;" title="\u041F\u043E\u043B\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438">\u043F\u043E\u043B\u043D\u044B\u0439</span>' : v.enrichmentSource === "cache" ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;" title="\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043A\u044D\u0448\u0430 (\u0440\u0430\u043D\u0435\u0435 \u043F\u043E\u0441\u0435\u0449\u0451\u043D\u043D\u0430\u044F \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F)">\u043A\u044D\u0448</span>' : '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#F4F4F5;color:#71717A;border:1px solid #D4D4D8;" title="\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E\u0438\u0441\u043A\u0430 -- \u043F\u043E\u043B\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435">\u043F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439</span>';
    const skillCount = v.keySkills && v.keySkills.length > 0 ? '<span style="font-size:11px;color:#059669;" title="\u041D\u0430\u0432\u044B\u043A\u0438 \u0438\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438">' + v.keySkills.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432</span>" : v.skills && v.skills.length > 0 ? '<span style="font-size:11px;color:#71717A;" title="\u0422\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u0433\u0438 \u0438\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E\u0438\u0441\u043A\u0430">' + v.skills.length + " \u0442\u0435\u0433\u043E\u0432</span>" : "";
    const shimmerClass = score >= 70 && v.status === "new" ? " shimmer" : "";
    const opacity = dimmed ? "opacity:0.45;" : v.status === "blacklisted" ? "opacity:0.4;" : v.status === "applied" ? "opacity:0.5;" : "";
    return '<div class="vacancy-item' + shimmerClass + '" data-title="' + esc(v.title) + '" data-status="' + esc(v.status || "new") + '" data-score="' + score + '" data-schedule="' + (v.schedule || "unknown") + '" data-isad="' + (v.isAd ? "1" : "0") + '" style="' + opacity + '" tabindex="0" role="article" aria-label="' + esc(v.title) + ", " + esc(v.company) + ", \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 " + score + '%"><div style="flex-shrink:0;">' + sc + '</div><div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><a href="' + esc(v.url) + '" data-action="navigate" style="font-weight:600;color:#059669;text-decoration:none;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;cursor:pointer;"><span style="color:#71717a;font-weight:400;margin-right:3px;">' + (idx + 1) + ".</span>" + esc(v.title) + '</a><div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">' + enrichBadge + badge + '</div></div><div style="display:flex;gap:10px;font-size:12px;color:#64748b;margin-bottom:6px;"><span>' + esc(v.company) + "</span>" + (v.salary && v.salary !== "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430" ? '<span style="color:#18181b;font-weight:500;">' + esc(typeof v.salary === "object" ? v.salary.raw : v.salary) + "</span>" : "") + skillCount + '</div><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:12px;color:#52525b;">' + esc(v.location) + "</span>" + applyBtn + "</div></div></div>";
  }
  function renderStatsValues() {
    const s = panelState.stats;
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const applied = s.appliedToday || 0;
    const limit = panelState.settings.dailyLimit || 200;
    const set = (id, val) => {
      const e2 = el(id);
      if (e2) e2.textContent = val;
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
      init_vacancies_match();
    }
  });

  // src/parsers/negotiations.js
  var negotiations_exports = {};
  __export(negotiations_exports, {
    fetchAndParseNegotiations: () => fetchAndParseNegotiations,
    findListContainer: () => findListContainer,
    findNegotiationItems: () => findNegotiationItems,
    parseNegotiationItems: () => parseNegotiationItems,
    parseNegotiations: () => parseNegotiations,
    parseSingleItem: () => parseSingleItem
  });
  function extractStatus(tagEl) {
    if (!tagEl) return { status: "unknown", statusText: "" };
    const qa = safeGetAttr(tagEl, "data-qa", "");
    const match = qa.match(/negotiations-item-([\w-]+)/);
    const status = match ? match[1] : "unknown";
    return {
      status,
      statusText: safeGetText(tagEl, "")
    };
  }
  function findListContainer(root) {
    return findElement("negotiationsList", root);
  }
  function findNegotiationItems(root) {
    const listEl = findListContainer(root);
    if (listEl) {
      const selectors = HH_SELECTORS.negotiationsItem || [];
      for (const sel of selectors) {
        try {
          const els = listEl.querySelectorAll(sel);
          if (els && els.length > 0) return Array.from(els);
        } catch (_e) {
        }
      }
    }
    return findAllElements("negotiationsItem", root);
  }
  function findInsideItem(item, name) {
    const selectors = HH_SELECTORS[name] || [];
    for (const sel of selectors) {
      try {
        const el = item.querySelector(sel);
        if (el) return el;
      } catch (_e) {
      }
    }
    return null;
  }
  function parseSingleItem(item, idx) {
    const vacancyEl = findInsideItem(item, "negotiationsItemVacancy");
    const companyEl = findInsideItem(item, "negotiationsItemCompany");
    const dateEl = findInsideItem(item, "negotiationsItemDate");
    const tagEl = findInsideItem(item, "negotiationsItemTag");
    const vacancyTitle = safeGetText(vacancyEl, "");
    const linkEl = vacancyEl && vacancyEl.tagName === "A" ? vacancyEl : vacancyEl ? vacancyEl.querySelector("a") : null;
    let vacancyUrl = linkEl ? safeGetAttr(linkEl, "href", "") : "";
    if (vacancyUrl && !vacancyUrl.startsWith("http")) {
      vacancyUrl = "https://hh.ru" + vacancyUrl;
    }
    if (!vacancyUrl && linkEl && linkEl.href) {
      vacancyUrl = linkEl.href;
    }
    const vacancyId = vacancyUrl ? extractVacancyId(vacancyUrl) : "";
    const company = safeGetText(companyEl, "");
    const date = safeGetText(dateEl, "");
    const { status, statusText } = extractStatus(tagEl);
    if (!vacancyTitle && !company && !date && status === "unknown") {
      return null;
    }
    return {
      id: vacancyId || "neg-" + idx,
      vacancyTitle,
      vacancyUrl,
      vacancyId,
      company,
      date,
      status,
      statusText,
      // UI compatibility: map to existing conversation model
      name: vacancyTitle || company || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
      time: date,
      preview: statusText ? statusText + " -- " + company : company,
      unread: status === "not-viewed" || status === "invite",
      parsedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function parseNegotiationItems(root) {
    root = root || document;
    const listEl = findListContainer(root);
    if (!listEl) {
      negLog.info("No negotiations-list container found");
      return [];
    }
    const items = findNegotiationItems(root);
    if (!items || items.length === 0) {
      negLog.info("No negotiation items found");
      return [];
    }
    negLog.info("Found " + items.length + " negotiation items");
    const negotiations = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const parsed = parseSingleItem(items[i], i);
        if (parsed) negotiations.push(parsed);
      } catch (err) {
        negLog.warn("Failed to parse negotiation item #" + i + ": " + err.message);
      }
    }
    negLog.info("Parsed " + negotiations.length + " negotiations");
    return negotiations;
  }
  async function parseNegotiations() {
    return parseNegotiationItems(document);
  }
  async function fetchAndParseNegotiations() {
    const url = "https://hh.ru/applicant/negotiations";
    negLog.info("Background fetch: " + url);
    try {
      const resp = await fetch(url, {
        credentials: "include",
        headers: { "Accept": "text/html" }
      });
      if (!resp.ok) {
        negLog.warn("Fetch failed: " + resp.status);
        return [];
      }
      const html = await resp.text();
      negLog.info("Fetched " + html.length + " chars");
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return parseNegotiationItems(doc);
    } catch (err) {
      negLog.warn("Background fetch error: " + err.message);
      return [];
    }
  }
  var negLog;
  var init_negotiations2 = __esm({
    "src/parsers/negotiations.js"() {
      init_selectors();
      init_anti_hallucination();
      negLog = createLogger("NegParse");
    }
  });

  // src/parsers/negotiations-aggregator.js
  async function readCache() {
    if (!chrome?.storage?.local) return null;
    try {
      const { [CACHE_KEY]: cached } = await chrome.storage.local.get(CACHE_KEY);
      if (!cached?.timestamp) return null;
      const age = Date.now() - cached.timestamp;
      if (age > CACHE_TTL_MS) {
        aggLog.info("Cache expired (age=" + age + "ms)");
        return null;
      }
      aggLog.info("Cache hit (age=" + age + "ms)");
      return cached.data;
    } catch (err) {
      aggLog.warn("Cache read error: " + err.message);
      return null;
    }
  }
  async function writeCache(data) {
    if (!chrome?.storage?.local) return;
    try {
      await chrome.storage.local.set({ [CACHE_KEY]: { timestamp: Date.now(), data } });
    } catch (err) {
      aggLog.warn("Cache write error: " + err.message);
    }
  }
  async function fetchTab(tab, opts = {}) {
    const fetchImpl = opts.fetchImpl || fetch;
    const ParserCtor = opts.domParserImpl || DOMParser;
    const parser = opts.parseItemsImpl || parseNegotiationItems;
    const result = { tab: tab.id, label: tab.label, items: [], error: null };
    try {
      const resp = await fetchImpl(tab.url, {
        credentials: "include",
        headers: { "Accept": "text/html" }
      });
      if (!resp.ok) {
        result.error = "HTTP " + resp.status;
        aggLog.warn("Tab " + tab.id + " fetch failed: " + result.error);
        return result;
      }
      const html = await resp.text();
      const doc = new ParserCtor().parseFromString(html, "text/html");
      result.items = parser(doc) || [];
      aggLog.info("Tab " + tab.id + ": " + result.items.length + " items");
    } catch (err) {
      result.error = err.message || String(err);
      aggLog.warn("Tab " + tab.id + " error: " + result.error);
    }
    return result;
  }
  function deduplicateByTopic(items) {
    if (!items || typeof items[Symbol.iterator] !== "function") return [];
    const seen = /* @__PURE__ */ new Map();
    const result = [];
    for (const item of items) {
      if (!item) continue;
      const key = item.vacancyId || ((item.vacancyTitle || "") + "|" + (item.company || "")).toLowerCase();
      if (!key || key === "|") continue;
      if (seen.has(key)) {
        const existing = result[seen.get(key)];
        if (!existing.alsoIn) existing.alsoIn = [];
        if (!existing.alsoIn.includes(item.tabOrigin)) {
          existing.alsoIn.push(item.tabOrigin);
        }
      } else {
        seen.set(key, result.length);
        result.push({ ...item });
      }
    }
    return result;
  }
  async function fetchAllNegotiations(opts = {}) {
    const forceRefresh = opts.forceRefresh || false;
    const tabsFilter = opts.tabs || null;
    const sleepImpl = opts.sleepImpl || sleep;
    if (!forceRefresh) {
      const cached = await readCache();
      if (cached) return { ...cached, fromCache: true };
    }
    const tabs = tabsFilter ? NEGOTIATION_TABS.filter((t) => tabsFilter.includes(t.id)) : NEGOTIATION_TABS;
    const perTab = {};
    const errors = [];
    const allItems = [];
    for (let i = 0; i < tabs.length; i++) {
      if (i > 0) await sleepImpl(RATE_LIMIT_MS);
      const res = await fetchTab(tabs[i], opts);
      perTab[res.tab] = { count: res.items.length };
      if (res.error) {
        perTab[res.tab].error = res.error;
        errors.push(res.tab + ": " + res.error);
      }
      for (const item of res.items) {
        if (item) item.tabOrigin = res.tab;
        allItems.push(item);
      }
    }
    const merged = deduplicateByTopic(allItems);
    const result = {
      items: merged,
      perTab,
      errors,
      fromCache: false,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalCount: merged.length,
      rawCount: allItems.filter(Boolean).length
    };
    aggLog.info("Aggregated: " + merged.length + " unique / " + allItems.filter(Boolean).length + " raw, " + errors.length + " errors");
    await writeCache(result);
    return result;
  }
  async function invalidateNegotiationsCache() {
    if (!chrome?.storage?.local) return;
    try {
      await chrome.storage.local.remove(CACHE_KEY);
      aggLog.info("Cache invalidated");
    } catch (err) {
      aggLog.warn("Cache invalidate error: " + err.message);
    }
  }
  var aggLog, NEGOTIATION_TABS, CACHE_KEY, CACHE_TTL_MS, RATE_LIMIT_MS, sleep;
  var init_negotiations_aggregator = __esm({
    "src/parsers/negotiations-aggregator.js"() {
      init_negotiations2();
      init_anti_hallucination();
      aggLog = createLogger("NegAgg");
      NEGOTIATION_TABS = [
        { id: "all", label: "\u0412\u0441\u0435", url: "https://hh.ru/applicant/negotiations?status=all" },
        { id: "invite", label: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435", url: "https://hh.ru/applicant/negotiations?status=invite" },
        { id: "consider", label: "\u0421\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435", url: "https://hh.ru/applicant/negotiations?status=consider" },
        { id: "offer", label: "\u0412\u044B\u0445\u043E\u0434 \u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0443", url: "https://hh.ru/applicant/negotiations?status=offer" },
        { id: "wait", label: "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435", url: "https://hh.ru/applicant/negotiations?status=wait" },
        { id: "discard", label: "\u041E\u0442\u043A\u0430\u0437", url: "https://hh.ru/applicant/negotiations?status=discard" },
        { id: "deleted", label: "\u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435", url: "https://hh.ru/applicant/negotiations?status=deleted" },
        { id: "archive", label: "\u0410\u0440\u0445\u0438\u0432", url: "https://hh.ru/applicant/negotiations?status=archive" }
      ];
      CACHE_KEY = "negotiations:all";
      CACHE_TTL_MS = 30 * 1e3;
      RATE_LIMIT_MS = 1e3;
      sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    }
  });

  // src/ui/tabs/negotiations-summary.js
  function computeStatusCounts(items) {
    const counts = { all: 0, invite: 0, "not-viewed": 0, viewed: 0, discard: 0, unknown: 0 };
    if (!items || !Array.isArray(items)) return counts;
    for (const item of items) {
      if (!item) continue;
      counts.all++;
      const s = item.status || "unknown";
      if (counts[s] === void 0) counts.unknown++;
      else counts[s]++;
    }
    return counts;
  }
  function computeTabOriginCounts(items) {
    const counts = {};
    for (const t of NEGOTIATION_TABS) counts[t.id] = 0;
    if (!items || !Array.isArray(items)) return counts;
    for (const item of items) {
      if (!item) continue;
      const tab = item.tabOrigin || "all";
      if (counts[tab] === void 0) counts[tab] = 0;
      counts[tab]++;
    }
    return counts;
  }
  function formatSummaryText(counts) {
    if (!counts || counts.all === 0) return "\u041D\u0435\u0442 \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432";
    const forms = ["\u043E\u0442\u043A\u043B\u0438\u043A", "\u043E\u0442\u043A\u043B\u0438\u043A\u0430", "\u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432"];
    const n = counts.all;
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    const form = abs > 10 && abs < 20 ? forms[2] : last > 1 && last < 5 ? forms[1] : last === 1 ? forms[0] : forms[2];
    return n + " " + form;
  }
  function renderStatusChip(status, count, isActive) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
    const label = status === "all" ? "\u0412\u0441\u0435" : cfg.label;
    const cls = isActive ? "btn-primary" : "btn-outline";
    const style = "font-size:10px;padding:2px 8px;" + (isActive ? `background:${cfg.fg};color:#fff;border:1px solid ${cfg.fg};` : `background:${cfg.bg};color:${cfg.fg};border:1px solid ${cfg.border};`);
    return `<button class="btn ${cls} btn-sm neg-status-btn" data-status="${status}" style="${style}">${label} ${count}</button>`;
  }
  function renderTabOriginChip(tabId, count, isActive) {
    const cfg = TAB_ORIGIN_CONFIG[tabId] || TAB_ORIGIN_CONFIG.all;
    const label = TAB_ORIGIN_LABELS[tabId] || tabId;
    const style = "font-size:10px;padding:2px 6px;border-radius:4px;" + (isActive ? `background:${cfg.fg};color:#fff;border:1px solid ${cfg.fg};` : `background:${cfg.bg};color:${cfg.fg};border:1px solid transparent;`);
    return `<button class="neg-tab-btn" data-tab-origin="${tabId}" style="${style}">${label} ${count}</button>`;
  }
  var TAB_ORIGIN_LABELS, STATUS_CONFIG, TAB_ORIGIN_CONFIG;
  var init_negotiations_summary = __esm({
    "src/ui/tabs/negotiations-summary.js"() {
      init_negotiations_aggregator();
      TAB_ORIGIN_LABELS = Object.fromEntries(
        NEGOTIATION_TABS.map((t) => [t.id, t.label])
      );
      STATUS_CONFIG = {
        "invite": { bg: "#ECFDF5", fg: "#059669", border: "#A7F3D0", label: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435" },
        "not-viewed": { bg: "#FFFBEB", fg: "#D97706", border: "#FDE68A", label: "\u041D\u0435 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D" },
        "viewed": { bg: "#EFF6FF", fg: "#2563EB", border: "#BFDBFE", label: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D" },
        "discard": { bg: "#FEF2F2", fg: "#DC2626", border: "#FECACA", label: "\u041E\u0442\u043A\u0430\u0437" },
        "unknown": { bg: "#F4F4F5", fg: "#71717A", border: "#E4E4E7", label: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E" }
      };
      TAB_ORIGIN_CONFIG = {
        "all": { bg: "#F8FAFC", fg: "#475569" },
        "invite": { bg: "#ECFDF5", fg: "#059669" },
        "consider": { bg: "#EFF6FF", fg: "#2563EB" },
        "offer": { bg: "#FDF4FF", fg: "#A855F7" },
        "wait": { bg: "#FFFBEB", fg: "#D97706" },
        "discard": { bg: "#FEF2F2", fg: "#DC2626" },
        "deleted": { bg: "#F1F5F9", fg: "#64748B" },
        "archive": { bg: "#F1F5F9", fg: "#64748B" }
      };
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
      const e2 = el(id);
      if (e2) e2.textContent = val;
    };
    set("kpi-daily-count", applied);
    set("kpi-hourly-count", hourly);
    set("kpi-applied-count", applied);
    set("kpi-invitations-count", panelState.dailyStats.invitations || 0);
    set("rl-429-count", panelState.dailyStats.errors429 || 0);
    const kpiSvg = refs.shadowRoot?.querySelector(".kpi-ring-fill")?.closest("svg");
    if (kpiSvg) kpiSvg.setAttribute("aria-label", `\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442: ${applied} \u0438\u0437 ${limit}`);
    const hourlyBar = el("kpi-hourly-bar")?.querySelector(".fill");
    if (hourlyBar) hourlyBar.style.width = Math.min(100, hourly / hourlyLimit * 100) + "%";
    renderNegotiationsSummary();
  }
  function renderNegotiationsSummary() {
    const container = refs.shadowRoot?.getElementById("overview-negotiations");
    if (!container) return;
    const convs = panelState.negotiations || [];
    const counts = computeStatusCounts(convs);
    const meta = panelState.negotiationsMeta || {};
    const summaryText = formatSummaryText(counts);
    const errorBadge = meta.errors && meta.errors.length > 0 ? `<span style="font-size:9px;color:#DC2626;margin-left:6px;" title="${esc(meta.errors.join("; "))}">[!${meta.errors.length}]</span>` : "";
    const breakdown = ["invite", "not-viewed", "viewed", "discard"].map((s) => {
      const cnt = counts[s] || 0;
      if (cnt === 0) return "";
      const labels = {
        invite: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F",
        "not-viewed": "\u041D\u0435 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u044B",
        viewed: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u044B",
        discard: "\u041E\u0442\u043A\u0430\u0437\u044B"
      };
      const colors = {
        invite: "#059669",
        "not-viewed": "#D97706",
        viewed: "#2563EB",
        discard: "#DC2626"
      };
      return `<span style="font-size:11px;color:${colors[s]};">${labels[s]}: ${cnt}</span>`;
    }).filter(Boolean).join(" \xB7 ");
    container.innerHTML = `
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:600;color:#0F172A;">\u041E\u0442\u043A\u043B\u0438\u043A\u0438</span>
        <span style="font-size:13px;font-weight:700;color:#0F172A;">${esc(summaryText)}${errorBadge}</span>
      </div>
      ${breakdown ? `<div style="font-size:10px;display:flex;gap:6px;flex-wrap:wrap;">${breakdown}</div>` : ""}
      ${meta.fromCache ? '<div style="font-size:9px;color:#94A3B8;margin-top:4px;">\u0438\u0437 \u043A\u044D\u0448\u0430</div>' : ""}
    </div>`;
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
      <span style="font-size:11px;color:#52525b;flex-shrink:0;margin-left:8px;">${time}</span>
    </div>
    ${detail ? `<div style="font-size:11px;color:#52525b;margin-top:1px;">${esc(detail)}</div>` : ""}`;
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
      init_negotiations_summary();
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
      listEl.innerHTML = '<div style="padding:8px;text-align:center;">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435" \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0440\u0435\u0437\u044E\u043C\u0435</div>';
      return;
    }
    listEl.innerHTML = resumes.map((r, idx) => {
      const skillCount = (r.skills || []).length;
      const expCount = (r.experience || []).length;
      const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
      const isActive = panelState.resume && panelState.resume.id === r.id;
      let visBadge;
      if (vis === "hidden") {
        visBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">\u0421\u043A\u0440\u044B\u0442\u043E</span>';
      } else if (vis === "visible") {
        visBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">\u0412\u0438\u0434\u0438\u043C\u043E</span>';
      } else {
        visBadge = '<span class="badge" style="font-size:9px;margin-left:4px;background:#e4e4e7;color:#52525b;">?</span>';
      }
      const radio = isActive ? '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="width:8px;height:8px;border-radius:50%;background:#059669;"></span></span>' : '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #d4d4d8;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></span>';
      const reparseIcon = isActive ? '<button class="btn btn-outline btn-sm" data-action="reparse-resume" title="' + (vis === "hidden" ? "\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0442\u044C \u0441\u043A\u0440\u044B\u0442\u043E\u0435" : "\u041F\u0435\u0440\u0435\u043F\u0430\u0440\u0441\u0438\u0442\u044C") + '" style="padding:2px 6px;font-size:13px;line-height:1;' + (vis === "hidden" ? "color:#b45309;border-color:#fbbf24;" : "") + '">(R)</button>' : "";
      return '<div class="har-my-resume-item" data-resume-idx="' + idx + '" style="padding:8px;border-bottom:1px solid #e4e4e7;cursor:pointer;display:flex;align-items:flex-start;gap:8px;' + (isActive ? "background:#f0fdf4;border-radius:6px;" : "") + (vis === "hidden" && !isActive ? "opacity:0.6;" : "") + '">' + radio + '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:12px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F") + "</span>" + visBadge + "</div>" + (r.salary ? '<div style="font-size:11px;color:#059669;">' + esc(r.salary) + "</div>" : "") + '<div style="font-size:10px;color:#52525b;">' + skillCount + " \u043D\u0430\u0432., " + expCount + " \u0437\u0430\u043F. \u043E\u043F\u044B\u0442\u0430</div></div>" + reparseIcon + "</div>";
    }).join("");
    listEl.querySelectorAll(".har-my-resume-item").forEach((item) => {
      item.addEventListener("click", (e2) => {
        if (e2.target.closest('[data-action="reparse-resume"]')) return;
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
      container.innerHTML = '<div class="har-empty">\u0421\u043F\u0438\u0441\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u0443\u0441\u0442.<br>\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430.</div>';
      return;
    }
    container.innerHTML = '<div class="har-resume-list-header">\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: ' + list.length + "</div>" + list.map((r) => {
      const isActive = panelState.resume && panelState.resume.id === r.id;
      return '<div class="har-resume-list-item ' + (isActive ? "har-resume-list-active" : "") + '"><a href="' + esc(r.url) + '" target="_blank" class="har-resume-list-link">' + esc(r.title) + "</a>" + (isActive ? '<span class="har-resume-loaded-badge">\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E</span>' : "") + "</div>";
    }).join("") + '<div class="har-resume-list-hint">\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435 \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C".</div>';
    container.querySelectorAll(".har-resume-list-link").forEach((link) => {
      link.addEventListener("click", (e2) => {
        e2.preventDefault();
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
      const companyLine = companyParts.join(" * ");
      const isLast = idx === expCount - 1;
      return '<div style="margin-bottom:' + (isLast ? "0" : "8px") + ";padding-bottom:" + (isLast ? "0" : "8px") + ";" + (isLast ? "" : "border-bottom:1px solid rgba(0,0,0,0.05);") + '"><div style="font-weight:600;">' + esc(j.position || "?") + "</div>" + (companyLine ? '<div style="color:#52525b;margin-top:2px;">' + companyLine + "</div>" : "") + (j.description ? '<div style="color:#52525b;margin-top:3px;font-size:11px;line-height:1.5;">' + esc(j.description).split("\n").map((p) => '<div style="margin-bottom:2px;">' + p + "</div>").join("") + "</div>" : "") + "</div>";
    }).join("");
    return buildSubAccordion(
      "subExp",
      "chevExp",
      "\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B",
      expCount + " \u043C\u0435\u0441\u0442",
      "#B45309",
      expCount > 0 ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;">' + expContent + "</div>" : '<div style="padding:8px;font-size:11px;color:#52525b;">\u041E\u043F\u044B\u0442 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D</div>'
    );
  }
  function buildEducationSection(r) {
    const eduCount = (r.education || []).length;
    const eduContent = (r.education || []).map((e2) => {
      return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;margin-bottom:6px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + (e2.name ? '<span style="color:#52525b;">\u0412\u0423\u0417</span><span style="font-weight:500;">' + esc(e2.name) + "</span>" : "") + (e2.description ? '<span style="color:#52525b;">\u0424\u0430\u043A\u0443\u043B\u044C\u0442\u0435\u0442</span><span style="font-weight:500;">' + esc(e2.description) + "</span>" : "") + (e2.year ? '<span style="color:#52525b;">\u0413\u043E\u0434</span><span style="font-weight:500;">' + esc(e2.year) + "</span>" : "") + (e2.degree ? '<span style="color:#52525b;">\u0421\u0442\u0435\u043F\u0435\u043D\u044C</span><span style="font-weight:500;">' + esc(e2.degree) + "</span>" : "") + "</div></div>";
    }).join("");
    return buildSubAccordion(
      "subEdu",
      "chevEdu",
      "\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435",
      eduCount + " \u0437\u0430\u043F\u0438\u0441\u0435\u0439",
      "#7C3AED",
      eduCount > 0 ? eduContent : '<div style="padding:8px;font-size:11px;color:#52525b;">\u041E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E</div>'
    );
  }
  function buildLanguagesSection(r) {
    const langCount = (r.languages || []).length;
    const langContent = (r.languages || []).length > 0 ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;"><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' + (r.languages || []).map((l) => {
      if (typeof l === "string") {
        const parts = l.split(/\s*[\u2013\u2014-]\s*/);
        const lang = parts[0] || l;
        const level = parts[1] || "--";
        return '<span style="color:#52525b;">' + esc(lang) + '</span><span style="font-weight:500;">' + esc(level) + "</span>";
      }
      return '<span style="color:#52525b;">' + esc(l.name || l) + '</span><span style="font-weight:500;">' + esc(l.level || "--") + "</span>";
    }).join("") + "</div></div>" : '<div style="padding:8px;font-size:11px;color:#52525b;">\u042F\u0437\u044B\u043A\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B</div>';
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
        subtitleEl.textContent = parts.join(" - ") || "\u0420\u0435\u0437\u044E\u043C\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E";
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
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 email -- ATS \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F"
    );
    const skillCount = (r.skills || []).length;
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 \u0443\u043A\u0430\u0437\u0430\u043D\u044B",
      15,
      skillCount > 0,
      "\u0411\u0435\u0437 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 ATS \u043D\u0435 \u043D\u0430\u0439\u0434\u0451\u0442 \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043F\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u0430\u043C"
    );
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 >= 5 (\u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u043F\u043E\u0440\u043E\u0433)",
      8,
      skillCount >= 5,
      "\u041C\u0435\u043D\u044C\u0448\u0435 5 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 -- ATS-\u043F\u043E\u0438\u0441\u043A \u043D\u0435 \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u0432\u0430\u0441 \u043F\u043E \u0431\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432"
    );
    add(
      "\u041D\u0430\u0432\u044B\u043A\u0438 >= 10 (\u0445\u043E\u0440\u043E\u0448\u0435\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435)",
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
      "\u041C\u043D\u043E\u0433\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0443\u044E\u0442 \u043F\u043E \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0435 -- \u0431\u0435\u0437 \u043D\u0435\u0451 \u0432\u044B \u0432\u044B\u043F\u0430\u0434\u0430\u0435\u0442\u0435 \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u0430"
    );
    add(
      "\u041B\u043E\u043A\u0430\u0446\u0438\u044F/\u0433\u043E\u0440\u043E\u0434",
      5,
      !!(r.address && r.address.length > 2),
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0433\u043E\u0440\u043E\u0434 -- \u0438\u043D\u0430\u0447\u0435 \u0444\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u043B\u043E\u043A\u0430\u0446\u0438\u0438 \u0432\u0430\u0441 \u043E\u0442\u0441\u0435\u0447\u0451\u0442"
    );
    const expCount = (r.experience || []).length;
    add(
      "\u041E\u043F\u044B\u0442 \u0440\u0430\u0431\u043E\u0442\u044B \u0443\u043A\u0430\u0437\u0430\u043D",
      12,
      expCount > 0,
      "\u0411\u0435\u0437 \u043E\u043F\u044B\u0442\u0430 ATS \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0444\u0438\u043B\u044C\u0442\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E \u0442\u0440\u0435\u0431\u0443\u0435\u043C\u043E\u043C\u0443 \u0441\u0442\u0430\u0436\u0443"
    );
    const expWithDesc = (r.experience || []).filter((e2) => e2.description && e2.description.length > 30);
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
      "\u041A\u0430\u0436\u0434\u0430\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u0438\u043C\u0435\u0442\u044C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 -- \u0438\u043D\u0430\u0447\u0435 ATS \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430"
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
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0438\u043F \u0437\u0430\u043D\u044F\u0442\u043E\u0441\u0442\u0438 -- \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u0443\u0435\u0442 \u043F\u043E \u043D\u0435\u043C\u0443"
    );
    add(
      "\u0424\u043E\u0440\u043C\u0430\u0442 \u0440\u0430\u0431\u043E\u0442\u044B",
      3,
      !!r.workFormat,
      "\u0423\u0434\u0430\u043B\u0451\u043D\u043D\u0430\u044F/\u043E\u0444\u0438\u0441/\u0433\u0438\u0431\u0440\u0438\u0434 -- \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439 \u0444\u0438\u043B\u044C\u0442\u0440 \u043D\u0430 hh.ru"
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
        "\u043F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B \u043F\u0440\u0438",
        "\u043F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B\u0430 \u043F\u0440\u0438",
        "\u043D\u0430\u0431\u043B\u044E\u0434\u0430\u043B \u0437\u0430",
        "\u043D\u0430\u0431\u043B\u044E\u0434\u0430\u043B\u0430 \u0437\u0430",
        "\u0431\u044B\u043B \u0432 \u043A\u0443\u0440\u0441\u0435",
        "\u0431\u044B\u043B\u0430 \u0432 \u043A\u0443\u0440\u0441\u0435"
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
        /\d[\d\s]*(?:руб|\$|евро)/,
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
    const allDescriptions = exps.map((e2) => e2.description || "").filter((d) => d.length > 0);
    const descText = allDescriptions.join(" ");
    const hasMetrics = METRIC_PATTERNS.some((p) => p.test(descText));
    const metricCount = METRIC_PATTERNS.filter((p) => p.test(descText)).length;
    add(
      "\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445",
      18,
      hasMetrics,
      'HR \u0438\u0449\u0435\u0442 \u0446\u0438\u0444\u0440\u044B: "\u043D\u0430 30%", "\u0432 2 \u0440\u0430\u0437\u0430", "100+ \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432" -- \u0431\u0435\u0437 \u043D\u0438\u0445 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 = \u043F\u0435\u0440\u0435\u0447\u0435\u043D\u044C \u043E\u0431\u044F\u0437\u0430\u043D\u043D\u043E\u0441\u0442\u0435\u0439'
    );
    add(
      "3+ \u043C\u0435\u0442\u0440\u0438\u043A\u0438",
      7,
      metricCount >= 3,
      "3 \u0438 \u0431\u043E\u043B\u0435\u0435 \u043C\u0435\u0442\u0440\u0438\u043A -- \u0441\u0438\u0433\u043D\u0430\u043B \u0447\u0442\u043E \u0432\u044B \u0444\u043E\u043A\u0443\u0441\u0438\u0440\u0443\u0435\u0442\u0435\u0441\u044C \u043D\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430\u0445, \u0430 \u043D\u0435 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435"
    );
    const descLower = descText.toLowerCase();
    const achievementVerbCount = ACHIEVEMENT_VERBS.filter((v) => descLower.includes(v)).length;
    add(
      "\u0413\u043B\u0430\u0433\u043E\u043B\u044B \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439",
      12,
      achievementVerbCount > 0,
      '\u041D\u0430\u0447\u0438\u043D\u0430\u0439\u0442\u0435 \u0441 "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B", "\u0432\u043D\u0435\u0434\u0440\u0438\u043B", "\u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B" -- \u044D\u0442\u043E \u044F\u0437\u044B\u043A \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432, \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u043D\u043D\u043E\u0441\u0442\u0435\u0439'
    );
    const vagueCount = VAGUE_PHRASES.filter((v) => descLower.includes(v)).length;
    add(
      "\u0411\u0435\u0437 \u0440\u0430\u0437\u043C\u044B\u0442\u044B\u0445 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043E\u043A",
      8,
      vagueCount === 0,
      '\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u0435 "\u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432", "\u043F\u043E\u043C\u043E\u0449\u044C \u0432" \u043D\u0430 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B'
    );
    const expsWithDesc = exps.filter((e2) => e2.description && e2.description.length > 50);
    add(
      "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043A \u043F\u043E\u0437\u0438\u0446\u0438\u044F\u043C",
      10,
      expsWithDesc.length > 0,
      "HR \u043D\u0435 \u0432\u0438\u0434\u0438\u0442 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0432 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F -- \u0447\u0442\u043E \u0432\u044B \u0442\u0430\u043C \u0434\u0435\u043B\u0430\u043B\u0438?"
    );
    add(
      "\u0412\u0441\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0441 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C >=50 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
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
    const positions = exps.map((e2) => e2.position || "").filter((p) => p.length > 0);
    const hasProgression = detectProgression(positions);
    const isTopLevel = positions.some(
      (p) => /(?:^|[\s/(-])(head|руководител[а-яА-ЯёЁ]*|руководств[а-яА-ЯёЁ]*|director|директор[а-яА-ЯёЁ]*|начальник[а-яА-ЯёЁ]*|cто|cto|vp)(?:$|[\s/)-,.])/i.test(p)
    );
    const progressionPassed = hasProgression || isTopLevel;
    const progressionTip = progressionPassed ? "" : "\u0420\u043E\u0441\u0442 \u0432 \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044F\u0445 -- \u0441\u0438\u043B\u044C\u043D\u044B\u0439 \u0441\u0438\u0433\u043D\u0430\u043B \u0434\u043B\u044F HR (\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 -> \u0441\u0442\u0430\u0440\u0448\u0438\u0439 -> \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C)";
    add(
      "\u041A\u0430\u0440\u044C\u0435\u0440\u043D\u044B\u0439 \u0440\u043E\u0441\u0442",
      8,
      progressionPassed,
      progressionTip
    );
    const titleRelevant = title.length > 0 && positions.some(
      (p) => p.toLowerCase().includes(title.toLowerCase().split(/\s+/)[0]) || title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && p.toLowerCase().includes(w))
    );
    add(
      "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0440\u0435\u043B\u0435\u0432\u0430\u043D\u0442\u043D\u0430 \u043E\u043F\u044B\u0442\u0443",
      7,
      titleRelevant || positions.length === 0,
      "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0440\u0435\u0437\u044E\u043C\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0439 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 -- \u0438\u043D\u0430\u0447\u0435 HR \u0437\u0430\u043F\u0443\u0442\u0430\u0435\u0442\u0441\u044F"
    );
    const aboutLen = (r.additionalInfo || "").length;
    add(
      '\u0411\u043B\u043E\u043A "\u041E \u0441\u0435\u0431\u0435"',
      5,
      aboutLen > 50,
      "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u0441\u0430\u043C\u043C\u0430\u0440\u0438 \u0438\u0437 2-3 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439 -- \u043F\u0435\u0440\u0432\u043E\u0435, \u0447\u0442\u043E \u0447\u0438\u0442\u0430\u0435\u0442 HR"
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
      if (/(?:^|[\s/(-])(intern|стажёр[а-яА-ЯёЁ]*|стажер[а-яА-ЯёЁ]*|junior|младш[а-яА-ЯёЁ]*|trainee)(?:$|[\s/)-,.])/i.test(pl)) return 1;
      if (/(?:^|[\s/(-])(middle|средн[а-яА-ЯёЁ]*)(?:$|[\s/)-,.])/i.test(pl)) return 2;
      if (/(?:^|[\s/(-])(senior|ведущ[а-яА-ЯёЁ]*|старш[а-яА-ЯёЁ]*|lead|principal|staff)(?:$|[\s/)-,.])/i.test(pl)) return 3;
      if (/(?:^|[\s/(-])(head|руководител[а-яА-ЯёЁ]*|руководств[а-яА-ЯёЁ]*|director|директор[а-яА-ЯёЁ]*|начальник[а-яА-ЯёЁ]*|cто|cto|vp)(?:$|[\s/)-,.])/i.test(pl)) return 4;
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
    const parsedDates = exps.map((e2) => parsePeriodDates(e2.period || e2.duration || ""));
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
      /([а-яА-ЯёЁ]+\s+\d{4})\s*[\u2013\u2014-]\s*([а-яА-ЯёЁ]+\s+\d{4}|Настоящее\s+время|настоящее\s+время|по\s+настоящее)/i
    );
    if (m) {
      result.start = parseRuDate(m[1]);
      if (!/настоящее/i.test(m[2])) {
        result.end = parseRuDate(m[2]);
      }
      return result;
    }
    const m2 = period.match(/(\d{4})\s*[\u2013\u2014-]\s*(\d{4})/);
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
        flags.push("\u041F\u0440\u043E\u0431\u0435\u043B \u0432 \u0441\u0442\u0430\u0436\u0435: " + gaps.map((g) => g.label).join(", ") + " -- HR \u0441\u043F\u0440\u043E\u0441\u0438\u0442 \u043E\u0431 \u044D\u0442\u043E\u043C");
      }
    }
    const shortJobs = exps.filter((e2) => {
      const months = parseDurationToMonths(e2.duration || e2.period || "");
      return months > 0 && months < 6;
    });
    if (shortJobs.length >= 2) {
      flags.push(shortJobs.length + " \u043C\u0435\u0441\u0442\u0430 < 6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432 -- \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043A\u0430\u043A \u043D\u0435\u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C");
    }
    const noDesc = exps.filter((e2) => !e2.description || e2.description.length < 20);
    if (noDesc.length > 0 && exps.length > 0) {
      flags.push(noDesc.length + " \u0438\u0437 " + exps.length + " \u043F\u043E\u0437\u0438\u0446\u0438\u0439 \u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F -- HR \u043D\u0435 \u043F\u043E\u0439\u043C\u0451\u0442 \u0432\u0430\u0448 \u0432\u043A\u043B\u0430\u0434");
    }
    if (!r.phone && !r.email) {
      flags.push("\u041D\u0435\u0442 \u043D\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430, \u043D\u0438 email -- \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F");
    }
    const allDesc = exps.map((e2) => e2.description || "").join(" ").toLowerCase();
    const vagueCount = VAGUE_PHRASES.filter((v) => allDesc.includes(v)).length;
    if (vagueCount >= 2) {
      flags.push('\u0420\u0430\u0437\u043C\u044B\u0442\u044B\u0435 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438: "\u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432", "\u043F\u043E\u043C\u043E\u0449\u044C \u0432" -- \u0437\u0432\u0443\u0447\u0438\u0442 \u043A\u0430\u043A \u043D\u0430\u0431\u043B\u044E\u0434\u0430\u0442\u0435\u043B\u044C, \u0430 \u043D\u0435 \u0434\u0435\u044F\u0442\u0435\u043B\u044C');
    }
    if ((r.skills || []).length === 0) {
      flags.push("\u041D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043D\u0430\u0432\u044B\u043A\u0430 -- ATS \u043D\u0435 \u043D\u0430\u0439\u0434\u0451\u0442 \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435");
    }
    if (!r.additionalInfo || r.additionalInfo.length < 20) {
      flags.push('\u041D\u0435\u0442 \u0431\u043B\u043E\u043A\u0430 "\u041E \u0441\u0435\u0431\u0435" -- HR \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0441\u0442\u0440\u043E \u043F\u043E\u043D\u044F\u0442\u044C \u0432\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C');
    }
    return flags;
  }
  function detectStrengths(r) {
    const strengths = [];
    const exps = r.experience || [];
    const skills = r.skills || [];
    const allDesc = exps.map((e2) => e2.description || "").join(" ");
    const descLower = allDesc.toLowerCase();
    const metricCount = METRIC_PATTERNS.filter((p) => p.test(allDesc)).length;
    if (metricCount >= 3) {
      strengths.push("\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0432 \u043E\u043F\u044B\u0442\u0435 -- " + metricCount + " \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430");
    } else if (metricCount >= 1) {
      strengths.push("\u0415\u0441\u0442\u044C \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B -- \u043E\u0442\u043B\u0438\u0447\u043D\u043E, \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0435\u0449\u0451");
    }
    const verbCount = ACHIEVEMENT_VERBS.filter((v) => descLower.includes(v)).length;
    if (verbCount >= 3) {
      strengths.push("\u042F\u0437\u044B\u043A \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439 -- " + verbCount + ' \u0433\u043B\u0430\u0433\u043E\u043B\u043E\u0432 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 ("\u0432\u043D\u0435\u0434\u0440\u0438\u043B", "\u0443\u0432\u0435\u043B\u0438\u0447\u0438\u043B")');
    } else if (verbCount >= 1) {
      strengths.push("\u0415\u0441\u0442\u044C \u0433\u043B\u0430\u0433\u043E\u043B\u044B \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439 -- \u0443\u0441\u0438\u043B\u044C\u0442\u0435 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F");
    }
    if (skills.length >= 10) {
      strengths.push("\u0428\u0438\u0440\u043E\u043A\u0438\u0439 \u043D\u0430\u0431\u043E\u0440 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 (" + skills.length + ") -- \u0445\u043E\u0440\u043E\u0448\u0435\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 ATS-\u043F\u043E\u0438\u0441\u043A\u0430");
    } else if (skills.length >= 5) {
      strengths.push("\u041D\u0435\u043F\u043B\u043E\u0445\u043E\u0439 \u043D\u0430\u0431\u043E\u0440 \u043D\u0430\u0432\u044B\u043A\u043E\u0432 (" + skills.length + ") -- \u043C\u043E\u0436\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0435\u0449\u0451");
    }
    const skillLower = skills.map((s) => s.toLowerCase().trim());
    const skillsInDesc = skillLower.filter((s) => s.length > 2 && descLower.includes(s));
    if (skillsInDesc.length >= 5) {
      strengths.push(skillsInDesc.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F\u0445 \u043E\u043F\u044B\u0442\u0430 -- credibility");
    }
    const positions = exps.map((e2) => e2.position || "").filter((p) => p.length > 0);
    if (detectProgression(positions)) {
      strengths.push("\u041A\u0430\u0440\u044C\u0435\u0440\u043D\u044B\u0439 \u0440\u043E\u0441\u0442 \u0432 \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044F\u0445 -- HR \u0432\u0438\u0434\u0438\u0442 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435");
    }
    if (r.phone && r.email) {
      strengths.push("\u041F\u043E\u043B\u043D\u044B\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B (\u0442\u0435\u043B\u0435\u0444\u043E\u043D + email) -- \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044C \u043B\u0435\u0433\u043A\u043E \u0441\u0432\u044F\u0436\u0435\u0442\u0441\u044F");
    }
    if (r.additionalInfo && r.additionalInfo.length > 100) {
      strengths.push('\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 \u0431\u043B\u043E\u043A "\u041E \u0441\u0435\u0431\u0435" -- HR \u0431\u044B\u0441\u0442\u0440\u043E \u043F\u043E\u0439\u043C\u0451\u0442 \u0432\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C');
    }
    const longDescs = exps.filter((e2) => e2.description && e2.description.length > 200);
    if (longDescs.length >= 2) {
      strengths.push("\u0414\u0435\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043E\u043F\u044B\u0442\u0430 -- HR \u0432\u0438\u0434\u0438\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u0438\u043A\u0443, \u0430 \u043D\u0435 \u043E\u0431\u0449\u0438\u0435 \u0444\u0440\u0430\u0437\u044B");
    }
    return strengths;
  }
  var init_quality_flags = __esm({
    "src/lib/quality-flags.js"() {
      init_quality_patterns();
      init_quality_experience();
      init_quality_date_helpers();
    }
  });

  // src/lib/quality-recommendations.js
  function buildRecommendations(ats, exp, flags, r, vacancySkills) {
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
    if (vacancySkills && vacancySkills.size > 0) {
      const resumeExplicit = normalizeSkillSet2(r.skills || []);
      const resumeDerived = normalizeSkillSet2(r.derivedSkills || []);
      const allResume = /* @__PURE__ */ new Set([...resumeExplicit, ...resumeDerived]);
      const descText = (r.experience || []).map((e2) => e2.description || "").join(" ").toLowerCase();
      const descNorm = descText.replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
      const roleImplied = getRoleImpliedSkills(r.title || "");
      const missing = [];
      const related = [];
      const implied = [];
      for (const vs of vacancySkills) {
        if (resumeExplicit.has(vs)) continue;
        if (resumeDerived.has(vs)) continue;
        if (vs.length > 3 && descNorm.includes(vs)) continue;
        if (roleImplied.has(vs)) {
          implied.push(vs);
          continue;
        }
        const synMatch = findSynonymMatch(vs, allResume);
        if (synMatch) {
          related.push(vs + " ~ " + synMatch);
        } else {
          missing.push(vs);
        }
      }
      if (missing.length > 0) {
        const sample = missing.slice(0, 5).map((s) => '"' + s + '"').join(", ");
        const suffix = missing.length > 5 ? " \u0438 \u0435\u0449\u0451 " + (missing.length - 5) : "";
        recs.push({
          priority: "high",
          text: missing.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043D\u0435\u0442 \u0432 \u0440\u0435\u0437\u044E\u043C\u0435: " + sample + suffix + " -- \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0435\u0433\u043E \u043C\u044D\u0442\u0447\u0438\u043D\u0433\u0430",
          tooltip: missing.map((s) => '"' + s + '"').join(", ")
        });
      }
      if (related.length > 0) {
        const sample = related.slice(0, 3).map((s) => '"' + s + '"').join(", ");
        const suffix = related.length > 3 ? " \u0438 \u0435\u0449\u0451 " + (related.length - 3) : "";
        recs.push({
          priority: "medium",
          text: "\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438: " + sample + suffix + " -- \u0443\u043F\u043E\u043C\u044F\u043D\u0438\u0442\u0435 \u044F\u0432\u043D\u043E \u0434\u043B\u044F \u0442\u043E\u0447\u043D\u043E\u0433\u043E \u043C\u044D\u0442\u0447\u0438\u043D\u0433\u0430",
          tooltip: related.map((s) => '"' + s + '"').join(", ")
        });
      }
      if (implied.length > 0) {
        const sample = implied.slice(0, 5).map((s) => '"' + s + '"').join(", ");
        const suffix = implied.length > 5 ? " \u0438 \u0435\u0449\u0451 " + (implied.length - 5) : "";
        recs.push({
          priority: "low",
          text: implied.length + " \u043D\u0430\u0432\u044B\u043A\u043E\u0432 \u043F\u043E\u0434\u0440\u0430\u0437\u0443\u043C\u0435\u0432\u0430\u044E\u0442\u0441\u044F \u0434\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044C\u044E: " + sample + suffix,
          tooltip: implied.map((s) => '"' + s + '"').join(", ")
        });
      }
    }
    return recs;
  }
  function normalizeSkillSet2(skills) {
    const set = /* @__PURE__ */ new Set();
    for (const s of skills) {
      const name = typeof s === "string" ? s : s.name || "";
      if (name) {
        set.add(
          name.toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ")
        );
      }
    }
    return set;
  }
  var init_quality_recommendations = __esm({
    "src/lib/quality-recommendations.js"() {
      init_skill_synonyms();
      init_role_implied_skills();
    }
  });

  // src/lib/resume-quality-analyzer.js
  function analyzeResumeQuality(r, vacancySkills) {
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
    const recommendations = buildRecommendations(ats, exp, flags, r, vacancySkills);
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
      init_quality_recommendations();
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
        hint = '\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435" \u043D\u0438\u0436\u0435.';
      } else if (pageType === "resume-detail") {
        hint = '\u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0412\u0437\u044F\u0442\u044C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B" \u043D\u0438\u0436\u0435.';
      }
      container.innerHTML = '<div class="har-empty">\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E.<br>' + hint + "</div>";
      updateAccordionHeader(null);
      return;
    }
    updateAccordionHeader(r);
    const vis = r.visibility || (r.hidden ? "hidden" : "unknown");
    container.innerHTML = '<div class="tl-item">' + buildPersonalSection(r) + '</div><div class="tl-item">' + buildSalarySection(r) + '</div><div class="tl-item">' + buildExperienceSection(r) + '</div><div class="tl-item">' + buildEducationSection(r) + '</div><div class="tl-item">' + buildLanguagesSection(r) + '</div><div class="tl-item">' + buildContactsSection(r) + "</div>" + (vis === "hidden" ? '<div style="font-size:10px;color:#92400e;padding:6px 4px 0 28px;">\u0421\u043A\u0440\u044B\u0442\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C -- \u043C\u044D\u0442\u0447\u0438\u043D\u0433 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D</div>' : "");
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
    const vacancySkills = collectDetailVacancySkills();
    const result = analyzeResumeQuality(r, vacancySkills);
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
      if (pct >= 80) subtitle.textContent = "\u0421\u0438\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 -- ATS \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442, HR \u0437\u0430\u043C\u0435\u0442\u0438\u0442";
      else if (pct >= 60) subtitle.textContent = "\u0425\u043E\u0440\u043E\u0448\u0435\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 -- \u0435\u0441\u0442\u044C \u0447\u0442\u043E \u0443\u0441\u0438\u043B\u0438\u0442\u044C";
      else if (pct >= 40) subtitle.textContent = "\u0421\u0440\u0435\u0434\u043D\u0435\u0435 -- ATS \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0441\u0435\u044F\u0442\u044C, HR \u043D\u0435 \u0443\u0432\u0438\u0434\u0438\u0442 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438";
      else subtitle.textContent = "\u0421\u043B\u0430\u0431\u043E\u0435 -- \u0432\u044B\u0441\u043E\u043A\u0430\u044F \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0441\u0442\u044C \u043E\u0442\u0441\u0435\u0432\u0430 \u043D\u0430 \u044D\u0442\u0430\u043F\u0435 ATS";
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
          (f) => '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#FEF2F2;border-radius:6px;"><span style="color:#DC2626;flex-shrink:0;margin-top:1px;"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg></span><span style="color:#991B1B;line-height:1.4;">' + esc(f) + "</span></div>"
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
          (s) => '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#F0FDF4;border-radius:6px;"><span style="color:#059669;flex-shrink:0;margin-top:1px;"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></span><span style="color:#166534;line-height:1.4;">' + esc(s) + "</span></div>"
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
          const textSpan = rec.tooltip ? '<span title="' + esc(rec.tooltip) + '" style="cursor:help;border-bottom:1px dashed #a1a1aa;line-height:1.4;">' + esc(rec.text) + "</span>" : '<span style="line-height:1.4;">' + esc(rec.text) + "</span>";
          return '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:' + priorityBg + ";border:" + priorityBorder + ';border-radius:6px;"><span style="color:#D97706;flex-shrink:0;margin-top:1px;"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span><span style="color:' + priorityColor + ';">' + textSpan + "</span></div>";
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
      init_vacancy_skills_collector();
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
      const e2 = el(id);
      if (e2) e2.textContent = val;
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
      <span style="font-size:11px;color:#52525b;">${DAYS[i]}</span>
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
      <span style="font-size:11px;color:#52525b;width:90px;flex-shrink:0;">${s.label}</span>
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
      <div style="font-size:11px;color:#52525b;">${time}</div>
    </div>`;
    container.prepend(entry);
  }
  function renderLog() {
  }
  function clearLog() {
    const container = refs.shadowRoot?.getElementById("activity-log");
    if (container) container.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#52525b;">\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439</div>';
  }
  var DAYS;
  var init_stats2 = __esm({
    "src/ui/tabs/stats.js"() {
      init_state();
      init_html2();
      DAYS = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"];
    }
  });

  // src/parsers/negotiations-thread.js
  function isUserMessage(cell) {
    for (const sel of USER_FLAG_SELECTORS) {
      if (cell.matches && cell.matches(sel)) return true;
      if (cell.querySelector && cell.querySelector(sel)) return true;
    }
    if (cell.classList) {
      for (const cls of cell.classList) {
        if (typeof cls === "string" && /right|outgoing|self|me/.test(cls)) return true;
      }
    }
    return false;
  }
  function extractMessageText(cell) {
    for (const sel of TEXT_SELECTORS) {
      const el = cell.querySelector ? cell.querySelector(sel) : null;
      if (el) {
        const text = safeGetText(el, "");
        if (text) return text;
      }
    }
    return safeGetText(cell, "").trim();
  }
  function extractMessageTime(cell) {
    for (const sel of TIME_SELECTORS) {
      const el = cell.querySelector ? cell.querySelector(sel) : null;
      if (el) {
        const t = safeGetText(el, "") || el.getAttribute?.("datetime") || "";
        if (t) return t;
      }
    }
    return "";
  }
  function isSubElement(el) {
    if (!el || !el.matches) return false;
    for (const sel of TEXT_SELECTORS) {
      try {
        if (el.matches(sel)) return true;
      } catch (_e) {
      }
    }
    for (const sel of TIME_SELECTORS) {
      try {
        if (el.matches(sel)) return true;
      } catch (_e) {
      }
    }
    return false;
  }
  function queryFirstMatch(root, selectors) {
    for (const sel of selectors) {
      try {
        const els = root.querySelectorAll(sel);
        if (els && els.length > 0) {
          return Array.from(els).filter((el) => el && !isSubElement(el));
        }
      } catch (_e) {
      }
    }
    return [];
  }
  function parseChatThread(root) {
    root = root || document;
    if (!root || !root.querySelectorAll) return [];
    const cells = queryFirstMatch(root, MSG_SELECTORS);
    if (!cells || cells.length === 0) return [];
    const messages = [];
    for (const cell of cells) {
      if (!cell) continue;
      const text = extractMessageText(cell);
      if (!text) continue;
      const time = extractMessageTime(cell);
      const from = isUserMessage(cell) ? "user" : "employer";
      messages.push({ from, text, time });
    }
    return messages;
  }
  function extractThreadForAI(messages) {
    if (!Array.isArray(messages)) return [];
    return messages.filter((m) => m && m.text && typeof m.text === "string").map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text
    }));
  }
  function buildStarterPrompt(conv) {
    const vac = conv && conv.vacancyTitle || "\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F";
    const comp = conv && conv.company || "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F";
    return [
      {
        role: "user",
        content: '\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u041F\u0438\u0448\u0443 \u043F\u043E \u043F\u043E\u0432\u043E\u0434\u0443 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 "' + vac + '" \u0432 ' + comp + ". \u0425\u043E\u0442\u0435\u043B \u0431\u044B \u0443\u0437\u043D\u0430\u0442\u044C, \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430 \u043B\u0438 \u0435\u0449\u0451 \u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0438 \u043A\u0430\u043A\u0438\u0435 \u0434\u0430\u043B\u044C\u043D\u0435\u0439\u0448\u0438\u0435 \u0448\u0430\u0433\u0438?"
      }
    ];
  }
  var MSG_SELECTORS, USER_FLAG_SELECTORS, TEXT_SELECTORS, TIME_SELECTORS, _internal3;
  var init_negotiations_thread = __esm({
    "src/parsers/negotiations-thread.js"() {
      init_anti_hallucination();
      MSG_SELECTORS = [
        '[data-qa^="chat-cell-"]',
        '[class*="chat-message"]',
        '[class*="msg-item"]'
      ];
      USER_FLAG_SELECTORS = [
        '[data-qa*="outgoing"]',
        '[data-qa*="-out"]',
        '[class*="msg-out"]',
        '[class*="message-out"]',
        '[class*="self-message"]',
        '[class*="from-me"]'
      ];
      TEXT_SELECTORS = [
        '[data-qa="chat-cell-text"]',
        '[data-qa*="chat-cell-text"]',
        '[class*="msg-text"]',
        '[class*="message-text"]',
        '[class*="msg-body"]'
      ];
      TIME_SELECTORS = [
        '[data-qa="chat-cell-creation-time"]',
        '[data-qa*="creation-time"]',
        "time",
        '[class*="msg-time"]'
      ];
      _internal3 = {
        MSG_SELECTORS,
        USER_FLAG_SELECTORS,
        TEXT_SELECTORS,
        TIME_SELECTORS,
        isUserMessage,
        extractMessageText,
        extractMessageTime
      };
    }
  });

  // src/ui/tabs/negotiations-ai-reply.js
  async function sendBg(msg, msgImpl) {
    const sender = msgImpl || typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage;
    if (!sender) {
      return { ok: false, error: "chrome.runtime.sendMessage unavailable", code: "NO_BG" };
    }
    return new Promise((resolve) => {
      try {
        sender(msg, (resp) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message, code: "BG_ERR" });
          } else {
            resolve(resp || { ok: false, error: "No response", code: "EMPTY_RESP" });
          }
        });
      } catch (e2) {
        resolve({ ok: false, error: e2.message, code: "BG_THROW" });
      }
    });
  }
  async function requestAiReply(conv, tone, impls) {
    const threadRoot = impls && impls.threadRoot || document;
    const msgImpl = impls && impls.msgImpl;
    let history2 = [];
    try {
      const msgs = parseChatThread(threadRoot);
      history2 = extractThreadForAI(msgs);
    } catch (_e) {
      history2 = [];
    }
    const messages = history2.length > 0 ? history2 : buildStarterPrompt(conv);
    const result = await sendBg({
      type: "ai-chat-reply",
      history: messages,
      opts: { tone, variants: 3 }
    }, msgImpl);
    if (!result.ok) return result;
    const variants = Array.isArray(result.variants) ? result.variants.filter((v) => typeof v === "string" && v.trim().length > 0) : [];
    if (variants.length === 0) {
      return { ok: false, error: "AI returned no usable variants", code: "EMPTY_VARIANTS" };
    }
    return { ok: true, variants };
  }
  async function insertVariant(text, opts) {
    const sr = refs.shadowRoot;
    const input = sr?.getElementById("neg-chat-input");
    if (!input || !text) return false;
    const useSim = opts && opts.useSimulation !== void 0 ? opts.useSimulation : true;
    const speed = opts && opts.speedMs || 80;
    if (!useSim) {
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return simulateTyping(input, text, { baseDelay: Math.max(15, speed / 4), jitter: speed });
  }
  function setAiTone(tone) {
    if (!TONES2.find((t) => t.id === tone)) return;
    aiState.tone = tone;
    renderAiReplyArea();
  }
  function _setAiState(next) {
    aiState = { ...aiState, ...next };
  }
  function _getAiState() {
    return { ...aiState };
  }
  function renderAiReplyArea() {
    const sr = refs.shadowRoot;
    const container = sr?.getElementById("neg-ai-reply-area");
    if (!container) return;
    const conv = panelState.negotiations.find((c) => c.id === panelState.activeConversation);
    if (!conv) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }
    container.style.display = "";
    const toneOptions = TONES2.map(
      (t) => `<option value="${t.id}"${t.id === aiState.tone ? " selected" : ""}>${esc(t.label)}</option>`
    ).join("");
    const toneSelect = '<select id="neg-ai-tone" class="input" style="font-size:11px;padding:4px 8px;border:1px solid #e4e4e7;border-radius:6px;">' + toneOptions + "</select>";
    const genBtn = '<button id="neg-ai-generate" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;cursor:pointer;" ' + (aiState.loading ? "disabled" : "") + ">" + (aiState.loading ? "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F..." : "AI: 3 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430") + "</button>";
    const errorBlock = aiState.error ? '<div style="font-size:10px;color:#DC2626;margin-top:6px;padding:4px 6px;background:#FEF2F2;border-radius:4px;">[ERR] ' + esc(aiState.error) + "</div>" : "";
    const variantsHtml = (aiState.variants || []).map((v, i) => {
      const num = i + 1;
      return '<div class="ai-variant-card" data-variant-idx="' + i + '" style="border:1px solid #e4e4e7;border-radius:8px;padding:8px 10px;margin-top:6px;cursor:pointer;background:#FAFAFA;"><div style="font-size:10px;color:#52525b;margin-bottom:4px;">\u0412\u0430\u0440\u0438\u0430\u043D\u0442 ' + num + ' (\u043A\u043B\u0438\u043A \u0434\u043B\u044F \u0432\u0441\u0442\u0430\u0432\u043A\u0438)</div><div style="font-size:11px;line-height:1.5;white-space:pre-wrap;">' + esc(v) + "</div></div>";
    }).join("");
    container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);"><span style="font-size:11px;font-weight:500;">AI-\u043E\u0442\u0432\u0435\u0442:</span>' + toneSelect + genBtn + "</div>" + errorBlock + variantsHtml;
  }
  async function handleAiReplyClick(e2) {
    const genBtn = e2.target.closest && e2.target.closest("#neg-ai-generate");
    if (genBtn && !aiState.loading) {
      aiState.loading = true;
      aiState.error = null;
      aiState.variants = [];
      renderAiReplyArea();
      try {
        const conv = panelState.negotiations.find((c) => c.id === panelState.activeConversation);
        const result = await requestAiReply(conv, aiState.tone);
        if (result.ok) {
          aiState.variants = result.variants;
        } else {
          aiState.error = result.error || result.code || "Unknown error";
        }
      } catch (err) {
        aiState.error = err.message || String(err);
      } finally {
        aiState.loading = false;
        renderAiReplyArea();
      }
      return;
    }
    const card = e2.target.closest && e2.target.closest(".ai-variant-card");
    if (card) {
      const idx = parseInt(card.dataset.variantIdx, 10);
      const text = aiState.variants[idx];
      if (text) {
        const sr = refs.shadowRoot;
        const emulate = sr?.getElementById("neg-type-emulation");
        const speedEl = sr?.getElementById("neg-type-speed");
        const useSim = emulate ? emulate.checked : true;
        const speed = speedEl ? parseInt(speedEl.value, 10) || 80 : 80;
        await insertVariant(text, { useSimulation: useSim, speedMs: speed });
      }
    }
  }
  var TONES2, aiState;
  var init_negotiations_ai_reply = __esm({
    "src/ui/tabs/negotiations-ai-reply.js"() {
      init_state();
      init_html2();
      init_timing();
      init_negotiations_thread();
      TONES2 = [
        { id: "formal", label: "\u0424\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u044B\u0439" },
        { id: "friendly", label: "\u0414\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439" },
        { id: "concise", label: "\u041A\u0440\u0430\u0442\u043A\u0438\u0439" },
        { id: "enthusiastic", label: "\u042D\u043D\u0442\u0443\u0437\u0438\u0430\u0441\u0442" }
      ];
      aiState = {
        loading: false,
        error: null,
        variants: [],
        tone: "formal"
      };
    }
  });

  // src/ui/tabs/negotiations-format.js
  function looksRelative(s) {
    return /\d.*назад/i.test(s) || /^только что$/i.test(s.trim());
  }
  function formatRelativeTime(dateStr, _now = /* @__PURE__ */ new Date()) {
    if (dateStr === void 0 || dateStr === null) return "";
    const s = String(dateStr).trim();
    if (s === "") return "";
    if (/^\d{1,2}:\d{2}$/.test(s)) return "";
    if (HUMAN_PASS_THROUGH.has(s.toLowerCase())) return s;
    if (looksRelative(s)) return s;
    return "";
  }
  var HUMAN_PASS_THROUGH;
  var init_negotiations_format = __esm({
    "src/ui/tabs/negotiations-format.js"() {
      HUMAN_PASS_THROUGH = /* @__PURE__ */ new Set(["\u0432\u0447\u0435\u0440\u0430", "\u0441\u0435\u0433\u043E\u0434\u043D\u044F"]);
    }
  });

  // src/ui/tabs/negotiations-item.js
  function renderNegotiationItem(c) {
    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.unknown;
    const isUnread = c.status === "not-viewed" || c.status === "invite";
    const unreadDot = isUnread ? '<span class="neg-unread-dot" role="img" aria-label="\u0415\u0441\u0442\u044C \u043D\u0435\u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435" title="\u041D\u0435\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043E" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#DC2626;flex-shrink:0;margin-top:5px;"></span>' : "";
    const statusBadge = '<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:' + cfg.bg + ";color:" + cfg.fg + ";border:1px solid " + cfg.border + ';">' + esc(cfg.label) + "</span>";
    const tabBadge = c.tabOrigin && c.tabOrigin !== "all" ? '<span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:3px;background:#F1F5F9;color:#64748B;" title="\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ' + esc(c.tabOrigin) + '">' + esc(c.tabOrigin) + "</span>" : "";
    const alsoIn = c.alsoIn && c.alsoIn.length > 0 ? '<span style="font-size:9px;color:#94A3B8;" title="\u0422\u0430\u043A\u0436\u0435 \u0432: ' + esc(c.alsoIn.join(", ")) + '">[also in: ' + esc(c.alsoIn.join(",")) + "]</span>" : "";
    const vacLink = c.vacancyUrl ? '<a href="' + esc(c.vacancyUrl) + '" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:#050;font-family:Inter,system-ui,sans-serif;text-decoration:none;" data-action="navigate">' + esc(c.vacancyTitle || c.name) + "</a>" : '<span style="font-size:12px;font-weight:600;">' + esc(c.vacancyTitle || c.name) + "</span>";
    const hasStatusText = c.statusText !== void 0 && c.statusText !== null && c.statusText !== "";
    const previewText = hasStatusText ? c.statusText : "(\u043D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439)";
    const previewStyle = hasStatusText ? PREVIEW_STYLE_NORMAL : PREVIEW_STYLE_EMPTY;
    const relTime = formatRelativeTime(c.date);
    const tsSpan = relTime ? '<span style="color:#a1a1aa;">\xB7</span><span style="font-size:11px;color:#a1a1aa;">' + esc(relTime) + "</span>" : "";
    const rawDate = c.date ? '<span style="color:#a1a1aa;">\xB7</span><span>' + esc(c.date) + "</span>" : "";
    return '<div class="conv-item" data-conv-id="' + esc(c.id) + '" tabindex="0" role="button" style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid #f4f4f5;margin-bottom:4px;">' + unreadDot + '<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + vacLink + statusBadge + tabBadge + alsoIn + '</div><div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px;color:#52525b;"><span>' + esc(c.company || "") + "</span>" + rawDate + '</div><div style="display:flex;align-items:center;gap:6px;margin-top:3px;justify-content:space-between;"><span style="flex:1;min-width:0;' + previewStyle + '">' + esc(previewText) + '</span><span style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' + tsSpan + "</span></div></div></div>";
  }
  var PREVIEW_STYLE_NORMAL, PREVIEW_STYLE_EMPTY;
  var init_negotiations_item = __esm({
    "src/ui/tabs/negotiations-item.js"() {
      init_html2();
      init_negotiations_summary();
      init_negotiations_format();
      PREVIEW_STYLE_NORMAL = "font-size:11px;color:#71717A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      PREVIEW_STYLE_EMPTY = "font-size:11px;color:#a1a1aa;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    }
  });

  // src/ui/tabs/negotiations.js
  var negotiations_exports2 = {};
  __export(negotiations_exports2, {
    refreshNegotiations: () => refreshNegotiations,
    renderChatMessages: () => renderChatMessages,
    renderNegotiationList: () => renderNegotiationList,
    setNegotiationStatusFilter: () => setNegotiationStatusFilter,
    setNegotiationTabFilter: () => setNegotiationTabFilter
  });
  function setNegotiationStatusFilter(status) {
    activeStatusFilter = status;
    renderNegotiationList();
  }
  function setNegotiationTabFilter(tab) {
    activeTabFilter = tab;
    renderNegotiationList();
  }
  async function refreshNegotiations() {
    if (isFetching) return;
    isFetching = true;
    setRefreshButtonState(true);
    try {
      await invalidateNegotiationsCache();
      const result = await fetchAllNegotiations({ forceRefresh: true });
      panelState.negotiations = result.items || [];
      panelState.negotiationsMeta = {
        perTab: result.perTab,
        errors: result.errors,
        fetchedAt: result.fetchedAt,
        fromCache: result.fromCache
      };
      renderNegotiationList();
      if (result.errors && result.errors.length > 0) {
        showErrorToast(result.errors.length + " tab(s) failed: " + result.errors.join("; "));
      }
    } catch (err) {
      showErrorToast("Refresh failed: " + (err.message || String(err)));
    } finally {
      isFetching = false;
      setRefreshButtonState(false);
    }
  }
  function setRefreshButtonState(loading) {
    const btn = refs.shadowRoot?.getElementById("neg-refresh-btn");
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "..." : "[R]";
    btn.style.opacity = loading ? "0.5" : "1";
  }
  function showErrorToast(msg) {
    const toast = refs.shadowRoot?.getElementById("neg-error-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = "block";
    toast.style.background = "#FEF2F2";
    toast.style.color = "#DC2626";
    toast.style.border = "1px solid #FECACA";
    toast.style.padding = "6px 10px";
    toast.style.borderRadius = "6px";
    toast.style.fontSize = "11px";
    toast.style.marginBottom = "8px";
    clearTimeout(showErrorToast._t);
    showErrorToast._t = setTimeout(() => {
      toast.style.display = "none";
    }, 5e3);
  }
  function renderNegotiationList() {
    const sr = refs.shadowRoot;
    const list = sr?.getElementById("neg-list");
    const badge = sr?.getElementById("neg-count-badge");
    if (!list) return;
    const convs = panelState.negotiations || [];
    const meta = panelState.negotiationsMeta || {};
    const statusCounts = computeStatusCounts(convs);
    const tabCounts = computeTabOriginCounts(convs);
    if (badge) badge.textContent = formatSummaryText(statusCounts);
    if (convs.length === 0) {
      const emptyMsg = meta.errors && meta.errors.length > 0 ? "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043E\u0442\u043A\u043B\u0438\u043A\u0438 (" + meta.errors.length + " \u043E\u0448\u0438\u0431\u043E\u043A)" : "\u041E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
      list.innerHTML = '<div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">' + esc(emptyMsg) + "</div>";
      return;
    }
    const filtered = convs.filter((c) => {
      if (!c) return false;
      if (activeStatusFilter !== "all" && c.status !== activeStatusFilter) return false;
      if (activeTabFilter !== "all" && c.tabOrigin !== activeTabFilter) return false;
      return true;
    });
    const statusChips = ["all", "invite", "not-viewed", "viewed", "discard"].map((s) => {
      const count = s === "all" ? statusCounts.all : statusCounts[s] || 0;
      if (s !== "all" && count === 0) return "";
      return renderStatusChip(s, count, activeStatusFilter === s);
    }).join("");
    const tabChips = NEGOTIATION_TABS.filter((t) => t.id === "all" || (tabCounts[t.id] || 0) > 0).map((t) => renderTabOriginChip(t.id, tabCounts[t.id] || 0, activeTabFilter === t.id)).join("");
    const refreshBtn = '<button id="neg-refresh-btn" class="btn btn-outline btn-sm" style="font-size:11px;padding:2px 8px;cursor:pointer;" title="\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C">[R]</button>';
    const errorToast = '<div id="neg-error-toast" style="display:none;"></div>';
    const filterRow = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;align-items:center;">${statusChips}${refreshBtn}</div>` + (tabChips ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">${tabChips}</div>` : "") + errorToast;
    const items = filtered.map((c) => renderNegotiationItem(c)).join("");
    const emptyFilter = filtered.length === 0 ? '<div style="padding:16px;text-align:center;font-size:11px;color:#52525b;">\u041D\u0435\u0442 \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u0441 \u0442\u0430\u043A\u0438\u043C\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u043C\u0438</div>' : "";
    list.innerHTML = filterRow + items + emptyFilter;
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
    const cfg = STATUS_CONFIG[conv.status] || STATUS_CONFIG.unknown;
    header.innerHTML = `
    <div>
      <div style="font-size:12px;font-weight:600;">${esc(conv.vacancyTitle || conv.name)}</div>
      <div style="font-size:11px;color:#52525b;">${esc(conv.company || "")}</div>
    </div>
    <span style="margin-left:auto;display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:${cfg.bg};color:${cfg.fg};border:1px solid ${cfg.border};">${esc(cfg.label)}</span>`;
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
        <div style="font-size:11px;font-weight:600;color:#059669;margin-bottom:3px;">${esc(conv.company || conv.name)}</div>
        <div style="font-size:11px;line-height:1.5;">${esc(m.text)}</div>
      </div>
    </div>`;
    }).join("");
    renderAiReplyArea();
  }
  var activeStatusFilter, activeTabFilter, isFetching;
  var init_negotiations3 = __esm({
    "src/ui/tabs/negotiations.js"() {
      init_state();
      init_html2();
      init_negotiations_summary();
      init_negotiations_aggregator();
      init_negotiations_ai_reply();
      init_negotiations_item();
      activeStatusFilter = "all";
      activeTabFilter = "all";
      isFetching = false;
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
      } catch (_e) {
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
      } catch (_e) {
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
      } catch (_e) {
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
      // data-qa selectors (primary -- hh.ru test automation attributes)
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
      } catch (_e) {
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
    } catch (_e) {
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
      } catch (_e) {
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
        console.log("[HH-AR][Auth] Async: sync=authorized, cookies=NO -> false");
        return false;
      }
      return true;
    }
    const cookieResult = await checkCookiesViaBackground();
    if (cookieResult === true) {
      console.log("[HH-AR][Auth] Async: sync=not authorized, cookies=YES -> true (cookie override)");
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
      } catch (_e) {
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
    } catch (_e) {
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
    let text = (el.textContent || "").trim();
    text = text.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ");
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
      visLog2.info("All resumes already detected from link text -- skipping other strategies");
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
    }
    const unknownAfterAll = resumes.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (unknownAfterAll.length > 0) {
      visLog2.info("[VIS-DIAG] List: " + unknownAfterAll.length + " resumes still UNKNOWN -- will be resolved by detail page detection");
      unknownAfterAll.forEach((r) => {
        visLog2.info("[VIS-DIAG]   List: " + r.id.substring(0, 8) + ' "' + (r.title || "").substring(0, 30) + '" -> ' + r.visibility);
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
    fetchLog2.info("Fetching /applicant/resumes ...");
    let html;
    try {
      html = await fetchHtml("https://hh.ru/applicant/resumes");
    } catch (err) {
      fetchLog2.error("Failed to fetch /applicant/resumes: " + err.message);
      return [];
    }
    if (!html || html.length < 500) {
      fetchLog2.warn("Got very short response (" + (html ? html.length : 0) + " chars), likely redirect");
      return [];
    }
    const doc = htmlToDoc(html);
    const allAnchors = doc.querySelectorAll("a[href]");
    fetchLog2.info("Fetched HTML: " + html.length + " chars, " + allAnchors.length + " links");
    const resumes = extractResumeLinks(allAnchors);
    extractVisibilityStatus(doc, resumes, html);
    if (resumes.length === 0) {
      fetchLog2.info("No links found, trying embedded script data...");
      const scriptResumes = extractFromScripts(doc, html);
      if (scriptResumes.length > 0) return scriptResumes;
    }
    if (resumes.length === 0 && window.location.pathname.includes("/applicant/resumes")) {
      fetchLog2.info("No links from fetch, trying current page DOM...");
      const domLinks = document.querySelectorAll("a[href]");
      const domResumes = extractResumeLinks(domLinks);
      if (domResumes.length > 0) {
        fetchLog2.info("Found " + domResumes.length + " resumes from current page DOM");
        return domResumes;
      }
    }
    fetchLog2.info("Resume list: " + resumes.length + " resumes found");
    return resumes;
  }
  var fetchLog2;
  var init_resume_fetch_list = __esm({
    "src/lib/resume-fetch-list.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_list_vis();
      fetchLog2 = createLogger("ResumeFetch");
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
        const phoneMatch = text.match(/(?:\+7|8)[\s-()]?\d{3}[\s-()]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
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
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
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
        const isEmploymentMeta = /тип занятости|формат работы|график работы|полная занятость|частичная занятость|проектная работа|стажировка|удаленная работа|гибридный формат/i.test(t);
        if (!isGender && !isAge && !isEmploymentMeta && !t.includes("\u0440\u0443\u0431") && !t.includes("USD") && !t.includes("\u0437/\u043F") && !t.includes("\u0443\u0440\u043E\u0432\u0435\u043D\u044C") && !t.includes("\u0434\u043E\u0445\u043E\u0434") && t !== resume.salary && t !== resume.title) {
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
        diag.push('S0:visibility-card="\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443" -> HIDDEN');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        return { visibility: VISIBILITY_HIDDEN, trace: diag };
      }
      if (cardText.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C") || cardText.includes("\u0432\u0438\u0434\u043D\u043E\xA0\u0432\u0441\u0435\u043C")) {
        diag.push('S0:visibility-card="\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" -> VISIBLE');
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
        diag.push("S1:data-qa=" + sel + " -> HIDDEN");
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        return { visibility: VISIBILITY_HIDDEN, trace: diag };
      }
    }
    diag.push("S1:no-data-qa-hidden");
    const allButtons = doc.querySelectorAll("button, a");
    const btnDetails = [];
    for (const btn of allButtons) {
      const text = normalizeWs(btn.textContent || "").toLowerCase();
      const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C") || text.includes("\u0432\u0438\u0434\u0438\u043C")) {
        btnDetails.push('"' + text.substring(0, 40) + '"' + (qa ? "[qa=" + qa + "]" : ""));
      }
      if (text.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C")) {
        diag.push('S2:btn="\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C" -> HIDDEN');
        visLog3.info("[VIS-DIAG] " + diag.join(" | "));
        visLog3.info("[VIS-DIAG] All vis-related buttons: " + JSON.stringify(btnDetails));
        return { visibility: VISIBILITY_HIDDEN, trace: diag, btnDetails };
      }
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435")) {
        diag.push('S2:btn="\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435" -> VISIBLE');
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
          diag.push('S3:body has "' + ind + '" @' + pos + " -> HIDDEN");
          break;
        }
      }
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
    if (hasVisibleIndicator(bodyText)) {
      diag.push("S3:body has visible indicator -> VISIBLE");
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
          diag.push('S4:html has "' + ind + '" @' + pos + " -> HIDDEN");
          break;
        }
      }
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
    if (hasVisibleIndicator(htmlNorm)) {
      diag.push("S4:html has visible indicator -> VISIBLE");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push("S4:html-no-indicators");
    const scriptEls = doc.querySelectorAll("script:not([src])");
    const scriptPatterns = [];
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
      diag.push("S5:script=" + scriptPatterns.join(",") + " -> HIDDEN");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_HIDDEN, trace: diag, scriptPatterns };
    }
    diag.push("S5:no-script-patterns");
    const hideLink = doc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
    if (hideLink) {
      const hideQa = hideLink.getAttribute("data-qa") || "";
      diag.push("S6:hide-link qa=" + hideQa + " -> VISIBLE");
      visLog3.info("[VIS-DIAG] " + diag.join(" | "));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push("S6:no-hide-link");
    const allHideBtns = doc.querySelectorAll('[data-qa*="hide"], [data-qa*="hidden"]');
    if (allHideBtns.length > 0) {
      const hideQas = Array.from(allHideBtns).map((b) => b.getAttribute("data-qa")).filter(Boolean);
      diag.push("EXTRA:hide-qa=" + hideQas.join(","));
    }
    diag.push("-> UNKNOWN");
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
        const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
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
  var _fetchLog;
  var init_resume_fetch_experience = __esm({
    "src/lib/resume-fetch-experience.js"() {
      init_anti_hallucination();
      init_resume_fetch_parse();
      _fetchLog = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy4-text.js
  function parseExperienceFromHtmlText(html, alreadyFound) {
    const MONTHS = "\u044F\u043D\u0432\u0430\u0440[\u044C\u0435\u044F]|\u0444\u0435\u0432\u0440\u0430\u043B[\u044C\u044C\u044F]|\u043C\u0430\u0440\u0442[\u0430\u0435]?|\u0430\u043F\u0440\u0435\u043B[\u044C\u044C\u044F]|\u043C\u0430[\u0439\u0438\u044F]|\u0438\u044E\u043D[\u044C\u044C\u044F]|\u0438\u044E\u043B[\u044C\u044C\u044F]|\u0430\u0432\u0433\u0443\u0441\u0442[\u0430\u0435]?|\u0441\u0435\u043D\u0442\u044F\u0431\u0440[\u044C\u044C\u044F]|\u043E\u043A\u0442\u044F\u0431\u0440[\u044C\u044C\u044F]|\u043D\u043E\u044F\u0431\u0440[\u044C\u044C\u044F]|\u0434\u0435\u043A\u0430\u0431\u0440[\u044C\u044C\u044F]";
    const DATE_RANGE_RE = new RegExp(
      "(" + MONTHS + ")\\s*\\d{4}\\s*[\\u2013\\u2014-]\\s*(?:(" + MONTHS + ")\\s*\\d{4}|\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435\\s*\u0432\u0440\u0435\u043C\u044F|\u043F\u043E\\s+\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435\\s+\u0432\u0440\u0435\u043C\u044F)",
      "gi"
    );
    const NUM_DATE_RE = /\d{2}\.\d{4}\s*[\u2013\u2014-]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s+время)/gi;
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
        job.period = start + " -- " + end;
      } else if (start && start.year) {
        const months = ["\u044F\u043D\u0432\u0430\u0440\u044C", "\u0444\u0435\u0432\u0440\u0430\u043B\u044C", "\u043C\u0430\u0440\u0442", "\u0430\u043F\u0440\u0435\u043B\u044C", "\u043C\u0430\u0439", "\u0438\u044E\u043D\u044C", "\u0438\u044E\u043B\u044C", "\u0430\u0432\u0433\u0443\u0441\u0442", "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044C", "\u043E\u043A\u0442\u044F\u0431\u0440\u044C", "\u043D\u043E\u044F\u0431\u0440\u044C", "\u0434\u0435\u043A\u0430\u0431\u0440\u044C"];
        const startStr = (start.month ? months[start.month - 1] + " " : "") + start.year;
        let endStr = "\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F";
        if (end && typeof end === "object" && end.year) {
          endStr = (end.month ? months[end.month - 1] + " " : "") + end.year;
        } else if (end && typeof end === "string" && end.length > 0) {
          endStr = end;
        }
        job.period = startStr + " -- " + endStr;
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
  var _fetchLog2;
  var init_resume_fetch_json_utils = __esm({
    "src/lib/resume-fetch-json-utils.js"() {
      init_anti_hallucination();
      _fetchLog2 = createLogger("ResumeFetch");
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
          } catch (e2) {
            fetchLog4.info("Strategy 5: structured JSON parse failed: " + e2.message);
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
      } catch (_e) {
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
      } catch (_e) {
      }
    }
    return entries;
  }
  var fetchLog4;
  var init_resume_fetch_strategy5_scanners = __esm({
    "src/lib/resume-fetch-strategy5-scanners.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      fetchLog4 = createLogger("ResumeFetch");
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
      fetchLog5.info("Strategy 5: examining script (" + text.length + " chars, first 300: " + text.substring(0, 300).replace(/\n/g, " "));
      const fromStructured = extractExperienceFromStructuredJson(text);
      if (fromStructured.length > 0) {
        fetchLog5.info("Strategy 5: found " + fromStructured.length + " from structured JSON");
        return fromStructured;
      }
      const fromArray = extractExperienceFromArray(text);
      if (fromArray.length > 0) {
        fetchLog5.info("Strategy 5: found " + fromArray.length + " from JSON array scan");
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
            fetchLog5.info("Strategy 5: found " + exp.length + " from window state");
            return exp;
          }
        } catch (e2) {
          fetchLog5.info("Strategy 5: state JSON parse failed: " + e2.message);
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
            fetchLog5.info("Strategy 5: found " + exp.length + " from store pattern");
            return exp;
          }
        } catch (e2) {
          fetchLog5.info("Strategy 5: store JSON parse failed: " + e2.message);
        }
      }
    }
    const deepScan = deepScanForExperience(html);
    if (deepScan.length > 0) {
      fetchLog5.info("Strategy 5: found " + deepScan.length + " from deep scan");
      return deepScan;
    }
    return entries;
  }
  var fetchLog5;
  var init_resume_fetch_strategy5_scripts = __esm({
    "src/lib/resume-fetch-strategy5-scripts.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      init_resume_fetch_strategy5_scanners();
      fetchLog5 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-iframe-vis-dom.js
  function checkVisibilityCard(iframeDoc) {
    const visCard = iframeDoc.querySelector('[data-qa="resume-visibility-card"]');
    if (visCard) {
      const cardText = normalizeWs(visCard.textContent || "").toLowerCase();
      if (cardText.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443") || cardText.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443")) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S0:visibility-card="\u043D\u0435 \u0432\u0438\u0434\u043D\u043E \u043D\u0438\u043A\u043E\u043C\u0443" -> HIDDEN' };
      }
      if (cardText.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C") || cardText.includes("\u0432\u0438\u0434\u043D\u043E\xA0\u0432\u0441\u0435\u043C")) {
        return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S0:visibility-card="\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" -> VISIBLE' };
      }
      return { visibility: null, trace: 'iframe-S0:visibility-card-unknown-text="' + cardText.substring(0, 60) + '"' };
    }
    return { visibility: null, trace: "iframe-S0:no-visibility-card" };
  }
  function checkHiddenDataQa(iframeDoc) {
    for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
      const found = iframeDoc.querySelector(sel);
      if (found) {
        return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S1:data-qa=" + sel + " -> HIDDEN" };
      }
    }
    return { visibility: null, trace: "iframe-S1:no-data-qa-hidden" };
  }
  function checkKeyButtons(allButtons) {
    for (const btn of allButtons) {
      const text = normalizeWs(btn.textContent || "").toLowerCase();
      const qa = (btn.getAttribute("data-qa") || "").toLowerCase();
      if (text.includes("\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C") || qa.includes("make-visible") || qa.includes("show-resume")) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S2:btn="\u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0438\u043C\u044B\u043C" -> HIDDEN' };
      }
      if (text.includes("\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435") || qa.includes("hide-resume") || qa.includes("resume-action-hide")) {
        return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S2:btn="\u0441\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435" -> VISIBLE' };
      }
    }
    return { visibility: null, trace: "iframe-S2:no-key-buttons" };
  }
  function checkHideLink(iframeDoc) {
    const hideLink = iframeDoc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
    if (hideLink) {
      return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S4:hide-link-found -> VISIBLE" };
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
      return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S3:body-has-hidden-indicator -> HIDDEN" };
    }
    if (hasVisibleIndicator(bodyText)) {
      return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S3:body-has-visible-indicator -> VISIBLE" };
    }
    return { visibility: null, trace: "iframe-S3:body-no-indicators" };
  }
  function checkBodyVisibilityText(bodyText) {
    const bodyLower = bodyText.toLowerCase();
    if (bodyLower.includes("\u043D\u0435 \u0432\u0438\u0434\u044F\u0442") || bodyLower.includes("\u043D\u0435\xA0\u0432\u0438\u0434\u044F\u0442") || bodyLower.includes("\u043D\u0435 \u0432\u0438\u0434\u043D\u043E")) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S5:body-has-"\u043D\u0435 \u0432\u0438\u0434\u044F\u0442/\u043D\u0435 \u0432\u0438\u0434\u043D\u043E" -> HIDDEN' };
    }
    if (bodyLower.includes("\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C")) {
      return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S5:body-has-"\u0432\u0438\u0434\u043D\u043E \u0432\u0441\u0435\u043C" -> VISIBLE' };
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
          return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S6:script-has-hidden-pattern -> HIDDEN" };
        }
        if (/"hidden"\s*:\s*false/.test(t) || /"visibility"\s*:\s*"visible"/.test(t)) {
          return { visibility: VISIBILITY_VISIBLE, trace: "iframe-S6:script-has-visible-pattern -> VISIBLE" };
        }
      }
    } catch (e2) {
      return { visibility: null, trace: "iframe-S6:script-check-error(" + e2.message.substring(0, 30) + ")" };
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
          return { visibility: VISIBILITY_HIDDEN, trace: "iframe-S7:notification=" + sel + ' text="' + elText.substring(0, 40) + '" -> HIDDEN' };
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
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S8:action-link href="' + href.substring(0, 60) + '" text="' + linkText.substring(0, 40) + '" -> HIDDEN' };
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
    trace.push("-> UNKNOWN");
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
  async function fetchExpandedExperienceViaIframe(resumeUrl, _currentCount) {
    fetchLog6.info("Strategy 6 iframe: loading " + resumeUrl);
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
      fetchLog6.info("[VIS-DIAG] iframe visibility: " + iframeVisResult.visibility + " (trace: " + iframeVisResult.trace.join(" -> ") + ")");
      const preCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
      const preSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      fetchLog6.info("Strategy 6 iframe: before expand -- " + preCards.length + " company-cards, " + preSteppers.length + " stepper-items");
      const clicked = clickExpandButtons(iframeDoc);
      fetchLog6.info("Strategy 6 iframe: clicked " + clicked + " expand buttons");
      if (clicked > 0) {
        await new Promise((r) => setTimeout(r, 2e3));
      }
      const postCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
      const postSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      fetchLog6.info("Strategy 6 iframe: after expand -- " + postCards.length + " company-cards, " + postSteppers.length + " stepper-items");
      const entries = parseExperienceFromIframeDoc(iframeDoc);
      fetchLog6.info("Strategy 6 iframe: parsed " + entries.length + " experience entries");
      return { entries, iframeVis: iframeVisResult.visibility, iframeVisTrace: iframeVisResult.trace, iframeDiag: iframeVisResult.iframeDiag };
    } finally {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (_e) {
      }
    }
  }
  function buildIframeDiag(iframeDoc, iframe) {
    const diag = {};
    try {
      diag.finalUrl = iframe.contentWindow?.location?.href || "(no access)";
    } catch (e2) {
      diag.finalUrl = "(cross-origin blocked: " + e2.message + ")";
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
    fetchLog6.info("[VIS-IFRAME-DIAG] url=" + diag.finalUrl);
    fetchLog6.info('[VIS-IFRAME-DIAG] title="' + diag.title + '"');
    fetchLog6.info("[VIS-IFRAME-DIAG] bodyLen=" + diag.bodyTextLen);
    fetchLog6.info("[VIS-IFRAME-DIAG] bodySnippet=" + diag.bodyTextSnippet.substring(0, 500));
    fetchLog6.info("[VIS-IFRAME-DIAG] dataQa count=" + allQa.length + ", sample: " + JSON.stringify(diag.dataQaList.slice(0, 20)));
    fetchLog6.info("[VIS-IFRAME-DIAG] actions: " + JSON.stringify(diag.actionTexts));
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
        } catch (_e) {
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
        const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
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
  var fetchLog6;
  var init_resume_fetch_strategy6_iframe = __esm({
    "src/lib/resume-fetch-strategy6-iframe.js"() {
      init_anti_hallucination();
      init_resume_fetch_parse();
      init_resume_constants();
      init_resume_fetch_iframe_vis();
      fetchLog6 = createLogger("ResumeFetch");
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
        fetchLog7.info("Strategy 6: trying API [" + source + "] " + url);
        const resp = await fetch(url, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        if (!resp.ok) {
          fetchLog7.info("Strategy 6: [" + source + "] returned " + resp.status);
          continue;
        }
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await resp.json();
          fetchLog7.info("Strategy 6: [" + source + "] returned JSON with keys: " + (typeof data === "object" ? Object.keys(data).slice(0, 10).join(",") : typeof data));
          const jsonEntries = parseExperienceFromJson(data);
          if (jsonEntries.length > currentCount) {
            fetchLog7.info("Strategy 6: SUCCESS from " + source + " -- got " + jsonEntries.length + " experiences");
            return jsonEntries;
          }
          fetchLog7.info("Strategy 6: [" + source + "] JSON had " + jsonEntries.length + " experiences (need > " + currentCount + ")");
        }
      } catch (err) {
        fetchLog7.info("Strategy 6: [" + source + "] error: " + err.message);
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
        const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
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
  var fetchLog7;
  var init_resume_fetch_strategy6_api = __esm({
    "src/lib/resume-fetch-strategy6-api.js"() {
      init_anti_hallucination();
      init_resume_fetch_json_utils();
      init_resume_fetch_parse();
      init_resume_fetch_strategy4_text();
      fetchLog7 = createLogger("ResumeFetch");
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
      fetchLog8.info('Strategy 6: found expand button: text="' + text.substring(0, 50) + '" data-qa="' + (btn.getAttribute("data-qa") || "") + '" outerHTML=' + btn.outerHTML.substring(0, 200));
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
      fetchLog8.info("Strategy 6: " + url + " returned " + resp.status);
      return null;
    }
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      const jsonEntries = parseExperienceFromJson(data);
      fetchLog8.info("Strategy 6: JSON response had " + jsonEntries.length + " experiences");
      return jsonEntries;
    }
    const expandedHtml = await resp.text();
    const expandedDoc = htmlToDoc(expandedHtml);
    const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog8.info("Strategy 6: HTML response had " + expCards.length + " company-cards, " + stepperItems.length + " stepper-items (" + expandedHtml.length + " chars)");
    if (expCards.length > currentCount || stepperItems.length > currentCount) {
      return parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
    }
    const scriptParsed = parseExperienceFromScripts(expandedDoc, expandedHtml);
    if (scriptParsed.length > currentCount) {
      return scriptParsed;
    }
    return null;
  }
  var fetchLog8;
  var init_resume_fetch_strategy6_urls = __esm({
    "src/lib/resume-fetch-strategy6-urls.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_strategy5_scripts();
      init_resume_fetch_strategy6_api();
      fetchLog8 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-strategy6-expand.js
  async function fetchExpandedExperience(doc, html, resumeId, currentCount, resumeUrl) {
    fetchLog9.info("Strategy 6: starting (currentCount=" + currentCount + ", resumeId=" + (resumeId || "none") + ")");
    let iframeVis = null;
    let iframeVisTrace = null;
    let iframeDiag = null;
    try {
      const iframeResult = await fetchExpandedExperienceViaIframe(resumeUrl, currentCount);
      iframeVis = iframeResult.iframeVis;
      iframeVisTrace = iframeResult.iframeVisTrace;
      iframeDiag = iframeResult.iframeDiag;
      if (iframeResult.entries.length > currentCount) {
        fetchLog9.info("Strategy 6: SUCCESS via iframe -- got " + iframeResult.entries.length + " experiences, vis=" + iframeVis);
        return {
          entries: iframeResult.entries,
          iframeVis,
          iframeVisTrace,
          iframeDiag
        };
      }
      fetchLog9.info("Strategy 6: iframe got " + iframeResult.entries.length + " entries (not more than " + currentCount + "), but visibility=" + iframeVis);
    } catch (err) {
      fetchLog9.info("Strategy 6: iframe approach failed: " + err.message);
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
    fetchLog9.info("Strategy 6: found " + expansionUrls.length + " candidate expansion URLs");
    expansionUrls.forEach((u, i) => {
      fetchLog9.info("  URL " + i + ": " + u.url + " (source: " + u.source + ")");
    });
    for (const { url, source } of expansionUrls) {
      try {
        fetchLog9.info("Strategy 6: fetching [" + source + "] " + url);
        const urlEntries = await tryFetchExpandedUrl(url, currentCount);
        if (urlEntries && urlEntries.length > currentCount) {
          fetchLog9.info("Strategy 6: SUCCESS from " + source + " -- got " + urlEntries.length + " experiences");
          return withVis({ entries: urlEntries });
        }
      } catch (err) {
        fetchLog9.info("Strategy 6: [" + source + "] error: " + err.message);
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
          fetchLog9.info("Strategy 6: trying param [" + source + "] " + url);
          const expandedHtml = await fetchHtml(url);
          const expandedDoc = htmlToDoc(expandedHtml);
          const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
          const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
          fetchLog9.info("Strategy 6: [" + source + "] returned HTML with " + expCards.length + " company-cards, " + stepperItems.length + " stepper-items");
          if (expCards.length > currentCount || stepperItems.length > currentCount) {
            const parsed = parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
            if (parsed.length > currentCount) {
              fetchLog9.info("Strategy 6: SUCCESS from " + source + " -- got " + parsed.length + " experiences");
              return withVis({ entries: parsed });
            }
          }
        } catch (err) {
          fetchLog9.info("Strategy 6: [" + source + "] error: " + err.message);
        }
      }
    }
    fetchLog9.info("Strategy 6: all approaches exhausted, returning current count: " + currentCount + ", vis=" + iframeVis);
    return withVis({ entries: [] });
  }
  var fetchLog9;
  var init_resume_fetch_strategy6_expand = __esm({
    "src/lib/resume-fetch-strategy6-expand.js"() {
      init_anti_hallucination();
      init_resume_fetch_helpers();
      init_resume_fetch_strategy6_iframe();
      init_resume_fetch_strategy6_urls();
      init_resume_fetch_strategy6_api();
      fetchLog9 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-resume-exp-orch.js
  async function parseExperienceFromDoc2(doc, dbg, resume, html, resumeUrl) {
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
      expLog.info("[VIS-DIAG] iframe OVERRIDE: " + (resume.id ? resume.id.substring(0, 8) : "?") + " was " + prevVis + ", iframe says HIDDEN -> overriding");
      resume.visibility = VISIBILITY_HIDDEN;
      resume.hidden = true;
      if (resume._visDiag) {
        resume._visDiag.decision = VISIBILITY_HIDDEN;
        resume._visDiag.decisionReason = "iframe-detected-hidden (overrode " + prevVis + ", was: " + prevReason + ")";
        resume._visDiag.pageTrace = (resume._visDiag.pageTrace || []).concat(iframeVisTrace || []);
      }
    } else if (iframeVis === VISIBILITY_VISIBLE && prevVis === VISIBILITY_UNKNOWN) {
      expLog.info("[VIS-DIAG] iframe OVERRIDE: " + (resume.id ? resume.id.substring(0, 8) : "?") + " was UNKNOWN, iframe says VISIBLE -> overriding");
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
    fetchLog10.info("Pre-parse: " + preExpCards.length + " company-cards, " + preStepperItems.length + " stepper-items, " + (preShowAll ? preShowAll.length : 0) + ' "show all" buttons in HTML');
    const expCardHtml = doc.querySelector('[data-qa="resume-list-card-experience"]');
    if (expCardHtml) {
      fetchLog10.info("ExpCard HTML snippet (first 2000 chars): " + expCardHtml.outerHTML.substring(0, 2e3));
    }
    const MONTHS_RE = /(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}\s*[\u2013\u2014-]\s*(?:(?:январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья])\s*\d{4}|настоящее\s*время|по\s+настоящее\s+время|сейчас|по\s+сейчас)/gi;
    const allDateRanges = html.match(MONTHS_RE) || [];
    fetchLog10.info("Full HTML date ranges: " + allDateRanges.length + " found: " + JSON.stringify(allDateRanges));
    const numDateRanges = html.match(/\d{2}\.\d{4}\s*[\u2013\u2014-]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s*время|сейчас|по\s+сейчас)/gi) || [];
    fetchLog10.info("Numeric date ranges: " + numDateRanges.length + " found: " + JSON.stringify(numDateRanges));
    const scripts = doc.querySelectorAll("script:not([src])");
    let expScriptCount = 0;
    scripts.forEach((s) => {
      const t = s.textContent || "";
      if (/experience|работ[аеы]|компани|должност|career/i.test(t)) {
        expScriptCount++;
        if (expScriptCount <= 3) fetchLog10.info("Script with experience keywords (first 500 chars): " + t.substring(0, 500));
      }
    });
    fetchLog10.info("Scripts with experience keywords: " + expScriptCount + " of " + scripts.length);
  }
  function resolveVisibilityDecision(resume, pageVis, listMeta, visDiagEntry) {
    const listVis = listMeta ? listMeta.visibility : "no-list-meta";
    fetchLog10.info("[VIS-DIAG] === Visibility decision for " + (resume.id ? resume.id.substring(0, 8) : "unknown") + " ===");
    fetchLog10.info("[VIS-DIAG] Sources: page=" + pageVis + ", list=" + listVis);
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
    fetchLog10.info("[VIS-DIAG] Decision: " + visDiagEntry.decision + " (" + visDiagEntry.decisionReason + ")");
  }
  var fetchLog10;
  var init_resume_fetch_resume_diag = __esm({
    "src/lib/resume-fetch-resume-diag.js"() {
      init_anti_hallucination();
      init_resume_constants();
      fetchLog10 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-resume-skills.js
  function parseSkillsFromDoc(doc, dbg, resume) {
    const skillsCard = doc.querySelector('[data-qa="skills-card"]');
    if (skillsCard) {
      resume._debug.found.push('skillsBlock (data-qa="skills-card")');
      _extractSkillsFromDocContainer(skillsCard, doc, dbg, resume);
    } else {
      resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
      const skillsTable = doc.querySelector('[data-qa="skills-table"]');
      if (skillsTable) {
        resume._debug.found.push('skillsBlock (data-qa="skills-table" fallback)');
        _extractSkillsFromDocContainer(skillsTable, doc, dbg, resume);
      }
      if (resume.skills.length === 0) {
        const skillsSection = _findSkillsSectionByHeadingInDoc(doc);
        if (skillsSection) {
          resume._debug.found.push('skillsBlock (heading "\u041D\u0430\u0432\u044B\u043A\u0438" fallback)');
          _extractSkillsFromDocContainer(skillsSection, doc, dbg, resume);
        }
      }
      if (resume.skills.length === 0) {
        const skillElements = doc.querySelectorAll('[data-qa*="skill"]');
        if (skillElements.length > 0) {
          const topContainer = _findTopmostSkillContainerInDoc(skillElements);
          if (topContainer) {
            resume._debug.found.push('skillsBlock (data-qa*="skill" fallback)');
            _extractSkillsFromDocContainer(topContainer, doc, dbg, resume);
          }
        }
      }
      if (resume.skills.length === 0) {
        const magritteSkills = _findMagritteSkillTagsInDoc(doc);
        if (magritteSkills.length > 0) {
          resume._debug.found.push("skillsBlock (Magritte tag scan fallback)");
          for (const text of magritteSkills) {
            if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
              resume.skills.push(text);
            }
          }
        }
      }
    }
    if (resume.skills.length > 0) {
      resume._debug.found.push("skills: " + resume.skills.length + " tags");
    }
  }
  function _extractSkillsFromDocContainer(container, doc, dbg, resume) {
    const skillLevelEls = container.querySelectorAll('[data-qa^="skill-level-title-"]');
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
    container.querySelectorAll(
      '[data-qa^="skill-tag-"], .bloko-tag__text, [data-qa^="resume-skill"], [data-qa*="skill-tag"], [data-qa="skills-element"]'
    ).forEach((tag) => {
      const text = (tag.textContent || "").trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
  }
  function _findSkillsSectionByHeadingInDoc(doc) {
    const headings = doc.querySelectorAll('h2, h3, [data-qa^="resume-block-title"]');
    for (const h of headings) {
      const text = (h.textContent || "").trim().toLowerCase();
      if (text === "\u043D\u0430\u0432\u044B\u043A\u0438" || text.startsWith("\u043D\u0430\u0432\u044B\u043A\u0438") || text === "\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438" || text.startsWith("\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043D\u0430\u0432\u044B\u043A\u0438")) {
        let container = h.parentElement;
        for (let i = 0; i < 4 && container; i++) {
          const tags = container.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"], [data-qa^="resume-skill"]');
          if (tags.length > 0) return container;
          container = container.parentElement;
        }
        let sibling = h.nextElementSibling;
        for (let i = 0; i < 3 && sibling; i++) {
          const tags = sibling.querySelectorAll('.bloko-tag__text, [data-qa^="skill-tag"]');
          if (tags.length > 0) return sibling;
          sibling = sibling.nextElementSibling;
        }
      }
    }
    return null;
  }
  function _findTopmostSkillContainerInDoc(skillElements) {
    const parents = [];
    for (const el of skillElements) {
      let p = el.parentElement;
      while (p && p !== el.ownerDocument.body) {
        parents.push(p);
        p = p.parentElement;
      }
    }
    for (const p of parents) {
      const skillChildren = p.querySelectorAll('[data-qa*="skill"]');
      if (skillChildren.length >= 2 && skillChildren.length <= 200) return p;
    }
    if (skillElements.length > 0) {
      return skillElements[0].closest('[data-qa="resume-block-item"]') || skillElements[0].closest("section") || skillElements[0].parentElement;
    }
    return null;
  }
  function _findMagritteSkillTagsInDoc(doc) {
    const skills = [];
    const tagSelectors = [
      '[data-qa^="resume-skill"]',
      '[data-qa*="skill-tag"]',
      '[data-qa="skills-element"]'
    ];
    for (const sel of tagSelectors) {
      doc.querySelectorAll(sel).forEach((el) => {
        const text = (el.textContent || "").trim();
        if (text && text.length > 1 && text.length < 100) {
          skills.push(text);
        }
      });
    }
    return skills;
  }
  var init_resume_fetch_resume_skills = __esm({
    "src/lib/resume-fetch-resume-skills.js"() {
    }
  });

  // src/lib/resume-fetch-resume.js
  async function fetchAndParseResume(resumeUrl, listMeta) {
    fetchLog11.info("Fetching resume: " + resumeUrl);
    const html = await fetchHtml(resumeUrl);
    const doc = htmlToDoc(html);
    fetchLog11.info("Resume HTML: " + html.length + " chars");
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
      derivedSkills: [],
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
    await parseExperienceFromDoc2(doc, dbg, resume, html, resumeUrl);
    parseEducationFromDocSection(doc, dbg, resume);
    parseLanguagesAndAbout2(doc, dbg, resume);
    parseContactsFromDoc(doc, dbg, resume);
    deriveSkillsFromExperience(resume);
    if (resume._visDiag) resume._visDiag.title = resume.title || "(no title)";
    fetchLog11.info("Parsed: " + resume.title + " | Skills: " + resume.skills.length + " | Derived: " + (resume.derivedSkills ? resume.derivedSkills.length : 0) + " | Exp: " + resume.experience.length + " | Edu: " + resume.education.length);
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
  var fetchLog11;
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
      init_derive_skills();
      init_resume_fetch_resume_skills();
      fetchLog11 = createLogger("ResumeFetch");
    }
  });

  // src/lib/resume-fetch-vis-fallback.js
  function applyVisibilityFallback(results, visDiag) {
    const stillUnknown = results.filter((r) => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length === 0) return;
    const iframeRan = stillUnknown.filter((r) => r._visDiag?.iframeRan);
    const iframeNotRan = stillUnknown.filter((r) => !r._visDiag?.iframeRan);
    if (iframeNotRan.length > 0) {
      fetchLog12.info("[VIS-DIAG] Final fallback: " + iframeNotRan.length + " resumes UNKNOWN (iframe not run) -> defaulting to VISIBLE");
      visDiag.summary.unknownFallbackToVisible = iframeNotRan.length;
      iframeNotRan.forEach((r) => {
        fetchLog12.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" UNKNOWN->VISIBLE (iframe not run)');
        r.visibility = VISIBILITY_VISIBLE;
        r.hidden = false;
        const diagEntry = visDiag.resumes.find((d) => d.id === r.id);
        if (diagEntry) {
          diagEntry.finalVisibility = VISIBILITY_VISIBLE;
          diagEntry.decisionReason += " [FALLBACK: UNKNOWN->VISIBLE, iframe not run]";
        }
      });
    }
    if (iframeRan.length > 0) {
      fetchLog12.info("[VIS-DIAG] Keeping UNKNOWN for " + iframeRan.length + " resumes (iframe ran but returned UNKNOWN)");
      iframeRan.forEach((r) => {
        fetchLog12.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" -> UNKNOWN (iframe ran, no indicators found)');
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
    fetchLog12.info("[VIS-DIAG] === FINAL VISIBILITY SUMMARY ===");
    fetchLog12.info("[VIS-DIAG] Total: " + visDiag.summary.total + ", Visible: " + visDiag.summary.visible + ", Hidden: " + visDiag.summary.hidden + ", Unknown: " + visDiag.summary.unknown + ", Fallbacks: " + visDiag.summary.unknownFallbackToVisible);
    results.forEach((r) => {
      fetchLog12.info("[VIS-DIAG]   " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 30) + '" -> ' + r.visibility);
    });
    window.__hhVisDiag = visDiag;
    try {
      window.postMessage({ type: "HH-AR-VISDIAG", payload: visDiag }, "*");
    } catch (e2) {
      fetchLog12.warn("[VIS-DIAG] Could not send to page world: " + e2.message);
    }
    fetchLog12.info("[VIS-DIAG] Diagnostic dump available: __hhVis() / __hhVisTable() / window.__hhVisDiag");
  }
  var fetchLog12;
  var init_resume_fetch_vis_fallback = __esm({
    "src/lib/resume-fetch-vis-fallback.js"() {
      init_anti_hallucination();
      init_resume_constants();
      fetchLog12 = createLogger("ResumeFetch");
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
    fetchLog13.info("syncAllResumes: starting ...");
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
        fetchLog13.warn("syncAllResumes: no resumes found");
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
        fetchLog13.info("syncAllResumes: " + visibleCount + " visible, " + hiddenCount + " hidden");
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
          else fetchLog13.warn("No id for " + item.url);
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
          fetchLog13.error("Failed: " + item.url + ": " + err.message);
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
      fetchLog13.info("Done. " + results.length + "/" + list.length + " parsed");
      if (onProgress) onProgress(list.length, list.length, "\u0413\u043E\u0442\u043E\u0432\u043E");
      if (onComplete) onComplete(results);
      return results;
    } catch (err) {
      fetchLog13.error("Fatal: " + err.message);
      visDiag.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      visDiag.error = err.message;
      window.__hhVisDiag = visDiag;
      try {
        window.postMessage({ type: "HH-AR-VISDIAG", payload: visDiag }, "*");
      } catch (_e) {
      }
      if (onError) onError(null, err);
      throw err;
    }
  }
  var fetchLog13;
  var init_resume_fetch = __esm({
    "src/lib/resume-fetch.js"() {
      init_anti_hallucination();
      init_timing();
      init_resume_fetch_list();
      init_resume_fetch_resume();
      init_resume_fetch_vis_fallback();
      fetchLog13 = createLogger("ResumeFetch");
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

  // src/ui/tabs/settings.js
  function renderBlacklist() {
    const list = refs.shadowRoot?.getElementById("bl-list");
    const badge = refs.shadowRoot?.getElementById("bl-count-badge");
    if (!list) return;
    const bl = panelState.blacklist || [];
    if (badge) badge.textContent = bl.length + " " + declension2(bl.length, ["\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F", "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438", "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0439"]);
    if (bl.length === 0) {
      list.innerHTML = '<div style="padding:8px;text-align:center;font-size:11px;color:#52525b;">\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442</div>';
      return;
    }
    list.innerHTML = bl.map(
      (name) => `<div class="bl-item" data-bl-name="${esc(name)}">
      <span style="font-size:12px;">${esc(name)}</span>
      <button class="btn-bl-del" data-bl-remove="${esc(name)}" aria-label="\u0423\u0434\u0430\u043B\u0438\u0442\u044C ${esc(name)} \u0438\u0437 \u0447\u0451\u0440\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
    </div>`
    ).join("");
  }
  function renderSettingsValues() {
    const el = (id) => refs.shadowRoot?.getElementById(id);
    if (!el) return;
    const set = (id, val) => {
      const e2 = el(id);
      if (e2) e2.value = val;
    };
    const chk = (id, val) => {
      const e2 = el(id);
      if (e2) e2.checked = val;
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
    items.forEach((item) => {
      const title = (item.dataset.title || "").toLowerCase();
      const itemStatus = item.dataset.status || "new";
      const itemScore = parseInt(item.dataset.score || "0", 10);
      const matchTitle = !search || title.includes(search);
      const matchStatus = status === "all" || itemStatus === status;
      const matchScore = itemScore >= minScore;
      item.style.display = matchTitle && matchStatus && matchScore ? "" : "none";
    });
  }
  var init_helpers2 = __esm({
    "src/ui/panel/helpers.js"() {
      init_state();
      init_settings2();
      init_stats2();
      init_negotiations3();
    }
  });

  // src/lib/tour-tooltip.js
  function getPanel() {
    return refs.shadowRoot?.querySelector(".fab-panel") || null;
  }
  function getTooltip() {
    return tooltip;
  }
  function removeTooltip() {
    const panel = getPanel();
    if (tooltip && panel?.contains(tooltip)) panel.removeChild(tooltip);
    tooltip = null;
  }
  function renderTooltip(targetEl, step, idx, stepsLen) {
    removeTooltip();
    const panel = getPanel();
    if (!panel) {
      console.warn("[Tour] renderTooltip: no .fab-panel");
      return;
    }
    tooltip = document.createElement("div");
    tooltip.className = "hh-tour-tooltip";
    tooltip.innerHTML = buildTooltipHTML(step, idx, stepsLen);
    tooltip.style.cssText = "position:absolute;z-index:" + (TOUR_Z + 2) + ";visibility:hidden;top:0;left:0;pointer-events:auto;";
    panel.appendChild(tooltip);
    console.log("[Tour] renderTooltip appended, target=", step.target, "pos=", step.position || "auto");
    requestAnimationFrame(() => {
      const targetRect = targetEl.getBoundingClientRect();
      const pos = step.position || autoPosition(targetRect);
      positionTooltip(tooltip, targetRect, pos);
      tooltip.style.visibility = "visible";
      console.log("[Tour] tooltip visible -- positioned and shown");
    });
  }
  function renderCenteredTooltip(step, idx, stepsLen) {
    removeTooltip();
    const panel = getPanel();
    if (!panel) {
      console.warn("[Tour] renderCenteredTooltip: no .fab-panel");
      return;
    }
    tooltip = document.createElement("div");
    tooltip.className = "hh-tour-tooltip";
    tooltip.innerHTML = buildTooltipHTML(step, idx, stepsLen);
    tooltip.style.cssText = "position:absolute;z-index:" + (TOUR_Z + 2) + ";top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:auto;";
    panel.appendChild(tooltip);
    console.log("[Tour] renderCenteredTooltip done");
  }
  function buildTooltipHTML(step, idx, stepsLen) {
    const isLast = idx === stepsLen - 1;
    const isFirst = idx === 0;
    const counter = idx + 1 + "/" + stepsLen;
    return '<div class="hh-tour-header"><span class="hh-tour-counter">' + counter + '</span><button class="hh-tour-skip" data-tour="skip">\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C</button></div>' + (step.title ? '<div class="hh-tour-title">' + step.title + "</div>" : "") + '<div class="hh-tour-text">' + step.text + '</div><div class="hh-tour-footer">' + (isFirst ? "" : '<button class="hh-tour-prev" data-tour="prev">\u2190 \u041D\u0430\u0437\u0430\u0434</button>') + '<button class="hh-tour-next" data-tour="next">' + (isLast ? "\u0413\u043E\u0442\u043E\u0432\u043E \u2713" : "\u0414\u0430\u043B\u0435\u0435 \u2192") + "</button></div>";
  }
  function positionTooltip(tipEl, targetRect, pos) {
    const panel = getPanel();
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const tipRect = tipEl.getBoundingClientRect();
    const tTop = targetRect.top - panelRect.top;
    const tBottom = targetRect.bottom - panelRect.top;
    const tLeft = targetRect.left - panelRect.left;
    const gap = 12;
    let top, left;
    if (pos === "bottom") {
      top = tBottom + gap;
      left = tLeft + targetRect.width / 2 - tipRect.width / 2;
    } else if (pos === "top") {
      top = tTop - tipRect.height - gap;
      left = tLeft + targetRect.width / 2 - tipRect.width / 2;
    } else if (pos === "left") {
      top = tTop + targetRect.height / 2 - tipRect.height / 2;
      left = tLeft - tipRect.width - gap;
    } else if (pos === "right") {
      top = tTop + targetRect.height / 2 - tipRect.height / 2;
      left = targetRect.right - panelRect.left + gap;
    } else {
      top = panelRect.height / 2 - tipRect.height / 2;
      left = panelRect.width / 2 - tipRect.width / 2;
    }
    left = Math.max(8, Math.min(left, panelRect.width - tipRect.width - 8));
    top = Math.max(8, Math.min(top, panelRect.height - tipRect.height - 8));
    tipEl.style.top = top + "px";
    tipEl.style.left = left + "px";
    console.log(
      "[Tour] positionTooltip: top=",
      Math.round(top),
      "left=",
      Math.round(left),
      "tipW=",
      Math.round(tipRect.width),
      "tipH=",
      Math.round(tipRect.height),
      "panelW=",
      Math.round(panelRect.width),
      "panelH=",
      Math.round(panelRect.height)
    );
  }
  function autoPosition(rect) {
    const panel = getPanel();
    if (!panel) return "bottom";
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = panelRect.bottom - rect.bottom;
    const spaceAbove = rect.top - panelRect.top;
    return spaceBelow > 200 ? "bottom" : spaceAbove > 200 ? "top" : "right";
  }
  var TOUR_Z, tooltip;
  var init_tour_tooltip = __esm({
    "src/lib/tour-tooltip.js"() {
      init_state();
      TOUR_Z = 9999999;
      tooltip = null;
    }
  });

  // src/lib/tour-engine.js
  function startTour(tourSteps, onFinish) {
    if (overlay) endTour(false);
    steps = tourSteps;
    currentStep = 0;
    onDone = onFinish || null;
    console.log("[Tour] startTour, steps=", steps.length, "shadowRoot=", !!refs.shadowRoot);
    createOverlay();
    showStep(0);
  }
  function isTourDone() {
    try {
      return localStorage.getItem(STORAGE_KEY2) === "v1";
    } catch {
      return false;
    }
  }
  function markTourDone() {
    try {
      localStorage.setItem(STORAGE_KEY2, "v1");
    } catch {
    }
  }
  function restartTour(tourSteps, onFinish) {
    try {
      localStorage.removeItem(STORAGE_KEY2);
    } catch {
    }
    startTour(tourSteps, onFinish);
  }
  function endTour(save = true) {
    if (save) markTourDone();
    removeOverlay();
    steps = [];
    currentStep = 0;
    if (onDone) {
      onDone();
      onDone = null;
    }
  }
  function isTourActive() {
    return overlay !== null;
  }
  function createOverlay() {
    const panel = refs.shadowRoot?.querySelector(".fab-panel");
    if (!panel) {
      console.warn("[Tour] createOverlay: no .fab-panel");
      return;
    }
    if (!panel.style.position) panel.style.position = "fixed";
    overlay = document.createElement("div");
    overlay.className = "hh-tour-overlay";
    overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.45);transition:opacity 0.2s;";
    spotlight = document.createElement("div");
    spotlight.className = "hh-tour-spotlight";
    spotlight.style.cssText = "position:absolute;border-radius:6px;box-shadow:0 0 0 4px rgba(59,130,246,0.5),0 0 20px rgba(59,130,246,0.2);transition:all 0.3s ease;pointer-events:none;";
    panel.appendChild(overlay);
    panel.appendChild(spotlight);
    console.log("[Tour] createOverlay: overlay+spotlight added to .fab-panel");
    overlay.addEventListener("click", () => endTour(true));
  }
  function removeOverlay() {
    const panel = refs.shadowRoot?.querySelector(".fab-panel");
    if (overlay && panel?.contains(overlay)) panel.removeChild(overlay);
    if (spotlight && panel?.contains(spotlight)) panel.removeChild(spotlight);
    removeTooltip();
    overlay = spotlight = null;
  }
  function showStep(idx) {
    if (idx < 0 || idx >= steps.length) {
      endTour(true);
      return;
    }
    currentStep = idx;
    const step = steps[idx];
    console.log("[Tour] showStep", idx, "target=", step.target, "tab=", step.tab);
    if (step.tab) switchToTab(step.tab);
    setTimeout(() => {
      const el = findTarget(step.target);
      console.log("[Tour] findTarget(", step.target, ") =", el ? el.tagName + "." + (el.className || "") : "NULL");
      if (el) {
        positionSpotlight(el);
        renderTooltip(el, step, idx, steps.length);
      } else {
        renderCenteredTooltip(step, idx, steps.length);
      }
    }, step.tab ? 150 : 30);
  }
  function findTarget(selector) {
    const root = refs.shadowRoot;
    if (!root) return null;
    return root.querySelector(selector) || document.querySelector(selector);
  }
  function positionSpotlight(el) {
    const panel = refs.shadowRoot?.querySelector(".fab-panel");
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const pad = 4;
    spotlight.style.top = elRect.top - panelRect.top - pad + "px";
    spotlight.style.left = elRect.left - panelRect.left - pad + "px";
    spotlight.style.width = elRect.width + pad * 2 + "px";
    spotlight.style.height = elRect.height + pad * 2 + "px";
  }
  function switchToTab(tabId) {
    const root = refs.shadowRoot;
    if (!root) return;
    root.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    root.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
    const btn = root.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    const section = root.querySelector("#tab-" + tabId);
    if (btn) btn.classList.add("active");
    if (section) section.classList.add("active");
  }
  function handleTourClick(e2) {
    const btn = e2.target.closest("[data-tour]");
    if (!btn) return;
    const action = btn.getAttribute("data-tour");
    if (action === "next") showStep(currentStep + 1);
    else if (action === "prev") showStep(currentStep - 1);
    else if (action === "skip") endTour(true);
  }
  function bindTourEvents() {
    if (_tourEventsBound) return;
    const root = refs.shadowRoot;
    if (root) {
      root.addEventListener("click", handleTourClick);
      _tourEventsBound = true;
    }
  }
  function handleTourKeydown(e2) {
    if (e2.key === "Escape" && overlay) {
      endTour(true);
    }
  }
  var STORAGE_KEY2, currentStep, steps, overlay, spotlight, onDone, _tourEventsBound;
  var init_tour_engine = __esm({
    "src/lib/tour-engine.js"() {
      init_state();
      init_tour_tooltip();
      STORAGE_KEY2 = "hh-copilot-tour-done";
      currentStep = 0;
      steps = [];
      overlay = null;
      spotlight = null;
      onDone = null;
      _tourEventsBound = false;
      if (typeof document !== "undefined") {
        document.addEventListener("click", handleTourClick);
        document.addEventListener("keydown", handleTourKeydown);
      }
    }
  });

  // src/lib/tour-steps.js
  function getWelcomeTourSteps() {
    return [
      // -- Welcome --
      {
        target: ".har-tabbar",
        tab: "overview",
        title: "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 HH Copilot!",
        text: "6 \u0432\u043A\u043B\u0430\u0434\u043E\u043A \u043F\u043E\u043C\u043E\u0433\u0430\u044E\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A \u0440\u0430\u0431\u043E\u0442\u044B \u043D\u0430 hh.ru. \u041F\u0440\u043E\u0439\u0434\u0451\u043C\u0441\u044F \u043F\u043E \u043A\u0430\u0436\u0434\u043E\u0439 -- \u044D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442 \u043C\u0438\u043D\u0443\u0442\u0443.",
        position: "bottom"
      },
      // -- Overview --
      {
        target: "#kpi-daily-count",
        tab: "overview",
        title: "\u041E\u0431\u0437\u043E\u0440: \u043B\u0438\u043C\u0438\u0442\u044B",
        text: "\u041A\u043E\u043B\u044C\u0446\u0435\u0432\u0430\u044F \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0441\u0435\u0433\u043E\u0434\u043D\u044F. hh.ru \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u043E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432 -- Copilot \u0441\u043B\u0435\u0434\u0438\u0442 \u0437\u0430 \u043B\u0438\u043C\u0438\u0442\u0430\u043C\u0438.",
        position: "bottom"
      },
      {
        target: '[data-action="apply-all"]',
        tab: "overview",
        title: "\u041E\u0431\u0437\u043E\u0440: \u043C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A",
        text: "\u041E\u0434\u043D\u0430 \u043A\u043D\u043E\u043F\u043A\u0430 -- \u0438 Copilot \u043E\u0442\u043A\u043B\u0438\u043A\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u0432\u0441\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0441 \u0432\u0430\u0448\u0438\u043C \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u043F\u0438\u0441\u044C\u043C\u043E\u043C.",
        position: "bottom"
      },
      // -- Resume --
      {
        target: '[data-action="sync-resumes"]',
        tab: "resume",
        title: "\u0420\u0435\u0437\u044E\u043C\u0435: \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
        text: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0432\u0441\u0435 \u0432\u0430\u0448\u0438 \u0440\u0435\u0437\u044E\u043C\u0435 \u0441 hh.ru. Copilot \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 \u0438\u0445 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0438 \u043C\u044D\u0442\u0447\u0438\u043D\u0433\u0430 \u0441 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F\u043C\u0438.",
        position: "bottom"
      },
      {
        target: "#res-score-ring",
        tab: "resume",
        title: "\u0420\u0435\u0437\u044E\u043C\u0435: \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E",
        text: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0442\u043E\u0433\u043E, \u043A\u0430\u043A \u0432\u0430\u0448\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0434\u043B\u044F ATS \u0438 HR: ATS-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C, \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u043F\u044B\u0442\u0430, \u043A\u0440\u0430\u0441\u043D\u044B\u0435 \u0444\u043B\u0430\u0433\u0438 \u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438.",
        position: "left"
      },
      // -- Vacancies --
      {
        target: '[data-action="refresh"]',
        tab: "vacancies",
        title: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438: \u043F\u0430\u0440\u0441\u0438\u043D\u0433",
        text: "\u041D\u0430\u0445\u043E\u0434\u044F\u0441\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u043F\u043E\u0438\u0441\u043A\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u044D\u0442\u0443 \u043A\u043D\u043E\u043F\u043A\u0443 -- Copilot \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u0432\u0441\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0438 \u043E\u0446\u0435\u043D\u0438\u0442 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 \u0441 \u0432\u0430\u0448\u0438\u043C \u0440\u0435\u0437\u044E\u043C\u0435.",
        position: "bottom"
      },
      {
        target: "#vac-status-filter",
        tab: "vacancies",
        title: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438: \u0444\u0438\u043B\u044C\u0442\u0440\u044B",
        text: "\u0424\u0438\u043B\u044C\u0442\u0440\u0443\u0439\u0442\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0443, \u043F\u043E\u0438\u0441\u043A\u0443 \u0438 \u043E\u0446\u0435\u043D\u043A\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F. \u0412\u044B\u0441\u043E\u043A\u043E\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 = \u0441\u0442\u043E\u0438\u0442 \u043E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F.",
        position: "bottom"
      },
      {
        target: "#mass-start-btn",
        tab: "vacancies",
        title: "\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438: \u043C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A",
        text: "\u041F\u043E\u0441\u043B\u0435 \u043F\u0430\u0440\u0441\u0438\u043D\u0433\u0430 -- \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043C\u0430\u0441\u0441\u043E\u0432\u044B\u0439 \u043E\u0442\u043A\u043B\u0438\u043A. Copilot \u0441\u0430\u043C \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442 \u0444\u043E\u0440\u043C\u044B \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442.",
        position: "top"
      },
      // -- Negotiations --
      {
        target: "#neg-list",
        tab: "negotiations",
        title: "\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B: \u0447\u0430\u0442",
        text: "\u0412\u0441\u0435 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0438 \u0441 \u0440\u0430\u0431\u043E\u0442\u043E\u0434\u0430\u0442\u0435\u043B\u044F\u043C\u0438 \u0432 \u043E\u0434\u043D\u043E\u043C \u043C\u0435\u0441\u0442\u0435. \u041E\u0442\u0432\u0435\u0447\u0430\u0439\u0442\u0435 \u043F\u0440\u044F\u043C\u043E \u0438\u0437 \u0441\u0430\u0439\u0434\u0431\u0430\u0440\u0430 -- \u043D\u0435 \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u044C\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0432\u043A\u043B\u0430\u0434\u043A\u0430\u043C\u0438 hh.ru.",
        position: "left"
      },
      {
        target: "#cover-letter-text",
        tab: "negotiations",
        title: "\u041F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B: \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435",
        text: "\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0438\u0441\u044C\u043C\u0430 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u043E\u0442\u043A\u043B\u0438\u043A\u0435. \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0441\u0435\u0431\u044F.",
        position: "top"
      },
      // -- Settings --
      {
        target: "#s-daily-limit",
        tab: "settings",
        title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438: \u043B\u0438\u043C\u0438\u0442\u044B",
        text: "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C\u044E \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432: \u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0438 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043B\u0438\u043C\u0438\u0442\u044B, \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u043C\u0435\u0436\u0434\u0443 \u043E\u0442\u043A\u043B\u0438\u043A\u0430\u043C\u0438. \u0417\u0430\u0449\u0438\u0442\u0430 \u043E\u0442 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 hh.ru.",
        position: "bottom"
      },
      {
        target: "#bl-input",
        tab: "settings",
        title: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438: \u0447\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A",
        text: "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438, \u0432 \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0435 \u0445\u043E\u0442\u0438\u0442\u0435 \u043E\u0442\u043A\u043B\u0438\u043A\u0430\u0442\u044C\u0441\u044F. Copilot \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442 \u0438\u0445 \u043F\u0440\u0438 \u043C\u0430\u0441\u0441\u043E\u0432\u043E\u043C \u043E\u0442\u043A\u043B\u0438\u043A\u0435.",
        position: "bottom"
      },
      // -- Stats --
      {
        target: "#stat-chart",
        tab: "stats",
        title: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430: \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430",
        text: "\u0413\u0440\u0430\u0444\u0438\u043A\u0438 \u043E\u0442\u043A\u043B\u0438\u043A\u043E\u0432, \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439 \u0438 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438 \u043F\u043E \u0434\u043D\u044F\u043C \u0438 \u043D\u0435\u0434\u0435\u043B\u044F\u043C. \u041F\u043E\u043D\u0438\u043C\u0430\u0439\u0442\u0435, \u0447\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442, \u0430 \u0447\u0442\u043E \u043D\u0435\u0442.",
        position: "top"
      },
      {
        target: "#activity-log",
        tab: "stats",
        title: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430: \u043B\u043E\u0433 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439",
        text: "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 \u043B\u043E\u0433 \u0432\u0441\u0435\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439: \u043E\u0442\u043A\u043B\u0438\u043A\u0438, \u043E\u0448\u0438\u0431\u043A\u0438, \u043A\u0430\u043F\u0447\u0438, \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u044F. \u041F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u043D\u0430\u0434 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u043E\u043C.",
        position: "top"
      },
      // -- Final --
      {
        target: ".har-tabbar",
        tab: "overview",
        title: "\u0412\u0441\u0451!",
        text: '\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0437\u043D\u0430\u0435\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438. \u041A\u043D\u043E\u043F\u043A\u0430 "?" \u0432 \u0448\u0430\u043F\u043A\u0435 -- \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u0442\u0443\u0440 \u0437\u0430\u043D\u043E\u0432\u043E. \u0423\u0434\u0430\u0447\u0438 \u0432 \u043F\u043E\u0438\u0441\u043A\u0435!',
        position: "bottom"
      }
    ];
  }
  function getTabTourSteps(tabId) {
    const allSteps = getWelcomeTourSteps();
    return allSteps.filter((s) => s.tab === tabId);
  }
  var init_tour_steps = __esm({
    "src/lib/tour-steps.js"() {
    }
  });

  // src/ui/panel/sidebar-events.js
  function bindSidebarClicks(container) {
    container.addEventListener("click", (e2) => {
      const t = e2.target;
      if (t.closest('[data-action="close-panel"]')) {
        toggleSidebar();
        return;
      }
      if (t.closest("#authIndicator")) {
        resetAuthCache();
        updateAuthStateAsync();
        return;
      }
      if (t.closest('[data-action="start-tour"]')) {
        const activeTab = refs.shadowRoot?.querySelector(".tab-btn.active");
        const tabId = activeTab?.dataset.tab;
        restartTour(tabId ? getTabTourSteps(tabId) : getWelcomeTourSteps());
        return;
      }
      const toggleIrr = t.closest('[data-action="toggle-irrelevant"]');
      if (toggleIrr) {
        const irrList = toggleIrr.parentElement?.querySelector(".irrelevant-list");
        const chevron = toggleIrr.querySelector(".irrelevant-chevron");
        if (irrList) {
          const isHidden = irrList.style.display === "none";
          irrList.style.display = isHidden ? "" : "none";
          if (chevron) chevron.style.transform = isHidden ? "rotate(180deg)" : "";
        }
        return;
      }
      const applyBtn = t.closest('[data-action="apply"]');
      if (applyBtn) {
        e2.preventDefault();
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
      const navLink = t.closest('[data-action="navigate"]');
      if (navLink) {
        e2.preventDefault();
        const href = navLink.getAttribute("href");
        if (href) {
          toggleSidebar();
          window.location.href = href;
        }
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
          const onDone2 = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-load-resume-done", onDone2);
          };
          window.addEventListener("hh-ar-load-resume-done", onDone2);
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
          const onDone2 = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-load-resume-done", onDone2);
          };
          window.addEventListener("hh-ar-load-resume-done", onDone2);
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            window.removeEventListener("hh-ar-load-resume-done", onDone2);
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
          const onDone2 = () => {
            setTimeout(() => {
              btn.disabled = false;
              btn.innerHTML = origHTML;
            }, 300);
            window.removeEventListener("hh-ar-sync-done", onDone2);
          };
          window.addEventListener("hh-ar-sync-done", onDone2);
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            window.removeEventListener("hh-ar-sync-done", onDone2);
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
    container.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        if (e2.target.closest("#authIndicator")) {
          e2.preventDefault();
          resetAuthCache();
          updateAuthStateAsync();
          return;
        }
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
      init_tour_engine();
      init_tour_steps();
    }
  });

  // src/ui/panel/ai-settings.js
  async function sendBg2(msg, msgImpl) {
    const sender = msgImpl || typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage;
    if (typeof sender !== "function") {
      return { ok: false, error: "chrome.runtime.sendMessage unavailable", code: "NO_BG" };
    }
    return new Promise((resolve) => {
      try {
        sender(msg, (resp) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message, code: "BG_ERR" });
          } else {
            resolve(resp || { ok: false, error: "No response", code: "EMPTY_RESP" });
          }
        });
      } catch (e2) {
        resolve({ ok: false, error: e2.message || String(e2), code: "BG_THROW" });
      }
    });
  }
  async function loadAiConfig(msgImpl) {
    const result = await sendBg2({ type: "ai-get-config" }, msgImpl);
    if (!result || result.ok === false) {
      return { ok: false, error: result && result.error || "BG returned no data", code: result && result.code || "EMPTY_RESP" };
    }
    const cfg = result.config || (result.baseUrl !== void 0 ? result : null);
    if (!cfg) {
      return { ok: false, error: "BG returned no config", code: "EMPTY_RESP" };
    }
    return {
      ok: true,
      config: {
        baseUrl: cfg.baseUrl || "https://internal-api.z.ai/v1",
        apiKey: cfg.apiKey || "Z.ai",
        token: cfg.token || "",
        chatId: cfg.chatId || "",
        userId: cfg.userId || "",
        model: cfg.model || "glm-4.5",
        timeoutMs: cfg.timeoutMs || 6e4
      }
    };
  }
  async function saveAiConfig(partial, msgImpl) {
    if (!partial || typeof partial !== "object") {
      return { ok: false, error: "partial must be an object", code: "BAD_INPUT" };
    }
    const result = await sendBg2({ type: "ai-set-config", config: partial }, msgImpl);
    if (!result || result.ok === false) {
      return { ok: false, error: result && result.error || "BG save failed", code: result && result.code || "EMPTY_RESP" };
    }
    return { ok: true };
  }
  async function populateAiFields(msgImpl) {
    const sr = refs.shadowRoot;
    if (!sr) return false;
    const result = await loadAiConfig(msgImpl);
    if (!result.ok) {
      setFieldValue(sr, "s-ai-base-url", "https://internal-api.z.ai/v1");
      setFieldValue(sr, "s-ai-api-key", "Z.ai");
      setFieldValue(sr, "s-ai-token", "");
      setFieldValue(sr, "s-ai-chat-id", "");
      setFieldValue(sr, "s-ai-user-id", "");
      setFieldValue(sr, "s-ai-model", "glm-4.5");
      setFieldValue(sr, "s-ai-timeout", "60000");
      return false;
    }
    setFieldValue(sr, "s-ai-base-url", result.config.baseUrl);
    setFieldValue(sr, "s-ai-api-key", result.config.apiKey);
    setFieldValue(sr, "s-ai-token", result.config.token);
    setFieldValue(sr, "s-ai-chat-id", result.config.chatId);
    setFieldValue(sr, "s-ai-user-id", result.config.userId);
    setFieldValue(sr, "s-ai-model", result.config.model);
    setFieldValue(sr, "s-ai-timeout", String(result.config.timeoutMs || 6e4));
    return true;
  }
  function setFieldValue(sr, id, value) {
    const el = sr.getElementById(id);
    if (el) el.value = value || "";
  }
  function getFieldValue(sr, id) {
    const el = sr.getElementById(id);
    return el ? el.value || "" : "";
  }
  function readAiFields() {
    const sr = refs.shadowRoot;
    if (!sr) return { baseUrl: "", apiKey: "", token: "", chatId: "", userId: "", model: "", timeoutMs: 6e4 };
    const timeoutStr = getFieldValue(sr, "s-ai-timeout");
    const timeoutMs = Number(timeoutStr);
    return {
      baseUrl: getFieldValue(sr, "s-ai-base-url"),
      apiKey: getFieldValue(sr, "s-ai-api-key"),
      token: getFieldValue(sr, "s-ai-token"),
      chatId: getFieldValue(sr, "s-ai-chat-id"),
      userId: getFieldValue(sr, "s-ai-user-id"),
      model: getFieldValue(sr, "s-ai-model"),
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 6e4
    };
  }
  function bindAiSettingsHandlers(container, opts) {
    if (!container) return;
    const msgImpl = opts && opts.msgImpl;
    const debounceMs = opts && opts.debounceMs || DEBOUNCE_MS;
    const timers = /* @__PURE__ */ new Map();
    for (const id of AI_FIELD_IDS) {
      const el = container.querySelector("#" + id);
      if (!el) continue;
      el.addEventListener("input", () => {
        if (timers.has(id)) clearTimeout(timers.get(id));
        timers.set(id, setTimeout(() => {
          timers.delete(id);
          const cfg = readAiFields();
          const fieldMap = {
            "s-ai-base-url": "baseUrl",
            "s-ai-api-key": "apiKey",
            "s-ai-token": "token",
            "s-ai-chat-id": "chatId",
            "s-ai-user-id": "userId",
            "s-ai-model": "model",
            "s-ai-timeout": "timeoutMs"
          };
          const partial = { [fieldMap[id]]: cfg[fieldMap[id]] };
          saveAiConfig(partial, msgImpl).catch(() => {
          });
        }, debounceMs));
      });
    }
  }
  var DEBOUNCE_MS, AI_FIELD_IDS, _internal4;
  var init_ai_settings = __esm({
    "src/ui/panel/ai-settings.js"() {
      init_state();
      DEBOUNCE_MS = 500;
      AI_FIELD_IDS = ["s-ai-base-url", "s-ai-api-key", "s-ai-token", "s-ai-chat-id", "s-ai-user-id", "s-ai-model", "s-ai-timeout"];
      _internal4 = {
        AI_FIELD_IDS,
        DEBOUNCE_MS,
        sendBg: sendBg2,
        setFieldValue,
        getFieldValue
      };
    }
  });

  // src/ui/panel/cover-letter-ai-ui.js
  function buildAiStatusText(ctx) {
    const parts = [];
    if (ctx && ctx.vacancy) {
      const v = ctx.vacancy;
      parts.push("\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F: " + (v.title || "?") + (v.company ? " @ " + v.company : ""));
    } else {
      parts.push("\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F: \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430 (\u043E\u0442\u043A\u0440\u043E\u0439 hh.ru/vacancy/* \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435)");
    }
    if (ctx && ctx.resume) {
      parts.push("\u0420\u0435\u0437\u044E\u043C\u0435: " + (ctx.resume.title || ctx.resume.position || "?"));
    } else {
      parts.push('\u0420\u0435\u0437\u044E\u043C\u0435: \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E (\u0437\u0430\u0433\u0440\u0443\u0437\u0438 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 "\u0420\u0435\u0437\u044E\u043C\u0435")');
    }
    return "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442: " + parts.join(" | ");
  }
  function updateAiStatus(ctx) {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const status = sr.getElementById("cl-ai-status");
    if (!status) return;
    status.textContent = buildAiStatusText(ctx);
  }
  function getCurrentAiContext() {
    return {
      vacancy: typeof window !== "undefined" && window.__hhVacDetail || panelState.vacancies && panelState.vacancies[0] || null,
      resume: panelState.resume || null
    };
  }
  function refreshAiStatus() {
    updateAiStatus(getCurrentAiContext());
  }
  function showAiToast(msg, kind) {
    const sr = refs.shadowRoot;
    if (!sr) {
      try {
        console.log("[CoverLetterAI]", msg);
      } catch (_e) {
      }
      return;
    }
    const toast = sr.getElementById("cl-ai-toast");
    if (!toast) {
      try {
        console.log("[CoverLetterAI]", msg);
      } catch (_e) {
      }
      return;
    }
    toast.textContent = msg;
    toast.style.display = "block";
    if (kind === "error") {
      toast.style.background = "#FEF2F2";
      toast.style.color = "#DC2626";
      toast.style.border = "1px solid #FECACA";
    } else if (kind === "success") {
      toast.style.background = "#F0FDF4";
      toast.style.color = "#15803D";
      toast.style.border = "1px solid #BBF7D0";
    } else {
      toast.style.background = "#FFFBEB";
      toast.style.color = "#92400E";
      toast.style.border = "1px solid #FDE68A";
    }
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.display = "none";
    }, 6e3);
  }
  function buildAiErrorMessage(result) {
    const code = result && result.code || "unknown";
    const err = result && result.error || "";
    const aiCode = result && result.aiCode ? " [" + result.aiCode + "]" : "";
    const msg = "AI error: " + code + aiCode + (err ? " - " + err : "") + (code === "NO_API_KEY" ? ". \u041E\u0442\u043A\u0440\u043E\u0439 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 -> AI API key." : "") + (code === "NO_EVIDENCE" ? '. \u0412\u0430\u043A\u0430\u043D\u0441\u0438\u044F \u0438 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435 \u0438\u043C\u0435\u044E\u0442 \u043E\u0431\u0449\u0438\u0445 \u043D\u0430\u0432\u044B\u043A\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C, \u0447\u0442\u043E \u0432 \u0440\u0435\u0437\u044E\u043C\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D \u0431\u043B\u043E\u043A "\u041D\u0430\u0432\u044B\u043A\u0438" (\u0432\u043A\u043B\u0430\u0434\u043A\u0430 \u0420\u0435\u0437\u044E\u043C\u0435 -> \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C).' : "") + (code === "AI_ERROR" && aiCode === " [TIMEOUT]" ? ". \u0423\u0432\u0435\u043B\u0438\u0447\u044C Timeout (\u043C\u0441) \u0432 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 -> AI-\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 (\u0434\u043E 90 000-120 000)." : "");
    return msg;
  }
  function buildMissingContextMessage(ctx) {
    const missing = [];
    if (!ctx.vacancy) missing.push("\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F");
    if (!ctx.resume) missing.push("\u0440\u0435\u0437\u044E\u043C\u0435");
    return "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: " + missing.join(", ") + ". " + (ctx.vacancy ? "" : "\u041E\u0442\u043A\u0440\u043E\u0439 hh.ru/vacancy/* \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435. ") + (ctx.resume ? "" : '\u0417\u0430\u0433\u0440\u0443\u0437\u0438 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 "\u0420\u0435\u0437\u044E\u043C\u0435".');
  }
  function buildSuccessMessage(text, warnings) {
    const len = (text || "").length;
    const warnCount = Array.isArray(warnings) && warnings.length > 0 ? warnings.length : 0;
    return "\u041F\u0438\u0441\u044C\u043C\u043E \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E (" + len + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432)" + (warnCount > 0 ? ", " + warnCount + " \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0439 \u0432\u0430\u043B\u0438\u0434\u0430\u0442\u043E\u0440\u0430" : "");
  }
  var init_cover_letter_ai_ui = __esm({
    "src/ui/panel/cover-letter-ai-ui.js"() {
      init_state();
      init_state();
    }
  });

  // src/ui/panel/ai-btn-logger.js
  function safeStringify(data) {
    if (data === void 0) return "undefined";
    if (data === null) return "null";
    if (typeof data === "string") {
      return data.length > 500 ? data.slice(0, 500) + "...(truncated)" : data;
    }
    if (typeof data !== "object") return String(data);
    try {
      const seen = /* @__PURE__ */ new WeakSet();
      const s = JSON.stringify(data, (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "string" && val.length > 300) {
          return val.slice(0, 300) + "...(truncated)";
        }
        return val;
      }, 0);
      return s;
    } catch (e2) {
      return "[unserializable: " + (e2.message || String(e2)) + "]";
    }
  }
  function formatEntry(entry) {
    const ts = entry.ts;
    const dataStr = entry.data === void 0 ? "" : " " + safeStringify(entry.data);
    return "[" + ts + "] [AI-BTN] " + entry.step + dataStr;
  }
  function aiBtnLog(step, data) {
    const entry = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      step,
      data
    };
    logBuffer.push(entry);
    if (logBuffer.length > LOG_MAX) {
      logBuffer.splice(0, logBuffer.length - LOG_MAX);
    }
    if (typeof window !== "undefined") {
      if (!Array.isArray(window.__hhCopilotAIBtnLog)) {
        window.__hhCopilotAIBtnLog = [];
      }
      window.__hhCopilotAIBtnLog.push(entry);
      if (window.__hhCopilotAIBtnLog.length > LOG_MAX) {
        window.__hhCopilotAIBtnLog.splice(0, window.__hhCopilotAIBtnLog.length - LOG_MAX);
      }
      if (typeof window.__hhCopilotAIBtnDump !== "function") {
        window.__hhCopilotAIBtnDump = () => {
          const lines = (window.__hhCopilotAIBtnLog || []).map(formatEntry);
          console.log(lines.join("\n"));
          return lines.join("\n");
        };
      }
      if (typeof window.__hhCopilotAIBtnClear !== "function") {
        window.__hhCopilotAIBtnClear = () => {
          window.__hhCopilotAIBtnLog = [];
          logBuffer.length = 0;
          console.log("[AI-BTN] log cleared");
        };
      }
    }
    try {
      console.log(formatEntry(entry));
    } catch (_e) {
    }
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("aiBtnLog", (res) => {
          const arr = Array.isArray(res && res.aiBtnLog) ? res.aiBtnLog : [];
          arr.push(entry);
          if (arr.length > LOG_MAX) {
            arr.splice(0, arr.length - LOG_MAX);
          }
          chrome.storage.local.set({ aiBtnLog: arr }, () => {
          });
        });
      }
    } catch (_e) {
    }
  }
  function getAiBtnLogText() {
    return logBuffer.map(formatEntry).join("\n");
  }
  function clearAiBtnLog() {
    logBuffer.length = 0;
    if (typeof window !== "undefined" && Array.isArray(window.__hhCopilotAIBtnLog)) {
      window.__hhCopilotAIBtnLog.length = 0;
    }
    try {
      console.log("[AI-BTN] log cleared");
    } catch (_e) {
    }
  }
  var LOG_MAX, logBuffer, _internal5;
  var init_ai_btn_logger = __esm({
    "src/ui/panel/ai-btn-logger.js"() {
      LOG_MAX = 200;
      logBuffer = [];
      _internal5 = {
        logBuffer,
        formatEntry,
        safeStringify,
        LOG_MAX
      };
    }
  });

  // src/ui/panel/cover-letter-ai-events.js
  function bindCoverLetterAIBtn(opts) {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const btn = sr.getElementById("cover-letter-ai-btn");
    if (!btn) return;
    setTimeout(refreshAiStatus, 0);
    if (typeof window !== "undefined") {
      window.addEventListener("hh-ar-resume-loaded", refreshAiStatus);
      window.addEventListener("hh-ar-match-updated", refreshAiStatus);
    }
    const customToast = opts && opts.toastImpl;
    btn.addEventListener("click", async () => {
      aiBtnLog("click", "AI button clicked");
      const ctx = getCurrentAiContext();
      const { vacancy, resume } = ctx;
      aiBtnLog("ctx", {
        vacancy: vacancy ? {
          id: vacancy.id || "?",
          title: vacancy.title || "?",
          company: vacancy.company || "?",
          hasDescription: !!(vacancy.description || vacancy.text),
          keySkillsCount: Array.isArray(vacancy.keySkills) ? vacancy.keySkills.length : 0
        } : null,
        resume: resume ? {
          id: resume.id || "?",
          title: resume.title || resume.position || "?",
          skillsCount: Array.isArray(resume.skills) ? resume.skills.length : 0,
          experienceCount: Array.isArray(resume.experience) ? resume.experience.length : 0
        } : null
      });
      updateAiStatus(ctx);
      if (!vacancy || !resume) {
        const msg = buildMissingContextMessage(ctx);
        aiBtnLog("reject-no-ctx", msg);
        if (customToast) customToast(msg);
        else showAiToast(msg, "error");
        return;
      }
      const toneEl = sr.getElementById("s-letter-tone");
      const tone = toneEl ? validateTone(toneEl.value) : "formal";
      aiBtnLog("tone", tone);
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F...";
      aiBtnLog("btn-disabled", 'button now shows "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F..."');
      const msgStart = Date.now();
      aiBtnLog("send-start", { type: "ai-cover-letter", tone, t: msgStart });
      try {
        const result = await chrome.runtime.sendMessage({
          type: "ai-cover-letter",
          vacancy,
          resume,
          opts: { tone }
        });
        const elapsedMs = Date.now() - msgStart;
        aiBtnLog("send-done", { elapsedMs, ok: !!(result && result.ok), code: result && result.code, aiCode: result && result.aiCode });
        if (result && result.ok) {
          const ta = sr.getElementById("cover-letter-text");
          aiBtnLog("resp-ok", { textLen: (result.text || "").length, warnings: Array.isArray(result.warnings) ? result.warnings.length : 0, hasTextarea: !!ta });
          if (ta) {
            ta.value = result.text;
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            aiBtnLog("textarea-updated", "cover-letter-text populated");
          }
          const msg = buildSuccessMessage(result.text, result.warnings);
          if (customToast) customToast(msg);
          else showAiToast(msg, "success");
          aiBtnLog("toast-success", msg);
        } else {
          const msg = buildAiErrorMessage(result);
          aiBtnLog("resp-err", { result, msg });
          if (customToast) customToast(msg);
          else showAiToast(msg + " || F12 -> Console -> filter [AI-BTN] -> copy all lines.", "error");
        }
      } catch (e2) {
        const elapsedMs = Date.now() - msgStart;
        const msg = "AI error: " + (e2.message || String(e2));
        aiBtnLog("exception", { elapsedMs, name: e2 && e2.name, message: e2 && e2.message, stack: e2 && e2.stack ? e2.stack.split("\n").slice(0, 5).join(" | ") : "", msg });
        if (customToast) customToast(msg);
        else showAiToast(msg + " || F12 -> Console -> filter [AI-BTN] -> copy all lines.", "error");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
        aiBtnLog("btn-restored", "button re-enabled");
        try {
          console.log("--- [AI-BTN] full log dump ---\n" + getAiBtnLogText() + "\n--- end dump ---");
        } catch (_e) {
        }
      }
    });
  }
  function bindAiLogButtons(opts) {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const copyBtn = sr.getElementById("cl-ai-log-copy-btn");
    const clearBtn = sr.getElementById("cl-ai-log-clear-btn");
    const statusEl = sr.getElementById("cl-ai-log-status");
    const customToast = opts && opts.toastImpl;
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = getAiBtnLogText();
        const lineCount = text ? text.split("\n").length : 0;
        if (lineCount === 0) {
          if (statusEl) statusEl.textContent = "\u043B\u043E\u0433 \u043F\u0443\u0441\u0442 -- \u043A\u043B\u0438\u043A\u043D\u0438 AI \u0441\u043D\u0430\u0447\u0430\u043B\u0430";
          if (customToast) customToast("\u041B\u043E\u0433 \u043F\u0443\u0441\u0442. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043A\u043B\u0438\u043A\u043D\u0438 <<\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441 AI>>.");
          else showAiToast("\u041B\u043E\u0433 \u043F\u0443\u0441\u0442. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043A\u043B\u0438\u043A\u043D\u0438 <<\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441 AI>>.", "error");
          return;
        }
        let copied = false;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            copied = true;
          }
        } catch (_e) {
        }
        if (!copied) {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            ta.style.top = "0";
            (sr.host ? sr.host.parentElement : document.body).appendChild(ta);
            ta.focus();
            ta.select();
            copied = document.execCommand("copy");
            ta.remove();
          } catch (_e) {
          }
        }
        if (copied) {
          if (statusEl) statusEl.textContent = "\u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E " + lineCount + " \u0441\u0442\u0440\u043E\u043A (ok)";
          if (customToast) customToast("\u041B\u043E\u0433 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D (" + lineCount + " \u0441\u0442\u0440\u043E\u043A). \u0412\u0441\u0442\u0430\u0432\u044C \u0432 \u0447\u0430\u0442 \u0441 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u043E\u043C.");
          else showAiToast("\u041B\u043E\u0433 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D (" + lineCount + " \u0441\u0442\u0440\u043E\u043A). \u0412\u0441\u0442\u0430\u0432\u044C \u0432 \u0447\u0430\u0442 \u0441 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u043E\u043C.", "success");
        } else {
          try {
            console.log("--- [AI-BTN] copy-fallback dump ---\n" + text + "\n--- end dump ---");
          } catch (_e) {
          }
          if (statusEl) statusEl.textContent = "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C -- \u0441\u043C. \u043A\u043E\u043D\u0441\u043E\u043B\u044C";
          if (customToast) customToast("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. F12 -> Console -> \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0437\u0430\u043F\u0438\u0441\u044C -> \u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
          else showAiToast("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. F12 -> Console -> \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0437\u0430\u043F\u0438\u0441\u044C -> \u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "error");
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearAiBtnLog();
        if (statusEl) statusEl.textContent = "\u043B\u043E\u0433 \u043E\u0447\u0438\u0449\u0435\u043D";
        if (customToast) customToast("\u041B\u043E\u0433 \u043E\u0447\u0438\u0449\u0435\u043D.");
        else showAiToast("\u041B\u043E\u0433 \u043E\u0447\u0438\u0449\u0435\u043D.", "info");
      });
    }
  }
  var init_cover_letter_ai_events = __esm({
    "src/ui/panel/cover-letter-ai-events.js"() {
      init_state();
      init_cover_letter_ai_ui();
      init_ai_btn_logger();
      init_cover_letter_tone();
    }
  });

  // src/ui/panel/cover-letter-events.js
  async function populateCoverLetterFields(opts) {
    const sr = refs.shadowRoot;
    if (!sr) return false;
    const storage = opts && opts.storageImpl || null;
    let config;
    try {
      config = storage ? await storage.getCoverLetterConfig() : await getCoverLetterConfig();
    } catch (_e) {
      config = { template: "", tone: "formal" };
    }
    const tmplEl = sr.getElementById("cover-letter-text");
    if (tmplEl && config.template) {
      tmplEl.value = config.template;
    }
    const toneEl = sr.getElementById("s-letter-tone");
    if (toneEl) {
      toneEl.value = validateTone(config.tone);
    }
    refreshAiStatus();
    return true;
  }
  function bindCoverLetterTemplateSave(opts) {
    const sr = refs.shadowRoot;
    if (!sr) return () => {
    };
    const storage = opts && opts.storageImpl || null;
    const debounceMs = opts && opts.debounceMs || DEBOUNCE_MS2;
    const tmplEl = sr.getElementById("cover-letter-text");
    if (!tmplEl) return () => {
    };
    let timer = null;
    const onSave = () => {
      const text = tmplEl.value || "";
      if (storage) {
        storage.setCoverLetterTemplate(text).catch(() => {
        });
      } else {
        setCoverLetterTemplate(text).catch(() => {
        });
      }
    };
    tmplEl.addEventListener("input", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onSave();
      }, debounceMs);
    });
    return function cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }
  function bindLetterToneHandler(container, opts) {
    if (!container) return;
    const storage = opts && opts.storageImpl || null;
    const toneEl = container.querySelector("#s-letter-tone");
    if (!toneEl) return;
    toneEl.addEventListener("change", () => {
      const tone = validateTone(toneEl.value);
      toneEl.value = tone;
      const tmplEl = container.querySelector("#cover-letter-text") || refs.shadowRoot && refs.shadowRoot.getElementById("cover-letter-text");
      if (tmplEl) {
        const currentText = tmplEl.value.trim();
        const allDefaults = Object.values(_internal.TEMPLATES).map((t) => t.trim());
        if (allDefaults.includes(currentText)) {
          const newTemplate = getTemplateForTone(tone);
          tmplEl.value = newTemplate;
          if (storage) storage.setCoverLetterTemplate(newTemplate).catch(() => {
          });
          else setCoverLetterTemplate(newTemplate).catch(() => {
          });
        }
      }
      if (storage) storage.setLetterTone(tone).catch(() => {
      });
      else setLetterTone(tone).catch(() => {
      });
    });
  }
  function bindCoverLetterEvents(container, opts) {
    bindCoverLetterTemplateSave(opts);
    bindLetterToneHandler(container, opts);
    bindCoverLetterAIBtn(opts);
    bindAiLogButtons(opts);
  }
  var DEBOUNCE_MS2, _internal6;
  var init_cover_letter_events = __esm({
    "src/ui/panel/cover-letter-events.js"() {
      init_state();
      init_cover_letter_storage();
      init_cover_letter_tone();
      init_cover_letter_ai_ui();
      init_cover_letter_ai_events();
      DEBOUNCE_MS2 = 500;
      _internal6 = {
        DEBOUNCE_MS: DEBOUNCE_MS2,
        TONES
      };
    }
  });

  // src/ui/panel/events-a11y.js
  function bindTabKeyboardNav(container, switchTab2) {
    container.addEventListener("keydown", (e2) => {
      const tabBtn = e2.target.closest(".tab-btn");
      if (!tabBtn) return;
      const tabs = Array.from(container.querySelectorAll(".tab-btn"));
      const idx = tabs.indexOf(tabBtn);
      let nextIdx = -1;
      if (e2.key === "ArrowRight" || e2.key === "ArrowDown") {
        e2.preventDefault();
        nextIdx = (idx + 1) % tabs.length;
      } else if (e2.key === "ArrowLeft" || e2.key === "ArrowUp") {
        e2.preventDefault();
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e2.key === "Home") {
        e2.preventDefault();
        nextIdx = 0;
      } else if (e2.key === "End") {
        e2.preventDefault();
        nextIdx = tabs.length - 1;
      }
      if (nextIdx >= 0) {
        tabs[nextIdx].focus();
        switchTab2(tabs[nextIdx].dataset.tab);
      }
    });
  }
  function bindAccessibilityHandlers(container, toggleTimeline2, toggleSub3) {
    container.addEventListener("click", (e2) => {
      const tl = e2.target.closest("[data-timeline]");
      if (tl) {
        toggleTimeline2(tl);
        return;
      }
      const sub = e2.target.closest("[data-sub-toggle]");
      if (sub) {
        toggleSub3(sub.dataset.subId, sub.dataset.chevId);
        return;
      }
    });
    container.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        const tl = e2.target.closest("[data-timeline]") || e2.target.closest("[data-sub-toggle]");
        if (tl) {
          e2.preventDefault();
          tl.click();
          return;
        }
        const vacItem = e2.target.closest(".vacancy-item");
        if (vacItem) {
          e2.preventDefault();
          const navLink = vacItem.querySelector('[data-action="navigate"]');
          if (navLink) navLink.click();
        }
      }
    });
    container.addEventListener("change", (e2) => {
      const cb = e2.target;
      if (cb.matches('input[type="checkbox"][role="switch"]')) {
        cb.setAttribute("aria-checked", cb.checked ? "true" : "false");
      }
    });
    container.addEventListener("keydown", (e2) => {
      const radio = e2.target.closest('[role="radio"]');
      if (!radio) return;
      const group = radio.closest('[role="radiogroup"]');
      if (!group) return;
      const radios = Array.from(group.querySelectorAll('[role="radio"]'));
      const idx = radios.indexOf(radio);
      let nextIdx = -1;
      if (e2.key === "ArrowRight" || e2.key === "ArrowDown") {
        e2.preventDefault();
        nextIdx = (idx + 1) % radios.length;
      } else if (e2.key === "ArrowLeft" || e2.key === "ArrowUp") {
        e2.preventDefault();
        nextIdx = (idx - 1 + radios.length) % radios.length;
      }
      if (nextIdx >= 0) {
        radios[nextIdx].focus();
        radios[nextIdx].click();
      }
    });
    container.addEventListener("click", (e2) => {
      const radio = e2.target.closest('[role="radio"]');
      if (!radio) return;
      const group = radio.closest('[role="radiogroup"]');
      if (!group) return;
      group.querySelectorAll('[role="radio"]').forEach((r) => {
        const isActive = r === radio;
        r.setAttribute("aria-checked", isActive ? "true" : "false");
        r.classList.toggle("active", isActive);
        r.classList.toggle("btn-primary", isActive);
        r.classList.toggle("btn-outline", !isActive);
      });
    });
  }
  function filterVacancies2() {
    const search = (refs.shadowRoot?.getElementById("vac-search")?.value || "").toLowerCase();
    const status = refs.shadowRoot?.getElementById("vac-status-filter")?.value || "all";
    const minScore = parseInt(refs.shadowRoot?.getElementById("vac-score-range")?.value || "0", 10);
    const sr = refs.shadowRoot;
    const activeScheduleBtn = sr?.querySelector(".vac-schedule-btn.btn-primary");
    const schedule = activeScheduleBtn?.dataset.schedule || "all";
    const hideAds = sr?.getElementById("vac-hide-ads")?.checked || false;
    const items = sr?.querySelectorAll("#har-vlist .vacancy-item");
    items?.forEach((item) => {
      const title = (item.dataset.title || "").toLowerCase();
      const itemStatus = item.dataset.status || "new";
      const itemScore = parseInt(item.dataset.score || "0", 10);
      const itemSchedule = item.dataset.schedule || "unknown";
      const itemIsAd = item.dataset.isad === "1";
      const matchTitle = !search || title.includes(search);
      const matchStatus = status === "all" || itemStatus === status;
      const matchScore = itemScore >= minScore;
      const matchSchedule = schedule === "all" || itemSchedule === schedule;
      const matchAd = !hideAds || !itemIsAd;
      item.style.display = matchTitle && matchStatus && matchScore && matchSchedule && matchAd ? "" : "none";
    });
  }
  var init_events_a11y = __esm({
    "src/ui/panel/events-a11y.js"() {
      init_state();
    }
  });

  // src/ui/panel/events.js
  var events_exports = {};
  __export(events_exports, {
    bindAllEvents: () => bindAllEvents,
    bindTabClicks: () => bindTabClicks,
    filterVacancies: () => filterVacancies2,
    switchTabPublic: () => switchTabPublic
  });
  function switchTab(tabId) {
    setActiveTab(tabId);
    const sr = refs.shadowRoot;
    if (!sr) return;
    sr.querySelectorAll(".tab-btn").forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    sr.querySelectorAll(".tab-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "tab-" + tabId);
    });
    if (tabId === "resume") renderResumePanel();
    if (tabId === "stats") renderStats();
    if (tabId === "negotiations") {
      renderNegotiationList();
      populateCoverLetterFields().catch(() => {
      });
    }
    if (tabId === "vacancies") {
      populateCoverLetterFields().catch(() => {
      });
    }
    if (tabId === "settings") {
      populateAiFields().catch(() => {
      });
    }
    const activePanel = sr.querySelector("#tab-" + tabId);
    if (activePanel) activePanel.focus();
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
    toggleEl.setAttribute("aria-expanded", isOpen);
    if (body.id) toggleEl.setAttribute("aria-controls", body.id);
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
    bindAccessibilityHandlers(container, toggleTimeline, toggleSub2);
    bindInputChanges(container);
    bindAiSettingsHandlers(container);
    bindCoverLetterEvents(container);
  }
  function bindTabClicks(container) {
    const tabBtns = container.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    bindTabKeyboardNav(container, switchTab);
  }
  function bindInputChanges(container) {
    const scoreRange = container.querySelector("#vac-score-range");
    const scoreLabel = container.querySelector("#vac-score-label");
    if (scoreRange && scoreLabel) {
      scoreRange.addEventListener("input", () => {
        scoreLabel.textContent = scoreRange.value + "%";
        scoreRange.setAttribute("aria-valuenow", scoreRange.value);
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
    container.addEventListener("click", (e2) => {
      const scheduleBtn = e2.target.closest(".vac-schedule-btn");
      if (scheduleBtn) {
        const sr = refs.shadowRoot;
        if (!sr) return;
        sr.querySelectorAll(".vac-schedule-btn").forEach((btn) => {
          const isActive = btn === scheduleBtn;
          btn.classList.toggle("btn-primary", isActive);
          btn.classList.toggle("btn-outline", !isActive);
        });
        filterVacancies2();
      }
    });
    const hideAdsCheckbox = container.querySelector("#vac-hide-ads");
    if (hideAdsCheckbox) {
      hideAdsCheckbox.addEventListener("change", () => filterVacancies2());
    }
    container.addEventListener("click", (e2) => {
      const negStatusBtn = e2.target.closest(".neg-status-btn");
      if (negStatusBtn) {
        setNegotiationStatusFilter(negStatusBtn.dataset.status);
        return;
      }
      const negTabBtn = e2.target.closest(".neg-tab-btn");
      if (negTabBtn) {
        setNegotiationTabFilter(negTabBtn.dataset.tabOrigin);
        return;
      }
      const refreshBtn = e2.target.closest("#neg-refresh-btn");
      if (refreshBtn) {
        refreshNegotiations();
        return;
      }
      const aiGenBtn = e2.target.closest("#neg-ai-generate");
      if (aiGenBtn) {
        handleAiReplyClick(e2);
        return;
      }
      const aiVariantCard = e2.target.closest(".ai-variant-card");
      if (aiVariantCard) {
        handleAiReplyClick(e2);
        return;
      }
    });
    const aiToneSelect = container.querySelector("#neg-ai-tone");
    if (aiToneSelect) {
      aiToneSelect.addEventListener("change", () => {
        setAiTone(aiToneSelect.value);
      });
    }
  }
  var init_events = __esm({
    "src/ui/panel/events.js"() {
      init_state();
      init_resumes2();
      init_stats2();
      init_negotiations3();
      init_negotiations_ai_reply();
      init_sidebar_events();
      init_ai_settings();
      init_cover_letter_events();
      init_events_a11y();
      init_events_a11y();
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
      <p style="font-size:13px;color:#52525b;line-height:1.5;">\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u043D\u0430 hh.ru</p>
    </div>`;
      return;
    }
    if (!panelState.isLoggedIn) {
      content.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;">
      <span style="color:#ef4444;"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
      <h3 style="font-size:16px;font-weight:700;margin:16px 0 8px;">\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 hh.ru</h3>
      <p style="font-size:13px;color:#52525b;line-height:1.5;margin-bottom:24px;">\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0451\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E.<br>\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0434\u043B\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438.</p>
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
    renderMyResumesPanel();
    const scoreRange = refs.shadowRoot?.getElementById("vac-score-range");
    const scoreLabel = refs.shadowRoot?.getElementById("vac-score-label");
    const minMatch = panelState.settings?.minMatchScore || 60;
    if (scoreRange) {
      scoreRange.value = minMatch;
      scoreRange.setAttribute("aria-valuenow", minMatch);
    }
    if (scoreLabel) {
      scoreLabel.textContent = minMatch + "%";
    }
    tryShowVacancyMatch();
    if (!panelState.resume || !panelState.resume.id) {
      const syncBody = refs.shadowRoot?.getElementById("res-sync-body");
      const syncToggle = syncBody?.previousElementSibling;
      if (syncBody && !syncBody.classList.contains("open")) {
        syncBody.classList.add("open");
        const chevron = syncToggle?.querySelector(".timeline-chevron");
        if (chevron) chevron.classList.add("open");
        if (syncToggle) syncToggle.setAttribute("aria-expanded", "true");
      }
    }
    if (!isTourDone()) {
      if (_tourTimer) clearTimeout(_tourTimer);
      _tourTimer = setTimeout(() => {
        _tourTimer = null;
        startTour(getWelcomeTourSteps());
      }, 800);
    }
  }
  var _tourTimer;
  var init_render = __esm({
    "src/ui/panel/render.js"() {
      init_state();
      init_html2();
      init_auth();
      init_vacancies2();
      init_overview2();
      init_stats2();
      init_negotiations3();
      init_settings2();
      init_resumes2();
      init_tour_engine();
      init_tour_steps();
      _tourTimer = null;
    }
  });

  // src/ui/panel/auth-and-bg.js
  function updateAuthState(forceUI = false) {
    const was = panelState.isLoggedIn;
    const now = checkAuth();
    if (was !== now || forceUI) {
      setAuthState(now);
      authLog.info("Auth: " + (now ? "LOGGED IN" : "NOT LOGGED IN"));
      if (!isTourActive()) renderSidebarContent();
      if (panelState.isLoggedIn) {
        const container = refs.shadowRoot?.querySelector(".fab-panel");
        if (container) {
          bindAllEvents(container);
          renderInitialData();
        }
        if (was !== true) {
          window.dispatchEvent(new CustomEvent("hh-ar-init-page-logic"));
          authLog.info("Dispatched hh-ar-init-page-logic event");
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
      authLog.info("Auth (async): " + (now ? "LOGGED IN" : "NOT LOGGED IN"));
      if (!isTourActive()) renderSidebarContent();
      if (panelState.isLoggedIn) {
        const container = refs.shadowRoot?.querySelector(".fab-panel");
        if (container) {
          bindAllEvents(container);
          renderInitialData();
        }
        if (was !== true) {
          window.dispatchEvent(new CustomEvent("hh-ar-init-page-logic"));
          authLog.info("Dispatched hh-ar-init-page-logic event (async)");
        }
      }
      updateFabIcon();
    }
    showAuthFeedback(now);
  }
  function showAuthFeedback(isLoggedIn2) {
    if (!isLoggedIn2) return;
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
      const desc = card.querySelector('div[style*="color:#52525b;"]');
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
  async function loadNegotiationsInBackground() {
    if (!panelState.isLoggedIn) return;
    if (panelState.negotiations.length > 0 && Date.now() - _negLastFetch < 5 * 60 * 1e3) return;
    if (_negFetching) return;
    _negFetching = true;
    try {
      const { fetchAndParseNegotiations: fetchAndParseNegotiations2 } = await Promise.resolve().then(() => (init_negotiations2(), negotiations_exports));
      const { setNegotiations: setNegotiations2 } = await Promise.resolve().then(() => (init_state(), state_exports));
      const { markAsApplied: markAsApplied2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const negotiations = await fetchAndParseNegotiations2();
      if (negotiations.length > 0) {
        setNegotiations2(negotiations);
        _negLastFetch = Date.now();
        const appliedIds = negotiations.filter((n) => n.vacancyId).map((n) => n.vacancyId);
        if (appliedIds.length > 0) {
          Promise.all(appliedIds.map((id) => markAsApplied2(id))).catch(() => {
          });
        }
        try {
          const { renderNegotiationList: renderNegotiationList2 } = await Promise.resolve().then(() => (init_negotiations3(), negotiations_exports2));
          renderNegotiationList2();
        } catch (_e) {
        }
        authLog.info("Background negotiations loaded: " + negotiations.length + " items");
      }
    } catch (err) {
      authLog.warn("Background negotiations fetch failed: " + err.message);
    } finally {
      _negFetching = false;
    }
  }
  var authLog, _negLastFetch, _negFetching;
  var init_auth_and_bg = __esm({
    "src/ui/panel/auth-and-bg.js"() {
      init_anti_hallucination();
      init_state();
      init_auth();
      init_fab();
      init_render();
      init_events();
      init_tour_engine();
      authLog = createLogger("Panel");
      _negLastFetch = 0;
      _negFetching = false;
    }
  });

  // src/ui/panel/index.js
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
    refs.sidebarEl.setAttribute("role", "dialog");
    refs.sidebarEl.setAttribute("aria-label", "HH Copilot \u043F\u0430\u043D\u0435\u043B\u044C");
    refs.sidebarEl.setAttribute("aria-modal", "true");
    refs.shadowRoot = refs.sidebarEl.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = getSidebarCSS();
    refs.shadowRoot.appendChild(style);
    const container = document.createElement("div");
    container.className = "fab-panel";
    container.innerHTML = getSidebarHTML();
    container.setAttribute("lang", "ru");
    refs.shadowRoot.appendChild(container);
    bindTabClicks(container);
    bindTourEvents();
    refs.sidebarEl.addEventListener("keydown", (e2) => {
      if (e2.key === "Escape" && panelState.isOpen) {
        e2.preventDefault();
        toggleSidebar();
        return;
      }
    });
    bindFocusTrap();
    document.body.appendChild(refs.backdropEl);
    document.body.appendChild(refs.sidebarEl);
  }
  function bindFocusTrap() {
    refs.sidebarEl.addEventListener("keydown", (e2) => {
      if (e2.key !== "Tab" || !panelState.isOpen) return;
      const sr = refs.shadowRoot;
      if (!sr) return;
      const focusable = sr.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e2.shiftKey) {
        if (document.activeElement === first || !sr.contains(document.activeElement)) {
          e2.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e2.preventDefault();
          first.focus();
        }
      }
    });
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
    if (panelState.isOpen) {
      const firstFocusable = refs.shadowRoot?.querySelector('button:not([disabled]), [tabindex="0"]');
      if (firstFocusable) setTimeout(() => firstFocusable.focus(), 350);
      loadNegotiationsInBackground();
    } else {
      if (refs.fabEl) setTimeout(() => refs.fabEl.focus(), 350);
    }
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
    document.addEventListener("click", (e2) => {
      const btn = e2.target && e2.target.closest ? e2.target.closest('[data-action="toggle-inspector"]') : null;
      if (!btn) return;
      e2.preventDefault();
      e2.stopPropagation();
      toggleInspector(btn);
    }, true);
    window.addEventListener("hh-ar-match-updated", (e2) => {
      const { vacancyId, score, breakdown, details } = e2.detail || {};
      if (score !== void 0) {
        renderVacancyMatchScore(vacancyId, score, breakdown, details);
        panelLog.info("Match UI updated: " + score + "% for vacancy " + vacancyId);
      }
    });
  }
  function updateVacancyCounts() {
    const el = (id) => refs.shadowRoot?.getElementById(id);
    const vacs = panelState.vacancies;
    const set = (id, val) => {
      const e2 = el(id);
      if (e2) e2.textContent = val;
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
      init_fab();
      init_dom_inspector();
      init_vacancies2();
      init_resume_helpers();
      init_overview2();
      init_events();
      init_tour_engine();
      init_auth_and_bg();
      init_auth_and_bg();
      panelLog = createLogger("Panel");
    }
  });

  // src/parsers/vacancy-list-helpers.js
  init_selectors();
  init_storage();
  init_match_scorer();
  function detectSchedule(locationText) {
    if (!locationText) return "unknown";
    const lower = locationText.toLowerCase();
    const hasRemote = /удал[её]нн|remote|дистанцион/.test(lower);
    const hasCity = /[а-яё]{3,}/.test(lower.replace(/удал[её]нн|remote|дистанцион/g, "").trim());
    if (hasRemote && hasCity) return "hybrid";
    if (hasRemote) return "remote";
    if (hasCity) return "office";
    return "unknown";
  }
  function findTitleLink(card) {
    const titleEl = findElement("vacancyTitleLink", card);
    if (titleEl) return titleEl;
    const links = card.querySelectorAll('a[href*="/vacancy/"]');
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (/\/vacancy\/\d+/.test(href)) return link;
    }
    return null;
  }
  async function loadAppliedAndBlacklisted() {
    try {
      const [appliedIds, blacklisted] = await Promise.all([
        getAppliedVacancies(),
        getBlacklistedCompanies()
      ]);
      return { appliedIds, blacklisted };
    } catch (_e) {
      return { appliedIds: [], blacklisted: [] };
    }
  }
  function applyStatusAndScore(vacancy, appliedIds, blacklisted, resume) {
    if (appliedIds.includes(vacancy.id)) vacancy.status = "applied";
    if (blacklisted.includes(vacancy.company)) vacancy.status = "blacklisted";
    if (resume) {
      try {
        const score = computeMatchScore(resume, vacancy);
        vacancy.matchScore = score.total;
      } catch (_e) {
      }
    }
  }
  function sortVacanciesByScore(vacancies) {
    vacancies.sort((a, b) => {
      const scoreA = a.matchScore != null ? a.matchScore : -1;
      const scoreB = b.matchScore != null ? b.matchScore : -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (a.status === "new" && b.status !== "new") return -1;
      if (b.status === "new" && a.status !== "new") return 1;
      return 0;
    });
  }

  // src/parsers/vacancy-list-votd.js
  init_selectors();
  init_anti_hallucination();
  init_parse_experience();
  var votdLog = createLogger("VotD");
  async function parseVacanciesOfTheDay(resume) {
    const titleEls = findAllElements("vacancyOfTheDayTitle");
    votdLog.info("Found " + titleEls.length + ' "Vacancy of the Day" items');
    if (titleEls.length === 0) return [];
    const vacancies = [];
    const { appliedIds, blacklisted } = await loadAppliedAndBlacklisted();
    for (let i = 0; i < titleEls.length; i++) {
      const titleEl = titleEls[i];
      const title = (titleEl.textContent || "").trim();
      if (!title) continue;
      let vacancyId = "";
      const clickLink = titleEl.closest("a");
      if (clickLink) {
        const clickHref = clickLink.getAttribute("href") || "";
        vacancyId = extractVacancyId(clickHref);
      }
      if (!vacancyId) {
        const parentBlock = titleEl.closest("section") || titleEl.closest('[class*="vacancy-of-the-day"]') || titleEl.parentElement?.parentElement;
        if (parentBlock) {
          const links = parentBlock.querySelectorAll('a[href*="vacancyId="]');
          for (const link of links) {
            const id = extractVacancyId(link.getAttribute("href") || "");
            if (id) {
              vacancyId = id;
              break;
            }
          }
        }
      }
      if (!vacancyId) {
        let ancestor = titleEl.parentElement;
        while (ancestor && ancestor !== document.body) {
          const attrId = ancestor.getAttribute("id");
          if (attrId && /^\d{6,12}$/.test(attrId)) {
            vacancyId = attrId;
            break;
          }
          ancestor = ancestor.parentElement;
        }
      }
      if (!vacancyId) {
        votdLog.warn("VotD #" + i + ": could not extract vacancy ID -- skipping");
        continue;
      }
      const container = titleEl.closest("div[class]") || titleEl.parentElement;
      const searchRoot = container?.parentElement || container;
      const compEl = searchRoot?.querySelector('[data-qa="vacancy_of_the_day_compensation"]') || container?.querySelector('[data-qa="vacancy_of_the_day_compensation"]');
      const companyEl = searchRoot?.querySelector('[data-qa="vacancy_of_the_day_company"]') || container?.querySelector('[data-qa="vacancy_of_the_day_company"]');
      const salary = compEl ? (compEl.textContent || "").trim() : "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430";
      const company = companyEl ? (companyEl.textContent || "").trim() : "";
      const replyEl = searchRoot?.querySelector('[data-qa="vacancy-response-link-top-again"]') || container?.querySelector('[data-qa="vacancy-response-link-top-again"]');
      const canonicalUrl = "https://hh.ru/vacancy/" + vacancyId;
      const vacancy = {
        id: vacancyId,
        title,
        company,
        salary: salary || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430",
        location: "",
        schedule: "unknown",
        experience: parseExperienceString(""),
        skills: [],
        url: canonicalUrl,
        hasReply: !!replyEl,
        status: "new",
        source: "votd",
        isAd: true,
        parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
        matchScore: null
      };
      applyStatusAndScore(vacancy, appliedIds, blacklisted, resume);
      vacancies.push(vacancy);
    }
    votdLog.info("Parsed " + vacancies.length + "/" + titleEls.length + ' "Vacancy of the Day" items');
    return vacancies;
  }

  // src/parsers/vacancy-list.js
  init_selectors();
  init_anti_hallucination();
  init_parse_experience();
  var parserLog = createLogger("Parser");
  async function parseVacanciesFromPage(resume) {
    const cards = findAllElements("vacancyCard");
    parserLog.info("Found " + cards.length + " vacancy cards");
    if (cards.length === 0) return [];
    const vacancies = [];
    const { appliedIds, blacklisted } = await loadAppliedAndBlacklisted();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const titleEl = findTitleLink(card);
      const title = safeGetText(titleEl);
      if (!title) continue;
      const url = safeGetAttr(titleEl, "href", "");
      const id = extractVacancyId(url.startsWith("/") ? "https://hh.ru" + url : url);
      if (!id) continue;
      const company = safeGetText(findElement("vacancyCompany", card));
      const salary = safeGetText(findElement("vacancySalary", card), "");
      const location2 = safeGetText(findElement("vacancyLocation", card), "");
      const experience = safeGetText(findElement("vacancyExperience", card), "");
      const tagEls = card.querySelectorAll('.bloko-tag__text, [data-qa="bloko-tag"]');
      const skills = [];
      tagEls.forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t && t.length < 50) skills.push(t);
      });
      const replyBtn = findElement("replyButton", card);
      const hasReply = replyBtn !== null;
      const schedule = detectSchedule(location2);
      const vacancy = {
        id,
        title: title.trim(),
        company: (company || "").trim(),
        salary: salary || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430",
        location: (location2 || "").trim(),
        schedule,
        experience: parseExperienceString((experience || "").trim()),
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
      applyStatusAndScore(vacancy, appliedIds, blacklisted, resume);
      vacancies.push(vacancy);
    }
    sortVacanciesByScore(vacancies);
    parserLog.info("Parsed " + vacancies.length + "/" + cards.length + " valid vacancies");
    return vacancies;
  }

  // src/parsers/vacancy-diagnostic-detectors.js
  function detectTitle() {
    const qa = document.querySelector('[data-qa="vacancy-title"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim(), tag: qa.tagName };
    const h1 = document.querySelector("h1");
    if (h1) return { source: "h1", value: h1.textContent.trim(), tag: "H1" };
    return { source: null, value: null };
  }
  function detectCompany() {
    const qa = document.querySelector('[data-qa="vacancy-company-name"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim(), tag: qa.tagName, href: qa.href || null };
    const sideCompany = document.querySelector('.vacancy-company-name a, [class*="company-name"] a');
    if (sideCompany) return { source: "class-heuristic", value: sideCompany.textContent.trim(), tag: sideCompany.tagName, href: sideCompany.href || null };
    return { source: null, value: null };
  }
  function detectSalary() {
    const qa = document.querySelector('[data-qa="vacancy-salary"], [data-qa="vacancy-serp__compensation"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim() };
    const bloko = document.querySelector('.vacancy-salary, [class*="vacancy-salary"]');
    if (bloko) return { source: "class-heuristic", value: bloko.textContent.trim() };
    const h1 = document.querySelector("h1");
    if (h1) {
      const parent = h1.parentElement;
      if (parent) {
        const salaryEl = Array.from(parent.children).find(
          (c) => /[\d\u00A0]+\s*\u20BD|[\d\u00A0]+\s*руб/i.test(c.textContent)
        );
        if (salaryEl) return { source: "sibling-heuristic", value: salaryEl.textContent.trim() };
      }
    }
    return { source: null, value: null };
  }
  function detectLocation() {
    const qa = document.querySelector('[data-qa="vacancy-view-location"], [data-qa*="location"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim() };
    return { source: null, value: null };
  }
  function detectExperience() {
    const qa = document.querySelector('[data-qa="vacancy-experience"], [data-qa*="experience"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim() };
    return { source: null, value: null };
  }
  function detectEmployment() {
    const qa = document.querySelector('[data-qa="vacancy-employment-mode"], [data-qa*="employment"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim() };
    return { source: null, value: null };
  }
  function detectSchedule2() {
    const qa = document.querySelector('[data-qa="vacancy-work-schedule"], [data-qa*="schedule"]');
    if (qa) return { source: "data-qa", value: qa.textContent.trim() };
    return { source: null, value: null };
  }
  function detectKeySkills() {
    const qaItems = document.querySelectorAll('[data-qa="skills-element"]');
    if (qaItems.length > 0) {
      const texts = [];
      qaItems.forEach((el) => {
        const tagText = el.querySelector(".bloko-tag__text");
        const t = tagText ? tagText.textContent.trim() : el.textContent.trim();
        if (t) texts.push(t);
      });
      if (texts.length > 0) return { source: "data-qa", value: texts, count: texts.length };
    }
    const tagSection = document.querySelector('[data-qa="skills-element"]');
    if (tagSection) {
      const tags = tagSection.querySelectorAll(".bloko-tag__text");
      const texts = [];
      tags.forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t) texts.push(t);
      });
      if (texts.length > 0) return { source: "bloko-tags", value: texts, count: texts.length };
    }
    return { source: null, value: null, count: 0 };
  }
  function detectDescription() {
    const qa = document.querySelector('[data-qa="vacancy-description"]');
    if (qa) {
      return {
        source: "data-qa",
        found: true,
        textLength: qa.textContent.length,
        htmlLength: qa.innerHTML.length,
        textSnippet: qa.textContent.substring(0, 800).trim(),
        headings: extractHeadings(qa)
      };
    }
    return { source: null, found: false };
  }
  function detectBrandedDescription() {
    const branded = document.querySelector('[data-qa="vacancy-branded-description"], .vacancy-branded-description, [class*="branded"]');
    if (branded) {
      return {
        source: "data-qa/class",
        found: true,
        textLength: branded.textContent.length,
        htmlLength: branded.innerHTML.length,
        textSnippet: branded.textContent.substring(0, 300).trim()
      };
    }
    return { source: null, found: false };
  }
  function extractHeadings(root) {
    const headings = [];
    root.querySelectorAll("p > strong, h2, h3, h4, p > b").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t.length > 5 && t.length < 150) headings.push(t);
    });
    return headings;
  }
  function detectInfoBlocks() {
    const blocks = [];
    const infoItems = document.querySelectorAll('[data-qa*="vacancy-"]');
    const seen = /* @__PURE__ */ new Set();
    infoItems.forEach((el) => {
      const qa = el.getAttribute("data-qa");
      if (!qa || seen.has(qa)) return;
      seen.add(qa);
      blocks.push({
        dataQa: qa,
        tag: el.tagName,
        text: (el.textContent || "").substring(0, 120).trim().replace(/\s+/g, " "),
        children: el.children.length
      });
    });
    return blocks;
  }

  // src/parsers/vacancy-diagnostic.js
  init_selectors();
  init_anti_hallucination();
  var diagLog = createLogger("VacDiag");
  function diagnoseVacancyPage() {
    const path = window.location.pathname;
    const vacancyId = path.replace("/vacancy/", "").split("?")[0].split("#")[0];
    const result = {
      url: window.location.href,
      vacancyId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      selectors: {},
      autoDetect: {},
      rawData: {}
    };
    const vacSelectors = [
      "vacancyTitleOnPage",
      "vacancyCompanyOnPage",
      "vacancyDescription",
      "vacancyDescriptionContent",
      "vacancySkills",
      "vacancySkillsOnPage",
      "vacancyApplyButton",
      "responsePopup",
      "addCoverLetter",
      "coverLetterInput",
      "submitButton"
    ];
    vacSelectors.forEach((name) => {
      const el = findElement(name);
      const selectors = HH_SELECTORS[name] || [];
      const matchIdx = el ? selectors.findIndex((sel) => {
        try {
          return document.querySelector(sel) === el;
        } catch {
          return false;
        }
      }) : -1;
      result.selectors[name] = {
        found: el !== null,
        matchedSelector: matchIdx >= 0 ? selectors[matchIdx] : null,
        text: el ? safeGetText(el, "").substring(0, 200) : null,
        tag: el ? el.tagName : null,
        dataQa: el ? safeGetAttr(el, "data-qa", "") : null,
        className: el ? (el.className || "").substring(0, 100) : null
      };
      if (name === "vacancySkills" || name === "vacancySkillsOnPage") {
        const allSkills = document.querySelectorAll('[data-qa="skills-element"]');
        const texts = [];
        allSkills.forEach((item) => {
          const tagText = item.querySelector(".bloko-tag__text");
          const t = tagText ? tagText.textContent.trim() : item.textContent.trim();
          if (t) texts.push(t);
        });
        result.selectors[name].items = texts;
        result.selectors[name].count = texts.length;
      }
      if (name === "vacancyDescription" && el) {
        result.selectors[name].htmlLength = el.innerHTML.length;
        result.selectors[name].textLength = el.textContent.length;
        result.selectors[name].textSnippet = el.textContent.substring(0, 500).trim();
      }
    });
    const allDataQa = /* @__PURE__ */ new Map();
    document.querySelectorAll("[data-qa]").forEach((el) => {
      const qa = el.getAttribute("data-qa");
      if (!qa) return;
      const prefix = qa.replace(/[-_][^-_]+$/, "");
      if (!allDataQa.has(prefix)) {
        allDataQa.set(prefix, []);
      }
      allDataQa.get(prefix).push({
        qa,
        tag: el.tagName,
        text: (el.textContent || "").substring(0, 80).trim().replace(/\s+/g, " ")
      });
    });
    result.autoDetect.dataQaGroups = Object.fromEntries(allDataQa);
    result.autoDetect.dataQaCount = allDataQa.size;
    result.autoDetect.title = detectTitle();
    result.autoDetect.company = detectCompany();
    result.autoDetect.salary = detectSalary();
    result.autoDetect.location = detectLocation();
    result.autoDetect.experience = detectExperience();
    result.autoDetect.employment = detectEmployment();
    result.autoDetect.schedule = detectSchedule2();
    result.autoDetect.keySkills = detectKeySkills();
    result.autoDetect.description = detectDescription();
    result.autoDetect.brandedDescription = detectBrandedDescription();
    result.rawData.infoBlocks = detectInfoBlocks();
    window.postMessage({ type: "HH-AR-VAC-DIAG", payload: result }, "*");
    diagLog.info("Vacancy diagnostic complete -- use __hhVacDiag() in console");
    return result;
  }

  // src/lib/vacancy-fetch-text-parsers.js
  init_skill_dictionary();
  function parseSalaryFromDoc(doc, vacancy) {
    const salEl = doc.querySelector('[data-qa="vacancy-salary"]');
    if (!salEl) return;
    const raw = (salEl.textContent || "").trim().replace(/\s+/g, " ");
    vacancy.salary.raw = raw;
    const nums = raw.match(/\d[\d\s]*\d/g);
    if (nums && nums.length > 0) {
      const parsed = nums.map((n) => parseInt(n.replace(/\s/g, ""), 10)).filter((n) => !isNaN(n));
      if (raw.startsWith("\u043E\u0442") || raw.startsWith("from")) {
        vacancy.salary.min = parsed[0] || null;
      } else if (raw.startsWith("\u0434\u043E") || raw.startsWith("up to")) {
        vacancy.salary.max = parsed[0] || null;
      } else if (parsed.length >= 2) {
        vacancy.salary.min = parsed[0];
        vacancy.salary.max = parsed[1];
      } else if (parsed.length === 1) {
        vacancy.salary.min = parsed[0];
      }
    }
    if (raw.includes("\u0437\u0430 \u0433\u043E\u0434") || raw.includes("\u0432 \u0433\u043E\u0434")) vacancy.salary.period = "year";
    else if (raw.includes("\u0437\u0430 \u0447\u0430\u0441") || raw.includes("\u0432 \u0447\u0430\u0441")) vacancy.salary.period = "hour";
    else vacancy.salary.period = "month";
    vacancy.salary.net = raw.includes("\u043D\u0430 \u0440\u0443\u043A\u0438") || raw.includes("\u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0447\u0435\u0442\u0430");
    if (raw.includes("\u0440\u0443\u0431.") || raw.includes("\u0440\u0443\u0431")) vacancy.salary.currency = "RUB";
    else if (raw.includes("$") || raw.includes("USD")) vacancy.salary.currency = "USD";
    else if (raw.includes("\u0435\u0432\u0440\u043E") || raw.includes("EUR")) vacancy.salary.currency = "EUR";
  }
  function parseDescriptionFromDoc(doc, vacancy) {
    const descEl = doc.querySelector('[data-qa="vacancy-description"]');
    if (!descEl) return;
    vacancy.description.text = (descEl.textContent || "").trim();
    vacancy.description.html = descEl.innerHTML;
    const headings = [];
    descEl.querySelectorAll("p > strong, p > b, h2, h3, h4").forEach((el) => {
      const t = (el.textContent || "").trim();
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
      conditions: /условия|что предлагаем|что мы предлагаем|бенефиты|benefits|conditions|we offer/i
    };
    const result = { responsibilities: "", requirements: "", advantages: "", conditions: "", other: "" };
    const children = root.children;
    let currentSection = "other";
    const buffers = { other: [] };
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const isHeading = el.tagName.match(/^H[2-4]$/) || el.tagName === "P" && el.querySelector("strong, b") !== null;
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
          currentSection = "other";
          buffers.other.push(text);
        }
      } else {
        if (!buffers[currentSection]) buffers[currentSection] = [];
        buffers[currentSection].push(text);
      }
    }
    for (const [key, buf] of Object.entries(buffers)) {
      if (result[key] !== void 0) {
        result[key] = buf.join("\n");
      } else {
        result.other += (result.other ? "\n" : "") + buf.join("\n");
      }
    }
    return result;
  }
  function parseKeySkillsFromDoc(doc, vacancy) {
    const domSkills = [];
    const skillItems = doc.querySelectorAll('[data-qa="skills-element"]');
    skillItems.forEach((el) => {
      const tagText = el.querySelector(".bloko-tag__text");
      const t = tagText ? tagText.textContent.trim() : el.textContent.trim();
      if (t && !domSkills.includes(t)) domSkills.push(t);
    });
    if (domSkills.length === 0) {
      const broaderSkills = doc.querySelectorAll('[data-qa*="skill"]');
      broaderSkills.forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t && t.length > 1 && t.length < 80 && !domSkills.includes(t)) {
          const parent = el.parentElement;
          if (parent && parent.querySelectorAll('[data-qa*="skill"]').length === 1) {
            domSkills.push(t);
          }
        }
      });
    }
    if (domSkills.length === 0) {
      const skillsContainer = doc.querySelector(
        '[data-qa="vacancy-key-skills"], [data-qa="skills-block"], .vacancy-key-skills'
      );
      if (skillsContainer) {
        skillsContainer.querySelectorAll(".bloko-tag__text").forEach((tag) => {
          const t = (tag.textContent || "").trim();
          if (t && !domSkills.includes(t)) domSkills.push(t);
        });
      }
    }
    vacancy.keySkills = domSkills;
    const descText = getDescriptionText(vacancy);
    const derivedFromDesc = deriveSkillsFromText(descText);
    if (domSkills.length > 0 && derivedFromDesc.length > 0) {
      const domSkillsLower = new Set(domSkills.map((s) => normalizeSkill(s)));
      for (const ds of derivedFromDesc) {
        if (!domSkillsLower.has(normalizeSkill(ds))) {
          vacancy.derivedSkills.push(ds);
        }
      }
      vacancy._skillsSource = vacancy.derivedSkills.length > 0 ? "dom+derived" : "dom";
    } else if (domSkills.length > 0) {
      vacancy._skillsSource = "dom";
    } else if (derivedFromDesc.length > 0) {
      vacancy.keySkills = derivedFromDesc;
      vacancy.derivedSkills = [];
      vacancy._skillsSource = "derived";
    } else {
      vacancy._skillsSource = "none";
    }
  }
  function getDescriptionText(vacancy) {
    if (vacancy.description && vacancy.description.text) {
      let text = vacancy.description.text;
      if (vacancy.description.headings) {
        text += "\n" + vacancy.description.headings.join("\n");
      }
      return text;
    }
    return "";
  }
  function deriveSkillsFromText(text) {
    if (!text || text.length < 10) return [];
    const found = [];
    const foundLower = /* @__PURE__ */ new Set();
    for (const { skill, patterns } of SKILL_PATTERNS) {
      const skillLower = normalizeSkill(skill);
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
  function normalizeSkill(name) {
    return name.toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
  }

  // src/lib/vacancy-fetch-text-helpers.js
  init_parse_experience();
  function parseExperienceFromDoc(doc, vacancy) {
    const expEl = doc.querySelector(
      '[data-qa="vacancy-experience"], [data-qa*="work-experience"], [data-qa*="experience"]'
    );
    if (!expEl) return;
    const raw = (expEl.textContent || "").trim();
    vacancy.experience = parseExperienceString(raw);
  }
  function extractCleanCompanyName(el) {
    if (!el) return "";
    try {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script, style, svg, [data-qa*="reviews"], [data-qa*="rating"]').forEach((n) => n.remove());
      let text = (clone.textContent || "").trim();
      if (!text) {
        text = (el.textContent || "").trim();
      }
      text = text.replace(/\s*\d[\d\s.,]*\s*(отзыв\w*|review\w*)\s*.*/i, "").trim();
      text = text.replace(/\s+window\..*$/s, "").trim();
      text = text.replace(/[\s\u2014\-|\u2022\u00B7]+$/, "").trim();
      return text;
    } catch (_e) {
      return (el.textContent || "").trim();
    }
  }

  // src/lib/vacancy-fetch-text.js
  init_anti_hallucination();
  var fetchLog = createLogger("VacFetchText");
  async function fetchVacancyViaText(vacancyUrl) {
    fetchLog.info("Fetching vacancy via text: " + vacancyUrl);
    try {
      const resp = await fetch(vacancyUrl, {
        credentials: "include",
        headers: { Accept: "text/html" }
      });
      if (!resp.ok) {
        fetchLog.warn("fetch returned " + resp.status + " for " + vacancyUrl);
        return null;
      }
      const html = await resp.text();
      fetchLog.info("Fetched " + html.length + " chars for " + vacancyUrl);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const vacancy = parseVacancyDetailFromDoc(doc, vacancyUrl);
      if (vacancy) {
        vacancy._fetchMethod = "text";
        fetchLog.info(
          'Text parsed: "' + vacancy.title.substring(0, 40) + '" | skills=' + vacancy.keySkills.length + " derived=" + vacancy.derivedSkills.length
        );
      }
      return vacancy;
    } catch (err) {
      fetchLog.warn("Text fetch failed for " + vacancyUrl + ": " + err.message);
      return null;
    }
  }
  function parseVacancyDetailFromDoc(doc, url) {
    const idMatch = url.match(/\/vacancy\/(\d+)/);
    if (!idMatch) {
      fetchLog.warn("Cannot extract vacancy ID from URL: " + url);
      return null;
    }
    const vacancy = {
      id: idMatch[1],
      url: url.split("?")[0].split("#")[0],
      title: "",
      company: "",
      companyUrl: "",
      salary: { raw: "", min: null, max: null, currency: "RUB", period: "month", net: true },
      location: "",
      experience: { raw: "", min: null, max: null },
      employment: "",
      schedule: "",
      keySkills: [],
      derivedSkills: [],
      _skillsSource: "none",
      description: { text: "", html: "", headings: [], sections: {} },
      hiringFormat: "",
      isRemote: false,
      hasApplyButton: false,
      parsedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "detail"
    };
    const titleEl = doc.querySelector('[data-qa="vacancy-title"]');
    if (titleEl) {
      vacancy.title = (titleEl.textContent || "").trim();
    }
    if (!vacancy.title) {
      const h1 = doc.querySelector("h1");
      if (h1) vacancy.title = (h1.textContent || "").trim();
    }
    if (!vacancy.title) {
      fetchLog.warn("No title found in document");
      return null;
    }
    const companyEl = doc.querySelector(
      '[data-qa="vacancy-company-name"], [data-qa="vacancy-company"]'
    );
    if (companyEl) {
      vacancy.company = extractCleanCompanyName(companyEl);
      const companyLink = companyEl.closest("a") || companyEl.querySelector("a");
      if (companyLink) {
        vacancy.companyUrl = companyLink.getAttribute("href") || "";
      }
    }
    parseSalaryFromDoc(doc, vacancy);
    const addrEl = doc.querySelector(
      '[data-qa="vacancy-address-with-map"], [data-qa="vacancy-view-raw-address"]'
    );
    if (addrEl) {
      vacancy.location = (addrEl.textContent || "").trim().replace(/\s+/g, " ");
    }
    parseExperienceFromDoc(doc, vacancy);
    const empEl = doc.querySelector(
      '[data-qa="common-employment-text"], [data-qa*="employment"]'
    );
    if (empEl) vacancy.employment = (empEl.textContent || "").trim();
    const schedEl = doc.querySelector(
      '[data-qa="work-schedule-by-days-text"], [data-qa*="work-schedule"], [data-qa*="schedule"]'
    );
    if (schedEl) vacancy.schedule = (schedEl.textContent || "").trim();
    vacancy.isRemote = !!doc.querySelector('[data-qa="vacancy-label-work-schedule-remote"]');
    parseDescriptionFromDoc(doc, vacancy);
    parseKeySkillsFromDoc(doc, vacancy);
    const hireEl = doc.querySelector('[data-qa="vacancy-hiring-formats"]');
    if (hireEl) vacancy.hiringFormat = (hireEl.textContent || "").trim().replace(/\s+/g, " ");
    vacancy.hasApplyButton = !!doc.querySelector(
      '[data-qa="vacancy-response-link-top"], [data-qa="vacancy-apply-button"]'
    );
    return vacancy;
  }

  // src/parsers/vacancy-detail.js
  init_anti_hallucination();
  var vacLog = createLogger("VacDetail");
  function parseVacancyDetail() {
    const t0 = performance.now();
    const url = window.location.href;
    const vacancy = parseVacancyDetailFromDoc(document, url);
    if (!vacancy) {
      vacLog.warn("parseVacancyDetailFromDoc returned null");
      return null;
    }
    try {
      const applyBtn = document.querySelector(
        '[data-qa="vacancy-response-apply"], [data-qa="vacancy-response-link-top"]'
      );
      vacancy.hasApplyButton = !!applyBtn && document.body.contains(applyBtn);
    } catch (_e) {
      vacancy.hasApplyButton = false;
    }
    vacancy.source = "detail";
    const elapsed = (performance.now() - t0).toFixed(1);
    vacLog.info('Parsed vacancy "' + vacancy.title.substring(0, 40) + '" in ' + elapsed + "ms");
    vacLog.info("Skills: " + vacancy.keySkills.length + " (source: " + vacancy._skillsSource + ") | Derived: " + vacancy.derivedSkills.length + " | Desc: " + vacancy.description.text.length + " chars");
    return vacancy;
  }

  // src/ui/panel.js
  init_panel();
  init_render();

  // src/lib/vacancy-fetch-iframe.js
  init_anti_hallucination();
  var fetchLog14 = createLogger("VacFetchIframe");
  var IFRAME_LOAD_TIMEOUT = 12e3;
  var HYDRATION_DELAY = 3e3;
  async function fetchVacancyViaIframe(vacancyUrl) {
    fetchLog14.info("Loading vacancy in iframe: " + vacancyUrl);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;opacity:0;pointer-events:none;border:none;";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.src = vacancyUrl;
    document.body.appendChild(iframe);
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("iframe load timeout (" + IFRAME_LOAD_TIMEOUT + "ms)")),
          IFRAME_LOAD_TIMEOUT
        );
        iframe.addEventListener("load", () => {
          clearTimeout(timeout);
          resolve();
        });
        iframe.addEventListener("error", () => {
          clearTimeout(timeout);
          reject(new Error("iframe load error"));
        });
      });
      await new Promise((r) => setTimeout(r, HYDRATION_DELAY));
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error("Cannot access iframe document (cross-origin or blocked)");
      }
      const title = iframeDoc.title || "";
      if (title.includes("\u0412\u0445\u043E\u0434") || title.includes("Login") || title.includes("403") || title.includes("429")) {
        fetchLog14.warn('Iframe loaded non-vacancy page: "' + title.substring(0, 60) + '"');
        return null;
      }
      const vacancy = parseVacancyDetailFromDoc(iframeDoc, vacancyUrl);
      if (vacancy) {
        vacancy._fetchMethod = "iframe";
        fetchLog14.info(
          'Iframe parsed: "' + vacancy.title.substring(0, 40) + '" | skills=' + vacancy.keySkills.length + " derived=" + vacancy.derivedSkills.length + " | desc=" + vacancy.description.text.length + " chars"
        );
      } else {
        fetchLog14.warn("Iframe parse returned null for " + vacancyUrl);
      }
      return vacancy;
    } catch (err) {
      fetchLog14.warn("Iframe failed for " + vacancyUrl + ": " + err.message);
      return null;
    } finally {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (_e) {
      }
    }
  }

  // src/lib/vacancy-fetch-enrichment.js
  init_anti_hallucination();
  init_match_scorer();
  var enrichLog = createLogger("VacEnrich");
  var CACHE_TTL_MS2 = 24 * 60 * 60 * 1e3;
  function enrichVacancy(vacancy, detail, resume) {
    if (!vacancy || !detail) return vacancy;
    if (detail.keySkills && detail.keySkills.length > 0) {
      vacancy.keySkills = detail.keySkills;
    }
    if (detail.derivedSkills && detail.derivedSkills.length > 0) {
      vacancy.derivedSkills = detail.derivedSkills;
    }
    if (detail._skillsSource) {
      vacancy._skillsSource = detail._skillsSource;
    }
    if (detail.description && detail.description.text) {
      vacancy.description = detail.description;
    }
    if (detail.salary && typeof detail.salary === "object" && detail.salary.raw) {
      if (typeof vacancy.salary === "string") {
        vacancy.salary = { raw: vacancy.salary, min: null, max: null, currency: "RUB", period: "month", net: true };
      }
      vacancy.salary = { ...vacancy.salary, ...detail.salary };
    }
    if (detail.experience && typeof detail.experience === "object" && detail.experience.raw) {
      vacancy.experience = { ...vacancy.experience, ...detail.experience };
    }
    if (detail.location && (!vacancy.location || vacancy.location.length < detail.location.length)) {
      vacancy.location = detail.location;
    }
    if (detail.employment) vacancy.employment = detail.employment;
    if (detail.schedule) vacancy.schedule = detail.schedule;
    if (detail.isRemote !== void 0) vacancy.isRemote = detail.isRemote;
    if (detail.hiringFormat) vacancy.hiringFormat = detail.hiringFormat;
    if (detail.companyUrl) vacancy.companyUrl = detail.companyUrl;
    vacancy.enrichedAt = (/* @__PURE__ */ new Date()).toISOString();
    vacancy.enrichmentSource = detail._fetchMethod || "cache";
    if (resume) {
      try {
        const scoreVacancy = buildScoringVacancy(vacancy);
        const score = computeMatchScore(resume, scoreVacancy);
        vacancy.matchScore = score.total;
        vacancy.matchBreakdown = score.breakdown;
        vacancy.matchDetails = score.details;
        enrichLog.info(
          'Re-scored "' + vacancy.title.substring(0, 30) + '": ' + score.total + "% (skills=" + score.breakdown.skills + ", title=" + score.breakdown.title + ", salary=" + score.breakdown.salary + ", exp=" + score.breakdown.experience + ")"
        );
      } catch (err) {
        enrichLog.warn("Re-scoring failed for " + vacancy.id + ": " + err.message);
      }
    }
    return vacancy;
  }
  function buildScoringVacancy(vacancy) {
    const sv = {
      id: vacancy.id,
      title: vacancy.title,
      // Skills: prefer keySkills (from detail), fall back to skills[] (from SERP tags)
      keySkills: vacancy.keySkills || [],
      skills: vacancy.skills || [],
      derivedSkills: vacancy.derivedSkills || []
    };
    sv.salary = vacancy.salary;
    sv.experience = vacancy.experience;
    sv.location = vacancy.location || "";
    sv.schedule = vacancy.schedule || "";
    sv.employment = vacancy.employment || "";
    return sv;
  }
  function isDetailFresh(detail, ttlMs) {
    if (!detail || !detail.parsedAt) return false;
    const age = Date.now() - new Date(detail.parsedAt).getTime();
    return age < (ttlMs || CACHE_TTL_MS2);
  }
  function enrichVacanciesFromCache(vacancies, storedDetails, resume) {
    const detailMap = /* @__PURE__ */ new Map();
    for (const d of storedDetails) {
      if (d && d.id) detailMap.set(d.id, d);
    }
    let enriched = 0;
    let cached = 0;
    let skipped = 0;
    for (const vacancy of vacancies) {
      if (vacancy.keySkills && vacancy.keySkills.length > 0) {
        skipped++;
        continue;
      }
      const detail = detailMap.get(vacancy.id);
      if (!detail) {
        skipped++;
        continue;
      }
      if (!isDetailFresh(detail)) {
        enrichLog.info("Cached detail for " + vacancy.id + " is stale, skipping");
        skipped++;
        continue;
      }
      if (!detail._fetchMethod) detail._fetchMethod = "cache";
      enrichVacancy(vacancy, detail, resume);
      cached++;
      enriched++;
    }
    enrichLog.info("Cache enrichment: " + enriched + " enriched, " + cached + " from cache, " + skipped + " skipped");
    return { enriched, cached, skipped };
  }

  // src/lib/vacancy-fetch.js
  init_anti_hallucination();
  init_timing();
  init_storage_vacancies();
  var fetchLog15 = createLogger("VacFetch");
  var MAX_FETCH_PER_BATCH = 50;
  var FETCH_DELAY_MIN = 1500;
  var FETCH_DELAY_MAX = 3500;
  var _CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
  var isFetching2 = false;
  var abortFetch = false;
  async function enrichFromCache(vacancies, resume) {
    if (!vacancies || vacancies.length === 0) return { enriched: 0, cached: 0, skipped: 0 };
    try {
      const storedDetails = await getVacancyDetails();
      const result = enrichVacanciesFromCache(vacancies, storedDetails, resume);
      fetchLog15.info("Cache enrichment: " + result.enriched + "/" + vacancies.length + " vacancies enriched");
      return result;
    } catch (err) {
      fetchLog15.warn("Cache enrichment failed: " + err.message);
      return { enriched: 0, cached: 0, skipped: vacancies.length };
    }
  }
  async function fetchVacancyDetails(vacancies, resume, callbacks) {
    if (!vacancies || vacancies.length === 0) {
      return { fetched: 0, failed: 0, cached: 0, total: 0 };
    }
    if (isFetching2) {
      fetchLog15.warn("Fetch already in progress -- skipping");
      return { fetched: 0, failed: 0, cached: 0, total: 0 };
    }
    isFetching2 = true;
    abortFetch = false;
    const onEnriched = callbacks?.onVacancyEnriched || (() => {
    });
    const onComplete = callbacks?.onBatchComplete || (() => {
    });
    const onProgress = callbacks?.onProgress || (() => {
    });
    try {
      const cacheResult = await enrichFromCache(vacancies, resume);
      const storedDetails = await getVacancyDetails();
      const detailMap = /* @__PURE__ */ new Map();
      for (const d of storedDetails) {
        if (d && d.id) detailMap.set(d.id, d);
      }
      const toFetch = vacancies.filter((v) => {
        if (v.keySkills && v.keySkills.length > 0) return false;
        const cached = detailMap.get(v.id);
        if (cached && isDetailFresh(cached)) return false;
        return true;
      });
      fetchLog15.info(
        "Fetch batch: " + toFetch.length + " need fetching, " + cacheResult.enriched + " already from cache, " + (vacancies.length - toFetch.length - cacheResult.enriched) + " skipped"
      );
      if (toFetch.length === 0) {
        onComplete(vacancies);
        return { fetched: 0, failed: 0, cached: cacheResult.cached, total: vacancies.length };
      }
      toFetch.sort((a, b) => {
        const sa = a.matchScore != null ? a.matchScore : -1;
        const sb = b.matchScore != null ? b.matchScore : -1;
        return sb - sa;
      });
      const batch = toFetch.slice(0, MAX_FETCH_PER_BATCH);
      let fetched = 0;
      let failed = 0;
      for (let i = 0; i < batch.length; i++) {
        if (abortFetch) {
          fetchLog15.info("Fetch aborted after " + fetched + " vacancies");
          break;
        }
        const vacancy = batch[i];
        onProgress(i + 1, batch.length, vacancy.title);
        let detail = null;
        try {
          detail = await fetchVacancyViaIframe(vacancy.url);
        } catch (err) {
          fetchLog15.warn("Iframe failed for " + vacancy.id + ": " + err.message);
        }
        if (!detail) {
          try {
            detail = await fetchVacancyViaText(vacancy.url);
          } catch (err) {
            fetchLog15.warn("Text fetch failed for " + vacancy.id + ": " + err.message);
          }
        }
        if (detail) {
          saveVacancyDetail(detail).catch(() => {
          });
          enrichVacancy(vacancy, detail, resume);
          if (vacancy.matchScore != null) {
            saveVacancyScore(vacancy.id, vacancy.matchScore, vacancy.matchBreakdown, vacancy.matchDetails).catch(() => {
            });
          }
          fetched++;
          onEnriched(vacancy, detail);
        } else {
          failed++;
        }
        if (i < batch.length - 1 && !abortFetch) {
          await gaussianDelay(FETCH_DELAY_MIN, FETCH_DELAY_MAX);
        }
      }
      fetchLog15.info(
        "Batch complete: " + fetched + " fetched, " + failed + " failed, " + cacheResult.cached + " from cache, " + vacancies.length + " total"
      );
      onComplete(vacancies);
      return { fetched, failed, cached: cacheResult.cached, total: vacancies.length };
    } catch (err) {
      fetchLog15.error("Fatal error in fetch batch: " + err.message);
      return { fetched: 0, failed: 0, cached: 0, total: vacancies.length };
    } finally {
      isFetching2 = false;
      abortFetch = false;
    }
  }
  function abortVacancyFetch() {
    if (isFetching2) {
      fetchLog15.info("Abort requested");
      abortFetch = true;
    }
  }
  function isVacancyFetching() {
    return isFetching2;
  }

  // src/content/main-page-handlers-vacancy.js
  init_anti_hallucination();
  init_storage();
  init_match_scorer_title();
  init_engine();
  init_match_scorer();
  init_vacancies2();
  var pageLog = createLogger("Main");
  var searchObserverActive = false;
  async function handleVacancySearchPage() {
    const vacancies = await parseVacanciesFromPage(panelState.resume);
    await enrichFromCache(vacancies, panelState.resume);
    updateVacancies(vacancies);
    const stats = getStats();
    updateStats2(stats);
    startBackgroundEnrichment(vacancies);
    if (!searchObserverActive) {
      searchObserverActive = true;
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (!window.location.pathname.startsWith("/search/vacancy")) return;
          abortVacancyFetch();
          const fresh = await parseVacanciesFromPage(panelState.resume);
          await enrichFromCache(fresh, panelState.resume);
          updateVacancies(fresh);
          startBackgroundEnrichment(fresh);
        }, 1500);
      }).observe(document.body, { childList: true, subtree: true });
      pageLog.info("SPA observer active");
    }
  }
  async function handleVacancyDetailPage(path) {
    pageLog.info("Vacancy detail page detected");
    try {
      const diag = diagnoseVacancyPage();
      const fieldCount = Object.keys(diag.autoDetect || {}).filter((k) => diag.autoDetect[k] && (diag.autoDetect[k].value || diag.autoDetect[k].found)).length;
      pageLog.info("Vacancy diagnostic: " + fieldCount + " fields detected");
    } catch (_e) {
      pageLog.warn("Vacancy diagnostic failed");
    }
    try {
      const detail = parseVacancyDetail();
      if (detail) {
        const resume = panelState.resume;
        if (resume) {
          const score = computeMatchScore(resume, detail);
          detail.matchScore = score.total;
          detail.matchBreakdown = score.breakdown;
          pageLog.info("Match score: " + score.total + "% (skills=" + score.breakdown.skills + ", title=" + score.breakdown.title + ", salary=" + score.breakdown.salary + ", exp=" + score.breakdown.experience + ")");
          saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {
          });
          window.dispatchEvent(new CustomEvent("hh-ar-match-updated", { detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details } }));
        } else {
          pageLog.info("No active resume -- skip match scoring");
        }
        pageLog.info("Vacancy parsed: " + detail.title + " | skills=" + detail.keySkills.length + " | salary=" + detail.salary.raw);
        window.__hhVacDetail = detail;
        saveVacancyDetail(detail).catch(() => {
        });
      } else {
        pageLog.warn("Vacancy detail parse returned null");
      }
    } catch (_e) {
      pageLog.error("Vacancy detail parse failed");
    }
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
    } catch (_e) {
      pageLog.error("Error processing apply queue");
    }
  }
  var mainPageObserverActive = false;
  var VOTD_TITLE_SIMILARITY_THRESHOLD = 0.3;
  function filterVotdByRelevance(votd, resume) {
    if (!resume || !resume.title) return votd;
    return votd.filter((v) => {
      const titleResult = scoreTitle(resume, v);
      const isRelevant = titleResult.similarity >= VOTD_TITLE_SIMILARITY_THRESHOLD;
      if (!isRelevant) {
        pageLog.info('VOTD filtered out: "' + v.title + '" similarity=' + titleResult.similarity.toFixed(2) + " < " + VOTD_TITLE_SIMILARITY_THRESHOLD);
      }
      return isRelevant;
    });
  }
  async function handleMainPage() {
    pageLog.info('Main page detected -- parsing recommended vacancies + "Vacancy of the Day"');
    const recommended = await parseVacanciesFromPage(panelState.resume);
    const rawVotd = await parseVacanciesOfTheDay(panelState.resume);
    const votd = filterVotdByRelevance(rawVotd, panelState.resume);
    const allVacancies = [...recommended, ...votd];
    await enrichFromCache(allVacancies, panelState.resume);
    updateVacancies(allVacancies);
    const stats = getStats();
    updateStats2(stats);
    pageLog.info("Main page: " + recommended.length + " recommended + " + votd.length + "/" + rawVotd.length + " VotD (filtered) = " + allVacancies.length + " total");
    startBackgroundEnrichment(allVacancies);
    if (!mainPageObserverActive) {
      mainPageObserverActive = true;
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (window.location.pathname !== "/" && window.location.pathname !== "") return;
          abortVacancyFetch();
          const rec = await parseVacanciesFromPage(panelState.resume);
          const rawVd = await parseVacanciesOfTheDay(panelState.resume);
          const vd = filterVotdByRelevance(rawVd, panelState.resume);
          const fresh = [...rec, ...vd];
          await enrichFromCache(fresh, panelState.resume);
          updateVacancies(fresh);
          startBackgroundEnrichment(fresh);
        }, 1500);
      }).observe(document.body, { childList: true, subtree: true });
      pageLog.info("Main page SPA observer active");
    }
  }
  function startBackgroundEnrichment(vacancies) {
    if (!vacancies || vacancies.length === 0) return;
    if (isVacancyFetching()) {
      pageLog.info("Background enrichment already in progress -- skipping");
      return;
    }
    fetchVacancyDetails(vacancies, panelState.resume, {
      onVacancyEnriched(vacancy) {
        try {
          renderVacancyList();
          pageLog.info('UI updated after enrichment: "' + vacancy.title.substring(0, 30) + '" -> ' + vacancy.matchScore + "%");
        } catch (_e) {
          pageLog.warn("UI update after enrichment failed");
        }
      },
      onBatchComplete() {
        pageLog.info("Background enrichment batch complete");
      },
      onProgress(current, total, title) {
        pageLog.info("Enriching " + current + "/" + total + ": " + title.substring(0, 40));
      }
    }).catch((_e) => {
      pageLog.error("Background enrichment error");
    });
  }

  // src/content/main-page-handlers-pages.js
  init_anti_hallucination();
  init_storage();
  init_negotiations2();
  init_negotiations_aggregator();
  init_resume_detail2();
  init_resume_fetch();
  init_resumes2();
  init_state();
  var pageLog2 = createLogger("Main");
  async function handleResumeDetailPage(path) {
    if (/\/resume\/edit\//.test(path)) {
      const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
      if (editMatch) {
        const resumeId = editMatch[1];
        const viewUrl = "https://hh.ru/applicant/resumes/view?resume=" + resumeId;
        pageLog2.info("Edit page detected, fetching view: " + viewUrl);
        try {
          const resume = await fetchAndParseResume(viewUrl);
          if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
            await saveResumeToState(resume);
            pageLog2.info("Auto-fetched resume (from edit page): " + resume.title);
          }
        } catch (err) {
          pageLog2.warn("Failed to fetch resume from edit page: " + err.message);
        }
      }
    } else if (/\/applicant\/resumes\/view/.test(path)) {
      pageLog2.info("Applicant resume view page detected");
      await expandHiddenSections();
      const resume = parseResume();
      if (!resume.id) {
        const qMatch = window.location.search.match(/[?&]resume=([a-f0-9]+)/);
        if (qMatch) resume.id = qMatch[1];
      }
      if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
        await saveResumeToState(resume);
        pageLog2.info("Auto-parsed resume (applicant view): " + resume.title);
      }
    } else {
      await expandHiddenSections();
      const resume = parseResume();
      if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
        await saveResumeToState(resume);
        pageLog2.info("Auto-parsed resume: " + resume.title);
      }
    }
  }
  async function handleResumeListPage() {
    const resumeList = parseResumeList();
    setResumeList(resumeList);
    const list = await getMyResumes();
    setMyResumes(list);
    renderMyResumesPanel();
    pageLog2.info("Resume list page: " + resumeList.length + " resumes");
  }
  var negotiationsObserverActive = false;
  async function handleNegotiationsPage() {
    pageLog2.info("Negotiations page detected -- parsing negotiation items");
    const negotiations = await parseNegotiations();
    setNegotiations(negotiations);
    const appliedIds = negotiations.filter((n) => n.vacancyId).map((n) => n.vacancyId);
    if (appliedIds.length > 0) {
      pageLog2.info("Marking " + appliedIds.length + " vacancies as applied from negotiations");
      Promise.all(appliedIds.map((id) => markAsApplied(id))).catch(() => {
      });
    }
    try {
      const { renderNegotiationList: renderNegotiationList2 } = await Promise.resolve().then(() => (init_negotiations3(), negotiations_exports2));
      renderNegotiationList2();
    } catch (_e) {
      pageLog2.warn("Failed to render negotiation list");
    }
    pageLog2.info("Negotiations parsed: " + negotiations.length + " items");
    fetchAllNegotiations().then((result) => {
      if (result && result.items && result.items.length > 0) {
        pageLog2.info("Aggregated: " + result.items.length + " items, errors=" + result.errors.length);
        setNegotiations(result.items);
        Promise.resolve().then(() => (init_state(), state_exports)).then(({ panelState: panelState2 }) => {
          panelState2.negotiationsMeta = {
            perTab: result.perTab,
            errors: result.errors,
            fetchedAt: result.fetchedAt,
            fromCache: result.fromCache
          };
        });
        Promise.resolve().then(() => (init_negotiations3(), negotiations_exports2)).then(({ renderNegotiationList: renderNegotiationList2 }) => {
          renderNegotiationList2();
        }).catch(() => {
        });
      }
    }).catch((err) => {
      pageLog2.warn("Aggregator fetch failed: " + err.message);
    });
    if (!negotiationsObserverActive) {
      negotiationsObserverActive = true;
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (!window.location.pathname.startsWith("/applicant/negotiations")) return;
          const fresh = await parseNegotiations();
          setNegotiations(fresh);
          try {
            const { renderNegotiationList: renderNegotiationList2 } = await Promise.resolve().then(() => (init_negotiations3(), negotiations_exports2));
            renderNegotiationList2();
          } catch (_e) {
          }
        }, 1500);
      }).observe(document.body, { childList: true, subtree: true });
      pageLog2.info("Negotiations SPA observer active");
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
    window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume } }));
    pageLog2.info("Resume loaded -> dispatched hh-ar-resume-loaded");
  }

  // src/content/main-page-handlers.js
  init_anti_hallucination();
  var pageLog3 = createLogger("Main");
  var lastHandledPath = "";
  var pageLogicInitialized = false;
  async function initPageLogic() {
    if (pageLogicInitialized) {
      pageLog3.info("Page logic already initialized -- skipping duplicate");
      return;
    }
    pageLogicInitialized = true;
    const currentPath = window.location.pathname;
    await routeToHandler(currentPath);
    lastHandledPath = currentPath;
    setupSPARouting();
    pageLog3.info("Page logic initialized, SPA routing active");
  }
  function resetPageInit() {
    lastHandledPath = "";
    pageLogicInitialized = false;
  }
  function setupSPARouting() {
    window.addEventListener("popstate", () => {
      onSPANavigate(window.location.pathname);
    });
    const origPush = history.pushState;
    history.pushState = function() {
      origPush.apply(this, arguments);
      onSPANavigate(window.location.pathname);
    };
    const origReplace = history.replaceState;
    history.replaceState = function() {
      origReplace.apply(this, arguments);
      onSPANavigate(window.location.pathname);
    };
    document.addEventListener("hh-ar-spa-navigate", (e2) => {
      const path = e2.detail?.path || window.location.pathname;
      pageLog3.info("MAIN world SPA navigate: " + path);
      onSPANavigate(path);
    });
  }
  var spaTimer = null;
  function onSPANavigate(newPath) {
    if (newPath === lastHandledPath) return;
    clearTimeout(spaTimer);
    spaTimer = setTimeout(async () => {
      if (window.location.pathname === lastHandledPath) return;
      const path = window.location.pathname;
      pageLog3.info("SPA navigate: " + lastHandledPath + " -> " + path);
      await routeToHandler(path);
      lastHandledPath = path;
    }, 300);
  }
  async function routeToHandler(path) {
    pageLog3.info("Routing: " + path);
    if (path.startsWith("/search/vacancy")) {
      await handleVacancySearchPage();
    } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
      await handleResumeDetailPage(path);
    } else if (/\/applicant\/resumes\/view/.test(path)) {
      await handleResumeDetailPage(path);
    } else if (path.startsWith("/applicant/resumes")) {
      await handleResumeListPage();
    } else if (/^\/vacancy\/\d+/.test(path)) {
      await handleVacancyDetailPage(path);
    } else if (path.startsWith("/applicant/negotiations")) {
      await handleNegotiationsPage();
    } else if (path === "/" || path === "") {
      await handleMainPage();
    }
  }

  // src/content/main-resume-loader.js
  init_anti_hallucination();
  init_storage();
  init_resume_detail2();
  init_resume_fetch();
  init_resumes2();
  init_state();
  var loadLog = createLogger("Main");
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
  async function handleReparseResume(e2) {
    if (!panelState.isLoggedIn) return;
    const resumeUrl = e2.detail?.resumeUrl;
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
        window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume } }));
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
      window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume } }));
    } else {
      setStatus2("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 (\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445)");
      loadLog.warn("Parse result has no useful data -- not saving. Found: " + JSON.stringify(resume._debug?.found) + " Missing: " + JSON.stringify(resume._debug?.missing));
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
      window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume: synced[0] } }));
    } else {
      setStatus2("\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0440\u0435\u0437\u044E\u043C\u0435: " + list.length + '. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C" \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438');
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
      window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume: synced[0] } }));
    } else {
      setStatus2('\u041D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0440\u0435\u0437\u044E\u043C\u0435. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435"');
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

  // src/content/main-sync.js
  init_anti_hallucination();
  init_storage();
  init_resume_fetch();
  init_resumes2();
  init_state();
  var syncLog = createLogger("Main");
  var syncInProgress = false;
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
          setStatus2("\u0421\u0438\u043D\u0445\u0440.: " + done + "/" + total + " -- " + msg);
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

  // src/content/main-resume-boot.js
  init_anti_hallucination();
  init_storage();
  init_resumes2();
  init_state();
  init_resume_constants();
  var loaderLog = createLogger("Main");
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
        loaderLog.info("Loaded saved resume: " + savedResume.title);
        window.dispatchEvent(new CustomEvent("hh-ar-resume-loaded", { detail: { resume: savedResume } }));
      }
    } catch (_e) {
    }
    try {
      setMyResumes(await getMyResumes());
      if (panelState.myResumes.length > 0) {
        loaderLog.info("Loaded " + panelState.myResumes.length + " saved resumes");
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
          loaderLog.info("Migrated resume data: added visibility, cleaned titles");
        }
        renderMyResumesPanel();
      }
    } catch (_e) {
    }
  }

  // src/lib/captcha-detector.js
  init_anti_hallucination();
  var captchaLog = createLogger("Captcha");
  var CAPTCHA_SELECTORS = [
    { sel: 'img[src*="captcha"]', type: "image" },
    { sel: ".g-recaptcha", type: "recaptcha" },
    { sel: '[data-qa*="captcha"]', type: "data-qa" },
    { sel: 'iframe[src*="recaptcha"]', type: "recaptcha-iframe" },
    { sel: "#captcha", type: "captcha-id" },
    { sel: ".captcha", type: "captcha-class" },
    { sel: "textarea#g-recaptcha-response", type: "recaptcha-response" }
  ];
  var CAPTCHA_STATE_KEY = "captchaState";
  var _state = { paused: false, reason: null, detectedAt: null, type: null };
  function detectCaptcha(root) {
    root = root || (typeof document !== "undefined" ? document : null);
    if (!root || !root.querySelectorAll) return { found: false, type: null, source: null };
    for (const { sel, type } of CAPTCHA_SELECTORS) {
      try {
        const el = root.querySelector(sel);
        if (el) {
          const style = typeof getComputedStyle === "function" ? getComputedStyle(el) : el.style;
          const display = style.display;
          const visibility = style.visibility;
          if (display === "none" || visibility === "hidden") continue;
          return { found: true, type, source: sel };
        }
      } catch (_e) {
      }
    }
    return { found: false, type: null, source: null };
  }
  function getCaptchaState() {
    return { ..._state };
  }
  function isAutoPaused() {
    return _state.paused === true;
  }
  async function pauseForCaptcha(type, reason) {
    _state = {
      paused: true,
      reason: reason || "CAPTCHA detected: " + (type || "unknown"),
      detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      type: type || null
    };
    try {
      await chrome.storage.local.set({ [CAPTCHA_STATE_KEY]: _state });
      captchaLog.warn("AUTO-PAUSE: " + _state.reason);
      return true;
    } catch (_e) {
      return false;
    }
  }
  async function resumeFromCaptcha() {
    _state = { paused: false, reason: null, detectedAt: null, type: null };
    try {
      await chrome.storage.local.remove(CAPTCHA_STATE_KEY);
      captchaLog.info("Manual resume: CAPTCHA pause cleared");
      return true;
    } catch (_e) {
      return false;
    }
  }
  async function loadCaptchaState() {
    try {
      const data = await chrome.storage.local.get(CAPTCHA_STATE_KEY);
      if (data && data[CAPTCHA_STATE_KEY]) {
        _state = { ..._state, ...data[CAPTCHA_STATE_KEY] };
      }
    } catch (_e) {
    }
  }
  async function checkAndPause(root, settings) {
    const detection = detectCaptcha(root);
    if (!detection.found) {
      return { found: false, paused: false, type: null };
    }
    const shouldPause = settings ? settings.captchaAutoPause !== false : true;
    if (shouldPause && !isAutoPaused()) {
      await pauseForCaptcha(detection.type, "CAPTCHA detected: " + detection.type);
    } else {
      captchaLog.info("CAPTCHA detected but auto-pause disabled or already paused");
    }
    return { found: true, paused: shouldPause, type: detection.type };
  }
  var _internal7 = {
    CAPTCHA_SELECTORS,
    CAPTCHA_STATE_KEY,
    _resetState: () => {
      _state = { paused: false, reason: null, detectedAt: null, type: null };
    }
  };

  // src/content/main.js
  init_anti_hallucination();
  init_storage();
  init_resume_detail2();
  init_match_scorer();
  init_storage();
  init_state();
  init_dom_inspector();
  init_fab();
  var mainLog = createLogger("Main");
  window.__hhDiagnose = diagnoseResumeDOM;
  window.__hhDebugVisibility = debugVisibility;
  window.__hhVisDiag = null;
  async function init() {
    mainLog.info("Loaded: " + window.location.href);
    await checkDailyReset();
    try {
      const [stats, settings] = await Promise.all([getStats(), getAllSettings()]);
      updateStats(stats);
      updateSettings(settings);
      mainLog.info("Boot: stats + settings loaded from storage");
    } catch (_e) {
      mainLog.warn("Boot: failed to load stats/settings: " + e.message);
    }
    await loadCaptchaState();
    createPanel();
    try {
      const settings = panelState.settings || {};
      const captchaRes = await checkAndPause(document, settings);
      if (captchaRes.found) {
        mainLog.warn("CAPTCHA detected on page load: " + captchaRes.type);
        if (chrome.action && chrome.action.setBadgeText) {
          chrome.action.setBadgeText({ text: "!" });
          chrome.action.setBadgeBackgroundColor({ color: "#D97706" });
        }
      }
    } catch (_e) {
    }
    await loadSavedResumes();
    window.addEventListener("hh-ar-apply", async (e2) => {
      if (!panelState.isLoggedIn) return;
      const { applyToVacancy: applyToVacancy2 } = await Promise.resolve().then(() => (init_engine(), engine_exports));
      await applyToVacancy2(e2.detail.vacancyId, panelState.resume);
    });
    window.addEventListener("hh-ar-apply-all", async () => {
      if (!panelState.isLoggedIn) return;
      const { applyToAll: applyToAll2 } = await Promise.resolve().then(() => (init_engine(), engine_exports));
      await applyToAll2(panelState.vacancies, void 0, panelState.resume);
    });
    window.addEventListener("hh-ar-refresh", async () => {
      if (!panelState.isLoggedIn) return;
      const v = await parseVacanciesFromPage(panelState.resume);
      updateVacancies(v);
    });
    window.addEventListener("hh-ar-load-resume", handleLoadResume);
    window.addEventListener("hh-ar-reparse-resume", handleReparseResume);
    window.addEventListener("hh-ar-sync-resumes", handleSyncResumes);
    document.addEventListener("HH-AR-RUN-VAC-DIAG", () => {
      try {
        const result = diagnoseVacancyPage();
        mainLog.info("Manual vac diag: " + (result.vacancyId || "no id"));
      } catch (_e) {
        mainLog.warn("Manual vac diag failed: " + e.message);
      }
    });
    if (/^\/vacancy\/\d+/.test(window.location.pathname)) {
      setTimeout(() => {
        try {
          diagnoseVacancyPage();
        } catch (_e) {
        }
      }, 2e3);
    }
    window.addEventListener("hh-ar-init-page-logic", () => {
      mainLog.info("Received hh-ar-init-page-logic event -> calling initPageLogic()");
      initPageLogic();
    });
    const isDetailPage = /^\/vacancy\/\d+/.test(window.location.pathname) || /^\/resume\/[a-f0-9]+/.test(window.location.pathname) || /^\/applicant\/resumes\/view/.test(window.location.pathname);
    if (isDetailPage) {
      setTimeout(() => {
        initPageLogic();
      }, 3e3);
    }
    window.addEventListener("hh-ar-resume-loaded", (e2) => {
      const resume = e2.detail?.resume || panelState.resume;
      if (!resume) return;
      if (!/^\/vacancy\/\d+/.test(window.location.pathname)) return;
      mainLog.info("Resume loaded -- re-scoring vacancy detail page");
      try {
        const detail = parseVacancyDetail();
        if (detail) {
          const score = computeMatchScore(resume, detail);
          detail.matchScore = score.total;
          detail.matchBreakdown = score.breakdown;
          mainLog.info("Re-score: " + score.total + "% (skills=" + score.breakdown.skills + ", title=" + score.breakdown.title + ", salary=" + score.breakdown.salary + ", exp=" + score.breakdown.experience + ")");
          saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {
          });
          saveVacancyDetail(detail).catch(() => {
          });
          window.__hhVacDetail = detail;
          window.dispatchEvent(new CustomEvent("hh-ar-match-updated", { detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details } }));
        }
      } catch (err) {
        mainLog.warn("Re-score failed: " + err.message);
      }
    });
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "toggle-inspector") {
      toggleInspector();
      setFabInspectorActive2(isInspectorActive());
      sendResponse({ active: isInspectorActive() });
    }
  });
  if (!("update_url" in chrome.runtime.getManifest())) {
    try {
      const hmr = new WebSocket("ws://localhost:35729");
      hmr.onmessage = (e2) => {
        if (e2.data === "reload") {
          mainLog.info("[hmr] Reload signal received -- reloading extension");
          chrome.runtime.reload();
        }
      };
      hmr.onopen = () => mainLog.info("[hmr] Connected to dev server");
      hmr.onerror = () => {
      };
      hmr.onclose = () => mainLog.info("[hmr] Disconnected from dev server");
    } catch (_e) {
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
