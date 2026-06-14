/**
 * TOUR STEPS -- определения шагов гида по вкладкам.
 *
 * Каждый шаг: { target, tab?, title, text, position? }
 *   target   -- CSS-селектор внутри shadowRoot (или документа для FAB)
 *   tab      -- вкладка, которую нужно активировать перед показом
 *   title    -- заголовок шага
 *   text     -- описание шага
 *   position -- top|bottom|left|right|center (авто-определяется если не указан)
 */

/** Полный тур для нового пользователя (по порядку вкладок) */
export function getWelcomeTourSteps() {
  return [
    // -- Welcome --
    {
      target: '.har-tabbar',
      tab: 'overview',
      title: 'Добро пожаловать в HH Copilot!',
      text: '6 вкладок помогают автоматизировать поиск работы на hh.ru. Пройдёмся по каждой -- это займёт минуту.',
      position: 'bottom',
    },
    // -- Overview --
    {
      target: '#kpi-daily-count',
      tab: 'overview',
      title: 'Обзор: лимиты',
      text: 'Кольцевая диаграмма показывает, сколько откликов осталось сегодня. hh.ru ограничивает число откликов -- Copilot следит за лимитами.',
      position: 'bottom',
    },
    {
      target: '[data-action="apply-all"]',
      tab: 'overview',
      title: 'Обзор: массовый отклик',
      text: 'Одна кнопка -- и Copilot откликается на все подходящие вакансии с вашим сопроводительным письмом.',
      position: 'bottom',
    },
    // -- Resume --
    {
      target: '[data-action="sync-resumes"]',
      tab: 'resume',
      title: 'Резюме: синхронизация',
      text: 'Загрузите все ваши резюме с hh.ru. Copilot сохранит их для анализа и мэтчинга с вакансиями.',
      position: 'bottom',
    },
    {
      target: '#res-score-ring',
      tab: 'resume',
      title: 'Резюме: качество',
      text: 'Оценка того, как ваше резюме выглядит для ATS и HR: ATS-совместимость, качество опыта, красные флаги и рекомендации.',
      position: 'left',
    },
    // -- Vacancies --
    {
      target: '[data-action="refresh"]',
      tab: 'vacancies',
      title: 'Вакансии: парсинг',
      text: 'Находясь на странице поиска вакансий, нажмите эту кнопку -- Copilot соберёт все вакансии и оценит совпадение с вашим резюме.',
      position: 'bottom',
    },
    {
      target: '#vac-status-filter',
      tab: 'vacancies',
      title: 'Вакансии: фильтры',
      text: 'Фильтруйте вакансии по статусу, поиску и оценке совпадения. Высокое совпадение = стоит откликнуться.',
      position: 'bottom',
    },
    {
      target: '#mass-start-btn',
      tab: 'vacancies',
      title: 'Вакансии: массовый отклик',
      text: 'После парсинга -- выберите вакансии и запустите массовый отклик. Copilot сам заполнит формы и отправит.',
      position: 'top',
    },
    // -- Negotiations --
    {
      target: '#neg-list',
      tab: 'negotiations',
      title: 'Переговоры: чат',
      text: 'Все переписки с работодателями в одном месте. Отвечайте прямо из сайдбара -- не нужно переключаться между вкладками hh.ru.',
      position: 'left',
    },
    {
      target: '#cover-letter-text',
      tab: 'negotiations',
      title: 'Переговоры: сопроводительное',
      text: 'Шаблон сопроводительного письма подставляется автоматически при каждом отклике. Настройте текст под себя.',
      position: 'top',
    },
    // -- Settings --
    {
      target: '#s-daily-limit',
      tab: 'settings',
      title: 'Настройки: лимиты',
      text: 'Управляйте скоростью откликов: дневной и часовой лимиты, интервал между откликами. Защита от блокировки hh.ru.',
      position: 'bottom',
    },
    {
      target: '#bl-input',
      tab: 'settings',
      title: 'Настройки: чёрный список',
      text: 'Добавляйте компании, в которые не хотите откликаться. Copilot пропустит их при массовом отклике.',
      position: 'bottom',
    },
    // -- Stats --
    {
      target: '#stat-chart',
      tab: 'stats',
      title: 'Статистика: аналитика',
      text: 'Графики откликов, приглашений и конверсии по дням и неделям. Понимайте, что работает, а что нет.',
      position: 'top',
    },
    {
      target: '#activity-log',
      tab: 'stats',
      title: 'Статистика: лог действий',
      text: 'Подробный лог всех действий: отклики, ошибки, капчи, замедления. Полный контроль над процессом.',
      position: 'top',
    },
    // -- Final --
    {
      target: '.har-tabbar',
      tab: 'overview',
      title: 'Всё!',
      text: 'Теперь вы знаете основные возможности. Кнопка "?" в шапке -- запустит тур заново. Удачи в поиске!',
      position: 'bottom',
    },
  ];
}

/** Тур по конкретной вкладке */
export function getTabTourSteps(tabId) {
  const allSteps = getWelcomeTourSteps();
  return allSteps.filter(s => s.tab === tabId);
}
