/**
 * Strategy 4: Text-based experience parsing from raw HTML.
 *
 * Parse experience entries by finding date-range text patterns in the HTML.
 * hh.ru renders ALL experiences in the SSR HTML, but only the first N
 * have data-qa="profile-experience-company-card". The rest are in the HTML
 * but without proper data-qa wrappers.
 *
 * Strategy: find date ranges -> extract surrounding text -> build experience entries
 */
import { createLogger } from './anti-hallucination.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Parse experience entries from raw HTML using date-range text patterns.
 * @param {string} html - Raw HTML string
 * @param {number} alreadyFound - Number of entries already found via DOM parsing
 * @returns {Array} Parsed experience entries (may be empty if no improvement)
 */
export function parseExperienceFromHtmlText(html, alreadyFound) {
  // Russian month names used by hh.ru in date ranges
  const MONTHS = 'январ[ьея]|феврал[ьья]|март[ае]?|апрел[ьья]|ма[йия]|июн[ьья]|июл[ьья]|август[ае]?|сентябр[ьья]|октябр[ьья]|ноябр[ьья]|декабр[ьья]';
  const DATE_RANGE_RE = new RegExp(
    '(' + MONTHS + ')\\s*\\d{4}\\s*[\\u2013\\u2014\\-]\\s*(?:(' + MONTHS + ')\\s*\\d{4}|настоящее\\s*время|по\\s+настоящее\\s+время)',
    'gi'
  );

  // Also try numeric date patterns: "01.2020 -- настоящее время"
  const NUM_DATE_RE = /\d{2}\.\d{4}\s*[\u2013\u2014\-]\s*(?:\d{2}\.\d{4}|настоящее\s*время|по\s+настоящее\s+время)/gi;

  // Search the ENTIRE HTML for date ranges first (section boundaries may be wrong)
  const allDateRanges = [];
  let match;
  while ((match = DATE_RANGE_RE.exec(html)) !== null) {
    allDateRanges.push({ index: match.index, text: match[0] });
  }
  // Also search for numeric dates
  while ((match = NUM_DATE_RE.exec(html)) !== null) {
    allDateRanges.push({ index: match.index, text: match[0] });
  }

  fetchLog.info('Text pattern: found ' + allDateRanges.length + ' date ranges in FULL HTML');

  if (allDateRanges.length <= alreadyFound) {
    fetchLog.info('Text pattern: no more date ranges than already found (' + alreadyFound + ')');
    return [];
  }

  // Try to find the experience section boundaries for context extraction
  const expStartPatterns = [
    /data-qa="resume-list-card-experience"/i,
    /<h[23][^>]*>.*?опыт\s+работы.*?<\/h[23]>/i,
    /data-qa="resume-block-experience"/i,
    /Опыт\s+работы/i,
  ];
  const expEndPatterns = [
    /data-qa="resume-list-card-education"/i,
    /data-qa="resume-block-education"/i,
    /<h[23][^>]*>.*?образование.*?<\/h[23]>/i,
    /Образование/i,
  ];

  let expStart = -1;
  for (const pat of expStartPatterns) {
    const m = html.match(pat);
    if (m) { expStart = m.index; break; }
  }

  let expEnd = html.length;
  if (expStart !== -1) {
    for (const pat of expEndPatterns) {
      const m = html.match(pat);
      if (m && m.index > expStart && m.index < expEnd) {
        expEnd = m.index;
      }
    }
  }

  fetchLog.info('Text pattern: experience section ' + expStart + '-' + expEnd);

  // Filter date ranges that are within the experience section (or near it)
  const expDateRanges = allDateRanges.filter(dr => {
    if (expStart === -1) return true;
    return dr.index >= expStart - 200 && dr.index <= expEnd + 200;
  });

  fetchLog.info('Text pattern: ' + expDateRanges.length + ' date ranges in experience section');

  if (expDateRanges.length <= alreadyFound) {
    return [];
  }

  // For each date range, extract the surrounding text to find position and company
  const entries = [];
  for (let i = 0; i < expDateRanges.length; i++) {
    const dr = expDateRanges[i];
    const searchBase = (expStart !== -1) ? html.substring(expStart, expEnd) : html;
    const searchOffset = (expStart !== -1) ? expStart : 0;
    const relIndex = dr.index - searchOffset;

    const lookBack = searchBase.substring(Math.max(0, relIndex - 800), relIndex);
    const nextIdx = (i + 1 < expDateRanges.length) ? expDateRanges[i + 1].index - searchOffset : searchBase.length;
    const lookForward = searchBase.substring(relIndex + dr.text.length, Math.min(nextIdx, relIndex + dr.text.length + 800));

    const textBefore = stripHtmlTags(lookBack);
    const textAfter = stripHtmlTags(lookForward);

    const job = {};
    job.period = dr.text;

    // Try to find position: last meaningful text before the date
    const linesBefore = textBefore.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const line = linesBefore[j];
      if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
      if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
      if (line.length < 3 || line.length > 200) continue;
      job.position = line;
      break;
    }

    // Try to find company: 1-3 lines before the position
    if (job.position) {
      const posIdx = linesBefore.lastIndexOf(job.position);
      for (let j = posIdx - 1; j >= Math.max(0, posIdx - 4); j--) {
        const line = linesBefore[j];
        if (/^\d{4}/.test(line) || /\d+\s*(год|лет|мес)/.test(line)) continue;
        if (/^(Показать|Смотреть|Развернуть|Ещё|Все)/i.test(line)) continue;
        if (line.length < 3 || line.length > 200) continue;
        if (line === job.position) continue;
        job.company = line;
        break;
      }
    }

    // Description: text after the date range
    const linesAfter = textAfter.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    if (linesAfter.length > 0 && linesAfter[0].length > 20) {
      job.description = linesAfter[0].substring(0, 300);
    }

    if (job.position || job.company || job.period) {
      entries.push(job);
    }
  }

  return entries;
}

/**
 * Strip HTML tags from a string, replacing them with newlines.
 */
export function stripHtmlTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
