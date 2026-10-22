// 임신 주차 하위 페이지(N주) 중 검색 색인에 두는 로케일. 나머지는 noindex,follow·사이트맵·hreflang·llms 제외(페이지·허브 링크는 유지)
// 오너 결정 2026-10-22: lv 만 색인. 로케일을 켤 때는 이 배열에만 추가한다
// config.ts(isNoindexPath)가 import 하므로 레지스트리를 불러오지 않는다. 경로는 weeks.test 가 레지스트리 슬러그와 맞는지 확인한다
export const INDEXED_WEEK_LOCALES: readonly string[] = ['lv'];

/** 로케일별 도구 페이지 경로(허브). 그 아래 한 단계가 주차 페이지 */
export const WEEK_HUBS: Record<string, string> = {
  en: '/en/pregnancy-week-by-week/',
  lv: '/lv/grutniecibas-nedelas-menesos/',
  nb: '/no/svangerskapsuker-maneder/',
  cs: '/cs/tydny-tehotenstvi-mesice/',
  ro: '/ro/saptamani-sarcina-luni/',
  ar: '/ar/pregnancy-week-by-week/',
};

export const isIndexedWeekLocale = (l: string): boolean => INDEXED_WEEK_LOCALES.includes(l);

/** 경로가 비색인 주차 페이지인지 (허브 자체는 색인) */
export function isNoindexWeekPath(pathname: string): boolean {
  for (const [l, base] of Object.entries(WEEK_HUBS)) {
    if (isIndexedWeekLocale(l) || !pathname.startsWith(base)) continue;
    const sub = pathname.slice(base.length).replace(/\/$/, '');
    if (sub !== '' && !sub.includes('/')) return true;
  }
  return false;
}
