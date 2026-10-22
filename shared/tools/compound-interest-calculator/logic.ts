// 복리 계산: 원금 + 정기 납입. 이자 계산 주기(연~일, 연속)와 납입 주기가 달라도 되도록
// 연 환산 성장 배수 g 를 쓰고, 납입 주기 m 에 맞는 등가 배수 q = g^(1/m) 로 등비수열 합을 낸다.
export type Freq = 'annual' | 'semiannual' | 'quarterly' | 'monthly' | 'weekly' | 'daily' | 'continuous';
export type ContribFreq = 'annual' | 'semiannual' | 'quarterly' | 'monthly' | 'weekly';
export type Timing = 'end' | 'begin';

export const FREQ_N: Record<Exclude<Freq, 'continuous'>, number> = { annual: 1, semiannual: 2, quarterly: 4, monthly: 12, weekly: 52, daily: 365 };
export const CONTRIB_M: Record<ContribFreq, number> = { annual: 1, semiannual: 2, quarterly: 4, monthly: 12, weekly: 52 };
export const MAX_YEARS = 100;

export interface CompoundInput {
  principal: number; ratePct: number; freq: Freq; years: number;
  contrib: number; contribFreq: ContribFreq; timing: Timing;
  /** 연 물가상승률(%). 0 이면 실질가치는 명목가치와 같다 */
  inflationPct: number;
}
export interface YearRow { year: number; deposits: number; interest: number; balance: number; real: number }
export interface CompoundResult {
  ok: true;
  final: number; deposits: number; interest: number;
  /** 연 실효 수익률(APY, %) */
  apyPct: number;
  /** 오늘 돈으로 환산한 최종 금액 */
  real: number;
  rows: YearRow[];
}
export type CompoundError = { ok: false; field: 'principal' | 'rate' | 'years' | 'contrib' | 'inflation' | 'empty'; error: 'invalid' | 'negative' | 'range' | 'zero' };

/** 연 성장 배수: (1 + r/n)^n, 연속복리는 e^r */
export function growth(ratePct: number, freq: Freq): number {
  const r = ratePct / 100;
  return freq === 'continuous' ? Math.exp(r) : Math.pow(1 + r / FREQ_N[freq], FREQ_N[freq]);
}

/** t 년 시점의 잔액과 누적 납입액(납입은 끝난 주기만 센다: 기말은 j/m 시점, 기초는 (j-1)/m 시점) */
export function valueAt(i: CompoundInput, t: number): { balance: number; deposits: number } {
  const g = growth(i.ratePct, i.freq);
  const m = CONTRIB_M[i.contribFreq];
  const k = Math.floor(t * m + 1e-9);
  let fvC = 0;
  if (k > 0 && i.contrib > 0) {
    if (g === 1) fvC = i.contrib * k;
    else {
      // 기말 납입: FV = C · g^t · Σ_{j=1..k} q^-j = C · g^t · (1 - q^-k) / (q - 1), q = g^(1/m). 기초 납입은 q 배
      const q = Math.pow(g, 1 / m);
      fvC = (i.contrib * Math.pow(g, t) * (1 - Math.pow(q, -k))) / (q - 1);
      if (i.timing === 'begin') fvC *= q;
    }
  }
  return { balance: i.principal * Math.pow(g, t) + fvC, deposits: i.principal + i.contrib * k };
}

export function compound(i: CompoundInput): CompoundResult | CompoundError {
  if (!Number.isFinite(i.principal)) return { ok: false, field: 'principal', error: 'invalid' };
  if (i.principal < 0) return { ok: false, field: 'principal', error: 'negative' };
  if (!Number.isFinite(i.ratePct)) return { ok: false, field: 'rate', error: 'invalid' };
  if (i.ratePct < 0 || i.ratePct > 1000) return { ok: false, field: 'rate', error: 'range' };
  if (!Number.isFinite(i.years)) return { ok: false, field: 'years', error: 'invalid' };
  if (i.years <= 0 || i.years > MAX_YEARS) return { ok: false, field: 'years', error: 'range' };
  if (!Number.isFinite(i.contrib)) return { ok: false, field: 'contrib', error: 'invalid' };
  if (i.contrib < 0) return { ok: false, field: 'contrib', error: 'negative' };
  if (!Number.isFinite(i.inflationPct)) return { ok: false, field: 'inflation', error: 'invalid' };
  if (i.inflationPct < 0 || i.inflationPct > 1000) return { ok: false, field: 'inflation', error: 'range' };
  if (i.principal === 0 && i.contrib === 0) return { ok: false, field: 'empty', error: 'zero' };

  const infl = 1 + i.inflationPct / 100;
  const rows: YearRow[] = [];
  for (let y = 1; y <= Math.ceil(i.years - 1e-9); y++) {
    const t = Math.min(y, i.years);
    const v = valueAt(i, t);
    rows.push({ year: y, deposits: v.deposits, interest: v.balance - v.deposits, balance: v.balance, real: v.balance / Math.pow(infl, t) });
  }
  const last = rows[rows.length - 1];
  return { ok: true, final: last.balance, deposits: last.deposits, interest: last.interest, apyPct: (growth(i.ratePct, i.freq) - 1) * 100, real: last.real, rows };
}
