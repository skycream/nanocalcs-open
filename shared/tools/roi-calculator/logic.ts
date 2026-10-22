// 투자수익률(ROI) 순수 함수. 기간이 있으면 연환산(복리) 수익률도 계산한다
export type PeriodUnit = 'years' | 'months' | 'days';

export interface RoiResult {
  profit: number;         // 순이익
  roi: number;            // 총 수익률 (%)
  multiple: number;       // 최종 가치 / 투자금
  years: number | null;   // 기간(년)
  annualized: number | null; // 연환산 수익률 (%)
}
export type RoiOutcome = { ok: true; value: RoiResult } | { ok: false; error: 'invalid' | 'initial' | 'period' };

const r8 = (n: number) => Number(n.toPrecision(12));
export const YEARS_PER: Record<PeriodUnit, number> = { years: 1, months: 1 / 12, days: 1 / 365 };

// period 가 null 이면 기간 없음. 최종 가치가 0 이면 -100%, 음수는 연환산을 정의할 수 없어 null
export function roi(initial: number, final: number, period: number | null, unit: PeriodUnit = 'years'): RoiOutcome {
  if (!Number.isFinite(initial) || !Number.isFinite(final)) return { ok: false, error: 'invalid' };
  if (initial <= 0) return { ok: false, error: 'initial' };
  if (period !== null && (!Number.isFinite(period) || period <= 0)) return { ok: false, error: 'period' };
  const years = period === null ? null : period * YEARS_PER[unit];
  const multiple = final / initial;
  let annualized: number | null = null;
  if (years !== null && final >= 0) annualized = r8((multiple ** (1 / years) - 1) * 100);
  return { ok: true, value: { profit: r8(final - initial), roi: r8((multiple - 1) * 100), multiple: r8(multiple), years: years === null ? null : r8(years), annualized } };
}
