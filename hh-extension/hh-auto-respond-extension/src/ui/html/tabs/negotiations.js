/**
 * TAB 4: NEGOTIATIONS
 */
import { ICONS } from '../icons.js';

export function getNegotiationsSection() {
  return `<div class="tab-section" id="tab-negotiations" role="tabpanel" aria-labelledby="tabbtn-negotiations" tabindex="0">
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:13px;font-weight:600;">Переговоры</div>
          <div style="font-size:11px;color:#52525b;margin-top:2px;">Отслеживание сообщений с работодателями</div>
        </div>
        <span id="neg-count-badge" class="badge badge-blue">0 активных</span>
      </div>
      <div id="neg-list" style="display:flex;flex-direction:column;gap:2px;">
        <div style="padding:24px;text-align:center;font-size:11px;color:#52525b;">Переговоры пока не загружены</div>
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
      </div>
    </div>
    <div class="card fade-in">
      <div class="timeline-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;" data-timeline="cover-letter" role="button" tabindex="0" aria-expanded="false" aria-controls="cl-body">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;font-weight:600;">Шаблоны и ввод</div>
          <div style="display:flex;gap:4px;">
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">сопроводительное</span>
            <span style="font-size:11px;color:#52525b;background:#f4f4f5;padding:1px 6px;border-radius:4px;">эмуляция набора</span>
          </div>
        </div>
        ${ICONS.chevronDown}
      </div>
      <div class="timeline-body" id="cl-body" style="margin-top:10px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label class="toggle" aria-label="Эмуляция набора"><input type="checkbox" id="neg-type-emulation" checked role="switch" aria-checked="true"><span class="slider"></span></label>
            <div style="flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:500;">Эмуляция набора</div>
              <div style="font-size:11px;color:#52525b;">Посимвольный ввод (антибот)</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <input type="number" id="neg-type-speed" value="80" aria-label="Скорость набора в миллисекундах" style="width:52px;padding:4px 6px;border:1px solid #e4e4e7;border-radius:6px;font-size:11px;text-align:center;">
              <span style="font-size:11px;color:#52525b;">мс</span>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label for="cover-letter-text" style="font-size:11px;font-weight:500;">Шаблон сопроводительного</label>
              <span style="font-size:11px;color:#52525b;">{position} {experience} {skills}</span>
            </div>
            <textarea id="cover-letter-text" style="width:100%;height:64px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;font-size:11px;resize:none;line-height:1.5;">Здравствуйте! Меня заинтересовала вакансия {position}. У меня {experience} опыта в {skills}. Готов обсудить детали на интервью.</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
