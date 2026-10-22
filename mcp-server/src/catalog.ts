// 도구 목록(빌드 시 사이트 레지스트리에서 생성한 generated/catalog.json)과 검색·prefill 링크 생성.
// 파라미터 검증은 사이트 lib/urlState 의 parseParam 을 그대로 쓴다(사이트가 URL 값을 받아들이는 규칙과 같다).
import raw from '../generated/catalog.json';
import { parseParam, describeParam, type ParamSpec } from '../../shared/lib/urlState';

export class ToolInputError extends Error {}

interface RawSpec extends Omit<ParamSpec, 'pattern'> { pattern?: { source: string; flags: string } }
interface LocEntry { name: string; short: string; url: string }
interface RawTool { id: string; category: string; locales: Record<string, LocEntry>; params?: RawSpec[]; example?: Record<string, string | number> }
export interface Tool { id: string; category: string; locales: Record<string, LocEntry>; params: ParamSpec[]; example?: Record<string, string | number> }

const data = raw as unknown as { site: string; locales: Record<string, string>; tools: RawTool[] };
export const SITE = data.site;
export const LOCALE_LABELS = data.locales;
export const TOOLS: Tool[] = data.tools.map((t) => ({
  ...t,
  params: (t.params ?? []).map((p) => ({ ...p, pattern: p.pattern ? new RegExp(p.pattern.source, p.pattern.flags) : undefined })),
}));
const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

// 값 목록이 화면의 <select> option 에서 정해지는 enum(모델·국가 등)은 서버가 목록을 모른다. 안전한 토큰 모양만 받는다
const SAFE_OPTION = /^[A-Za-z0-9_.+\-/]{1,40}$/;

export function getTool(id: string): Tool {
  const t = BY_ID.get(id);
  if (!t) throw new ToolInputError(`Unknown tool id "${id}". Use find_tool to look up ids.`);
  return t;
}

/** 로케일 항목. 요청한 언어판이 없으면 영어판으로 */
export function localeOf(t: Tool, locale = 'en'): { locale: string; entry: LocEntry } {
  if (t.locales[locale]) return { locale, entry: t.locales[locale] };
  const fallback = t.locales.en ? 'en' : Object.keys(t.locales)[0];
  return { locale: fallback, entry: t.locales[fallback] };
}

export const paramDocs = (t: Tool): string[] => t.params.map(describeParam);

function normalize(spec: ParamSpec, v: unknown): string | null {
  if (typeof v === 'boolean') v = v ? '1' : '0';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    v = String(v);
  }
  if (typeof v !== 'string') return null;
  if (spec.kind === 'enum' && !spec.values?.length) return SAFE_OPTION.test(v.trim()) ? v.trim() : null;
  return parseParam(spec, v);
}

export type ParamInput = Record<string, string | number | boolean>;

/** 검증된 prefill URL. 규격 밖의 키나 범위 밖의 값은 ToolInputError */
export function buildLink(id: string, params: ParamInput = {}, locale = 'en'): { url: string; locale: string } {
  const t = getTool(id);
  const { locale: used, entry } = localeOf(t, locale);
  const bad: string[] = [];
  const q = new URLSearchParams();
  const known = new Set(t.params.map((p) => p.name));
  for (const k of Object.keys(params)) if (!known.has(k)) bad.push(`unknown parameter "${k}"`);
  for (const spec of t.params) {
    if (!(spec.name in params)) continue;
    const v = normalize(spec, params[spec.name]);
    if (v === null) bad.push(`invalid value for ${describeParam(spec)}: ${JSON.stringify(params[spec.name])}`);
    else q.set(spec.name, v);
  }
  if (bad.length) {
    const accepted = t.params.length ? `Accepted: ${paramDocs(t).join(', ')}` : 'This tool takes no prefill parameters.';
    throw new ToolInputError(`${id}: ${bad.join('; ')}. ${accepted}`);
  }
  const s = q.toString();
  return { url: s ? `${entry.url}?${s}` : entry.url, locale: used };
}

/** 계산 결과용 링크: 규격에 맞는 값만 넣고, 맞지 않는 값(예: 너무 긴 텍스트)은 빼서 항상 열리는 URL 을 준다 */
export function sourceUrl(id: string, params: ParamInput, locale = 'en'): string {
  const t = getTool(id);
  const ok: ParamInput = {};
  for (const spec of t.params) if (spec.name in params && normalize(spec, params[spec.name]) !== null) ok[spec.name] = params[spec.name];
  return buildLink(id, ok, locale).url;
}

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFKC');

export interface Found { id: string; name: string; description: string; url: string; locale: string; category: string; params: string[]; example_url?: string }

/** 질의어 검색: 이름 > id > 한 줄 설명 순으로 가중치. 공백 단위 낱말과 질의 전체(띄어쓰기 없는 언어) 모두 본다 */
export function findTools(query: string, locale = 'en', limit = 5): Found[] {
  const q = fold(query.trim());
  if (!q) throw new ToolInputError('query must not be empty');
  const words = q.split(/[\s,]+/).filter((w) => w.length > 1 || /[^\x00-\x7f]/.test(w));
  const scored = TOOLS.map((t) => {
    const { locale: used, entry } = localeOf(t, locale);
    const en = t.locales.en;
    const name = fold(entry.name), id = t.id.replace(/-/g, ' '), short = fold(entry.short);
    const enName = en ? fold(en.name) : '';
    let score = 0;
    if (name.includes(q)) score += 10;
    for (const w of words) {
      if (name.includes(w)) score += 3;
      else if (enName.includes(w)) score += 2;
      if (id.includes(w)) score += 2;
      if (short.includes(w)) score += 1;
    }
    return { t, used, entry, score };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.t.id.localeCompare(b.t.id));
  return scored.slice(0, limit).map(({ t, used, entry }) => {
    const example_url = t.example ? buildLink(t.id, t.example, used).url : undefined;
    return { id: t.id, name: entry.name, description: entry.short, url: entry.url, locale: used, category: t.category, params: paramDocs(t), example_url };
  });
}
