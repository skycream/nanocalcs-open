// 토큰 수 계산. OpenAI 인코딩은 js-tiktoken 으로 정확히 세고(tiktoken.ts), 공개 토크나이저가 없는 계열은 공식 문서의 비율로 추정한다.

export type Family = 'claude' | 'gemini';

/** 추정 비율: 문서에 적힌 값만 쓴다. perChar = 글자당 토큰, perWord = 단어당 토큰 */
export interface RatioSet { perChar?: number[]; perWord?: number[] }
// Claude: models/overview 의 "1M tokens is roughly 555k words or 2.5M Unicode characters" (Opus 4.7 이후 토크나이저)
// Gemini: ai.google.dev/gemini-api/docs/tokens 의 "a token is about 4 characters. 100 tokens is about 60-80 English words"
export const RATIOS: Record<Family, RatioSet> = {
  claude: { perChar: [1 / 2.5], perWord: [1 / 0.555] },
  gemini: { perChar: [1 / 4], perWord: [100 / 80, 100 / 60] },
};

/** 글자 수(유니코드 코드 포인트) */
export function countChars(text: string): number {
  let n = 0;
  for (const _ of text) n++;
  return n;
}

/** 줄 수: 빈 문자열은 0 */
export function countLines(text: string): number {
  return text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
}

/** 단어 수: Intl.Segmenter 가 있으면 단어 단위, 없으면 공백으로 나눈 덩어리 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<{ isWordLike?: boolean }> } }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const s of new Seg(undefined, { granularity: 'word' }).segment(text)) if (s.isWordLike) n++;
    return n;
  }
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export interface Estimate { tokens: number; low: number; high: number }

/** 추정 토큰 수. 대표값은 방법들 중 가장 큰 값(컨텍스트에 넣을 때 안전한 쪽), 범위는 최소~최대 */
export function estimateTokens(chars: number, words: number, family: Family): Estimate {
  const r = RATIOS[family];
  const vals = [...(r.perChar ?? []).map((k) => chars * k), ...(r.perWord ?? []).map((k) => words * k)].map((v) => Math.ceil(v));
  if (chars === 0) return { tokens: 0, low: 0, high: 0 };
  return { tokens: Math.max(...vals), low: Math.min(...vals), high: Math.max(...vals) };
}

export interface ContextUse { pct: number; remaining: number; over: boolean; fits: boolean }

/** 컨텍스트 창 사용률. 출력용으로 떼어 둔 토큰(reserve)을 뺀 입력 한도 기준으로 남는 토큰을 계산 */
export function contextUse(tokens: number, window: number, reserve = 0): ContextUse | null {
  if (![tokens, window, reserve].every(Number.isFinite) || tokens < 0 || window <= 0 || reserve < 0) return null;
  const pct = (tokens / window) * 100;
  const remaining = window - reserve - tokens;
  return { pct, remaining, over: tokens > window, fits: remaining >= 0 };
}

/** 토큰 → 단어 → 쪽 수 환산 */
export function tokensToWords(tokens: number, wordsPerToken: number): number {
  return Math.max(0, Math.floor(tokens * wordsPerToken));
}
export function wordsToPages(words: number, wordsPerPage: number): number {
  return wordsPerPage > 0 ? Math.floor(words / wordsPerPage) : 0;
}
