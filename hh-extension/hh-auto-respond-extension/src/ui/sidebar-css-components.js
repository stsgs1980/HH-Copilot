/**
 * SIDEBAR CSS — Components (raw string)
 * ========================================
 * Component styles: badges, buttons, vacancy items, timeline, skill tags, etc.
 * Part 2 of 2. Combined in sidebar-css.js.
 */

export const SIDEBAR_CSS_COMPONENTS = `
/* Badges */
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.01em; font-variant-numeric: tabular-nums; overflow-wrap: break-word; }
.badge-green { background: #D1FAE5; color: #065F46; border: 1px solid rgba(5,150,105,0.15); }
.badge-amber { background: #FEF3C7; color: #92400E; border: 1px solid rgba(217,119,6,0.15); }
.badge-red { background: #FEE2E2; color: #B91C1C; border: 1px solid rgba(220,38,38,0.15); }
.badge-blue { background: #DBEAFE; color: #1E40AF; border: 1px solid rgba(37,99,235,0.15); }
.badge-zinc { background: #F4F4F5; color: #52525B; }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); letter-spacing: -0.01em; }
.btn-primary { background: #059669; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-primary:hover { background: #047857; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(5,150,105,0.25); }
.btn-primary:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-outline { background: transparent; border: 1px solid #d4d4d8; color: #3f3f46;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
.btn-outline:hover { background: rgba(5,150,105,0.06); border-color: rgba(5,150,105,0.25); color: #059669; }
.btn-danger { background: #DC2626; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.1); }
.btn-danger:hover { background: #B91C1C; transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(220,38,38,0.25); }
.btn-danger:active { transform: translateY(0);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.1); }
.btn-sm { padding: 5px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none !important; pointer-events: none; }
.btn-primary:disabled { background: #94a3b8; box-shadow: none; }
.btn .btn-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: har-spin 0.6s linear infinite; vertical-align: middle; }
.btn-outline .btn-spinner { border-color: rgba(0,0,0,0.12); border-top-color: #059669; }

/* Vacancy items */
.vacancy-item { display: flex; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); border-left: 2px solid transparent; }
.vacancy-item:hover { background: #f9fafb; border-color: rgba(5,150,105,0.15); border-left-color: #059669;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

/* Log entry */
.log-entry { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
.log-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }

/* Timeline */
.timeline-toggle { cursor: pointer; user-select: none; tabindex: 0; }
.timeline-toggle:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
.timeline-toggle:hover { background: #FAFAFA; }
.timeline-body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s; opacity: 0; }
.timeline-body.open { max-height: 2000px; opacity: 1; }
.timeline-chevron { transition: transform 0.3s; }
.timeline-chevron.open { transform: rotate(180deg); }
.tl-item { position: relative; padding-left: 24px; padding-bottom: 4px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 0; width: 1.5px; background: #e4e4e7; }
.tl-item:last-child::before { display: none; }
.tl-dot { position: absolute; left: 1px; top: 5px; width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.08); z-index: 1;
  transition: transform 0.2s, box-shadow 0.2s; }
.tl-item:first-child .tl-dot { box-shadow: 0 0 0 3px rgba(5,150,105,0.15), 0 0 0 1px rgba(0,0,0,0.08); }

/* Sub-accordion */
.sub-toggle { cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; margin: 0 -8px; border-radius: 6px; transition: background 0.15s; tabindex: 0; }
.sub-toggle:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
.sub-toggle:hover { background: rgba(0,0,0,0.03); }
.sub-body { max-height: 0; overflow: hidden; transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s, padding 0.35s; opacity: 0; padding-top: 0; }
.sub-body.open { max-height: 2000px; opacity: 1; padding-top: 6px; overflow-y: auto; }
.sub-body.open::-webkit-scrollbar { width: 3px; }
.sub-body.open::-webkit-scrollbar-track { background: transparent; }
.sub-body.open::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.sub-body.open::-webkit-scrollbar-thumb:hover { background: #059669; }
.sub-chevron { transition: transform 0.25s; flex-shrink: 0; }
.sub-chevron.open { transform: rotate(180deg); }

/* AI reply cards */
.ai-reply-card { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(5,150,105,0.15);
  border-left: 3px solid rgba(5,150,105,0.25); background: #ffffff; cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16,1,0.3,1); margin-bottom: 6px; }
.ai-reply-card:hover { background: #ECFDF5; border-color: rgba(5,150,105,0.3); border-left-color: #059669;
  transform: translateY(-1px); box-shadow: 0 2px 12px rgba(5,150,105,0.1); }
.ai-reply-card:last-child { margin-bottom: 0; }
.ai-source { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.ai-src-resume { background: #D1FAE5; color: #065F46; }
.ai-src-vacancy { background: #DBEAFE; color: #1E40AF; }
.ai-src-context { background: #FEF3C7; color: #78350F; }

/* Skill tags */
.skill-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 500; transition: all 0.15s ease; }
.skill-tag:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.skill-match { background: #D1FAE5; color: #065F46; }
.skill-miss { background: #FEE2E2; color: #B91C1C; }
.skill-extra { background: #DBEAFE; color: #1E40AF; }
.skill-synonym { background: #FEF3C7; color: #92400E; }

/* Conversation items */
.conv-item { transition: all 0.2s ease; border-radius: 8px; }
.conv-item:hover { background: #FAFAFA; }
.conv-item.active { box-shadow: inset 3px 0 0 #059669; }

/* Blacklist items */
.bl-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #FEF2F2; border-radius: 8px; border-left: 3px solid #FECACA; }
.bl-item .btn-bl-del { padding: 4px 10px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s ease; }
.bl-item .btn-bl-del:hover { background: #DC2626; color: #fff; }

/* Inputs / selects / textareas */
.fab-panel input, .fab-panel select, .fab-panel textarea { background: #FAFAFA;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.15s; }
.fab-panel input::placeholder, .fab-panel textarea::placeholder { color: #71717a; }
.fab-panel input:focus, .fab-panel select:focus, .fab-panel textarea:focus {
  border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); background: #ffffff; outline: none; }
.fab-panel input:focus-visible, .fab-panel select:focus-visible, .fab-panel textarea:focus-visible {
  outline: 2px solid #059669; outline-offset: 2px; }

/* Range input */
.fab-panel input[type="range"] { -webkit-appearance: none; appearance: none;
  height: 4px; background: #e4e4e7; border-radius: 2px; outline: none; border: none; padding: 0; }
.fab-panel input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; border-radius: 50%; background: #ffffff; border: 2px solid #059669;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; transition: box-shadow 0.15s; }
.fab-panel input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0 1px 6px rgba(5,150,105,0.3), 0 1px 3px rgba(0,0,0,0.12); }
.fab-panel input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%;
  background: #ffffff; border: 2px solid #059669; box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer; }
.fab-panel input[type="range"]::-moz-range-track { height: 4px; background: #e4e4e7; border-radius: 2px; border: none; }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 10000;
  padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 500;
  background: #18181b; color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
  role: alert; aria-live: assertive; }
@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(-8px); } }

/* Layout: header, tabbar, content, footer */
.har-header { padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.har-close-btn:hover { background: #f4f4f5; color: #18181b; }
.har-tabbar { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); flex-shrink: 0; padding: 0 4px; }
.har-content { flex: 1; overflow-y: auto; }
.har-footer { padding: 10px 16px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9)); }

/* Score ring (vacancy match) */
.score-ring { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; position: relative; flex-shrink: 0;
  background: conic-gradient(#059669 0deg, #059669 calc(var(--score) * 3.6deg), #e4e4e7 calc(var(--score) * 3.6deg)); }
.score-ring span { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #047857; }
.score-ring.high span { color: #047857; }
.score-ring.medium span { color: #B45309; }
.score-ring.low span { color: #DC2626; }

/* ═══ Guided Tour ═══ */
/* Overlay, spotlight, tooltip use position:absolute inside .fab-panel
   because the sidebar host has CSS transform, which makes position:fixed
   relative to the host instead of the viewport. */
.hh-tour-overlay { position: absolute; cursor: pointer; z-index: 9999998; }
.hh-tour-spotlight { position: absolute; pointer-events: none; z-index: 9999999; }
.hh-tour-tooltip {
  position: absolute; width: 320px; max-width: calc(100% - 32px);
  background: #ffffff; border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden; z-index: 10000001;
  /* NO animation — transform:scale() in keyframes breaks position:absolute coords */
}
.hh-tour-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px 0; }
.hh-tour-counter {
  font-size: 12px; font-weight: 600; color: #3b82f6;
  background: #eff6ff; padding: 2px 8px; border-radius: 99px; }
.hh-tour-skip {
  background: none; border: none; font-size: 12px; color: #a1a1aa;
  cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: color 0.15s; }
.hh-tour-skip:hover { color: #71717a; }
.hh-tour-title {
  padding: 8px 14px 0; font-size: 14px; font-weight: 700; color: #18181b; }
.hh-tour-text {
  padding: 6px 14px 10px; font-size: 13px; line-height: 1.5; color: #52525b; }
.hh-tour-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid #f4f4f5; background: #fafafa; }
.hh-tour-prev, .hh-tour-next {
  border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px;
  font-weight: 600; cursor: pointer; transition: all 0.15s; }
.hh-tour-next { background: #059669; color: #fff; }
.hh-tour-next:hover { background: #047857; }
.hh-tour-prev { background: #f4f4f5; color: #52525b; }
.hh-tour-prev:hover { background: #e4e4e7; }
.hh-tour-help {
  background: none; border: 1px solid #d4d4d8; border-radius: 50%;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 13px; font-weight: 700; color: #71717a;
  transition: all 0.15s; line-height: 1; }
.hh-tour-help:hover { background: #f4f4f5; color: #059669; border-color: #059669; }

/* Visually hidden — accessible to screen readers */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* Overflow word-break */
.fab-panel { overflow-wrap: break-word; word-break: break-word; }
`;
