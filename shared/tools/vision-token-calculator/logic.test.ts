// 공식 문서의 예시 수치를 그대로 기대값으로 쓴다
import { describe, it, expect } from 'vitest';
import { openaiPatch, openaiTile, claudeResize, claudeTokens, gemini2Tokens, gemini3Tokens, compare, validInput, MODELS } from './logic';

const ASTRA = { mult: 1.2, highBox: 65535, budget: 2500 };

describe('OpenAI 패치 방식 (gpt-6-astra high 공식 예시)', () => {
  it.each([
    [1024, 1024, 1024, 1229, 1024, 1024],
    [2048, 2048, 2500, 3000, 1600, 1600],
    [4096, 512, 2048, 2458, 4096, 512],
  ])('%ix%i → 패치 %i, 토큰 %i', (w, h, p, t, rw, rh) => {
    const r = openaiPatch(w, h, 'high', ASTRA);
    expect(r.patches).toBe(p);
    expect(r.tokens).toBe(t);
    expect(r.size).toEqual({ w: rw, h: rh });
  });
  it('low 는 512 상자 안으로 줄인다', () => {
    const r = openaiPatch(1920, 1080, 'low', ASTRA);
    expect(r.size).toEqual({ w: 512, h: 288 });
    expect(r.tokens).toBe(Math.ceil(16 * 9 * 1.2));
  });
  it('예산을 넘으면 축소 후 패치 수가 예산 이하', () => {
    const r = openaiPatch(3840, 2160, 'high', { mult: 1.2, highBox: 2048, budget: 2500 });
    expect(r.patches).toBeLessThanOrEqual(2500);
  });
});

describe('OpenAI 타일 방식 (gpt-4o·gpt-4.1: 기본 85, 타일 170)', () => {
  const R = { base: 85, tile: 170 };
  it.each([
    [1024, 1024, 4, 765],
    [2048, 4096, 6, 1105],
    [512, 512, 1, 255],
  ])('%ix%i high → 타일 %i, 토큰 %i', (w, h, tiles, t) => {
    const r = openaiTile(w, h, 'high', R);
    expect(r.tiles).toBe(tiles);
    expect(r.tokens).toBe(t);
  });
  it('low 는 크기와 무관하게 기본 토큰', () => expect(openaiTile(4000, 3000, 'low', R).tokens).toBe(85));
});

describe('Anthropic (공식 표)', () => {
  it.each([
    [200, 200, 1568, 1568, 200, 200, 64],
    [1000, 1000, 1568, 1568, 1000, 1000, 1296],
    [1092, 1092, 1568, 1568, 1092, 1092, 1521],
    [1920, 1080, 1568, 1568, 1456, 819, 1560],
    // 공식 표는 1269x952 로 적었지만 같은 문서의 참고 구현은 1270x952 를 낸다(토큰은 1564 로 같다). 참고 구현을 따른다
    [2000, 1500, 1568, 1568, 1270, 952, 1564],
    [3840, 2160, 1568, 1568, 1456, 819, 1560],
    [1920, 1080, 2576, 4784, 1920, 1080, 2691],
    [2000, 1500, 2576, 4784, 2000, 1500, 3888],
    [3840, 2160, 2576, 4784, 2576, 1449, 4784],
  ])('%ix%i (한도 %i/%i) → %ix%i, %i 토큰', (w, h, e, t, rw, rh, tok) => {
    const r = claudeTokens(w, h, e, t);
    expect(r.size).toEqual({ w: rw, h: rh });
    expect(r.tokens).toBe(tok);
  });
  it('A4 130 DPI 예시 1075x1520 → 924x1307', () => expect(claudeResize(1075, 1520, 1568, 1568)).toEqual({ w: 924, h: 1307 }));
});

describe('Gemini', () => {
  it.each([[384, 384, 258], [100, 50, 258], [385, 200, 258], [1024, 1024, 1032], [1920, 1080, 1548]])('2.5 %ix%i → %i', (w, h, t) => expect(gemini2Tokens(w, h)).toBe(t));
  it('3 계열 media_resolution', () => { expect(gemini3Tokens('low')).toBe(280); expect(gemini3Tokens('high')).toBe(1120); });
});

describe('비교표', () => {
  it('모든 모델에 단가가 있고 비용 = 토큰 × 장수 × 단가', () => {
    const rows = compare(1000, 1000, 1000, 'high')!;
    expect(rows.length).toBe(MODELS.length);
    const opus = rows.find((r) => r.id === 'claude-opus-5.5')!;
    // 공식 문서: Opus 5.5 에서 1000×1000 이미지는 1,000장당 약 5.18달러
    expect(opus.cost).toBeCloseTo(5.184, 3);
    const haiku = rows.find((r) => r.id === 'claude-haiku-4.5')!;
    expect(haiku.cost).toBeCloseTo(1.296, 3);
  });
  it.each([[0, 10, 1], [10, 10, 0], [1.5, 10, 1], [70000, 10, 1], [NaN, 1, 1]])('잘못된 입력 %s', (w, h, n) => {
    expect(validInput(w, h, n)).toBe(false);
    expect(compare(w, h, n, 'high')).toBeNull();
  });
});
