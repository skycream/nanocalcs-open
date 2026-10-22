// 날짜 더하기·빼기 순수 함수: 년·월을 먼저 옮기고(말일 보정) 그다음 주·일을 옮긴다
import { addMonths, dayNumber, type Ymd } from '../age-calculator/logic';

export interface Offset { years: number; months: number; weeks: number; days: number }
export type DateResult = { ok: true; value: Ymd } | { ok: false; error: 'invalid' | 'range' };

const MS_DAY = 86400000;

// 일 번호(1970-01-01 = 0) → Ymd
export function fromDayNumber(n: number): Ymd {
  const t = new Date(n * MS_DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function shiftDate(start: Ymd, sign: 1 | -1, off: Offset): DateResult {
  const parts = [off.years, off.months, off.weeks, off.days];
  if (!parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 100000)) return { ok: false, error: 'invalid' };
  const moved = addMonths(start, sign * (off.years * 12 + off.months));
  if (moved.y < 1 || moved.y > 9999) return { ok: false, error: 'range' };
  const out = fromDayNumber(dayNumber(moved) + sign * (off.weeks * 7 + off.days));
  if (out.y < 1 || out.y > 9999) return { ok: false, error: 'range' };
  return { ok: true, value: out };
}
