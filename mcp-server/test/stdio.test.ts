// MCP 클라이언트 왕복: 빌드된 dist/index.js 를 stdio 로 띄워 도구 목록·호출·오류 응답을 확인한다 (npm test 가 먼저 빌드한다)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const entry = resolve(import.meta.dirname, '../dist/index.js');
const client = new Client({ name: 'test', version: '0.0.0' });

beforeAll(async () => {
  if (!existsSync(entry)) throw new Error('dist/index.js 가 없다. npm run build 를 먼저 실행할 것');
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry], stderr: 'ignore' }));
});
afterAll(() => client.close());

const text = (r: Awaited<ReturnType<typeof client.callTool>>) => (r.content as { type: string; text: string }[])[0].text;

describe('stdio 왕복', () => {
  it('도구 목록', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'age', 'bmi', 'build_link', 'context_window_fit', 'date_add', 'days_between', 'find_tool', 'gpu_vram',
      'llm_api_cost', 'loan_payment', 'percentage', 'roi', 'token_count', 'unit_convert',
      'ap_score', 'bmi_for_age', 'business_days', 'compound_interest', 'due_date', 'molar_mass', 'relative_date', 'sat_score', 'schengen_90_180', 'time_zone_convert',
    ].sort());
    for (const t of tools.filter((x) => !['find_tool', 'build_link'].includes(x.name))) expect(t.description).toContain('source_url');
  });
  it('계산 호출', async () => {
    const r = await client.callTool({ name: 'loan_payment', arguments: { amount: 300000, rate: 4.5, term: 30 } });
    expect(r.isError).toBeFalsy();
    const out = JSON.parse(text(r));
    expect(out.first_payment).toBe(1520.06);
    expect(out.source_url).toMatch(/^https:\/\/nanocalcs\.com\/en\/loan-calculator\/\?/);
  });
  it('토큰 수(js-tiktoken 동적 로드)', async () => {
    const r = await client.callTool({ name: 'token_count', arguments: { text: 'Hello, world! How many tokens?' } });
    expect(JSON.parse(text(r)).tokens).toBe(8);
  });
  it('입력 오류는 isError 응답', async () => {
    const r = await client.callTool({ name: 'build_link', arguments: { id: 'loan-calculator', params: { rate: 999 } } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('Invalid input');
  });
});
