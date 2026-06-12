/**
 * TAB 6: STATISTICS & LOGS
 */
import { ICONS } from '../icons.js';

export function getStatsSection() {
  return `<div class="tab-section" id="tab-stats" role="tabpanel" aria-labelledby="tabbtn-stats">
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button class="btn btn-sm btn-primary stats-period-btn active" data-period="today">Сегодня</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="week">Неделя</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="month">Месяц</button>
      <button class="btn btn-sm btn-outline stats-period-btn" data-period="all">Всё время</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Всего откликов</div>
        <div id="stat-total" style="font-size:22px;font-weight:700;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Приглашений</div>
        <div id="stat-invitations" style="font-size:22px;font-weight:700;color:#2563EB;">0</div>
      </div>
      <div class="card fade-in" style="text-align:center;padding:12px 8px;">
        <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Конверсия</div>
        <div id="stat-conversion" style="font-size:22px;font-weight:700;color:#059669;">0%</div>
      </div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:12px;">Динамика за неделю</div>
      <div id="stat-chart" style="display:flex;align-items:flex-end;gap:6px;height:100px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Воронка конверсии</div>
      <div id="stat-funnel" style="display:flex;flex-direction:column;gap:6px;"></div>
    </div>
    <div class="card fade-in" style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;">Статистика лимитов</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">429 ошибок (всего)</div>
          <div id="stat-429" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">CAPTCHA (всего)</div>
          <div id="stat-captcha" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Адаптивных замедлений</div>
          <div id="stat-slowdowns" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#71717a;">Ср. интервал</div>
          <div id="stat-avg-interval" style="font-size:16px;font-weight:700;">--</div>
        </div>
      </div>
    </div>
    <div class="card fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;">Лог действий</span>
        <button class="btn btn-outline btn-sm" data-action="clear-log">Очистить</button>
      </div>
      <div id="activity-log">
        <div style="padding:12px;text-align:center;font-size:11px;color:#71717a;">Нет записей</div>
      </div>
    </div>
  </div>`;
}
