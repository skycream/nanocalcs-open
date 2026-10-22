// 모델별 컨텍스트 창. 값은 공식 문서에서 직접 확인한 것만 넣는다 (확인일 2026-10-15).
// tokenizer: 'o200k' = OpenAI 공개 인코딩으로 계산, 'o200k-ref' = 토크나이저 미공개라 o200k 를 참고값으로 사용,
//            'claude' · 'gemini' = 공식 문서 비율로 추정
export type Tokenizer = 'o200k' | 'o200k-ref' | 'claude' | 'gemini';
export interface ModelInfo {
  id: string;           // API 모델 코드
  name: string;
  vendor: 'OpenAI' | 'Anthropic' | 'Google';
  context: number;      // 컨텍스트 창 (토큰)
  maxOutput: number;    // 최대 출력 (토큰)
  tokenizer: Tokenizer;
  source: string;       // 확인한 공식 문서 URL
  checked: string;      // 확인일
}
const D = '2026-10-15';
const CLAUDE = 'https://platform.claude.com/docs/en/about-claude/models/overview';
const OA = 'https://developers.openai.com/api/docs/models/';
const GG = 'https://ai.google.dev/gemini-api/docs/models/';

export const MODELS: ModelInfo[] = [
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', vendor: 'Anthropic', context: 1_000_000, maxOutput: 128_000, tokenizer: 'claude', source: CLAUDE, checked: D },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', vendor: 'Anthropic', context: 1_000_000, maxOutput: 128_000, tokenizer: 'claude', source: CLAUDE, checked: D },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', vendor: 'Anthropic', context: 1_000_000, maxOutput: 128_000, tokenizer: 'claude', source: CLAUDE, checked: D },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', vendor: 'Anthropic', context: 1_000_000, maxOutput: 128_000, tokenizer: 'claude', source: CLAUDE, checked: D },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', vendor: 'OpenAI', context: 1_050_000, maxOutput: 128_000, tokenizer: 'o200k-ref', source: OA + 'gpt-6-astra', checked: D },
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', vendor: 'OpenAI', context: 1_050_000, maxOutput: 128_000, tokenizer: 'o200k-ref', source: OA + 'gpt-6.1-sol', checked: D },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', vendor: 'OpenAI', context: 1_050_000, maxOutput: 128_000, tokenizer: 'o200k-ref', source: OA + 'gpt-6-luna', checked: D },
  { id: 'gpt-4.1', name: 'GPT-4.1', vendor: 'OpenAI', context: 1_047_576, maxOutput: 32_768, tokenizer: 'o200k', source: OA + 'gpt-4.1', checked: D },
  { id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI', context: 128_000, maxOutput: 16_384, tokenizer: 'o200k', source: OA + 'gpt-4o', checked: D },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', vendor: 'Google', context: 1_048_576, maxOutput: 65_536, tokenizer: 'gemini', source: GG + 'gemini-3.8-flash', checked: D },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (preview)', vendor: 'Google', context: 1_048_576, maxOutput: 65_536, tokenizer: 'gemini', source: GG + 'gemini-3.1-pro-preview', checked: D },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vendor: 'Google', context: 1_048_576, maxOutput: 65_536, tokenizer: 'gemini', source: GG + 'gemini-2.5-pro', checked: D },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vendor: 'Google', context: 1_048_576, maxOutput: 65_536, tokenizer: 'gemini', source: GG + 'gemini-2.5-flash', checked: D },
];

/** 토큰당 단어 수(수동 토큰 입력 시 환산용). Claude 0.555·Gemini 0.6~0.8 의 중간 0.7 은 문서 값, OpenAI 0.75 는 통용되는 어림값(공식 문서 미확인) */
export const WORDS_PER_TOKEN: Record<Tokenizer, number> = { claude: 0.555, gemini: 0.7, o200k: 0.75, 'o200k-ref': 0.75 };
export const DEFAULT_WORDS_PER_PAGE = 500;
