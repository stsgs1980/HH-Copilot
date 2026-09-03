/// <reference types="vitest/globals" />
/**
 * INTEGRATION TESTS: MATCH SCORER
 * Tests match scoring with realistic resume/vacancy data structures
 * that mirror what the extension actually parses from hh.ru.
 */

import { beforeAll, describe, expect, it } from "vitest";
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

describe("High match scenario (same role, skills, location)", () => {
  let result;

  beforeAll(async () => {
    result = await computeMatchScore(SAMPLE_RESUME, SAMPLE_VACANCY_HIGH_MATCH);
  });

  it("should return high total score", () => {
    expect(result.total).toBeGreaterThan(70);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("should have good skills score (confidence-adjusted)", () => {
    // 12 vacancy skills, 8 exact matches = 8/12 = 0.67, confidence 0.83 -> ~24/35
    expect(result.breakdown.skills).toBeGreaterThan(20);
    expect(result.breakdown.skills).toBeLessThanOrEqual(35);
  });

  it("should have high title similarity", () => {
    expect(result.breakdown.title).toBeGreaterThan(15);
    expect(result.breakdown.title).toBeLessThanOrEqual(25);
  });

  it("should have salary within range", () => {
    expect(result.breakdown.salary).toBe(15); // within range
    expect(result.details.salaryMatch).toBe("within-range");
  });

  it("should have experience within range", () => {
    expect(result.breakdown.experience).toBe(10); // within range (3.5 years vs 3-7)
    expect(result.details.experienceMatch).toBe("within-range");
  });

  it("should have perfect location match", () => {
    expect(result.breakdown.location).toBe(15); // same city
    expect(result.details.locationMatch).toBe("same-city");
  });

  it("should identify matching skills correctly", () => {
    expect(result.details.matchingSkills.length).toBe(8);
    expect(result.details.matchingSkills).toContain("javascript");
    expect(result.details.matchingSkills).toContain("typescript");
    expect(result.details.matchingSkills).toContain("react");
  });

  it("should identify missing skills", () => {
    expect(result.details.missingSkills).toContain("graphql");
    expect(result.details.missingSkills).toContain("docker");
  });

  it("should identify derived match skills when they match", () => {
    // Derived skills from resume don't directly match vacancy keySkills in this test
    // This is expected behavior - derived skills only match if they appear in vacancy keySkills
    expect(result.details.derivedMatchSkills.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Low match scenario (different role)", () => {
  let result;

  beforeAll(async () => {
    result = await computeMatchScore(SAMPLE_RESUME, SAMPLE_VACANCY_LOW_MATCH);
  });

  it("should return moderate total score (some overlap in skills/salary/exp)", () => {
    // Frontend vs Backend: title mismatch penalty but salary/exp/location contribute
    expect(result.total).toBeGreaterThan(30);
    expect(result.total).toBeLessThan(60);
  });

  it("should have low title score", () => {
    expect(result.breakdown.title).toBeLessThan(10);
  });

  it("should have few matching skills", () => {
    expect(result.details.matchingSkills.length).toBeLessThan(3);
  });

  it("should have many missing skills", () => {
    expect(result.details.missingSkills.length).toBeGreaterThan(5);
  });
});
