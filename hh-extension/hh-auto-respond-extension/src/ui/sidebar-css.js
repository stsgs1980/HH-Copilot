/**
 * SIDEBAR CSS (combined)
 * ========================
 * Combines core and component CSS for the Shadow DOM sidebar.
 * Design: green accent (#059669), 720px panel, closed Shadow DOM.
 *
 * Split into two modules for anti-monolith compliance:
 *   sidebar-css-core.js       -- base styles, panel shell, tabs, cards, animations
 *   sidebar-css-components.js -- badges, buttons, vacancy items, timeline, etc.
 */

import { SIDEBAR_CSS_CORE } from './sidebar-css-core.js';
import { SIDEBAR_CSS_COMPONENTS } from './sidebar-css-components.js';

export const SIDEBAR_CSS = SIDEBAR_CSS_CORE + SIDEBAR_CSS_COMPONENTS;
