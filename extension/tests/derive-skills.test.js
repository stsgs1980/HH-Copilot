/**
 * TESTS: derive-skills (F-CR-02 supporting module)
 * ================================================
 * Characterization tests for deriveSkillsFromExperience() and
 * matchVacancySkillsToExperience().
 *
 * PURPOSE: this module had ZERO tests until v1.9.67.0, which is why RF-1
 * (false-positive skill derivation) went undetected. This suite:
 *   1. Pins the CORRECT behavior (happy path true-positives) so future
 *      refactors do not silently break derivation.
 *   2. Pins the CURRENT (often broken) behavior on adversarial inputs via
 *      tests explicitly tagged `[RF-1 BUG]`. These document known
 *      false-positives measured in the 2026-06-24 audit
 *      (docs/audit/2026-06-24-matching-skills-coverletter-audit.md §9).
 *      When a fix lands, flip the assertion to `.not.toContain(...)`.
 *
 * derive-skills scans a text corpus (title + experience descriptions +
 * position + duties + achievements + additionalInfo + about) for keyword
 * patterns from the skill dictionary. Matching is pattern.test(corpus) with
 * NO sentence isolation, NO negation handling, NO tense awareness.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveSkillsFromExperience,
  matchVacancySkillsToExperience,
} from '../src/lib/derive-skills.js';

describe('deriveSkillsFromExperience -- happy path (true positives)', () => {
  it('derives "управление командой" from a management description', () => {
    const resume = {
      title: 'Менеджер',
      experience: [{
        position: 'Тимлид',
        description: 'Управление командой из 8 человек. Рост отдела в 2 раза.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain('управление командой');
  });

  it('derives "B2B продажи" from explicit B2B + продажи context', () => {
    const resume = {
      title: 'Менеджер по продажам',
      experience: [{
        description: 'Вёл B2B продажи крупным клиентам. Средний чек 5 млн.',
      }],
    };
    expect(deriveSkillsFromExperience(resume)).toContain('B2B продажи');
  });

  it('derives "Python" from a developer description', () => {
    const resume = {
      experience: [{
        description: 'Писал бэкенд на Python (Django). 3 года опыта.',
      }],
    };
    expect(deriveSkillsFromExperience(resume)).toContain('Python');
  });

  it('derives multiple distinct skills from a rich description', () => {
    const resume = {
      experience: [{
        description: 'Управление продажами. Внедрил CRM. Проводил тренинги для персонала.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain('управление продажами');
    expect(derived).toContain('CRM');
    expect(derived).toContain('обучение персонала');
  });

  it('[pattern gap] does NOT derive "управление продажами" from "Управление отделом продаж" (case gap)', () => {
    // The pattern /управлен(?:ие|ием)\s+отдел(?:ом|\s+)?продаж/ requires the
    // nominative "отдел продаж"; the natural instrumental "отделом продаж"
    // (Управление отделом продаж) does NOT match. Documented limitation.
    const resume = {
      experience: [{ description: 'Управление отделом продаж.' }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain('управление продажами');
  });

  it('[priority ambiguity] "управление командой продаж" derives "управление командой" (not "продажами")', () => {
    // MANAGEMENT_SKILLS precedes SALES_SKILLS in the dictionary, and matching
    // breaks on the first hit. So "управление командой продаж" is classified
    // as team-management, NOT sales-management. Documented behavior.
    const resume = {
      experience: [{ description: 'Управление командой продаж.' }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain('управление командой');
    expect(derived).not.toContain('управление продажами');
  });

  it('scans across title + description + duties + achievements + about', () => {
    const resume = {
      title: 'Аналитик',
      experience: [{
        description: 'Описание без нужного слова.',
        position: 'Аналитик',
        duties: 'Анализ данных на Python.',
        achievements: '',
      }],
      additionalInfo: '',
      about: 'Также знаю Docker.',
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).toContain('Python');
    expect(derived).toContain('анализ данных');
    expect(derived).toContain('Docker');
  });
});

describe('deriveSkillsFromExperience -- edge cases', () => {
  it('returns [] for null resume', () => {
    expect(deriveSkillsFromExperience(null)).toEqual([]);
  });

  it('returns [] for resume with no experience array', () => {
    expect(deriveSkillsFromExperience({ title: 'X' })).toEqual([]);
  });

  it('returns [] for resume with empty experience', () => {
    expect(deriveSkillsFromExperience({ title: 'X', experience: [] })).toEqual([]);
  });

  it('returns [] when all text fields are empty', () => {
    const resume = {
      title: '',
      experience: [{ position: '', description: '', duties: '', achievements: '' }],
      additionalInfo: '',
      about: '',
    };
    expect(deriveSkillsFromExperience(resume)).toEqual([]);
  });

  it('does NOT duplicate skills already in resume.skills (dedup)', () => {
    const resume = {
      skills: ['Python', 'Docker'],
      experience: [{ description: 'Писал на Python. Деплоил в Docker.' }],
    };
    const derived = deriveSkillsFromExperience(resume);
    expect(derived).not.toContain('Python');
    expect(derived).not.toContain('Docker');
  });

  it('sets resume.derivedSkills in-place as an array', () => {
    const resume = {
      experience: [{ description: 'Управление командой из 5 человек.' }],
    };
    const result = deriveSkillsFromExperience(resume);
    expect(Array.isArray(resume.derivedSkills)).toBe(true);
    expect(resume.derivedSkills).toEqual(result);
  });
});

// ====================================================================
// RF-1 BUG: false-positive characterization tests.
// These document KNOWN-BROKEN behavior measured in the audit (§9.2).
// Each resume explicitly DISOWNS the skill; the matcher still derives it
// because it has no negation / context / tense awareness.
// When a fix lands: flip .toContain(X) -> .not.toContain(X).
// ====================================================================
describe('deriveSkillsFromExperience -- RF-1 known false-positives (characterization)', () => {
  it('[RF-1 BUG] derives B2B/CRM from explicit negation "не использовал CRM, без опыта b2b"', () => {
    const resume = {
      title: 'Менеджер',
      experience: [{
        description: 'Работал самостоятельно, не использовал CRM. Без опыта b2b. Подчинённых не было.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: negation filter blocks 'не использовал' and 'без опыта'
    expect(derived).not.toContain('B2B продажи');
    expect(derived).not.toContain('CRM');
  });

  it('[RF-1 BUG] derives React/Python when the COMPANY (not the candidate) seeks them', () => {
    const resume = {
      title: 'HR-менеджер',
      experience: [{
        description: 'Нанимал команду: компания ищет React и Python разработчиков. Вёл найм через ATS, не сам кодил.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: company-context filter blocks 'компания ищет'
    expect(derived).not.toContain('Python');
    expect(derived).not.toContain('React');
  });

  it('[RF-1 BUG] derives 1С/Docker from abandoned/past-tense attempts', () => {
    const resume = {
      title: 'Аналитик',
      experience: [{
        description: 'Однажды пробовал 1С в университете, бросил. Читал статьи про Docker, на практике не применял.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: abandonment filter blocks 'бросил' and 'на практике не'
    expect(derived).not.toContain('Docker');
    expect(derived).not.toContain('1С');
  });

  it('[RF-1 BUG] derives TypeScript/pm/BI from 2-letter acronyms in unrelated role text', () => {
    const resume = {
      title: 'Test Specialist (TS)',
      experience: [{
        description: 'Работал как TS специалист. PM группы. BI анализ. AI отдел. Сохранял в TS формате.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: short-acronym patterns (TS, PM, BI) removed from dictionary
    expect(derived).not.toContain('TypeScript');
    expect(derived).not.toContain('управление проектами');
    expect(derived).not.toContain('анализ данных');
  });

  it('[RF-1 BUG] derives "стрессоустойчивость" from any mention of stress', () => {
    const resume = {
      title: 'Оператор',
      experience: [{ description: 'Был стресс на работе из-за дедлайнов.' }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: pattern changed from /стресс/i to /стрессоустойчив/i
    expect(derived).not.toContain('стрессоустойчивость');
  });

  it('[RF-1 BUG] derives CRM from substring inside "микроCRM" (access denied)', () => {
    const resume = {
      title: 'Продавец',
      experience: [{
        description: 'В компании внедряли микроCRM. Я к ней доступа не имел.',
      }],
    };
    const derived = deriveSkillsFromExperience(resume);
    // RF-1 FIX: CRM pattern now has word boundary (blocks 'микроCRM') + negation filter
    expect(derived).not.toContain('CRM');
  });
});

describe('matchVacancySkillsToExperience -- reverse derivation', () => {
  it('matches a vacancy skill that literally appears in experience text', () => {
    const resume = {
      experience: [{ description: 'Работал с Kubernetes и Docker.' }],
    };
    const matched = matchVacancySkillsToExperience(resume, ['Kubernetes', 'React']);
    expect(matched).toContain('Kubernetes');
    expect(matched).not.toContain('React');
  });

  it('matches a vacancy skill via dictionary pattern (direct adjacency required)', () => {
    const resume = {
      experience: [{ description: 'Управление продажами регионального отдела.' }],
    };
    // The pattern /управлен(?:ие|ием|ию)\s+продаж/i requires "управление"
    // immediately followed by "продаж". Matches here.
    const matched = matchVacancySkillsToExperience(resume, ['управление продажами']);
    expect(matched).toContain('управление продажами');
  });

  it('[pattern gap] does NOT match "управление продажами" when words are separated', () => {
    // "Управление командой продаж" -> the sales pattern needs direct adjacency
    // and does not match. Documented limitation.
    const resume = {
      experience: [{ description: 'Управление командой продаж.' }],
    };
    const matched = matchVacancySkillsToExperience(resume, ['управление продажами']);
    expect(matched).not.toContain('управление продажами');
  });

  it('skips skills already in resume.skills', () => {
    const resume = {
      skills: ['Python'],
      experience: [{ description: 'Писал на Python.' }],
    };
    const matched = matchVacancySkillsToExperience(resume, ['Python']);
    expect(matched).not.toContain('Python');
  });

  it('returns [] for null resume', () => {
    expect(matchVacancySkillsToExperience(null, ['Python'])).toEqual([]);
  });

  it('returns [] for non-array vacancy skills', () => {
    expect(matchVacancySkillsToExperience({}, 'Python')).toEqual([]);
  });

  it('returns [] when experience text is empty', () => {
    const resume = { experience: [{ description: '' }] };
    expect(matchVacancySkillsToExperience(resume, ['Python'])).toEqual([]);
  });
});
