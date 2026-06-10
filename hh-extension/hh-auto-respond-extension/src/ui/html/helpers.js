/**
 * Shared helper functions
 */

/* HTML-escape helper */
export function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function scoreClass(s) {
  return s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low';
}

/* Helper: setting row (input with label) */
export function settingRow(label, hint, type, id, value, suffix) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="${type}" id="${id}" value="${value}" style="width:64px;padding:6px 8px;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;text-align:center;">
      <span style="font-size:11px;color:#71717a;">${suffix}</span>
    </div>
  </div>`;
}

/* Helper: setting toggle row */
export function settingToggle(label, hint, id, checked) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:12px;font-weight:500;">${label}</div>
      ${hint ? `<div style="font-size:11px;color:#71717a;">${hint}</div>` : ''}
    </div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="slider"></span></label>
  </div>`;
}
