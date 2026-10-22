// AP 점수 추정: 섹션 비중으로 가중 합성 비율을 구하고, 공개 연습시험 환산표 기준으로 1~5 를 추정한다
import { subjectOf, type Subject } from './data';

export type ApError = 'subject' | 'mcq' | 'frq';
export interface ApResult {
  subject: Subject;
  /** 가중 합성 비율 0~1 */
  fraction: number;
  mcqPart: number;
  frqPart: number;
  /** 공개 차트 척도의 합성점수(반올림). 차트가 없으면 null */
  composite: number | null;
  score: 1 | 2 | 3 | 4 | 5 | null;
  /** 한 등급 위까지 남은 합성점수(2차 자료 추정이면 합성 비율 %p). 5점이거나 기준이 없으면 null */
  toNext: number | null;
  /** 2차 자료 추정이면 true. score 는 높은 커트(보수적), scoreAlt 는 낮은 커트 기준 */
  secondary: boolean;
  scoreAlt: 1 | 2 | 3 | 4 | 5 | null;
}

type Cuts = [number, number, number, number];
/** 2차 자료 두 곳의 커트를 등급별로 높은 쪽·낮은 쪽으로 나눈다 */
export function estCuts(s: Subject): { hi: Cuts; lo: Cuts } | null {
  if (!s.est) return null;
  const [a, b] = s.est.sources.map((x) => x.cuts);
  return { hi: a.map((v, i) => Math.max(v, b[i])) as Cuts, lo: a.map((v, i) => Math.min(v, b[i])) as Cuts };
}

const validCount = (v: number, max: number) => Number.isFinite(v) && v >= 0 && v <= max;

/** 공개 차트 구간으로 등급을 고른다. cuts 는 5·4·3·2 의 하한 */
export function scoreFromComposite(composite: number, cuts: readonly [number, number, number, number]): 1 | 2 | 3 | 4 | 5 {
  const [c5, c4, c3, c2] = cuts;
  return composite >= c5 ? 5 : composite >= c4 ? 4 : composite >= c3 ? 3 : composite >= c2 ? 2 : 1;
}

export function apScore(subjectId: string, mcq: number, frq: number[]): { ok: true; value: ApResult } | { ok: false; error: ApError; index?: number } {
  const s = subjectOf(subjectId);
  if (!s) return { ok: false, error: 'subject' };
  if (!validCount(mcq, s.mcq.n) || !Number.isInteger(mcq)) return { ok: false, error: 'mcq' };
  if (frq.length !== s.frq.length) return { ok: false, error: 'frq' };
  for (let i = 0; i < s.frq.length; i++) if (!validCount(frq[i], s.frq[i].max)) return { ok: false, error: 'frq', index: i };
  const mcqPart = s.mcq.weight * (mcq / s.mcq.n);
  const frqPart = s.frq.reduce((sum, p, i) => sum + p.weight * (frq[i] / p.max), 0);
  // 부동소수 오차로 만점이 1 을 살짝 넘거나 모자라지 않게 정리한다
  const fraction = Math.min(1, Math.round((mcqPart + frqPart) * 1e9) / 1e9);
  let composite: number | null = null, score: ApResult['score'] = null, toNext: number | null = null, scoreAlt: ApResult['score'] = null;
  const e = estCuts(s);
  if (s.cut) {
    // 공개 워크시트처럼 합성점수는 가장 가까운 정수로 반올림한다
    composite = Math.round(fraction * s.cut.max + 1e-9);
    score = scoreFromComposite(composite, s.cut.cuts);
    toNext = score === 5 ? null : s.cut.cuts[4 - score] - composite;
  } else if (e) {
    // 2차 자료 커트는 합성 비율(%) 기준. 소수 첫째 자리까지 본다
    const pct = Math.round(fraction * 1000) / 10;
    score = scoreFromComposite(pct, e.hi);
    scoreAlt = scoreFromComposite(pct, e.lo);
    toNext = score === 5 ? null : Math.round((e.hi[4 - score] - pct) * 10) / 10;
  }
  return { ok: true, value: { subject: s, fraction, mcqPart, frqPart, composite, score, toNext, secondary: !s.cut && !!e, scoreAlt } };
}

/** 공개 차트 비율로 바꾼 커트(5·4·3·2, 합성 비율 %) */
export function cutPercents(s: Subject): number[] | null {
  return s.cut ? s.cut.cuts.map((c) => Math.round((c / s.cut!.max) * 1000) / 10) : null;
}
