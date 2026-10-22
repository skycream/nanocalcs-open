// 시간대 변환: 브라우저 Intl(IANA 시간대 데이터)만 사용. 서머타임은 Intl 이 자동 반영한다.
const MIN = 60000, DAY = 86400000;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    fmtCache.set(tz, f);
  }
  return f;
}

export interface Wall { y: number; mo: number; d: number; h: number; mi: number }

/** 해당 시각(UTC ms)의 시간대 벽시계 값 */
export function wallTime(utc: number, tz: string): Wall {
  const p: Record<string, number> = {};
  for (const part of dtf(tz).formatToParts(new Date(utc))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour % 24, mi: p.minute };
}

/** UTC 와의 차이(분). 동쪽이 양수 */
export function offsetMinutes(utc: number, tz: string): number {
  const w = wallTime(Math.floor(utc / MIN) * MIN, tz);
  return Math.round((Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - Math.floor(utc / MIN) * MIN) / MIN);
}

export type Resolve = 'ok' | 'gap' | 'ambiguous';
/** 시간대의 벽시계 시각 → UTC ms. 서머타임으로 없는 시각(gap)은 건너뛴 뒤 시각, 두 번 있는 시각(ambiguous)은 이른 쪽 */
export function zonedToUtc(w: Wall, tz: string): { utc: number; status: Resolve } {
  const guess = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi);
  const offs = [...new Set([offsetMinutes(guess - DAY, tz), offsetMinutes(guess + DAY, tz)])];
  const valid = offs.map((o) => guess - o * MIN).filter((t) => offsetMinutes(t, tz) === (guess - t) / MIN).sort((a, b) => a - b);
  if (valid.length === 0) return { utc: guess - Math.min(...offs) * MIN, status: 'gap' };
  return { utc: valid[0], status: valid.length > 1 ? 'ambiguous' : 'ok' };
}

/** 'UTC+5:30' / 'UTC-4' / 'UTC' */
export function offsetLabel(min: number): string {
  if (min === 0) return 'UTC';
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return `UTC${min < 0 ? '-' : '+'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** 서머타임(표준시보다 오프셋이 큰 기간) 여부: 그 해 1월 1일과 7월 1일 중 작은 오프셋이 표준시 */
export function isDst(utc: number, tz: string): boolean {
  const y = new Date(utc).getUTCFullYear();
  const std = Math.min(offsetMinutes(Date.UTC(y, 0, 1), tz), offsetMinutes(Date.UTC(y, 6, 1), tz));
  return offsetMinutes(utc, tz) > std;
}

export interface ZoneView { wall: Wall; offset: string; dst: boolean; abbr: string; dayShift: number }

/** 한 시간대로 본 결과. dayShift 는 기준 시간대 날짜와의 차이(일) */
export function viewIn(utc: number, tz: string, fromTz: string): ZoneView {
  const wall = wallTime(utc, tz), base = wallTime(utc, fromTz);
  const abbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(utc)).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return {
    wall, offset: offsetLabel(offsetMinutes(utc, tz)), dst: isDst(utc, tz), abbr,
    dayShift: Math.round((Date.UTC(wall.y, wall.mo - 1, wall.d) - Date.UTC(base.y, base.mo - 1, base.d)) / DAY),
  };
}

export const isValidZone = (tz: string): boolean => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } };

/** 'America/New_York' → { city: 'New York', region: 'America' } */
export function zoneName(tz: string): { city: string; region: string } {
  const parts = tz.split('/');
  return { city: parts[parts.length - 1].replace(/_/g, ' '), region: parts.length > 1 ? parts[0] : '' };
}

export const DEFAULT_ZONES = ['America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];

// 로케일 지역 도시: 목록 맨 앞에 둔다. 하노이·델리·베이징·에르빌은 IANA 이름이 없어 같은 시간대의 대표 도시(호찌민·콜카타·상하이·바그다드)로 둔다
export const LOCAL_ZONES: Record<string, string[]> = {
  ja: ['Asia/Tokyo'], ko: ['Asia/Seoul'], 'en-IN': ['Asia/Kolkata'], id: ['Asia/Jakarta'], ms: ['Asia/Kuala_Lumpur'],
  ar: ['Asia/Riyadh', 'Africa/Cairo'], tr: ['Europe/Istanbul'], es: ['Europe/Madrid', 'America/Mexico_City'], 'pt-BR': ['America/Sao_Paulo'],
  fr: ['Europe/Paris'], de: ['Europe/Berlin'], it: ['Europe/Rome'], ru: ['Europe/Moscow'], pl: ['Europe/Warsaw'], nl: ['Europe/Amsterdam'],
  vi: ['Asia/Ho_Chi_Minh'], th: ['Asia/Bangkok'], 'zh-CN': ['Asia/Shanghai'], 'zh-TW': ['Asia/Taipei'], hi: ['Asia/Kolkata'], bn: ['Asia/Dhaka'],
  ur: ['Asia/Karachi'], fa: ['Asia/Tehran'], uk: ['Europe/Kyiv'], ro: ['Europe/Bucharest'], cs: ['Europe/Prague'], hu: ['Europe/Budapest'],
  el: ['Europe/Athens'], sv: ['Europe/Stockholm'], fil: ['Asia/Manila'], he: ['Asia/Jerusalem'], sw: ['Africa/Nairobi'],
  af: ['Africa/Johannesburg'], ckb: ['Asia/Baghdad'],
  bg: ['Europe/Sofia'], da: ['Europe/Copenhagen'], nb: ['Europe/Oslo'], ta: ['Asia/Kolkata', 'Asia/Singapore'], zu: ['Africa/Johannesburg'], kab: ['Africa/Algiers'],
  sk: ['Europe/Bratislava'], az: ['Asia/Baku'], fi: ['Europe/Helsinki'], lv: ['Europe/Riga'], ne: ['Asia/Kathmandu'], is: ['Atlantic/Reykjavik'], ht: ['America/Port-au-Prince'], tpi: ['Pacific/Port_Moresby'],
  uz: ['Asia/Tashkent'], kk: ['Asia/Almaty'], ky: ['Asia/Bishkek'], be: ['Europe/Minsk'], am: ['Africa/Addis_Ababa'], sq: ['Europe/Tirane'], ka: ['Asia/Tbilisi'], sr: ['Europe/Belgrade'], km: ['Asia/Phnom_Penh'], lo: ['Asia/Vientiane'], si: ['Asia/Colombo'], hr: ['Europe/Zagreb'], sl: ['Europe/Ljubljana'], et: ['Europe/Tallinn'],
};
// 옛 IANA 이름만 아는 브라우저용 별칭
const LEGACY: Record<string, string> = { 'Europe/Kyiv': 'Europe/Kiev', 'Asia/Ho_Chi_Minh': 'Asia/Saigon', 'Asia/Kolkata': 'Asia/Calcutta' };

/** 로케일 기본 도시 목록: 지역 도시 → 세계 주요 도시, 중복 없이 최대 6개 */
export function defaultZones(lang?: string, valid: (tz: string) => boolean = isValidZone): string[] {
  const l = lang ?? '';
  const local = LOCAL_ZONES[l] ?? LOCAL_ZONES[l.split('-')[0]] ?? [];
  const out: string[] = [];
  for (const z0 of [...local, ...DEFAULT_ZONES]) {
    const z = valid(z0) ? z0 : LEGACY[z0];
    if (z && valid(z) && !out.includes(z)) out.push(z);
  }
  return out.slice(0, 6);
}

/** 브라우저가 아는 모든 IANA 시간대 (UTC 포함) */
export function allZones(): string[] {
  const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? DEFAULT_ZONES;
  return list.includes('UTC') ? list : ['UTC', ...list];
}
