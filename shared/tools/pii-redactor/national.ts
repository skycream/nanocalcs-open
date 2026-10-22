// 나라별 신분번호 탐지 규칙. 정규식으로 후보를 찾고 ids.ts 검증기로 거른다.
import {
  myNumberValid, cnIdValid, aadhaarValid, panValid, tcknValid, cpfValid, cnpjValid, nikValid,
  snilsValid, innValid, dniValid, nirValid, cnicValid, mykadValid, saIdValid, cccdValid,
} from './ids';

export const NATIONAL_TYPES = [
  'RRN', 'SSN', 'MYNUMBER', 'CNID', 'AADHAAR', 'PAN', 'TCKN', 'CPF', 'CNPJ', 'NIK',
  'SNILS', 'INN', 'DNI', 'NIR', 'CNIC', 'MYKAD', 'SAID', 'CCCD',
] as const;
export type NationalType = (typeof NATIONAL_TYPES)[number];

/** 번호 종류 → 발급 국가(ISO 3166 두 글자). 화면에서 나라별로 묶을 때 쓴다 */
export const NATIONAL_COUNTRY: Record<NationalType, string> = {
  RRN: 'KR', SSN: 'US', MYNUMBER: 'JP', CNID: 'CN', AADHAAR: 'IN', PAN: 'IN', TCKN: 'TR', CPF: 'BR', CNPJ: 'BR',
  NIK: 'ID', SNILS: 'RU', INN: 'RU', DNI: 'ES', NIR: 'FR', CNIC: 'PK', MYKAD: 'MY', SAID: 'SA', CCCD: 'VN',
};

/** 고유명사라 번역하지 않는 기본 표기. 로케일 labels 에 같은 키가 있으면 그쪽을 쓴다 */
export const NATIONAL_NAME: Record<NationalType, string> = {
  RRN: 'KR RRN', SSN: 'US SSN', MYNUMBER: 'JP My Number', CNID: 'CN ID', AADHAAR: 'IN Aadhaar', PAN: 'IN PAN',
  TCKN: 'TR T.C. Kimlik', CPF: 'BR CPF', CNPJ: 'BR CNPJ', NIK: 'ID NIK', SNILS: 'RU SNILS', INN: 'RU INN',
  DNI: 'ES DNI/NIE', NIR: 'FR NIR', CNIC: 'PK CNIC', MYKAD: 'MY MyKad', SAID: 'SA ID/Iqama', CCCD: 'VN CCCD',
};

type Rule = { type: NationalType; re: RegExp; ok: (s: string) => boolean };
const digits = (s: string) => s.replace(/\D/g, '');
const alnum = (s: string) => s.replace(/[^0-9A-Za-z]/g, '');

// 앞뒤가 숫자·글자이거나 구분자 너머로 숫자가 이어지면 후보가 아니다 (카드·IBAN 같은 긴 숫자열의 일부를 자르지 않도록)
const L = '(?<![0-9A-Za-z./+-]|\\d[ ./-])';
const R = '(?![0-9A-Za-z]|[ ./-]\\d|[./-][A-Za-z])';
const rx = (body: string, flags = 'g') => new RegExp(L + '(?:' + body + ')' + R, flags);

// RRN·SSN 은 logic.ts 의 기존 규칙이 맡는다
export const NATIONAL_RULES: Rule[] = [
  { type: 'MYNUMBER', re: rx('\\d{4}([ -]?)\\d{4}\\1\\d{4}'), ok: (s) => myNumberValid(digits(s)) },
  { type: 'CNID', re: rx('\\d{6} ?\\d{8} ?\\d{3}[\\dXx]'), ok: (s) => cnIdValid(alnum(s)) },
  { type: 'AADHAAR', re: rx('[2-9]\\d{3}([ -]?)\\d{4}\\1\\d{4}'), ok: (s) => aadhaarValid(digits(s)) },
  { type: 'PAN', re: rx('[A-Z]{5}\\d{4}[A-Z]'), ok: panValid },
  { type: 'TCKN', re: rx('[1-9]\\d{10}'), ok: tcknValid },
  { type: 'CPF', re: rx('\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}|\\d{11}'), ok: (s) => cpfValid(digits(s)) },
  { type: 'CNPJ', re: rx('\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}|\\d{14}'), ok: (s) => cnpjValid(digits(s)) },
  { type: 'NIK', re: rx('\\d{16}'), ok: nikValid },
  { type: 'SNILS', re: rx('\\d{3}-\\d{3}-\\d{3}[ -]\\d{2}|\\d{11}'), ok: (s) => snilsValid(digits(s)) },
  { type: 'INN', re: rx('\\d{12}|\\d{10}'), ok: innValid },
  { type: 'DNI', re: rx('[XYZxyz]-?\\d{7}-?[A-Za-z]|\\d{8}-?[A-Za-z]'), ok: (s) => dniValid(alnum(s)) },
  { type: 'NIR', re: rx('[1-478] ?\\d{2} ?\\d{2} ?(?:\\d{2}|2[ABab]) ?\\d{3} ?\\d{3} ?\\d{2}'), ok: (s) => nirValid(alnum(s)) },
  { type: 'CNIC', re: rx('\\d{5}-\\d{7}-\\d'), ok: (s) => cnicValid(digits(s)) },
  { type: 'MYKAD', re: rx('\\d{6}-\\d{2}-\\d{4}|\\d{12}'), ok: (s) => mykadValid(digits(s)) },
  { type: 'SAID', re: rx('[12]\\d{9}'), ok: saIdValid },
  { type: 'CCCD', re: rx('\\d{12}'), ok: cccdValid },
];

// 중국 휴대폰(1[3-9]로 시작하는 11자리, +86 선택). 일반 전화 규칙은 구분자 없는 11자리를 0 시작만 받아서 따로 둔다
export const CN_MOBILE = /(?<![\d+])(?:\+?86[ -]?)?1[3-9]\d(?:[ -]?\d{4}){2}(?!\d)/g;

/** 로케일별 기본으로 켜는 신분번호 (공통 유형은 항상 켠다) */
export const LOCALE_IDS: Partial<Record<string, NationalType[]>> = {
  en: ['SSN'], ko: ['RRN'], ja: ['MYNUMBER'], 'zh-CN': ['CNID'], hi: ['AADHAAR', 'PAN'], 'en-IN': ['AADHAAR', 'PAN'],
  tr: ['TCKN'], 'pt-BR': ['CPF', 'CNPJ'], id: ['NIK'], ru: ['SNILS', 'INN'], es: ['DNI'], fr: ['NIR'],
  ur: ['CNIC'], ms: ['MYKAD'], ar: ['SAID'], vi: ['CCCD'], de: [],
};
