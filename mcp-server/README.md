# nanocalcs-mcp

An MCP server for [nanocalcs.com](https://nanocalcs.com). LLMs often get token counts, API costs, date math and loan payments wrong when they work them out in their heads. This server computes those results exactly, using the same code as the website, and returns a `source_url` with every result: a nanocalcs.com page with the same inputs already filled in, so the user can check the numbers and change them.

It can also search the site's ~300 free calculators and converters (in 49 languages) and build validated prefilled links for them.

No API key is needed, and it makes no network calls: everything is computed locally.

## Install

Requires Node.js 20 or later.

```bash
npx -y nanocalcs-mcp
```

### Claude Code

```bash
claude mcp add nanocalcs -- npx -y nanocalcs-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nanocalcs": {
      "command": "npx",
      "args": ["-y", "nanocalcs-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "nanocalcs": {
      "command": "npx",
      "args": ["-y", "nanocalcs-mcp"]
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `find_tool` | Search nanocalcs tools by keyword in any language. Returns name, URL, accepted parameters and an example prefilled link. |
| `build_link` | Build a prefilled URL for a tool id. Parameters are checked against the tool's spec (ranges, allowed values, dates); bad values are rejected. |
| `percentage` | X% of Y, X is what % of Y, percent change. |
| `loan_payment` | Monthly payment, total interest and total paid (equal payments, equal principal, or interest-only). |
| `date_add` | Add or subtract years, months, weeks, days (month-end clamped). |
| `days_between` | Days, weeks and years/months/days between two dates. |
| `age` | Exact age and next birthday. |
| `unit_convert` | Length, mass, temperature, volume, area, speed, time, data, with exact definitional factors. |
| `bmi` | BMI, WHO adult category and healthy weight range. |
| `roi` | ROI, profit, multiple, annualized return. |
| `token_count` | Exact OpenAI tokens (o200k_base, cl100k_base) plus Claude and Gemini estimates. |
| `context_window_fit` | Whether a prompt fits each model's context window after an output reserve. |
| `llm_api_cost` | API cost per request, day, month and year from list prices (with cache and batch discounts), or the 10 cheapest models. |
| `gpu_vram` | VRAM to run a local LLM (weights + KV cache + overhead), with model presets. |
| `relative_date` | Resolve "next Tuesday", "in 3 weeks", "10 business days from today", "third Friday of March 2027" to an exact date, with alternative readings. |
| `business_days` | Business days between two dates, or add/subtract N business days (custom weekend, holidays). |
| `schengen_90_180` | Schengen 90/180-day rule: days used, days left, overstay, latest stay and next entry. |
| `due_date` | Pregnancy due date and gestational age (LMP, conception, IVF transfer or ultrasound). |
| `time_zone_convert` | Convert a local time between IANA time zones, DST aware. |
| `compound_interest` | Future value with compounding and regular deposits, APY, year-by-year balance. |
| `bmi_for_age` | Child/teen BMI percentile and z-score (WHO 0-19 or CDC 2-20). |
| `molar_mass` | Molar mass and mass percent of a formula (parentheses, hydrates), grams-moles. |
| `ap_score` | AP exam score (1-5) estimate from MCQ and FRQ points. |
| `sat_score` | Digital SAT score range from Bluebook practice test conversion tables. |

Each calculation result includes `source_url`. The tool descriptions ask the agent to pass that link to the user.

Example result of `loan_payment` with `{ "amount": 300000, "rate": 4.5, "term": 30 }`:

```json
{
  "type": "annuity",
  "months": 360,
  "first_payment": 1520.06,
  "last_payment": 1520.06,
  "total_interest": 247220.13,
  "total_paid": 547220.13,
  "source_url": "https://nanocalcs.com/en/loan-calculator/?amount=300000&rate=4.5&term=30&unit=years&type=annuity"
}
```

Pass `locale` (for example `ko`, `ja`, `es`, `de`) to any tool to get links to that language's page.

Prices and model limits come from the site's data files and carry a `prices_checked` date. They are list prices; check the vendor's page before making a budget decision.

## Development

The server lives in the nanocalcs site repository and imports the site's calculator logic directly, so the results always match the website.

```bash
cd packages/mcp-server
npm install
npm test        # builds dist/ and runs unit tests plus a stdio round trip
npm run build   # dist/index.js
node dist/index.js
```

## License

MIT. Homepage: https://nanocalcs.com

## Disclaimer

Provided as is, without warranty (MIT). Results are for reference only and are not legal, financial, medical or tax advice. Figures that change over time (prices, model limits) carry a "checked" date; verify with the provider before relying on them. Issues and pull requests are welcome, but responses are not guaranteed.
