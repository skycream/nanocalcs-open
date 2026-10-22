// 두 날짜 사이 기간 (모든 날짜는 UTC 정오 기준 일수로 처리해 일광절약시간 영향을 받지 않음)
import { tpl } from '../../lib/loc';
const DAY = 86400000;

export function parseDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

const num = (p: { y: number; m: number; d: number }) => Math.round(Date.UTC(p.y, p.m - 1, p.d) / DAY);
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// 달 더하기: 일이 넘치면 그 달 말일로 맞춘다 (1월 31일 + 1개월 = 2월 28/29일)
function addMonths(p: { y: number; m: number; d: number }, n: number) {
  const idx = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(idx / 12), m = (idx % 12) + 1;
  return { y, m, d: Math.min(p.d, daysInMonth(y, m)) };
}

export interface Span {
  swapped: boolean;
  days: number;
  weeks: number; weekDays: number;
  months: number; monthDays: number;     // 총 개월 + 남은 일
  years: number; yMonths: number; yDays: number; // 년 + 개월 + 일
}

// a -> b 기간. includeEnd 이면 종료일도 하루로 센다. 순서가 뒤집히면 자동으로 바꾸고 swapped 표시
export function span(aStr: string, bStr: string, includeEnd = false): Span | null {
  const pa = parseDate(aStr), pb = parseDate(bStr);
  if (!pa || !pb) return null;
  let na = num(pa), nb = num(pb);
  const swapped = nb < na;
  let from = swapped ? pb : pa, to = swapped ? pa : pb;
  if (swapped) [na, nb] = [nb, na];
  let days = nb - na;
  if (includeEnd) {
    days += 1;
    // 종료일 포함은 종료일을 하루 뒤로 미룬 것과 같다
    const t = new Date(Date.UTC(to.y, to.m - 1, to.d + 1));
    to = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  // 시작일에 개월을 더해 가며 종료일을 넘지 않는 최대 개월 수를 찾는다
  const fromIdx = from.y * 12 + from.m, toIdx = to.y * 12 + to.m;
  let months = toIdx - fromIdx;
  while (months > 0 && num(addMonths(from, months)) > num(to)) months--;
  const anchor = addMonths(from, months);
  const monthDays = num(to) - num(anchor);
  return {
    swapped, days,
    weeks: Math.floor(days / 7), weekDays: days % 7,
    months, monthDays,
    years: Math.floor(months / 12), yMonths: months % 12, yDays: monthDays,
  };
}

/** "1 year, 2 months" 처럼 0 이 아닌 항목만 labels 템플릿(tpl)으로 이어 붙인다. 모두 0 이면 "0 days" */
export function joinUnits(parts: [number, string][], L: Record<string, string>, lang?: string): string {
  const s = parts.filter(([n]) => n > 0).map(([n, k]) => tpl(L, k, n, lang));
  return s.length ? s.join(L.listSep) : tpl(L, 'dayN', 0, lang);
}
