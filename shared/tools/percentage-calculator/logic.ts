// 퍼센트 계산 순수 함수 (3가지 모드)
import { clean } from '../../lib/num';

export type PctResult = { ok: true; value: number } | { ok: false; error: 'invalid' | 'zero' };
const fin = (...ns: number[]) => ns.every(Number.isFinite);

// X 의 Y% (percent=Y, base=X)
export function percentOf(percent: number, base: number): PctResult {
  if (!fin(percent, base)) return { ok: false, error: 'invalid' };
  return { ok: true, value: clean((percent * base) / 100) };
}

// X 는 Y 의 몇 % (part=X, whole=Y)
export function whatPercent(part: number, whole: number): PctResult {
  if (!fin(part, whole)) return { ok: false, error: 'invalid' };
  if (whole === 0) return { ok: false, error: 'zero' };
  return { ok: true, value: clean((part / whole) * 100) };
}

// from → to 의 증감률. 기준이 음수여도 부호가 직관과 맞도록 |from| 로 나눈다
export function percentChange(from: number, to: number): PctResult {
  if (!fin(from, to)) return { ok: false, error: 'invalid' };
  if (from === 0) return { ok: false, error: 'zero' };
  return { ok: true, value: clean(((to - from) / Math.abs(from)) * 100) };
}
