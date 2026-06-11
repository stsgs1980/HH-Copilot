/**
 * TAB 2: RESUME
 */
import { ICONS } from '../icons.js';

export function getResumeSection() {
  return `<div class="tab-section" id="tab-resume">
    <div id="res-sync-section" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="res-sync">
        <span style="font-size:12px;font-weight:600;">Все резюме</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="badge badge-green" id="res-visible-count" style="font-size:10px;display:none;">0 видимых</span>
          <span class="badge badge-amber" id="res-hidden-count" style="font-size:10px;display:none;">0 скрытых</span>
          <span class="badge badge-zinc" id="res-sync-count">0</span>
          <span class="timeline-chevron open"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="timeline-body open" id="res-sync-body" style="margin-top:10px;">
        <div id="res-sync-list" style="font-size:11px;color:#71717a;">
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
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="resume-parsing">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="res-avatar" style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;flex-shrink:0;">?</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div id="res-title" style="font-size:13px;font-weight:600;">Действующее резюме</div>
            </div>
            <div id="res-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">Выберите резюме из списка выше</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="res-parsed-badge" class="badge badge-zinc" style="font-size:11px;">не выбрано</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="res-parsing-body" style="margin-top:12px;padding-top:4px;">
        <div id="res-parsed-data">
          <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Выберите или загрузите резюме</div>
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
    <div id="res-gap-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <!-- Header + score ring -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="res-gap-ring" style="width:44px;height:44px;border-radius:50%;background:conic-gradient(#059669 0deg 280.8deg,#e4e4e7 280.8deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#059669;">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">Анализ навыков</div>
          <div id="res-gap-subtitle" style="font-size:11px;color:#71717a;margin-top:1px;">Мэтчинг под действующее резюме</div>
        </div>
        <button class="btn btn-outline btn-sm" data-action="analyze-skills">
          ${ICONS.ai} Анализ
        </button>
      </div>
      <!-- Stacked bar -->
      <div id="res-gap-bar" style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:12px;background:#f4f4f5;">
        <div id="res-gap-bar-match" style="width:0%;background:linear-gradient(90deg,#059669,#34D399);border-radius:3px 0 0 3px;"></div>
        <div id="res-gap-bar-miss" style="width:0%;background:linear-gradient(90deg,#DC2626,#F87171);"></div>
        <div id="res-gap-bar-extra" style="width:0%;background:linear-gradient(90deg,#2563EB,#60A5FA);border-radius:0 3px 3px 0;"></div>
      </div>
      <!-- Row 1: Match -->
      <div id="res-gap-match-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#059669;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#059669;">Совпадают</span>
          <span class="badge badge-green" id="res-gap-match-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-match-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 2: Gap -->
      <div id="res-gap-miss-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#DC2626;">Не хватает</span>
          <span class="badge badge-red" id="res-gap-miss-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-miss-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 3: Extra -->
      <div id="res-gap-extra-row" style="margin-bottom:10px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#2563EB;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#2563EB;">Ваш плюс</span>
          <span class="badge badge-blue" id="res-gap-extra-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-extra-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Recommendation -->
      <div id="res-gap-recommendation" style="display:none;background:#FFFBEB;border:1px solid rgba(217,119,6,0.15);border-radius:8px;padding:8px 10px;align-items:flex-start;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span id="res-gap-recommendation-text" style="font-size:11px;color:#92400E;line-height:1.5;"></span>
      </div>
    </div>
    <!-- Diagnostic tools (collapsed by default) -->
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;" data-timeline="diag-tools">
        <span style="font-size:12px;font-weight:600;">Диагностика</span>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="diag-tools-body" style="margin-top:8px;">
        <div id="res-status-line" style="font-size:11px;color:#71717a;margin-bottom:8px;">Готово</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-action="clear-resume">Очистить</button>
          <button class="btn btn-outline btn-sm" data-action="dump-resume">Дамп</button>
          <button class="btn btn-outline btn-sm" data-action="test-parse">Тест</button>
        </div>
      </div>
    </div>
  </div>`;
}
