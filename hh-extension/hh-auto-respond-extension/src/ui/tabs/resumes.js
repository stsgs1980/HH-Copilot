/**
 * UI: TABS — RESUMES
 * =====================
 * Renders resume card and resume list in the sidebar resume tab.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';
import { getResumePageType } from '../../parsers/resume-detail.js';

export function renderResumeListPanel() {
  const container = refs.shadowRoot?.getElementById('har-resume-content');
  if (!container) return;
  const list = panelState.resumeList;
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="har-empty">Список резюме пуст.<br>Нажмите "Загрузить" для парсинга.</div>';
    return;
  }
  container.innerHTML =
    '<div class="har-resume-list-header">Найдено резюме: ' + list.length + '</div>' +
    list.map(r => {
      const isActive = panelState.resume && panelState.resume.id === r.id;
      return '<div class="har-resume-list-item ' + (isActive ? 'har-resume-list-active' : '') + '">' +
        '<a href="' + esc(r.url) + '" target="_blank" class="har-resume-list-link">' + esc(r.title) + '</a>' +
        (isActive ? '<span class="har-resume-loaded-badge">loaded</span>' : '') +
        '</div>';
    }).join('') +
    '<div class="har-resume-list-hint">Click to open resume in new tab, then press "Load" on that page.</div>';

  container.querySelectorAll('.har-resume-list-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(link.getAttribute('href'), '_blank');
    });
  });
}

export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById('har-resume-content');
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = 'Go to your resume page on hh.ru<br>and click "Load from current page".';
    if (pageType === 'resume-list') {
      hint = 'Click "Load" to see your resumes listed on this page.';
    }
    container.innerHTML = '<div class="har-empty">Resume not loaded yet.<br>' + hint + '</div>';
    return;
  }

  // Skills
  const skillsHtml = r.skills.length > 0
    ? '<div class="har-tag-list">' + r.skills.map(s => '<span class="har-tag">' + esc(s) + '</span>').join('') + '</div>'
    : '<div class="har-empty" style="padding:8px">Навыки не найдены</div>';

  // Experience
  const expHtml = r.experience.length > 0
    ? r.experience.map(j => '<div class="har-exp-item"><div class="har-exp-pos">' + esc(j.position || '?') + '</div><div class="har-exp-meta">' + esc(j.company || '') + (j.period ? ' &middot; ' + esc(j.period) : '') + '</div>' + (j.description ? '<div class="har-exp-desc">' + esc(j.description) + '</div>' : '') + '</div>').join('')
    : '<div class="har-empty" style="padding:8px">Опыт не найден</div>';

  // Education
  const eduHtml = r.education.length > 0
    ? r.education.map(e => '<div class="har-edu-item"><span>' + esc(e.name) + '</span>' + (e.year ? ' <span class="har-edu-year">' + esc(e.year) + '</span>' : '') + '</div>').join('')
    : '';

  // Languages
  const langHtml = r.languages.length > 0
    ? '<div class="har-tag-list">' + r.languages.map(l => '<span class="har-tag har-tag-lang">' + esc(l) + '</span>').join('') + '</div>'
    : '';

  // Debug info
  const debugHtml = '<div class="har-debug"><details><summary>Debug (' + r._debug.found.length + ' found, ' + r._debug.missing.length + ' missing)</summary>' +
    '<div class="har-debug-body">' +
    r._debug.found.map(f => '<div style="color:#22c55e">✓ ' + esc(f) + '</div>').join('') +
    r._debug.missing.map(m => '<div style="color:#ef4444">✗ ' + esc(m) + '</div>').join('') +
    '</div></details></div>';

  container.innerHTML = `
    <div class="har-resume-card">
      <div class="har-resume-header">
        <div class="har-resume-title">${esc(r.title || 'Без названия')}</div>
        ${r.salary ? '<div class="har-resume-salary">' + esc(r.salary) + '</div>' : ''}
        <div class="har-resume-meta">${esc(r.gender)} ${esc(r.age)}${r.address ? ' &middot; ' + esc(r.address) : ''}</div>
      </div>
      ${r.specializations.length > 0 ? '<div class="har-resume-section"><div class="har-section-subtitle">Специализации</div><div class="har-tag-list">' + r.specializations.map(s => '<span class="har-tag">' + esc(s) + '</span>').join('') + '</div></div>' : ''}
      <div class="har-resume-section">
        <div class="har-section-subtitle">Навыки (${r.skills.length})</div>
        ${skillsHtml}
      </div>
      <div class="har-resume-section">
        <div class="har-section-subtitle">Опыт работы (${r.experience.length})</div>
        ${expHtml}
      </div>
      ${eduHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">Образование</div>' + eduHtml + '</div>' : ''}
      ${langHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">Языки</div>' + langHtml + '</div>' : ''}
      ${r.additionalInfo ? '<div class="har-resume-section"><div class="har-section-subtitle">Доп. информация</div><div style="font-size:12px;color:#475569;padding:4px 0">' + esc(r.additionalInfo) + '</div></div>' : ''}
      ${debugHtml}
      <div style="font-size:10px;color:#94a3b8;padding:8px 0">Parsed: ${r.parsedAt}</div>
      <a href="${esc(r.url)}" target="_blank" class="har-btn har-btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open on hh.ru</a>
    </div>`;
}
