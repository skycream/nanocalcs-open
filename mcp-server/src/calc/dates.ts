// 날짜·시간 계산: 상대 날짜, 영업일, 셴겐 90/180, 출산 예정일, 시간대. 사이트 logic.ts 를 그대로 부른다
import { resolve as resolveRelative, todayInTz } from '../../../shared/tools/relative-date-resolver/logic';
import { toDayNumber, fromDayNumber, weekdayOf, parseHolidays, businessDaysBetween, addBusinessDays, WEEKENDS, type WeekendKey } from '../../../shared/tools/business-days-calculator/logic';
import { parseTrips, schengen as schengenOf, dayNo, ymdOf } from '../../../shared/tools/schengen-calculator/logic';
import { dueByMethod, type Method } from '../../../shared/tools/due-date-calculator/logic';
import { zonedToUtc, viewIn, isValidZone, type Wall } from '../../../shared/tools/time-zone-converter/logic';
import { parseYmd, toYmd } from '../../../shared/lib/ymd';
import { sourceUrl, ToolInputError } from '../catalog';
import { todayUtc } from './basic';

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayNum(name: string, s: string): number {
  const n = toDayNumber(s);
  if (n === null) throw new ToolInputError(`${name} must be a valid date in YYYY-MM-DD format, got "${s}"`);
  return n;
}

function rulesOf(weekend: WeekendKey = 'sat-sun', holidays: string[] = []) {
  const { days, invalid } = parseHolidays(holidays.join('\n'));
  if (invalid.length) throw new ToolInputError(`holidays must be YYYY-MM-DD dates, invalid: ${invalid.join(', ')}`);
  return { weekend: WEEKENDS[weekend], holidays: new Set(days) };
}

export function relativeDate(i: { phrase: string; ref?: string; tz?: string; weekend?: WeekendKey; holidays?: string[]; locale?: string }) {
  if (i.tz && !isValidZone(i.tz)) throw new ToolInputError(`tz must be an IANA time zone such as America/New_York, got "${i.tz}"`);
  const ref = i.ref ?? (i.tz ? todayInTz(i.tz, new Date()) : null) ?? todayUtc();
  if (toDayNumber(ref) === null) throw new ToolInputError(`ref must be a valid date in YYYY-MM-DD format, got "${ref}"`);
  const r = resolveRelative(i.phrase, ref, rulesOf(i.weekend, i.holidays));
  if (!r.ok) throw new ToolInputError(r.error);
  return {
    date: r.date, weekday: r.weekday, interpretation: r.interpretation, reference_date: ref,
    alternatives: r.alternatives, notes: r.notes,
    source_url: sourceUrl('relative-date-resolver', { q: i.phrase, ref, weekend: i.weekend ?? 'sat-sun', holidays: (i.holidays ?? []).join(',') }, i.locale),
  };
}

export function businessDays(i: { start: string; end?: string; days?: number; weekend?: WeekendKey; holidays?: string[]; include_start?: boolean; include_end?: boolean; locale?: string }) {
  const rules = rulesOf(i.weekend, i.holidays);
  const start = dayNum('start', i.start);
  const weekend = i.weekend ?? 'sat-sun';
  if (i.end !== undefined) {
    const end = dayNum('end', i.end);
    const incstart = i.include_start ?? true, incend = i.include_end ?? true;
    const r = businessDaysBetween(start, end, rules, incstart, incend);
    return {
      mode: 'between', business_days: r.businessDays, total_days: r.totalDays, weekend_days: r.weekendDays, holidays_excluded: r.holidaysExcluded, swapped: r.swapped,
      source_url: sourceUrl('business-days-calculator', { mode: 'between', start: i.start, end: i.end, weekend, incstart, incend }, i.locale),
    };
  }
  if (i.days === undefined) throw new ToolInputError('give either end (count business days between) or days (add business days)');
  const d = addBusinessDays(start, i.days, rules);
  if (d === null) throw new ToolInputError('days must be a whole number and the weekend rule must leave business days');
  return {
    mode: 'add', result: fromDayNumber(d), weekday: WD[weekdayOf(d)],
    source_url: sourceUrl('business-days-calculator', { mode: 'add', start: i.start, days: i.days, weekend }, i.locale),
  };
}

export function schengen(i: { trips: { entry: string; exit: string }[]; on?: string; locale?: string }) {
  const s = i.trips.map((t) => `${t.entry}_${t.exit}`).join(',');
  const p = parseTrips(s);
  if (!p.ok) throw new ToolInputError(p.error === 'order' ? `trip ${p.index + 1}: exit is before entry` : `trip ${p.index + 1}: dates must be YYYY-MM-DD`);
  const on = i.on ?? todayUtc();
  const d = dayNo(on);
  if (Number.isNaN(d)) throw new ToolInputError(`on must be a valid date in YYYY-MM-DD format, got "${on}"`);
  const r = schengenOf(p.trips, d);
  const ymd = (n: number | null) => (n === null ? null : ymdOf(n));
  return {
    on, days_used: r.used, days_remaining: r.remaining, overstay: r.overstay, first_overstay_day: ymd(r.overstayDay),
    in_stay: r.inStay, can_stay_until: ymd(r.latest), next_possible_entry: ymd(r.earliest), full_90_days_from: ymd(r.full), future_trips: r.future,
    rule: 'At most 90 days in any rolling 180-day window (entry and exit days both count).',
    source_url: sourceUrl('schengen-calculator', { trips: s, date: on }, i.locale),
  };
}

export function dueDate(i: { method?: Method; date: string; cycle?: number; us_weeks?: number; us_days?: number; today?: string; locale?: string }) {
  const method = i.method ?? 'lmp', cycle = i.cycle ?? 28, today = i.today ?? todayUtc();
  const r = dueByMethod({ method, date: parseYmd(i.date), cycle, today: parseYmd(today), usWeeks: i.us_weeks, usDays: i.us_days ?? 0 });
  if (!r.ok) throw new ToolInputError(r.error === 'cycle' ? 'cycle must be 21 to 45 days' : r.error === 'ga' ? 'ultrasound age needs us_weeks 4-42 and us_days 0-6' : 'date and today must be valid YYYY-MM-DD dates');
  return {
    due_date: toYmd(r.due), estimated_conception: toYmd(r.conception), today,
    gestational_age: `${r.weeks}w ${r.days}d`, weeks: r.weeks, days: r.days, trimester: r.trimester, days_left: r.daysLeft,
    first_trimester_ends: toYmd(r.firstTrimesterEnd), second_trimester_ends: toYmd(r.secondTrimesterEnd),
    method: 'Naegele rule: LMP + 280 days, shifted by cycle length - 28 (IVF: transfer + 263/261 days, ACOG CO700). An estimate, not medical advice.',
    source_url: sourceUrl('due-date-calculator', { method, lmp: i.date, cycle, usw: i.us_weeks ?? '', usd: i.us_days ?? '' }, i.locale),
  };
}

export function timeZone(i: { date: string; time: string; from: string; to: string[]; locale?: string }) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(i.time.trim());
  const t = parseYmd(i.date);
  if (!m || +m[1] > 23 || +m[2] > 59) throw new ToolInputError(`time must be HH:MM (24-hour), got "${i.time}"`);
  if (Number.isNaN(t)) throw new ToolInputError(`date must be a valid date in YYYY-MM-DD format, got "${i.date}"`);
  for (const z of [i.from, ...i.to]) if (!isValidZone(z)) throw new ToolInputError(`"${z}" is not an IANA time zone (e.g. America/New_York, Asia/Seoul)`);
  const d = new Date(t);
  const wall: Wall = { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: +m[1], mi: +m[2] };
  const { utc, status } = zonedToUtc(wall, i.from);
  const show = (z: string) => {
    const v = viewIn(utc, z, i.from), w = v.wall, p = (n: number) => String(n).padStart(2, '0');
    return { zone: z, local: `${w.y}-${p(w.mo)}-${p(w.d)} ${p(w.h)}:${p(w.mi)}`, utc_offset: v.offset, abbreviation: v.abbr, dst: v.dst, day_shift: v.dayShift };
  };
  return {
    utc: new Date(utc).toISOString(), from: show(i.from), to: i.to.map(show),
    note: status === 'gap' ? 'That local time does not exist (DST spring-forward); shifted forward.' : status === 'ambiguous' ? 'That local time occurs twice (DST fall-back); the first occurrence is used.' : undefined,
    source_url: sourceUrl('time-zone-converter', { date: i.date, time: i.time, from: i.from }, i.locale),
  };
}
