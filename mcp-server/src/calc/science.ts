// 금융·건강·과학·시험 점수: 복리, 소아 BMI 백분위, 몰질량, AP·SAT 점수. 사이트 logic.ts 를 그대로 부른다
import { compound, type Freq, type ContribFreq, type Timing } from '../../../shared/tools/compound-interest-calculator/logic';
import { evaluate as bmiAge, type Cat, type Ref, type Sex } from '../../../shared/tools/bmi-for-age-percentile/logic';
import { parseFormula, molarMass as molarOf } from '../../../shared/tools/molar-mass-calculator/logic';
import { apScore as apOf } from '../../../shared/tools/ap-score-calculator/logic';
import { subjectOf } from '../../../shared/tools/ap-score-calculator/data';
import { satScore as satOf, TEST_IDS, LATEST_TEST } from '../../../shared/tools/sat-score-calculator/logic';
import { sourceUrl, ToolInputError } from '../catalog';

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function compoundInterest(i: { principal: number; rate: number; years: number; freq?: Freq; deposit?: number; deposit_freq?: ContribFreq; timing?: Timing; inflation?: number; locale?: string }) {
  const freq = i.freq ?? 'monthly', dfreq = i.deposit_freq ?? 'monthly', timing = i.timing ?? 'end', deposit = i.deposit ?? 0, infl = i.inflation ?? 0;
  const r = compound({ principal: i.principal, ratePct: i.rate, freq, years: i.years, contrib: deposit, contribFreq: dfreq, timing, inflationPct: infl });
  if (!r.ok) throw new ToolInputError(`${r.field} is ${r.error}${r.field === 'years' ? ' (0 < years <= 100)' : ''}`);
  return {
    final_balance: round(r.final), total_deposits: round(r.deposits), total_interest: round(r.interest), apy_percent: round(r.apyPct, 4),
    real_value_today: infl ? round(r.real) : undefined,
    by_year: r.rows.map((y) => ({ year: y.year, balance: round(y.balance), interest: round(y.interest) })),
    source_url: sourceUrl('compound-interest-calculator', { amount: i.principal, rate: i.rate, freq, years: i.years, deposit, dfreq, timing, infl }, i.locale),
  };
}

const CAT_EN: Record<Cat, string> = {
  sevThin: 'Severe thinness', thin: 'Thinness', normal: 'Normal', over: 'Overweight', obese: 'Obesity',
  sevWasted: 'Severely wasted', wasted: 'Wasted', riskOver: 'Possible risk of overweight', over05: 'Overweight', obese05: 'Obese',
  under: 'Underweight', healthyW: 'Healthy weight', overCdc: 'Overweight', obeseCdc: 'Obesity', sevObese: 'Severe obesity',
};

export function bmiForAge(i: { sex: Sex; age_years: number; age_months?: number; height_cm: number; weight_kg: number; ref?: Ref; locale?: string }) {
  const ref = i.ref ?? 'who', months = Math.round(i.age_years * 12 + (i.age_months ?? 0));
  const r = bmiAge({ ref, sex: i.sex, months, kg: i.weight_kg, cm: i.height_cm });
  if (!r.ok) throw new ToolInputError(r.error === 'age' ? (ref === 'who' ? 'WHO covers ages 0-19 (0-228 months)' : 'CDC covers ages 2-20 (24-240 months)') : `${r.error} out of range (height 40-230 cm, weight 1-300 kg)`);
  return {
    bmi: round(r.bmi, 1), z_score: round(r.z, 2), percentile: round(r.pct, 1), category: CAT_EN[r.cat], reference: ref.toUpperCase(),
    healthy_bmi_range: [round(r.lo, 1), round(r.hi, 1)], bmi_95th_percentile: round(r.p95, 1), percent_of_95th: r.pctOf95 === null ? undefined : round(r.pctOf95, 1),
    source_url: sourceUrl('bmi-for-age-percentile', { ref, sex: i.sex, age: Math.floor(months / 12), months: months % 12, units: 'metric', height: i.height_cm, weight: i.weight_kg }, i.locale),
  };
}

export function molarMass(i: { formula: string; grams?: number; moles?: number; locale?: string }) {
  const p = parseFormula(i.formula);
  if (!p.ok) throw new ToolInputError(`cannot parse formula (${p.error}${p.at ? ` at "${p.at}"` : ''}). Use element symbols, parentheses and hydrate dots, e.g. CuSO4*5H2O`);
  const r = molarOf(p.counts, p.order);
  if (i.grams !== undefined && i.moles !== undefined) throw new ToolInputError('give grams or moles, not both');
  return {
    formula: i.formula, molar_mass_g_per_mol: round(r.molar, 4),
    composition: r.rows.map((x) => ({ element: x.sym, count: x.count, atomic_weight: x.w, mass_percent: round(x.pct, 3) })),
    moles: i.grams !== undefined ? i.grams / r.molar : undefined,
    grams: i.moles !== undefined ? i.moles * r.molar : undefined,
    source_url: sourceUrl('molar-mass-calculator', { f: i.formula, ...(i.grams !== undefined ? { amt: i.grams, unit: 'g' } : i.moles !== undefined ? { amt: i.moles, unit: 'mol' } : {}) }, i.locale),
  };
}

export const AP_SUBJECTS = ['apush', 'world', 'lang', 'lit', 'bio', 'chem', 'calcab', 'calcbc', 'stats', 'psych', 'gov', 'phys1'];

export function apScore(i: { subject: string; mcq_correct: number; frq: number[]; locale?: string }) {
  const r = apOf(i.subject, i.mcq_correct, i.frq);
  if (!r.ok) {
    const s = subjectOf(i.subject);
    throw new ToolInputError(r.error === 'subject' ? `subject must be one of ${AP_SUBJECTS.join(', ')}`
      : r.error === 'mcq' ? `mcq_correct must be a whole number 0-${s!.mcq.n}`
      : `frq needs ${s!.frq.length} scores with maxima ${s!.frq.map((f) => f.max).join(', ')}${r.index !== undefined ? ` (item ${r.index + 1} invalid)` : ''}`);
  }
  const v = r.value, q: Record<string, string | number> = { subj: i.subject, mc: i.mcq_correct };
  i.frq.forEach((f, k) => (q[`f${k + 1}`] = f));
  return {
    subject: v.subject.name, predicted_score: v.score, alternate_score: v.secondary ? v.scoreAlt : undefined,
    composite_percent: round(v.fraction * 100, 1), composite: v.composite, points_to_next_score: v.toNext,
    basis: v.secondary ? 'Estimated from secondary sources (score = stricter cut, alternate_score = looser cut)' : 'College Board published scoring worksheet cuts',
    disclaimer: 'Unofficial estimate. Cut scores change each year.',
    source_url: sourceUrl('ap-score-calculator', q, i.locale),
  };
}

export const SAT_TESTS = TEST_IDS;

export function satScore(i: { rw1: number; rw2: number; math1: number; math2: number; test?: string; locale?: string }) {
  const test = i.test ?? LATEST_TEST;
  const r = satOf(test, i.rw1, i.rw2, i.math1, i.math2);
  if (!r.ok) throw new ToolInputError(r.error === 'test' ? `test must be one of ${TEST_IDS.join(', ')} (Bluebook practice test number)` : r.error === 'rw' ? 'rw1 and rw2 must be whole numbers 0-33' : 'math1 and math2 must be whole numbers 0-27');
  const v = r.value, range = (x: { lo: number; hi: number }) => (x.lo === x.hi ? `${x.lo}` : `${x.lo}-${x.hi}`);
  return {
    total: range(v.total), reading_writing: range(v.rw), math: range(v.math), raw: { reading_writing: v.rwRaw, math: v.mathRaw },
    percentile: { total: v.pct.total, reading_writing: v.pct.rw, math: v.pct.math },
    basis: `College Board Bluebook practice test ${test} conversion table. Unofficial estimate.`,
    source_url: sourceUrl('sat-score-calculator', { test, rw1: i.rw1, rw2: i.rw2, m1: i.math1, m2: i.math2 }, i.locale),
  };
}
