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
      <div style="margin-top:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-size:11px;color:#52525b;">График:</span>
        <button class="btn btn-primary btn-sm vac-schedule-btn" data-schedule="all" style="padding:3px 8px;font-size:10px;border-radius:4px;">Все</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="remote" style="padding:3px 8px;font-size:10px;border-radius:4px;">Удалёнка</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="hybrid" style="padding:3px 8px;font-size:10px;border-radius:4px;">Гибрид</button>
        <button class="btn btn-outline btn-sm vac-schedule-btn" data-schedule="office" style="padding:3px 8px;font-size:10px;border-radius:4px;">Офис</button>
        <label style="display:flex;align-items:center;gap:4px;margin-left:auto;font-size:11px;color:#52525b;cursor:pointer;">
          <input type="checkbox" id="vac-hide-ads" style="margin:0;">
          Скрыть рекламу
        </label>
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
    <div id="vac-cover-letter-card" class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="vac-cover-letter" role="button" tabindex="0" aria-expanded="true" aria-controls="vac-cl-body">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:13px;font-weight:600;">Сопроводительное письмо</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">шаблон</span>
            <span style="font-size:11px;color:#7c3aed;background:#f5f3ff;padding:1px 6px;border-radius:4px;">AI</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body open" id="vac-cl-body" style="margin-top:10px;">
        <div id="cl-ai-status" style="font-size:10px;color:#71717A;margin-bottom:6px;line-height:1.4;">Контекст: резюме и вакансия определяются автоматически.</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:8px;flex-wrap:wrap;">
          <label for="cover-letter-text" style="font-size:11px;font-weight:500;">Шаблон сопроводительного</label>
          <div style="display:flex;align-items:center;gap:4px;">
            <button id="cover-letter-ai-btn" type="button" aria-label="Сгенерировать сопроводительное с AI" style="font-size:11px;padding:3px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:500;">Сгенерировать с AI</button>
            <span style="font-size:11px;color:#52525b;">Тон:</span>
            <select id="s-letter-tone" aria-label="Тон сопроводительного письма" style="font-size:11px;padding:3px 6px;border:1px solid #e4e4e7;border-radius:6px;background:#fff;">
              <option value="formal">Формальный</option>
              <option value="friendly">Дружелюбный</option>
              <option value="concise">Краткий</option>
              <option value="enthusiastic">Энтузиаст</option>
            </select>
          </div>
        </div>
        <textarea id="cover-letter-text" style="width:100%;height:80px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">Здравствуйте! Меня заинтересовала вакансия {position} в {company}. Имею {experience} опыта в {skills}. {matching_sentence}Буду рад обсудить детали на интервью.</textarea>
        <div id="cl-ai-toast" style="display:none;margin-top:6px;padding:6px 10px;border-radius:6px;font-size:11px;line-height:1.4;"></div>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
          <button id="cl-ai-log-copy-btn" type="button" aria-label="Скопировать лог AI-кнопки в буфер обмена" style="font-size:10px;padding:2px 8px;background:#f4f4f5;color:#27272a;border:1px solid #e4e4e7;border-radius:6px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg> Скопировать лог AI</button>
          <button id="cl-ai-log-clear-btn" type="button" aria-label="Очистить лог AI-кнопки" style="font-size:10px;padding:2px 8px;background:#f4f4f5;color:#27272a;border:1px solid #e4e4e7;border-radius:6px;cursor:pointer;font-weight:500;display:inline-flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Очистить лог</button>
          <span id="cl-ai-log-status" style="font-size:10px;color:#71717a;">лог пуст</span>
        </div>
        <div style="font-size:10px;color:#71717A;margin-top:4px;line-height:1.4;">Автозаполнение: {position} -- должность, {company} -- компания, {experience} -- стаж, {skills} -- навыки, {matching} -- совпадения, {matching_sentence} -- предложение о совпадениях, {requirements} -- требования. Шаблон сохраняется в storage автоматически.</div>
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
      <!-- Row 2: Synonym (v1.9.22.0 -- related skills) -->
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
        <span style="color:#D97706;flex-shrink:0;margin-top:1px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
        <span id="res-gap-recommendation-text" style="font-size:11px;color:#92400E;line-height:1.5;"></span>
      </div>
    </div>
    <div class="card fade-in">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Вакансии на странице</div>
      <div id="har-vlist"><div style="padding:24px;text-align:center;color:#52525b;font-size:12px;line-height:1.6;">Загрузка...</div></div>
    </div>
  </div>`;
}
