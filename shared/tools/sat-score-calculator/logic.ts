// Digital SAT 점수 범위 추정: Bluebook 연습시험의 종이(선형) 버전 공식 환산표로 원점수를 척도 점수 범위로 바꾼다.
// 실제 시험은 적응형이라 같은 정답 수라도 2모듈 난도에 따라 점수가 달라지므로 결과는 범위(하한~상한)다.
import { CONVERSION } from './tables';
import { PCT_TOTAL, PCT_RW, PCT_MATH } from './percentiles';

export const LAST_UPDATED = '2026-10-21';
export const TEST_IDS = Object.keys(CONVERSION).sort((a, b) => Number(a) - Number(b));
export const LATEST_TEST = TEST_IDS[TEST_IDS.length - 1];
/** 종이 버전 모듈당 문항 수: 읽기·쓰기 33, 수학 27 */
export const RW_MODULE = 33;
export const MATH_MODULE = 27;

export interface Range { lo: number; hi: number }
export interface SatResult { rwRaw: number; mathRaw: number; rw: Range; math: Range; total: Range; pct: { rw: [string, string]; math: [string, string]; total: [string, string] } }
export type SatError = 'test' | 'rw' | 'math';

const decode = (s: string): Range[] => s.split(' ').map((p) => { const [a, b] = p.split('-').map(Number); return { lo: a * 10, hi: b * 10 }; });
const TABLES: Record<string, { rw: Range[]; m: Range[] }> = Object.fromEntries(
  Object.entries(CONVERSION).map(([k, v]) => [k, { rw: decode(v.rw), m: decode(v.m) }]),
);
export const tableOf = (test: string) => TABLES[test];

const pctList = (s: string) => s.split(' ');
const P_TOTAL = pctList(PCT_TOTAL), P_RW = pctList(PCT_RW), P_MATH = pctList(PCT_MATH);

/** 10점 단위 점수의 User Group 백분위("1-", "99+" 포함). 범위 밖이면 null */
export function percentile(kind: 'total' | 'rw' | 'math', score: number): string | null {
  const [list, base] = kind === 'total' ? [P_TOTAL, 400] : [kind === 'rw' ? P_RW : P_MATH, 200];
  if (!Number.isInteger(score) || score % 10 !== 0) return null;
  return list[(score - base) / 10] ?? null;
}

const okCount = (v: number, max: number) => Number.isInteger(v) && v >= 0 && v <= max;

export function satScore(test: string, rw1: number, rw2: number, m1: number, m2: number): { ok: true; value: SatResult } | { ok: false; error: SatError } {
  const t = TABLES[test];
  if (!t) return { ok: false, error: 'test' };
  if (!okCount(rw1, RW_MODULE) || !okCount(rw2, RW_MODULE)) return { ok: false, error: 'rw' };
  if (!okCount(m1, MATH_MODULE) || !okCount(m2, MATH_MODULE)) return { ok: false, error: 'math' };
  const rwRaw = rw1 + rw2, mathRaw = m1 + m2;
  const rw = t.rw[rwRaw], math = t.m[mathRaw];
  const total = { lo: rw.lo + math.lo, hi: rw.hi + math.hi };
  const p = (k: 'total' | 'rw' | 'math', r: Range): [string, string] => [percentile(k, r.lo)!, percentile(k, r.hi)!];
  return { ok: true, value: { rwRaw, mathRaw, rw, math, total, pct: { rw: p('rw', rw), math: p('math', math), total: p('total', total) } } };
}
