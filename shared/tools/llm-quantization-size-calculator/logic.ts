// GGUF 양자화 비교 순수 함수. 가중치·KV 캐시·오버헤드 식은 gpu-vram-calculator 의 estimate 를 그대로 쓴다.
// 비트당 실효값(bpw) 출처: llama.cpp tools/quantize/README.md 의 meta-llama/Llama-3.1-8B 표 "bits/weight" (확인일 QUANT_CHECKED)
//  K-quant 는 블록마다 배율·최솟값을 따로 저장하고, 일부 텐서(임베딩·출력층 등)를 더 높은 비트로 남기므로 이름의 숫자보다 bpw 가 크다.
//  같은 이름이라도 모델 구조에 따라 bpw 가 조금씩 다르다(이 값은 Llama 3.1 8B 측정치)
import { estimate, GIB, type VramResult } from '../gpu-vram-calculator/logic';

export const QUANT_CHECKED = '2026-10-16';

export const QUANTS: { id: string; name: string; bpw: number }[] = [
  { id: 'f16', name: 'F16', bpw: 16.0005 },
  { id: 'q8_0', name: 'Q8_0', bpw: 8.5008 },
  { id: 'q6_k', name: 'Q6_K', bpw: 6.5633 },
  { id: 'q5_k_m', name: 'Q5_K_M', bpw: 5.7036 },
  { id: 'q4_k_m', name: 'Q4_K_M', bpw: 4.8944 },
  { id: 'q3_k_m', name: 'Q3_K_M', bpw: 3.996 },
  { id: 'q2_k', name: 'Q2_K', bpw: 3.1593 },
];

export interface QuantInput { paramsB: number; layers: number; kvHeads: number; headDim: number; context: number; kvBits: number; overheadPct: number }
export interface QuantRow { id: string; name: string; bpw: number; file: number; mem: VramResult; vsF16: number }

/** 양자화별 파일 크기(바이트)와 필요 메모리. 잘못된 값이면 null */
export function compareQuants(i: QuantInput): QuantRow[] | null {
  const rows: QuantRow[] = [];
  for (const q of QUANTS) {
    const mem = estimate({ paramsB: i.paramsB, bits: q.bpw, layers: i.layers, kvHeads: i.kvHeads, headDim: i.headDim, context: i.context, batch: 1, kvBits: i.kvBits, overheadPct: i.overheadPct });
    if (!mem) return null;
    rows.push({ id: q.id, name: q.name, bpw: q.bpw, file: mem.weights, mem, vsF16: q.bpw / QUANTS[0].bpw });
  }
  return rows;
}

export const toGiB = (bytes: number) => bytes / GIB;
