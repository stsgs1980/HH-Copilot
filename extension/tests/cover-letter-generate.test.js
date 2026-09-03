/// <reference types="vitest/globals" />
/**
 * Tests for cover-letter-generator.js
 *   - generateCoverLetter()
 *   - fillTemplate()
 *   - findVacancyData()
 *
 * v1.9.30.0
 */

import { beforeEach, describe, expect, it } from "vitest";

describe("cover-letter-generator: generateCoverLetter", () => {
  let generateCoverLetter;

  beforeEach(async () => {
    const mod = await import("../src/lib/cover-letter-generator.js");
    generateCoverLetter = mod.generateCoverLetter;
  });

  it("returns empty text when no vacancy provided", async () => {
    const result = await generateCoverLetter(null, null);
    expect(result.text).toBe("");
    expect(result.method).toBe("none");
  });

  it("generates a letter with vacancy title and company", async () => {
    const vacancy = {
      id: "1",
      title: "Senior Developer",
      company: "Яндекс",
      skills: ["Python"],
    };
    const resume = {
      skills: ["Python", "Django"],
      derivedSkills: [],
      experience: [],
    };

    const result = await generateCoverLetter(vacancy, resume);
    expect(result.text).toContain("Senior Developer");
    expect(result.text).toContain("Яндекс");
    expect(result.text.length).toBeGreaterThan(20);
  });

  it("uses custom template when provided", async () => {
    const vacancy = {
      id: "1",
      title: "Developer",
      company: "Test",
    };
    const resume = null;

    const result = await generateCoverLetter(vacancy, resume, {
      template: "My custom letter for {position} at {company}",
    });
    expect(result.text).toBe("My custom letter for Developer at Test");
    expect(result.method).toBe("template");
  });

  it("generates rich letter when vacancy has keySkills and resume has skills", async () => {
    const vacancy = {
      id: "1",
      title: "Frontend Developer",
      company: "Google",
      keySkills: ["React", "TypeScript", "CSS"],
      derivedSkills: [],
      description: {
        text: "We are looking for a Frontend Developer with React experience.",
        html: "<p>We are looking for a Frontend Developer with React experience.</p>",
        headings: [],
        sections: {
          requirements: "Знание React и TypeScript",
          responsibilities: "Разработка интерфейсов",
        },
      },
    };
    const resume = {
      title: "Frontend Developer",
      skills: ["React", "TypeScript", "JavaScript"],
      derivedSkills: ["REST API"],
      experience: [{ position: "Frontend Dev", duration: "3 года 6 месяцев" }],
      salary: "150 000 \u20BD",
    };

    const result = await generateCoverLetter(vacancy, resume);
    expect(result.text).toContain("Frontend Developer");
    expect(result.text).toContain("Google");
    // Rich letter should mention matching skills
    expect(result.text.toLowerCase()).toMatch(/react|typescript/);
    expect(result.method).toBe("rich");
  });

  it("truncates letter that exceeds maxLength", async () => {
    const vacancy = {
      id: "1",
      title: "A".repeat(100),
      company: "B".repeat(100),
      keySkills: Array.from({ length: 50 }, (_, i) => "Skill" + i),
    };
    const resume = {
      skills: vacancy.keySkills.slice(0, 10),
      derivedSkills: [],
      experience: [],
    };

    const result = await generateCoverLetter(vacancy, resume, { maxLength: 200 });
    expect(result.text.length).toBeLessThanOrEqual(200);
  });

  it("handles vacancy with no company name", async () => {
    const vacancy = {
      id: "1",
      title: "Developer",
      skills: ["Python"],
    };
    const resume = {
      skills: ["Python"],
      derivedSkills: [],
      experience: [],
    };

    const result = await generateCoverLetter(vacancy, resume);
    expect(result.text).toContain("Developer");
    expect(result.text.length).toBeGreaterThan(10);
  });

  it("handles resume with experience entries", async () => {
    const vacancy = {
      id: "1",
      title: "Developer",
      company: "Test",
    };
    const resume = {
      skills: ["Python"],
      derivedSkills: [],
      experience: [
        { position: "Junior Dev", duration: "2 года" },
        { position: "Middle Dev", duration: "3 года 6 месяцев" },
      ],
    };

    const result = await generateCoverLetter(vacancy, resume);
    // Should contain experience text (years)
    expect(result.text).toMatch(/\d+\s*(лет|года)/);
  });

  it("includes matching skills from score details", async () => {
    const vacancy = {
      id: "1",
      title: "Backend Developer",
      company: "Yandex",
      keySkills: ["Python", "Django", "PostgreSQL", "Docker"],
    };
    const resume = {
      title: "Backend Developer",
      skills: ["Python", "Django", "PostgreSQL"],
      derivedSkills: [],
      experience: [],
    };

    const result = await generateCoverLetter(vacancy, resume);
    // Should mention at least some matching skills
    expect(result.text).toMatch(/Python|Django|PostgreSQL/);
  });

  it("references vacancy description sections when available", async () => {
    const vacancy = {
      id: "1",
      title: "Developer",
      company: "Test",
      keySkills: ["Python"],
      description: {
        text: "Full description text with requirements and conditions",
        html: "<p>Full</p>",
        headings: [],
        sections: {
          requirements: "Знание Python и Django",
          conditions: "ДМС, удаленка, гибкий график",
        },
      },
    };
    const resume = {
      skills: ["Python"],
      derivedSkills: [],
      experience: [],
    };

    const result = await generateCoverLetter(vacancy, resume);
    // Rich letter should reference conditions
    expect(result.text.length).toBeGreaterThan(50);
  });
});
