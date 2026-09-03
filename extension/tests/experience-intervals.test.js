/// <reference types="vitest/globals" />
import { describe, expect, it } from "vitest";
import { calcResumeYears } from "../src/lib/match-scorer-experience.js";

describe("parsePeriodString + mergeIntervalsMonths via calcResumeYears", () => {
  it("parallel jobs 2020-2023: union gives 3 years, not 6", () => {
    const resume = {
      experience: [
        { period: "январь 2020 \u2014 январь 2023", duration: "3 года" },
        { period: "июнь 2020 \u2014 июнь 2022", duration: "2 года" },
      ],
    };
    const y = calcResumeYears(resume.experience);
    expect(y).toBe(3);
  });

  it("sequential jobs sum", () => {
    const resume = {
      experience: [
        { period: "январь 2018 \u2014 январь 2019", duration: "1 год" },
        { period: "февраль 2019 \u2014 февраль 2021", duration: "2 года" },
      ],
    };
    expect(calcResumeYears(resume.experience)).toBe(3);
  });

  it("until-now interval ends today", () => {
    const resume = {
      experience: [
        { period: "январь 2022 \u2014 настоящее время", duration: "" },
        { period: "январь 2015 \u2014 январь 2016", duration: "1 год" },
      ],
    };
    const y = calcResumeYears(resume.experience);
    expect(y).toBeGreaterThanOrEqual(5);
  });

  it("unparseable periods -> fallback to duration sum", () => {
    const resume = {
      experience: [
        { period: "неизвестно", duration: "2 года 3 месяца" },
        { period: "", duration: "1 год" },
      ],
    };
    expect(calcResumeYears(resume.experience)).toBe(3.3);
  });

  it("single parseable period still merges trivially (== its length)", () => {
    const resume = {
      experience: [{ period: "январь 2020 \u2014 январь 2022", duration: "2 года" }],
    };
    expect(calcResumeYears(resume.experience)).toBe(2);
  });

  it("abbreviated months: мар. 2020 \u2014 мар. 2022 = 2 years (not May)", () => {
    const resume = {
      experience: [{ period: "мар. 2020 \u2014 мар. 2022", duration: "2 года" }],
    };
    expect(calcResumeYears(resume.experience)).toBe(2);
  });

  it("empty experience -> null (unknown, keeps scoreExperience neutral)", () => {
    expect(calcResumeYears([])).toBeNull();
    expect(calcResumeYears(null)).toBeNull();
  });
});
