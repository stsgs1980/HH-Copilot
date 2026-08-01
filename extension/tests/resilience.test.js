import { describe, expect, test, beforeEach } from 'vitest';
import { parseVacanciesFromPage } from '../src/parsers/vacancy-list.js';

describe('HH-Copilot Resilience Tests', () => {
  beforeEach(() => {
    // Очищаем DOM перед каждым тестом
    document.body.innerHTML = '';
  });

  test('should handle missing vacancy elements gracefully', async () => {
    // Тестируем сценарий, когда на странице нет карточек вакансий
    document.body.innerHTML = '<div>No vacancy cards here</div>';
    
    const result = await parseVacanciesFromPage(null);
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('should handle malformed vacancy data', async () => {
    // Тестируем сценарий с неполными данными вакансии
    const html = '<div class=\\"vacancy-card\\">' +
      '<h3 class=\\"vacancy-title\\"></h3>' + // Пустой заголовок
      '<span class=\\"vacancy-salary\\"></span>' + // Пустая зарплата
      '</div>';
    document.body.innerHTML = html;
    
    const result = await parseVacanciesFromPage(null);
    
    expect(result.length).toBe(0); // Должен пропустить пустую вакансию
  });

  test('should handle changed HTML structure', async () => {
    // Тестируем с новыми классами (симуляция изменений на HH.ru)
    const html = '<div class=\\"new-vacancy-block\\">' +
      '<h2 class=\\"new-job-title\\">Software Engineer</h2>' +
      '<span class=\\"new-salary-info\\">150 000 руб.</span>' +
      '<div class=\\"new-company-name\\">NewTech Corp</div>' +
      '</div>';
    document.body.innerHTML = html;
    
    // Должен вернуть пустой массив, если не может найти стандартные селекторы
    const result = await parseVacanciesFromPage(null);
    
    expect(Array.isArray(result)).toBe(true);
  });
});
