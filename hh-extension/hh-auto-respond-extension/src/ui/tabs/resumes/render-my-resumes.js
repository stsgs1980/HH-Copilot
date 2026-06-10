/**
 * UI: RESUMES — My Resumes Panel
 * ================================
 * Renders the "My Resumes" sync section in the sidebar resume tab.
 * Shows list of synced resumes with visibility badges.
 */

import { panelState, refs } from '../../state.js';
import { esc } from '../../html.js';
import { renderResumePanel } from './render-resume-panel.js';

// ═══════════════════════════════════════════════
// MY RESUMES PANEL
// ═══════════════════════════════════════════════

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
    let visBadge = '';
    if (vis === 'hidden') {
      visBadge = '<span class="badge badge-amber" style="font-size:9px;margin-left:4px;">Скрыто</span>';
    } else if (vis === 'visible') {
      visBadge = '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">Видимо</span>';
    } else {
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

  listEl.querySelectorAll('.har-my-resume-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-resume-idx'), 10);
      const resume = resumes[idx];
      if (!resume) return;
      panelState.resume = resume;
      panelState._resumeCleared = false;
      chrome.storage.local.set({ myResume: resume });
      renderResumePanel();
      renderMyResumesPanel();
    });
  });
}

// ═══════════════════════════════════════════════
// RESUME LIST PANEL (from page scan)
// ═══════════════════════════════════════════════

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
