/** TESTS: derive-skills (F-CR-02) — deriveSkillsFromExperience */
import { describe, expect, it } from "vitest";
import { deriveSkillsFromExperience } from "../src/lib/derive-skills.js";
describe("deriveSkillsFromExperience -- happy path (true positives)", () => {
  it('derives "управление командой" from a management description', () => {
    const resume = {
      title: "Менеджер",
      experience: [
        {
          position: "Тимлид",
          description: "Управление командой из 8 человек. Рост отдела в 2 раза.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("управление командой");
  });
  it('derives "B2B продажи" from explicit B2B + продажи context', () => {
    const resume = {
      title: "Менеджер по продажам",
      experience: [
        {
          description: "Вёл B2B продажи крупным клиентам. Средний чек 5 млн.",
        },
      ],
    };
    expect(deriveSkillsFromExperience(resume)).toContain("B2B продажи");
  });
  it('derives "Python" from a developer description', () => {
    const resume = {
      experience: [
        {
          description: "Писал бэкенд на Python (Django). 3 года опыта.",
        },
      ],
    };
    expect(deriveSkillsFromExperience(resume)).toContain("Python");
  });
  it("derives multiple distinct skills from a rich description", () => {
    const resume = {
      experience: [
        {
          description: "Управление продажами. Внедрил CRM. Проводил тренинги для персонала.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("управление продажами");
    expect(derived).toContain("CRM");
    expect(derived).toContain("обучение персонала");
  });
  it('[pattern gap] does NOT derive "управление продажами" from "Управление отделом продаж" (case gap)', () => {
    const resume = {
      experience: [{ description: "Управление отделом продаж." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("управление продажами");
  });
  it('[priority ambiguity] "управление командой продаж" derives "управление командой" (not "продажами")', () => {
    const resume = {
      experience: [{ description: "Управление командой продаж." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("управление командой");
    expect(derived).not.toContain("управление продажами");
  });
  it("scans across title + description + duties + achievements + about", () => {
    const resume = {
      title: "Аналитик",
      experience: [
        {
          description: "Описание без нужного слова.",
          position: "Аналитик",
          duties: "Анализ данных на Python.",
          achievements: "",
        },
      ],
      additionalInfo: "",
      about: "Также знаю Docker.",
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("Python");
    expect(derived).toContain("анализ данных");
    expect(derived).toContain("Docker");
  });
});
describe("deriveSkillsFromExperience -- edge cases", () => {
  it("returns [] for null resume", () => {
    expect(deriveSkillsFromExperience(null)).toEqual([]);
  });
  it("returns [] for resume with no experience array", () => {
    expect(deriveSkillsFromExperience({ title: "X" })).toEqual([]);
  });
  it("returns [] for resume with empty experience", () => {
    expect(deriveSkillsFromExperience({ title: "X", experience: [] })).toEqual([]);
  });
  it("returns [] when all text fields are empty", () => {
    const resume = {
      title: "",
      experience: [{ position: "", description: "", duties: "", achievements: "" }],
      additionalInfo: "",
      about: "",
    };
    expect(deriveSkillsFromExperience(resume)).toEqual([]);
  });
  it("does NOT duplicate skills already in resume.skills (dedup)", () => {
    const resume = {
      skills: ["Python", "Docker"],
      experience: [{ description: "Писал на Python. Деплоил в Docker." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("Python");
    expect(derived).not.toContain("Docker");
  });
  it("sets resume.derivedSkills in-place as an array", () => {
    const resume = {
      experience: [{ description: "Управление командой из 5 человек." }],
    };
    const result = deriveSkillsFromExperience(resume);
    expect(Array.isArray(resume.derivedSkills)).toBe(true);
    expect(resume.derivedSkills).toEqual(result);
  });
});
describe("deriveSkillsFromExperience -- RF-1 known false-positives (characterization)", () => {
  it('[RF-1 BUG] derives B2B/CRM from explicit negation "не использовал CRM, без опыта b2b"', () => {
    const resume = {
      title: "Менеджер",
      experience: [
        {
          description: "Работал самостоятельно, не использовал CRM. Без опыта b2b. Подчинённых не было.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("B2B продажи");
    expect(derived).not.toContain("CRM");
  });
  it("[RF-1 BUG] derives React/Python when the COMPANY (not the candidate) seeks them", () => {
    const resume = {
      title: "HR-менеджер",
      experience: [
        {
          description: "Нанимал команду: компания ищет React и Python разработчиков. Вёл найм через ATS, не сам кодил.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("Python");
    expect(derived).not.toContain("React");
  });
  it("[RF-1 BUG] derives 1С/Docker from abandoned/past-tense attempts", () => {
    const resume = {
      title: "Аналитик",
      experience: [
        {
          description: "Однажды пробовал 1С в университете, бросил. Читал статьи про Docker, на практике не применял.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("Docker");
    expect(derived).not.toContain("1С");
  });
  it("[RF-1 BUG] derives TypeScript/pm/BI from 2-letter acronyms in unrelated role text", () => {
    const resume = {
      title: "Test Specialist (TS)",
      experience: [
        {
          description: "Работал как TS специалист. PM группы. BI анализ. AI отдел. Сохранял в TS формате.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("TypeScript");
    expect(derived).not.toContain("управление проектами");
    expect(derived).not.toContain("анализ данных");
  });
  it('[RF-1 BUG] derives "стрессоустойчивость" from any mention of stress', () => {
    const resume = {
      title: "Оператор",
      experience: [{ description: "Был стресс на работе из-за дедлайнов." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("стрессоустойчивость");
  });
  it('[RF-1 BUG] derives CRM from substring inside "микроCRM" (access denied)', () => {
    const resume = {
      title: "Продавец",
      experience: [
        {
          description: "В компании внедряли микроCRM. Я к ней доступа не имел.",
        },
      ],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("CRM");
  });
});
describe("whole-word boundaries (#13)", () => {
  it('matches short skill "SMM" as whole word ("SMM менеджер")', () => {
    const resume = {
      experience: [{ description: "Работал SMM менеджером. Вёл соцсети." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("SMM");
  });
  it('does NOT match "SMM" inside unrelated compound ("SMMarketing")', () => {
    const resume = {
      experience: [{ description: "Анализ SMMarketing стратегии." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("SMM");
  });
  it('matches "Python" in direct mention', () => {
    const resume = {
      experience: [{ description: "Писал бэкенд на Python (Django)." }],
    };
    expect(deriveSkillsFromExperience(resume)).toContain("Python");
  });
  it('does NOT match "Python" inside compound "MicroPython"', () => {
    const resume = {
      experience: [{ description: "Один раз видел MicroPython на конференции." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain("Python");
  });
  it("long skills continue to match normally (regression)", () => {
    const resume = {
      experience: [{ description: "Управление командой из 8 человек." }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain("управление командой");
  });
});
