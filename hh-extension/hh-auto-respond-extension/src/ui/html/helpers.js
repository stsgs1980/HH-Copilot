/**
 * Shared helper functions
 */

/* HTML-escape helper — normalizes non-breaking spaces to regular spaces */
export function esc(s) {
  if (!s) return '';
  // Replace \u00A0 (nbsp) and other non-standard spaces with regular space
  // BEFORE escaping, so innerHTML never produces &nbsp; entities.
  // This prevents "Резюме и&nbsp;профиль" rendering issues.
  const normalized = s.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  const d = document.createElement('div');
  d.textContent = normalized;
  return d.innerHTML;
}

export function scoreClass(s) {
  return s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low';
}

/* Helper: setting row (input with label) */
export function settingRow(label, hint, type, id, value, suffix) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <label for="${id}" style="font-size:12px;font-weight:500;">${label}</label>
      ${hint ? `<div style="font-size:12px;color:#52525b;">${hint}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${type}" id="${id}" value="${value}" aria-label="${label}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:12px;color:#52525b;">${suffix}</span>
    </div>
  </div>`;
}

/* Helper: setting toggle row */
export function settingToggle(label, hint, id, checked) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <label for="${id}" style="font-size:12px;font-weight:500;">${label}</label>
      ${hint ? `<div style="font-size:12px;color:#52525b;">${hint}</div>` : ''}
    </div>
    <label class="toggle" aria-label="${label}"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} role="switch" aria-checked="${checked ? 'true' : 'false'}"><span class="slider"></span></label>
  </div>`;
}
