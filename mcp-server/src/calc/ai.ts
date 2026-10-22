// AI 계산: 토큰 수, 컨텍스트 창 적합, API 비용, GPU VRAM. 사이트 logic.ts·가격표·모델표를 그대로 쓴다.
import { countChars, countWords, estimateTokens, contextUse } from '../../../shared/tools/token-counter/logic';
import { countExact, type Encoding } from '../../../shared/tools/token-counter/tiktoken';
import { MODELS } from '../../../shared/tools/context-window-calculator/models';
import { cost, compare, type UsageInput } from '../../../shared/tools/llm-api-cost-calculator/logic';
import { PRICES, PRICES_CHECKED, SOURCES } from '../../../shared/tools/llm-api-cost-calculator/prices';
import { estimate, fitList, PRESETS, GIB } from '../../../shared/tools/gpu-vram-calculator/logic';
import { sourceUrl, ToolInputError } from '../catalog';

export const MAX_TEXT_CHARS = 2_000_000;
const gib = (b: number) => Math.round((b / GIB) * 100) / 100;
const usd = (n: number) => Number(n.toPrecision(6));

function checkText(text: string) {
  if (text.length > MAX_TEXT_CHARS) throw new ToolInputError(`text is longer than ${MAX_TEXT_CHARS} characters`);
}

export async function tokenCount(i: { text: string; encoding?: Encoding; locale?: string }) {
  checkText(i.text);
  const enc = i.encoding ?? 'o200k_base';
  const chars = countChars(i.text), words = countWords(i.text);
  return {
    tokens: await countExact(i.text, enc), encoding: enc,
    characters: chars, words,
    estimates: { claude: estimateTokens(chars, words, 'claude'), gemini: estimateTokens(chars, words, 'gemini') },
    note: `${enc} is exact (OpenAI tiktoken). Claude and Gemini tokenizers are not public; their numbers are estimates from ratios in the vendors' docs.`,
    // 텍스트가 길면(40자 초과 등) 링크에 넣지 않는다. 링크는 도구 페이지만 연다
    source_url: sourceUrl('token-counter', { text: i.text, enc }, i.locale),
  };
}

export async function contextFit(i: { tokens?: number; text?: string; reserve?: number; model?: string; locale?: string }) {
  let tokens = i.tokens;
  if (tokens === undefined) {
    if (i.text === undefined) throw new ToolInputError('give either tokens or text');
    checkText(i.text);
    tokens = await countExact(i.text, 'o200k_base');
  }
  const reserve = i.reserve ?? 0;
  const models = i.model ? MODELS.filter((m) => m.id === i.model) : MODELS;
  if (!models.length) throw new ToolInputError(`unknown model "${i.model}". Models: ${MODELS.map((m) => m.id).join(', ')}`);
  const rows = models.map((m) => {
    const u = contextUse(tokens!, m.context, reserve);
    if (!u) throw new ToolInputError('tokens and reserve must be non-negative numbers');
    return { model: m.id, name: m.name, context_window: m.context, max_output: m.maxOutput, used_percent: Math.round(u.pct * 100) / 100, remaining: u.remaining, fits: u.fits, source: m.source, checked: m.checked };
  });
  return {
    tokens, reserve, counted_from_text: i.tokens === undefined, models: rows,
    source_url: sourceUrl('context-window-calculator', { tokens, reserve }, i.locale),
  };
}

export const PRICE_IDS = PRICES.map((p) => p.id);

export function llmCost(i: { model?: string; input: number; output: number; requests: number; per?: 'day' | 'month'; cache?: boolean; hit?: number; batch?: boolean; locale?: string }) {
  const u: UsageInput = { inTokens: i.input, outTokens: i.output, requests: i.requests, period: i.per ?? 'day', cache: i.cache ?? false, cacheHitPct: i.hit ?? 0, batch: i.batch ?? false };
  const link = (model?: string) => sourceUrl('llm-api-cost-calculator', { ...(model ? { model } : {}), input: i.input, output: i.output, requests: i.requests, per: u.period, cache: u.cache, hit: u.cacheHitPct, batch: u.batch }, i.locale);
  const meta = { prices_checked: PRICES_CHECKED, currency: 'USD', note: 'List prices per 1M tokens. Excludes cache-write surcharges, long-context tiers and taxes. A month is 30 days.' };
  if (!i.model) {
    const all = compare(PRICES, u);
    if (!all.length) throw new ToolInputError(errText(cost(PRICES[0], u)));
    return {
      cheapest: all.slice(0, 10).map(({ model, res }) => ({ model: model.id, name: model.name, per_request: usd(res.perRequest), daily: usd(res.daily), monthly: usd(res.monthly), cache_applied: res.cacheApplied, batch_applied: res.batchApplied })),
      ...meta, source_url: link(),
    };
  }
  const m = PRICES.find((p) => p.id === i.model);
  if (!m) throw new ToolInputError(`unknown model "${i.model}". Models: ${PRICE_IDS.join(', ')}`);
  const r = cost(m, u);
  if (!r.ok) throw new ToolInputError(errText(r));
  return {
    model: m.id, name: m.name, per_request: usd(r.perRequest), daily: usd(r.daily), monthly: usd(r.monthly), yearly: usd(r.yearly),
    input_rate_per_1m: usd(r.inRate), output_rate_per_1m: usd(r.outRate), cache_applied: r.cacheApplied, batch_applied: r.batchApplied,
    price_source: SOURCES[m.vendor], ...meta, source_url: link(m.id),
  };
}

function errText(r: ReturnType<typeof cost>): string {
  if (r.ok) return 'unexpected';
  if (r.error === 'zero') return 'input and output tokens cannot both be 0';
  if (r.field === 'cacheHit') return 'hit (cache hit %) must be 0..100';
  return `${r.field === 'inTokens' ? 'input' : r.field === 'outTokens' ? 'output' : 'requests'} must be a non-negative number`;
}

export const PRESET_IDS = PRESETS.map((p) => p.id);

export interface VramArgs { model?: string; params_b?: number; bits?: number; layers?: number; kv_heads?: number; head_dim?: number; context?: number; batch?: number; kv_bits?: 16 | 8 | 4; overhead_pct?: number; locale?: string }

export function gpuVram(i: VramArgs) {
  const p = i.model ? PRESETS.find((x) => x.id === i.model) : undefined;
  if (i.model && !p) throw new ToolInputError(`unknown model preset "${i.model}". Presets: ${PRESET_IDS.join(', ')}`);
  const pick = (v: number | undefined, fromPreset: number | undefined, name: string) => {
    const r = v ?? fromPreset;
    if (r === undefined) throw new ToolInputError(`${name} is required when no model preset is given`);
    return r;
  };
  const input = {
    paramsB: pick(i.params_b, p?.paramsB, 'params_b'), bits: i.bits ?? 4,
    layers: pick(i.layers, p?.layers, 'layers'), kvHeads: pick(i.kv_heads, p?.kvHeads, 'kv_heads'), headDim: pick(i.head_dim, p?.headDim, 'head_dim'),
    context: i.context ?? 8192, batch: i.batch ?? 1, kvBits: i.kv_bits ?? 16, overheadPct: i.overhead_pct ?? 10,
  };
  const r = estimate(input);
  if (!r) throw new ToolInputError('all sizes must be positive numbers and overhead_pct must be 0..100');
  const fits = fitList(r.total).map((f) => ({ gpu_gb: f.gb, fits: f.fits }));
  const link = sourceUrl('gpu-vram-calculator', {
    ...(p ? { model: p.id } : {}), params: input.paramsB, bits: input.bits, layers: input.layers, kvheads: input.kvHeads,
    headdim: input.headDim, context: input.context, batch: input.batch, kvbits: String(input.kvBits), overhead: input.overheadPct,
  }, i.locale);
  return {
    total_gib: gib(r.total), weights_gib: gib(r.weights), kv_cache_gib: gib(r.kv), overhead_gib: gib(r.overhead),
    kv_bytes_per_token: r.kvPerToken, inputs: input, gpu_fit: fits,
    note: 'Inference estimate: weights + KV cache + overhead. Activations and framework specifics vary.',
    source_url: link,
  };
}
