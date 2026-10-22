// LLM API 가격표 (USD / 100만 토큰). 공식 가격 페이지에서 직접 확인한 값만 넣는다. 확인 못 한 값은 비워 둔다(undefined).
//
// 갱신 주기 메모
// - 4개 벤더 가격은 수시로 바뀐다. 최소 월 1회, 그리고 신모델 발표 때마다 아래 SOURCES 의 공식 페이지를 열어 대조하고 PRICES_CHECKED 를 고친다.
// - 가격이 예고된 모델(예: Gemini 3.6/3.8 Flash 는 2027-01-01 변경 예고)은 변경 후 값을 확인하기 전까지 넣지 않았다.
// - 필드: in 입력, out 출력, cacheRead 캐시 적중 입력 단가, batchIn/batchOut 배치 단가, batchCacheRead 배치+캐시 단가.
//   cacheRead 가 없으면 캐시 옵션을 적용하지 않고, batchIn 이 없으면 배치 옵션을 적용하지 않는다.
// - 캐시 쓰기 가산(Anthropic 5분 1.25배 등)·Gemini 캐시 저장료·긴 컨텍스트 구간 요금은 계산에 넣지 않는다(화면에도 고지).
export const PRICES_CHECKED = '2026-10-15';

export type Vendor = 'openai' | 'anthropic' | 'google' | 'mistral' | 'deepseek';

export interface ModelPrice {
  id: string;
  vendor: Vendor;
  name: string;
  in: number;
  out: number;
  cacheRead?: number;
  batchIn?: number;
  batchOut?: number;
  batchCacheRead?: number;
  /** 가격 조건 메모 키(up100k, up200k, peak, offpeak). 화면에서는 labels 의 note_<키> 로 번역해 모델명 옆 괄호로 표시 */
  note?: string;
}

export const SOURCES: Record<Vendor, string> = {
  openai: 'https://developers.openai.com/api/docs/pricing',
  anthropic: 'https://platform.claude.com/docs/en/about-claude/pricing',
  google: 'https://ai.google.dev/gemini-api/docs/pricing',
  mistral: 'https://docs.mistral.ai/inference/pricing',
  deepseek: 'https://api-docs.deepseek.com/quick_start/pricing',
};

export const VENDOR_NAME: Record<Vendor, string> = { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', mistral: 'Mistral', deepseek: 'DeepSeek' };

// OpenAI: 표준(Standard) 티어, 입력 272K 이하. 배치는 표준의 50%(캐시 입력 포함)
const oa = (id: string, name: string, i: number, c: number, o: number): ModelPrice =>
  ({ id, vendor: 'openai', name, in: i, out: o, cacheRead: c, batchIn: i / 2, batchOut: o / 2, batchCacheRead: c / 2 });
// Anthropic: 배치 50% (공식 표와 일치), 배치+캐시 적중은 할인이 겹친다고 명시되어 캐시 적중가의 50%
const an = (id: string, name: string, i: number, c: number, o: number, note?: string): ModelPrice =>
  ({ id, vendor: 'anthropic', name, in: i, out: o, cacheRead: c, batchIn: i / 2, batchOut: o / 2, batchCacheRead: c / 2, note });
// Google: 배치 표의 값(입력/출력 각각 표준의 50%), 배치 캐시 단가는 표준과 같다
const gg = (id: string, name: string, i: number, c: number, o: number, note?: string): ModelPrice =>
  ({ id, vendor: 'google', name, in: i, out: o, cacheRead: c, batchIn: i / 2, batchOut: o / 2, batchCacheRead: c, note });
// Mistral: 캐시 단가 미확인(공식 가격표에 없음) → 캐시 옵션 없음. 배치 50%는 mistral.ai/pricing 문구 기준
const mi = (id: string, name: string, i: number, o: number): ModelPrice =>
  ({ id, vendor: 'mistral', name, in: i, out: o, batchIn: i / 2, batchOut: o / 2 });

export const PRICES: ModelPrice[] = [
  oa('gpt-6-astra', 'GPT-6 Astra', 10, 1, 50),
  oa('gpt-6.1-sol', 'GPT-6.1 Sol', 2, 0.1, 10),
  oa('gpt-6-luna', 'GPT-6 Luna', 0.1, 0.01, 0.5),
  oa('gpt-5.6-sol', 'GPT-5.6 Sol', 4, 0.4, 20),
  oa('gpt-5.5', 'GPT-5.5', 5, 0.5, 30),
  oa('gpt-5.4-mini', 'GPT-5.4 mini', 0.75, 0.075, 4.5),
  oa('gpt-5-mini', 'GPT-5 mini', 0.25, 0.025, 2),
  oa('gpt-4.1', 'GPT-4.1', 2, 0.5, 8),
  oa('gpt-4o-mini', 'GPT-4o mini', 0.15, 0.075, 0.6),
  an('claude-fable-5.1', 'Claude Fable 5.1', 10, 0.25, 50),
  an('claude-opus-5.5', 'Claude Opus 5.5', 4, 0.2, 20),
  an('claude-sonnet-5.5', 'Claude Sonnet 5.5', 2, 0.1, 10),
  an('claude-haiku-5.5', 'Claude Haiku 5.5', 0.1, 0.01, 0.5, 'up100k'),
  an('claude-haiku-4.5', 'Claude Haiku 4.5', 1, 0.1, 5),
  gg('gemini-3.1-pro', 'Gemini 3.1 Pro Preview', 2, 0.2, 12, 'up200k'),
  gg('gemini-3-flash', 'Gemini 3 Flash Preview', 0.5, 0.05, 3),
  gg('gemini-2.5-pro', 'Gemini 2.5 Pro', 1.25, 0.125, 10, 'up200k'),
  gg('gemini-2.5-flash', 'Gemini 2.5 Flash', 0.3, 0.03, 2.5),
  gg('gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 0.25, 0.025, 1.5),
  gg('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 0.1, 0.01, 0.4),
  mi('mistral-large-3', 'Mistral Large 3', 0.5, 1.5),
  mi('mistral-medium-3.5', 'Mistral Medium 3.5', 1.5, 7.5),
  mi('mistral-small-4', 'Mistral Small 4', 0.15, 0.6),
  // DeepSeek: 피크 시간(UTC 평일 01-04, 06-10)은 오프피크의 2배. 배치 할인 없음
  { id: 'deepseek-flash-off', vendor: 'deepseek', name: 'DeepSeek V4.1 Flash', in: 0.15, out: 0.6, cacheRead: 0.003, note: 'offpeak' },
  { id: 'deepseek-flash-peak', vendor: 'deepseek', name: 'DeepSeek V4.1 Flash', in: 0.3, out: 1.2, cacheRead: 0.006, note: 'peak' },
  { id: 'deepseek-pro-off', vendor: 'deepseek', name: 'DeepSeek V4 Pro', in: 0.66, out: 1.98, cacheRead: 0.022, note: 'offpeak' },
  { id: 'deepseek-pro-peak', vendor: 'deepseek', name: 'DeepSeek V4 Pro', in: 1.32, out: 3.96, cacheRead: 0.044, note: 'peak' },
];
