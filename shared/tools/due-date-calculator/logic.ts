// 출산 예정일: Naegele 규칙(마지막 생리 시작일 + 280일), 주기 28일 기준 보정
import { addDays, diffDays } from '../../lib/ymd';

export const PREGNANCY_DAYS = 280; // 40주
export const BASE_CYCLE = 28;
export const CYCLE_RANGE = [21, 45] as const;

export interface DueInput { lmp: number; cycle: number; today: number }
export type Trimester = 1 | 2 | 3;
export type DueResult =
  | {
      ok: true; due: number; conception: number; weeks: number; days: number; gaDays: number;
      trimester: Trimester | null; // 임신 기간 밖(음수 또는 42주 초과)이면 null
      daysLeft: number; firstTrimesterEnd: number; secondTrimesterEnd: number;
    }
  | { ok: false; error: 'cycle' | 'date' };

/** 주기 보정일: 28일보다 길면 배란이 늦으므로 그만큼 뒤로 */
export const cycleShift = (cycle: number) => cycle - BASE_CYCLE;

export function dueDate(i: DueInput): DueResult {
  if (!Number.isFinite(i.lmp) || !Number.isFinite(i.today)) return { ok: false, error: 'date' };
  if (!Number.isInteger(i.cycle) || i.cycle < CYCLE_RANGE[0] || i.cycle > CYCLE_RANGE[1]) return { ok: false, error: 'cycle' };
  const shift = cycleShift(i.cycle);
  const due = addDays(i.lmp, PREGNANCY_DAYS + shift);
  const gaDays = diffDays(i.lmp, i.today) - shift;
  const inRange = gaDays >= 0 && gaDays <= 42 * 7;
  const trimester: Trimester | null = !inRange ? null : gaDays < 14 * 7 ? 1 : gaDays < 28 * 7 ? 2 : 3;
  return {
    ok: true, due, conception: addDays(i.lmp, 14 + shift),
    weeks: Math.floor(gaDays / 7), days: ((gaDays % 7) + 7) % 7, gaDays, trimester,
    daysLeft: diffDays(i.today, due),
    firstTrimesterEnd: addDays(i.lmp, 14 * 7 - 1 + shift), secondTrimesterEnd: addDays(i.lmp, 28 * 7 - 1 + shift),
  };
}

// 예정일 계산 방식: 마지막 생리일 / 수정일 / 체외수정(3일·5일 배아 이식일) / 초음파(검사일 + 그때 잰 주수)
// 모두 '28일 주기 기준 마지막 생리 시작일'로 환산한 뒤 dueDate 에 넘긴다. 근거는 ACOG Committee Opinion 700.
export type Method = 'lmp' | 'conception' | 'ivf3' | 'ivf5' | 'us';
export const METHODS: Method[] = ['lmp', 'conception', 'ivf3', 'ivf5', 'us'];
export const CONCEPTION_DAY = 14; // 28일 주기에서 수정은 생리 시작 14일 뒤
export const US_WEEKS = [4, 42] as const; // 초음파 주수 입력 허용 범위

export interface MethodInput { method: Method; date: number; cycle: number; today: number; usWeeks?: number; usDays?: number }
export type MethodResult = DueResult | { ok: false; error: 'ga' };

/** 방식별 마지막 생리 시작일 환산. 이식일 기준: 3일 배아 예정일 = 이식일 + 263일, 5일 배아 = + 261일 (ACOG CO700) */
export function dueByMethod(i: MethodInput): MethodResult {
  if (!Number.isFinite(i.date) || !Number.isFinite(i.today)) return { ok: false, error: 'date' };
  if (i.method === 'lmp') return dueDate({ lmp: i.date, cycle: i.cycle, today: i.today });
  let lmp: number;
  if (i.method === 'conception') lmp = addDays(i.date, -CONCEPTION_DAY);
  else if (i.method === 'ivf3' || i.method === 'ivf5') lmp = addDays(i.date, -CONCEPTION_DAY - (i.method === 'ivf3' ? 3 : 5));
  else {
    const w = i.usWeeks, d = i.usDays ?? 0;
    if (w === undefined || !Number.isInteger(w) || w < US_WEEKS[0] || w > US_WEEKS[1] || !Number.isInteger(d) || d < 0 || d > 6) return { ok: false, error: 'ga' };
    lmp = addDays(i.date, -(w * 7 + d));
  }
  return dueDate({ lmp, cycle: BASE_CYCLE, today: i.today });
}
