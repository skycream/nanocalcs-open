// 셍겐 90/180일 규칙 계산 (규정 (EU) 2016/399 제6조 1항, 유럽연합 집행위원회 단기체류 계산기 기준)
// 날짜는 모두 UTC 자정 기준 정수 일 번호로 다룬다(서머타임 영향 없음). 입국일·출국일 모두 체류일로 센다.
import { parseYmd, toYmd, DAY } from '../../lib/ymd';

export const LIMIT = 90;
export const WINDOW = 180;

export interface Trip { entry: number; exit: number }
export type TripsParse = { ok: true; trips: Trip[] } | { ok: false; error: 'format' | 'order'; index: number };

/** 'YYYY-MM-DD' → 일 번호. 형식 오류면 NaN */
export const dayNo = (s: string): number => { const t = parseYmd(s); return Number.isNaN(t) ? NaN : Math.round(t / DAY); };
export const ymdOf = (n: number): string => toYmd(n * DAY);

/** 딥링크 규격 문자열 'a_b,a_b' 를 여행 목록으로. 빈 문자열은 여행 없음 */
export function parseTrips(s: string): TripsParse {
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  const trips: Trip[] = [];
  for (let i = 0; i < parts.length; i++) {
    const [a, b, extra] = parts[i].split('_');
    const entry = dayNo(a ?? ''), exit = dayNo(b ?? '');
    if (extra !== undefined || Number.isNaN(entry) || Number.isNaN(exit)) return { ok: false, error: 'format', index: i };
    if (exit < entry) return { ok: false, error: 'order', index: i };
    trips.push({ entry, exit });
  }
  return { ok: true, trips };
}
export const tripsToString = (trips: Trip[]) => trips.map((t) => `${ymdOf(t.entry)}_${ymdOf(t.exit)}`).join(',');

/** 체류일 집합. 겹치는 여행의 같은 날은 한 번만 센다 */
export function daySet(trips: Trip[]): Set<number> {
  const s = new Set<number>();
  for (const t of trips) for (let d = t.entry; d <= t.exit; d++) s.add(d);
  return s;
}

/** d 일을 끝으로 하는 180일 창(d-179 .. d)에 든 체류일 수 */
export function usedOn(days: Set<number>, d: number): number {
  let n = 0;
  for (let x = d - WINDOW + 1; x <= d; x++) if (days.has(x)) n++;
  return n;
}

/** d 일에 들어가(또는 이미 머무는 중) 연속으로 머물 때 마지막으로 머물 수 있는 날. d 에 이미 불가하면 null */
export function latestStay(days: Set<number>, d: number): number | null {
  const s = new Set(days);
  let last: number | null = null;
  // 연속 체류는 최대 90일이므로 반복은 91번을 넘지 않는다
  for (let t = d; t <= d + LIMIT; t++) {
    s.add(t);
    if (usedOn(s, t) > LIMIT) break;
    last = t;
  }
  return last;
}

export interface Result {
  used: number;               // 기준일 창(d-179..d) 안의 체류일
  remaining: number;          // 90 - used (0 미만이면 0)
  overstay: boolean;          // 입력한 어떤 체류일에서든 90일 초과
  overstayDay: number | null; // 처음 초과한 날
  inStay: boolean;            // 기준일이 입력한 여행 안에 있음
  latest: number | null;      // 기준일부터 연속으로 머물 수 있는 마지막 날
  earliest: number | null;    // 기준일 이후 하루라도 머물 수 있는 첫날
  full: number | null;        // 기준일 이후 90일을 연속으로 머물 수 있는 첫 입국일
  future: number;             // 기준일보다 뒤에 시작하는 여행 수 (사용일에는 안 들어가고 시뮬레이션에는 들어간다)
}

export function schengen(trips: Trip[], d: number): Result {
  const days = daySet(trips);
  const used = usedOn(days, d);
  let overstayDay: number | null = null;
  for (const x of [...days].sort((a, b) => a - b)) if (usedOn(days, x) > LIMIT) { overstayDay = x; break; }
  const latest = latestStay(days, d);
  let earliest: number | null = null, full: number | null = null;
  // 과거 체류가 모두 창에서 빠지는 데 최대 180일, 뒤에 잡힌 여행까지 넉넉히 본다
  const end = Math.max(d, ...trips.map((t) => t.exit)) + WINDOW + LIMIT;
  for (let t = d; t <= end && full === null; t++) {
    const l = latestStay(days, t);
    if (l === null) continue;
    if (earliest === null) earliest = t;
    if (l - t + 1 >= LIMIT) full = t;
  }
  return {
    used, remaining: Math.max(0, LIMIT - used), overstay: overstayDay !== null, overstayDay,
    inStay: days.has(d), latest, earliest, full, future: trips.filter((t) => t.entry > d).length,
  };
}
