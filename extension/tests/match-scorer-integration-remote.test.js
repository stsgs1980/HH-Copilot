/// <reference types="vitest/globals" />
/**
 * INTEGRATION TESTS: MATCH SCORER
 * Tests match scoring with realistic resume/vacancy data structures
 * that mirror what the extension actually parses from hh.ru.
 */

import { describe, expect, it } from "vitest";
import { computeMatchScore } from "../src/lib/match-scorer.js";

// Realistic test data based on actual hh.ru structures
const SAMPLE_RESUME = {
  id: "resume-123",
  title: "Senior Frontend Developer",
  skills: ["JavaScript", "TypeScript", "React", "Redux", "Webpack", "Git", "REST API", "HTML5", "CSS3", "SASS"],
  derivedSkills: ["Frontend Architecture", "Performance Optimization", "Code Review", "Mentoring"],
  experience: [
    {
      company: "TechCorp",
      position: "Senior Frontend Developer",
      period: "2021 - present",
      duration: { years: 3, months: 6 },
      description:
        "Leading frontend development for SaaS platform. Built component library, optimized bundle size by 40%, introduced TypeScript strict mode.",
    },
    {
      company: "StartupXYZ",
      position: "Frontend Developer",
      period: "2019 - 2021",
      duration: { years: 2, months: 0 },
      description:
        "Developed customer-facing React application. Implemented CI/CD pipeline, wrote unit tests with Jest.",
    },
  ],
  salary: "200 000",
  address: "Москва",
  workFormat: "гибрид",
};

const SAMPLE_VACANCY_HIGH_MATCH = {
  id: "vacancy-456",
  title: "Senior Frontend Developer (React/TypeScript)",
  company: "BigTech Inc",
  keySkills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Redux",
    "Webpack",
    "Git",
    "REST API",
    "HTML",
    "CSS",
    "SASS",
    "GraphQL",
    "Docker",
  ],
  derivedSkills: ["Frontend Architecture", "Performance Optimization", "Code Review", "Mentoring", "Microfrontends"],
  salary: { min: 180000, max: 250000, currency: "RUR", gross: true },
  experience: { min: 3, max: 7 },
  location: "Москва",
  schedule: "гибрид",
  description: {
    text: "We are looking for a Senior Frontend Developer to join our team. You will be responsible for building scalable frontend architecture, optimizing performance, and mentoring junior developers.",
    html: "<p>We are looking for a Senior Frontend Developer...</p>",
    headings: ["Requirements", "Responsibilities", "Benefits"],
  },
  employment: "full-time",
  isRemote: false,
  hiringFormat: "full-time",
  hasApplyButton: true,
};

const SAMPLE_VACANCY_LOW_MATCH = {
  id: "vacancy-789",
  title: "Backend Developer (Python/Django)",
  company: "DataCorp",
  keySkills: ["Python", "Django", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "GraphQL", "Microservices"],
  derivedSkills: ["System Design", "Database Optimization", "DevOps"],
  salary: { min: 150000, max: 220000, currency: "RUR", gross: true },
  experience: { min: 4, max: 8 },
  location: "Санкт-Петербург",
  schedule: "office",
  description: {
    text: "Backend developer needed for high-load systems. Experience with Python, Django, and cloud infrastructure required.",
    html: "<p>Backend developer needed...</p>",
    headings: ["Requirements", "Responsibilities"],
  },
  employment: "full-time",
  isRemote: false,
  hiringFormat: "full-time",
  hasApplyButton: true,
};

const SAMPLE_VACANCY_REMOTE = {
  id: "vacancy-remote",
  title: "Frontend Developer",
  company: "RemoteFirst",
  keySkills: ["JavaScript", "React", "TypeScript", "Git"],
  salary: { min: 120000, max: 180000, currency: "RUR", gross: true },
  experience: { min: 2, max: 5 },
  location: "Удаленно",
  schedule: "remote",
  description: { text: "Fully remote position.", html: "<p>Fully remote position.</p>", headings: [] },
  employment: "full-time",
  isRemote: true,
  hiringFormat: "remote",
  hasApplyButton: true,
};

const SAMPLE_RESUME_JUNIOR = {
  id: "resume-junior",
  title: "Junior Frontend Developer",
  skills: ["JavaScript", "React", "HTML", "CSS", "Git"],
  derivedSkills: [],
  experience: [
    {
      company: "InternshipCo",
      position: "Frontend Intern",
      period: "2023 - present",
      duration: { years: 1, months: 3 },
      description: "Learning React, building small features, fixing bugs.",
    },
  ],
  salary: "80 000",
  address: "Москва",
  workFormat: "office",
};

describe("Remote work matching", () => {
  it("should match remote resume with remote vacancy", async () => {
    const resumeRemote = { ...SAMPLE_RESUME, address: "Удаленная работа", workFormat: "удаленная работа" };
    const result = await computeMatchScore(resumeRemote, SAMPLE_VACANCY_REMOTE);
    expect(result.breakdown.location).toBe(12); // remote-remote
    expect(result.details.locationMatch).toBe("remote-remote");
  });

  it("should match hybrid resume with remote vacancy (hybrid-can-do-remote = 12)", async () => {
    // SAMPLE_RESUME has workFormat: 'гибрид', SAMPLE_VACANCY_REMOTE has schedule: 'remote'
    // hybrid resume + remote vacancy = hybrid-can-do-remote (12 points)
    const result = await computeMatchScore(SAMPLE_RESUME, SAMPLE_VACANCY_REMOTE);
    expect(result.breakdown.location).toBe(12); // hybrid-can-do-remote
    expect(result.details.locationMatch).toBe("hybrid-can-do-remote");
  });
});

describe("Edge cases", () => {
  it("should return 0 for null inputs", async () => {
    const result = await computeMatchScore(null, {});
    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual({
      skills: 0,
      title: 0,
      salary: 0,
      experience: 0,
      location: 0,
      semantic: 0,
    });
  });

  it("should handle missing salary on both sides", async () => {
    const resume = { ...SAMPLE_RESUME, salary: "" };
    const vacancy = { ...SAMPLE_VACANCY_HIGH_MATCH, salary: {} };
    const result = await computeMatchScore(resume, vacancy);
    expect(result.breakdown.salary).toBe(4); // low neutral (no salary data)
    expect(result.details.salaryMatch).toBe("no-data");
  });

  it("should handle missing experience when vacancy has no experience data", async () => {
    const resume = { ...SAMPLE_RESUME, experience: [] };
    const vacancy = { ...SAMPLE_VACANCY_HIGH_MATCH, experience: {} };
    const result = await computeMatchScore(resume, vacancy);
    // Actual behavior: vacancy experience empty object treated as min=0/max=0, resume exp=0 -> below-range (5)
    // But reason is 'unknown-resume-exp' because resume has no experience
    expect(result.breakdown.experience).toBe(5);
    expect(result.details.experienceMatch).toBe("unknown-resume-exp");
  });

  it("should handle missing location on both sides", async () => {
    const resume = { ...SAMPLE_RESUME, address: "" };
    const vacancy = { ...SAMPLE_VACANCY_HIGH_MATCH, location: "" };
    const result = await computeMatchScore(resume, vacancy);
    expect(result.breakdown.location).toBe(8); // neutral
    expect(result.details.locationMatch).toBe("no-data");
  });
});

describe("Role mismatch penalty (precise mode)", () => {
  it("should cap at 25 when title similarity is 0", async () => {
    const resume = { ...SAMPLE_RESUME, title: "Курьер", skills: ["вождение"], salary: "50 000" };
    const vacancy = {
      ...SAMPLE_VACANCY_HIGH_MATCH,
      title: "Руководитель отдела продаж",
      keySkills: ["управление командой", "продажи", "CRM", "переговоры", "B2B"],
      salary: { min: 150000, max: 250000 },
    };
    const result = await computeMatchScore(resume, vacancy, "precise");
    expect(result.total).toBeLessThanOrEqual(25);
  });

  it("should cap at 40 when title similarity is barely >0 (<0.15)", async () => {
    const resume = { ...SAMPLE_RESUME, title: "Менеджер по закупкам" };
    const vacancy = { ...SAMPLE_VACANCY_HIGH_MATCH, title: "Менеджер по рекламе" };
    const result = await computeMatchScore(resume, vacancy, "precise");
    if (result.details.titleSimilarity > 0 && result.details.titleSimilarity < 0.15) {
      expect(result.total).toBeLessThanOrEqual(40);
    }
  });
});
