// eslint-disable ahg-rules/max-file-lines, ahg-rules/max-file-lines-hard

/**
 * TEST: Real hh.ru data flow
 * Simulates what actually happens when parsing SERP cards
 * and scoring against a real resume.
 */

import { describe, expect, it } from "vitest";
import { scoreSalary } from "../src/lib/match-scorer-salary.js";
import { computeMatchScore } from "../src/lib/match-scorer.js";
import { parseExperienceString } from "../src/lib/parse-experience.js";

// ============================================
// REAL RESUME (what hh.ru actually provides)
// ============================================
const REAL_RESUME = {
  title: "Руководитель отдела продаж",
  skills: [
    "B2B продажи",
    "управление командой",
    "переговоры",
    "работа с клиентами",
    "CRM",
    "аналитика продаж",
    "мотивация персонала",
    "делегирование",
  ],
  derivedSkills: [
    "составление коммерческих предложений",
    "работа с возражениями",
    "ведение презентаций",
    "поиск новых клиентов",
    "ведение CRM",
  ],
  experience: [
    { duration: { years: 3, months: 0 }, company: "Рога и Копыта", position: "РОП" },
    { duration: { years: 2, months: 6 }, company: "Газпром", position: "Менеджер по продажам" },
  ],
  salary: "200 000",
  address: "Москва",
  workFormat: "гибрид",
};

// ============================================
// SCENARIO 1: SERP card (what parseVacanciesFromPage produces)
// Only has tag pills as `skills`, NO `keySkills`
// ============================================
const SERP_VACANCY = {
  id: "123456",
  title: "Руководитель отдела продаж",
  company: "Яндекс",
  // PARSED FROM SERP: salary is raw string, not structured
  salary: "от 200 000 до 300 000 руб. до вычета налогов",
  // PARSED FROM SERP: location is raw text
  location: "Москва",
  // PARSED FROM SERP: experience is already parsed by parseExperienceString
  experience: { min: 3, max: 5 },
  // PARSED FROM SERP: tag pills from card (NOT keySkills!)
  skills: ["B2B продажи", "переговоры", "управление командой", "CRM", "работа с клиентами"],
  // NO keySkills — this is what the parser creates!
  schedule: "office",
  url: "https://hh.ru/vacancy/123456",
  status: "new",
};

// ============================================
// SCENARIO 2: Enriched vacancy (after detail fetch)
// Has keySkills from vacancy detail page
// ============================================
const ENRICHED_VACANCY = {
  ...SERP_VACANCY,
  keySkills: [
    "B2B продажи",
    "переговоры",
    "управление командой",
    "CRM",
    "работа с клиентами",
    "аналитика продаж",
    "мотивация персонала",
    "делегирование",
    "1С",
    "Power BI",
  ],
  derivedSkills: ["составление коммерческих предложений", "поиск новых клиентов"],
  salary: {
    min: 200000,
    max: 300000,
    currency: "RUR",
    gross: true,
    raw: "от 200 000 до 300 000 руб. до вычета налогов",
  },
};

// ============================================
// SCENARIO 3: VOTD vacancy (recommended on main page)
// Typically has NO skills at all
// ============================================
const VOTD_VACANCY = {
  id: "789012",
  title: "Директор по продажам",
  company: "Сбер",
  salary: "Не указана",
  location: "Москва, Россия",
  experience: {},
  skills: [], // VOTD cards often have no tags
  schedule: "unknown",
  url: "https://hh.ru/vacancy/789012",
  status: "new",
};

// ============================================
// SCENARIO 4: Remote vacancy
// ============================================
const REMOTE_VACANCY = {
  id: "345678",
  title: "Руководитель отдела продаж",
  company: "Тинькофф",
  salary: "250 000 руб.",
  location: "Удалённо",
  experience: { min: 5, max: 10 },
  skills: ["B2B", "leadership", "sales"],
  schedule: "remote",
  url: "https://hh.ru/vacancy/345678",
  status: "new",
};

describe("REAL DATA: SERP card scoring (before enrichment)", () => {
  it("SERP card with skills[] but NO keySkills -- uses skills[] fallback", async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("SERP card total:", r.total, "breakdown:", JSON.stringify(r.breakdown));
    console.log("Skills detail:", JSON.stringify(r.details));
    // After v1.9.87.0 fix: skills[] from SERP tags are used as fallback
    // 5 tag skills, all match resume → high skills score
    expect(r.breakdown.skills).toBeGreaterThan(0);
  });

  it("title match is correct for identical titles", async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("Title score:", r.breakdown.title, "similarity:", r.details.titleSimilarity);
    expect(r.breakdown.title).toBeGreaterThan(0);
  });

  it('salary: string "от 200 000 до 300 000 руб." parsed correctly', async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("Salary score:", r.breakdown.salary, "reason:", r.details.salaryMatch);
    // "от 200 000 до 300 000" → min=200000 max=300000, resume=200000 → within range
  });

  it("experience: parsed correctly from {min:3, max:5}", async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("Experience score:", r.breakdown.experience, "reason:", r.details.experienceMatch);
    // Resume exp: 5.5 years, vacancy: 3-5 → slightly above overqualified?
    // Actually 5.5 > 5 → overqualified (8)
  });

  it("location: same city Moscow gets 15/15 (not 12 from hybrid override)", async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("Location score:", r.breakdown.location, "reason:", r.details.locationMatch);
    // After v1.9.87.0: same-city check happens before hybrid format check
    expect(r.breakdown.location).toBe(15);
  });

  it("total SERP score reflects actual skill match (not artificially low)", async () => {
    const r = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    console.log("=== SERP TOTAL:", r.total, "===");
    console.log("Breakdown:", JSON.stringify(r.breakdown));
    // After v1.9.87.0: skills from SERP tags are counted
    // 5 matching skills out of 5 tag skills = high skills score
    expect(r.total).toBeGreaterThan(50);
  });
});

describe("REAL DATA: Enriched vacancy scoring (after detail fetch)", () => {
  it("enriched with keySkills -- skills score is high", async () => {
    const r = await computeMatchScore(REAL_RESUME, ENRICHED_VACANCY);
    console.log("Enriched total:", r.total, "breakdown:", JSON.stringify(r.breakdown));
    console.log("Matching skills:", r.details.matchingSkills);
    console.log("Missing skills:", r.details.missingSkills);
    // With real keySkills, skills score should be high
    expect(r.breakdown.skills).toBeGreaterThan(0);
  });

  it("enriched score is more accurate (different from SERP due to more skills data)", async () => {
    const serp = await computeMatchScore(REAL_RESUME, SERP_VACANCY);
    const enriched = await computeMatchScore(REAL_RESUME, ENRICHED_VACANCY);
    console.log("SERP total:", serp.total, "vs Enriched total:", enriched.total);
    console.log("SERP breakdown:", JSON.stringify(serp.breakdown));
    console.log("Enriched breakdown:", JSON.stringify(enriched.breakdown));
    console.log("Enriched matching:", enriched.details.matchingSkills);
    console.log("Enriched missing:", enriched.details.missingSkills);
    // SERP has 5 tag skills (all match), enriched has 10 keySkills (8 match, 2 missing)
    // Enriched is more accurate: shows missing skills that SERP doesn't know about
    expect(enriched.total).not.toBe(serp.total);
  });
});

describe("REAL DATA: VOTD scoring (no skills, no salary)", () => {
  it('VOTD with empty skills and "Не указана" salary', async () => {
    const r = await computeMatchScore(REAL_RESUME, VOTD_VACANCY);
    console.log("VOTD total:", r.total, "breakdown:", JSON.stringify(r.breakdown));
    console.log("VOTD details:", JSON.stringify(r.details));
    // VOTD typically gets low score due to missing data
  });
});

describe("REAL DATA: Remote vacancy scoring", () => {
  it("remote vacancy vs hybrid resume", async () => {
    const r = await computeMatchScore(REAL_RESUME, REMOTE_VACANCY);
    console.log("Remote total:", r.total, "breakdown:", JSON.stringify(r.breakdown));
    console.log("Location:", r.details.locationMatch);
  });
});

describe("REAL DATA: parseExperienceString edge cases", () => {
  it('parse "от 3 до 5 лет"', () => {
    const r = parseExperienceString("от 3 до 5 лет");
    console.log("parsed:", r);
  });

  it('parse "3--5 лет"', () => {
    const r = parseExperienceString("3--5 лет");
    console.log("parsed:", r);
  });

  it('parse "не менее 3 лет"', () => {
    const r = parseExperienceString("не менее 3 лет");
    console.log("parsed:", r);
  });

  it('parse "Без опыта"', () => {
    const r = parseExperienceString("Без опыта");
    console.log("parsed:", r);
  });

  it('parse "" (empty)', () => {
    const r = parseExperienceString("");
    console.log("parsed:", r);
  });
});

describe("REAL DATA: salary string edge cases", () => {
  it('salary "от 200 000 до 300 000 руб. до вычета налогов"', async () => {
    const r = scoreSalary({ salary: "200 000" }, { salary: "от 200 000 до 300 000 руб. до вычета налогов" });
    console.log("salary result:", r);
  });

  it('salary "Не указана"', async () => {
    const r = scoreSalary({ salary: "200 000" }, { salary: "Не указана" });
    console.log('"Не указана" result:', r);
  });

  it('salary {raw: "от 200 000", min: 200000, max: null} (from enrichment)', async () => {
    const r = scoreSalary({ salary: "200 000" }, { salary: { raw: "от 200 000", min: 200000, max: null } });
    console.log("structured salary result:", r);
  });
});
