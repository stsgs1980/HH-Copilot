/**
 * UI: RESUMES -- Section Builders
 * ================================
 * Build HTML for each of the 6 accordion sections:
 * Личные данные, Зарплата, Опыт, Образование, Языки, Контакты
 */

import { esc } from '../../html.js';
import { buildSubAccordion, buildGrid } from './resume-helpers.js';

// ===============================================
// PERSONAL DATA
// ===============================================

export function buildPersonalSection(r) {
  const count = [r.name, r.title, r.address, r.gender || r.age].filter(Boolean).length;
  return buildSubAccordion(
    'subPersonal', 'chevPersonal', 'Личные данные',
    count + ' полей', '#059669',
    buildGrid([
      ['Имя', r.name],
      ['Позиция', r.title],
      ['Город', r.address],
      ['Пол', r.gender],
      ['Возраст', r.age],
    ])
  );
}

// ===============================================
// SALARY & CONDITIONS
// ===============================================

export function buildSalarySection(r) {
  const count = [r.salary, r.employmentType, r.workFormat, r.schedule, r.relocation].filter(Boolean).length;
  return buildSubAccordion(
    'subSalary', 'chevSalary', 'Зарплата и условия',
    count + ' полей', '#2563EB',
    buildGrid([
      ['Зарплата', r.salary],
      ['Занятость', r.employmentType],
      ['Формат', r.workFormat],
      ['График', r.schedule],
      ['Перемещения', r.relocation],
    ])
  );
}

// ===============================================
// EXPERIENCE
// ===============================================

export function buildExperienceSection(r) {
  const expCount = (r.experience || []).length;
  const expContent = (r.experience || []).map((j, idx) => {
    // Build timeline period: "Компания * 2021 -- н.в. (3 года)"
    const companyParts = [];
    if (j.company) companyParts.push(esc(j.company));
    if (j.period) companyParts.push(esc(j.period));
    const companyLine = companyParts.join(' * ');
    const isLast = idx === expCount - 1;

    return '<div style="margin-bottom:' + (isLast ? '0' : '8px') + ';padding-bottom:' + (isLast ? '0' : '8px') + ';' + (isLast ? '' : 'border-bottom:1px solid rgba(0,0,0,0.05);') + '">' +
      '<div style="font-weight:600;">' + esc(j.position || '?') + '</div>' +
      (companyLine ? '<div style="color:#52525b;margin-top:2px;">' + companyLine + '</div>' : '') +
      (j.description ? '<div style="color:#52525b;margin-top:3px;font-size:11px;line-height:1.5;">' + esc(j.description).split('\n').map(p => '<div style="margin-bottom:2px;">' + p + '</div>').join('') + '</div>' : '') +
    '</div>';
  }).join('');
  return buildSubAccordion(
    'subExp', 'chevExp', 'Опыт работы',
    expCount + ' мест', '#B45309',
    expCount > 0
      ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;">' + expContent + '</div>'
      : '<div style="padding:8px;font-size:11px;color:#52525b;">Опыт не указан</div>'
  );
}

// ===============================================
// EDUCATION (structured grid: ВУЗ, Факультет, Год, Степень)
// ===============================================

export function buildEducationSection(r) {
  const eduCount = (r.education || []).length;
  const eduContent = (r.education || []).map(e => {
    return '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;margin-bottom:6px;">' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' +
        (e.name ? '<span style="color:#52525b;">ВУЗ</span><span style="font-weight:500;">' + esc(e.name) + '</span>' : '') +
        (e.description ? '<span style="color:#52525b;">Факультет</span><span style="font-weight:500;">' + esc(e.description) + '</span>' : '') +
        (e.year ? '<span style="color:#52525b;">Год</span><span style="font-weight:500;">' + esc(e.year) + '</span>' : '') +
        (e.degree ? '<span style="color:#52525b;">Степень</span><span style="font-weight:500;">' + esc(e.degree) + '</span>' : '') +
      '</div></div>';
  }).join('');
  return buildSubAccordion(
    'subEdu', 'chevEdu', 'Образование',
    eduCount + ' записей', '#7C3AED',
    eduCount > 0
      ? eduContent
      : '<div style="padding:8px;font-size:11px;color:#52525b;">Образование не указано</div>'
  );
}

// ===============================================
// LANGUAGES (language + level grid)
// ===============================================

export function buildLanguagesSection(r) {
  const langCount = (r.languages || []).length;
  const langContent = (r.languages || []).length > 0
    ? '<div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;font-size:11px;">' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">' +
      (r.languages || []).map(l => {
        if (typeof l === 'string') {
          const parts = l.split(/\s*[\u2013\u2014-]\s*/);
          const lang = parts[0] || l;
          const level = parts[1] || '--';
          return '<span style="color:#52525b;">' + esc(lang) + '</span><span style="font-weight:500;">' + esc(level) + '</span>';
        }
        return '<span style="color:#52525b;">' + esc(l.name || l) + '</span><span style="font-weight:500;">' + esc(l.level || '--') + '</span>';
      }).join('') +
      '</div></div>'
    : '<div style="padding:8px;font-size:11px;color:#52525b;">Языки не указаны</div>';
  return buildSubAccordion(
    'subLang', 'chevLang', 'Языки',
    langCount + ' языков', '#EC4899',
    langContent
  );
}

// ===============================================
// CONTACTS
// ===============================================

export function buildContactsSection(r) {
  const contactCount = [r.phone, r.email, r.telegram].filter(Boolean).length;
  return buildSubAccordion(
    'subContacts', 'chevContacts', 'Контакты',
    contactCount + ' полей', '#71717a',
    buildGrid([
      ['Телефон', r.phone],
      ['Email', r.email],
      ['Telegram', r.telegram],
    ])
  );
}
