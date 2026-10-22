// 로컬 LLM 추론 VRAM 추정 순수 함수. 모든 메모리는 바이트로 계산하고 GiB(2^30)로 표시한다.
// 가중치 = 파라미터 × 비트 / 8
// KV 캐시 = 2 × 레이어 × KV헤드 × 헤드차원 × 컨텍스트 × 배치 × 바이트
export const GIB = 2 ** 30;
export const GPU_SIZES = [8, 12, 16, 24, 48, 80] as const;

export interface Preset { id: string; name: string; paramsB: number; layers: number; kvHeads: number; headDim: number; maxCtx: number }
// 레이어·KV헤드·헤드차원 출처
//  Qwen/Mistral/Phi: 각 Hugging Face 저장소 config.json (hidden_size / num_attention_heads 로 헤드차원 계산, head_dim 있으면 그 값)
//  Llama 3.1: Meta, The Llama 3 Herd of Models (arXiv 2407.21783) Table 3 (공식 config.json 은 게이트라 직접 확인 불가)
//  Gemma 2: Gemma 2 기술 보고서 (arXiv 2408.00118) Table 1
// 파라미터 수: Hugging Face 모델 API 의 safetensors.total
export const PRESETS: Preset[] = [
  { id: 'llama31-8b', name: 'Llama 3.1 8B', paramsB: 8.03, layers: 32, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'llama31-70b', name: 'Llama 3.1 70B', paramsB: 70.55, layers: 80, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'qwen25-7b', name: 'Qwen2.5 7B', paramsB: 7.62, layers: 28, kvHeads: 4, headDim: 128, maxCtx: 131072 },
  { id: 'qwen25-14b', name: 'Qwen2.5 14B', paramsB: 14.77, layers: 48, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'qwen25-32b', name: 'Qwen2.5 32B', paramsB: 32.76, layers: 64, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'qwen25-72b', name: 'Qwen2.5 72B', paramsB: 72.71, layers: 80, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'qwen3-8b', name: 'Qwen3 8B', paramsB: 8.19, layers: 36, kvHeads: 8, headDim: 128, maxCtx: 40960 },
  { id: 'qwen3-32b', name: 'Qwen3 32B', paramsB: 32.76, layers: 64, kvHeads: 8, headDim: 128, maxCtx: 40960 },
  { id: 'mistral-7b', name: 'Mistral 7B v0.3', paramsB: 7.25, layers: 32, kvHeads: 8, headDim: 128, maxCtx: 32768 },
  { id: 'mistral-nemo', name: 'Mistral Nemo 12B', paramsB: 12.25, layers: 40, kvHeads: 8, headDim: 128, maxCtx: 131072 },
  { id: 'gemma2-9b', name: 'Gemma 2 9B', paramsB: 9.24, layers: 42, kvHeads: 8, headDim: 256, maxCtx: 8192 },
  { id: 'gemma2-27b', name: 'Gemma 2 27B', paramsB: 27.23, layers: 46, kvHeads: 16, headDim: 128, maxCtx: 8192 },
  { id: 'phi4-14b', name: 'Phi-4 14B', paramsB: 14.66, layers: 40, kvHeads: 10, headDim: 128, maxCtx: 16384 },
];

export interface VramInput { paramsB: number; bits: number; layers: number; kvHeads: number; headDim: number; context: number; batch: number; kvBits: number; overheadPct: number }
export interface VramResult { weights: number; kv: number; overhead: number; total: number; kvPerToken: number }

export function validate(i: VramInput): boolean {
  const pos = [i.paramsB, i.bits, i.layers, i.kvHeads, i.headDim, i.context, i.batch, i.kvBits];
  return pos.every((n) => Number.isFinite(n) && n > 0) && Number.isFinite(i.overheadPct) && i.overheadPct >= 0 && i.overheadPct <= 100;
}

export function estimate(i: VramInput): VramResult | null {
  if (!validate(i)) return null;
  const weights = (i.paramsB * 1e9 * i.bits) / 8;
  const kvPerToken = 2 * i.layers * i.kvHeads * i.headDim * (i.kvBits / 8);
  const kv = kvPerToken * i.context * i.batch;
  const overhead = (weights + kv) * (i.overheadPct / 100);
  return { weights, kv, overhead, total: weights + kv + overhead, kvPerToken };
}

export interface Fit { gb: number; fits: boolean; free: number }
// 흔한 GPU(제조사 표기 GB 를 GiB 로 취급): 총량이 용량 이하이면 적합
export const fitList = (totalBytes: number): Fit[] => GPU_SIZES.map((gb) => ({ gb, fits: totalBytes <= gb * GIB, free: gb - totalBytes / GIB }));
