/// <reference types="vitest/globals" />
import { describe, expect, it } from "vitest";
import { parseResumeSalary, parseVacancySalaryString, scoreSalary } from "../src/lib/match-scorer-salary.js";

describe("parseResumeSalary", () => {
  it("regular spaces", () => {
    expect(parseResumeSalary("80 000 руб.")).toBe(80000);
  });

  it("NBSP u00A0 (hh.ru format)", () => {
    expect(parseResumeSalary("80\u00A0000 ₽")).toBe(80000);
  });

  it("narrow NBSP u202F", () => {
    expect(parseResumeSalary("80\u202F000")).toBe(80000);
  });

  it("multiple groups: 1 234 567", () => {
    expect(parseResumeSalary("1 234 567")).toBe(1234567);
  });

  it("takes first number of range", () => {
    expect(parseResumeSalary("от 150 000")).toBe(150000);
  });

  it("no digits -> null", () => {
    expect(parseResumeSalary("Не указана")).toBeNull();
    expect(parseResumeSalary("")).toBeNull();
    expect(parseResumeSalary(150000)).toBeNull();
  });
});

describe("parseVacancySalaryString", () => {
  it("dash range", () => {
    expect(parseVacancySalaryString("150 000 - 200 000 руб.")).toEqual({
      min: 150000,
      max: 200000,
    });
  });

  it("dash range with NBSP and en-dash", () => {
    expect(parseVacancySalaryString("80\u00A0000--120\u00A0000 ₽")).toEqual({
      min: 80000,
      max: 120000,
    });
  });

  it("от N -> min only", () => {
    expect(parseVacancySalaryString("от 80 000 руб.")).toEqual({
      min: 80000,
      max: null,
    });
  });

  it("до N -> max only", () => {
    expect(parseVacancySalaryString("до 120 000 руб.")).toEqual({
      min: null,
      max: 120000,
    });
  });

  it("ОТ X ДО Y -> full range (regression: max was lost)", () => {
    expect(parseVacancySalaryString("от 80 000 до 120 000 руб.")).toEqual({
      min: 80000,
      max: 120000,
    });
  });

  it("от N + до вычета is NOT a range", () => {
    expect(parseVacancySalaryString("от 80 000 руб., до вычета налогов")).toEqual({
      min: 80000,
      max: null,
    });
  });

  it("single number -> fixed salary", () => {
    expect(parseVacancySalaryString("150 000 руб.")).toEqual({
      min: 150000,
      max: 150000,
    });
  });

  it("junk: 1.5 млн -> no parse (was 15)", () => {
    expect(parseVacancySalaryString("1.5 млн")).toEqual({});
  });

  it("latin currency survives cleanup", () => {
    expect(parseVacancySalaryString("USD 3 000 - 5 000")).toEqual({
      min: 3000,
      max: 5000,
    });
  });

  it("real fixture: от 100 000 ₽. (trailing dot)", () => {
    expect(parseVacancySalaryString("от 100 000 ₽.")).toEqual({
      min: 100000,
      max: null,
    });
  });

  it("real fixture: от 50 000 ₽", () => {
    expect(parseVacancySalaryString("от 50 000 ₽")).toEqual({
      min: 50000,
      max: null,
    });
  });

  it("real default from vacancy-list: Не указана", () => {
    expect(parseVacancySalaryString("Не указана")).toEqual({});
  });

  it("en-dash with spaces", () => {
    expect(parseVacancySalaryString("80 000--120 000 ₽")).toEqual({
      min: 80000,
      max: 120000,
    });
  });

  it("en-dash WITHOUT spaces (regression: digits glued into 80000120000)", () => {
    expect(parseVacancySalaryString("80 000--120 000 ₽")).toEqual({
      min: 80000,
      max: 120000,
    });
  });
});

describe("scoreSalary integration", () => {
  it("within range", () => {
    expect(scoreSalary({ salary: "150 000 руб." }, { salary: "140 000 - 180 000 руб." }).score).toBe(15);
  });

  it("NBSP end-to-end", () => {
    expect(scoreSalary({ salary: "80\u00A0000" }, { salary: { min: 70000, max: 90000 } }).score).toBe(15);
  });

  it("resume above fixed range (was within-range due to lost max)", () => {
    const r = scoreSalary({ salary: "150 000 руб." }, { salary: "от 80 000 до 120 000 руб." });
    expect(r.score).toBe(3);
    expect(r.reason).toBe("above-range");
  });
});
