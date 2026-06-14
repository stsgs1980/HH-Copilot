/**
 * Tests for cover-letter-generator.js
 *   - generateCoverLetter()
 *   - fillTemplate()
 *   - findVacancyData()
 *
 * v1.9.30.0
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('cover-letter-generator: fillTemplate', () => {
  let fillTemplate;

  beforeEach(async () => {
    const mod = await import('../src/lib/cover-letter-generator.js');
    fillTemplate = mod.fillTemplate;
  });

  it('replaces all placeholders in template', () => {
    const template = 'Вакансия: {position} в {company}. Опыт: {experience}.';
    const values = { position: 'Developer', company: 'Яндекс', experience: '5 лет' };
    const result = fillTemplate(template, values);
    expect(result).toBe('Вакансия: Developer в Яндекс. Опыт: 5 лет.');
  });

  it('replaces empty values with empty string', () => {
    const template = 'Hello {name}!';
    const values = { name: '' };
    expect(fillTemplate(template, values)).toBe('Hello !');
  });

  it('leaves unknown placeholders unchanged', () => {
    const template = 'Hello {unknown}!';
    const values = {};
    expect(fillTemplate(template, values)).toBe('Hello {unknown}!');
  });

  it('handles multiple occurrences of same placeholder', () => {
    const template = '{position} — это {position}';
    const values = { position: 'Dev' };
    expect(fillTemplate(template, values)).toBe('Dev — это Dev');
  });

  it('returns empty string for null template', () => {
    expect(fillTemplate(null, {})).toBe('');
  });
});

describe('cover-letter-generator: generateCoverLetter', () => {
  let generateCoverLetter;

  beforeEach(async () => {
    const mod = await import('../src/lib/cover-letter-generator.js');
    generateCoverLetter = mod.generateCoverLetter;
  });

  it('returns empty text when no vacancy provided', () => {
    const result = generateCoverLetter(null, null);
    expect(result.text).toBe('');
    expect(result.method).toBe('none');
  });

  it('generates a letter with vacancy title and company', () => {
    const vacancy = {
      id: '1',
      title: 'Senior Developer',
      company: 'Яндекс',
      skills: ['Python'],
    };
    const resume = {
      skills: ['Python', 'Django'],
      derivedSkills: [],
      experience: [],
    };

    const result = generateCoverLetter(vacancy, resume);
    expect(result.text).toContain('Senior Developer');
    expect(result.text).toContain('Яндекс');
    expect(result.text.length).toBeGreaterThan(20);
  });

  it('uses custom template when provided', () => {
    const vacancy = {
      id: '1',
      title: 'Developer',
      company: 'Test',
    };
    const resume = null;

    const result = generateCoverLetter(vacancy, resume, {
      template: 'My custom letter for {position} at {company}',
    });
    expect(result.text).toBe('My custom letter for Developer at Test');
    expect(result.method).toBe('template');
  });

  it('generates rich letter when vacancy has keySkills and resume has skills', () => {
    const vacancy = {
      id: '1',
      title: 'Frontend Developer',
      company: 'Google',
      keySkills: ['React', 'TypeScript', 'CSS'],
      derivedSkills: [],
      description: {
        text: 'We are looking for a Frontend Developer with React experience.',
        html: '<p>We are looking for a Frontend Developer with React experience.</p>',
        headings: [],
        sections: {
          requirements: 'Знание React и TypeScript',
          responsibilities: 'Разработка интерфейсов',
        },
      },
    };
    const resume = {
      title: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'JavaScript'],
      derivedSkills: ['REST API'],
      experience: [
        { position: 'Frontend Dev', duration: '3 года 6 месяцев' },
      ],
      salary: '150 000 ₽',
    };

    const result = generateCoverLetter(vacancy, resume);
    expect(result.text).toContain('Frontend Developer');
    expect(result.text).toContain('Google');
    // Rich letter should mention matching skills
    expect(result.text.toLowerCase()).toMatch(/react|typescript/);
    expect(result.method).toBe('rich');
  });

  it('truncates letter that exceeds maxLength', () => {
    const vacancy = {
      id: '1',
      title: 'A'.repeat(100),
      company: 'B'.repeat(100),
      keySkills: Array.from({ length: 50 }, (_, i) => 'Skill' + i),
    };
    const resume = {
      skills: vacancy.keySkills.slice(0, 10),
      derivedSkills: [],
      experience: [],
    };

    const result = generateCoverLetter(vacancy, resume, { maxLength: 200 });
    expect(result.text.length).toBeLessThanOrEqual(200);
  });

  it('handles vacancy with no company name', () => {
    const vacancy = {
      id: '1',
      title: 'Developer',
      skills: ['Python'],
    };
    const resume = {
      skills: ['Python'],
      derivedSkills: [],
      experience: [],
    };

    const result = generateCoverLetter(vacancy, resume);
    expect(result.text).toContain('Developer');
    expect(result.text.length).toBeGreaterThan(10);
  });

  it('handles resume with experience entries', () => {
    const vacancy = {
      id: '1',
      title: 'Developer',
      company: 'Test',
    };
    const resume = {
      skills: ['Python'],
      derivedSkills: [],
      experience: [
        { position: 'Junior Dev', duration: '2 года' },
        { position: 'Middle Dev', duration: '3 года 6 месяцев' },
      ],
    };

    const result = generateCoverLetter(vacancy, resume);
    // Should contain experience text (years)
    expect(result.text).toMatch(/\d+\s*(лет|года)/);
  });

  it('includes matching skills from score details', () => {
    const vacancy = {
      id: '1',
      title: 'Backend Developer',
      company: 'Yandex',
      keySkills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    };
    const resume = {
      title: 'Backend Developer',
      skills: ['Python', 'Django', 'PostgreSQL'],
      derivedSkills: [],
      experience: [],
    };

    const result = generateCoverLetter(vacancy, resume);
    // Should mention at least some matching skills
    expect(result.text).toMatch(/Python|Django|PostgreSQL/);
  });

  it('references vacancy description sections when available', () => {
    const vacancy = {
      id: '1',
      title: 'Developer',
      company: 'Test',
      keySkills: ['Python'],
      description: {
        text: 'Full description text with requirements and conditions',
        html: '<p>Full</p>',
        headings: [],
        sections: {
          requirements: 'Знание Python и Django',
          conditions: 'ДМС, удаленка, гибкий график',
        },
      },
    };
    const resume = {
      skills: ['Python'],
      derivedSkills: [],
      experience: [],
    };

    const result = generateCoverLetter(vacancy, resume);
    // Rich letter should reference conditions
    expect(result.text.length).toBeGreaterThan(50);
  });
});

describe('cover-letter-generator: findVacancyData', () => {
  let findVacancyData;

  beforeEach(async () => {
    const mod = await import('../src/lib/cover-letter-generator.js');
    findVacancyData = mod.findVacancyData;
  });

  it('finds vacancy in vacancies array by ID', () => {
    const vacancies = [
      { id: '1', title: 'Dev A' },
      { id: '2', title: 'Dev B' },
    ];
    const result = findVacancyData('2', vacancies);
    expect(result).not.toBeNull();
    expect(result.title).toBe('Dev B');
  });

  it('returns null when vacancy not found', () => {
    const result = findVacancyData('999', []);
    expect(result).toBeNull();
  });

  it('returns null when vacancies is null', () => {
    const result = findVacancyData('1', null);
    expect(result).toBeNull();
  });
});
