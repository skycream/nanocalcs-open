import { describe, it, expect } from 'vitest';
import { estimate, fitList, PRESETS, GIB, type VramInput } from './logic';

const base: VramInput = { paramsB: 7, bits: 4, layers: 32, kvHeads: 8, headDim: 128, context: 8192, batch: 1, kvBits: 16, overheadPct: 0 };

describe('VRAM 추정', () => {
  it('7B 4비트 가중치: 7e9 × 0.5 = 3.5e9 바이트 (3.26 GiB)', () => {
    const r = estimate(base)!;
    expect(r.weights).toBe(3.5e9);
    expect(r.weights / GIB).toBeCloseTo(3.2596, 3);
  });
  it('KV 캐시 손계산: 2×32×8×128×8192×1×2 = 1 GiB', () => {
    const r = estimate(base)!;
    expect(r.kvPerToken).toBe(131072);
    expect(r.kv).toBe(GIB);
  });
  it('컨텍스트와 배치에 비례한다', () => {
    expect(estimate({ ...base, context: 16384, batch: 2 })!.kv).toBe(4 * GIB);
  });
  it('KV 8비트는 절반', () => {
    expect(estimate({ ...base, kvBits: 8 })!.kv).toBe(GIB / 2);
  });
  it('오버헤드는 (가중치+KV)의 비율, 합계 = 세 항목의 합', () => {
    const r = estimate({ ...base, overheadPct: 10 })!;
    expect(r.overhead).toBeCloseTo((3.5e9 + GIB) * 0.1, 0);
    expect(r.total).toBeCloseTo(r.weights + r.kv + r.overhead, 0);
  });
  it('FP16 70B 는 HF 문서의 2×X GB 규칙(140GB)과 일치', () => {
    expect(estimate({ ...base, paramsB: 70, bits: 16 })!.weights).toBe(140e9);
  });
  it('잘못된 입력은 null', () => {
    expect(estimate({ ...base, bits: 0 })).toBeNull();
    expect(estimate({ ...base, context: NaN })).toBeNull();
    expect(estimate({ ...base, overheadPct: 120 })).toBeNull();
  });
  it('GPU 적합 여부: 경계값 포함', () => {
    const f = fitList(8 * GIB);
    expect(f.map((x) => x.fits)).toEqual([true, true, true, true, true, true]);
    expect(fitList(8 * GIB + 1)[0].fits).toBe(false);
    expect(fitList(30 * GIB).map((x) => x.fits)).toEqual([false, false, false, false, true, true]);
  });
  it('프리셋 값이 정상 범위', () => {
    expect(PRESETS.length).toBe(13);
    for (const p of PRESETS) expect(estimate({ ...base, paramsB: p.paramsB, layers: p.layers, kvHeads: p.kvHeads, headDim: p.headDim })).not.toBeNull();
    const l = PRESETS.find((p) => p.id === 'llama31-8b')!;
    expect(estimate({ ...base, paramsB: l.paramsB, layers: l.layers, kvHeads: l.kvHeads, headDim: l.headDim })!.kv).toBe(GIB);
  });
});
