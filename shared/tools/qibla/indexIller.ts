// 키블라 il 페이지 중 검색 색인에 남기는 대표 il(나머지 66개는 noindex,follow·사이트맵 제외, 허브 링크는 유지).
// 기준: TÜİK ADNKS 2025 결과(2025-12-31 기준, 2026-02-09 공표) 인구 상위 15개 il.
// 1~5위 수치는 TÜİK 공표를 옮긴 보도(medyascope 2026-02-09 등), 6~15위는 같은 공표를 옮긴 81개 il 표(sarisivat.com)로 확인했다.
// 참고 인구: İstanbul 15.754.053 · Ankara 5.910.320 · İzmir 4.504.185 · Bursa 3.263.011 · Antalya 2.777.677 · Konya 2.343.409
// · Adana 2.283.609 · Şanlıurfa 2.265.800 · Gaziantep 2.222.415 · Kocaeli 2.161.171 · Mersin 1.956.428 · Diyarbakır 1.852.356
// · Hatay 1.577.531 · Manisa 1.477.756 · Kayseri 1.458.991
export const INDEXED_IL_SLUGS: readonly string[] = [
  'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'konya', 'adana', 'sanliurfa',
  'gaziantep', 'kocaeli', 'mersin', 'diyarbakir', 'hatay', 'manisa', 'kayseri',
];
export const QIBLA_IL_BASE = '/tr/kible-yonu/';
/** /tr/kible-yonu/{il}/ 경로가 비색인 il 인지 (허브 자체는 색인) */
export function isNoindexIlPath(pathname: string): boolean {
  if (!pathname.startsWith(QIBLA_IL_BASE)) return false;
  const slug = pathname.slice(QIBLA_IL_BASE.length).replace(/\/$/, '');
  return slug !== '' && !slug.includes('/') && !INDEXED_IL_SLUGS.includes(slug);
}
