// 도구 검색과 prefill 링크
import { describe, it, expect } from 'vitest';
import { findTools, buildLink, TOOLS, ToolInputError } from '../src/catalog';

describe('find_tool', () => {
  it('영어 질의', () => {
    const r = findTools('loan payment');
    expect(r[0].id).toBe('loan-calculator');
    expect(r[0].url).toBe('https://nanocalcs.com/en/loan-calculator/');
    expect(r[0].params).toContain('amount (number 0..1000000000000)');
    expect(r[0].example_url).toContain('?amount=300000');
  });
  it('한국어 질의는 한국어판 URL', () => {
    const r = findTools('나이', 'ko');
    expect(r.map((x) => x.id)).toContain('age-calculator');
    const a = r.find((x) => x.id === 'age-calculator')!;
    expect(a.locale).toBe('ko');
    expect(a.url).toContain('/ko/');
  });
  it('없는 언어판은 영어로', () => {
    const r = findTools('tokens', 'xx');
    expect(r[0].locale).toBe('en');
  });
  it('limit 과 빈 질의', () => {
    expect(findTools('calculator', 'en', 3)).toHaveLength(3);
    expect(() => findTools('  ')).toThrow(ToolInputError);
  });
  it('모든 예시 prefill 이 규격 검증을 통과한다', () => {
    for (const t of TOOLS.filter((x) => x.example)) expect(() => buildLink(t.id, t.example!), t.id).not.toThrow();
  });
});

describe('build_link', () => {
  it('규격 순서로 쿼리를 만든다', () => {
    expect(buildLink('loan-calculator', { term: 30, amount: 300000, rate: 4.5 }).url).toBe('https://nanocalcs.com/en/loan-calculator/?amount=300000&rate=4.5&term=30');
  });
  it('bool 과 로케일', () => {
    const r = buildLink('days-between-dates', { from: '2026-01-01', to: '2026-02-01', inclusive: true }, 'ja');
    expect(r.url).toMatch(/^https:\/\/nanocalcs\.com\/ja\/.+\?from=2026-01-01&to=2026-02-01&inclusive=1$/);
  });
  it('파라미터 없이 도구 페이지', () => {
    expect(buildLink('coin-flip').url).toBe('https://nanocalcs.com/en/coin-flip/');
  });
  it.each([
    ['없는 도구', 'nope', {}],
    ['범위 밖 값', 'loan-calculator', { rate: 101 }],
    ['허용값 밖 enum', 'loan-calculator', { unit: 'decades' }],
    ['잘못된 날짜', 'age-calculator', { birth: '1990-13-01' }],
    ['규격에 없는 키', 'loan-calculator', { foo: 1 }],
    ['위험한 select 값', 'llm-api-cost-calculator', { model: '<script>' }],
  ])('%s 은 거절', (_, id, params) => expect(() => buildLink(id as string, params as Record<string, string>)).toThrow(ToolInputError));
  it('거절 메시지에 허용 파라미터 목록', () => {
    expect(() => buildLink('loan-calculator', { rate: 101 })).toThrow(/Accepted: amount/);
  });
});
