/**
 * DOM Inspector -- Icons (DOC-003 s7 compliance).
 * Extracted from dom-inspector-panel.js for AHG Rule 12.
 */

const IL = (w, h, inner, fb) =>
  '<span class="icon"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="' +
  w +
  '" height="' +
  h +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" ' +
  "onerror=\"this.style.display='none';this.nextElementSibling.style.display='inline'\">" +
  inner +
  '</svg><span class="icon-fallback" style="display:none">' +
  (fb || "?") +
  "</span></span>";

export const INSPECTOR_ICONS = {
  search: IL(14, 14, '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>', "S"),
  clipboard: IL(
    12,
    12,
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/>',
    "Cp",
  ),
  mapPin: IL(
    12,
    12,
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    "Pin",
  ),
  refresh: IL(
    12,
    12,
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "R",
  ),
  close: IL(12, 12, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', "X"),
};
