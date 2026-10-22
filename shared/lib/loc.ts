// 위젯 현지화 공용 함수: 숫자·날짜는 페이지 로케일(html lang)의 Intl, 문구는 labels
import { LOCALES, localeFromPath } from '../config';
// 서버(빌드)에서는 document 가 없으므로 lang 인자를 직접 넘긴다

import { LOC_TABLES, type LocTable } from './locTables';

/*
 * 런타임 ICU 지원 판정. 브라우저마다 ICU 데이터가 달라(Chromium 156: is·ne·kab·zu·ckb 없음, az 는 월 이름 없이 "M05",
 * Safari: ht 가 "M05") 같은 페이지가 방문자 기본 로케일(예: 한국어)로 떨어진다. 표(LOC_TABLES)가 있는 로케일은
 * 런타임이 데이터를 제대로 가졌는지 확인하고, 아니면 표·숫자 폴백 로케일로 그린다. 표는 node 전체 ICU 의 CLDR 에서
 * 뽑았으므로 빌드(node)와 브라우저 출력이 같다
 */
export type IntlProbe = (kind: 'date' | 'number', tag: string) => boolean;
const D_MAY = Date.UTC(2023, 4, 15), D_SUN = Date.UTC(2023, 0, 1);
const defaultProbe: IntlProbe = (kind, tag) => {
  const base = tag.split('-')[0];
  const t = LOC_TABLES[base];
  try {
    if (kind === 'number') {
      if (!Intl.NumberFormat.supportedLocalesOf([tag]).length) return false;
      return !t || new Intl.NumberFormat(tag).format(1234567.5) === t.n;
    }
    if (!Intl.DateTimeFormat.supportedLocalesOf([tag]).length) return false;
    const m = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' }).format(D_MAY);
    // 월 이름 데이터가 비면 "M05"·"5" 꼴이 나온다
    if (/^M?\d+$/.test(m)) return false;
    if (!t) return true;
    // 표와 이름이 다르면(CLDR 판 차이 포함) 표를 쓴다 → 빌드와 같은 출력
    const w = new Intl.DateTimeFormat(tag, { weekday: 'long', timeZone: 'UTC' }).format(D_SUN);
    return m === t.M[4] && w === t.E[0];
  } catch { return false; }
};
let probe: IntlProbe = defaultProbe;
const okCache = new Map<string, boolean>();
/** 테스트용: 지원 판정을 바꿔 끼운다(인자 없으면 기본 판정으로 되돌림) */
export function setIntlProbe(p?: IntlProbe): void { probe = p ?? defaultProbe; okCache.clear(); }
function intlOk(kind: 'date' | 'number', tag: string): boolean {
  const k = `${kind}:${tag}`;
  let v = okCache.get(k);
  if (v === undefined) { v = probe(kind, tag); okCache.set(k, v); }
  return v;
}

/** 페이지 로케일(html lang). 서버(빌드)에서는 lang 인자를 넘긴다 */
export function pageLang(lang?: string): string {
  return (lang ?? (typeof document !== 'undefined' ? document.documentElement.lang : '')) || '';
}
/** 표를 써야 하는 로케일이면 그 표 (런타임 날짜 데이터가 없거나 깨졌을 때만) */
function tableOf(lang?: string): LocTable | undefined {
  const l = pageLang(lang);
  if (/-u-/i.test(l)) return undefined;
  const t = LOC_TABLES[l.split('-')[0]];
  return t && !intlOk('date', intlTag(l)) ? t : undefined;
}

/** 확장(-u-) 포함 원래 Intl 태그. 아랍어·페르시아어·벵골어·쿠르드어·네팔어는 서양 숫자, 태국어·페르시아어는 서기 */
function intlTag(l: string): string {
  const base = l.split('-')[0];
  // 태국어(불기)·페르시아어(태양력 히즈라)는 Intl 기본 달력이 그레고리력이 아니라 날짜 계산 결과가 어긋난다 → 서기로 고정
  const ca = base === 'th' || base === 'fa' ? ['ca-gregory'] : [];
  // 페르시아어·벵골어 등도 Intl 기본이 자국 숫자(۱۲۳·১২৩)라 입력란(0-9)과 어긋나지 않게 서양 숫자로 고정 (아랍-인도 숫자는 digits.ts 의 dg 가 켠다)
  const nu = base === 'ar' || base === 'fa' || base === 'bn' || base === 'ckb' || base === 'ne' ? ['nu-latn'] : [];
  const ext = [...ca, ...nu];
  return ext.length ? `${l}-u-${ext.join('-')}` : l;
}

/** Intl 에 넘길 로케일. 런타임에 그 로케일 숫자 데이터가 없으면 표의 숫자 폴백 로케일(is→nl 등)로 바꾼다 */
export function numLocale(lang?: string): string {
  const l = pageLang(lang);
  if (!l) return 'en';
  // 호출부가 이미 유니코드 확장(-u-)을 붙여 넘기면 그대로 쓴다
  if (/-u-/i.test(l)) return l;
  const tag = intlTag(l);
  const t = LOC_TABLES[l.split('-')[0]];
  if (t) return intlOk('number', tag) ? tag : t.num;
  return tag;
}

/** 복수 범주용 로케일. PluralRules 는 숫자·날짜보다 지원이 넓어(Chromium 도 is·ne 등 지원) 따로 판정 */
export function pluralLocale(lang?: string): string {
  const l = pageLang(lang) || 'en';
  try { if (Intl.PluralRules.supportedLocalesOf([l]).length) return l.replace(/-u-.*$/, ''); } catch { /* 아래 폴백 */ }
  return numLocale(lang).replace(/-u-.*$/, '');
}

/** 페이지 로케일로 숫자 서식. 기본 최대 소수 6자리 */
export function fmtNum(n: number, opts: Intl.NumberFormatOptions = {}, lang?: string): string {
  return new Intl.NumberFormat(numLocale(lang), { maximumFractionDigits: 6, ...opts }).format(n);
}

/** 페이지 로케일로 날짜 서식. 시간대 영향을 없애려면 opts.timeZone 에 'UTC' */
export function fmtDateLoc(d: Date, opts: Intl.DateTimeFormatOptions, lang?: string): string {
  const t = tableOf(lang);
  if (!t) return new Intl.DateTimeFormat(numLocale(lang), opts).format(d);
  return fmtByTable(t, d, opts, numLocale(lang));
}

const DATE_STYLE: Record<string, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
};
/** 날짜 안의 월 이름: 일·연과 함께면 문맥형(Mf·Msf: uz 'may, 2027', be '15 мая'), 월 단독은 단독형.
 *  fDay 면 일과 함께일 때만 문맥형(be 'май 2027') */
function monthIn(t: LocTable, o: Intl.DateTimeFormatOptions, mi: number): string {
  const ctx = t.fDay ? o.day : o.day || o.year;
  return o.month === 'long' ? ((ctx && t.Mf) || t.M)[mi] : ((ctx && t.Msf) || t.Ms)[mi];
}
/** 표로 날짜를 그린다. 날짜 부분은 표의 틀·이름, 시각 부분(시·분·시간대)만 숫자 폴백 로케일의 Intl */
function fmtByTable(t: LocTable, d: Date, opts: Intl.DateTimeFormatOptions, numLoc: string): string {
  const { dateStyle, timeStyle, weekday, year, month, day, ...rest } = opts;
  const o: Intl.DateTimeFormatOptions = dateStyle ? { ...(DATE_STYLE[dateStyle] ?? {}) } : { weekday, year, month, day };
  // 숫자 월(numeric·2-digit)이나 dateStyle short 는 이름이 없으니 숫자 폴백 로케일 그대로
  if ((o.month && o.month !== 'long' && o.month !== 'short' && o.month !== 'narrow') || dateStyle === 'short') {
    return new Intl.DateTimeFormat(numLoc, opts).format(d);
  }
  const tz = opts.timeZone;
  const num = (x: Intl.DateTimeFormatOptions) => Number(new Intl.DateTimeFormat('en-US', { ...x, timeZone: tz }).format(d));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(d));
  const key = `${o.weekday === 'long' ? 'l' : o.weekday ? 's' : ''}${o.year ? 'y' : ''}${o.month === 'long' ? 'M' : o.month ? 'm' : ''}${o.day ? 'd' : ''}`;
  let out = '';
  if (key) {
    const mi = num({ month: 'numeric' }) - 1;
    const v = {
      E: o.weekday === 'long' ? t.E[wd] : o.weekday === 'narrow' ? t.En[wd] : t.Es[wd],
      y: String(num({ year: 'numeric' })), M: monthIn(t, o, mi), d: String(num({ day: 'numeric' })),
    };
    // 표에 없는 드문 조합은 요일·일·월·연 순서로 잇는다
    const pat = t.P[key] ?? [o.weekday && '{E}', o.day && '{d}', o.month && '{M}', o.year && '{y}'].filter(Boolean).join(' ');
    out = pat.replace(/\{([EyMd])\}/g, (_, k: 'E' | 'y' | 'M' | 'd') => v[k]);
  }
  const hasTime = timeStyle || rest.hour !== undefined || rest.minute !== undefined || rest.second !== undefined || rest.timeZoneName !== undefined;
  if (!hasTime) return out;
  const time = new Intl.DateTimeFormat(numLoc, timeStyle ? { timeStyle, timeZone: tz } : rest).format(d);
  return out ? `${out}, ${time}` : time;
}

/** 요일·월 이름 목록 (UTC 기준, 0=일요일 / 0=1월) */
export function weekdayNames(style: 'long' | 'short' | 'narrow' = 'long', lang?: string): string[] {
  const t = tableOf(lang);
  if (t) return [...(style === 'long' ? t.E : style === 'short' ? t.Es : t.En)];
  const f = new Intl.DateTimeFormat(numLocale(lang), { weekday: style, timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2023, 0, 1 + i))));
}
export function monthNames(style: 'long' | 'short' = 'long', lang?: string): string[] {
  const t = tableOf(lang);
  if (t) return [...(style === 'long' ? t.M : t.Ms)];
  const f = new Intl.DateTimeFormat(numLocale(lang), { month: style, timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, i) => f.format(new Date(Date.UTC(2023, i, 1))));
}

/**
 * 숫자+단위 결합 템플릿. labels 에 `${key}_one/_two/_few/_many/_other` 중 필요한 것만 두면
 * Intl.PluralRules 범주에 맞춰 고른다. 없으면 `${key}_other`, 그다음 `${key}` 로 폴백. {n} 은 서식된 숫자로 치환
 */
export function tpl(labels: Record<string, string>, key: string, n: number, lang?: string): string {
  const cat = new Intl.PluralRules(pluralLocale(lang)).select(n);
  const t = labels[`${key}_${cat}`] ?? labels[`${key}_other`] ?? labels[key] ?? '';
  return t.replace(/\{n\}/g, fmtNum(n, {}, lang));
}

/**
 * 퍼센트 값(20 = 20%)을 로케일 규칙대로 찍는다. fr·de·sv·cs "20 %", tr "%20", 그 밖은 "20%".
 * Intl 의 percent 스타일을 쓰므로 기호 위치·간격은 CLDR 을 따른다. 기본 최대 소수 2자리
 */
export function fmtPct(n: number, opts: Intl.NumberFormatOptions = {}, lang?: string): string {
  return new Intl.NumberFormat(numLocale(lang), { style: 'percent', maximumFractionDigits: 2, ...opts }).format(n / 100);
}

/** 빌드 시점 Astro.params.locale(경로: br·zh·tw·ph·in)을 html lang(pt-BR·zh-CN…)으로 바꾼다 */
export function langOfPath(path?: string): string {
  if (!path) return 'en';
  const k = localeFromPath(path);
  return k ? LOCALES[k].htmlLang : path;
}
