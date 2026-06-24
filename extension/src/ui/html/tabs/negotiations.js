/**
 * TAB 4: NEGOTIATIONS
 */
import { ICONS } from '../icons.js';

export function getNegotiationsSection() {
  return `<div class="tab-section" id="tab-negotiations" role="tabpanel" aria-labelledby="tabbtn-negotiations" tabindex="0">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="neg-list" role="button" tabindex="0" aria-expanded="false" aria-controls="neg-list-body">
        <div>
          <div style="font-size:13px;font-weight:600;">Переговоры</div>
          <div style="font-size:11px;color:#52525b;margin-top:2px;">Отслеживание сообщений с работодателями</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="neg-count-badge" class="badge badge-blue">0 активных</span>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="timeline-body" id="neg-list-body" style="margin-top:10px;">
        <div id="neg-error-toast" style="display:none;"></div>
        <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
          <div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">Переговоры пока не загружены</div>
        </div>
      </div>
    </div>
    <div id="neg-chat-area" class="card fade-in" style="margin-bottom:12px;display:none;">
      <div style="display:flex;flex-direction:column;max-height:340px;">
        <div id="neg-chat-header" style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;flex-shrink:0;"></div>
        <div id="neg-chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:10px;" role="log" aria-live="polite" aria-label="История сообщений"></div>
        <div style="display:flex;gap:8px;flex-shrink:0;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
          <input type="text" id="neg-chat-input" placeholder="Сообщение..." aria-label="Введите сообщение" style="flex:1;padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
          <button class="btn btn-primary" style="padding:8px 12px;" aria-label="Отправить сообщение">${ICONS.send}</button>
        </div>
        <div id="neg-ai-reply-area" style="display:none;"></div>
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter" role="button" tabindex="0" aria-expanded="false" aria-controls="cl-body">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">Эмуляция набора</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">антибот</span>
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">посимвольно</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <label class="toggle" aria-label="Эмуляция набора"><input type="checkbox" id="neg-type-emulation" checked role="switch" aria-checked="true"><span class="slider"></span></label>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:500;">Эмуляция набора</div>
            <div style="font-size:11px;color:#52525b;">Посимвольный ввод при отправке (антибот). Шаблон письма редактируется на вкладке "Вакансии".</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <input type="number" id="neg-type-speed" value="80" aria-label="Скорость набора в миллисекундах" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
            <span style="font-size:11px;color:#52525b;">мс</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
