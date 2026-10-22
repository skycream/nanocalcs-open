# nanocalcs-open

Open-source parts of [nanocalcs.com](https://nanocalcs.com), a collection of free online calculators and tools.
The calculation logic here is the same code that runs on the site.

## Packages

| Package | Path | Description |
|---|---|---|
| [`nanocalcs-mcp`](https://www.npmjs.com/package/nanocalcs-mcp) | [`mcp-server`](./mcp-server) | MCP server for nanocalcs.com: exact calculators (dates, business days, Schengen, time zones, loans, compound interest, units, molar mass, SAT/AP scores, LLM tokens, API cost, GPU VRAM) plus prefilled links to 430+ free online tools in 63 languages. |
| [`national-id-validator`](https://www.npmjs.com/package/national-id-validator) | [`packages/national-id-validator`](./packages/national-id-validator) | Check-digit validation and detection of national ID numbers from 18 countries (KR RRN, JP My Number, CN, IN Aadhaar/PAN, TR, BR CPF/CNPJ, ID NIK, RU SNILS/INN, ES DNI/NIE, FR NIR, PK, MY, SA, VN, US SSN) plus IBAN. Zero dependencies. |
| [`llm-image-tokens`](https://www.npmjs.com/package/llm-image-tokens) | [`packages/llm-image-tokens`](./packages/llm-image-tokens) | Image input token formulas for OpenAI (patch and tile), Anthropic Claude and Google Gemini vision models. Zero dependencies. |
| [`gguf-size`](https://www.npmjs.com/package/gguf-size) | [`packages/gguf-size`](./packages/gguf-size) | GGUF quantization file size (F16 to Q2_K) and VRAM estimate (weights, KV cache, overhead) for local LLMs. Zero dependencies. |

`shared/` holds the calculator source files from the site that these packages import.

## Data

[`data/`](./data) contains an LLM API pricing dataset (`llm-pricing.json`, `llm-pricing.csv`)
and its change history (`llm-pricing-history.json`). The same data is published at
https://nanocalcs.com/en/llm-api-pricing/

## Development

Each package is independent. Inside a package directory:

```sh
npm ci
npm test
npm run build
```

## Disclaimer

These packages, the MCP server and the data are provided **as is**, without warranty of any kind (see the MIT license).

- Results are for reference only. They are not legal, financial, medical or tax advice.
- `national-id-validator` checks format and checksum only. A valid result does not mean the number was issued or belongs to anyone.
- Prices, context windows and other model figures change often. Each record carries a "checked" date; confirm against the provider before relying on it.
- Issues and pull requests are welcome, but there is no guarantee of a response or a fix.

## License

- Code: [MIT](./LICENSE)
- Data in `data/`: [CC BY 4.0](./data/LICENSE-DATA)
