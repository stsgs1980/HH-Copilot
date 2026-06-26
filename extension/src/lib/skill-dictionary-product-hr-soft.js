/**
 * LIB: SKILL DICTIONARY — PRODUCT, HR, LOGISTICS & SOFT SKILLS (RU)
 * =================================================================
 * Russian keyword patterns for product, HR, logistics, analytics,
 * and general soft skills.
 *
 * Split from skill-dictionary.js (AHG Rule 12).
 * v1.9.43.0
 */

// ===========================================
// ПРОДУКТ / АНАЛИТИКА
// ===========================================
export const PRODUCT_SKILLS = [
  { skill: 'продуктовый менеджмент', patterns: [
    /продуктов/i,
    /product\s+manag/i,
    /продакт[\s-]*менеджер/i,
    /product\s+owner/i,
  ]},
  { skill: 'A/B тестирование', patterns: [
    /A\/B[\s-]*тест/i,
    /сплит[\s-]*тест/i,
    /мультивариантн/i,
  ]},
  { skill: 'исследование пользователей', patterns: [
    /пользовател(?:ь|ей|ям)\s+исслед/i,
    /UX[\s-]*исслед/i,
    /custdev/i,
    /CustDev/i,
    /глубинн/i,
    /интервью/i,
  ]},
  { skill: 'Data-driven', patterns: [
    /data[\s-]*driven/i,
    /данные[\s-]*ориентир/i,
    /управлен(?:ие|ием)\s+на\s+основ/i,
  ]},
];

// ===========================================
// HR / КАДРЫ
// ===========================================
export const HR_SKILLS = [
  { skill: 'подбор персонала', patterns: [
    /подбор\s+персонал/i,
    /рекрутинг/i,
    /найм\s+сотрудник/i,
    /интервьюирован/i,
    /собеседован/i,
  ]},
  { skill: 'адаптация персонала', patterns: [
    /адаптац/i,
    /онбординг/i,
    /onboarding/i,
  ]},
  { skill: 'оценка персонала', patterns: [
    /оценк[аеу]\s+персонал/i,
    /оценк[аеу]\s+сотрудник/i,
    /ассессмент/i,
    /performance\s+review/i,
  ]},
];

// ===========================================
// ЛОГИСТИКА / СЕТЬ
// ===========================================
export const LOGISTICS_SKILLS = [
  { skill: 'логистика', patterns: [
    /логистик/i,
    /склад/i,
    /доставка/i,
    /цепочк[аеу]\s+постав/i,
    /supply\s+chain/i,
  ]},
  { skill: 'работа с поставщиками', patterns: [
    /поставщик/i,
    /закупк/i,
    /vendor\s+manag/i,
    /партн[её]р/i,
  ]},
  { skill: 'ритейл', patterns: [
    /ритейл/i,
    /розничн/i,
    /торгов[аяые]+\s+сет/i,
    /FMCG/i,
  ]},
];

// ===========================================
// ОБЩИЕ / SOFT SKILLS
// ===========================================
export const SOFT_SKILLS = [
  { skill: 'английский язык', patterns: [
    /английск/i,
    /English/i,
  ]},
  { skill: 'ведение отчётности', patterns: [
    /отч[её]тн/i,
    /отч[её]т(?:ы|ам|ами)/i,
    /dashboard/i,
    /дашборд/i,
    /метрик/i,
  ]},
  { skill: 'Excel', patterns: [
    /excel/i,
    /эксель/i,
    /Google\s+Sheets/i,
    /таблиц[аеу]\s+(?:excel|google)/i,
  ]},
  { skill: 'PowerPoint', patterns: [
    /powerpoint/i,
    /презентац/i,
    /keynote/i,
  ]},
  { skill: 'автоматизация процессов', patterns: [
    /автоматизац/i,
    /роботизац/i,
    /интеграции?\s+(?:с\s+)?CRM/i,
    /автоматизир/i,
  ]},
  { skill: 'масштабирование', patterns: [
    /масштабир/i,
    /масштабирован/i,
    /scaling/i,
    /расширени[ея]\s+(?:команд|бизнес|отдел|продаж)/i,
  ]},
  { skill: 'запуск продукта', patterns: [
    /запуск\s+(?:продукт|проект|бизнес|направлен)/i,
    /go[\s-]*to[\s-]*market/i,
    /\bGTM\b/i,
    /вывод\s+(?:на\s+рынок|продукт)/i,
  ]},
  { skill: 'разработка стратегии', patterns: [
    /разработк[аеу]\s+стратег/i,
    /стратегиче/i,
    /формировани[ея]\s+стратег/i,
  ]},
  { skill: 'анализ данных', patterns: [
    /анализ\s+данн/i,
    /data\s+analysis/i,
    /big\s+data/i,
    // /\bBI\b/i removed (RF-1): too ambiguous
    /business\s+intelligence/i,
  ]},

  // ===========================================
  // ДОП. ПОЛЕЗНЫЕ
  // ===========================================
  { skill: '1С', patterns: [
    /1[СCсc]/,
  ]},
  { skill: 'SAP', patterns: [
    /\bSAP\b/i,
  ]},
  { skill: 'Salesforce', patterns: [
    /salesforce/i,
  ]},
  { skill: 'многозадачность', patterns: [
    /многозадачн/i,
    /мульти[\s-]*таск/i,
    /приоритизац/i,
  ]},
  { skill: 'стрессоустойчивость', patterns: [
    /\bстрессоустойчив/i,  // RF-1: was /стресс/i -- 'был стресс' is not the skill
  ]},
  { skill: 'LLM', patterns: [
    /\bLLMs?\b/i,
    /large\s+language\s+model/i,
    /языков[а-яё]+\s+модел/i,
    /GPT/i,
    /ChatGPT/i,
    /нейросет/i,
    /генеративн/i,
  ]},
  { skill: 'целеполагание', patterns: [
    /целеполаган/i,
    /KPI/i,
    /OKR/i,
    /постановк[аеу]\s+целей/i,
  ]},
];
