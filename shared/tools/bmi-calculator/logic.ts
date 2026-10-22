// BMI: WHO 성인 분류. 만 18세 미만은 연령별 백분위 기준이라 분류하지 않는다.
export type BmiClass = 'underweight' | 'normal' | 'overweight' | 'obese1' | 'obese2' | 'obese3';

/** 체질량지수 = kg / m² */
export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2;

/** WHO 성인 구간 (18.5 / 25 / 30 / 35 / 40) */
export function classify(b: number): BmiClass {
  if (b < 18.5) return 'underweight';
  if (b < 25) return 'normal';
  if (b < 30) return 'overweight';
  if (b < 35) return 'obese1';
  if (b < 40) return 'obese2';
  return 'obese3';
}

export interface BmiInput { kg: number; cm: number; age: number }
export type BmiResult =
  | { ok: true; bmi: number; cls: BmiClass | null; minKg: number; maxKg: number; child: boolean }
  | { ok: false; error: 'weight' | 'height' | 'age' };

export const LIMITS = { kg: [2, 500], cm: [50, 272], age: [2, 120] } as const;

/** 계산. 정상 체중 범위는 BMI 18.5~24.9 에 해당하는 체중 */
export function evaluate(i: BmiInput): BmiResult {
  if (!Number.isFinite(i.age) || i.age < LIMITS.age[0] || i.age > LIMITS.age[1]) return { ok: false, error: 'age' };
  if (!Number.isFinite(i.cm) || i.cm < LIMITS.cm[0] || i.cm > LIMITS.cm[1]) return { ok: false, error: 'height' };
  if (!Number.isFinite(i.kg) || i.kg < LIMITS.kg[0] || i.kg > LIMITS.kg[1]) return { ok: false, error: 'weight' };
  const b = bmi(i.kg, i.cm), m2 = (i.cm / 100) ** 2;
  const child = i.age < 18;
  return { ok: true, bmi: b, cls: child ? null : classify(b), minKg: 18.5 * m2, maxKg: 24.9 * m2, child };
}
