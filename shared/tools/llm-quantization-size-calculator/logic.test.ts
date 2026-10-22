import { describe, it, expect } from 'vitest';
import { compareQuants, toGiB, QUANTS } from './logic';

// Llama 3.1 8B (8.03B, 32층, KV 8, 헤드 128)
const L8 = { paramsB: 8.03, layers: 32, kvHeads: 8, headDim: 128, context: 8192, kvBits: 16, overheadPct: 0 };

describe('llama.cpp README 의 Llama-3.1-8B 파일 크기(GiB)와 일치', () => {
  const rows = compareQuants(L8)!;
  it.each([
    ['f16', 14.96], ['q8_0', 7.95], ['q6_k', 6.14], ['q5_k_m', 5.33], ['q4_k_m', 4.58], ['q3_k_m', 3.74], ['q2_k', 2.95],
  ])('%s ≈ %s GiB', (id, gib) => expect(toGiB(rows.find((r) => r.id === id)!.file)).toBeCloseTo(gib, 1));
  it('KV 캐시 8,192 토큰 FP16 = 1 GiB', () => expect(toGiB(rows[0].mem.kv)).toBeCloseTo(1, 9));
  it('합계 = 파일 + KV (오버헤드 0)', () => { for (const r of rows) expect(r.mem.total).toBeCloseTo(r.file + r.mem.kv, 3); });
  it('F16 대비 비율', () => expect(rows.find((r) => r.id === 'q4_k_m')!.vsF16).toBeCloseTo(4.8944 / 16.0005, 9));
});

describe('입력 검증', () => {
  it.each([{ paramsB: 0 }, { context: -1 }, { overheadPct: 101 }, { layers: NaN }])('%o → null', (bad) => expect(compareQuants({ ...L8, ...bad })).toBeNull());
  it('양자화 7종, bpw 내림차순', () => {
    expect(QUANTS.length).toBe(7);
    for (let i = 1; i < QUANTS.length; i++) expect(QUANTS[i].bpw).toBeLessThan(QUANTS[i - 1].bpw);
  });
});
