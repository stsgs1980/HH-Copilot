/**
 * MATCH SCORER: TITLE (0-30)
 * ============================
 * Title similarity between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Strategies:
 *   1. Exact match -> 30/30
 *   2. Keyword overlap (tokenized) -> up to 25/30
 *   3. Stem overlap (Russian word roots, 4-char prefix) -> adds to keyword overlap
 *   4. Abbreviation/synonym bonus -> up to 5/30
 *
 * v1.9.23.0: extracted from match-scorer.js
 * v1.9.73.0: F7.3 -- Russian stem matching + expanded abbreviation map (50+)
 */

/**
 * Score title similarity between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, similarity: number }}
 */
export function scoreTitle(resume, vacancy) {
  const resumeTitle = (resume.title || '').toLowerCase().trim();
  const vacancyTitle = (vacancy.title || '').toLowerCase().trim();

  if (!resumeTitle || !vacancyTitle) {
    return { score: 0, similarity: 0 };
  }

  // Strategy 1: exact match
  if (resumeTitle === vacancyTitle) {
    return { score: 30, similarity: 1.0 };
  }

  // Strategy 2+3: keyword overlap + stem overlap
  const resumeWords = tokenize(resumeTitle);
  const vacancyWords = tokenize(vacancyTitle);

  if (vacancyWords.length === 0) {
    return { score: 0, similarity: 0 };
  }

  let overlapCount = 0;
  for (const w of vacancyWords) {
    if (resumeWords.has(w)) {
      overlapCount++;
    } else {
      // v1.9.73.0: Stem fallback -- check if any resume word shares a 4-char stem
      if (stemMatchAny(w, resumeWords)) {
        overlapCount += 0.7; // stem match counts as 70% of exact match
      }
    }
  }

  const similarity = Math.min(1, overlapCount / vacancyWords.size);

  // Strategy 4: check for common professional abbreviations/patterns
  const bonus = titleBonus(resumeTitle, vacancyTitle);

  const rawScore = (similarity * 25) + bonus;
  const score = Math.min(30, Math.round(rawScore));

  return { score, similarity: Math.round(similarity * 100) / 100 };
}

// ===============================================
// ABBREVIATION MAP (50+ entries)
// ===============================================

/**
 * Professional abbreviation/synonym mappings.
 * Each entry: abbreviation -> canonical form(s) it maps to.
 * When one title has the abbreviation and the other has any canonical form,
 * a +5 bonus is awarded (capped at one bonus total).
 *
 * Categories: IT, Sales, Marketing, HR, Finance, General
 */
const ABBR_MAP = [
  // -- IT / Development --
  { a: 'роп', f: ['руководитель отдела продаж'] },
  { a: 'программист', f: ['разработчик'] },
  { a: 'devops', f: ['девопс', 'инженер автоматизации', 'сисадмин'] },
  { a: 'frontend', f: ['фронтенд', 'front-end', 'front end', 'веб-разработчик'] },
  { a: 'фронтенд', f: ['frontend', 'front-end', 'front end', 'веб-разработчик'] },
  { a: 'backend', f: ['бэкенд', 'back-end', 'back end', 'серверный разработчик'] },
  { a: 'бэкенд', f: ['backend', 'back-end', 'back end', 'серверный разработчик'] },
  { a: 'fullstack', f: ['фулстек', 'full-stack', 'full stack', 'программист полного цикла'] },
  { a: 'фулстек', f: ['fullstack', 'full-stack', 'full stack', 'программист полного цикла'] },
  { a: 'c#', f: ['csharp', 'си шарп'] },
  { a: '.net', f: ['dotnet', 'дотнет'] },
  { a: 'qa', f: ['quality assurance', 'тестировщик', 'тестировщик по'] },
  { a: 'сисадмин', f: ['системный администратор', 'администратор серверов'] },
  { a: 'android', f: ['андроид'] },
  { a: 'ios', f: ['айос', 'айфоне', 'iphone'] },
  { a: '1с', f: ['1с:предприятие', '1с-битрикс'] },
  { a: 'ml', f: ['machine learning', 'машинное обучение'] },
  { a: 'data scientist', f: ['дата саентист', 'исследователь данных'] },
  { a: 'tech lead', f: ['техлид', 'технический лид', 'ведущий разработчик'] },
  { a: 'техлид', f: ['tech lead', 'технический лид', 'ведущий разработчик'] },
  { a: 'team lead', f: ['тимлид', 'руководитель группы разработки'] },
  { a: 'тимлид', f: ['team lead', 'руководитель группы разработки'] },
  { a: 'cto', f: ['технический директор'] },
  { a: 'pm', f: ['project manager', 'проджект менеджер', 'менеджер проектов'] },
  { a: 'sre', f: ['site reliability engineer', 'инженер надежности'] },
  { a: 'dba', f: ['администратор баз данных'] },

  // -- Sales --
  { a: 'менеджер по продажам', f: ['торговый представитель', 'агент по продажам', 'sales manager'] },
  { a: 'sales manager', f: ['менеджер по продажам'] },
  { a: 'b2b', f: ['b2b продажи'] },
  { a: 'kAM', f: ['key account manager', 'менеджер по ключевым клиентам'] },

  // -- Marketing --
  { a: 'smm', f: ['менеджер по соцсетям', 'специалист по соцсетям', 'социальные сети'] },
  { a: 'seo', f: ['поисковая оптимизация', 'специалист по сео'] },
  { a: 'ppc', f: ['контекстная реклама', 'специалист по рекламе'] },
  { a: 'prm', f: ['pr менеджер', 'менеджер по связям с общественностью'] },
  { a: 'content manager', f: ['контент-менеджер', 'контент менеджер', 'менеджер по контенту'] },
  { a: 'digital', f: ['диджитал', 'цифровой маркетолог'] },
  { a: 'growth hacker', f: ['гроус хакер', 'специалист по росту'] },
  { a: 'targetolog', f: ['таргетолог', 'специалист по таргетированной рекламе'] },
  { a: 'copywriter', f: ['копирайтер', 'копирайтер'] },

  // -- HR --
  { a: 'hr', f: ['кадровик', 'специалист по персоналу', 'hr специалист'] },
  { a: 'hrbp', f: ['hr бизнес-партнер', 'бизнес-партнер по персоналу'] },
  { a: 'recruiter', f: ['рекрутер', 'специалист по подбору персонала'] },
  { a: 'hr-директор', f: ['директор по персоналу', 'hr director'] },

  // -- Finance --
  { a: 'cfo', f: ['финансовый директор'] },
  { a: '会计师', f: ['бухгалтер'] },
  { a: 'аудитор', f: ['аудитор'] },
  { a: 'analyst', f: ['аналитик'] },

  // -- General / Admin --
  { a: 'assistant', f: ['ассистент', 'помощник'] },
  { a: 'a/pm', f: ['помощник менеджера проекта'] },
  { a: 'ceo', f: ['генеральный директор'] },
  { a: 'coo', f: ['операционный директор'] },
  { a: 'cmo', f: ['директор по маркетингу'] },
  { a: 'vp', f: ['вице-президент'] },
  { a: 'head of', f: ['руководитель направления', 'глава'] },
  { a: 'lead', f: ['ведущий', 'лидер'] },
  { a: 'senior', f: ['старший', 'сеньор'] },
  { a: 'junior', f: ['младший', 'юниор'] },
  { a: 'middle', f: ['мидл', 'промежуточный'] },
  { a: 'стажер', f: ['стажёр', 'intern', 'практикант'] },
  { a: 'intern', f: ['стажер', 'стажёр', 'практикант'] },
];

// ===============================================
// HELPERS
// ===============================================

/** Minimum word length for stem comparison. */
const STEM_MIN_LEN = 4;

/** Number of leading characters for crude Russian stem. */
const STEM_LEN = 5;

/**
 * Crude Russian stem: first STEM_LEN characters.
 * Good for Russian job title inflection:
 *   "разработчик" -> "разра", "разработчику" -> "разра" (match)
 *   "продаж" -> "продаж", "продажам" -> "продаж" (match -- but only if word >= STEM_MIN_LEN)
 */
function crudeStem(word) {
  return word.length >= STEM_MIN_LEN ? word.substring(0, STEM_LEN) : word;
}

/**
 * Build stem map for a word set: stem -> [words with that stem].
 */
function buildStemMap(words) {
  const map = new Map();
  for (const w of words) {
    const s = crudeStem(w);
    if (s.length < STEM_MIN_LEN) continue; // too short to stem
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(w);
  }
  return map;
}

/**
 * Check if a word shares a stem with any word in the set.
 */
function stemMatchAny(word, wordSet) {
  if (word.length < STEM_MIN_LEN) return false;
  const stem = crudeStem(word);
  for (const other of wordSet) {
    if (other === word) continue;
    if (other.length < STEM_MIN_LEN) continue;
    if (crudeStem(other) === stem) return true;
  }
  return false;
}

/**
 * Bonus points for common professional abbreviations/patterns.
 * v1.9.73.0: Expanded from 10 to 50+ entries.
 * Capped at one +5 bonus (best match wins).
 */
function titleBonus(resumeTitle, vacancyTitle) {
  for (const entry of ABBR_MAP) {
    const abbr = entry.a.toLowerCase();
    const resumeHas = resumeTitle.includes(abbr);
    const vacancyHas = vacancyTitle.includes(abbr);
    if (resumeHas && vacancyHas) continue; // both have same form, already counted in overlap

    // Check if one has abbreviation and other has a canonical form
    const resumeHasFull = resumeHas || entry.f.some(f => resumeTitle.includes(f.toLowerCase()));
    const vacancyHasFull = vacancyHas || entry.f.some(f => vacancyTitle.includes(f.toLowerCase()));

    if (resumeHasFull && vacancyHasFull) {
      // One has abbr, other has full (or both have different forms)
      if (!resumeHas || !vacancyHas || entry.f.length > 0) {
        return 5;
      }
    }
  }

  return 0;
}

/** Tokenize a title into a set of significant words. */
function tokenize(text) {
  const stopWords = new Set([
    'в', 'на', 'и', 'с', 'от', 'до', 'за', 'по', 'из', 'к', 'о', 'не', 'но',
    'или', 'для', 'как', 'при', 'без', 'the', 'a', 'an', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'and', 'or', 'from', 'by',
  ]);
  const words = new Set();
  text.split(/[-\s\u2013\u2014/,|]+/).forEach(w => {
    const clean = w.replace(/[^a-zа-яё0-9#+.]/g, '').trim();
    if (clean.length >= 2 && !stopWords.has(clean)) words.add(clean);
  });
  return words;
}

// Exported for testing
export { tokenize, crudeStem, stemMatchAny, ABBR_MAP };