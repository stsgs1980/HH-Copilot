/**
 * TAB: ANALYTICS
 * Market analytics dashboard showing score distribution and skill demand.
 * v1.9.85.0
 */

export function getAnalyticsSection() {
  return `<div class="card fade-in" style="margin-bottom:12px;">
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Аналитика рынка</div>
    <div id="analytics-content" style="display:none;">
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Средний score</div>
          <div id="analytics-avg-score" style="font-size:16px;font-weight:700;">0%</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Вакансий</div>
          <div id="analytics-total" style="font-size:16px;font-weight:700;">0</div>
        </div>
        <div style="flex:1;background:#FAFAFA;border-radius:8px;padding:8px 10px;">
          <div style="font-size:11px;color:#52525b;">Топ навык</div>
          <div id="analytics-top-skill" style="font-size:12px;font-weight:700;color:#059669;">--</div>
        </div>
      </div>
      <div id="analytics-skills-demand" style="margin-top:8px;">
        <div style="font-size:11px;font-weight:600;color:#52525b;margin-bottom:4px;">Востребованные навыки:</div>
        <div id="analytics-skills-list" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
    </div>
    <div id="analytics-empty" style="padding:16px;text-align:center;font-size:12px;color:#71717A;">
      Загрузите вакансии для аналитики
    </div>
  </div>`;
}
