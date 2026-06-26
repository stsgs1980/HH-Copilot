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

// src/services/ai-service.js
async function getAiConfig() {
  try {
    const data = await chrome.storage.local.get(AI_CONFIG_KEY);
    const cfg = data[AI_CONFIG_KEY] || {};
    const useDefaults = !cfg.__test_no_defaults;
    const d = useDefaults ? BUILTIN_DEFAULTS : { apiKey: "", token: "", chatId: "", userId: "" };
    return {
      baseUrl: cfg.baseUrl || DEFAULT_BASE_URL,
      apiKey: cfg.apiKey || d.apiKey,
      token: cfg.token || d.token,
      chatId: cfg.chatId || d.chatId,
      userId: cfg.userId || d.userId,
      model: cfg.model || DEFAULT_MODEL,
      timeoutMs: clampTimeout(cfg.timeoutMs)
    };
  } catch (_e) {
    return {
      baseUrl: DEFAULT_BASE_URL,
      apiKey: BUILTIN_DEFAULTS.apiKey,
      token: BUILTIN_DEFAULTS.token,
      chatId: BUILTIN_DEFAULTS.chatId,
      userId: BUILTIN_DEFAULTS.userId,
      model: DEFAULT_MODEL,
      timeoutMs: DEFAULT_TIMEOUT_MS
    };
  }
}
function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(n)));
}
async function setAiConfig(partial) {
  const current = await getAiConfig();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: next });
  aiLog.info("AI config updated (baseUrl=" + next.baseUrl + ", key=" + (next.apiKey ? "set" : "empty") + ", token=" + (next.token ? "set" : "empty") + ")");
  return next;
}
async function isAiAvailable() {
  const cfg = await getAiConfig();
  return !!(cfg.apiKey && cfg.token);
}
async function sendMessage(params) {
  const messages = params?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array", code: "BAD_INPUT" };
  }
  const cfg = await getAiConfig();
  if (!cfg.apiKey || !cfg.token) {
    return { ok: false, error: "AI not configured (apiKey or token missing)", code: "NO_API_KEY" };
  }
  const body = {
    messages,
    model: params.model || cfg.model,
    temperature: typeof params.temperature === "number" ? params.temperature : 0.7,
    thinking: { type: "disabled" },
    stream: false
  };
  const url = cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const timeoutMs = clampTimeout(params.timeoutMs || cfg.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const fetchImpl = params.fetchImpl || globalThis.fetch.bind(globalThis);
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + cfg.apiKey,
    "X-Z-AI-From": "Z"
  };
  if (cfg.chatId) headers["X-Chat-Id"] = cfg.chatId;
  if (cfg.userId) headers["X-User-Id"] = cfg.userId;
  if (cfg.token) headers["X-Token"] = cfg.token;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : void 0
    });
    if (!response.ok) {
      const code = response.status === 429 ? "RATE_LIMIT" : "HTTP_" + response.status;
      let errBody = "";
      try {
        errBody = await response.text();
      } catch (_e) {
      }
      aiLog.warn("AI HTTP " + response.status + ": " + errBody.slice(0, 200));
      return { ok: false, error: "HTTP " + response.status, code, httpBody: errBody.slice(0, 500) };
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      return { ok: false, error: "Invalid JSON in AI response: " + e.message, code: "BAD_JSON" };
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return { ok: false, error: "AI returned empty content", code: "EMPTY", raw: data };
    }
    return {
      ok: true,
      text: text.trim(),
      usage: data.usage || null
    };
  } catch (err) {
    const isAbort = err && (err.name === "AbortError" || /aborted/i.test(err.message || ""));
    if (isAbort) {
      return { ok: false, error: "Request timeout after " + timeoutMs + "ms", code: "TIMEOUT" };
    }
    aiLog.warn("AI network error: " + (err.message || String(err)));
    return { ok: false, error: err.message || String(err), code: "NETWORK" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
var aiLog, DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS, DEFAULT_MODEL, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, BUILTIN_DEFAULTS, AI_CONFIG_KEY;
var init_ai_service = __esm({
  "src/services/ai-service.js"() {
    init_anti_hallucination();
    aiLog = createLogger("AIService");
    DEFAULT_BASE_URL = "https://internal-api.z.ai/v1";
    DEFAULT_TIMEOUT_MS = 6e4;
    DEFAULT_MODEL = "glm-4.5";
    MIN_TIMEOUT_MS = 5e3;
    MAX_TIMEOUT_MS = 18e4;
    BUILTIN_DEFAULTS = Object.freeze({
      apiKey: "Z.ai",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiN2U5MjY3YWMtM2Q3MS00ODA4LWI3M2YtZTAzZGViYzVhMzBhIiwiY2hhdF9pZCI6ImNoYXQtNTVkMWFlNzUtMDQ0Ni00NGYwLWIyZmQtMzc3OWEwMTU4MTAwIiwicGxhdGZvcm0iOiJ6YWkifQ.JjoptGFwMQjXuU4afXfqfJ9Cqf2f1q9gKPNSSSvrfS4",
      chatId: "chat-55d1ae75-0446-44f0-b2fd-3779a0158100",
      userId: "7e9267ac-3d71-4808-b73f-e03debc5a30a"
    });
    AI_CONFIG_KEY = "aiConfig";
  }
});

// src/lib/cover-letter-scorecard.js
function splitSentences(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 5);
}
function isConcreteSentence(s) {
  if (!s || s.length < 10) return false;
  if (/^(команда|развивайтесь с нами|наша команда|будет плюсом|желательно)/i.test(s)) return false;
  const hasVerb = /\b(разработ|настрой|оптимиз|поддержк|автоматиз|внедрен|реализ|управляй|управлен|анализ|тест|deploy|build|test|implement|automate|monitor)\w*/i.test(s);
  const hasNoun = /[а-яёa-z]{4,}/i.test(s);
  return hasVerb || hasNoun;
}
function parseRequirementsPhases(reqText) {
  if (!reqText) return [];
  return reqText.split(/[,\n;]+/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80).map((s) => s.replace(REQ_PREFIXES, "").trim()).filter((s) => s.length > 2).map((s) => s.replace(/\.$/, ""));
}
function extractScorecard(vacancy) {
  if (!vacancy) {
    return { mission: "", outcomes: [], competencies: [], source: {} };
  }
  const title = vacancy.title || "\u0440\u043E\u043B\u044C";
  const sections = vacancy.description && vacancy.description.sections || {};
  const responsibilities = sections.responsibilities || "";
  const requirements = sections.requirements || "";
  const keySkills = Array.isArray(vacancy.keySkills) ? vacancy.keySkills.slice(0, 8) : [];
  const respSentences = splitSentences(responsibilities);
  const firstResp = respSentences[0] || "";
  let mission;
  if (firstResp) {
    mission = title + ": " + firstResp;
  } else {
    mission = title + " \u0432 " + (vacancy.company || "\u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438");
  }
  let outcomes = respSentences.filter(isConcreteSentence).slice(0, MAX_OUTCOMES);
  if (outcomes.length === 0) {
    outcomes = ["\u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0442\u044C \u043E\u0431\u044F\u0437\u0430\u043D\u043D\u043E\u0441\u0442\u0438 \u0440\u043E\u043B\u0438 " + title];
  }
  const reqPhrases = parseRequirementsPhases(requirements);
  const seen = /* @__PURE__ */ new Set();
  const competencies = [];
  for (const sk of keySkills) {
    const s = String(sk).trim();
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      competencies.push(s);
    }
  }
  for (const r of reqPhrases) {
    if (competencies.length >= MAX_COMPETENCIES) break;
    if (!seen.has(r.toLowerCase())) {
      seen.add(r.toLowerCase());
      competencies.push(r);
    }
  }
  return {
    mission,
    outcomes,
    competencies,
    source: {
      mission: firstResp ? "title+responsibilities[0]" : "title+company",
      outcomes: "responsibilities (" + outcomes.length + " concrete sentences)",
      competencies: "keySkills(" + keySkills.length + ")+requirements(" + reqPhrases.length + ")"
    }
  };
}
var MAX_OUTCOMES, MAX_COMPETENCIES, REQ_PREFIXES;
var init_cover_letter_scorecard = __esm({
  "src/lib/cover-letter-scorecard.js"() {
    MAX_OUTCOMES = 5;
    MAX_COMPETENCIES = 10;
    REQ_PREFIXES = /^(опыт работы с|опыт работы в|опыт с|опыт в|знание|понимание|владение|работа с|работа в|навыки|умение)\s+/i;
  }
});

// src/lib/skill-stem-match.js
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function shortStemMatches(sentence, word) {
  const escaped = escapeRegex(word);
  for (const suffix of SHORT_STEM_SUFFIXES) {
    const re = new RegExp(
      "(^|" + BOUND + ")" + escaped + escapeRegex(suffix) + "(" + BOUND + "|$)",
      "i"
    );
    if (re.test(sentence)) return true;
  }
  const exactRe = new RegExp("(^|" + BOUND + ")" + escaped + "(" + BOUND + "|$)", "i");
  return exactRe.test(sentence);
}
function mentionsSkillStem(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = String(sentence).toLowerCase();
  const allSkillWords = String(skill).toLowerCase().split(/[\s-]+/).map((w) => w.trim()).filter((w) => w.length > 0);
  if (allSkillWords.length === 0) return false;
  const shortWords = allSkillWords.filter((w) => w.length < MIN_STEM_LEN);
  const longWords = allSkillWords.filter((w) => w.length >= MIN_STEM_LEN);
  for (const sw of shortWords) {
    const re = new RegExp("(^|" + BOUND + ")" + escapeRegex(sw) + "(" + BOUND + "|$)", "i");
    if (!re.test(s)) return false;
  }
  if (longWords.length === 0) return shortWords.length > 0;
  for (const lw of longWords) {
    if (lw.length <= 6) {
      if (!shortStemMatches(s, lw)) return false;
    } else {
      const stem = lw.substring(0, 6);
      const re = new RegExp("(^|" + BOUND + ")" + escapeRegex(stem), "i");
      if (!re.test(s)) return false;
    }
  }
  return true;
}
var MIN_STEM_LEN, BOUND, SHORT_STEM_SUFFIXES;
var init_skill_stem_match = __esm({
  "src/lib/skill-stem-match.js"() {
    MIN_STEM_LEN = 4;
    BOUND = "[^a-z\u0430-\u044F\u04510-9]";
    SHORT_STEM_SUFFIXES = [
      // Russian case endings (nominal + adjectival)
      "\u0430",
      "\u044F",
      "\u0443",
      "\u044E",
      "\u043E\u043C",
      "\u043E\u0439",
      "\u0435\u0439",
      "\u0435",
      "\u044B",
      "\u0438",
      "\u0430\u043C",
      "\u044F\u043C",
      "\u0430\u0445",
      "\u044F\u0445",
      "\u043E\u0432",
      "\u0435\u0432",
      "\u0430\u043C\u0438",
      "\u044F\u043C\u0438",
      "\u044C",
      "\u043E\u0433\u043E",
      "\u0435\u0433\u043E",
      "\u043E\u043C\u0443",
      "\u0435\u043C\u0443",
      // Common English inflections
      "s",
      "es",
      "ed",
      "ing",
      "er",
      "or",
      "ly",
      "tion"
    ];
  }
});

// src/lib/cover-letter-evidence-fallback.js
function splitSentences2(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 5);
}
function truncate(text) {
  return text.length > MAX_EVIDENCE_SENTENCE_LEN ? text.substring(0, MAX_EVIDENCE_SENTENCE_LEN) + "..." : text;
}
function buildExperienceFallback(experience, max) {
  const out = [];
  if (!Array.isArray(experience) || experience.length === 0) return out;
  const startIdx = Math.max(0, experience.length - max);
  for (let i = experience.length - 1; i >= startIdx; i--) {
    const exp = experience[i];
    if (!exp) continue;
    const sentences = exp.description ? splitSentences2(exp.description) : [];
    const sentence = sentences[0] || exp.position || exp.company || "";
    if (!sentence) continue;
    out.push({
      competency: "(\u043E\u043F\u044B\u0442 \u0438\u0437 \u0440\u0435\u0437\u044E\u043C\u0435)",
      evidenceText: truncate(sentence),
      source: {
        type: "experience_fallback",
        index: i,
        sentence,
        company: exp.company || "",
        position: exp.position || "",
        period: exp.period || ""
      },
      confidence: "low"
    });
  }
  return out;
}
var MAX_EVIDENCE_SENTENCE_LEN;
var init_cover_letter_evidence_fallback = __esm({
  "src/lib/cover-letter-evidence-fallback.js"() {
    MAX_EVIDENCE_SENTENCE_LEN = 280;
  }
});

// src/lib/cover-letter-evidence-search.js
function mentionsSkill(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = sentence.toLowerCase();
  const k = String(skill).toLowerCase().trim();
  const re = new RegExp("(^|[^a-z\u0430-\u044F\u04510-9])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z\u0430-\u044F\u04510-9]|$)", "i");
  return re.test(s);
}
function makeFound(i, exp, sentence, fieldType, entryDescription) {
  return {
    sentence,
    index: i,
    company: exp.company || "",
    position: exp.position || "",
    period: exp.period || "",
    entryDescription,
    fieldType
  };
}
function findCompetencyEvidence(comp, experience) {
  if (!comp || !Array.isArray(experience)) return null;
  for (let i = experience.length - 1; i >= 0; i--) {
    const exp = experience[i];
    if (!exp) continue;
    let found = null;
    if (exp.description) {
      for (const sentence of splitSentences2(exp.description)) {
        if (mentionsSkill(sentence, comp)) {
          found = makeFound(i, exp, sentence, "description", exp.description);
          break;
        }
      }
    }
    if (!found && exp.position && mentionsSkill(exp.position, comp)) {
      found = makeFound(i, exp, exp.position, "position", exp.position);
    }
    if (!found && exp.company && mentionsSkill(exp.company, comp)) {
      found = makeFound(i, exp, exp.company, "company", exp.company);
    }
    if (!found && exp.description) {
      for (const sentence of splitSentences2(exp.description)) {
        if (mentionsSkillStem(sentence, comp)) {
          found = makeFound(i, exp, sentence, "stem", exp.description);
          break;
        }
      }
    }
    if (found) return found;
  }
  return null;
}
var init_cover_letter_evidence_search = __esm({
  "src/lib/cover-letter-evidence-search.js"() {
    init_skill_stem_match();
    init_cover_letter_evidence_fallback();
  }
});

// src/lib/cover-letter-evidence.js
function assessConfidence(entryDescription) {
  if (!entryDescription) return "medium";
  if (/\d+\s*%|\d+\s*(раз|раза|ч|часов|часа|мин|мес|лет|года|год)\b|\d{4}\b|\$\s*\d+|\d+\s*(пользовател|клиент|страниц|записей|репозитор)/i.test(entryDescription)) {
    return "high";
  }
  return "medium";
}
function normalizeSkill(s) {
  return String(s || "").toLowerCase().trim().replace(/[-\u2013\u2014]/g, " ").replace(/ё/g, "\u0435").replace(/\s+/g, " ");
}
function mapEvidence(scorecard, resume, matchResult) {
  if (!scorecard || !resume || !matchResult) return [];
  if (!Array.isArray(scorecard.competencies)) return [];
  const details = matchResult.details || {};
  const matching = Array.isArray(details.matchingSkills) ? details.matchingSkills : [];
  const derived = Array.isArray(details.derivedMatchSkills) ? details.derivedMatchSkills : [];
  const synonyms = Array.isArray(details.synonymMatchSkills) ? details.synonymMatchSkills : [];
  const implied = Array.isArray(details.impliedMatchSkills) ? details.impliedMatchSkills : [];
  const missing = new Set(
    (Array.isArray(details.missingSkills) ? details.missingSkills : []).map((s) => normalizeSkill(s))
  );
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const resumeSkillsArr = Array.isArray(resume.skills) ? resume.skills : [];
  const resumeSkillsNorm = new Set(resumeSkillsArr.map(normalizeSkill));
  const evidence = [];
  for (const competency of scorecard.competencies) {
    const comp = String(competency).trim();
    if (!comp) continue;
    const compNorm = normalizeSkill(comp);
    if (missing.has(compNorm)) continue;
    const isMatching = matching.some((s) => normalizeSkill(s) === compNorm);
    const isDerived = derived.some((s) => normalizeSkill(s) === compNorm);
    const isSynonym = synonyms.some((s) => {
      const parts = String(s).split("~").map((p) => normalizeSkill(p));
      return parts.includes(compNorm);
    });
    const isImplied = implied.some((s) => normalizeSkill(s) === compNorm);
    if (!isMatching && !isDerived && !isSynonym && !isImplied) {
      continue;
    }
    const found = findCompetencyEvidence(comp, experience);
    if (!found && resumeSkillsNorm.has(compNorm)) {
      evidence.push({
        competency: comp,
        evidenceText: "\u0414\u0435\u043A\u043B\u0430\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u043D\u0430\u0432\u044B\u043A \u0432 \u0440\u0435\u0437\u044E\u043C\u0435: " + comp,
        source: {
          type: "skill_declaration",
          index: -1,
          sentence: "",
          company: "",
          position: "",
          period: ""
        },
        confidence: "declared"
      });
      continue;
    }
    if (!found) continue;
    let confidence;
    if (isMatching) {
      confidence = assessConfidence(found.entryDescription);
    } else {
      confidence = "medium";
    }
    if (found.fieldType !== "description") {
      confidence = "medium";
    }
    if (found.fieldType === "stem") {
      confidence = "low";
    }
    evidence.push({
      competency: comp,
      evidenceText: truncate(found.sentence),
      source: {
        type: "experience",
        index: found.index,
        sentence: found.sentence,
        company: found.company,
        position: found.position,
        period: found.period
      },
      confidence
    });
  }
  if (evidence.length === 0) {
    evidence.push(...buildExperienceFallback(experience, EXPERIENCE_FALLBACK_MAX));
  }
  return evidence;
}
var EXPERIENCE_FALLBACK_MAX;
var init_cover_letter_evidence = __esm({
  "src/lib/cover-letter-evidence.js"() {
    init_skill_stem_match();
    init_cover_letter_evidence_fallback();
    init_cover_letter_evidence_search();
    EXPERIENCE_FALLBACK_MAX = 2;
  }
});

// src/lib/cover-letter-prompt.js
function buildPrompt(scorecard, evidence, tone) {
  const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.formal;
  const system = SYSTEM_PROMPT_TEMPLATE.replace("{tone}", toneDesc);
  const outcomes = (scorecard.outcomes || []).map((o, i) => "    - " + o).join("\n");
  const evidenceLines = (evidence || []).map((e) => "  [" + e.competency + "]: " + e.evidenceText + "  [\u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: " + e.confidence + "]").join("\n");
  const user = `\u0412\u0410\u041A\u0410\u041D\u0421\u0418\u042F:
  \u041F\u043E\u0437\u0438\u0446\u0438\u044F: ${scorecard.position || "(\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430)"}
  \u041A\u043E\u043C\u043F\u0430\u043D\u0438\u044F: ${scorecard.company || "(\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430)"}
  \u041C\u0438\u0441\u0441\u0438\u044F \u0440\u043E\u043B\u0438: ${scorecard.mission || ""}
  \u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0437\u0430 12 \u043C\u0435\u0441:
${outcomes || "    (\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B)"}

\u041A\u041E\u041C\u041F\u0415\u0422\u0415\u041D\u0426\u0418\u0418 + \u0414\u041E\u041A\u0410\u0417\u0410\u0422\u0415\u041B\u042C\u0421\u0422\u0412\u0410 (\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0438):
${evidenceLines || "  (\u043D\u0435\u0442 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432)"}

\u0422\u041E\u041D: ${tone}

\u041D\u0430\u043F\u0438\u0448\u0438 \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u043F\u0438\u0441\u044C\u043C\u043E \u043F\u043E \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0435 \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u043C\u043F\u0442\u0430.`;
  const totalChars = system.length + user.length;
  const estimatedTokens = Math.ceil(totalChars / 4);
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    estimatedTokens
  };
}
var TONE_DESCRIPTIONS, SYSTEM_PROMPT_TEMPLATE;
var init_cover_letter_prompt = __esm({
  "src/lib/cover-letter-prompt.js"() {
    TONE_DESCRIPTIONS = {
      formal: "formal and respectful (\u0444\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u044B\u0439)",
      friendly: "friendly and warm (\u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439)",
      concise: "concise and to the point (\u043A\u0440\u0430\u0442\u043A\u0438\u0439)",
      enthusiastic: "enthusiastic and motivated (\u044D\u043D\u0442\u0443\u0437\u0438\u0430\u0437\u043C)"
    };
    SYSTEM_PROMPT_TEMPLATE = `\u0422\u044B -- \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u043F\u043E \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044E \u0441\u043E\u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0438\u0441\u0435\u043C \u0434\u043B\u044F hh.ru.
\u0422\u043E\u043D: {tone}.

\u0416\u0401\u0421\u0422\u041A\u0418\u0415 \u041F\u0420\u0410\u0412\u0418\u041B\u0410 (anti-hallucination):
1. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0422\u041E\u041B\u042C\u041A\u041E \u0444\u0430\u043A\u0442\u044B \u0438\u0437 \u0431\u043B\u043E\u043A\u0430 "\u0414\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430" \u043D\u0438\u0436\u0435.
2. \u041D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u043D\u0430\u0432\u044B\u043A\u0438, \u043C\u0435\u0441\u0442\u0430 \u0440\u0430\u0431\u043E\u0442\u044B, \u0434\u0430\u0442\u044B, \u0446\u0438\u0444\u0440\u044B, \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F.
3. \u0415\u0441\u043B\u0438 \u0434\u043B\u044F \u043A\u043E\u043C\u043F\u0435\u0442\u0435\u043D\u0446\u0438\u0438 \u043D\u0435\u0442 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 -- \u043D\u0435 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u0439 \u0435\u0451.
4. \u041D\u0435 \u0431\u043E\u043B\u0435\u0435 2500 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.
5. \u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430: \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 -> 2-3 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0445 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 (\u043A\u0430\u0436\u0434\u044B\u0439 = \u043A\u043E\u043C\u043F\u0435\u0442\u0435\u043D\u0446\u0438\u044F + \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E + \u043F\u0440\u043E\u0435\u043A\u0446\u0438\u044F) -> \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u0435.
6. \u0411\u0435\u0437 "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u043C\u0435\u043D\u044F \u0437\u043E\u0432\u0443\u0442..." -- \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \u043F\u043E \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u0435\u0441\u043B\u0438 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E, \u0438\u043D\u0430\u0447\u0435 "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435".

\u0417\u0410\u041F\u0420\u0415\u0429\u0401\u041D\u041D\u042B\u0415 AI-\u041F\u0410\u0422\u0422\u0415\u0420\u041D\u042B (\u043F\u043E humanizer skill, \u0440\u0443\u0441\u0441\u043A\u0438\u0435 \u0430\u043D\u0430\u043B\u043E\u0433\u0438):
- Inflated symbolism: "\u0441\u043B\u0443\u0436\u0438\u0442 testament\u043E\u043C", "\u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0435\u0442 \u0432\u0430\u0436\u043D\u043E\u0441\u0442\u044C", "\u0432\u044B\u0441\u0442\u0443\u043F\u0430\u0435\u0442 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E\u043C", "\u0441\u0432\u0438\u0434\u0435\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0443\u0435\u0442 \u043E"
- AI vocabulary: "\u043A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E", "\u0431\u043E\u043B\u0435\u0435 \u0442\u043E\u0433\u043E", "\u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0442\u0435\u043C", "\u0432\u0430\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C", "\u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u043F\u043E\u0434\u0447\u0435\u0440\u043A\u043D\u0443\u0442\u044C"
- Negative parallelism: "\u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E..., \u043D\u043E \u0438...", "\u044D\u0442\u043E \u043D\u0435 \u043F\u0440\u043E\u0441\u0442\u043E..., \u044D\u0442\u043E..."
- \u0414\u0435\u0435\u043F\u0440\u0438\u0447\u0430\u0441\u0442\u0438\u044F-\u043D\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: "\u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0438\u0432\u0430\u044F", "\u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u044F", "\u043E\u0442\u0440\u0430\u0436\u0430\u044F", "\u0434\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0438\u0440\u0443\u044F"
- Rule of three (3 \u043E\u0434\u043D\u043E\u0440\u043E\u0434\u043D\u044B\u0445): "\u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C, \u043D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u044C \u0438 \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u0443\u0435\u043C\u043E\u0441\u0442\u044C"
- Em dash \u0432\u043C\u0435\u0441\u0442\u043E \u0437\u0430\u043F\u044F\u0442\u044B\u0445
- Generic positive conclusions: "\u0431\u0443\u0434\u0443 \u0440\u0430\u0434 \u043F\u0440\u0438\u043D\u0435\u0441\u0442\u0438 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u044C", "\u0443\u0432\u0435\u0440\u0435\u043D, \u0447\u0442\u043E \u043C\u043E\u0439 \u043E\u043F\u044B\u0442..."
- Filler: "\u0432\u0430\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C, \u0447\u0442\u043E", "\u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u043F\u043E\u0434\u0447\u0435\u0440\u043A\u043D\u0443\u0442\u044C"
- **\u0416\u0438\u0440\u043D\u044B\u0439 \u0448\u0440\u0438\u0444\u0442** \u0432 \u043F\u0438\u0441\u044C\u043C\u0435
- Inline-header \u0441\u043F\u0438\u0441\u043A\u0438: "- **\u041E\u043F\u044B\u0442:** ..."
- Sycophantic: "\u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0441\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043A \u043C\u043E\u0435\u043C\u0443 \u0440\u0435\u0437\u044E\u043C\u0435!"

\u041F\u0438\u0448\u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E. \u0415\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0446\u0438\u0444\u0440\u0430 -- \u043F\u0438\u0448\u0438 \u0446\u0438\u0444\u0440\u0443. \u0415\u0441\u043B\u0438 \u043D\u0435\u0442 -- \u043B\u0443\u0447\u0448\u0435 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043F\u043E\u043D\u0442\u043E\u0432, \u0447\u0435\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441 \u0432\u043E\u0434\u043E\u0439.`;
  }
});

// src/lib/cover-letter-validator.js
function detectAIPatterns(text) {
  const warnings = [];
  for (const { name, re } of AI_PATTERNS) {
    if (re.test(text)) {
      warnings.push("AI_PATTERN: " + name);
    }
  }
  const emDashCount = (text.match(/—/g) || []).length;
  if (emDashCount > 3) {
    warnings.push("AI_PATTERN: em_dash_overuse (" + emDashCount + ")");
  }
  if (/\*\*[^*]+\*\*/.test(text)) {
    warnings.push("AI_PATTERN: boldface (auto-stripped)");
  }
  return warnings;
}
function stripBoldface(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}
function stripLeadingFiller(text) {
  let t = text;
  t = t.replace(NAME_INTRO_RE, "");
  t = t.replace(LLM_FILLER_RE, "");
  return t;
}
function findUnverifiedSkills(text, evidence, resumeSkills) {
  const warnings = [];
  if (!text) return warnings;
  const known = /* @__PURE__ */ new Set();
  (evidence || []).forEach((e) => known.add(String(e.competency).toLowerCase().trim()));
  (resumeSkills || []).forEach((s) => {
    if (typeof s === "string") known.add(s.toLowerCase().trim());
    else if (s && s.name) known.add(s.name.toLowerCase().trim());
  });
  const techSkillRe = /\b([A-Z][a-zA-Z0-9.#-]{2,30})\b/g;
  const matches = text.matchAll(techSkillRe);
  const seen = /* @__PURE__ */ new Set();
  for (const m of matches) {
    const skill = m[1];
    const low = skill.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    if (/^(React|TypeScript|JavaScript|Python|Java|Go|Rust|C\+\+|SQL|HTML|CSS|Node\.js|Docker|Kubernetes|AWS|GCP|Azure|Kafka|Redis|MongoDB|PostgreSQL|MySQL|GraphQL|REST|API|HTTP|HTTPS|CI|CD|Git|Linux|Windows|MacOS)$/.test(skill)) {
      if (!known.has(low)) {
        warnings.push("UNVERIFIED_SKILL: " + skill);
      }
    }
  }
  return warnings;
}
function findUnverifiedNumbers(text, evidence) {
  const warnings = [];
  if (!text) return warnings;
  const evidenceNumbers = /* @__PURE__ */ new Set();
  (evidence || []).forEach((e) => {
    const nums = String(e.evidenceText || "").match(/\d+/g);
    if (nums) nums.forEach((n) => evidenceNumbers.add(n));
  });
  const textNums = text.match(/\d+/g);
  if (!textNums) return warnings;
  const suspect = textNums.filter((n) => {
    const i = parseInt(n, 10);
    if (i >= 1900 && i <= 2099) return false;
    if (i < 2) return false;
    return !evidenceNumbers.has(n);
  });
  const unique = [...new Set(suspect)].slice(0, 5);
  unique.forEach((n) => warnings.push("UNVERIFIED_NUMBER: " + n));
  return warnings;
}
function validateLetter(text, evidence, resumeSkills) {
  let cleaned = text || "";
  const warnings = [];
  warnings.push(...detectAIPatterns(cleaned));
  cleaned = stripLeadingFiller(cleaned);
  cleaned = stripBoldface(cleaned);
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.substring(0, MAX_LENGTH - 3) + "...";
    warnings.push("LENGTH: truncated to " + MAX_LENGTH + " chars");
  }
  warnings.push(...findUnverifiedSkills(cleaned, evidence, resumeSkills));
  warnings.push(...findUnverifiedNumbers(cleaned, evidence));
  const criticalPatterns = warnings.filter(
    (w) => /UNVERIFIED_SKILL|UNVERIFIED_NUMBER/.test(w)
  );
  const ok = criticalPatterns.length === 0 && cleaned.length > 0;
  return { ok, text: cleaned, warnings };
}
var MAX_LENGTH, AI_PATTERNS, LLM_FILLER_RE, NAME_INTRO_RE;
var init_cover_letter_validator = __esm({
  "src/lib/cover-letter-validator.js"() {
    MAX_LENGTH = 5e3;
    AI_PATTERNS = [
      { name: "inflated_symbolism", re: /служит\s+\S*\s*(?:свидетельством|доказательством)|выступает\s+доказательством|подчёркивает важность|свидетельствует о/i },
      { name: "ai_vocabulary", re: /кроме того|более того|вместе с тем|важно отметить|следует подчеркнуть/i },
      { name: "negative_parallelism", re: /не только[^.!?]{1,80}но и|это не просто[^.!?]{1,80}это/i },
      { name: "verbal_noun_filler", re: /обеспечивая|подчёркивая|отражая|демонстрируя|формируя/i },
      { name: "generic_conclusion", re: /буду рад принести ценность|уверен,?\s*что мой опыт|безусловно[^.!?]{1,40}подтвердится/i },
      { name: "filler", re: /важно отметить,?\s*что|следует подчеркнуть,?\s*что/i },
      { name: "sycophantic", re: /большое спасибо за внимание|благодарю за уделённое время/i },
      { name: "inline_header_list", re: /^\s*[•\-*]\s*\*\*[^*]+\*\*:/m }
    ];
    LLM_FILLER_RE = /^(Я уверен,?\s*что мой опыт[^.!?]{0,100}[.!?]\s*)/i;
    NAME_INTRO_RE = /^Здравствуйте,?\s*меня зовут[^.!?]+[.!?]\s*/i;
  }
});

// src/lib/cover-letter-tone.js
function validateTone(tone) {
  if (typeof tone !== "string") return "formal";
  return TONES.find((t) => t.id === tone) ? tone : "formal";
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
var TONES, GREETINGS, CLOSINGS;
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

// src/lib/cover-letter-ai.js
var cover_letter_ai_exports = {};
__export(cover_letter_ai_exports, {
  generateAICoverLetter: () => generateAICoverLetter
});
async function generateAICoverLetter(vacancy, resume, opts) {
  if (!vacancy || !resume) {
    return { ok: false, error: "vacancy and resume are required", code: "BAD_INPUT" };
  }
  const o = opts || {};
  const tone = validateTone(o.tone);
  const available = await isAiAvailable();
  if (!available) {
    aiLetterLog.warn("AI not available -- NO_API_KEY");
    return { ok: false, code: "NO_API_KEY", error: "AI API key not configured" };
  }
  const scorecard = extractScorecard(vacancy);
  scorecard.position = vacancy.title || "";
  scorecard.company = vacancy.company || "";
  aiLetterLog.info("Scorecard: " + scorecard.mission + " | " + scorecard.outcomes.length + " outcomes | " + scorecard.competencies.length + " competencies");
  const matchResult = computeMatchScore(resume, vacancy);
  aiLetterLog.info("Match: " + matchResult.total + "% | matching=" + (matchResult.details.matchingSkills || []).length);
  const evidence = mapEvidence(scorecard, resume, matchResult);
  if (evidence.length === 0) {
    aiLetterLog.warn("No evidence found -- NO_EVIDENCE");
    return { ok: false, code: "NO_EVIDENCE", error: "No matching skills with experience evidence found" };
  }
  aiLetterLog.info("Evidence: " + evidence.length + " items (high=" + evidence.filter((e) => e.confidence === "high").length + ")");
  const { messages } = buildPrompt(scorecard, evidence, tone);
  const result = await sendMessage({
    messages,
    temperature: 0.4,
    fetchImpl: o.fetchImpl
  });
  if (!result.ok) {
    aiLetterLog.warn("AI call failed: " + result.code + " / " + result.error);
    return { ok: false, code: "AI_ERROR", error: result.error || "AI call failed", aiCode: result.code };
  }
  const resumeSkills = Array.isArray(resume.skills) ? resume.skills : [];
  const validation = validateLetter(result.text, evidence, resumeSkills);
  let finalText = applyTone(validation.text, tone);
  if (finalText.length > 5e3) {
    finalText = finalText.substring(0, 4997) + "...";
  }
  aiLetterLog.info("Generated letter: " + finalText.length + " chars | warnings=" + validation.warnings.length);
  return {
    ok: true,
    text: finalText,
    method: "ai",
    warnings: validation.warnings
  };
}
var aiLetterLog;
var init_cover_letter_ai = __esm({
  "src/lib/cover-letter-ai.js"() {
    init_anti_hallucination();
    init_cover_letter_scorecard();
    init_cover_letter_evidence();
    init_cover_letter_prompt();
    init_cover_letter_validator();
    init_cover_letter_tone();
    init_match_scorer();
    init_ai_service();
    aiLetterLog = createLogger("AICoverLetter");
  }
});

// background/index.js
init_ai_service();

// src/services/ai-helpers.js
init_ai_service();
async function generateCoverLetterAI(vacancy, resume, opts) {
  const { generateAICoverLetter: generateAICoverLetter2 } = await Promise.resolve().then(() => (init_cover_letter_ai(), cover_letter_ai_exports));
  return generateAICoverLetter2(vacancy, resume, opts);
}
async function generateChatReply(history, opts) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ok: false, error: "history must be a non-empty array", code: "BAD_INPUT" };
  }
  const tone = opts && opts.tone || "formal";
  const variants = Math.min(Math.max(opts && opts.variants || 3, 1), 3);
  const sys = "You are an assistant helping a job seeker reply to an employer on hh.ru. Write in Russian. Tone: " + tone + ". Generate " + variants + ' distinct reply variants, separated by a line containing only "---VARIANT---". Each variant should be 1-3 short sentences. Do not include greetings unless the employer greeted first.';
  const messages = [{ role: "assistant", content: sys }, ...history];
  const result = await sendMessage({
    messages,
    temperature: 0.8,
    fetchImpl: opts && opts.fetchImpl
  });
  if (!result.ok) return result;
  const parts = result.text.split(/^---VARIANT---$/m).map((s) => s.trim()).filter((s) => s.length > 0);
  const list = parts.length > 0 ? parts.slice(0, variants) : [result.text];
  return { ok: true, variants: list };
}

// background/index.js
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[HH-AR] Extension installed/updated", details);
  if (details.reason === "install") {
    chrome.storage.local.set({
      settings: {
        mode: "manual",
        dailyLimit: 200,
        minMatchScore: 60,
        letterTone: "formal",
        searchInterval: 300,
        autoScroll: true,
        showMatchScore: true,
        confirmBeforeApply: true,
        coverLetterTemplate: ""
      },
      stats: {
        totalApplied: 0,
        appliedToday: 0,
        interviewInvites: 0,
        responsesReceived: 0,
        skipsToday: 0,
        errorsToday: 0,
        lastActivity: null
      },
      appliedVacancies: [],
      skippedVacancies: [],
      blacklistedCompanies: [],
      logs: [],
      installedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    chrome.alarms.create("dailyReset", {
      when: getNextMidnight(),
      periodInMinutes: 24 * 60
    });
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyReset") {
    console.log("[HH-AR] Daily reset alarm fired");
    chrome.storage.local.get("stats", (data) => {
      const stats = data.stats || {};
      stats.appliedToday = 0;
      stats.skipsToday = 0;
      stats.errorsToday = 0;
      chrome.storage.local.set({ stats });
    });
  }
});
function getNextMidnight() {
  const now = /* @__PURE__ */ new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "get-stats":
      chrome.storage.local.get("stats", (data) => {
        sendResponse(data.stats || {});
      });
      return true;
    // async response
    case "get-settings":
      chrome.storage.local.get("settings", (data) => {
        sendResponse(data.settings || {});
      });
      return true;
    case "toggle-inspector":
    case "apply-vacancy":
      chrome.tabs.query({ active: true, url: "https://hh.ru/*" }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        }
      });
      break;
    case "log":
      chrome.storage.local.get("logs", (data) => {
        const logs = data.logs || [];
        logs.push({ ...message.entry, ts: (/* @__PURE__ */ new Date()).toISOString() });
        if (logs.length > 500) logs.splice(0, logs.length - 500);
        chrome.storage.local.set({ logs });
      });
      break;
    case "check-auth-cookies":
      chrome.cookies.get({ url: "https://hh.ru", name: "hhtoken" }, (cookie) => {
        if (chrome.runtime.lastError) {
          sendResponse({ hasAuthCookie: false });
          return;
        }
        sendResponse({ hasAuthCookie: !!cookie });
      });
      return true;
    // async response
    case "ai-send-message":
      sendMessage(message.payload || {}).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message, code: "UNCAUGHT" }));
      return true;
    case "ai-cover-letter":
      console.log("[AI-BTN][bg] ai-cover-letter received", {
        vacancyId: message.vacancy && message.vacancy.id,
        vacancyTitle: message.vacancy && message.vacancy.title,
        resumeId: message.resume && message.resume.id,
        opts: message.opts
      });
      generateCoverLetterAI(message.vacancy, message.resume, message.opts || {}).then((result) => {
        console.log("[AI-BTN][bg] ai-cover-letter done", {
          ok: !!(result && result.ok),
          code: result && result.code,
          aiCode: result && result.aiCode,
          textLen: result && result.text ? result.text.length : 0,
          warningsCount: result && Array.isArray(result.warnings) ? result.warnings.length : 0
        });
        sendResponse(result);
      }).catch((e) => {
        console.error("[AI-BTN][bg] ai-cover-letter UNCAUGHT", e);
        sendResponse({ ok: false, error: e.message, code: "UNCAUGHT" });
      });
      return true;
    case "ai-chat-reply":
      generateChatReply(message.history, message.opts || {}).then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message, code: "UNCAUGHT" }));
      return true;
    case "ai-get-config":
      getAiConfig().then(sendResponse);
      return true;
    case "ai-set-config":
      setAiConfig(message.config || {}).then(sendResponse);
      return true;
    case "ai-available":
      isAiAvailable().then(sendResponse);
      return true;
  }
});
function updateBadge() {
  chrome.storage.local.get("stats", (data) => {
    const applied = data.stats?.appliedToday || 0;
    const text = applied > 0 ? String(applied) : "";
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#2964FF" });
  });
}
updateBadge();
export {
  updateBadge
};
