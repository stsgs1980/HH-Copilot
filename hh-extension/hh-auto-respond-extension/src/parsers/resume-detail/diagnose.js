/**
 * PARSER: RESUME DETAIL — DOM DIAGNOSTIC (orchestrator)
 * ======================================================
 * Thin orchestrator that delegates to focused sub-modules:
 *   - diagnose-elements.js  — data-qa scanning, resume blocks, tags
 *   - diagnose-structure.js — selector checks, headings, sections
 *   - diagnose-blocks.js    — experience/education block dumps
 */

import { getResumePageType } from './index.js';
import { scanDataQaElements, scanResumeBlocks, scanTags } from './diagnose-elements.js';
import { checkSelectors, scanHeadings, scanSections } from './diagnose-structure.js';
import { dumpExperienceBlock, dumpEducationBlock } from './diagnose-blocks.js';

/**
 * Run full DOM diagnostic dump for the current resume page.
 * Delegates to focused scanners for each diagnostic area.
 */
export function diagnoseResumeDOM() {
  console.log('%c[HH-AR][DIAG] === DOM DIAGNOSTIC DUMP ===', 'color:#2964FF;font-weight:bold;font-size:14px');
  console.log('[HH-AR][DIAG] URL:', window.location.href);
  console.log('[HH-AR][DIAG] Page type:', getResumePageType());

  // 1-3. Elements: data-qa, resume blocks, tags
  scanDataQaElements();
  scanResumeBlocks();
  scanTags();

  // 4. Selector match check
  checkSelectors();

  // 5-6. Structure: headings, sections
  scanHeadings();
  scanSections();

  // 7-8. Block dumps: experience, education
  dumpExperienceBlock();
  dumpEducationBlock();

  console.log('%c[HH-AR][DIAG] === END DUMP ===', 'color:#2964FF;font-weight:bold');
  console.log('%c[HH-AR][DIAG] Скопируй ВЕСЬ вывод из консоли и отправь мне.', 'color:#ef4444;font-size:13px');
}
