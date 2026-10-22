import { describe, it, expect } from 'vitest';
import { compareQuants, toGiB, estimate, fitList, PRESETS, QUANTS } from '../src/index';

describe('공개 API', () => {
  it('Llama 3.1 8B Q4_K_M 약 4.58 GiB', () => {
    const p = PRESETS.find((x) => x.id === 'llama31-8b')!;
    const rows = compareQuants({ paramsB: p.paramsB, layers: p.layers, kvHeads: p.kvHeads, headDim: p.headDim, context: 8192, kvBits: 16, overheadPct: 0 })!;
    expect(toGiB(rows.find((r) => r.id === 'q4_k_m')!.file)).toBeCloseTo(4.58, 1);
    expect(rows).toHaveLength(QUANTS.length);
  });
  it('estimate 가 잘못된 입력에 null', () => {
    expect(estimate({ paramsB: -1, bits: 4, layers: 1, kvHeads: 1, headDim: 1, context: 1, batch: 1, kvBits: 16, overheadPct: 0 })).toBeNull();
  });
  it('fitList 는 GPU 6종', () => expect(fitList(1e9)).toHaveLength(6));
});
