// 일반 계산: 사이트 각 도구의 logic.ts 순수 함수를 그대로 불러 쓰고, 같은 입력을 채운 확인용 링크를 붙인다.
import { percentOf, whatPercent, percentChange } from '../../../shared/tools/percentage-calculator/logic';
import { schedule, toMonths, MAX_MONTHS, type LoanType } from '../../../shared/tools/loan-calculator/logic';
import { shiftDate } from '../../../shared/tools/date-calculator/logic';
import { span } from '../../../shared/tools/days-between-dates/logic';
import { age as ageOf, parseYmd, type Ymd } from '../../../shared/tools/age-calculator/logic';
import { convert, CATEGORIES, type CategoryId } from '../../../shared/tools/unit-converter/logic';
import { evaluate as bmiEval } from '../../../shared/tools/bmi-calculator/logic';
import { roi as roiOf, type PeriodUnit } from '../../../shared/tools/roi-calculator/logic';
import { sourceUrl, ToolInputError } from '../catalog';

const ymdStr = (a: Ymd) => `${String(a.y).padStart(4, '0')}-${String(a.m).padStart(2, '0')}-${String(a.d).padStart(2, '0')}`;
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function date(name: string, s: string): Ymd {
  const v = parseYmd(s);
  if (!v) throw new ToolInputError(`${name} must be a valid date in YYYY-MM-DD format, got "${s}"`);
  return v;
}

export const todayUtc = (now = new Date()): string => now.toISOString().slice(0, 10);

export type PctMode = 'of' | 'what' | 'change';
export function percentage(i: { mode: PctMode; a: number; b: number; locale?: string }) {
  const r = i.mode === 'of' ? percentOf(i.a, i.b) : i.mode === 'what' ? whatPercent(i.a, i.b) : percentChange(i.a, i.b);
  if (!r.ok) throw new ToolInputError(r.error === 'zero' ? (i.mode === 'what' ? 'b (the whole) must not be 0' : 'a (the starting value) must not be 0') : 'a and b must be finite numbers');
  const meaning = i.mode === 'of' ? `${i.a}% of ${i.b} = ${r.value}` : i.mode === 'what' ? `${i.a} is ${r.value}% of ${i.b}` : `change from ${i.a} to ${i.b} = ${r.value}%`;
  return { result: r.value, meaning, source_url: sourceUrl('percentage-calculator', { mode: i.mode, a: i.a, b: i.b }, i.locale) };
}

export function loan(i: { amount: number; rate: number; term: number; unit?: 'years' | 'months'; type?: LoanType; locale?: string }) {
  const unit = i.unit ?? 'years', type = i.type ?? 'annuity';
  const months = toMonths(i.term, unit);
  const r = schedule({ principal: i.amount, ratePct: i.rate, months, type });
  if (!r.ok) {
    const msg = r.error === 'tooLong' ? `term must be at most ${MAX_MONTHS} months` : r.error === 'integer' ? 'term must be a whole number of months' : `${r.field} is ${r.error}`;
    throw new ToolInputError(msg);
  }
  return {
    type, months,
    first_payment: round(r.first), last_payment: round(r.last),
    total_interest: round(r.totalInterest), total_paid: round(r.totalPaid),
    note: 'Monthly payments, nominal annual rate / 12. annuity = equal total payments, principal = equal principal, bullet = interest-only then lump sum.',
    source_url: sourceUrl('loan-calculator', { amount: i.amount, rate: i.rate, term: i.term, unit, type }, i.locale),
  };
}

export function dateAdd(i: { start: string; op?: 'add' | 'sub'; years?: number; months?: number; weeks?: number; days?: number; locale?: string }) {
  const op = i.op ?? 'add';
  const off = { years: i.years ?? 0, months: i.months ?? 0, weeks: i.weeks ?? 0, days: i.days ?? 0 };
  const r = shiftDate(date('start', i.start), op === 'add' ? 1 : -1, off);
  if (!r.ok) throw new ToolInputError(r.error === 'range' ? 'result is outside years 1..9999' : 'years, months, weeks and days must be whole numbers from 0 to 100000');
  const weekday = new Date(`${ymdStr(r.value)}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  return { result: ymdStr(r.value), weekday, source_url: sourceUrl('date-calculator', { op, start: i.start, ...off }, i.locale) };
}

export function daysBetween(i: { from: string; to: string; inclusive?: boolean; locale?: string }) {
  date('from', i.from); date('to', i.to);
  const s = span(i.from, i.to, i.inclusive ?? false);
  if (!s) throw new ToolInputError('from and to must be valid YYYY-MM-DD dates');
  return {
    days: s.days, weeks: s.weeks, remaining_days_after_weeks: s.weekDays,
    years: s.years, months: s.yMonths, days_after_months: s.yDays, total_months: s.months,
    swapped: s.swapped, end_date_included: i.inclusive ?? false,
    source_url: sourceUrl('days-between-dates', { from: i.from, to: i.to, inclusive: i.inclusive ?? false }, i.locale),
  };
}

export function age(i: { birth: string; on?: string; locale?: string }, now = new Date()) {
  const on = i.on ?? todayUtc(now);
  const r = ageOf(date('birth', i.birth), date('on', on));
  if (!r.ok) throw new ToolInputError('birth must not be after the "on" date');
  const v = r.value;
  return {
    on, years: v.years, months: v.months, days: v.days,
    total_days: v.totalDays, total_weeks: v.totalWeeks, total_months: v.totalMonths,
    next_birthday: ymdStr(v.next.date), days_until_next_birthday: v.next.daysUntil, turning: v.next.turning,
    source_url: sourceUrl('age-calculator', i.on ? { birth: i.birth, on: i.on } : { birth: i.birth }, i.locale),
  };
}

export const UNIT_CATEGORIES = Object.keys(CATEGORIES) as CategoryId[];
export const unitList = (): string => UNIT_CATEGORIES.map((c) => `${c}: ${CATEGORIES[c].map((u) => u.id).join(', ')}`).join('; ');

export function unitConvert(i: { category: CategoryId; value: number; from: string; to: string; locale?: string }) {
  const r = convert(i.category, i.from, i.to, i.value);
  if (!r.ok) {
    if (r.error === 'unit') throw new ToolInputError(`unknown unit for ${i.category}. Units: ${CATEGORIES[i.category]?.map((u) => u.id).join(', ') ?? unitList()}`);
    throw new ToolInputError(r.error === 'belowZero' ? 'temperature is below absolute zero' : 'value must be a finite number');
  }
  const sym = (id: string) => CATEGORIES[i.category].find((u) => u.id === id)!.symbol;
  return {
    result: r.value, meaning: `${i.value} ${sym(i.from)} = ${r.value} ${sym(i.to)}`,
    source_url: sourceUrl('unit-converter', { cat: i.category, value: i.value, from: i.from, to: i.to }, i.locale),
  };
}

export function bmi(i: { height_cm: number; weight_kg: number; age?: number; locale?: string }) {
  const a = i.age ?? 30;
  const r = bmiEval({ kg: i.weight_kg, cm: i.height_cm, age: a });
  if (!r.ok) throw new ToolInputError(r.error === 'age' ? 'age must be 2..120' : r.error === 'height' ? 'height_cm must be 50..272' : 'weight_kg must be 2..500');
  return {
    bmi: round(r.bmi, 1), category: r.cls ?? 'not classified (under 18: use age- and sex-specific percentiles)',
    healthy_weight_kg: [round(r.minKg, 1), round(r.maxKg, 1)],
    note: 'WHO adult categories. BMI is a screening measure, not a diagnosis.',
    source_url: sourceUrl('bmi-calculator', { units: 'metric', height: i.height_cm, weight: i.weight_kg, age: a }, i.locale),
  };
}

export function roi(i: { initial: number; final: number; period?: number; unit?: PeriodUnit; locale?: string }) {
  const unit = i.unit ?? 'years';
  const r = roiOf(i.initial, i.final, i.period ?? null, unit);
  if (!r.ok) throw new ToolInputError(r.error === 'initial' ? 'initial must be greater than 0' : r.error === 'period' ? 'period must be greater than 0' : 'initial and final must be finite numbers');
  const v = r.value;
  const p: Record<string, string | number> = { initial: i.initial, final: i.final };
  if (i.period !== undefined) Object.assign(p, { period: i.period, unit });
  return {
    profit: v.profit, roi_percent: v.roi, multiple: v.multiple, years: v.years,
    annualized_percent: v.annualized, // 기간이 없으면 null
    source_url: sourceUrl('roi-calculator', p, i.locale),
  };
}
