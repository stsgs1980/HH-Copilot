/**
 * TESTS: cover-letter-validator (F-CR-02)
 * =========================================
 * validateLetter(text, evidence, resumeSkills) -> { ok, text, warnings }
 *
 * Checks:
 * 1. Length <= 5000 (truncate if exceeded)
 * 2. Unverified skill warnings
 * 3. Unverified number warnings
 * 4. Strip leading "Здравствуйте, меня зовут ..."
 * 5. Strip LLM filler first paragraph
 * 6. 11 AI pattern detections (humanizer)
 */

import { describe, it, expect } from 'vitest';
import { validateLetter } from '../src/lib/cover-letter-validator.js';

const baseEvidence = [
  { competency: 'React', evidenceText: 'Работал с React, делал UI.', confidence: 'high' },
  { competency: 'TypeScript', evidenceText: 'TypeScript микросервисы.', confidence: 'medium' },
];

const baseResumeSkills = ['React', 'TypeScript', 'Node.js'];

describe('F-CR-02 -- validateLetter: basic checks', () => {
  it('length > 5000 -> truncated, warning', () => {
    const long = 'A'.repeat(5500);
    const r = validateLetter(long, baseEvidence, baseResumeSkills);
    expect(r.text.length).toBeLessThanOrEqual(5000);
    expect(r.warnings.some(w => /length/i.test(w))).toBe(true);
  });

  it('length = 5000 -> ok=true, no length warning', () => {
    const exact = 'A'.repeat(5000);
    const r = validateLetter(exact, baseEvidence, baseResumeSkills);
    expect(r.text.length).toBe(5000);
    expect(r.warnings.some(w => /length/i.test(w))).toBe(false);
  });

  it('skill mentioned not in evidence AND not in resume.skills -> UNVERIFIED_SKILL warning', () => {
    const text = 'У меня есть опыт с Docker и Kubernetes.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /UNVERIFIED_SKILL.*Docker/i.test(w))).toBe(true);
    expect(r.warnings.some(w => /UNVERIFIED_SKILL.*Kubernetes/i.test(w))).toBe(true);
  });

  it('skill mentioned in evidence -> no warning', () => {
    const text = 'У меня есть опыт с React и TypeScript.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /UNVERIFIED_SKILL/i.test(w))).toBe(false);
  });

  it('digit in text not in evidence -> UNVERIFIED_NUMBER warning', () => {
    const text = 'Сократил время деплоя на 99%.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    // evidence has no "99", so unverified number warning
    expect(r.warnings.some(w => /UNVERIFIED_NUMBER/i.test(w))).toBe(true);
  });
});

describe('F-CR-02 -- validateLetter: leading text stripping', () => {
  it('leading "Здравствуйте, меня зовут ..." -> stripped', () => {
    const text = 'Здравствуйте, меня зовут Иван. Реакт разработчик.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.text).not.toMatch(/меня зовут Иван/i);
  });

  it('LLM filler first paragraph -> stripped', () => {
    const text = 'Я уверен, что мой опыт идеально подходит для вашей вакансии. Реакт разработчик с 5 годами опыта.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    // First paragraph stripped
    expect(r.text).not.toMatch(/Я уверен, что мой опыт идеально подходит/i);
  });
});

describe('F-CR-02 -- validateLetter: AI patterns (humanizer)', () => {
  it('AI pattern "кроме того" -> AI_PATTERN: ai_vocabulary', () => {
    const text = 'Опыт с React. Кроме того, знаю TypeScript.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*ai_vocabulary/i.test(w))).toBe(true);
  });

  it('AI pattern "не только X, но и Y" -> AI_PATTERN: negative_parallelism', () => {
    const text = 'React не только UI, но и архитектура.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*negative_parallelism/i.test(w))).toBe(true);
  });

  it('AI pattern **boldface** -> warning + stripped from text', () => {
    const text = 'Опыт с **React** и TypeScript.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*boldface/i.test(w))).toBe(true);
    expect(r.text).not.toContain('**');
  });

  it('AI pattern "обеспечивая" -> AI_PATTERN: verbal_noun_filler', () => {
    const text = 'Разрабатывал React, обеспечивая качество.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*verbal_noun_filler/i.test(w))).toBe(true);
  });

  it('AI pattern "буду рад принести ценность" -> AI_PATTERN: generic_conclusion', () => {
    const text = 'React опыт есть. Буду рад принести ценность вашей команде.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*generic_conclusion/i.test(w))).toBe(true);
  });

  it('em dash count > 3 -> AI_PATTERN: em_dash_overuse', () => {
    const text = 'React \u2014 TypeScript \u2014 Node \u2014 опыт \u2014 все есть.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN.*em_dash_overuse/i.test(w))).toBe(true);
  });

  it('clean Russian letter (no AI patterns) -> no AI_PATTERN warnings', () => {
    const text = 'Здравствуйте! Работал с React 3 года, делал UI. TypeScript микросервисы. Готов к интервью.';
    const r = validateLetter(text, baseEvidence, baseResumeSkills);
    expect(r.warnings.some(w => /AI_PATTERN/i.test(w))).toBe(false);
  });
});
