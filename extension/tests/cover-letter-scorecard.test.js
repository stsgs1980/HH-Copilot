/**
 * TESTS: cover-letter-scorecard (F-CR-02)
 * ========================================
 * extractScorecard(vacancy) -> { mission, outcomes[], competencies[], source }
 *
 * Methodology: Scorecard definition (Smart's Topgrading) — reverse of
 * interview-designer skill. Define what A-Player means for this role
 * BEFORE looking at resume.
 */

import { describe, it, expect } from 'vitest';
import { extractScorecard } from '../src/lib/cover-letter-scorecard.js';

describe('F-CR-02 -- extractScorecard', () => {
  it('returns full scorecard from rich vacancy', () => {
    const vacancy = {
      title: 'Senior Frontend Developer',
      company: 'Yandex',
      keySkills: ['React', 'TypeScript', 'CSS'],
      description: {
        text: 'some text',
        sections: {
          responsibilities: 'Разработка интерфейсов. Оптимизация производительности. Code review.',
          requirements: 'Знание React. Опыт с TypeScript. Понимание сборщиков.',
          advantages: '',
          conditions: '',
          other: '',
        },
      },
    };

    const sc = extractScorecard(vacancy);
    expect(sc).toBeDefined();
    expect(sc.mission).toBeTruthy();
    expect(sc.mission.length).toBeGreaterThan(10);
    expect(Array.isArray(sc.outcomes)).toBe(true);
    expect(sc.outcomes.length).toBeGreaterThan(0);
    expect(sc.outcomes.length).toBeLessThanOrEqual(5);
    expect(Array.isArray(sc.competencies)).toBe(true);
    expect(sc.competencies.length).toBeGreaterThan(0);
    expect(sc.source).toBeDefined();
  });

  it('mission derived from title + first sentence of responsibilities', () => {
    const vacancy = {
      title: 'Backend Engineer',
      keySkills: [],
      description: {
        text: '',
        sections: {
          responsibilities: 'Поддержка микросервисной архитектуры. Мониторинг инцидентов.',
          requirements: '', advantages: '', conditions: '', other: '',
        },
      },
    };

    const sc = extractScorecard(vacancy);
    // Mission should reference the role and the first responsibility
    expect(sc.mission).toMatch(/Backend Engineer/i);
  });

  it('outcomes: top 3-5 concrete sentences from responsibilities', () => {
    const vacancy = {
      title: 'DevOps',
      keySkills: [],
      description: {
        text: '',
        sections: {
          responsibilities: 'Развернуть CI/CD. Настроить мониторинг. Автоматизировать деплои. Поддержать Kubernetes. Дежурства.',
          requirements: '', advantages: '', conditions: '', other: '',
        },
      },
    };

    const sc = extractScorecard(vacancy);
    expect(sc.outcomes.length).toBeGreaterThanOrEqual(3);
    expect(sc.outcomes.length).toBeLessThanOrEqual(5);
    // Each outcome should be a sentence (not empty)
    sc.outcomes.forEach(o => {
      expect(o.length).toBeGreaterThan(5);
    });
  });

  it('competencies: union of keySkills + requirements noun phrases', () => {
    const vacancy = {
      title: 'Data Scientist',
      keySkills: ['Python', 'SQL', 'pandas'],
      description: {
        text: '',
        sections: {
          responsibilities: '',
          requirements: 'Опыт работы с ML. Знание статистики. Английский язык.',
          advantages: '', conditions: '', other: '',
        },
      },
    };

    const sc = extractScorecard(vacancy);
    // keySkills preserved
    expect(sc.competencies).toContain('Python');
    expect(sc.competencies).toContain('SQL');
    // Requirements parsed (noun phrases, stripped of leading "Знание"/"Опыт")
    expect(sc.competencies.length).toBeGreaterThan(3);
  });

  it('empty responsibilities -> fallback mission from title', () => {
    const vacancy = {
      title: 'QA Engineer',
      keySkills: ['Selenium'],
      description: { text: '', sections: {} },
    };

    const sc = extractScorecard(vacancy);
    expect(sc.mission).toMatch(/QA Engineer/i);
    expect(sc.outcomes.length).toBeGreaterThanOrEqual(1);
    // Fallback outcome placeholder
    expect(sc.outcomes[0].length).toBeGreaterThan(5);
  });

  it('empty keySkills -> competencies from requirements only', () => {
    const vacancy = {
      title: 'Product Manager',
      keySkills: [],
      description: {
        text: '',
        sections: {
          responsibilities: '',
          requirements: 'Управление дорожной картой. Аналитика метрик. Стейкхолдер-менеджмент.',
          advantages: '', conditions: '', other: '',
        },
      },
    };

    const sc = extractScorecard(vacancy);
    expect(sc.competencies.length).toBeGreaterThan(0);
    expect(sc.competencies.some(c => /дорожной картой|метрик|стейкхолдер/i.test(c))).toBe(true);
  });

  it('empty requirements AND empty keySkills -> competencies = []', () => {
    const vacancy = {
      title: 'Intern',
      keySkills: [],
      description: { text: '', sections: { responsibilities: 'Помощь команде.' } },
    };

    const sc = extractScorecard(vacancy);
    expect(sc.competencies).toEqual([]);
    // Mission/outcomes still derived
    expect(sc.mission.length).toBeGreaterThan(5);
    expect(sc.outcomes.length).toBeGreaterThan(0);
  });
});
