/**
 * TAB 3: VACANCIES
 */
import { ICONS } from '../icons.js';

export function getVacanciesSection() {
  return `<div class="tab-section" id="tab-vacancies" role="tabpanel" aria-labelledby="tabbtn-vacancies" tabindex="0">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">Парсинг вакансий</div>
          <div style="font-size:11px;color:#52525b;margin-top:2px;">Извлечение со страницы поиска hh.ru</div>
        </div>
        <button class="btn btn-primary btn-sm" data-action="refresh">${ICONS.check} Спарсить</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Найдено</div>
          <div id="vac-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Совпадение > 70%</div>
          <div id="vac-high-match" style="font-size:16px;font-weight:700;color:#059669;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Чёрный список</div>
          <div id="vac-blacklisted" style="font-size:16px;font-weight:700;color:#DC2626;">0</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="vac-search" placeholder="Поиск по названию..." aria-label="Поиск по названию вакансии" style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <select id="vac-status-filter" aria-label="Фильтр по статусу" style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;background:#FAFAFA;">
          <option value="all">Все</option>
          <option value="new">Новые</option>
          <option value="applied">Откликнуто</option>
          <option value="blacklisted">Чёрный список</option>
        </select>
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:#52525b;white-space:nowrap;">Мин. совпадение:</span>
        <input type="range" id="vac-score-range" min="0" max="100" value="0" aria-label="Минимальный процент совпадения" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="flex:1;">
        <span id="vac-score-label" style="font-size:11px;font-weight:600;color:#52525b;min-width:32px;text-align:right;">0%</span>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:12px;font-weight:600;">Массовый отклик</div>
        <span id="mass-status" class="badge badge-zinc">Остановлен</span>
      </div>
      <div id="mass-progress" style="display:none;margin-bottom:10px;">
        <div class="progress-bar"><div id="mass-fill" class="fill fill-green" style="width:0%;"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span id="mass-count" style="font-size:11px;color:#52525b;">0 / 20</span>
          <span id="mass-eta" style="font-size:11px;color:#52525b;">Осталось: --</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="mass-start-btn" class="btn btn-primary btn-sm" data-action="apply-all" style="flex:1;">Откликнуться на все</button>
        <button id="mass-stop-btn" class="btn btn-danger btn-sm" data-action="pause" style="flex:1;opacity:0.5;" disabled>Пауза</button>
      </div>
    </div>
    <div id="vac-match-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="vac-match-ring" style="width:48px;height:48px;border-radius:50%;background:conic-gradient(#e4e4e7 0deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#52525b;">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">Совпадение с вакансией</div>
          <div id="vac-match-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">Оцените соответствие</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <div style="flex:1;text-align:center;">
          <div id="vac-match-skills" style="font-size:16px;font-weight:700;color:#059669;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">Навыки</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-title" style="font-size:16px;font-weight:700;color:#2563EB;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">Должность</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-salary" style="font-size:16px;font-weight:700;color:#D97706;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">Зарплата</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div id="vac-match-exp" style="font-size:16px;font-weight:700;color:#7C3AED;">0</div>
          <div style="font-size:12px;color:#52525b;margin-top:1px;">Опыт</div>
        </div>
      </div>
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#f4f4f5;">
        <div id="vac-match-bar-skills" style="width:0%;background:linear-gradient(90deg,#059669,#34D399);border-radius:4px 0 0 4px;"></div>
        <div id="vac-match-bar-title" style="width:0%;background:linear-gradient(90deg,#2563EB,#60A5FA);"></div>
        <div id="vac-match-bar-salary" style="width:0%;background:linear-gradient(90deg,#D97706,#FBBF24);"></div>
        <div id="vac-match-bar-exp" style="width:0%;background:linear-gradient(90deg,#7C3AED,#A78BFA);border-radius:0 4px 4px 0;"></div>
      </div>
      <div id="vac-match-details" style="margin-top:10px;display:none;">
        <div id="vac-match-matching-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#059669;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#059669;">Совпадающие навыки</span>
          </div>
          <div id="vac-match-matching-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
        <div id="vac-match-derived-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#B45309;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#B45309;">Из опыта работы</span>
          </div>
          <div id="vac-match-derived-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
        <div id="vac-match-missing-skills" style="margin-bottom:6px;display:none;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0;"></span>
            <span style="font-size:11px;font-weight:600;color:#DC2626;">Не хватает</span>
          </div>
          <div id="vac-match-missing-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
        </div>
      </div>
    </div>
    <div id="res-gap-section" class="card fade-in" style="margin-bottom:12px;display:none;">
      <!-- Header + score ring -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div id="res-gap-ring" style="width:44px;height:44px;border-radius:50%;background:conic-gradient(#059669 0deg 280.8deg,#e4e4e7 280.8deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#059669;">0%</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">Совпадение навыков</div>
          <div id="res-gap-subtitle" style="font-size:11px;color:#52525b;margin-top:1px;">Резюме vs вакансии</div>
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
      <!-- Row 2: Synonym (v1.9.22.0 — related skills) -->
      <div id="res-gap-synonym-row" style="margin-bottom:8px;display:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#D97706;flex-shrink:0;"></span>
          <span style="font-size:11px;font-weight:600;color:#D97706;">Связанные</span>
          <span class="badge badge-amber" id="res-gap-synonym-count" style="font-size:11px;padding:1px 6px;">0</span>
        </div>
        <div id="res-gap-synonym-list" style="display:flex;flex-wrap:wrap;gap:4px;padding-left:13px;"></div>
      </div>
      <!-- Row 3: Gap -->
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
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Вакансии на странице</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">Загрузка...</div></div>
    </div>
  </div>`;
}
