// 이미지 입력 토큰 계산 순수 함수. 규칙은 각 벤더 공식 문서를 그대로 옮겼다 (확인일 VISION_CHECKED).
//  OpenAI 패치 방식: developers.openai.com/api/docs/guides/images-vision (32px 패치, 패치 예산 축소, 배수 곱 후 올림)
//  OpenAI 타일 방식: 같은 문서 (2048 상자 → 짧은 변 768 → 512px 타일 × 타일 토큰 + 기본 토큰, low 는 기본 토큰만)
//  Anthropic: platform.claude.com/docs/en/build-with-claude/vision, vision-coordinates (28px 패치, 긴 변·토큰 한도 이진 탐색)
//  Gemini 3: ai.google.dev/gemini-api/docs/media-resolution (해상도 단계별 고정 토큰)
//  Gemini 2.5: ai.google.dev/gemini-api/docs/tokens (양 변 384px 이하 258, 그 외 768×768 타일당 258)
import { PRICES } from '../llm-api-cost-calculator/prices';

export const VISION_CHECKED = '2026-10-16';
export type Detail = 'low' | 'high';

export type Rule =
  | { kind: 'oa-patch'; mult: number; highBox: number; budget: number }
  | { kind: 'oa-tile'; base: number; tile: number }
  | { kind: 'claude'; maxEdge: number; maxTokens: number }
  | { kind: 'gemini3' }
  | { kind: 'gemini2' };

export interface VisionModel { id: string; name: string; priceId: string; rule: Rule }

export const MODELS: VisionModel[] = [
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', priceId: 'gpt-6-astra', rule: { kind: 'oa-patch', mult: 1.2, highBox: 65535, budget: 2500 } },
  { id: 'gpt-5.5', name: 'GPT-5.5', priceId: 'gpt-5.5', rule: { kind: 'oa-patch', mult: 1.2, highBox: 2048, budget: 2500 } },
  { id: 'gpt-4.1', name: 'GPT-4.1', priceId: 'gpt-4.1', rule: { kind: 'oa-tile', base: 85, tile: 170 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', priceId: 'gpt-4o-mini', rule: { kind: 'oa-tile', base: 2833, tile: 5667 } },
  // Claude 4.7 이후 모델은 고해상도 등급(2576px, 4784토큰), 그 외는 표준 등급(1568px, 1568토큰)
  { id: 'claude-opus-5.5', name: 'Claude Opus 5.5', priceId: 'claude-opus-5.5', rule: { kind: 'claude', maxEdge: 2576, maxTokens: 4784 } },
  { id: 'claude-sonnet-5.5', name: 'Claude Sonnet 5.5', priceId: 'claude-sonnet-5.5', rule: { kind: 'claude', maxEdge: 2576, maxTokens: 4784 } },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', priceId: 'claude-haiku-4.5', rule: { kind: 'claude', maxEdge: 1568, maxTokens: 1568 } },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro Preview', priceId: 'gemini-3.1-pro', rule: { kind: 'gemini3' } },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash Preview', priceId: 'gemini-3-flash', rule: { kind: 'gemini3' } },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', priceId: 'gemini-2.5-flash', rule: { kind: 'gemini2' } },
];

export interface Size { w: number; h: number }

// 상자 안에 비율을 지켜 맞춘다. 확대하지 않고 내림
function fitBox(w: number, h: number, box: number): Size {
  if (w <= box && h <= box) return { w, h };
  const s = Math.min(box / w, box / h);
  return { w: Math.max(1, Math.floor(w * s)), h: Math.max(1, Math.floor(h * s)) };
}

const patches = (w: number, h: number, p: number) => Math.ceil(w / p) * Math.ceil(h / p);

/** OpenAI 패치 방식: 픽셀 한도 → 패치 수 → 예산 초과 시 축소 → 배수 곱 올림 */
export function openaiPatch(w: number, h: number, detail: Detail, r: { mult: number; highBox: number; budget: number }): { size: Size; patches: number; tokens: number } {
  let s = fitBox(w, h, detail === 'low' ? 512 : r.highBox);
  let n = patches(s.w, s.h, 32);
  if (detail === 'high' && n > r.budget) {
    const shrink = Math.sqrt((32 * 32 * r.budget) / (s.w * s.h));
    const fw = (s.w * shrink) / 32, fh = (s.h * shrink) / 32;
    const adj = shrink * Math.min(Math.floor(fw) / fw, Math.floor(fh) / fh);
    s = { w: Math.max(1, Math.floor(s.w * adj)), h: Math.max(1, Math.floor(s.h * adj)) };
    n = patches(s.w, s.h, 32);
  }
  return { size: s, patches: n, tokens: Math.ceil(n * r.mult) };
}

/** OpenAI 타일 방식: low 는 기본 토큰만, high 는 2048 상자 → 짧은 변 768 → 512 타일 */
export function openaiTile(w: number, h: number, detail: Detail, r: { base: number; tile: number }): { size: Size; tiles: number; tokens: number } {
  if (detail === 'low') return { size: { w, h }, tiles: 0, tokens: r.base };
  let s = fitBox(w, h, 2048);
  const short = Math.min(s.w, s.h);
  if (short > 768) {
    const k = 768 / short;
    s = s.w <= s.h ? { w: 768, h: Math.floor(s.h * k) } : { w: Math.floor(s.w * k), h: 768 };
  }
  const tiles = patches(s.w, s.h, 512);
  return { size: s, tiles, tokens: r.base + tiles * r.tile };
}

// Python round() 와 같은 짝수 반올림 (Anthropic 참고 구현과 동일)
function roundEven(v: number): number {
  const f = Math.floor(v);
  return v - f !== 0.5 ? Math.round(v) : f % 2 === 0 ? f : f + 1;
}

/** Anthropic 참고 구현 resizedSize 그대로: 두 한도를 모두 만족하는 가장 큰 비율 유지 크기 */
export function claudeResize(w: number, h: number, maxEdge: number, maxTokens: number): Size {
  const fits = (a: number, b: number) => Math.ceil(a / 28) * 28 <= maxEdge && Math.ceil(b / 28) * 28 <= maxEdge && patches(a, b, 28) <= maxTokens;
  if (fits(w, h)) return { w, h };
  if (h > w) { const r = claudeResize(h, w, maxEdge, maxTokens); return { w: r.h, h: r.w }; }
  const ar = w / h;
  let lo = 1, hi = w;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid, Math.max(roundEven(mid / ar), 1))) lo = mid; else hi = mid;
  }
  return { w: lo, h: Math.max(roundEven(lo / ar), 1) };
}

export function claudeTokens(w: number, h: number, maxEdge: number, maxTokens: number): { size: Size; tokens: number } {
  const size = claudeResize(w, h, maxEdge, maxTokens);
  return { size, tokens: patches(size.w, size.h, 28) };
}

/** Gemini 3: media_resolution low 280, 기본(unspecified)·high 1120 */
export const gemini3Tokens = (detail: Detail) => (detail === 'low' ? 280 : 1120);
/** Gemini 2.5: 양 변 384 이하면 258, 아니면 768×768 타일 수 × 258 */
export const gemini2Tokens = (w: number, h: number) => (w <= 384 && h <= 384 ? 258 : patches(w, h, 768) * 258);

export function tokensFor(m: VisionModel, w: number, h: number, detail: Detail): { tokens: number; size: Size | null } {
  const r = m.rule;
  switch (r.kind) {
    case 'oa-patch': { const x = openaiPatch(w, h, detail, r); return { tokens: x.tokens, size: x.size }; }
    case 'oa-tile': { const x = openaiTile(w, h, detail, r); return { tokens: x.tokens, size: detail === 'low' ? null : x.size }; }
    case 'claude': { const x = claudeTokens(w, h, r.maxEdge, r.maxTokens); return { tokens: x.tokens, size: x.size }; }
    case 'gemini3': return { tokens: gemini3Tokens(detail), size: null };
    case 'gemini2': return { tokens: gemini2Tokens(w, h), size: null };
  }
}

export interface Row { id: string; name: string; perImage: number; total: number; cost: number; price: number; size: Size | null }

export const validInput = (w: number, h: number, n: number) =>
  [w, h, n].every((x) => Number.isInteger(x) && x >= 1) && w <= 65535 && h <= 65535 && n <= 1e7;

/** 모든 모델의 장당 토큰·총 토큰·입력 비용(USD). 단가는 llm-api-cost-calculator 가격표의 표준 입력 단가 */
export function compare(w: number, h: number, n: number, detail: Detail): Row[] | null {
  if (!validInput(w, h, n)) return null;
  return MODELS.map((m) => {
    const { tokens, size } = tokensFor(m, w, h, detail);
    const price = PRICES.find((p) => p.id === m.priceId)!.in;
    return { id: m.id, name: m.name, perImage: tokens, total: tokens * n, cost: (tokens * n * price) / 1e6, price, size };
  });
}
