// 계산 핸들러: 손으로 검산한 정상값과 오류 입력
import { describe, it, expect } from 'vitest';
import { percentage, loan, dateAdd, daysBetween, age, unitConvert, bmi, roi } from '../src/calc/basic';
import { tokenCount, contextFit, llmCost, gpuVram } from '../src/calc/ai';
import { ToolInputError } from '../src/catalog';

const S = 'https://nanocalcs.com';

describe('일반 계산 정상값', () => {
  it.each([
    ['15% of 240', () => percentage({ mode: 'of', a: 15, b: 240 }).result, 36],
    ['30 is ?% of 120', () => percentage({ mode: 'what', a: 30, b: 120 }).result, 25],
    ['50 -> 75 change', () => percentage({ mode: 'change', a: 50, b: 75 }).result, 50],
    ['10 km -> mi', () => unitConvert({ category: 'length', value: 10, from: 'km', to: 'mi' }).result, 6.21371192237],
    ['100 C -> F', () => unitConvert({ category: 'temperature', value: 100, from: 'c', to: 'f' }).result, 212],
    ['BMI 175/70', () => bmi({ height_cm: 175, weight_kg: 70 }).bmi, 22.9],
    ['ROI 10000->15000', () => roi({ initial: 10000, final: 15000 }).roi_percent, 50],
  ])('%s', (_, run, want) => expect(run()).toBeCloseTo(want as number, 6));

  it('대출 원리금균등: 30만, 4.5%, 30년 = 월 1520.06', () => {
    const r = loan({ amount: 300000, rate: 4.5, term: 30 });
    expect(r.first_payment).toBe(1520.06);
    expect(r.months).toBe(360);
    expect(r.total_paid).toBeCloseTo(1520.06 * 360, -1);
    expect(r.source_url).toBe(`${S}/en/loan-calculator/?amount=300000&rate=4.5&term=30&unit=years&type=annuity`);
  });

  it('날짜 더하기와 말일 보정', () => {
    expect(dateAdd({ start: '2026-01-01', days: 100 }).result).toBe('2026-04-11');
    expect(dateAdd({ start: '2024-01-31', months: 1 }).result).toBe('2024-02-29');
    expect(dateAdd({ start: '2026-03-01', op: 'sub', days: 1 }).result).toBe('2026-02-28');
  });

  it('두 날짜 사이', () => {
    const r = daysBetween({ from: '2026-01-01', to: '2026-12-25' });
    expect(r.days).toBe(358);
    expect(daysBetween({ from: '2026-01-01', to: '2026-12-25', inclusive: true }).days).toBe(359);
    expect(r.source_url).toContain('days-between-dates/?from=2026-01-01&to=2026-12-25&inclusive=0');
  });

  it('나이: on 지정, 생략 시 오늘(UTC)', () => {
    const r = age({ birth: '1990-05-15', on: '2026-10-16' });
    expect([r.years, r.months, r.days]).toEqual([36, 5, 1]);
    expect(r.next_birthday).toBe('2027-05-15');
    expect(age({ birth: '2000-01-01' }, new Date('2026-01-01T12:00:00Z')).years).toBe(26);
  });

  it('ROI 연환산(복리)', () => {
    expect(roi({ initial: 10000, final: 15000, period: 3 }).annualized_percent).toBeCloseTo(14.4714, 3);
    expect(roi({ initial: 1, final: 2 }).annualized_percent).toBeNull();
  });
});

describe('AI 계산 정상값', () => {
  it('토큰 수(o200k 정확값)와 링크', async () => {
    const r = await tokenCount({ text: 'Hello, world! How many tokens?' });
    expect(r.tokens).toBe(8);
    expect(r.source_url).toContain('token-counter/?text=Hello');
  });
  it('긴 텍스트는 링크에 넣지 않는다', async () => {
    const r = await tokenCount({ text: 'word '.repeat(100) });
    expect(r.source_url).toBe(`${S}/en/token-counter/?enc=o200k_base`);
  });
  it('컨텍스트 창 적합', async () => {
    const r = await contextFit({ tokens: 150000, reserve: 8000, model: 'gpt-4o' });
    expect(r.models[0]).toMatchObject({ context_window: 128000, fits: false, remaining: 128000 - 8000 - 150000 });
    expect((await contextFit({ tokens: 1000 })).models.length).toBeGreaterThan(5);
  });
  it('API 비용: gpt-4.1 2000/500 토큰 하루 1000회 = 하루 $8, 월 $240', () => {
    const r = llmCost({ model: 'gpt-4.1', input: 2000, output: 500, requests: 1000 }) as { daily: number; monthly: number; source_url: string };
    expect(r.daily).toBeCloseTo(8, 9);
    expect(r.monthly).toBeCloseTo(240, 9);
    expect(r.source_url).toContain('model=gpt-4.1&input=2000&output=500&requests=1000&per=day');
  });
  it('API 비용: 모델 생략 시 싼 순서 10개', () => {
    const r = llmCost({ input: 1000, output: 100, requests: 10 }) as { cheapest: { monthly: number }[] };
    expect(r.cheapest).toHaveLength(10);
    expect(r.cheapest[0].monthly).toBeLessThanOrEqual(r.cheapest[9].monthly);
  });
  it('VRAM: Llama 3.1 8B 4bit 8K = 5.21 GiB', () => {
    const r = gpuVram({ model: 'llama31-8b' });
    expect(r.kv_cache_gib).toBe(1);
    expect(r.total_gib).toBeCloseTo(5.21, 2);
    expect(r.gpu_fit.find((f) => f.gpu_gb === 8)?.fits).toBe(true);
    expect(r.source_url).toContain('gpu-vram-calculator/?model=llama31-8b&params=8.03&bits=4');
  });
});

describe('오류 입력은 ToolInputError', () => {
  it.each([
    ['퍼센트 0으로 나누기', () => percentage({ mode: 'what', a: 1, b: 0 })],
    ['대출 기간 초과', () => loan({ amount: 1000, rate: 5, term: 101 })],
    ['대출 원금 0', () => loan({ amount: 0, rate: 5, term: 1 })],
    ['잘못된 날짜', () => dateAdd({ start: '2026-02-30', days: 1 })],
    ['소수 일수', () => dateAdd({ start: '2026-01-01', days: 1.5 })],
    ['출생일이 기준일 뒤', () => age({ birth: '2030-01-01', on: '2026-01-01' })],
    ['없는 단위', () => unitConvert({ category: 'length', value: 1, from: 'km', to: 'kg' })],
    ['절대영도 미만', () => unitConvert({ category: 'temperature', value: -300, from: 'c', to: 'k' })],
    ['키 범위 밖', () => bmi({ height_cm: 20, weight_kg: 70 })],
    ['ROI 투자금 0', () => roi({ initial: 0, final: 1 })],
    ['없는 가격 모델', () => llmCost({ model: 'nope', input: 1, output: 1, requests: 1 })],
    ['토큰 0/0', () => llmCost({ model: 'gpt-4.1', input: 0, output: 0, requests: 1 })],
    ['VRAM 프리셋 없음 + 값 누락', () => gpuVram({ params_b: 7 })],
    ['없는 VRAM 프리셋', () => gpuVram({ model: 'nope' })],
  ])('%s', (_, run) => expect(run).toThrow(ToolInputError));

  it('컨텍스트: tokens·text 둘 다 없음, 없는 모델', async () => {
    await expect(contextFit({})).rejects.toThrow(ToolInputError);
    await expect(contextFit({ tokens: 1, model: 'nope' })).rejects.toThrow(/Models:/);
  });
});
