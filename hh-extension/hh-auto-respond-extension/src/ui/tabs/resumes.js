/**
 * UI: TABS -- RESUMES
 * =====================
 * Renders resume card and resume list in the sidebar resume tab.
 */

import { panelState, refs } from '../state.js';
import { esc } from '../html.js';
import { getResumePageType } from '../../parsers/resume-detail.js';

/**
 * Update the accordion header (title, subtitle, badge) when resume state changes.
 * @param {object|null} resume — loaded resume or null if not loaded
 */
function updateAccordionHeader(resume) {
  const titleEl = refs.shadowRoot?.getElementById('res-title');
  const subtitleEl = refs.shadowRoot?.getElementById('res-subtitle');
  const badgeEl = refs.shadowRoot?.getElementById('res-parsed-badge');

  if (resume && resume.id) {
    if (titleEl) titleEl.textContent = resume.title || 'Без названия';
    if (subtitleEl) subtitleEl.textContent = resume.salary || (resume.gender + ' ' + resume.age);
    if (badgeEl) {
      badgeEl.textContent = 'загружено';
      badgeEl.className = 'badge badge-green';
      badgeEl.style.fontSize = '11px';
    }
  } else {
    if (titleEl) titleEl.textContent = 'Резюме не загружено';
    if (subtitleEl) subtitleEl.textContent = 'Нажмите «Загрузить» для парсинга';
    if (badgeEl) {
      badgeEl.textContent = 'не загружено';
      badgeEl.className = 'badge badge-zinc';
      badgeEl.style.fontSize = '11px';
    }
  }
}

export function renderResumeListPanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;
  const list = panelState.resumeList;
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="har-empty">Список резюме пуст.<br>Нажмите «Загрузить» для парсинга.</div>';
    return;
  }
  container.innerHTML =
    '<div class="har-resume-list-header">Найдено резюме: ' + list.length + '</div>' +
    list.map(r => {
      const isActive = panelState.resume && panelState.resume.id === r.id;
      return '<div class="har-resume-list-item ' + (isActive ? 'har-resume-list-active' : '') + '">' +
        '<a href="' + esc(r.url) + '" target="_blank" class="har-resume-list-link">' + esc(r.title) + '</a>' +
        (isActive ? '<span class="har-resume-loaded-badge">загружено</span>' : '') +
        '</div>';
    }).join('') +
    '<div class="har-resume-list-hint">Нажмите, чтобы открыть резюме в новой вкладке, затем нажмите «Загрузить».</div>';

  container.querySelectorAll('.har-resume-list-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(link.getAttribute('href'), '_blank');
    });
  });
}

export function renderMyResumesPanel() {
  const listEl = refs.shadowRoot?.getElementById('res-sync-list');
  const countEl = refs.shadowRoot?.getElementById('res-sync-count');
  if (!listEl) return;

  const resumes = panelState.myResumes || [];
  if (countEl) countEl.textContent = resumes.length;

  // Update visible/hidden counters
  const visibleCountEl = refs.shadowRoot?.getElementById('res-visible-count');
  const hiddenCountEl = refs.shadowRoot?.getElementById('res-hidden-count');
  if (resumes.length > 0) {
    const visibleCount = resumes.filter(r => (r.visibility || (r.hidden ? 'hidden' : 'unknown')) === 'visible').length;
    const hiddenCount = resumes.filter(r => (r.visibility || (r.hidden ? 'hidden' : 'unknown')) === 'hidden').length;
    if (visibleCountEl) {
      visibleCountEl.textContent = visibleCount + ' вид.';
      visibleCountEl.style.display = visibleCount > 0 ? 'inline-flex' : 'none';
    }
    if (hiddenCountEl) {
      hiddenCountEl.textContent = hiddenCount + ' скрыт.';
      hiddenCountEl.style.display = hiddenCount > 0 ? 'inline-flex' : 'none';
    }
  } else {
    if (visibleCountEl) visibleCountEl.style.display = 'none';
    if (hiddenCountEl) hiddenCountEl.style.display = 'none';
  }

  if (resumes.length === 0) {
    listEl.innerHTML = '<div style="padding:8px;text-align:center;">Нажмите «Синхронизировать все» для загрузки резюме</div>';
    return;
  }

  listEl.innerHTML = resumes.map((r, idx) => {
    const skillCount = (r.skills || []).length;
    const expCount = (r.experience || []).length;
    const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
    const isActive = panelState.resume && panelState.resume.id === r.id;
    // Visibility badge -- different styles for each status
    let visBadge = '';
    if (vis === 'hidden') {
      visBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">Скрыто</span>';
    } else if (vis === 'visible') {
      visBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">Видимо</span>';
    } else {
      // 'unknown' -- status not yet determined
      visBadge = '<span class="badge badge-zinc" style="font-size:9px;margin-left:4px;">Статус неизвестен</span>';
    }
    return '<div class="har-my-resume-item" data-resume-idx="' + idx + '" style="padding:8px 0;border-bottom:1px solid #e4e4e7;cursor:pointer;' +
      (isActive ? 'background:#f0fdf4;border-radius:6px;padding:8px;' : '') +
      '">' +
      '<div style="font-weight:600;font-size:12px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">' +
        '<span>' + esc(r.title || 'Без названия') + '</span>' + visBadge +
      '</div>' +
      (r.salary ? '<div style="font-size:11px;color:#059669;">' + esc(r.salary) + '</div>' : '') +
      '<div style="font-size:10px;color:#71717a;">' +
        skillCount + ' нав., ' + expCount + ' зап. опыта' +
      '</div>' +
    '</div>';
  }).join('');

  // Click handler: select resume and show details
  listEl.querySelectorAll('.har-my-resume-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-resume-idx'), 10);
      const resume = resumes[idx];
      if (!resume) return;
      panelState.resume = resume;
      chrome.storage.local.set({ myResume: resume });
      renderResumePanel();
      renderMyResumesPanel();
    });
  });
}

export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    // If we have synced resumes, auto-select the first one instead of showing "not loaded"
    const synced = panelState.myResumes || [];
    if (synced.length > 0 && synced[0].id) {
      panelState.resume = synced[0];
      chrome.storage.local.set({ myResume: synced[0] });
      renderResumePanel();
      return;
    }
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = 'Перейдите на страницу резюме на hh.ru<br>и нажмите «Загрузить с текущей страницы».';
    if (pageType === 'resume-list') {
      hint = 'Нажмите «Загрузить», чтобы увидеть резюме на этой странице.';
    }
    container.innerHTML = '<div class="har-empty">Резюме ещё не загружено.<br>' + hint + '</div>';
    updateAccordionHeader(null);
    return;
  }

  // Update accordion header with resume info
  updateAccordionHeader(r);

  // Auto-expand the accordion
  const body = refs.shadowRoot?.getElementById('res-parsing-body');
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    const chevron = body.previousElementSibling?.querySelector('.timeline-chevron');
    if (chevron) chevron.classList.add('open');
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
  const debugHtml = '<div class="har-debug"><details><summary>Отладка (' + r._debug.found.length + ' найдено, ' + r._debug.missing.length + ' отсутствует)</summary>' +
    '<div class="har-debug-body">' +
    r._debug.found.map(f => '<div style="color:#22c55e">+ ' + esc(f) + '</div>').join('') +
    r._debug.missing.map(m => '<div style="color:#ef4444">- ' + esc(m) + '</div>').join('') +
    '</div></details></div>';

  // Visibility badge for the detail card
  const visDetail = r.visibility || (r.hidden ? 'hidden' : 'unknown');
  let visDetailBadge = '';
  if (visDetail === 'hidden') {
    visDetailBadge = ' <span class="badge badge-amber" style="font-size:10px;vertical-align:middle;">Скрыто</span>';
  } else if (visDetail === 'visible') {
    visDetailBadge = ' <span class="badge badge-green" style="font-size:10px;vertical-align:middle;">Видимо</span>';
  }

  container.innerHTML =
    '<div class="har-resume-card">' +
      '<div class="har-resume-header">' +
        '<div class="har-resume-title">' + esc(r.title || 'Без названия') + visDetailBadge + '</div>' +
        (r.salary ? '<div class="har-resume-salary">' + esc(r.salary) + '</div>' : '') +
        '<div class="har-resume-meta">' + esc(r.gender) + ' ' + esc(r.age) + (r.address ? ' &middot; ' + esc(r.address) : '') + '</div>' +
      '</div>' +
      (r.specializations.length > 0 ? '<div class="har-resume-section"><div class="har-section-subtitle">Специализации</div><div class="har-tag-list">' + r.specializations.map(s => '<span class="har-tag">' + esc(s) + '</span>').join('') + '</div></div>' : '') +
      '<div class="har-resume-section">' +
        '<div class="har-section-subtitle">Навыки (' + r.skills.length + ')</div>' +
        skillsHtml +
      '</div>' +
      '<div class="har-resume-section">' +
        '<div class="har-section-subtitle">Опыт (' + r.experience.length + ')</div>' +
        expHtml +
      '</div>' +
      (eduHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">Образование</div>' + eduHtml + '</div>' : '') +
      (langHtml ? '<div class="har-resume-section"><div class="har-section-subtitle">Языки</div>' + langHtml + '</div>' : '') +
      (r.additionalInfo ? '<div class="har-resume-section"><div class="har-section-subtitle">Доп. информация</div><div style="font-size:12px;color:#475569;padding:4px 0">' + esc(r.additionalInfo) + '</div></div>' : '') +
      debugHtml +
      '<div style="font-size:10px;color:#94a3b8;padding:8px 0">Загружено: ' + r.parsedAt + '</div>' +
      '<a href="' + esc(r.url) + '" target="_blank" class="har-btn har-btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Открыть на hh.ru</a>' +
    '</div>';

  // Also render myResumes list in sync section
  renderMyResumesPanel();
}
