/**
 * UI: RESUMES -- My Resumes Panel
 * ================================
 * Renders the "My Resumes" sync section in the sidebar resume tab.
 * Shows list of synced resumes with visibility badges.
 */

import { panelState, refs, setActiveResumeState } from '../../state.js';
import { esc } from '../../html.js';
import { renderResumePanel } from './render-resume-panel.js';
import { getResumePageType } from '../../../parsers/resume-detail.js';
import { setActiveResume } from '../../../lib/storage.js';

// ===============================================
// MY RESUMES PANEL
// ===============================================

/**
 * Render the "My Resumes" sync section in the sidebar.
 * Shows list of synced resumes with:
 *   - Radio-style indicator ((*) active, ( ) inactive)
 *   - Visibility badges (Видимо/Скрыто)
 *   - (r) reparse button on active resume (amber for hidden)
 *   - Visible/hidden counter badges
 *   - Contextual "Взять со страницы" CTA (only on resume detail pages when no active resume)
 */
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

  // Show/hide "Взять со страницы" CTA based on page type and active resume
  const ctaLoadEl = refs.shadowRoot?.getElementById('res-cta-load');
  if (ctaLoadEl) {
    const pageType = getResumePageType();
    const hasActive = panelState.resume && panelState.resume.id;
    // Show CTA when on a resume detail page AND no active resume yet
    ctaLoadEl.style.display = (pageType === 'resume-detail' && !hasActive) ? 'block' : 'none';
  }

  if (resumes.length === 0) {
    listEl.innerHTML = '<div style="padding:8px;text-align:center;">Нажмите "Синхронизировать все" для загрузки резюме</div>';
    return;
  }

  listEl.innerHTML = resumes.map((r, idx) => {
    const skillCount = (r.skills || []).length;
    const expCount = (r.experience || []).length;
    const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
    const isActive = panelState.resume && panelState.resume.id === r.id;
    let visBadge = '';
    if (vis === 'hidden') {
      visBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">Скрыто</span>';
    } else if (vis === 'visible') {
      visBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">Видимо</span>';
    } else {
      visBadge = '<span class="badge" style="font-size:9px;margin-left:4px;background:#e4e4e7;color:#52525b;">?</span>';
    }
    // Radio-style indicator: filled circle for active, empty for others
    const radio = isActive
      ? '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="width:8px;height:8px;border-radius:50%;background:#059669;"></span></span>'
      : '<span style="width:16px;height:16px;border-radius:50%;border:2px solid #d4d4d8;display:flex;align-items:center;justify-content:center;flex-shrink:0;"></span>';
    // Reparse icon ((r)) only on active resume card -- fetches fresh data from server
    const reparseIcon = isActive
      ? '<button class="btn btn-outline btn-sm" data-action="reparse-resume" title="' + (vis === 'hidden' ? 'Перепарсить скрытое' : 'Перепарсить') + '" ' +
        'style="padding:2px 6px;font-size:13px;line-height:1;' + (vis === 'hidden' ? 'color:#b45309;border-color:#fbbf24;' : '') + '">' +
        '(R)</button>'
      : '';
    return '<div class="har-my-resume-item" data-resume-idx="' + idx + '" style="padding:8px;border-bottom:1px solid #e4e4e7;cursor:pointer;display:flex;align-items:flex-start;gap:8px;' +
      (isActive ? 'background:#f0fdf4;border-radius:6px;' : '') +
      (vis === 'hidden' && !isActive ? 'opacity:0.6;' : '') +
      '">' +
      radio +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;font-size:12px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">' +
          '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(r.title || 'Без названия') + '</span>' + visBadge +
        '</div>' +
        (r.salary ? '<div style="font-size:11px;color:#059669;">' + esc(r.salary) + '</div>' : '') +
        '<div style="font-size:10px;color:#52525b;">' +
          skillCount + ' нав., ' + expCount + ' зап. опыта' +
        '</div>' +
      '</div>' +
      reparseIcon +
    '</div>';
  }).join('');

  listEl.querySelectorAll('.har-my-resume-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // If (r) reparse button was clicked, don't switch active resume -- let event delegation handle reparse-resume
      if (e.target.closest('[data-action="reparse-resume"]')) return;
      const idx = parseInt(item.getAttribute('data-resume-idx'), 10);
      const resume = resumes[idx];
      if (!resume) return;
      setActiveResumeState(resume);
      setActiveResume(resume);
      renderResumePanel();
      renderMyResumesPanel();
    });
  });
}

// ===============================================
// RESUME LIST PANEL (from page scan)
// ===============================================

/**
 * Render the resume list panel (from page scan on /applicant/resumes).
 * Shows clickable links to each resume found on the page.
 */
export function renderResumeListPanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;
  const list = panelState.resumeList;
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="har-empty">Список резюме пуст.<br>Нажмите "Загрузить" для выбора.</div>';
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
    '<div class="har-resume-list-hint">Нажмите, чтобы открыть резюме в новой вкладке, затем нажмите "Загрузить".</div>';

  container.querySelectorAll('.har-resume-list-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(link.getAttribute('href'), '_blank');
    });
  });
}
