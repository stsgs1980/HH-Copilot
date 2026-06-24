/**
 * TAB 5: SETTINGS
 */
import { ICONS } from '../icons.js';
import { settingRow, settingToggle } from '../helpers.js';

export function getSettingsSection() {
  return `<div class="tab-section" id="tab-settings" role="tabpanel" aria-labelledby="tabbtn-settings" tabindex="0">
    ${settingsAI()}
    ${settingsRateLimits()}
    ${settingsCaptcha()}
    ${settingsBlacklist()}
    ${settingsDailyReset()}
    ${settingsGeneral()}
  </div>`;
}

function settingsAI() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">AI-настройки</div>
    <div style="font-size:11px;color:#52525b;margin-bottom:10px;">Параметры для генерации сопроводительных и ответов в чате</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <label for="s-ai-base-url" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Base URL</label>
        <input type="text" id="s-ai-base-url" value="https://internal-api.z.ai/v1" placeholder="https://api.example.com/v1" aria-label="AI API base URL" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-api-key" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">API Key</label>
        <input type="password" id="s-ai-api-key" value="" placeholder="вставьте ключ API" aria-label="AI API key" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-model" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Model</label>
        <input type="text" id="s-ai-model" value="glm-4.5" placeholder="glm-4.5" aria-label="AI model name" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
      </div>
      <div>
        <label for="s-ai-timeout" style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Timeout (мс)</label>
        <input type="number" id="s-ai-timeout" value="60000" min="5000" max="180000" step="1000" placeholder="60000" aria-label="AI request timeout in milliseconds" style="width:100%;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;font-family:monospace;">
        <div style="font-size:10px;color:#71717A;margin-top:3px;line-height:1.4;">5 000–180 000 мс. Если AI отвечает медленно -- увеличь до 90 000–120 000.</div>
      </div>
      <div style="font-size:10px;color:#71717A;line-height:1.4;">Изменения сохраняются автоматически (debounce 500 мс). Поля хранятся в chrome.storage.local под ключом aiConfig.</div>
    </div>
  </div>`;
}

function settingsRateLimits() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;">Лимиты и рейт-лимитинг</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingRow('Дневной лимит', 'Макс. откликов в день', 'number', 's-daily-limit', 200, '/ день')}
      ${settingRow('Часовой лимит', 'Макс. откликов в час', 'number', 's-hourly-limit', 30, '/ час')}
      ${settingRow('Мин. интервал', 'Между откликами', 'number', 's-min-interval', 30, 'сек')}
      ${settingToggle('Детекция всплесков', 'Остановка при всплеске 429', 's-burst', true)}
      ${settingToggle('Адаптивное замедление', 'Увеличение интервала при 429/CAPTCHA', 's-adaptive', true)}
    </div>
  </div>`;
}

function settingsCaptcha() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">CAPTCHA обработка</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle('Авто-пауза при CAPTCHA', 'Остановить отклики и уведомить', 's-captcha', true)}
      ${settingRow('Время паузы', 'Перед продолжением', 'number', 's-captcha-time', 5, 'мин')}
    </div>
  </div>`;
}

function settingsBlacklist() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-size:13px;font-weight:600;">Чёрный список</div>
        <div style="font-size:11px;color:#52525b;margin-top:2px;">Работодатели, которые будут пропущены</div>
      </div>
      <span id="bl-count-badge" class="badge badge-zinc">0 компаний</span>
    </div>
    <div id="bl-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="bl-input" placeholder="Название компании..." aria-label="Название компании для чёрного списка" style="flex:1;padding:7px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      <button class="btn btn-outline btn-sm" data-action="bl-add">+ Добавить</button>
    </div>
  </div>`;
}

function settingsDailyReset() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Ежедневный сброс</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">Авто-сброс счётчиков</div>
          <div style="font-size:11px;color:#52525b;">Время сброса (chrome.alarms)</div>
        </div>
        <input type="time" id="s-reset-time" value="00:00" aria-label="Время ежедневного сброса" style="padding:4px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:500;">Следующий сброс</div>
          <div style="font-size:11px;color:#52525b;">Через chrome.alarms API</div>
        </div>
        <span id="s-reset-countdown" style="font-size:11px;font-weight:600;color:#52525b;">--</span>
      </div>
      <button class="btn btn-outline" style="align-self:flex-start;" data-action="reset-daily">${ICONS.refresh} Сбросить сейчас</button>
    </div>
  </div>`;
}

function settingsGeneral() {
  return `<div class="card fade-in">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Общие настройки</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${settingToggle('Авто-проверка авторизации', '', 's-auth-check', true)}
      ${settingToggle('Уведомления', '', 's-notifications', true)}
      ${settingToggle('Логирование действий', '', 's-logging', true)}
      ${settingToggle('Shadow DOM изоляция', '', 's-shadow-dom', true)}
    </div>
  </div>`;
}
