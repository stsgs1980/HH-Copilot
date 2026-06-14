/**
 * CONTENT: PAGE HANDLERS
 * ========================
 * URL-based page initialization logic.
 * Routes to the correct parser/handler based on the current page path.
 *
 * SPA support: hh.ru uses History API for navigation.
 * We detect URL changes via popstate + pushState/replaceState patches
 * and re-route to the appropriate handler.
 *
 * Handler implementations are in main-page-handlers-pages.js.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import {
  handleVacancySearchPage,
  handleResumeDetailPage,
  handleResumeListPage,
  handleVacancyDetailPage,
  handleMainPage,
} from './main-page-handlers-pages.js';

const pageLog = createLogger('Main');

/** Tracks which URL path was last handled -- prevents duplicate SPA triggers */
let lastHandledPath = '';

/** Guard: prevent duplicate initPageLogic() calls (event + safety net) */
let pageLogicInitialized = false;

/**
 * Initialize page-specific logic (parsers, observers).
 * Called when auth state changes from false/null to true.
 * Also sets up SPA navigation listener.
 * Idempotent -- safe to call multiple times; only runs once.
 */
export async function initPageLogic() {
  if (pageLogicInitialized) {
    pageLog.info('Page logic already initialized -- skipping duplicate');
    return;
  }
  pageLogicInitialized = true;

  const currentPath = window.location.pathname;

  // Handle initial page
  await routeToHandler(currentPath);
  lastHandledPath = currentPath;

  // Set up SPA navigation detection
  setupSPARouting();

  pageLog.info('Page logic initialized, SPA routing active');
}

/** Reset state (for testing). */
export function resetPageInit() {
  lastHandledPath = '';
  pageLogicInitialized = false;
}

// ===============================================
// SPA ROUTING
// ===============================================

/**
 * Detect SPA navigation on hh.ru.
 * - popstate: browser back/forward
 * - pushState/replaceState: hh.ru's client-side routing
 */
function setupSPARouting() {
  // Browser back/forward
  window.addEventListener('popstate', () => {
    onSPANavigate(window.location.pathname);
  });

  // Patch pushState / replaceState in content script's own context
  const origPush = history.pushState;
  history.pushState = function() {
    origPush.apply(this, arguments);
    onSPANavigate(window.location.pathname);
  };

  const origReplace = history.replaceState;
  history.replaceState = function() {
    origReplace.apply(this, arguments);
    onSPANavigate(window.location.pathname);
  };

  // Listen for SPA navigations triggered from MAIN world (page-world.js)
  document.addEventListener('hh-ar-spa-navigate', (e) => {
    const path = e.detail?.path || window.location.pathname;
    pageLog.info('MAIN world SPA navigate: ' + path);
    onSPANavigate(path);
  });
}

/**
 * Called on every SPA navigation. Debounced to avoid duplicate triggers.
 */
let spaTimer = null;
function onSPANavigate(newPath) {
  if (newPath === lastHandledPath) return;
  clearTimeout(spaTimer);
  spaTimer = setTimeout(async () => {
    if (window.location.pathname === lastHandledPath) return;
    const path = window.location.pathname;
    pageLog.info('SPA navigate: ' + lastHandledPath + ' -> ' + path);
    await routeToHandler(path);
    lastHandledPath = path;
  }, 300);
}

// ===============================================
// ROUTING
// ===============================================

async function routeToHandler(path) {
  pageLog.info('Routing: ' + path);

  if (path.startsWith('/search/vacancy')) {
    await handleVacancySearchPage();
  } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
    await handleResumeDetailPage(path);
  } else if (/\/applicant\/resumes\/view/.test(path)) {
    // Applicant's own resume view page -- treat as resume detail, not list
    await handleResumeDetailPage(path);
  } else if (path.startsWith('/applicant/resumes')) {
    await handleResumeListPage();
  } else if (/^\/vacancy\/\d+/.test(path)) {
    await handleVacancyDetailPage(path);
  } else if (path === '/' || path === '') {
    await handleMainPage();
  }
}
