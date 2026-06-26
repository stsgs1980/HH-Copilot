/**
 * LOCATION CITY DATA
 * ==================
 * City database and abbreviation map for location scoring.
 * Extracted from match-scorer-location.js for anti-monolith compliance.
 *
 * v1.9.72.0: F7.2
 */

/**
 * Region groups: cities in the same group are "nearby".
 * Key = normalized city name, value = region group id.
 */
export const CITY_REGIONS = {
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

  // Другие крупные города
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
export const REGION_IDS = new Set(Object.values(CITY_REGIONS));

/**
 * City name abbreviations for expansion.
 */
export const CITY_ABBREVIATIONS = {
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