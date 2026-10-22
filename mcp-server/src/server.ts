// MCP 서버 정의: 도구 등록만 한다. 전송(stdio 등)은 index.ts 가 붙인다.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { buildLink, findTools, getTool, localeOf, paramDocs, ToolInputError, LOCALE_LABELS, TOOLS } from './catalog';
import { percentage, loan, dateAdd, daysBetween, age, unitConvert, bmi, roi, UNIT_CATEGORIES, unitList } from './calc/basic';
import { tokenCount, contextFit, llmCost, gpuVram, PRICE_IDS, PRESET_IDS } from './calc/ai';
import { relativeDate, businessDays, schengen, dueDate, timeZone } from './calc/dates';
import { compoundInterest, bmiForAge, molarMass, apScore, satScore, AP_SUBJECTS, SAT_TESTS } from './calc/science';

export const VERSION = '0.2.0';

const LINK_NOTE = ' The result includes source_url, a nanocalcs.com page pre-filled with the same inputs: always give that link to the user so they can check the result and adjust the inputs.';
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const locale = z.string().optional().describe(`Page language for links, e.g. en, ko, ja, es, de. Default en; falls back to English when a tool has no page in that language. Available: ${Object.keys(LOCALE_LABELS).join(', ')}`);
const date = (what: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe(`${what} (YYYY-MM-DD)`);

/** 핸들러 결과를 MCP 응답으로. 입력 오류는 isError 로 돌려 에이전트가 고쳐 다시 부를 수 있게 한다 */
export async function respond(fn: () => unknown | Promise<unknown>): Promise<CallToolResult> {
  try {
    const out = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out as Record<string, unknown> };
  } catch (e) {
    if (e instanceof ToolInputError) return { isError: true, content: [{ type: 'text', text: `Invalid input: ${e.message}` }] };
    throw e; // 예상하지 못한 오류는 SDK 가 오류 응답으로 바꾼다
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'nanocalcs', version: VERSION, websiteUrl: 'https://nanocalcs.com' });
  const reg = <S extends z.ZodRawShape>(name: string, title: string, description: string, inputSchema: S, run: (a: z.infer<z.ZodObject<S>>) => unknown) =>
    server.registerTool(name, { title, description, inputSchema, annotations: { ...READ_ONLY, title } }, ((a: z.infer<z.ZodObject<S>>) => respond(() => run(a))) as never);

  reg('find_tool', 'Find a nanocalcs tool',
    `Search the ${TOOLS.length} free calculators and converters on nanocalcs.com by keyword (any language). Returns id, name, page URL, accepted prefill parameters and an example prefilled URL. Use the id with build_link to give the user a page with their own numbers filled in.`,
    { query: z.string().min(1).max(200).describe('What the user needs, e.g. "mortgage payment", "tokens", "나이 계산"'), locale, limit: z.number().int().min(1).max(20).optional().describe('Max results, default 5') },
    (a) => ({ results: findTools(a.query, a.locale, a.limit ?? 5) }));

  reg('build_link', 'Build a prefilled nanocalcs link',
    'Build a nanocalcs.com URL for a tool id with inputs pre-filled via query parameters. Values are validated against the tool\'s parameter spec (ranges, allowed values, dates); invalid or unknown parameters are rejected with the accepted list. Give the returned url to the user.',
    { id: z.string().describe('Tool id from find_tool, e.g. "loan-calculator"'), params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Parameter name -> value'), locale },
    (a) => {
      const t = getTool(a.id);
      const { url, locale: used } = buildLink(a.id, a.params ?? {}, a.locale);
      return { id: t.id, name: localeOf(t, used).entry.name, url, locale: used, accepted_params: paramDocs(t), source_url: url };
    });

  reg('percentage', 'Percentage', 'Exact percentage math. mode "of": a% of b. mode "what": a is what % of b. mode "change": percent change from a to b.' + LINK_NOTE,
    { mode: z.enum(['of', 'what', 'change']), a: z.number(), b: z.number(), locale }, percentage);

  reg('loan_payment', 'Loan payment', 'Monthly loan repayment, total interest and total paid. type annuity (equal payments, default), principal (equal principal) or bullet (interest-only, principal at the end).' + LINK_NOTE,
    { amount: z.number().positive(), rate: z.number().min(0).max(100).describe('Annual interest rate %'), term: z.number().positive(), unit: z.enum(['years', 'months']).optional().describe('Default years'), type: z.enum(['annuity', 'principal', 'bullet']).optional(), locale }, loan);

  reg('date_add', 'Add or subtract dates', 'Add or subtract years, months, weeks and days from a date (month-end clamped: Jan 31 + 1 month = Feb 28/29).' + LINK_NOTE,
    { start: date('Start date'), op: z.enum(['add', 'sub']).optional(), years: z.number().int().min(0).optional(), months: z.number().int().min(0).optional(), weeks: z.number().int().min(0).optional(), days: z.number().int().min(0).optional(), locale }, dateAdd);

  reg('days_between', 'Days between dates', 'Number of days, weeks, and years/months/days between two dates. inclusive counts the end date too.' + LINK_NOTE,
    { from: date('First date'), to: date('Second date'), inclusive: z.boolean().optional(), locale }, daysBetween);

  reg('age', 'Age', 'Exact age in years, months and days, total days, and the next birthday. on defaults to today (UTC).' + LINK_NOTE,
    { birth: date('Date of birth'), on: date('Age on this date').optional(), locale }, (a) => age(a));

  reg('unit_convert', 'Unit conversion', `Convert units with exact definitional factors. Units by category: ${unitList()}.` + LINK_NOTE,
    { category: z.enum(UNIT_CATEGORIES as [string, ...string[]]), value: z.number(), from: z.string(), to: z.string(), locale }, unitConvert as never);

  reg('bmi', 'BMI', 'Body mass index with WHO adult category and the healthy weight range for the height (metric).' + LINK_NOTE,
    { height_cm: z.number(), weight_kg: z.number(), age: z.number().optional().describe('Years, default 30. Under 18 is not classified'), locale }, bmi);

  reg('roi', 'Return on investment', 'Total ROI %, profit, multiple, and annualized (compound) return when a period is given.' + LINK_NOTE,
    { initial: z.number(), final: z.number(), period: z.number().positive().optional(), unit: z.enum(['years', 'months', 'days']).optional(), locale }, roi);

  reg('token_count', 'Token count', 'Exact token count with OpenAI tiktoken encodings (o200k_base default, cl100k_base), plus Claude and Gemini estimates.' + LINK_NOTE,
    { text: z.string(), encoding: z.enum(['o200k_base', 'cl100k_base']).optional(), locale }, tokenCount);

  reg('context_window_fit', 'Context window fit', 'Whether a prompt fits each model\'s context window, with remaining tokens after an output reserve. Give tokens, or text to count with o200k_base. Omit model to check all listed models.' + LINK_NOTE,
    { tokens: z.number().int().min(0).optional(), text: z.string().optional(), reserve: z.number().int().min(0).optional(), model: z.string().optional(), locale }, contextFit);

  reg('llm_api_cost', 'LLM API cost', `API cost per request, day, month and year from list prices. Omit model to get the 10 cheapest. Models: ${PRICE_IDS.join(', ')}.` + LINK_NOTE,
    { model: z.string().optional(), input: z.number().min(0).describe('Input tokens per request'), output: z.number().min(0).describe('Output tokens per request'), requests: z.number().min(0), per: z.enum(['day', 'month']).optional().describe('requests are per day (default) or per month'), cache: z.boolean().optional(), hit: z.number().min(0).max(100).optional().describe('Cache hit % of input tokens'), batch: z.boolean().optional(), locale }, llmCost);

  reg('gpu_vram', 'GPU VRAM', `VRAM needed to run a local LLM: weights + KV cache + overhead, and which common GPU sizes fit. Use a preset (${PRESET_IDS.join(', ')}) or give params_b, layers, kv_heads, head_dim. Defaults: bits 4, context 8192, batch 1, kv_bits 16, overhead_pct 10.` + LINK_NOTE,
    { model: z.string().optional(), params_b: z.number().positive().optional().describe('Parameters in billions'), bits: z.number().min(1).max(32).optional(), layers: z.number().int().positive().optional(), kv_heads: z.number().int().positive().optional(), head_dim: z.number().int().positive().optional(), context: z.number().int().positive().optional(), batch: z.number().int().positive().optional(), kv_bits: z.union([z.literal(16), z.literal(8), z.literal(4)]).optional(), overhead_pct: z.number().min(0).max(100).optional(), locale }, gpuVram);

  const weekend = z.enum(['sat-sun', 'fri-sat', 'sun', 'none']).optional().describe('Weekend days, default sat-sun');
  const holidays = z.array(date('Holiday')).max(500).optional().describe('Extra non-working dates');

  reg('relative_date', 'Resolve a relative date', 'Turn an English relative date phrase into an exact calendar date: "next Tuesday", "in 3 weeks", "10 business days from today", "third Friday of March 2027", "last day of February 2028". Returns the date, weekday, how the phrase was read and alternative readings for ambiguous phrases. Use this instead of doing calendar math in your head.' + LINK_NOTE,
    { phrase: z.string().min(1).max(200), ref: date('Reference date, default today').optional(), tz: z.string().optional().describe('IANA time zone used for "today" when ref is omitted, e.g. America/New_York'), weekend, holidays, locale }, relativeDate);

  reg('business_days', 'Business days', 'Count business (working) days between two dates, or add/subtract N business days from a date, skipping weekends and given holidays. Give end to count, or days to add (negative to go back).' + LINK_NOTE,
    { start: date('Start date'), end: date('End date').optional(), days: z.number().int().optional(), weekend, holidays, include_start: z.boolean().optional().describe('Count the start date, default true'), include_end: z.boolean().optional().describe('Count the end date, default true'), locale }, businessDays);

  reg('schengen_90_180', 'Schengen 90/180 days', 'Schengen short-stay rule: days used in the rolling 180-day window, days left, overstay check, how long you can stay from a date and the next possible entry.' + LINK_NOTE,
    { trips: z.array(z.object({ entry: date('Entry date'), exit: date('Exit date') })).min(1).max(100), on: date('Check date, default today').optional(), locale }, schengen);

  reg('due_date', 'Pregnancy due date', 'Estimated due date, current gestational age (weeks+days), trimester and days left. method lmp (last menstrual period, default), conception, ivf3, ivf5 (embryo transfer date) or us (ultrasound date with us_weeks/us_days).' + LINK_NOTE,
    { date: date('LMP, conception, transfer or ultrasound date'), method: z.enum(['lmp', 'conception', 'ivf3', 'ivf5', 'us']).optional(), cycle: z.number().int().optional().describe('Cycle length days (21-45), default 28; lmp only'), us_weeks: z.number().int().optional(), us_days: z.number().int().optional(), today: date('Today, default UTC today').optional(), locale }, dueDate);

  reg('time_zone_convert', 'Time zone conversion', 'Convert a local date and time in one IANA time zone to other zones, with UTC offsets, abbreviations, DST status and day shifts (IANA tz data, DST aware).' + LINK_NOTE,
    { date: date('Local date'), time: z.string().describe('Local time HH:MM, 24-hour'), from: z.string().describe('IANA zone, e.g. America/New_York'), to: z.array(z.string()).min(1).max(20).describe('IANA zones, e.g. ["Europe/London","Asia/Seoul"]'), locale }, timeZone);

  reg('compound_interest', 'Compound interest', 'Future value with compound interest and optional regular deposits, total interest, APY and year-by-year balance. Defaults: monthly compounding, monthly deposits at period end.' + LINK_NOTE,
    { principal: z.number().min(0), rate: z.number().min(0).max(1000).describe('Annual rate %'), years: z.number().positive().max(100), freq: z.enum(['annual', 'semiannual', 'quarterly', 'monthly', 'weekly', 'daily', 'continuous']).optional(), deposit: z.number().min(0).optional().describe('Amount per deposit period'), deposit_freq: z.enum(['annual', 'semiannual', 'quarterly', 'monthly', 'weekly']).optional(), timing: z.enum(['end', 'begin']).optional(), inflation: z.number().min(0).optional().describe('Annual inflation % for real value'), locale }, compoundInterest);

  reg('bmi_for_age', 'BMI-for-age percentile (children)', 'Child and teen BMI percentile and z-score from WHO growth references (0-19 y, default) or CDC charts (2-20 y), with the weight category and healthy BMI range.' + LINK_NOTE,
    { sex: z.enum(['boy', 'girl']), age_years: z.number().min(0).max(20), age_months: z.number().int().min(0).max(11).optional(), height_cm: z.number(), weight_kg: z.number(), ref: z.enum(['who', 'cdc']).optional(), locale }, bmiForAge);

  reg('molar_mass', 'Molar mass', 'Molar mass (g/mol) and mass percent composition of a chemical formula, with parentheses and hydrates (e.g. Ca(OH)2, CuSO4*5H2O), using standard atomic weights. Optionally convert grams to moles or moles to grams.' + LINK_NOTE,
    { formula: z.string().min(1).max(120), grams: z.number().min(0).optional(), moles: z.number().min(0).optional(), locale }, molarMass);

  reg('ap_score', 'AP score estimate', `Estimate an AP exam score (1-5) from multiple-choice correct answers and free-response points, using published scoring worksheet weights. Subjects: ${AP_SUBJECTS.join(', ')}.` + LINK_NOTE,
    { subject: z.enum(AP_SUBJECTS as [string, ...string[]]), mcq_correct: z.number().int().min(0), frq: z.array(z.number().min(0)).max(7).describe('Points per free-response question, in order'), locale }, apScore);

  reg('sat_score', 'SAT score estimate', `Digital SAT scaled score range (400-1600) from correct answers per module, using official Bluebook practice test conversion tables (tests ${SAT_TESTS.join(', ')}; default the latest).` + LINK_NOTE,
    { rw1: z.number().int().min(0).max(33), rw2: z.number().int().min(0).max(33), math1: z.number().int().min(0).max(27), math2: z.number().int().min(0).max(27), test: z.string().optional(), locale }, satScore);

  return server;
}
