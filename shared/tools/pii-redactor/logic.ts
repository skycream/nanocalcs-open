// 개인정보·비밀값 탐지와 자리표시 치환·복원. 모두 순수 함수이며 매핑(Vault)은 호출한 쪽 메모리에만 둔다.

import { NATIONAL_TYPES, NATIONAL_RULES, CN_MOBILE, LOCALE_IDS } from './national';
import { rrnDateOk } from './ids';

/** 어느 나라에서나 기본으로 켜는 공통 유형 */
export const COMMON_TYPES = ['EMAIL', 'PHONE', 'CARD', 'IP', 'IBAN', 'KEY'] as const;
export const PII_TYPES = [...COMMON_TYPES, ...NATIONAL_TYPES] as const;
export type PiiType = (typeof PII_TYPES)[number];

/** 로케일 페이지에서 처음 켜 둘 유형: 공통 + 그 나라 번호 (모르는 로케일은 공통만) */
export function defaultTypes(locale: string): Set<PiiType> {
  return new Set<PiiType>([...COMMON_TYPES, ...(LOCALE_IDS[locale] ?? [])]);
}

export interface Match { type: PiiType; start: number; end: number; value: string }

// 같은 구간이 겹치면 숫자가 작은 쪽이 이긴다 (하이픈 있는 주민번호 > 카드 > 맨숫자 주민번호 …)
// 체크디지트가 강한 신분번호는 카드보다 앞, 체크디지트 없는 번호(날짜·지역 코드만)는 뒤에 둔다
const PRIORITY: Record<string, number> = Object.fromEntries([
  'RRN_H', 'CNID', 'CPF', 'CNPJ', 'NIR', 'TCKN', 'MYNUMBER', 'AADHAAR', 'SNILS', 'RRN', 'CARD', 'IBAN', 'KEY', 'SSN',
  'INN', 'DNI', 'PAN', 'SAID', 'CNIC', 'MYKAD', 'NIK', 'CCCD', 'EMAIL', 'IP', 'PHONE',
].map((k, i) => [k, i]));

type Cand = { type: PiiType; key: string; start: number; end: number };

export function luhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

// 문자당 섀넌 엔트로피 (비트)
export function entropy(s: string): number {
  if (!s) return 0;
  const f = new Map<string, number>();
  for (const c of s) f.set(c, (f.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of f.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
}

const IBAN_LEN: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22,
  DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28,
  IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22,
  MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24, SI: 19,
  SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export function ibanValid(raw: string): boolean {
  const s = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const want = IBAN_LEN[s.slice(0, 2)];
  if (want !== undefined ? s.length !== want : s.length < 15 || s.length > 34) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = ch >= 'A' ? ch.charCodeAt(0) - 55 : ch.charCodeAt(0) - 48;
    rem = v > 9 ? (rem * 100 + v) % 97 : (rem * 10 + v) % 97;
  }
  return rem === 1;
}

export function rrnChecksum(d13: string): boolean {
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (d13.charCodeAt(i) - 48) * w[i];
  return (11 - (sum % 11)) % 10 === d13.charCodeAt(12) - 48;
}

function ipv4Valid(s: string): boolean {
  const p = s.split('.');
  return p.length === 4 && p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255 && (x.length === 1 || x[0] !== '0'));
}

function ipv6Valid(s: string): boolean {
  if (/[^0-9a-fA-F:]/.test(s) || s === '::' || s.includes(':::')) return false;
  const halves = s.split('::');
  if (halves.length > 2) return false;
  const groups = halves.flatMap((h) => (h === '' ? [] : h.split(':')));
  if (!groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return false;
  return halves.length === 2 ? groups.length <= 7 : groups.length === 8;
}

const SEP_PHONE = /(?<![\w+.-])(\+?\(?\d[\d ().-]{6,20}\d)(?![\w])/g;

function phoneOk(s: string): boolean {
  const digits = s.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(s)) return false; // 날짜
  if (/^\d{3}-\d{2}-\d{4}$/.test(s)) return false; // 미국 SSN 꼴은 전화가 아니다
  if (/^\d{6}[- ]\d{7}$/.test(s)) return false; // 주민번호 꼴(날짜가 틀려도 전화로 보지 않는다)
  const hasSep = /[ ().-]/.test(s);
  if (!hasSep && !s.startsWith('+')) return /^0\d{9,10}$/.test(s); // 구분자 없는 번호는 0으로 시작하는 국내 형식만
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return false; // IP 꼴
  if (/^(\d+[ -]){2,}\d+$/.test(s) && !s.startsWith('+') && !/^\(?\d{2,4}\)?[ -]/.test(s)) return false;
  return true;
}

const KEY_PATTERNS: { re: RegExp; minEnt: number; need?: RegExp }[] = [
  { re: /\bsk-(?:ant-|proj-|svcacct-|or-v1-)?[A-Za-z0-9_-]{20,}/g, minEnt: 3.2, need: /\d/ },
  { re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}\b/g, minEnt: 2.5 },
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, minEnt: 3 },
  { re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g, minEnt: 3 },
  { re: /\bglpat-[A-Za-z0-9_-]{20,}/g, minEnt: 3 },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, minEnt: 2.5 },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, minEnt: 3 },
  { re: /\b[sprk]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g, minEnt: 3 },
  { re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, minEnt: 3 },
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, minEnt: 3 },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, minEnt: 0 },
];

// api_key=..., "password": "..." 처럼 이름이 붙은 값 (값 부분만 가린다)
const ASSIGN = /\b(?:api[_-]?key|apikey|secret(?:[_-]?key)?|access[_-]?token|auth[_-]?token|token|passwd|password|pwd|client[_-]secret)["']?\s*[:=]\s*["']?([^\s"',;]{8,})/gi;
// 접두사 없는 긴 임의 문자열
const LONG_TOKEN = /(?<![\w/+=-])[A-Za-z0-9_+=-]{32,}(?![\w/+=-])/g;

export function detect(text: string, types: ReadonlySet<PiiType> = new Set(PII_TYPES)): Match[] {
  const c: Cand[] = [];
  const add = (type: PiiType, key: string, start: number, end: number) => { if (types.has(type)) c.push({ type, key, start, end }); };

  for (const m of text.matchAll(/(?<![\w.%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w-])/g)) {
    add('EMAIL', 'EMAIL', m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(/(?<![\d+-])(?:\d[ -]?){12,18}\d(?![\d-])/g)) {
    if (luhn(m[0].replace(/[ -]/g, ''))) add('CARD', 'CARD', m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(/(?<![\w.])(\d{2})(\d{2})(\d{2})([- ]?)([1-8])(\d{6})(?![\d])/g)) {
    const sep = m[4];
    const all = m[0].replace(/\D/g, '');
    if (!rrnDateOk(all)) continue;
    if (sep) add('RRN', 'RRN_H', m.index!, m.index! + m[0].length);
    else if (rrnChecksum(all)) add('RRN', 'RRN', m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(/(?<![\d-])(\d{3})-(\d{2})-(\d{4})(?![\d-])/g)) {
    const [, a, g, s] = m;
    if (a === '000' || a === '666' || a[0] === '9' || g === '00' || s === '0000') continue;
    add('SSN', 'SSN', m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(/(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?(?![A-Za-z0-9])/g)) {
    if (ibanValid(m[0])) add('IBAN', 'IBAN', m.index!, m.index! + m[0].length);
    else { // 끝의 짧은 조각이 잘못 붙은 경우를 위해 뒤에서 한 덩어리씩 줄여 본다
      let s = m[0];
      while (s.includes(' ')) { s = s.slice(0, s.lastIndexOf(' ')); if (ibanValid(s)) { add('IBAN', 'IBAN', m.index!, m.index! + s.length); break; } }
    }
  }
  for (const m of text.matchAll(/(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d]|\.\d)/g)) {
    if (ipv4Valid(m[0])) add('IP', 'IP', m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(/(?<![:\w])(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?![:\w])/g)) {
    if (ipv6Valid(m[0])) add('IP', 'IP', m.index!, m.index! + m[0].length);
  }
  for (const { type, re, ok } of NATIONAL_RULES) {
    if (!types.has(type)) continue;
    for (const m of text.matchAll(re)) if (ok(m[0])) add(type, type, m.index!, m.index! + m[0].length);
  }
  for (const m of text.matchAll(CN_MOBILE)) add('PHONE', 'PHONE', m.index!, m.index! + m[0].length);
  for (const m of text.matchAll(SEP_PHONE)) {
    if (phoneOk(m[1])) add('PHONE', 'PHONE', m.index!, m.index! + m[1].length);
  }
  for (const { re, minEnt, need } of KEY_PATTERNS) {
    for (const m of text.matchAll(re)) {
      if (entropy(m[0]) < minEnt || (need && !need.test(m[0]))) continue;
      add('KEY', 'KEY', m.index!, m.index! + m[0].length);
    }
  }
  for (const m of text.matchAll(ASSIGN)) {
    const v = m[1];
    if (entropy(v) < 2.5 || /^[a-z]+$/i.test(v) && v.length < 12) continue;
    const s = m.index! + m[0].lastIndexOf(v);
    add('KEY', 'KEY', s, s + v.length);
  }
  for (const m of text.matchAll(LONG_TOKEN)) {
    const v = m[0];
    if (/^[0-9a-fA-F]+$/.test(v)) continue; // 해시(커밋·체크섬)로 보고 제외
    if (!(/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) || entropy(v) < 4.2) continue;
    add('KEY', 'KEY', m.index!, m.index! + v.length);
  }

  // 겹침 정리: 우선순위 → 긴 것 순으로 채택
  c.sort((a, b) => PRIORITY[a.key] - PRIORITY[b.key] || (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const taken: Cand[] = [];
  for (const x of c) if (!taken.some((t) => x.start < t.end && t.start < x.end)) taken.push(x);
  taken.sort((a, b) => a.start - b.start);
  return taken.map((x) => ({ type: x.type, start: x.start, end: x.end, value: text.slice(x.start, x.end) }));
}

export interface Vault { byTag: Map<string, string>; byValue: Map<string, string>; counts: Record<string, number> }
export const newVault = (): Vault => ({ byTag: new Map(), byValue: new Map(), counts: {} });

const norm = (t: PiiType, v: string) => t + '\u0000' + (t === 'EMAIL' ? v.toLowerCase() : t === 'IBAN' || t === 'CARD' || t === 'PHONE' ? v.replace(/[\s-]/g, '') : v);

export function redact(text: string, types: ReadonlySet<PiiType> = new Set(PII_TYPES)): { output: string; matches: Match[]; vault: Vault } {
  const vault = newVault();
  const matches = detect(text, types);
  let out = '', last = 0;
  for (const m of matches) {
    const k = norm(m.type, m.value);
    let tag = vault.byValue.get(k);
    if (!tag) {
      const n = (vault.counts[m.type] = (vault.counts[m.type] ?? 0) + 1);
      tag = `[${m.type}_${n}]`;
      vault.byValue.set(k, tag);
      vault.byTag.set(tag, m.value);
    }
    out += text.slice(last, m.start) + tag;
    last = m.end;
  }
  return { output: out + text.slice(last), matches, vault };
}

// LLM 답변 안의 [EMAIL_1] 을 원래 값으로 되돌린다. 마크다운이 붙인 역슬래시(\[EMAIL_1\])도 허용한다
export function restore(text: string, vault: Vault): { output: string; restored: number; unknown: string[] } {
  let restored = 0;
  const unknown = new Set<string>();
  const output = text.replace(/\\?\[([A-Z]+_\d+)\\?\]/g, (all, id: string) => {
    const v = vault.byTag.get(`[${id}]`);
    if (v === undefined) { unknown.add(`[${id}]`); return all; }
    restored++;
    return v;
  });
  return { output, restored, unknown: [...unknown] };
}

export function summarize(matches: Match[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const m of matches) r[m.type] = (r[m.type] ?? 0) + 1;
  return r;
}
