/**
 * TAB 2: RESUME
 */
import { ICONS } from '../icons.js';

export function getResumeSection() {
  return `<div class="tab-section" id="tab-resume" role="tabpanel" aria-labelledby="tabbtn-resume" tabindex="0">
    <div id="res-sync-section" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="res-sync" role="button" tabindex="0" aria-expanded="true" aria-controls="res-sync-body">
        <span style="font-size:12px;font-weight:600;">Все резюме</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="badge badge-green" id="res-visible-count" style="font-size:10px;display:none;">0 видимых</span>
          <span class="badge badge-amber" id="res-hidden-count" style="font-size:10px;display:none;">0 скрытых</span>
          <span class="badge badge-zinc" id="res-sync-count">0</span>
          <span class="timeline-chevron open"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="timeline-body open" id="res-sync-body" style="margin-top:10px;">
        <div id="res-sync-list" style="font-size:11px;color:#52525b;">
          Нажмите «Синхронизировать все» для загрузки резюме
        </div>
        <div id="res-cta-load" style="padding-top:6px;display:none;">
          <button class="btn btn-primary btn-sm" data-action="load-resume" style="width:100%;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg> Взять со страницы
          </button>
        </div>
        <div style="padding-top:6px;">
          <button class="btn btn-outline btn-sm" data-action="sync-resumes" style="width:100%;">
            ${ICONS.refresh} Синхронизировать все
          </button>
        </div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing" role="button" tabindex="0" aria-expanded="false" aria-controls="res-parsing-body">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div id="res-title" style="font-size:13px;font-weight:600;">Действующее резюме</div>
            </div>
            <div id="res-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">Выберите резюме из списка выше</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">не выбрано</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#52525b;">Выберите или загрузите резюме</div>
        </div>
      </div>
    </div>
    <div id="res-skills-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">Навыки (действующее)</span>
        <span class="badge badge-zinc" id="res-skills-count">0 навыков</span>
      </div>
      <div id="res-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
    </div>
    <div id="res-score-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <!-- Header: ring + title + verdict -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="res-score-ring" style="width:48px;height:48px;border-radius:50%;background:conic-gradient(#059669 0deg 0deg,#e4e4e7 0deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#059669;" id="res-score-pct">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">Оценка резюме</div>
          <div id="res-score-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">Анализ глазами HR и ATS</div>
        </div>
      </div>
      <!-- Two mini-scores: ATS + Experience -->
      <div id="res-score-bars" style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:12px;color:#52525b;">ATS-совместимость</span>
            <span id="res-ats-score" style="font-size:12px;font-weight:700;color:#059669;">0%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#e4e4e7;">
            <div id="res-ats-bar" style="height:100%;border-radius:2px;background:#059669;width:0%;transition:width .4s ease;"></div>
          </div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:12px;color:#52525b;">Качество опыта</span>
            <span id="res-exp-score" style="font-size:12px;font-weight:700;color:#2563EB;">0%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#e4e4e7;">
            <div id="res-exp-bar" style="height:100%;border-radius:2px;background:#2563EB;width:0%;transition:width .4s ease;"></div>
          </div>
        </div>
      </div>
      <!-- Red flags -->
      <div id="res-red-flags" style="display:none;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#DC2626;">Красные флаги</span>
        </div>
        <div id="res-red-flags-list" style="font-size:11px;"></div>
      </div>
      <!-- Strengths -->
      <div id="res-strengths" style="display:none;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#059669;">Сильные стороны</span>
        </div>
        <div id="res-strengths-list" style="font-size:11px;"></div>
      </div>
      <!-- Recommendations -->
      <div id="res-recommendations" style="display:none;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          <span style="font-size:11px;font-weight:600;color:#D97706;">Что улучшить</span>
        </div>
        <div id="res-recommendations-list" style="font-size:11px;"></div>
      </div>
    </div>
    <!-- Diagnostic tools (collapsed by default) -->
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="diag-tools" role="button" tabindex="0" aria-expanded="false" aria-controls="diag-tools-body">
        <span style="font-size:12px;font-weight:600;">Диагностика</span>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="diag-tools-body" style="margin-top:8px;">
        <div id="res-status-line" style="font-size:11px;color:#52525b;margin-bottom:8px;">Готово</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-action="clear-resume">Очистить</button>
          <button class="btn btn-outline btn-sm" data-action="dump-resume">Дамп</button>
          <button class="btn btn-outline btn-sm" data-action="test-parse">Тест</button>
        </div>
      </div>
    </div>
  </div>`;
}
