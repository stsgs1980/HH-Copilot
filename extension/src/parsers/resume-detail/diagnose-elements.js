/**
 * DIAGNOSE: Elements Scanner
 * ==========================
 * Scans all data-qa elements, groups them by prefix,
 * and logs resume-block elements.
 */

import { createLogger } from '../../lib/anti-hallucination.js';

const _diagLog = createLogger('DIAG');

/**
 * Scan and log all data-qa elements on the page.
 * Groups by prefix for easier analysis.
 */
export function scanDataQaElements() {
  const allQa = document.querySelectorAll('[data-qa]');
  const qaMap = {};
  allQa.forEach(el => {
    const qa = el.getAttribute('data-qa');
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().substring(0, 80);
    const key = qa;
    if (!qaMap[key]) qaMap[key] = [];
    qaMap[key].push({ tag, text: text || '(empty)', class: (el.className || '').toString().substring(0, 60) });
  });

  // Group by prefix
  const groups = {};
  Object.keys(qaMap).sort().forEach(qa => {
    const prefix = qa.split('__')[0].split('-')[0].split('_')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(qa);
  });

  console.log('%c[HH-AR][DIAG] Total data-qa elements: ' + allQa.length, 'color:#22c55e');
  console.log('%c[HH-AR][DIAG] Unique data-qa values: ' + Object.keys(qaMap).length, 'color:#22c55e');

  // Table of all data-qa
  console.group('%c[HH-AR][DIAG] All data-qa values:', 'color:#2964FF');
  console.table(Object.keys(qaMap).sort().map(qa => ({
    'data-qa': qa,
    'count': qaMap[qa].length,
    'tag': qaMap[qa][0].tag,
    'sample_text': qaMap[qa][0].text,
    'sample_class': qaMap[qa][0].class
  })));
  console.groupEnd();

  // Groups
  console.group('%c[HH-AR][DIAG] Groups by prefix:', 'color:#2964FF');
  Object.keys(groups).sort().forEach(prefix => {
    console.log('%c  ' + prefix + ' (' + groups[prefix].length + '):', 'color:#f59e0b', groups[prefix].join(', '));
  });
  console.groupEnd();
}

/**
 * Scan and log resume-block elements.
 */
export function scanResumeBlocks() {
  console.group('%c[HH-AR][DIAG] Resume blocks (.resume-block, [data-qa*="resume"]):', 'color:#2964FF');
  const resumeBlocks = document.querySelectorAll('[data-qa*="resume"], .resume-block, [class*="resume"]');
  resumeBlocks.forEach((block, i) => {
    const qa = block.getAttribute('data-qa') || '(no data-qa)';
    const cls = (block.className || '').toString().substring(0, 100);
    const text = (block.textContent || '').trim().substring(0, 120);
    console.log('  Block #' + i + ':', { qa, cls, text });
  });
  console.groupEnd();
}

/**
 * Scan and log bloko-tag elements (skills, languages).
 */
export function scanTags() {
  console.group('%c[HH-AR][DIAG] Bloko tags (.bloko-tag, [data-qa*="tag"]):', 'color:#2964FF');
  const tags = document.querySelectorAll('.bloko-tag, .bloko-tag__text, [data-qa*="tag"], [data-qa*="skill"]');
  const tagTexts = [];
  tags.forEach(tag => {
    const t = (tag.textContent || '').trim();
    if (t && t.length < 100 && !tagTexts.includes(t)) {
      tagTexts.push(t);
      console.log('  Tag:', t, '| data-qa:', tag.getAttribute('data-qa') || '(none)', '| class:', (tag.className || '').toString().substring(0, 60));
    }
  });
  console.log('  Total unique tags:', tagTexts.length);
  console.groupEnd();
}
