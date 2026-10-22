// 나이 계산 순수 함수: 만 나이(년·월·일), 총 일수, 다음 생일. 날짜는 {y,m,d} (월 1~12), UTC 기준
import { fmtDateLoc, pageLang, weekdayNames, monthNames } from '../../lib/loc';

export interface Ymd { y: number; m: number; d: number }

const MS_DAY = 86400000;
const utc = (y: number, m: number, d: number) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(0, 0, 0, 0); return t.getTime(); };
export const dayNumber = (a: Ymd) => Math.round(utc(a.y, a.m, a.d) / MS_DAY);
export const daysInMonth = (y: number, m: number) => new Date(utc(y, m + 1, 0)).getUTCDate();

// 'YYYY-MM-DD' → Ymd, 잘못된 값은 null
export function parseYmd(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const r = { y: +m[1], m: +m[2], d: +m[3] };
  if (r.y < 1 || r.m < 1 || r.m > 12 || r.d < 1 || r.d > daysInMonth(r.y, r.m)) return null;
  return r;
}

// 시작일에 개월 수를 더한다. 해당 월에 날짜가 없으면 그 달 말일로 맞춘다 (1월 31일 + 1개월 = 2월 28/29일)
export function addMonths(a: Ymd, months: number): Ymd {
  const total = a.y * 12 + (a.m - 1) + months;
  const y = Math.floor(total / 12), m = (((total % 12) + 12) % 12) + 1;
  return { y, m, d: Math.min(a.d, daysInMonth(y, m)) };
}

export const cmp = (a: Ymd, b: Ymd) => dayNumber(a) - dayNumber(b);
export const weekdayOf = (a: Ymd) => new Date(utc(a.y, a.m, a.d)).getUTCDay();

export interface AgeResult {
  years: number; months: number; days: number; totalDays: number; totalMonths: number; totalWeeks: number;
  next: { date: Ymd; daysUntil: number; turning: number; weekday: number };
}

export type AgeOutcome = { ok: true; value: AgeResult } | { ok: false; error: 'order' };

export function age(birth: Ymd, on: Ymd): AgeOutcome {
  if (cmp(birth, on) > 0) return { ok: false, error: 'order' };
  let tm = (on.y - birth.y) * 12 + (on.m - birth.m);
  if (cmp(addMonths(birth, tm), on) > 0) tm--;
  const anchor = addMonths(birth, tm);
  const days = dayNumber(on) - dayNumber(anchor);
  const totalDays = dayNumber(on) - dayNumber(birth);
  // 다음 생일: 올해 생일이 오늘 이후(오늘 포함)면 올해, 아니면 내년. 2월 29일생은 평년에 2월 28일로 본다
  let ny = on.y;
  let nd = addMonths({ y: ny, m: birth.m, d: birth.d }, 0);
  if (cmp(nd, on) < 0) { ny++; nd = addMonths({ y: ny, m: birth.m, d: birth.d }, 0); }
  return {
    ok: true,
    value: {
      years: Math.floor(tm / 12), months: tm % 12, days, totalDays, totalMonths: tm, totalWeeks: Math.floor(totalDays / 7),
      next: { date: nd, daysUntil: dayNumber(nd) - dayNumber(on), turning: ny - birth.y, weekday: weekdayOf(nd) },
    },
  };
}

// 날짜 표기: 영어는 기존 "Friday, 25 December 2026" 꼴을 유지하고, 나머지 로케일은 Intl 의 긴 날짜 형식
export function fmtYmd(a: Ymd, weekday = false, lang?: string): string {
  const d = new Date(utc(a.y, a.m, a.d));
  if (/^en(-|$)/.test(pageLang(lang) || 'en')) {
    const day = `${a.d} ${monthNames('long', lang)[a.m - 1]} ${a.y}`;
    return weekday ? `${weekdayNames('long', lang)[d.getUTCDay()]}, ${day}` : day;
  }
  return fmtDateLoc(d, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', ...(weekday ? { weekday: 'long' } : {}) }, lang);
}
