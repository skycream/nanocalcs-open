// 대출 상환 계산: 원리금균등(annuity), 원금균등(principal), 만기일시(bullet). 월 단위, 연 명목금리 / 12
export type LoanType = 'annuity' | 'principal' | 'bullet';
export const MAX_MONTHS = 1200;

export interface LoanInput { principal: number; ratePct: number; months: number; type: LoanType }
export interface LoanRow { month: number; payment: number; principal: number; interest: number; balance: number }
export interface LoanResult {
  ok: true;
  first: number;          // 첫 달 상환액
  last: number;           // 마지막 달 상환액
  totalInterest: number;
  totalPaid: number;
  rows: LoanRow[];
}
export type LoanError = { ok: false; field: 'principal' | 'rate' | 'months'; error: 'invalid' | 'positive' | 'negative' | 'integer' | 'tooLong' };

/** 상환 스케줄. 반올림 없이 정확한 값으로 계산하고, 표시 단계에서 자릿수를 맞춘다 */
export function schedule(i: LoanInput): LoanResult | LoanError {
  if (!Number.isFinite(i.principal)) return { ok: false, field: 'principal', error: 'invalid' };
  if (i.principal <= 0) return { ok: false, field: 'principal', error: 'positive' };
  if (!Number.isFinite(i.ratePct)) return { ok: false, field: 'rate', error: 'invalid' };
  if (i.ratePct < 0) return { ok: false, field: 'rate', error: 'negative' };
  if (!Number.isFinite(i.months)) return { ok: false, field: 'months', error: 'invalid' };
  if (i.months <= 0) return { ok: false, field: 'months', error: 'positive' };
  if (!Number.isInteger(i.months)) return { ok: false, field: 'months', error: 'integer' };
  if (i.months > MAX_MONTHS) return { ok: false, field: 'months', error: 'tooLong' };

  const n = i.months, r = i.ratePct / 1200;
  const rows: LoanRow[] = [];
  let balance = i.principal;
  const annuityPay = r === 0 ? i.principal / n : (i.principal * r) / (1 - Math.pow(1 + r, -n));
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    let principal: number;
    if (i.type === 'annuity') principal = annuityPay - interest;
    else if (i.type === 'principal') principal = i.principal / n;
    else principal = m === n ? balance : 0;
    if (m === n) principal = balance; // 마지막 달에 잔액을 정확히 0 으로 맞춘다 (부동소수 잡음 제거)
    balance = m === n ? 0 : balance - principal;
    rows.push({ month: m, payment: principal + interest, principal, interest, balance });
  }
  const totalInterest = rows.reduce((a, x) => a + x.interest, 0);
  return { ok: true, first: rows[0].payment, last: rows[n - 1].payment, totalInterest, totalPaid: i.principal + totalInterest, rows };
}

export interface PrepayInput { principal: number; ratePct: number; months: number; extra: number; afterMonth: number }
export interface PrepayOutcome {
  /** 월 상환액(앞으로), 전체 상환 개월 수(이미 낸 회차 포함), 총 이자, 절감 이자, 마지막 달 상환액 */
  payment: number; totalMonths: number; totalInterest: number; saved: number; last: number;
}
export interface PrepayResult {
  ok: true;
  /** 중도상환 직전 잔액(afterMonth 회차 상환 직후)과 직후 잔액 */
  balance: number; newBalance: number;
  base: { payment: number; totalMonths: number; totalInterest: number };
  /** 기간단축형: 월 상환액 그대로 두고 만기를 앞당긴다 */
  shorten: PrepayOutcome;
  /** 상환액경감형: 만기는 그대로 두고 월 상환액을 낮춘다 */
  reduce: PrepayOutcome;
  /** 일부가 아니라 잔액 전부를 갚는 경우 */
  payoff: boolean;
}
export type PrepayError = { ok: false; field: 'extra' | 'after'; error: 'invalid' | 'positive' | 'range' };

/**
 * 원리금균등 대출에서 afterMonth 회차 상환 직후 extra 를 한 번 추가 상환할 때,
 * 기간단축형(월 상환액 유지)과 상환액경감형(남은 기간 유지)의 총 이자를 비교한다.
 * 기간단축형 남은 횟수 = ceil( -ln(1 - B' · r / PMT) / ln(1 + r) ), 마지막 회차는 남은 잔액 + 이자(PMT 이하)
 */
export function prepay(i: PrepayInput): PrepayResult | PrepayError | LoanError {
  const base = schedule({ principal: i.principal, ratePct: i.ratePct, months: i.months, type: 'annuity' });
  if (!base.ok) return base;
  if (!Number.isFinite(i.extra)) return { ok: false, field: 'extra', error: 'invalid' };
  if (i.extra <= 0) return { ok: false, field: 'extra', error: 'positive' };
  if (!Number.isInteger(i.afterMonth) || i.afterMonth < 1 || i.afterMonth >= i.months) return { ok: false, field: 'after', error: 'range' };

  const k = i.afterMonth, n = i.months, r = i.ratePct / 1200, pmt = base.first;
  const paidInterest = base.rows.slice(0, k).reduce((a, x) => a + x.interest, 0);
  const balance = base.rows[k - 1].balance;
  const baseOut = { payment: pmt, totalMonths: n, totalInterest: base.totalInterest };
  if (i.extra >= balance - 1e-9) {
    // 잔액 이상이면 그 자리에서 완납: 두 방식 모두 남은 회차가 없다
    const out: PrepayOutcome = { payment: 0, totalMonths: k, totalInterest: paidInterest, saved: base.totalInterest - paidInterest, last: pmt };
    return { ok: true, balance, newBalance: 0, base: baseOut, shorten: out, reduce: out, payoff: true };
  }
  const nb = balance - i.extra;

  // 기간단축형: 월 상환액 pmt 유지
  const remain = r === 0 ? Math.ceil(nb / pmt - 1e-9) : Math.ceil(-Math.log(1 - (nb * r) / pmt) / Math.log(1 + r) - 1e-9);
  let bal = nb, interest = 0, last = pmt;
  for (let m = 1; m <= remain; m++) {
    const int = bal * r;
    interest += int;
    if (m === remain) { last = bal + int; bal = 0; } else bal = bal - (pmt - int);
  }
  const shorten: PrepayOutcome = { payment: pmt, totalMonths: k + remain, totalInterest: paidInterest + interest, saved: base.totalInterest - paidInterest - interest, last };

  // 상환액경감형: 남은 n - k 회차로 nb 를 새로 균등 분할
  const left = n - k;
  const pmt2 = r === 0 ? nb / left : (nb * r) / (1 - Math.pow(1 + r, -left));
  const interest2 = pmt2 * left - nb;
  const reduce: PrepayOutcome = { payment: pmt2, totalMonths: n, totalInterest: paidInterest + interest2, saved: base.totalInterest - paidInterest - interest2, last: pmt2 };

  return { ok: true, balance, newBalance: nb, base: baseOut, shorten, reduce, payoff: false };
}

/** 기간 입력(값 + 년/개월)을 개월 수로 */
export const toMonths = (value: number, unit: 'years' | 'months'): number => (unit === 'years' ? value * 12 : value);

/** 정액(flat) 금리 월 상환액: 원금 × (1 + 연 flat% × 년수) ÷ 개월. 말레이시아·걸프 은행이 고지하는 방식 (원금이 줄어도 처음 원금에 이자를 매김) */
export const flatPayment = (principal: number, flatPct: number, months: number): number =>
  (principal * (1 + (flatPct / 100) * (months / 12))) / months;

/** flat 금리와 같은 월 상환액을 내는 감소잔액(원리금균등) 연 금리(%). 이분법으로 풀며, 입력이 유효하지 않으면 null */
export function flatToReducingPct(flatPct: number, months: number): number | null {
  if (!Number.isFinite(flatPct) || flatPct < 0 || !Number.isInteger(months) || months < 1 || months > MAX_MONTHS) return null;
  if (flatPct === 0) return 0;
  const target = flatPayment(1, flatPct, months);
  // 원금 1 기준 월 상환액은 월 금리 r 에 대해 단조 증가
  const pay = (r: number) => (r === 0 ? 1 / months : r / (1 - Math.pow(1 + r, -months)));
  let lo = 0, hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (pay(mid) < target) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * 1200;
}

export interface LoanYearRow { year: number; payment: number; principal: number; interest: number; balance: number }

/** 월별 상환표 → 연도별 합계(12회차씩 묶음, 잔액은 그 해 마지막 회차 기준). 금액은 센트 단위로 반올림 */
export function yearly(rows: LoanRow[]): LoanYearRow[] {
  const out: LoanYearRow[] = [];
  const r2 = (n: number) => Math.round(n * 100) / 100;
  for (const row of rows) {
    const y = Math.ceil(row.month / 12);
    let cur = out[out.length - 1];
    if (!cur || cur.year !== y) { cur = { year: y, payment: 0, principal: 0, interest: 0, balance: 0 }; out.push(cur); }
    cur.payment += row.payment; cur.principal += row.principal; cur.interest += row.interest; cur.balance = row.balance;
  }
  return out.map((x) => ({ year: x.year, payment: r2(x.payment), principal: r2(x.principal), interest: r2(x.interest), balance: r2(x.balance) }));
}
