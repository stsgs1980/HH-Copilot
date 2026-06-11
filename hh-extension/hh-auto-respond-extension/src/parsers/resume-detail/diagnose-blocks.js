/**
 * DIAGNOSE: Block Structure Scanner
 * ===================================
 * Dumps the inner structure of experience and education blocks.
 */

/**
 * Dump the experience block inner structure.
 */
export function dumpExperienceBlock() {
  console.group('%c[HH-AR][DIAG] Experience block inner structure:', 'color:#ef4444;font-weight:bold');
  const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    console.log('  experienceBlock FOUND, children:', expCard.children.length);
    const expQa = expCard.querySelectorAll('[data-qa]');
    expQa.forEach((el, i) => {
      console.log('  expQa[' + i + ']:', el.getAttribute('data-qa'), '| tag:', el.tagName, '| text:', (el.textContent || '').trim().substring(0, 100));
    });
    Array.from(expCard.children).forEach((child, i) => {
      const qa = child.getAttribute('data-qa') || '(no data-qa)';
      const tag = child.tagName;
      const text = (child.textContent || '').trim().substring(0, 150);
      const subQa = Array.from(child.querySelectorAll('[data-qa]')).map(e => e.getAttribute('data-qa'));
      console.log('  child[' + i + ']:', { tag, qa, text, subDataQa: subQa });
    });
  } else {
    console.log('  experienceBlock NOT FOUND');
  }
  console.groupEnd();
}

/**
 * Dump the education block inner structure.
 */
export function dumpEducationBlock() {
  console.group('%c[HH-AR][DIAG] Education block inner structure:', 'color:#ef4444;font-weight:bold');
  const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
  if (eduCard) {
    console.log('  educationBlock FOUND, children:', eduCard.children.length);
    const eduQa = eduCard.querySelectorAll('[data-qa]');
    eduQa.forEach((el, i) => {
      console.log('  eduQa[' + i + ']:', el.getAttribute('data-qa'), '| tag:', el.tagName, '| text:', (el.textContent || '').trim().substring(0, 100));
    });
    Array.from(eduCard.children).forEach((child, i) => {
      const qa = child.getAttribute('data-qa') || '(no data-qa)';
      const tag = child.tagName;
      const text = (child.textContent || '').trim().substring(0, 150);
      const subQa = Array.from(child.querySelectorAll('[data-qa]')).map(e => e.getAttribute('data-qa'));
      console.log('  child[' + i + ']:', { tag, qa, text, subDataQa: subQa });
    });
  } else {
    console.log('  educationBlock NOT FOUND');
  }
  console.groupEnd();
}
