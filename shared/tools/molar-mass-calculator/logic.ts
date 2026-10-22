// 몰 질량: 화학식 파싱(괄호·대괄호·중괄호 중첩, 수화물 ·/*/. 표기, 전하 표기 무시) → 원소별 개수·질량·조성 %
// 원자량은 data.ts (IUPAC CIAAW 표준 원자량, 범위값 원소는 관례값). 동위원소 표기(¹³C, D)는 지원하지 않는다.
import { ELEMENTS } from './data';

export type ParseError = 'empty' | 'char' | 'element' | 'paren' | 'long';
export type Counts = Record<string, number>;
export type ParseResult = { ok: true; counts: Counts; order: string[] } | { ok: false; error: ParseError; at?: string };

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const OPEN = '([{', CLOSE = ')]}';
export const MAX_LEN = 120;

/** 아래첨자 숫자를 보통 숫자로, 전하 표기(^2-, 2+ 뒤 공백, ⁺⁻, 끝의 +/-)를 지운다 */
export function normalize(s: string): string {
  let t = s.trim().replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)));
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/u, '');                 // 위첨자 전하 (SO₄²⁻)
  t = t.replace(/\^.*$/, '');                       // ^2- 같은 캐럿 전하
  t = t.replace(/\s+\d*[+-]$/, '');                 // 'SO4 2-'
  t = t.replace(/[+-]+$/, '');                      // 'NH4+', 'Cl-'
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP.indexOf(c)));
  return t.replace(/\s+/g, '');
}

function add(into: Counts, from: Counts, k: number) {
  for (const [e, n] of Object.entries(from)) into[e] = (into[e] ?? 0) + n * k;
}

/** 수화물 구분자(· • ⋅ * 그리고 숫자·대문자 앞의 .)로 나눈 뒤 각 부분을 파싱해 합친다 */
export function parseFormula(input: string): ParseResult {
  const s = normalize(input);
  if (!s) return { ok: false, error: 'empty' };
  if (s.length > MAX_LEN) return { ok: false, error: 'long' };
  const parts = s.split(/[·•⋅*]|\.(?=[\dA-Z(\[{])/);
  const total: Counts = {};
  const order: string[] = [];
  for (const raw of parts) {
    if (!raw) return { ok: false, error: 'char', at: '·' };
    const m = /^(\d+(?:\.\d+)?)?(.*)$/.exec(raw)!;
    const k = m[1] ? Number(m[1]) : 1;
    const r = parseGroup(m[2]);
    if (!r.ok) return r;
    for (const e of r.order) if (!order.includes(e)) order.push(e);
    add(total, r.counts, k);
  }
  return { ok: true, counts: total, order };
}

function parseGroup(s: string): ParseResult {
  if (!s) return { ok: false, error: 'empty' };
  const stack: Counts[] = [{}];
  const opens: string[] = [];
  const order: string[] = [];
  let i = 0;
  const readNum = (): number => {
    const m = /^\d+/.exec(s.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };
  while (i < s.length) {
    const c = s[i];
    if (OPEN.includes(c)) { stack.push({}); opens.push(c); i++; continue; }
    if (CLOSE.includes(c)) {
      const o = opens.pop();
      if (o === undefined || OPEN.indexOf(o) !== CLOSE.indexOf(c)) return { ok: false, error: 'paren' };
      i++;
      const inner = stack.pop()!;
      if (!Object.keys(inner).length) return { ok: false, error: 'paren' };
      add(stack[stack.length - 1], inner, readNum());
      continue;
    }
    if (/[A-Z]/.test(c)) {
      const sym = /^[A-Z][a-z]?/.exec(s.slice(i))![0];
      // 대소문자로 기호를 가른다: 'Co' 는 코발트, 'CO' 는 C + O. 없는 기호(예: 'Xy')는 오류
      const pick = ELEMENTS[sym] ? sym : null;
      if (!pick) return { ok: false, error: 'element', at: sym };
      i += pick.length;
      const n = readNum();
      if (!order.includes(pick)) order.push(pick);
      const top = stack[stack.length - 1];
      top[pick] = (top[pick] ?? 0) + n;
      continue;
    }
    return { ok: false, error: 'char', at: c };
  }
  if (opens.length) return { ok: false, error: 'paren' };
  return { ok: true, counts: stack[0], order };
}

export interface Row { sym: string; count: number; w: number; mass: number; pct: number; stable: boolean }
export interface MolarResult { molar: number; rows: Row[] }

/** 원소 순서는 화학식에 처음 나온 순서 */
export function molarMass(counts: Counts, order: string[]): MolarResult {
  const rows = order.map((sym) => {
    const el = ELEMENTS[sym];
    const count = counts[sym];
    return { sym, count, w: el.w, mass: el.w * count, pct: 0, stable: el.stable !== false };
  });
  const molar = rows.reduce((a, r) => a + r.mass, 0);
  for (const r of rows) r.pct = (r.mass / molar) * 100;
  return { molar, rows };
}

/** 몰 ↔ 그램 */
export const gramsToMoles = (g: number, molar: number) => g / molar;
export const molesToGrams = (mol: number, molar: number) => mol * molar;

/** 화면용: 화학식 숫자를 아래첨자로 (계수·수화물 앞 숫자는 그대로) */
export function prettyFormula(input: string): string {
  const s = normalize(input).replace(/\*/g, '·').replace(/\.(?=[\dA-Z(\[{])/g, '·');
  return s.replace(/([A-Za-z)\]}])(\d+)/g, (_, a: string, d: string) => a + d.replace(/\d/g, (x) => SUB[+x]));
}
