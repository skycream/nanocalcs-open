// 어린이·청소년 BMI 백분위: WHO(0~19세)·CDC 2000(2~20세) LMS 표로 z 점수·백분위·구간을 구한다
// - z = ((BMI/M)^L - 1) / (L·S)  (L≠0). WHO 는 |z|>3 에서 '제한 z'(computation.pdf)를 쓴다: z = 3 + (y - SD3) / (SD3 - SD2)
// - CDC 는 순수 LMS. 95백분위 이상이면 95백분위 대비 %도 낸다(CDC 2022 확장 BMI: 120% 이상 = 고도비만)
import { WHO_BOYS, WHO_GIRLS, CDC_BOYS, CDC_GIRLS } from './lms';

export type Sex = 'boy' | 'girl';
export type Ref = 'who' | 'cdc';
export type Cat =
  | 'sevThin' | 'thin' | 'normal' | 'over' | 'obese'          // WHO 5~19세
  | 'sevWasted' | 'wasted' | 'riskOver' | 'over05' | 'obese05' // WHO 0~5세 (normal 공유)
  | 'under' | 'healthyW' | 'overCdc' | 'obeseCdc' | 'sevObese';  // CDC

export const RANGE: Record<Ref, [number, number]> = { who: [0, 228], cdc: [24, 240] };

export interface Lms { L: number; M: number; S: number }

/** 만 개월 수로 LMS 행을 꺼낸다. 범위 밖이면 null */
export function lmsAt(ref: Ref, sex: Sex, months: number): Lms | null {
  const m = Math.floor(months);
  const [lo, hi] = RANGE[ref];
  if (!Number.isFinite(m) || m < lo || m > hi) return null;
  const t = ref === 'who' ? (sex === 'boy' ? WHO_BOYS : WHO_GIRLS) : (sex === 'boy' ? CDC_BOYS : CDC_GIRLS);
  const i = (m - lo) * 3;
  return { L: t[i], M: t[i + 1], S: t[i + 2] };
}

/** z 점수에 해당하는 BMI (LMS 역변환) */
export const bmiAtZ = ({ L, M, S }: Lms, z: number) => (L === 0 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L));

/** 순수 LMS z */
export const lmsZ = ({ L, M, S }: Lms, y: number) => (L === 0 ? Math.log(y / M) / S : ((y / M) ** L - 1) / (L * S));

/** WHO 제한 z: |z|>3 이면 SD2~SD3 간격으로 선형 연장 */
export function whoZ(p: Lms, y: number): number {
  const z = lmsZ(p, y);
  if (z > 3) { const s3 = bmiAtZ(p, 3), s2 = bmiAtZ(p, 2); return 3 + (y - s3) / (s3 - s2); }
  if (z < -3) { const s3 = bmiAtZ(p, -3), s2 = bmiAtZ(p, -2); return -3 + (y - s3) / (s2 - s3); }
  return z;
}

/** 표준정규 누적분포 (Abramowitz-Stegun 7.1.26 보다 정밀한 erf 근사, 오차 < 1.2e-7) */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const e = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? 1 - e / 2 : e / 2;
}

export interface Input { ref: Ref; sex: Sex; months: number; kg: number; cm: number }
export type Result =
  | { ok: true; bmi: number; z: number; pct: number; cat: Cat; /** 정상 범위 BMI: WHO -2SD~+1SD, CDC 5~85백분위 */ lo: number; hi: number; p95: number; pctOf95: number | null; under5: boolean }
  | { ok: false; error: 'age' | 'height' | 'weight' };

export const LIMITS = { kg: [1, 300], cm: [40, 230] } as const;

function category(ref: Ref, months: number, z: number, pct: number, pctOf95: number): Cat {
  if (ref === 'cdc') {
    if (pct < 5) return 'under';
    if (pct < 85) return 'healthyW';
    if (pct < 95) return 'overCdc';
    return pctOf95 >= 120 ? 'sevObese' : 'obeseCdc';
  }
  if (months < 61) { // WHO Child Growth Standards 0~5세 분류
    if (z < -3) return 'sevWasted';
    if (z < -2) return 'wasted';
    if (z <= 1) return 'normal';
    if (z <= 2) return 'riskOver';
    if (z <= 3) return 'over05';
    return 'obese05';
  }
  if (z < -3) return 'sevThin'; // WHO 2007 5~19세: >+1SD 과체중, >+2SD 비만, <-2SD 마름, <-3SD 심한 마름
  if (z < -2) return 'thin';
  if (z <= 1) return 'normal';
  if (z <= 2) return 'over';
  return 'obese';
}

export function evaluate(i: Input): Result {
  const p = lmsAt(i.ref, i.sex, i.months);
  if (!p) return { ok: false, error: 'age' };
  if (!Number.isFinite(i.cm) || i.cm < LIMITS.cm[0] || i.cm > LIMITS.cm[1]) return { ok: false, error: 'height' };
  if (!Number.isFinite(i.kg) || i.kg < LIMITS.kg[0] || i.kg > LIMITS.kg[1]) return { ok: false, error: 'weight' };
  const b = i.kg / (i.cm / 100) ** 2;
  const z = i.ref === 'who' ? whoZ(p, b) : lmsZ(p, b);
  const pct = normCdf(z) * 100;
  const p95 = bmiAtZ(p, 1.6448536);
  const pctOf95 = (b / p95) * 100;
  return {
    ok: true, bmi: b, z, pct, cat: category(i.ref, i.months, z, pct, pctOf95),
    lo: i.ref === 'who' ? bmiAtZ(p, -2) : bmiAtZ(p, -1.6448536), hi: i.ref === 'who' ? bmiAtZ(p, 1) : bmiAtZ(p, 1.0364334), p95,
    pctOf95: i.ref === 'cdc' && pct >= 95 ? pctOf95 : null, under5: i.ref === 'who' && i.months < 61,
  };
}
