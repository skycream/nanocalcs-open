// 사이트 전역 설정: 이름을 바꿀 때는 여기 한 곳만 고친다
import { isNoindexIlPath } from './tools/qibla/indexIller';
import { isNoindexWeekPath } from './tools/pregnancy-week-by-week/weeks/indexed';
export const SITE_NAME = 'Nanocalcs';
// 광고 사용 여부: 애드센스 승인 후 true로 바꾸면 모든 광고 자리가 높이를 예약한다
export const ADS_ENABLED = false;
export const SITE_URL = 'https://nanocalcs.com';

// 지원 로케일. path는 URL 첫 세그먼트, hreflang은 검색엔진용 언어 코드(지역 변형 en-IN·pt-BR과 중국어 문자 체계만 하이픈 표기)
export const LOCALES = {
  en: { path: 'en', hreflang: 'en', htmlLang: 'en', label: 'English', short: 'EN' },
  ja: { path: 'ja', hreflang: 'ja', htmlLang: 'ja', label: '日本語', short: 'JA' },
  ko: { path: 'ko', hreflang: 'ko', htmlLang: 'ko', label: '한국어', short: 'KO' },
  'en-IN': { path: 'in', hreflang: 'en-IN', htmlLang: 'en-IN', label: 'English (India)', short: 'IN' },
  id: { path: 'id', hreflang: 'id', htmlLang: 'id', label: 'Bahasa Indonesia', short: 'ID' },
  ar: { path: 'ar', hreflang: 'ar', htmlLang: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
  tr: { path: 'tr', hreflang: 'tr', htmlLang: 'tr', label: 'Türkçe', short: 'TR' },
  ms: { path: 'ms', hreflang: 'ms', htmlLang: 'ms', label: 'Bahasa Melayu', short: 'MS' },
  es: { path: 'es', hreflang: 'es', htmlLang: 'es', label: 'Español', short: 'ES' },
  'pt-BR': { path: 'br', hreflang: 'pt-BR', htmlLang: 'pt-BR', label: 'Português (Brasil)', short: 'BR' },
  fr: { path: 'fr', hreflang: 'fr', htmlLang: 'fr', label: 'Français', short: 'FR' },
  de: { path: 'de', hreflang: 'de', htmlLang: 'de', label: 'Deutsch', short: 'DE' },
  it: { path: 'it', hreflang: 'it', htmlLang: 'it', label: 'Italiano', short: 'IT' },
  ru: { path: 'ru', hreflang: 'ru', htmlLang: 'ru', label: 'Русский', short: 'RU' },
  pl: { path: 'pl', hreflang: 'pl', htmlLang: 'pl', label: 'Polski', short: 'PL' },
  nl: { path: 'nl', hreflang: 'nl', htmlLang: 'nl', label: 'Nederlands', short: 'NL' },
  vi: { path: 'vi', hreflang: 'vi', htmlLang: 'vi', label: 'Tiếng Việt', short: 'VI' },
  th: { path: 'th', hreflang: 'th', htmlLang: 'th', label: 'ไทย', short: 'TH' },
  'zh-CN': { path: 'zh', hreflang: 'zh-Hans', htmlLang: 'zh-CN', label: '简体中文', short: '简' },
  'zh-TW': { path: 'tw', hreflang: 'zh-Hant', htmlLang: 'zh-TW', label: '繁體中文', short: '繁' },
  hi: { path: 'hi', hreflang: 'hi', htmlLang: 'hi', label: 'हिन्दी', short: 'HI' },
  bn: { path: 'bn', hreflang: 'bn', htmlLang: 'bn', label: 'বাংলা', short: 'BN' },
  ur: { path: 'ur', hreflang: 'ur', htmlLang: 'ur', label: 'اردو', short: 'UR', dir: 'rtl' },
  fa: { path: 'fa', hreflang: 'fa', htmlLang: 'fa', label: 'فارسی', short: 'FA', dir: 'rtl' },
  uk: { path: 'uk', hreflang: 'uk', htmlLang: 'uk', label: 'Українська', short: 'UK' },
  ro: { path: 'ro', hreflang: 'ro', htmlLang: 'ro', label: 'Română', short: 'RO' },
  cs: { path: 'cs', hreflang: 'cs', htmlLang: 'cs', label: 'Čeština', short: 'CS' },
  hu: { path: 'hu', hreflang: 'hu', htmlLang: 'hu', label: 'Magyar', short: 'HU' },
  el: { path: 'el', hreflang: 'el', htmlLang: 'el', label: 'Ελληνικά', short: 'EL' },
  sv: { path: 'sv', hreflang: 'sv', htmlLang: 'sv', label: 'Svenska', short: 'SV' },
  fil: { path: 'ph', hreflang: 'fil', htmlLang: 'fil', label: 'Filipino', short: 'PH' },
  he: { path: 'he', hreflang: 'he', htmlLang: 'he', label: 'עברית', short: 'HE', dir: 'rtl' },
  sw: { path: 'sw', hreflang: 'sw', htmlLang: 'sw', label: 'Kiswahili', short: 'SW' },
  af: { path: 'af', hreflang: 'af', htmlLang: 'af', label: 'Afrikaans', short: 'AF' },
  ckb: { path: 'ckb', hreflang: 'ckb', htmlLang: 'ckb', label: 'کوردی', short: 'CKB', dir: 'rtl' },
  bg: { path: 'bg', hreflang: 'bg', htmlLang: 'bg', label: 'Български', short: 'BG' },
  da: { path: 'da', hreflang: 'da', htmlLang: 'da', label: 'Dansk', short: 'DA' },
  nb: { path: 'no', hreflang: 'nb', htmlLang: 'nb', label: 'Norsk bokmål', short: 'NO' },
  ta: { path: 'ta', hreflang: 'ta', htmlLang: 'ta', label: 'தமிழ்', short: 'TA' },
  zu: { path: 'zu', hreflang: 'zu', htmlLang: 'zu', label: 'isiZulu', short: 'ZU' },
  kab: { path: 'kab', hreflang: 'kab', htmlLang: 'kab', label: 'Taqbaylit', short: 'KAB' },
  sk: { path: 'sk', hreflang: 'sk', htmlLang: 'sk', label: 'Slovenčina', short: 'SK' },
  az: { path: 'az', hreflang: 'az', htmlLang: 'az', label: 'Azərbaycanca', short: 'AZ' },
  fi: { path: 'fi', hreflang: 'fi', htmlLang: 'fi', label: 'Suomi', short: 'FI' },
  lv: { path: 'lv', hreflang: 'lv', htmlLang: 'lv', label: 'Latviešu', short: 'LV' },
  ne: { path: 'ne', hreflang: 'ne', htmlLang: 'ne', label: 'नेपाली', short: 'NE' },
  is: { path: 'is', hreflang: 'is', htmlLang: 'is', label: 'Íslenska', short: 'IS' },
  ht: { path: 'ht', hreflang: 'ht', htmlLang: 'ht', label: 'Kreyòl ayisyen', short: 'HT' },
  tpi: { path: 'tpi', hreflang: 'tpi', htmlLang: 'tpi', label: 'Tok Pisin', short: 'TPI' },
  uz: { path: 'uz', hreflang: 'uz', htmlLang: 'uz', label: 'Oʻzbekcha', short: 'UZ' },
  kk: { path: 'kk', hreflang: 'kk', htmlLang: 'kk', label: 'Қазақша', short: 'KK' },
  ky: { path: 'ky', hreflang: 'ky', htmlLang: 'ky', label: 'Кыргызча', short: 'KY' },
  be: { path: 'be', hreflang: 'be', htmlLang: 'be', label: 'Беларуская', short: 'BE' },
  am: { path: 'am', hreflang: 'am', htmlLang: 'am', label: 'አማርኛ', short: 'AM' },
  sq: { path: 'sq', hreflang: 'sq', htmlLang: 'sq', label: 'Shqip', short: 'SQ' },
  ka: { path: 'ka', hreflang: 'ka', htmlLang: 'ka', label: 'ქართული', short: 'KA' },
  sr: { path: 'sr', hreflang: 'sr', htmlLang: 'sr', label: 'Српски', short: 'SR' },
  km: { path: 'km', hreflang: 'km', htmlLang: 'km', label: 'ខ្មែរ', short: 'KM' },
  lo: { path: 'lo', hreflang: 'lo', htmlLang: 'lo', label: 'ລາວ', short: 'LO' },
  si: { path: 'si', hreflang: 'si', htmlLang: 'si', label: 'සිංහල', short: 'SI' },
  hr: { path: 'hr', hreflang: 'hr', htmlLang: 'hr', label: 'Hrvatski', short: 'HR' },
  sl: { path: 'sl', hreflang: 'sl', htmlLang: 'sl', label: 'Slovenščina', short: 'SL' },
  et: { path: 'et', hreflang: 'et', htmlLang: 'et', label: 'Eesti', short: 'ET' },
} as const;

// 글 방향: dir 이 없으면 ltr
export const dirOf = (l: Locale): 'ltr' | 'rtl' => ('dir' in LOCALES[l] ? (LOCALES[l] as { dir: 'rtl' }).dir : 'ltr');
/** 오른쪽→왼쪽 로케일 목록 (ar·ur·fa·he·ckb) */
export const isRtl = (l: Locale): boolean => dirOf(l) === 'rtl';

export type Locale = keyof typeof LOCALES;
export const LOCALE_KEYS = Object.keys(LOCALES) as Locale[];

/** 원어민 검수 전까지 검색엔진에 노출하지 않는 로케일 (noindex·사이트맵·hreflang·llms·언어 메뉴에서 제외, 페이지는 빌드 유지).
 *  ta·zu·sw·ckb 는 원어민 검수 전이라 kab 와 같이 제외한다. 검수가 끝나면 이 목록에서 뺀다 */
export const NOINDEX_LOCALES: readonly Locale[] = ['kab', 'ta', 'zu', 'sw', 'ckb', 'ht', 'tpi', 'am', 'km', 'lo', 'si'];
export const isNoindex = (l: Locale): boolean => NOINDEX_LOCALES.includes(l);
/** URL 경로(/kab/...)가 noindex 로케일에 속하는지 */
export const isNoindexPath = (pathname: string): boolean =>
  NOINDEX_LOCALES.some((l) => pathname.startsWith(`/${LOCALES[l].path}/`) || pathname === `/${LOCALES[l].path}`) || isNoindexIlPath(pathname) || isNoindexWeekPath(pathname);

/** 좁은 화면 언어 메뉴용 짧은 코드: htmlLang 앞부분 대문자. 같은 언어가 둘 이상이면(en/en-IN, zh-CN/zh-TW) 지역 코드 */
export function langCode(l: Locale): string {
  const [lang, region] = LOCALES[l].htmlLang.split('-');
  const shared = LOCALE_KEYS.filter((k) => LOCALES[k].htmlLang.split('-')[0] === lang).length > 1;
  return (shared && region ? region : lang).toUpperCase();
}

export function localeFromPath(path: string): Locale | undefined {
  return LOCALE_KEYS.find((k) => LOCALES[k].path === path);
}

// 운영 주체와 문의 메일: About·Contact·Methodology·Privacy·피드백 링크가 모두 여기를 참조한다
export const OPERATOR_NAME = 'Nanocalcs team';
export const CONTACT_EMAIL = 'contact@nanocalcs.com';
