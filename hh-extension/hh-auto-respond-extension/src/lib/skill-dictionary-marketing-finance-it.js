/**
 * LIB: SKILL DICTIONARY — MARKETING, FINANCE & IT (RU)
 * =====================================================
 * Russian keyword patterns for marketing, analytics, finance,
 * project management, and IT/development skills.
 *
 * Split from skill-dictionary.js (AHG Rule 12).
 * v1.9.41.0
 */

// ===========================================
// МАРКЕТИНГ
// ===========================================
export const MARKETING_SKILLS = [
  { skill: 'маркетинг', patterns: [
    /маркетинг/i,
    /продвижени[ея]\s+(?:продукт|бренд|услуг)/i,
  ]},
  { skill: 'цифровой маркетинг', patterns: [
    /digital/i,
    /цифров/i,
    /интернет[\s-]*маркетинг/i,
    /онлайн[\s-]*маркетинг/i,
  ]},
  { skill: 'SMM', patterns: [
    /SMM/i,
    /социальн(?:ые|ых|ым)\s+сет/i,
    /social\s+media/i,
  ]},
  { skill: 'контент-маркетинг', patterns: [
    /контент[\s-]*маркетинг/i,
    /контент[\s-]*план/i,
    /контент[\s-]*стратег/i,
  ]},
  { skill: 'аналитика', patterns: [
    /аналитик/i,
    /Google\s+Analytics/i,
    /Яндекс\s*Метрик/i,
    /веб[\s-]*аналитик/i,
  ]},
  { skill: 'аналитика продаж', patterns: [
    /аналитик[аиы]?\s+продаж/i,
    /продажн?\s*аналитик/i,
    /анализ\s+продаж/i,
    /sales\s+analytics/i,
  ]},
];

// ===========================================
// ФИНАНСЫ / АНАЛИЗ
// ===========================================
export const FINANCE_SKILLS = [
  { skill: 'финансовый анализ', patterns: [
    /финансов[iыйе]\s+анализ/i,
    /прибыл(?:ь|и|ью)/i,
    /бюджетир/i,
  ]},
  { skill: 'P&L', patterns: [
    /P&L/i,
    /планов[а-яё]*\s+(?:и|&)\s*факт/i,
    /profit\s+and\s+loss/i,
    /отч[её]т\s+о\s+прибыл/i,
  ]},
  { skill: 'бизнес-планирование', patterns: [
    /бизнес[\s-]*план/i,
    /бюджетир/i,
    /финансовое\s+планирован/i,
  ]},
  { skill: 'управление проектами', patterns: [
    /проектн/i,
    /управлен(?:ие|ием|ию)\s+проект/i,
    /\bPM\b/i,
    /project\s+manag/i,
    /Agile/i,
    /Scrum/i,
    /Kanban/i,
    /спринт/i,
  ]},
  { skill: 'управление рисками', patterns: [
    /управлен(?:ие|ием)\s+риск/i,
    /риск[\s-]*менеджмент/i,
    /минимизац/i,
  ]},
];

// ===========================================
// IT / РАЗРАБОТКА
// ===========================================
export const IT_SKILLS = [
  { skill: 'Python', patterns: [
    /python/i,
    /django/i,
    /flask/i,
    /fastapi/i,
  ]},
  { skill: 'JavaScript', patterns: [
    /javascript/i,
    /\bJS\b/i,
    /ECMAScript/i,
  ]},
  { skill: 'TypeScript', patterns: [
    /typescript/i,
    /\bTS\b/,
  ]},
  { skill: 'React', patterns: [
    /\breact\b/i,
    /\bredux\b/i,
    /\bnext\.?js\b/i,
  ]},
  { skill: 'SQL', patterns: [
    /\bsql\b/i,
    /mysql/i,
    /postgresql/i,
    /\bpostgres\b/i,
    /sqlite/i,
  ]},
  { skill: 'Git', patterns: [
    /\bgit\b/i,
    /github/i,
    /gitlab/i,
  ]},
  { skill: 'Docker', patterns: [
    /docker/i,
    /контейнеризац/i,
  ]},
  { skill: 'CI/CD', patterns: [
    /CI\/CD/i,
    /continuous\s+integr/i,
    /jenkins/i,
    /gitlab\s+ci/i,
  ]},
  { skill: 'Linux', patterns: [
    /linux/i,
    /ubuntu/i,
    /centos/i,
    /debian/i,
  ]},
  { skill: 'AWS', patterns: [
    /\bAWS\b/i,
    /amazon\s+web\s+services/i,
  ]},
];
