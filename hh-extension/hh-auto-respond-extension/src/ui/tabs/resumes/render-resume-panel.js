/**
 * UI: RESUMES — Main Resume Panel
 * =================================
 * Renders the parsed resume data in the sidebar resume tab.
 * Wireframe: 6 accordion sections + skills card + gap analysis card.
 */

import { panelState, refs, setActiveResumeState } from '../../state.js';
import { esc } from '../../html.js';
import { getResumePageType } from '../../../parsers/resume-detail.js';
import {
  getInitials, attachSubToggle, updateSkillsSection
} from './resume-helpers.js';
import { renderMyResumesPanel, renderResumeListPanel } from './render-my-resumes.js';
import {
  buildPersonalSection, buildSalarySection,
  buildExperienceSection, buildEducationSection,
  buildLanguagesSection, buildContactsSection
} from './section-builders.js';
import { setActiveResume } from '../../../lib/storage.js';
import { updateAccordionHeader } from './resume-accordion-header.js';
import { analyzeResumeQuality } from '../../../lib/resume-quality-analyzer.js';

// ═══════════════════════════════════════════════
// MAIN RESUME PANEL RENDER
// ═══════════════════════════════════════════════

/**
 * Render the main resume panel in the sidebar.
 *
 * Shows either:
 *   - Empty state with contextual hint (based on page type)
 *   - Auto-selected first resume from synced list (if _resumeCleared is false)
 *   - Full resume display with 6 accordion sections + visibility warning
 *   - Resume list panel (if on /applicant/resumes with no active resume)
 *
 * Also triggers rendering of the "My Resumes" sync section.
 */
export function renderResumePanel() {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;

  const r = panelState.resume;
  if (!r || !r.id) {
    const synced = panelState.myResumes || [];
    if (!panelState._resumeCleared && synced.length > 0 && synced[0].id) {
      setActiveResumeState(synced[0]);
      setActiveResume(synced[0]);
      renderResumePanel();
      return;
    }
    if (panelState.resumeList && panelState.resumeList.length > 0) {
      renderResumeListPanel();
      return;
    }
    const pageType = getResumePageType();
    let hint = 'Выберите резюме ниже или перейдите на страницу резюме.';
    if (pageType === 'resume-list') {
      hint = 'Нажмите «Синхронизировать все» ниже.';
    } else if (pageType === 'resume-detail') {
      hint = 'Нажмите «Взять со страницы» ниже.';
    }
    container.innerHTML = '<div class="har-empty">Действующее резюме не выбрано.<br>' + hint + '</div>';
    updateAccordionHeader(null);
    return;
  }

  updateAccordionHeader(r);

  // Auto-expand the main accordion
  const body = refs.shadowRoot?.getElementById('res-parsing-body');
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    const chevron = body.previousElementSibling?.querySelector('.timeline-chevron');
    if (chevron) chevron.classList.add('open');
  }

  // Build 6 accordion sections matching wireframe
  const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
  container.innerHTML =
    '<div class="tl-item">' + buildPersonalSection(r) + '</div>' +
    '<div class="tl-item">' + buildSalarySection(r) + '</div>' +
    '<div class="tl-item">' + buildExperienceSection(r) + '</div>' +
    '<div class="tl-item">' + buildEducationSection(r) + '</div>' +
    '<div class="tl-item">' + buildLanguagesSection(r) + '</div>' +
    '<div class="tl-item">' + buildContactsSection(r) + '</div>' +
    (vis === 'hidden'
      ? '<div style="font-size:10px;color:#92400e;padding:6px 4px 0 28px;">Скрытое резюме не видно работодателям — мэтчинг недоступен</div>'
      : '');

  // Attach sub-accordion toggle listeners
  attachSubToggle('subPersonal', 'chevPersonal');
  attachSubToggle('subSalary', 'chevSalary');
  attachSubToggle('subExp', 'chevExp');
  attachSubToggle('subEdu', 'chevEdu');
  attachSubToggle('subLang', 'chevLang');
  attachSubToggle('subContacts', 'chevContacts');

  updateSkillsSection(r);
  updateResumeScore(r);
  renderMyResumesPanel();
}

// ═══════════════════════════════════════════════
// RESUME SCORE — качественная оценка глазами HR/ATS
// ═══════════════════════════════════════════════

function updateResumeScore(r) {
  const section = refs.shadowRoot?.getElementById('res-score-section');
  if (!section) return;

  if (!r || !r.id) { section.style.display = 'none'; return; }
  section.style.display = '';

  const result = analyzeResumeQuality(r);
  const pct = result.totalScore;

  // ── Ring chart ──
  const ring = refs.shadowRoot?.getElementById('res-score-ring');
  if (ring) {
    const deg = Math.round(pct * 3.6);
    const color = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626';
    ring.style.background = 'conic-gradient(' + color + ' 0deg ' + deg + 'deg, #e4e4e7 ' + deg + 'deg 360deg)';
    const inner = ring.querySelector('div');
    if (inner) {
      inner.textContent = pct + '%';
      inner.style.color = color;
    }
  }

  // ── Verdict subtitle ──
  const subtitle = refs.shadowRoot?.getElementById('res-score-subtitle');
  if (subtitle) {
    if (pct >= 80) subtitle.textContent = 'Сильное резюме — ATS пропустит, HR заметит';
    else if (pct >= 60) subtitle.textContent = 'Хорошее резюме — есть что усилить';
    else if (pct >= 40) subtitle.textContent = 'Среднее — ATS может отсеять, HR не увидит ценности';
    else subtitle.textContent = 'Слабое — высокая вероятность отсева на этапе ATS';
  }

  // ── ATS + Experience mini-scores ──
  const atsScoreEl = refs.shadowRoot?.getElementById('res-ats-score');
  const atsBar = refs.shadowRoot?.getElementById('res-ats-bar');
  if (atsScoreEl) {
    const atsColor = result.atsScore >= 70 ? '#059669' : result.atsScore >= 40 ? '#D97706' : '#DC2626';
    atsScoreEl.textContent = result.atsScore + '%';
    atsScoreEl.style.color = atsColor;
  }
  if (atsBar) atsBar.style.width = result.atsScore + '%';

  const expScoreEl = refs.shadowRoot?.getElementById('res-exp-score');
  const expBar = refs.shadowRoot?.getElementById('res-exp-bar');
  if (expScoreEl) {
    const expColor = result.experienceScore >= 70 ? '#2563EB' : result.experienceScore >= 40 ? '#D97706' : '#DC2626';
    expScoreEl.textContent = result.experienceScore + '%';
    expScoreEl.style.color = expColor;
  }
  if (expBar) expBar.style.width = result.experienceScore + '%';

  // ── Red flags ──
  const redFlagsContainer = refs.shadowRoot?.getElementById('res-red-flags');
  const redFlagsList = refs.shadowRoot?.getElementById('res-red-flags-list');
  if (redFlagsContainer && redFlagsList) {
    if (result.redFlags.length > 0) {
      redFlagsContainer.style.display = '';
      redFlagsList.innerHTML = result.redFlags.map(f =>
        '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#FEF2F2;border-radius:6px;">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
        '<span style="color:#991B1B;line-height:1.4;">' + esc(f) + '</span></div>'
      ).join('');
    } else {
      redFlagsContainer.style.display = 'none';
    }
  }

  // ── Strengths ──
  const strengthsContainer = refs.shadowRoot?.getElementById('res-strengths');
  const strengthsList = refs.shadowRoot?.getElementById('res-strengths-list');
  if (strengthsContainer && strengthsList) {
    if (result.strengths.length > 0) {
      strengthsContainer.style.display = '';
      strengthsList.innerHTML = result.strengths.map(s =>
        '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#F0FDF4;border-radius:6px;">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
        '<span style="color:#166534;line-height:1.4;">' + esc(s) + '</span></div>'
      ).join('');
    } else {
      strengthsContainer.style.display = 'none';
    }
  }

  // ── Recommendations ──
  const recsContainer = refs.shadowRoot?.getElementById('res-recommendations');
  const recsList = refs.shadowRoot?.getElementById('res-recommendations-list');
  if (recsContainer && recsList) {
    if (result.recommendations.length > 0) {
      recsContainer.style.display = '';
      recsList.innerHTML = result.recommendations.map(rec => {
        const priorityColor = rec.priority === 'critical' ? '#991B1B' : rec.priority === 'high' ? '#92400E' : '#71717a';
        const priorityBg = rec.priority === 'critical' ? '#FEF2F2' : rec.priority === 'high' ? '#FFFBEB' : '#FAFAFA';
        const priorityBorder = rec.priority === 'critical' ? '1px solid rgba(220,38,38,0.15)' : rec.priority === 'high' ? '1px solid rgba(217,119,6,0.15)' : '1px solid #e4e4e7';
        const textSpan = rec.tooltip
          ? '<span title="' + esc(rec.tooltip) + '" style="cursor:help;border-bottom:1px dashed #a1a1aa;line-height:1.4;">' + esc(rec.text) + '</span>'
          : '<span style="line-height:1.4;">' + esc(rec.text) + '</span>';
        return '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:' + priorityBg + ';border:' + priorityBorder + ';border-radius:6px;">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>' +
          '<span style="color:' + priorityColor + ';">' + textSpan + '</span></div>';
      }).join('');
    } else {
      recsContainer.style.display = 'none';
    }
  }
}
