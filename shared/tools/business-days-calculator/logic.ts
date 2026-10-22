// 영업일 계산: 날짜는 "YYYY-MM-DD" 문자열, 내부에서는 UTC 일수(정수)로 다룬다
export type WeekendKey = 'sat-sun' | 'fri-sat' | 'sun' | 'none';
// 0=일 ... 6=토
export const WEEKENDS: Record<WeekendKey, number[]> = { 'sat-sun': [6, 0], 'fri-sat': [5, 6], sun: [0], none: [] };

const DAY = 86400000;
export function toDayNumber(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.round(t / DAY);
}
export function fromDayNumber(n: number): string {
  const d = new Date(n * DAY);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
// 요일 (0=일)
export const weekdayOf = (n: number): number => (((n + 4) % 7) + 7) % 7;

// 휴일 목록 텍스트 파싱: 줄바꿈, 쉼표, 공백, 세미콜론 구분. 형식이 틀린 항목은 invalid 로 따로 돌려준다
export function parseHolidays(text: string): { days: number[]; invalid: string[] } {
  const days = new Set<number>(), invalid: string[] = [];
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const n = toDayNumber(tok);
    if (n === null) invalid.push(tok); else days.add(n);
  }
  return { days: [...days].sort((a, b) => a - b), invalid };
}

export interface Rules { weekend: number[]; holidays: Set<number> }
const isWeekend = (n: number, r: Rules) => r.weekend.includes(weekdayOf(n));
export const isBusinessDay = (n: number, r: Rules): boolean => !isWeekend(n, r) && !r.holidays.has(n);

export interface Between {
  totalDays: number; businessDays: number; weekendDays: number; holidaysExcluded: number; swapped: boolean;
}

// 두 날짜 사이 영업일. 시작일/종료일 포함 여부를 각각 선택한다
export function businessDaysBetween(a: number, b: number, r: Rules, includeStart = true, includeEnd = true): Between {
  const swapped = b < a;
  const [from, to] = swapped ? [b, a] : [a, b];
  let business = 0, weekend = 0, hol = 0, total = 0;
  for (let d = from; d <= to; d++) {
    if (d === from && !includeStart) continue;
    if (d === to && !includeEnd && to !== from) continue;
    if (d === to && !includeEnd && to === from) continue;
    total++;
    if (isWeekend(d, r)) weekend++;
    else if (r.holidays.has(d)) hol++;
    else business++;
  }
  return { totalDays: total, businessDays: business, weekendDays: weekend, holidaysExcluded: hol, swapped };
}

// 시작일에서 n 영업일 뒤(음수면 앞). 시작일 자체는 세지 않는다
export function addBusinessDays(start: number, n: number, r: Rules): number | null {
  if (!Number.isInteger(n)) return null;
  // 영업일이 하나도 없는 규칙이면 끝나지 않는다
  if (r.weekend.length >= 7) return null;
  const step = n < 0 ? -1 : 1;
  let left = Math.abs(n), d = start, guard = 0;
  while (left > 0) {
    d += step;
    if (isBusinessDay(d, r)) left--;
    if (++guard > 400000) return null;
  }
  return d;
}
