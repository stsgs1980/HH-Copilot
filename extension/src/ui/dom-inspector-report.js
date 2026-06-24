/**
 * DOM Inspector -- report builders.
 * Pure functions, no DOM side-effects, easy to unit-test.
 *
 * v1.9.61.0
 */

/**
 * Compute a CSS selector path for an element.
 * Uses id if present, else walks up: tag:nth-of-type(n) > ...
 * @param {Element} el
 * @returns {string}
 */
export function buildCssPath(el) {
  if (!el || el.nodeType !== 1) return '';
  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 8) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += '#' + node.id;
      parts.unshift(part);
      break; // id is unique, stop
    }
    const cls = Array.from(node.classList || [])
      .filter(c => c && c.length < 60)
      .slice(0, 3);
    if (cls.length > 0) part += '.' + cls.join('.');
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === node.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        part += ':nth-of-type(' + idx + ')';
      }
    }
    parts.unshift(part);
    node = node.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

/**
 * Build a plain-text report from an element. Easy to paste into a chat.
 * @param {Element} el
 * @returns {string}
 */
export function buildElementReport(el) {
  if (!el || el.nodeType !== 1) return '';
  const cs = (typeof getComputedStyle === 'function') ? getComputedStyle(el) : {};
  const rect = el.getBoundingClientRect();
  const lines = [];
  lines.push('=== HH-Copilot DOM Inspector Report ===');
  lines.push('Time: ' + new Date().toISOString());
  lines.push('URL: ' + (typeof location !== 'undefined' ? location.href : '?'));
  lines.push('');
  lines.push('Tag: ' + el.tagName.toLowerCase());
  lines.push('ID: ' + (el.id || '(none)'));
  const classes = Array.from(el.classList || []);
  lines.push('Classes: ' + (classes.length ? classes.join(' ') : '(none)'));
  lines.push('');
  lines.push('CSS Path: ' + buildCssPath(el));
  lines.push('');
  lines.push('Text (truncated 400 chars):');
  const txt = (el.innerText || el.textContent || '').trim();
  lines.push(txt.length > 400 ? txt.slice(0, 400) + '...(+' + (txt.length - 400) + ' more)' : txt);
  lines.push('');
  lines.push('Geometry:');
  lines.push('  rect: ' + Math.round(rect.left) + ',' + Math.round(rect.top) + ' ' +
    Math.round(rect.width) + 'x' + Math.round(rect.height));
  lines.push('  offsetWidth: ' + el.offsetWidth + 'px');
  lines.push('  offsetHeight: ' + el.offsetHeight + 'px');
  lines.push('');
  lines.push('Computed style (key):');
  lines.push('  display: ' + (cs.display || '?'));
  lines.push('  visibility: ' + (cs.visibility || '?'));
  lines.push('  font: ' + (cs.fontFamily || '?').slice(0, 80) + ' / ' +
    (cs.fontSize || '?') + ' / ' + (cs.lineHeight || '?'));
  lines.push('  color: ' + (cs.color || '?'));
  lines.push('  background: ' + (cs.backgroundColor || '?'));
  lines.push('  padding: ' + (cs.padding || '?'));
  lines.push('  margin: ' + (cs.margin || '?'));
  lines.push('  border: ' + (cs.border || '?'));
  lines.push('');
  lines.push('Outer HTML (truncated 600 chars):');
  try {
    const html = el.outerHTML || '';
    lines.push(html.length > 600 ? html.slice(0, 600) + '...(+' + (html.length - 600) + ' more)' : html);
  } catch (e) {
    lines.push('(could not serialize: ' + (e.message || e) + ')');
  }
  lines.push('');
  lines.push('=== end report ===');
  return lines.join('\n');
}
