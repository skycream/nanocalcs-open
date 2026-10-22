// 계산기 입력 ↔ URL 쿼리(?key=value) 양방향 동기화 (Stateless deep linking)
// 파라미터 이름은 짧은 영어로 고정하고 로케일과 무관하다. 규격은 tools/deeplinks.ts 에서 도구별로 선언한다.
// 값은 검증을 통과한 것만 입력창에 넣는다(숫자 범위, enum 화이트리스트, 날짜 형식). 잘못된 값은 무시하고 기본값을 유지한다.
// 값을 innerHTML 로 넣지 않는다: 입력창 value 와 버튼 click 만 쓴다.
import { parseNum, isDecimalComma } from './num';

export type ParamKind = 'num' | 'enum' | 'date' | 'bool' | 'text';

export interface ParamSpec {
  name: string;          // 쿼리 키 (영문 소문자)
  kind: ParamKind;
  /** 입력 요소 id (num·date·bool·text·select 형 enum) */
  id?: string;
  /** aria-pressed 토글 버튼 그룹의 data-* 이름 (버튼형 enum) */
  group?: string;
  min?: number;
  max?: number;
  /** enum 허용값. select 는 실행 시 실제 option 으로 한 번 더 걸러진다 */
  values?: string[];
  /** text 형 허용 패턴 */
  pattern?: RegExp;
  /** text 형 최대 길이 (기본 40). 텍스트 영역 도구는 더 크게 둔다 */
  maxLen?: number;
}

export type ParamValues = Record<string, string>;

const NUM_RE = /^-?\d{1,15}(\.\d{1,10})?$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_TEXT = 40;

function validDate(raw: string): boolean {
  const m = DATE_RE.exec(raw);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1000) return false;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** 원시 문자열 하나를 규격에 맞게 검증한다. 통과하면 정규화된 값, 아니면 null */
export function parseParam(spec: ParamSpec, raw: string | null | undefined, allowed?: readonly string[]): string | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (!v) return null;
  switch (spec.kind) {
    case 'num': {
      if (!NUM_RE.test(v)) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      if (spec.min !== undefined && n < spec.min) return null;
      if (spec.max !== undefined && n > spec.max) return null;
      return v;
    }
    case 'enum': {
      const list = allowed ?? spec.values ?? [];
      return list.includes(v) ? v : null;
    }
    case 'date':
      return validDate(v) ? v : null;
    case 'bool':
      return v === '1' || v === 'true' ? '1' : v === '0' || v === 'false' ? '0' : null;
    case 'text':
      return v.length <= (spec.maxLen ?? MAX_TEXT) && spec.pattern && spec.pattern.test(v) ? v : null;
  }
}

/** 쿼리 문자열에서 규격에 있는 키만 검증해 뽑는다. 같은 키가 여러 번이면 첫 값만 본다 */
export function parseQuery(specs: ParamSpec[], search: string, allowedOf?: (s: ParamSpec) => readonly string[] | undefined): ParamValues {
  const q = new URLSearchParams(search);
  const out: ParamValues = {};
  for (const s of specs) {
    const v = parseParam(s, q.get(s.name), allowedOf?.(s));
    if (v !== null) out[s.name] = v;
  }
  return out;
}

/** 기본값과 다른 항목만 담은 쿼리 문자열(앞의 ? 없음). 규격 밖의 기존 키는 보존한다 */
export function buildSearch(specs: ParamSpec[], current: ParamValues, defaults: ParamValues, existing = ''): string {
  const q = new URLSearchParams(existing);
  for (const s of specs) {
    q.delete(s.name);
    const v = current[s.name];
    if (v !== undefined && v !== defaults[s.name]) q.set(s.name, v);
  }
  return q.toString();
}

/** llms.txt 용 예시 쿼리. 규격 순서대로 이름=값 */
export function exampleQuery(specs: ParamSpec[], example: Record<string, string | number>): string {
  return specs.filter((s) => s.name in example).map((s) => `${s.name}=${encodeURIComponent(String(example[s.name]))}`).join('&');
}

/** 규격을 사람이 읽는 한 줄로 (llms-full.txt) */
export function describeParam(s: ParamSpec): string {
  const type =
    s.kind === 'num' ? `number${s.min !== undefined || s.max !== undefined ? ` ${s.min ?? ''}..${s.max ?? ''}` : ''}`
    : s.kind === 'enum' ? (s.values?.length ? s.values.join('|') : 'option')
    : s.kind === 'date' ? 'date YYYY-MM-DD'
    : s.kind === 'bool' ? '1|0'
    : 'text';
  return `${s.name} (${type})`;
}

// ---- 브라우저 쪽 ----

let current: { specs: ParamSpec[]; defaults: ParamValues; read: () => ParamValues; apply: (v: ParamValues) => void } | null = null;
// 입력 규격 밖의 추가 쿼리(예: 시나리오 비교 sc=). 공유 링크에 함께 실린다
let extra: (() => Record<string, string>) | null = null;

/** 공유 링크에 덧붙일 쿼리 제공자를 등록한다 */
export function setExtraSearch(fn: (() => Record<string, string>) | null): void { extra = fn; }

/** 현재 입력을 담은 쿼리("?a=b" 또는 ""). 규격이 없는 페이지는 null */
export function deepLinkSearch(keepOthers = false): string | null {
  if (!current) return null;
  const q = new URLSearchParams(buildSearch(current.specs, current.read(), current.defaults, keepOthers ? location.search : ''));
  if (extra) for (const [k, v] of Object.entries(extra())) { q.delete(k); if (v) q.set(k, v); }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** 딥링크 규격이 연결된 페이지의 현재 입력값과 기본값. 없으면 null */
export function deepLinkState(): { specs: ParamSpec[]; defaults: ParamValues; values: ParamValues } | null {
  return current ? { specs: current.specs, defaults: current.defaults, values: current.read() } : null;
}

/** 값 묶음을 입력창에 넣고 계산을 다시 돌린다. 빠진 키는 기본값으로 되돌린다 */
export function applyDeepLink(values: ParamValues): void {
  current?.apply({ ...current.defaults, ...values });
}

const fire = (el: HTMLElement) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * 위젯에 규격을 연결한다: URL 값으로 입력을 채우고 계산을 돌리고, 이후 입력이 바뀌면 URL 을 갱신한다.
 * 위젯 스크립트가 모두 실행된 뒤(초기 계산 완료)에 호출해야 한다.
 */
/** initial: 답변 페이지(프리셋)가 주소 쿼리보다 먼저 채울 값. 주소에 쿼리가 있으면 그 값이 덮어쓴다 */
export function bindDeepLink(specs: ParamSpec[], root: HTMLElement = document.body, debounceMs = 300, initial = ''): void {
  const byId = (id?: string) => (id ? document.getElementById(id) : null);
  const buttons = (g: string) => [...root.querySelectorAll<HTMLButtonElement>(`button[data-${g.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}][aria-pressed]`)];
  const optionsOf = (s: ParamSpec): string[] | undefined => {
    if (s.group) return buttons(s.group).map((b) => b.dataset[s.group!] ?? '');
    const el = byId(s.id);
    return el instanceof HTMLSelectElement ? [...el.options].map((o) => o.value) : undefined;
  };

  const read = (): ParamValues => {
    const out: ParamValues = {};
    for (const s of specs) {
      let v: string | null = null;
      if (s.group) {
        const on = buttons(s.group).find((b) => b.getAttribute('aria-pressed') === 'true');
        v = on?.dataset[s.group] ?? null;
      } else {
        const el = byId(s.id);
        if (el instanceof HTMLInputElement && el.type === 'checkbox') v = el.checked ? '1' : '0';
        else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
          if (s.kind === 'num') { const n = parseNum(el.value); v = Number.isNaN(n) ? null : String(n); }
          else v = el.value || null;
        }
      }
      const ok = v === null ? null : parseParam(s, v, optionsOf(s));
      if (ok !== null) out[s.name] = ok;
    }
    return out;
  };

  // 값 적용: 토글 버튼(모드·카테고리 전환)을 먼저 누르고, 바뀐 화면의 option 목록으로 나머지를 검증해 넣는다
  const apply = (search: string) => {
    for (const s of specs.filter((x) => x.group)) {
      const v = parseQuery([s], search, optionsOf)[s.name];
      const b = v === undefined ? undefined : buttons(s.group!).find((x) => x.dataset[s.group!] === v);
      if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
    }
    const rest = specs.filter((x) => !x.group);
    const wanted = parseQuery(rest, search, optionsOf);
    for (const s of rest) {
      const v = wanted[s.name];
      if (v === undefined) continue;
      const el = byId(s.id);
      if (el instanceof HTMLInputElement && el.type === 'checkbox') { el.checked = v === '1'; fire(el); }
      else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        // 쉼표 소수점 로케일(tr·id)에서는 "1.234" 가 천 단위로 읽히므로 쉼표로 바꿔 넣는다
        el.value = s.kind === 'num' && isDecimalComma() ? v.replace('.', ',') : v;
        fire(el);
      }
    }
  };

  const defaults = read();
  current = { specs, defaults, read, apply: (v) => apply(new URLSearchParams(v).toString()) };
  if (initial) apply(initial);
  apply(location.search);

  // 입력이 바뀌면 URL 갱신(디바운스). 규격 밖의 쿼리와 해시는 보존
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sync = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = deepLinkSearch(true);
      if (s === null) return;
      history.replaceState(null, '', `${location.pathname}${s}${location.hash}`);
    }, debounceMs);
  };
  root.addEventListener('input', sync);
  root.addEventListener('change', sync);
  root.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button[aria-pressed]')) sync(); });
}
