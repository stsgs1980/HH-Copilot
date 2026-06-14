/**
 * Iframe visibility detection -- text/script/notification strategies.
 * Extracted from resume-fetch-iframe-vis.js for anti-monolith compliance.
 *
 * Strategies: S3 (body indicators), S5 (body text), S6 (script JSON),
 *            S7 (notifications), S8 (action links).
 */
import {
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, hasHiddenIndicator, hasVisibleIndicator, normalizeWs
} from './resume-constants.js';

/**
 * Strategy S3: Check body text for hidden/visible indicator patterns.
 * @param {string} bodyText - Normalized body text
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkBodyIndicators(bodyText) {
  if (hasHiddenIndicator(bodyText)) {
    return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S3:body-has-hidden-indicator -> HIDDEN' };
  }
  if (hasVisibleIndicator(bodyText)) {
    return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S3:body-has-visible-indicator -> VISIBLE' };
  }
  return { visibility: null, trace: 'iframe-S3:body-no-indicators' };
}

/**
 * Strategy S5: Check for "не видят" / "видно всем" anywhere in body.
 * @param {string} bodyText - Normalized body text
 * @returns {{ visibility: string|null, trace: string|null }}
 */
export function checkBodyVisibilityText(bodyText) {
  const bodyLower = bodyText.toLowerCase();
  if (bodyLower.includes('не видят') || bodyLower.includes('не\u00A0видят') || bodyLower.includes('не видно')) {
    return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S5:body-has-"не видят/не видно" -> HIDDEN' };
  }
  if (bodyLower.includes('видно всем')) {
    return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S5:body-has-"видно всем" -> VISIBLE' };
  }
  return { visibility: null, trace: null };
}

/**
 * Strategy S6: Check for visibility status in inline script JSON.
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkScriptPatterns(iframeDoc) {
  try {
    const scripts = iframeDoc.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const t = script.textContent || '';
      if (t.length < 50) continue;
      if (/"hidden"\s*:\s*true/.test(t) || /"isHidden"\s*:\s*true/.test(t) ||
          /"visibility"\s*:\s*"hidden"/.test(t) || /"status"\s*:\s*"hidden"/.test(t)) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S6:script-has-hidden-pattern -> HIDDEN' };
      }
      if (/"hidden"\s*:\s*false/.test(t) || /"visibility"\s*:\s*"visible"/.test(t)) {
        return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S6:script-has-visible-pattern -> VISIBLE' };
      }
    }
  } catch (e) {
    return { visibility: null, trace: 'iframe-S6:script-check-error(' + e.message.substring(0, 30) + ')' };
  }
  return { visibility: null, trace: 'iframe-S6:no-script-patterns' };
}

/**
 * Strategy S7: Check for notification/banner elements indicating hidden status.
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkNotificationBanners(iframeDoc) {
  const notifSelectors = [
    '[data-qa="resume-visibility-notification"]', '[data-qa*="visibility-notification"]',
    '[data-qa*="resume-notification"]', '[class*="resume-hidden"]',
    '[class*="resume-visibility"]', '.resume-status-hidden',
  ];
  for (const sel of notifSelectors) {
    const el = iframeDoc.querySelector(sel);
    if (el) {
      const elText = normalizeWs(el.textContent || '').toLowerCase();
      if (elText.includes('не видят') || elText.includes('скрыт') || elText.includes('сделать видим')) {
        return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S7:notification=' + sel + ' text="' + elText.substring(0, 40) + '" -> HIDDEN' };
      }
    }
  }
  return { visibility: null, trace: 'iframe-S7:no-notification-hidden' };
}

/**
 * Strategy S8: Check for action links with "show"/"visible" in URL.
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkActionLinks(iframeDoc) {
  const actionLinks = iframeDoc.querySelectorAll('a[href*="visible"], a[href*="show"], a[href*="publish"]');
  for (const link of actionLinks) {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const linkText = normalizeWs((link.textContent || '')).toLowerCase();
    if (href.includes('publish') || href.includes('make_visible') || href.includes('show')) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S8:action-link href="' + href.substring(0, 60) + '" text="' + linkText.substring(0, 40) + '" -> HIDDEN' };
    }
  }
  return { visibility: null, trace: 'iframe-S8:no-action-links' };
}

/**
 * Collect all visibility-related elements for diagnostic dump.
 * @param {Document} iframeDoc
 * @returns {Array<{qa: string, text: string}>}
 */
export function collectVisRelatedElements(iframeDoc) {
  const visElements = [];
  const visRelated = iframeDoc.querySelectorAll('[data-qa*="resume"], [data-qa*="visibility"]');
  for (const el of visRelated) {
    const elQa = el.getAttribute('data-qa') || '';
    const elText = normalizeWs((el.textContent || '')).substring(0, 60);
    if (elText.includes('скрыт') || elText.includes('видим') || elText.includes('не видят')) {
      visElements.push({ qa: elQa, text: elText });
    }
  }
  return visElements;
}
