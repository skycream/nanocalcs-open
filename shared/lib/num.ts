import { numLocale } from './loc';

// 로케일별 소수점·그룹 기호 (Intl 에서 한 번만 얻어 캐시)
interface Sep { dec: string; group: string }
const sepCache = new Map<string, Sep>();
export function separators(lang?: string): Sep {
  const loc = numLocale(lang);
  let s = sepCache.get(loc);
  if (!s) {
    const parts = new Intl.NumberFormat(loc).formatToParts(1234567.5);
    s = { dec: parts.find((p) => p.type === 'decimal')?.value ?? '.', group: parts.find((p) => p.type === 'group')?.value ?? ',' };
    sepCache.set(loc, s);
  }
  return s;
}

/** 소수점이 쉼표인 로케일인가 (id, tr 등) */
export const isDecimalComma = (lang?: string): boolean => separators(lang).dec === ',';

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const GROUPED_DOT = /^[+-]?\d{1,3}(\.\d{3})+$/;

/**
 * 입력 문자열을 숫자로. 빈칸·잘못된 값은 NaN
 * - 소수점이 점인 로케일(en·ko·ja·ar·ms…): 쉼표는 천 단위 구분자라 모두 지운다 (기존 동작 그대로)
 * - 소수점이 쉼표인 로케일(id·tr…): 쉼표가 소수점, 점·공백은 천 단위 구분자.
 *   다른 관례로 친 점 하나는 관용 해석 — 그룹 모양(점 뒤 정확히 3자리)이 아니거나 정수부가 0이면 소수점 ("1.5"→1.5, "1.234"→1234)
 * lang 을 생략하면 페이지 로케일(html lang)을 쓴다
 */
export function parseNum(s: string, lang?: string): number {
  if (!isDecimalComma(lang)) {
    const t = s.replace(/,/g, '').trim();
    return t && PLAIN.test(t) ? Number(t) : NaN;
  }
  const t0 = s.replace(/[\s  ]/g, '');
  if (!t0) return NaN;
  const commas = t0.split(',').length - 1;
  let t: string;
  if (commas > 1) return NaN;
  if (commas === 1) {
    const [a, b] = t0.split(',');
    // 정수부의 점은 그룹 구분자(1.234,5). 위치가 어긋난 점은 잘못된 입력
    if (a.includes('.') && !GROUPED_DOT.test(a)) return NaN;
    t = a.replace(/\./g, '') + '.' + b;
  } else if (t0.includes('.')) {
    const intPart = t0.slice(0, t0.indexOf('.')).replace(/^[+-]/, '');
    if (GROUPED_DOT.test(t0) && intPart !== '0') t = t0.replace(/\./g, '');
    else if (t0.split('.').length === 2) t = t0;
    else return NaN;
  } else t = t0;
  return PLAIN.test(t) ? Number(t) : NaN;
}

// 12자리 유효숫자로 부동소수 잡음 제거
export const clean = (n: number): number => Number(n.toPrecision(12));

// 소수 둘째 자리 고정 표기
export const money = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
