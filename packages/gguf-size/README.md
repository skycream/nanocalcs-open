<!--
npm name candidates (checked with `npm view`, all unclaimed on 2026-10-16):
  1. gguf-size   <- used
  2. gguf-quant-size
  3. llm-quant-size
-->

# gguf-size

Estimate GGUF file size per quantization (F16 to Q2_K) and the memory a local LLM needs (weights + KV cache + overhead). Zero dependencies, ESM + CJS, TypeScript types included.

Live calculator: https://nanocalcs.com/en/llm-quantization-size-calculator/

## Install

```sh
npm install gguf-size
```

## Usage

```ts
import { compareQuants, toGiB, PRESETS, estimate } from 'gguf-size';

const m = PRESETS.find((p) => p.id === 'llama31-8b')!;
const rows = compareQuants({
  paramsB: m.paramsB, layers: m.layers, kvHeads: m.kvHeads, headDim: m.headDim,
  context: 8192, kvBits: 16, overheadPct: 0,
})!;
console.log(rows.map((r) => `${r.name} ${toGiB(r.file).toFixed(2)}`).join(', '));
// F16 14.96, Q8_0 7.95, Q6_K 6.14, Q5_K_M 5.33, Q4_K_M 4.58, Q3_K_M 3.74, Q2_K 2.95 (GiB)

// Memory for one setup: Llama 3.1 70B at 4.89 bits per weight, 8k context, 10% overhead
estimate({ paramsB: 70.55, bits: 4.8944, layers: 80, kvHeads: 8, headDim: 128, context: 8192, batch: 1, kvBits: 16, overheadPct: 10 });
// { weights: 43162490000, kv: 2684354560, overhead: 4584684456, total: 50431529016, kvPerToken: 327680 }  (bytes)
```

Also exported: `QUANTS` (bits per weight), `PRESETS` (13 popular models with layers, KV heads and head dimension), `fitList(totalBytes)` (which of 8/12/16/24/48/80 GiB GPUs fit), `GIB`.

## Formulas and sources

- Weights = parameters x bits per weight / 8
- KV cache = 2 x layers x KV heads x head dim x context x batch x KV bytes
- Total = (weights + KV) x (1 + overhead%)
- Effective bits per weight come from the `llama.cpp` quantize README table for Llama-3.1-8B (`tools/quantize/README.md`). K-quants store block scales and keep some tensors at higher precision, so the real value is above the number in the name (Q4_K_M is 4.89, not 4).
- Layers, KV heads and head dimension: each model's Hugging Face `config.json`; Llama 3.1 from the Llama 3 paper (arXiv 2407.21783), Gemma 2 from its technical report (arXiv 2408.00118). Parameter counts: Hugging Face `safetensors.total`.

## Accuracy notes

- Tests check that Llama 3.1 8B sizes match the llama.cpp README (14.96 / 7.95 / 6.14 / 5.33 / 4.58 / 3.74 / 2.95 GiB).
- Other architectures differ slightly in how many tensors stay at higher precision, so expect a few percent of error. MoE models, sliding-window attention and runtime buffers vary by backend and are covered only by the overhead percentage.
- Sizes are GiB (2^30 bytes).

The code is built from the same source as the calculator above (single source of truth), and the site's own tests run against this package.

## License

MIT

## Disclaimer

Provided as is, without warranty (MIT). Results are for reference only and are not legal, financial, medical or tax advice. Figures that change over time (prices, model limits) carry a "checked" date; verify with the provider before relying on them. Issues and pull requests are welcome, but responses are not guaranteed.
