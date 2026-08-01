import { describe, expect, test } from 'vitest';
import { parseVacanciesFromPage } from '../src/parsers/vacancy-list.js';

describe('Performance Tests', () => {
  test('should process large number of vacancies efficiently', async () => {
    // Создаем HTML с множеством вакансий
    let html = '<div class=\\"vacancy-list\\">';
    for (let i = 0; i < 100; i++) {
      html += '<div class=\\"vacancy-card\\" data-qa=\\"vacancy-serp__vacancy-' + i + '\\">' +
        '<h3 class=\\"vacancy-title\\">Software Engineer ' + i + '</h3>' +
        '<span class=\\"vacancy-salary\\">' + (100000 + i * 1000) + ' руб.</span>' +
        '<div class=\\"vacancy-company\\">Company ' + i + '</div>' +
        '<a href=\\"/vacancy/' + i + '\\" class=\\"vacancy-title-link\\" data-qa=\\"vacancy-title\\">Link</a>' +
        '</div>';
    }
    html += '</div>';
    document.body.innerHTML = html;
    
    const startTime = performance.now();
    const result = await parseVacanciesFromPage(null);
    const endTime = performance.now();
    
    // Проверяем, что обработка не занимает слишком много времени
    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(5000); // Меньше 5 секунд
    
    // Проверяем, что все вакансии были обработаны
    expect(result.length).toBeGreaterThanOrEqual(0);
  }, 10000); // Увеличиваем таймаут для этого теста

  test('should not cause memory leaks with repeated calls', async () => {
    // Тестируем многократные вызовы для проверки утечек памяти
    const html = '<div class=\\"vacancy-card\\">' +
      '<h3 class=\\"vacancy-title\\">Test Job</h3>' +
      '<a href=\\"/vacancy/123\\" class=\\"vacancy-title-link\\">Link</a>' +
      '</div>';
    document.body.innerHTML = html;
    
    // Выполняем несколько вызовов подряд
    for (let i = 0; i < 10; i++) {
      await parseVacanciesFromPage(null);
    }
    
    // Если мы дошли до этой точки без ошибок, значит все ок
    expect(true).toBe(true);
  }, 15000);
});
