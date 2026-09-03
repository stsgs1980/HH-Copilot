/// <reference types="vitest/globals" />
/**
 * INTEGRATION TESTS: MATCH SCORER
 * Tests match scoring with realistic resume/vacancy data structures
 * that mirror what the extension actually parses from hh.ru.
 */

import { describe, expect, it } from "vitest";
import { scoreExperience } from "../src/lib/match-scorer-experience.js";
import { scoreLocation } from "../src/lib/match-scorer-location.js";
import { scoreSalary } from "../src/lib/match-scorer-salary.js";
import { scoreSkills } from "../src/lib/match-scorer-skills.js";
import { scoreTitle } from "../src/lib/match-scorer-title.js";

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

describe("Individual scorer accuracy", () => {
  it("scoreSkills: should give ~33 for exact match of 5 skills out of 6 vacancy skills", () => {
    const resume = { skills: ["React", "TypeScript", "JavaScript", "Git", "CSS"], derivedSkills: [] };
    const vacancy = { keySkills: ["React", "TypeScript", "JavaScript", "Git", "CSS", "HTML"] };
    const result = scoreSkills(resume, vacancy);
    // 5 matched, 6 vacancy skills -> confidence 0.83 -> 5 * 0.83 * 8 = 33
    expect(result.score).toBe(33);
    expect(result.matching).toHaveLength(5);
  });

  it("scoreSkills: should give ~23 for derived-only match of 5 skills out of 6", () => {
    const resume = { skills: [], derivedSkills: ["React", "TypeScript", "JavaScript", "Git", "CSS"] };
    const vacancy = { keySkills: ["React", "TypeScript", "JavaScript", "Git", "CSS", "HTML"] };
    const result = scoreSkills(resume, vacancy);
    // 5 derived matched, 6 vacancy skills -> confidence 0.83 -> 5 * 0.7 * 0.83 * 8 = 23
    expect(result.score).toBe(23);
    expect(result.derivedMatch).toHaveLength(5);
  });

  it("scoreTitle: should give 30 for exact match", () => {
    const result = scoreTitle({ title: "Senior Frontend Developer" }, { title: "Senior Frontend Developer" });
    expect(result.score).toBe(30);
    expect(result.similarity).toBe(1.0);
  });

  it("scoreTitle: should handle abbreviation bonus", () => {
    const result = scoreTitle({ title: "Сеньор Фронтенд" }, { title: "Senior Frontend Developer" });
    expect(result.score).toBeGreaterThan(0);
  });

  it("scoreSalary: should handle string salary formats", () => {
    const result = scoreSalary({ salary: "200 000" }, { salary: "180 000 - 250 000 руб" });
    expect(result.score).toBe(15);
    expect(result.reason).toBe("within-range");
  });

  it('scoreSalary: should handle "от" and "до" formats', () => {
    const result1 = scoreSalary({ salary: "160 000" }, { salary: "от 150 000" });
    expect(result1.score).toBe(15);

    const result2 = scoreSalary({ salary: "230 000" }, { salary: "до 200 000" });
    expect(result2.score).toBe(10);
    expect(result2.reason).toBe("slightly-above");
  });

  it("scoreExperience: should sum multiple jobs", () => {
    const resume = {
      experience: [{ duration: { years: 2, months: 6 } }, { duration: { years: 1, months: 6 } }],
    };
    const vacancy = { experience: { min: 3, max: 7 } };
    const result = scoreExperience(resume, vacancy);
    expect(result.score).toBe(15); // 4 years total, within 3-7
    expect(result.reason).toBe("within-range");
  });

  it("scoreExperience: should parse string duration", () => {
    const resume = { experience: [{ duration: "3 года 6 месяцев" }] };
    const vacancy = { experience: { min: 3, max: 5 } };
    const result = scoreExperience(resume, vacancy);
    expect(result.score).toBe(15);
  });

  it("scoreLocation: should handle city abbreviations", () => {
    const result = scoreLocation({ address: "МСК" }, { location: "Москва" });
    expect(result.score).toBe(15);
    expect(result.reason).toBe("same-city");
  });

  it("scoreLocation: should handle nearby regions", () => {
    const result = scoreLocation({ address: "Москва" }, { location: "Химки" });
    expect(result.score).toBe(12);
    expect(result.reason).toBe("nearby-region");
  });
});
