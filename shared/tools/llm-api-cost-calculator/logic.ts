// LLM API 비용 계산: 요청당 토큰 × 요청 수. 가격은 USD / 100만 토큰
import type { ModelPrice } from './prices';

export const DAYS_PER_MONTH = 30; // 월 = 30일로 환산 (일 ↔ 월 변환 기준)

export interface UsageInput {
  inTokens: number;      // 요청당 입력 토큰
  outTokens: number;     // 요청당 출력 토큰
  requests: number;      // 요청 수
  period: 'day' | 'month';
  cache: boolean;        // 프롬프트 캐시 적용
  cacheHitPct: number;   // 입력 토큰 중 캐시 적중 비율 (0~100)
  batch: boolean;        // 배치 할인 적용
}
export interface CostResult {
  ok: true;
  perRequest: number; daily: number; monthly: number; yearly: number;
  inRate: number;        // 실제 적용된 입력 단가 (적중/미적중 가중 평균)
  outRate: number;
  cacheApplied: boolean; batchApplied: boolean; // 모델이 지원하지 않으면 false
}
export type CostError = { ok: false; field: 'inTokens' | 'outTokens' | 'requests' | 'cacheHit'; error: 'invalid' | 'negative' | 'zero' | 'range' };

export function validate(u: UsageInput): CostError | null {
  const chk = (field: 'inTokens' | 'outTokens' | 'requests', v: number): CostError | null =>
    !Number.isFinite(v) ? { ok: false, field, error: 'invalid' } : v < 0 ? { ok: false, field, error: 'negative' } : null;
  const e = chk('inTokens', u.inTokens) ?? chk('outTokens', u.outTokens) ?? chk('requests', u.requests);
  if (e) return e;
  if (u.inTokens === 0 && u.outTokens === 0) return { ok: false, field: 'inTokens', error: 'zero' };
  if (u.cache && (!Number.isFinite(u.cacheHitPct) || u.cacheHitPct < 0 || u.cacheHitPct > 100)) return { ok: false, field: 'cacheHit', error: 'range' };
  return null;
}

export function cost(m: ModelPrice, u: UsageInput): CostResult | CostError {
  const err = validate(u);
  if (err) return err;
  const batchApplied = u.batch && m.batchIn !== undefined && m.batchOut !== undefined;
  const base = batchApplied ? m.batchIn! : m.in;
  const outRate = batchApplied ? m.batchOut! : m.out;
  const readRate = batchApplied ? (m.batchCacheRead ?? m.cacheRead) : m.cacheRead;
  const cacheApplied = u.cache && readRate !== undefined;
  const hit = cacheApplied ? u.cacheHitPct / 100 : 0;
  const inRate = cacheApplied ? hit * readRate! + (1 - hit) * base : base;
  const perRequest = (u.inTokens * inRate + u.outTokens * outRate) / 1e6;
  const perDayRequests = u.period === 'day' ? u.requests : u.requests / DAYS_PER_MONTH;
  const daily = perRequest * perDayRequests;
  const monthly = u.period === 'month' ? perRequest * u.requests : daily * DAYS_PER_MONTH;
  return { ok: true, perRequest, daily, monthly, yearly: monthly * 12, inRate, outRate, cacheApplied, batchApplied };
}

/** 같은 사용량으로 모든 모델을 계산해 월 비용 오름차순으로 정렬 */
export function compare(models: ModelPrice[], u: UsageInput): { model: ModelPrice; res: CostResult }[] {
  return models
    .map((model) => ({ model, res: cost(model, u) }))
    .filter((x): x is { model: ModelPrice; res: CostResult } => x.res.ok)
    .sort((a, b) => a.res.monthly - b.res.monthly);
}
