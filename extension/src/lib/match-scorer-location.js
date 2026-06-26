/**
 * MATCH SCORER: LOCATION (0-15)
 * ==============================
 * Location compatibility between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Scoring:
 *   Same city              -> 15/15
 *   Nearby region          -> 12/15
 *   Different known city   -> 8/15
 *   Remote matches remote  -> 12/15
 *   Office vs remote       -> 5/15
 *   Unknown on either side -> 8/15  (neutral)
 *
 * Data:
 *   Resume provides: address (string), workFormat (string)
 *   Vacancy provides: location (string), schedule (string: remote/hybrid/office/unknown)
 *
 * v1.9.72.0: new module (F7.2)
 */

import { createLogger } from './anti-hallucination.js';

const locLog = createLogger('Scorer:Location');

// ===============================================
// CITY DATABASE (top 50 Russian cities + regions)
// ===============================================

/**
 * Region groups: cities in the same group are "nearby".
 * Key = normalized city name, value = region group id.
 */
const CITY_REGIONS = {
  // Москва и МО
  'москва': 'moscow',
  'мск': 'moscow',
  'москва город': 'moscow',
  'балашиха': 'moscow',
  'люберцы': 'moscow',
  'мытищи': 'moscow',
  'химки': 'moscow',
  'красногорск': 'moscow',
  'подольск': 'moscow',
  'одинцово': 'moscow',
  'домодедово': 'moscow',
  'реутов': 'moscow',
  'королёв': 'moscow',
  'электросталь': 'moscow',
  'жуковский': 'moscow',
  'раменское': 'moscow',
  'долгопрудный': 'moscow',
  'пущино': 'moscow',
  'коломна': 'moscow',
  'сергиев посад': 'moscow',
  'подмосковье': 'moscow',
  'московская область': 'moscow',
  'мо': 'moscow',

  // Санкт-Петербург и ЛО
  'санкт-петербург': 'spb',
  'петербург': 'spb',
  'спб': 'spb',
  'питер': 'spb',
  'ленинградская область': 'spb',
  'ло': 'spb',
  'всеволожск': 'spb',
  'гатчина': 'spb',
  'выборг': 'spb',
  'пушкин': 'spb',
  'красное село': 'spb',
  'колпино': 'spb',
  'петергоф': 'spb',

  // Новосибирск и НСО
  'новосибирск': 'novosibirsk',
  'нск': 'novosibirsk',
  'бердск': 'novosibirsk',
  'академгородок': 'novosibirsk',
  'новосибирская область': 'novosibirsk',

  // Екатеринбург и Свердловская область
  'екатеринбург': 'ekaterinburg',
  'екб': 'ekaterinburg',
  'верхняя пышма': 'ekaterinburg',
  'нижний тагил': 'ekaterinburg',
  'каменск-уральский': 'ekaterinburg',
  'свердловская область': 'ekaterinburg',

  // Казань и Татарстан
  'казань': 'kazan',
  'набережные челны': 'kazan',
  'альметьевск': 'kazan',
  'татарстан': 'kazan',
  'республика татарстан': 'kazan',

  // Нижний Новгород
  'нижний новгород': 'nizhny',
  'нижний': 'nizhny',
  'нн': 'nizhny',
  'нижегородская область': 'nizhny',
  'дзержинск': 'nizhny',

  // Челябинск
  'челябинск': 'chelyabinsk',
  'магнитогорск': 'chelyabinsk',
  'миасс': 'chelyabinsk',
  'челябинская область': 'chelyabinsk',

  // Самара
  'самара': 'samara',
  'тольятти': 'samara',
  'сызрань': 'samara',
  'самарская область': 'samara',

  // Омск
  'омск': 'omsk',
  'омская область': 'omsk',

  // Ростов-на-Дону
  'ростов-на-дону': 'rostov',
  'ростов': 'rostov',
  'ростовская область': 'rostov',
  'таганрог': 'rostov',
  'волгодонск': 'rostov',
  'батайск': 'rostov',

  // Уфа
  'уфа': 'ufa',
  'стерлитамак': 'ufa',
  'башкортостан': 'ufa',

  // Красноярск
  'красноярск': 'krasnoyarsk',
  'красноярская область': 'krasnoyarsk',
  'норильск': 'krasnoyarsk',

  // Воронеж
  'воронеж': 'voronezh',
  'воронежская область': 'voronezh',

  // Пермь
  'пермь': 'perm',
  'березники': 'perm',
  'пермский край': 'perm',

  // Волгоград
  'волгоград': 'volgograd',
  'волгоградская область': 'volgograd',
  'волжский': 'volgograd',

  // Краснодар
  'краснодар': 'krasnodar',
  'сочи': 'krasnodar',
  'новороссийск': 'krasnodar',
  'краснодарский край': 'krasnodar',

  // 其他 крупные города
  'тюмень': 'tyumen',
  'тюменская область': 'tyumen',
  'иркутск': 'irkutsk',
  'барнаул': 'barnaul',
  'улан-удэ': 'ulanude',
  'владивосток': 'vladivostok',
  'хабаровск': 'khabarovsk',
  'якутск': 'yakutsk',
  'товосибирск': 'novosibirsk', // typo correction
  'н-новгород': 'nizhny',
  'н новгород': 'nizhny',
  'ек-бург': 'ekaterinburg',
};

/**
 * All known region group IDs.
 */
const REGION_IDS = new Set(Object.values(CITY_REGIONS));

// ===============================================
// CITY NAME ABBREVIATIONS
// ===============================================

const CITY_ABBREVIATIONS = {
  'мск': 'москва',
  'спб': 'санкт-петербург',
  'нск': 'новосибирск',
  'екб': 'екатеринбург',
  'нн': 'нижний новгород',
  'рн': 'ростов-на-дону',
  'н-новгород': 'нижний новгород',
  'н новгород': 'нижний новгород',
  'ек-бург': 'екатеринбург',
  'мо': 'москва',
  'ло': 'санкт-петербург',
};

// ===============================================
// NORMALIZATION
// ===============================================

/**
 * Normalize a location string for matching.
 * - Lowercase, trim
 * - Remove commas, dots, extra spaces
 * - Replace dashes with spaces for consistency
 * - Expand known abbreviations
 */
function normalizeLocation(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.toLowerCase().trim();
  // Remove common suffixes
  s = s.replace(/,?\s*(россия|рф)\s*/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Try to identify a city name from a location string.
 * Returns the normalized city name or null.
 *
 * Strategy:
 * 1. Check abbreviations map
 * 2. Try to find any CITY_REGIONS key as a substring
 * 3. Take the first "word cluster" (comma-delimited segment)
 */
function identifyCity(locationText) {
  if (!locationText) return null;
  const norm = normalizeLocation(locationText);
  if (!norm) return null;

  // Check abbreviation
  const firstWord = norm.split(/[\s,]+/)[0];
  if (CITY_ABBREVIATIONS[firstWord]) {
    return CITY_ABBREVIATIONS[firstWord];
  }

  // Try full match against city database (longest key first to avoid partial matches)
  // Skip keys shorter than 3 chars for substring matching to avoid false positives
  // (e.g. "НН" matching inside "удалеННая")
  const sortedKeys = Object.keys(CITY_REGIONS).filter(k => k.length >= 3).sort((a, b) => b.length - a.length);
  for (const cityKey of sortedKeys) {
    if (norm.includes(cityKey)) return cityKey;
  }

  // Try the first segment (before comma) as a city
  const segments = norm.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length > 0) {
    const candidate = segments[0];
    // Check if it's a known city
    if (CITY_REGIONS[candidate]) return candidate;
    // Check abbreviation
    if (CITY_ABBREVIATIONS[candidate]) return CITY_ABBREVIATIONS[candidate];
  }

  return null;
}

/**
 * Get region group for a city name.
 * @param {string|null} city -- normalized city name from identifyCity
 * @returns {string|null} -- region ID or null
 */
function getRegion(city) {
  if (!city) return null;
  return CITY_REGIONS[city] || null;
}

/**
 * Detect work format from resume/vacancy data.
 * Returns: 'remote' | 'hybrid' | 'office' | 'unknown'
 */
function detectWorkFormat(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  const lower = text.toLowerCase();
  // Explicit hybrid indicator
  if (/гибрид|hybrid/i.test(lower)) return 'hybrid';
  const hasRemote = /удал[её]нн|remote|дистанцион/.test(lower);
  const hasOffice = /[а-яё]{3,}/.test(lower.replace(/удал[её]нн|remote|дистанцион|работа|формат|можн/g, '').trim());
  if (hasRemote && hasOffice) return 'hybrid';
  if (hasRemote) return 'remote';
  if (hasOffice) return 'office';
  return 'unknown';
}

// ===============================================
// MAIN SCORER
// ===============================================

/**
 * Score location compatibility between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, reason: string }}
 */
export function scoreLocation(resume, vacancy) {
  // Extract resume location data
  const resumeAddr = resume.address || '';
  const resumeWorkFormat = resume.workFormat || '';
  const resumeFormat = detectWorkFormat(resumeWorkFormat || resumeAddr);

  // Extract vacancy location data
  const vacLocation = vacancy.location || '';
  const vacSchedule = vacancy.schedule || '';

  // Use vacancy.schedule if already parsed, otherwise detect from location text
  let vacFormat = vacSchedule;
  if (vacFormat === 'unknown' || !vacFormat) {
    vacFormat = detectWorkFormat(vacLocation);
  }

  const resumeCity = identifyCity(resumeAddr);
  const vacCity = identifyCity(vacLocation);
  const resumeRegion = getRegion(resumeCity);
  const vacRegion = getRegion(vacCity);

  locLog.info('resume: addr="' + resumeAddr + '" city=' + (resumeCity || '?') + ' region=' + (resumeRegion || '?') + ' format=' + resumeFormat);
  locLog.info('vacancy: loc="' + vacLocation + '" city=' + (vacCity || '?') + ' region=' + (vacRegion || '?') + ' schedule=' + vacFormat);

  // ---- Both remote: good match ----
  if (resumeFormat === 'remote' && vacFormat === 'remote') {
    return { score: 12, reason: 'remote-remote' };
  }

  // ---- Resume remote, vacancy office/hybrid: decent ----
  if (resumeFormat === 'remote' && (vacFormat === 'office' || vacFormat === 'hybrid')) {
    return { score: 12, reason: 'remote-can-do-office' };
  }

  // ---- Resume office, vacancy remote: slightly less ideal ----
  if ((resumeFormat === 'office' || resumeFormat === 'unknown') && vacFormat === 'remote') {
    // Resume wants office but vacancy is remote -- still ok if resume is flexible
    if (resumeFormat === 'unknown') {
      return { score: 10, reason: 'unknown-format-remote-vacancy' };
    }
    return { score: 8, reason: 'office-wants-remote' };
  }

  // ---- Resume hybrid matches anything well ----
  if (resumeFormat === 'hybrid') {
    if (vacFormat === 'hybrid') return { score: 13, reason: 'hybrid-hybrid' };
    if (vacFormat === 'office') return { score: 12, reason: 'hybrid-can-do-office' };
    if (vacFormat === 'remote') return { score: 12, reason: 'hybrid-can-do-remote' };
  }

  // ---- City-based matching (both are office or at least one unknown) ----

  // Same city
  if (resumeCity && vacCity && resumeCity === vacCity) {
    return { score: 15, reason: 'same-city' };
  }

  // Same region (nearby)
  if (resumeRegion && vacRegion && resumeRegion === vacRegion && resumeCity !== vacCity) {
    return { score: 12, reason: 'nearby-region' };
  }

  // Different known cities
  if (resumeCity && vacCity) {
    return { score: 8, reason: 'different-city' };
  }

  // One or both unknown -- neutral
  if (!resumeAddr && !vacLocation) {
    return { score: 8, reason: 'no-data' };
  }
  if (!resumeAddr) {
    return { score: 8, reason: 'no-resume-location' };
  }
  if (!vacLocation) {
    return { score: 8, reason: 'no-vacancy-location' };
  }

  // Both have text but no city identified
  return { score: 8, reason: 'unknown-city' };
}

/**
 * Exported for testing: identify a city from a location string.
 */
export { identifyCity, getRegion, detectWorkFormat, normalizeLocation };