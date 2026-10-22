<!--
npm name candidates (checked with `npm view`, all unclaimed on 2026-10-16):
  1. llm-image-tokens   <- used
  2. image-token-count
  3. vision-token-count
-->

# llm-image-tokens

How many input tokens does an image cost? Formulas for OpenAI (patch and tile), Anthropic Claude and Google Gemini vision models. Zero dependencies, ESM + CJS, TypeScript types included.

Live calculator: https://nanocalcs.com/en/vision-token-calculator/

## Install

```sh
npm install llm-image-tokens
```

## Usage

```ts
import { MODELS, tokensFor } from 'llm-image-tokens';

for (const m of MODELS) {
  const { tokens, size } = tokensFor(m, 1920, 1080, 'high');
  console.log(m.id, tokens, size);
}
// gpt-5.5            2448  { w: 1920, h: 1080 }
// gpt-4.1            1105  { w: 1365, h: 768 }
// claude-opus-5.5    2691  { w: 1920, h: 1080 }
// claude-haiku-4.5   1560  { w: 1456, h: 819 }
// gemini-3-flash     1120  null
// gemini-2.5-flash   1548  null
```

Lower-level functions: `openaiPatch`, `openaiTile`, `claudeResize`, `claudeTokens`, `gemini3Tokens`, `gemini2Tokens`. `detail` is `'low'` or `'high'`. `MODELS` lists the models the rules are verified for, and `VISION_CHECKED` is the date the rules were last compared with the vendor docs.

## Rules and sources

| Vendor | Rule | Source |
|---|---|---|
| OpenAI (patch) | 32px patches, patch budget shrink, multiplier then round up | developers.openai.com/api/docs/guides/images-vision |
| OpenAI (tile) | 2048 box, short side 768, 512px tiles x tile tokens + base; low = base only | same page |
| Anthropic | 28px patches, long-edge and token limit found by binary search, same as the reference `resizedSize` | platform.claude.com/docs/en/build-with-claude/vision |
| Gemini 3 | Fixed tokens per media resolution (low 280, default/high 1120) | ai.google.dev/gemini-api/docs/media-resolution |
| Gemini 2.5 | 258 if both sides <= 384, else 768x768 tiles x 258 | ai.google.dev/gemini-api/docs/tokens |

The tests use the worked examples printed in the vendor documentation as expected values.

## Accuracy notes

- Results are estimates from published formulas. Vendors change rules and model names, so check `VISION_CHECKED` and compare with the API's reported usage before billing decisions.
- Text around the image, image count limits and cache discounts are not included.
- Dollar cost is not part of this package; multiply tokens by your current input price.

The code is built from the same source as the calculator above (single source of truth), and the site's own tests run against this package.

## License

MIT

## Disclaimer

Provided as is, without warranty (MIT). Results are for reference only and are not legal, financial, medical or tax advice. Figures that change over time (prices, model limits) carry a "checked" date; verify with the provider before relying on them. Issues and pull requests are welcome, but responses are not guaranteed.
