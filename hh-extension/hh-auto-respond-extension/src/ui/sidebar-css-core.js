/**
 * SIDEBAR CSS — Core (raw string)
 * =================================
 * Base styles: reset, panel shell, tabs, cards, animations, progress, toggles.
 * Part 1 of 2. Combined in sidebar-css.js.
 */

export const SIDEBAR_CSS_CORE = `:host { all: initial; }
*, *::before, *::after { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; box-sizing: border-box; line-height: 1.5; -webkit-text-size-adjust: 100%; }
html { font-size: 14px; }
:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 4px; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

/* Panel shell */
.fab-panel { width: 720px; height: 100vh; position: fixed; right: 0; top: 0; z-index: 1000;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column;

  box-shadow: 0 0 0 1px rgba(0,0,0,0.03), 0 8px 40px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04);
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease; }
.fab-panel.hidden { transform: translateX(100%); opacity: 0; pointer-events: none; }

/* Tab sections */
.tab-section { display: none; flex: 1; overflow-y: auto; padding: 16px; opacity: 0; transition: opacity 0.2s ease; }
.tab-section::-webkit-scrollbar { width: 3px; }
.tab-section::-webkit-scrollbar-track { background: transparent; }
.tab-section::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.tab-section::-webkit-scrollbar-thumb:hover { background: #059669; }
.tab-section.active { display: block; opacity: 1; }

/* Tab buttons */
.tab-btn { position: relative; padding: 10px 6px; font-size: 12px; font-weight: 500; color: #3f3f46;
  background: none; border: none; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 4px; flex: 1; border-radius: 8px; }
.tab-btn:hover { color: #18181b; background: rgba(0,0,0,0.04); }
.tab-btn.active { color: #047857; font-weight: 600; background: rgba(5,150,105,0.06);
  text-shadow: 0 0 8px rgba(5,150,105,0.12); }
.tab-btn.active::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%);
  width:20px; height:3px; background:#059669; border-radius:99px;
  transition: width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.2s ease; }

/* Cards */
.card { background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 14px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); }
.card:hover { transform: translateY(-0.5px); box-shadow: 0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8); }

/* Animations */
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeIn 0.25s ease; }
@keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.pulse-dot { animation: pulseDot 2s infinite; }
@keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
.slide-right { animation: slideRight 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.shimmer { background: linear-gradient(90deg, transparent 0%, rgba(5,150,105,0.08) 50%, transparent 100%);
  background-size: 200% 100%; animation: shimmer 2s infinite; }
@keyframes blink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
.typing-cursor::after { content:'|'; animation: blink 1s infinite; color: #059669; font-weight: 300; font-size: 14px; }

/* KPI ring */
@keyframes ringFill { from { stroke-dashoffset: 339.292; } }
.kpi-ring-bg { fill: none; stroke: #f4f4f5; stroke-width: 8; }
.kpi-ring-fill { fill: none; stroke: url(#kpiGrad); stroke-width: 8; stroke-linecap: round;
  stroke-dasharray: 339.292; stroke-dashoffset: 123.89; animation: ringFill 1.2s ease-out;
  transform: rotate(-90deg); transform-origin: center; }
@keyframes countdown { from { width: 100%; } to { width: 0%; } }
.countdown-bar { animation: countdown 48s linear infinite; }
@keyframes slideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.kpi-stat { animation: slideUp 0.4s ease backwards; }
.kpi-stat:nth-child(1) { animation-delay: 0.1s; }
.kpi-stat:nth-child(2) { animation-delay: 0.2s; }
.kpi-stat:nth-child(3) { animation-delay: 0.3s; }

/* Progress bar */
.progress-bar { height: 6px; background: #f4f4f5; border-radius: 3px; overflow: hidden; }
.progress-bar .fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
@keyframes progressShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.progress-bar .fill.fill-green { background-image: linear-gradient(90deg, #059669 0%, #34D399 40%, #059669 60%, #10B981 100%);
  background-size: 200% 100%; animation: progressShimmer 2.5s linear infinite; }

/* Toggle switch */
.toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
.toggle input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.toggle .slider { position: absolute; inset: 0; background: #d4d4d8; border-radius: 11px; transition: background 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s; }
.toggle .slider::before { content:''; position:absolute; left:2px; top:2px; width:18px; height:18px;
  background:#fff; border-radius:50%; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.toggle input:checked + .slider { background: #059669; box-shadow: 0 0 8px rgba(5,150,105,0.3); }
.toggle input:checked + .slider::before { transform: translateX(18px); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

/* FAB pulse */
@keyframes fabPulse { 0%, 100% { box-shadow: 0 4px 20px rgba(5,150,105,0.4); }
  50% { box-shadow: 0 4px 20px rgba(5,150,105,0.4), 0 0 0 8px rgba(5,150,105,0.12); } }

/* Spinner */
.har-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #059669; border-radius: 50%; animation: har-spin 0.8s linear infinite; role: status; }
.har-spinner::after { content: 'Loading...'; position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
@keyframes har-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
`;
