// 날짜 도우미: 모두 UTC 자정 기준 ms 로 다뤄 서머타임 영향을 받지 않는다
export const DAY = 86400000;

/** 'YYYY-MM-DD' → UTC 자정 ms. 형식·달력 오류면 NaN */
export function parseYmd(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? t : NaN;
}

export const toYmd = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (t: number, n: number) => t + n * DAY;
export const diffDays = (a: number, b: number) => Math.round((b - a) / DAY);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** 'Mon, Oct 7, 2024' */
export function longDate(t: number): string {
  const d = new Date(t);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
/** 'Oct 7' */
export const shortDate = (t: number) => { const d = new Date(t); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
/** 오늘(로컬 달력 날짜)을 UTC 자정 ms 로 */
export const todayUtc = () => { const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); };
