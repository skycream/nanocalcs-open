// 상대 날짜 해석기: 영어 상대 날짜 표현 → 기준일 기준의 정확한 날짜.
// 모든 계산은 UTC 일수(정수)로 한다. 시각이 없으므로 서머타임과 무관하다.
// 요일·영업일 헬퍼는 business-days-calculator 의 것을 그대로 쓴다.
import { toDayNumber, fromDayNumber, weekdayOf, addBusinessDays, type Rules } from '../business-days-calculator/logic';

export const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface Alt { date: string; weekday: string; note: string }
export type Resolved =
  | { ok: true; date: string; day: number; weekday: string; interpretation: string; alternatives: Alt[]; notes: string[] }
  | { ok: false; error: string };

export const EXAMPLES = [
  'next Tuesday', 'this Friday', 'in 3 weeks', '2 weeks ago', '10 business days from today',
  'third Friday of March 2027', 'last day of February 2028', 'start of next month', 'Friday after next', '1 month from 2027-01-31',
];
const HELP = `Try phrases like: ${EXAMPLES.slice(0, 7).map((e) => `"${e}"`).join(', ')}.`;

const DAY = 86400000;
const WD_RE = '(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)';
const MO_RE = '(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)';
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const NUM_RE = `(\\d{1,5}|a|an|${WORDS.join('|')})`;
const ORD: Record<string, number> = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1 };
const ORD_RE = `(${Object.keys(ORD).join('|')})`;
const ANCHOR_RE = '(today|now|tomorrow|yesterday|\\d{4}-\\d{2}-\\d{2})';

const wdIndex = (s: string) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(s.slice(0, 3));
const moIndex = (s: string) => MONTH_EN.findIndex((m) => m.toLowerCase().startsWith(s.slice(0, 3)));
const numOf = (s: string) => (s === 'a' || s === 'an' ? 1 : /^\d+$/.test(s) ? Number(s) : WORDS.indexOf(s));

// 연·월·일 ↔ 일수
const ymdOf = (n: number) => { const d = new Date(n * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
const dayOf = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / DAY);
const monthLen = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
// Date.UTC 는 0~99 년을 1900년대로 바꾸므로 연도 범위를 막는다
const yearOk = (y: number) => y >= 1000 && y <= 9999;

/** 월 더하기: 해당 월에 그 날짜가 없으면 말일로 맞춘다 (1월 31일 + 1개월 = 2월 28/29일) */
export function addMonths(n: number, k: number): number {
  const { y, m, d } = ymdOf(n);
  const t = y * 12 + m + k, ny = Math.floor(t / 12), nm = t - ny * 12;
  return dayOf(ny, nm, Math.min(d, monthLen(ny, nm)));
}
/** ISO 주(월요일 시작)의 월요일 */
const mondayOf = (n: number) => n - ((weekdayOf(n) + 6) % 7);
/** 그 달 n번째 요일. 없으면 null. nth=-1 은 마지막 */
export function nthWeekday(y: number, m: number, wd: number, nth: number): number | null {
  if (nth === -1) { const last = dayOf(y, m, monthLen(y, m)); return last - ((weekdayOf(last) - wd + 7) % 7); }
  const first = dayOf(y, m, 1), d = first + ((wd - weekdayOf(first) + 7) % 7) + (nth - 1) * 7;
  return ymdOf(d).m === m ? d : null;
}

/** 주어진 시간대에서 now 순간의 날짜 (YYYY-MM-DD). 잘못된 시간대면 null */
export function todayInTz(tz: string, now: Date): string | null {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const g = (t: string) => p.find((x) => x.type === t)?.value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  } catch { return null; }
}

const label = (n: number) => `${WEEKDAY_EN[weekdayOf(n)]}, ${MONTH_EN[ymdOf(n).m]} ${ymdOf(n).d}, ${ymdOf(n).y}`;
const alt = (n: number, note: string): Alt => ({ date: fromDayNumber(n), weekday: WEEKDAY_EN[weekdayOf(n)], note });

function normalize(q: string): string {
  return q.toLowerCase().replace(/[?.!]+$/g, '').replace(/[’']/g, "'").replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(what|which) (date|day) (is|was|will be|would be) /, '').replace(/^what's /, '').replace(/^(on|by) /, '').replace(/^the /, '').trim();
}

export function resolve(phrase: string, ref: string, rules: Rules): Resolved {
  const r0 = toDayNumber(ref);
  if (r0 === null) return { ok: false, error: 'Enter a valid reference date (YYYY-MM-DD).' };
  const q = normalize(phrase);
  if (!q) return { ok: false, error: `Enter a phrase. ${HELP}` };
  const out = (n: number | null, interp: string, alts: Alt[] = [], notes: string[] = []): Resolved => {
    if (n === null || !yearOk(ymdOf(n).y)) return { ok: false, error: 'The result falls outside the supported years 1000 to 9999.' };
    return { ok: true, date: fromDayNumber(n), day: n, weekday: WEEKDAY_EN[weekdayOf(n)], interpretation: interp, alternatives: alts.filter((a) => a.date !== fromDayNumber(n)), notes };
  };
  const anchor = (s: string): number | null => s === 'today' || s === 'now' ? r0 : s === 'tomorrow' ? r0 + 1 : s === 'yesterday' ? r0 - 1 : toDayNumber(s);
  let m: RegExpExecArray | null;
  const M = (re: string) => (m = new RegExp(`^${re}$`).exec(q));

  // 1) 기본 단어와 날짜 그대로
  if (M('(today|now)')) return out(r0, `Today: the reference date ${ref}.`);
  if (M('tomorrow')) return out(r0 + 1, 'Tomorrow: reference date + 1 day.');
  if (M('yesterday')) return out(r0 - 1, 'Yesterday: reference date - 1 day.');
  if (M('day after tomorrow')) return out(r0 + 2, 'The day after tomorrow: reference date + 2 days.');
  if (M('day before yesterday')) return out(r0 - 2, 'The day before yesterday: reference date - 2 days.');
  if (M('(\\d{4}-\\d{2}-\\d{2})')) { const d = toDayNumber(m![1]); return d === null ? { ok: false, error: `${m![1]} is not a real calendar date.` } : out(d, 'An exact date, shown with its weekday.'); }

  // 2) 요일
  const wdName = (s: string) => WEEKDAY_EN[wdIndex(s)];
  const ahead = (wd: number, min: number) => r0 + ((wd - weekdayOf(r0) - min + 14) % 7) + min; // min 일 이후 첫 해당 요일
  const inWeek = (mon: number, wd: number) => mon + ((wd + 6) % 7);
  if (M(`next ${WD_RE}`)) {
    const wd = wdIndex(m![1]), first = ahead(wd, 1), nw = inWeek(mondayOf(r0) + 7, wd);
    return out(first, `Next ${wdName(m![1])}: the first ${wdName(m![1])} after the reference date.`,
      [alt(nw, `${wdName(m![1])} of next week (weeks start on Monday). Some people mean this when they say "next ${wdName(m![1])}".`)],
      first !== nw ? ['"Next" + weekday is ambiguous when that day is still ahead this week. Confirm which one is meant.'] : []);
  }
  if (M(`this ${WD_RE}`)) {
    const wd = wdIndex(m![1]), up = ahead(wd, 0), cw = inWeek(mondayOf(r0), wd);
    const notes = up === r0 ? [`The reference date is itself a ${wdName(m![1])}, so "this ${wdName(m![1])}" is read as today.`] : [];
    return out(up, `This ${wdName(m![1])}: the nearest ${wdName(m![1])} on or after the reference date.`,
      [alt(cw, `${wdName(m![1])} of the current Monday-to-Sunday week, which has already passed.`), ...(up === r0 ? [alt(r0 + 7, `${wdName(m![1])} a week later, if today does not count.`)] : [])], notes);
  }
  if (M(`last ${WD_RE}`) || M(`past ${WD_RE}`)) {
    const wd = wdIndex(m![1]), prev = r0 - (((weekdayOf(r0) - wd + 6) % 7) + 1), lw = inWeek(mondayOf(r0) - 7, wd);
    return out(prev, `Last ${wdName(m![1])}: the most recent ${wdName(m![1])} before the reference date.`,
      [alt(lw, `${wdName(m![1])} of last week (weeks start on Monday).`)], prev !== lw ? ['"Last" + weekday can also mean the one in the previous week.'] : []);
  }
  if (M(`${WD_RE} after next`)) {
    const wd = wdIndex(m![1]), d = ahead(wd, 1) + 7;
    return out(d, `${wdName(m![1])} after next: one week after the first upcoming ${wdName(m![1])}.`, [alt(inWeek(mondayOf(r0) + 14, wd), `${wdName(m![1])} of the week after next week.`)]);
  }
  if (M(`(?:on |coming |upcoming )?${WD_RE}`)) {
    const wd = wdIndex(m![1]), d = ahead(wd, 1);
    return out(d, `${wdName(m![1])}: the first ${wdName(m![1])} after the reference date.`, d - r0 === 7 ? [alt(r0, 'Today, if the speaker means the current day.')] : []);
  }

  // 3) 주·월·연 단위
  if (M('next week')) return out(mondayOf(r0) + 7, 'Next week: Monday of next week (weeks start on Monday).', [alt(r0 + 7, 'Exactly 7 days after the reference date.')]);
  if (M('last week')) return out(mondayOf(r0) - 7, 'Last week: Monday of last week (weeks start on Monday).', [alt(r0 - 7, 'Exactly 7 days before the reference date.')]);
  if (M('this week')) return out(mondayOf(r0), 'This week: Monday of the current week.', [alt(mondayOf(r0) + 6, 'Sunday, the last day of this week.')]);
  if (M('end of (?:the |this )?week')) return out(mondayOf(r0) + 6, 'End of this week: Sunday of the current Monday-to-Sunday week.', [alt(mondayOf(r0) + 4, 'Friday, the end of the work week.')]);
  const ry = ymdOf(r0).y, rm = ymdOf(r0).m;
  if (M('next month')) return out(addMonths(dayOf(ry, rm, 1), 1), 'Next month: the 1st of next month.', [alt(addMonths(r0, 1), 'The same day of next month (clamped to month end).')]);
  if (M('last month')) return out(addMonths(dayOf(ry, rm, 1), -1), 'Last month: the 1st of last month.', [alt(addMonths(r0, -1), 'The same day of last month (clamped to month end).')]);
  if (M('next year')) return out(dayOf(ry + 1, 0, 1), 'Next year: January 1 of next year.', [alt(addMonths(r0, 12), 'The same date next year (Feb 29 becomes Feb 28).')]);
  if (M('last year')) return out(dayOf(ry - 1, 0, 1), 'Last year: January 1 of last year.', [alt(addMonths(r0, -12), 'The same date last year (Feb 29 becomes Feb 28).')]);

  // 4) 월 시작·끝: "end of month", "start of next month", "last day of february 2028"
  const which = (s: string | undefined): [number, number, string] | null => {
    // s: undefined|'this month'|'the month'|'next month'|'last month'|'<month> [year]'
    if (!s || /^(this|the) month$/.test(s) || s === 'month') return [ry, rm, 'this month'];
    if (s === 'next month') { const t = ymdOf(addMonths(dayOf(ry, rm, 1), 1)); return [t.y, t.m, 'next month']; }
    if (s === 'last month' || s === 'previous month') { const t = ymdOf(addMonths(dayOf(ry, rm, 1), -1)); return [t.y, t.m, 'last month']; }
    const mm = new RegExp(`^${MO_RE}(?: (\\d{4}))?$`).exec(s);
    if (!mm) return null;
    const mi = moIndex(mm[1]);
    if (mm[2]) return [Number(mm[2]), mi, `${MONTH_EN[mi]} ${mm[2]}`];
    return [ry, mi, `${MONTH_EN[mi]} ${ry}`];
  };
  const SCOPE = `(this month|the month|month|next month|last month|previous month|${MO_RE}(?: \\d{4})?)`;
  if (M(`(end|last day) of (?:the )?${SCOPE}`) || M(`(end) of month`)) {
    const w = which(m![2]); if (!w || !yearOk(w[0])) return { ok: false, error: `Could not read the month. ${HELP}` };
    const d = dayOf(w[0], w[1], monthLen(w[0], w[1]));
    return out(d, `Last day of ${w[2]}: ${monthLen(w[0], w[1])} days in that month.`);
  }
  if (M(`(start|beginning|first day) of (?:the )?${SCOPE}`)) {
    const w = which(m![2]); if (!w || !yearOk(w[0])) return { ok: false, error: `Could not read the month. ${HELP}` };
    return out(dayOf(w[0], w[1], 1), `First day of ${w[2]}.`);
  }
  if (M('end of (?:the |this )?year')) return out(dayOf(ry, 11, 31), `End of this year: December 31, ${ry}.`);
  if (M('end of next year')) return out(dayOf(ry + 1, 11, 31), `End of next year: December 31, ${ry + 1}.`);
  if (M('(?:start|beginning) of next year')) return out(dayOf(ry + 1, 0, 1), `Start of next year: January 1, ${ry + 1}.`);

  // 5) n번째 요일: "third friday of march 2027", "last monday of next month"
  if (M(`${ORD_RE} ${WD_RE} (?:of|in) (?:the )?${SCOPE}`)) {
    const nth = ORD[m![1]], wd = wdIndex(m![2]), scope = m![3];
    const w = which(scope); if (!w || !yearOk(w[0])) return { ok: false, error: `Could not read the month. ${HELP}` };
    const name = `${m![1]} ${wdName(m![2])} of ${w[2]}`;
    const d = nthWeekday(w[0], w[1], wd, nth);
    if (d === null) return { ok: false, error: `There is no ${name}: that month has only four ${wdName(m![2])}s.` };
    // 연도 없이 월 이름만 쓰고 그 날이 이미 지났으면 내년 것을 고른다
    const bareMonth = new RegExp(`^${MO_RE}$`).test(scope);
    if (bareMonth && d < r0) {
      const n2 = nthWeekday(ry + 1, w[1], wd, nth);
      if (n2 !== null) return out(n2, `The ${m![1]} ${wdName(m![2])} of ${MONTH_EN[w[1]]} ${ry + 1}: no year was given and the ${ry} one has passed.`, [alt(d, `The ${ry} date, already past.`)]);
    }
    return out(d, `The ${name}.`);
  }

  // 6) 기간 더하기·빼기
  const UNIT = '(business days?|working days?|weekdays?|days?|weeks?|fortnights?|months?|years?)';
  const shift = (base: number, n: number, unit: string): number | null => {
    if (/^(business|working|weekday)/.test(unit)) return addBusinessDays(base, n, rules);
    if (unit.startsWith('day')) return base + n;
    if (unit.startsWith('week')) return base + 7 * n;
    if (unit.startsWith('fortnight')) return base + 14 * n;
    if (unit.startsWith('month')) return addMonths(base, n);
    return addMonths(base, 12 * n);
  };
  const explain = (n: number, unit: string, sign: number, from: string, res: number | null): Resolved => {
    if (n < 0 || n > 100000) return { ok: false, error: 'Use a whole number from 0 to 100000.' };
    if (res === null) return { ok: false, error: 'No business days exist under this weekend rule.' };
    const isBiz = /^(business|working|weekday)/.test(unit);
    const u = unit.replace(/s$/, '');
    const notes: string[] = [];
    if (isBiz) notes.push(`Business days skip the weekend you chose${rules.holidays.size ? ' and your holiday list' : ''}; the starting day itself is not counted.`);
    if (/^(month|year)/.test(unit)) notes.push('Month and year steps keep the day of the month and clamp to the month end when that day does not exist (Jan 31 + 1 month = Feb 28 or 29).');
    return out(res, `${n} ${u}${n === 1 ? '' : 's'} ${sign > 0 ? 'after' : 'before'} ${from}.`, [], notes);
  };
  if (M(`in ${NUM_RE} ${UNIT}(?: time)?`) || M(`${NUM_RE} ${UNIT} (?:from now|later|hence)`)) {
    const n = numOf(m![1]); return explain(n, m![2], 1, `the reference date (${ref})`, shift(r0, n, m![2]));
  }
  if (M(`${NUM_RE} ${UNIT} ago`)) { const n = numOf(m![1]); return explain(n, m![2], -1, `the reference date (${ref})`, shift(r0, -n, m![2])); }
  if (M(`${NUM_RE} ${UNIT} (from|after|before|since|until|prior to) ${ANCHOR_RE}`)) {
    const n = numOf(m![1]), base = anchor(m![4]);
    if (base === null) return { ok: false, error: `${m![4]} is not a real calendar date.` };
    const sign = m![3] === 'before' || m![3] === 'prior to' || m![3] === 'until' ? -1 : 1;
    return explain(n, m![2], sign, m![4] === 'today' || m![4] === 'now' ? `the reference date (${ref})` : `${m![4]} (${fromDayNumber(base)})`, shift(base, sign * n, m![2]));
  }
  // "next 5 business days" 같은 표현은 범위라 지원하지 않는다
  return { ok: false, error: `"${phrase.trim()}" is not a phrase this tool understands. ${HELP}` };
}

/** 사람이 읽는 긴 날짜 (위젯·메타용) */
export const longLabel = (iso: string) => { const n = toDayNumber(iso); return n === null ? iso : label(n); };
