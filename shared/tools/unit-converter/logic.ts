// 단위 변환 순수 함수. 계수는 모두 정의값(정확값)이다
export interface Unit { id: string; name: string; symbol: string; factor: number } // factor = 기준 단위로 바꾸는 배수
export type CategoryId = 'length' | 'mass' | 'temperature' | 'volume' | 'area' | 'speed' | 'time' | 'data';

const IN = 0.0254, FT = 12 * IN, YD = 3 * FT, MI = 1760 * YD; // 국제 인치 (1959)
const LB = 0.45359237;                                         // 국제 파운드 (1959)
const GAL_US = 231 * IN ** 3;                                   // 미국 갤런 = 231 세제곱인치
const GAL_UK = 0.00454609;                                      // 영국 갤런 (정의값, m³)

const u = (id: string, name: string, symbol: string, factor: number): Unit => ({ id, name, symbol, factor });

export const CATEGORIES: Record<CategoryId, Unit[]> = {
  // 기준: 미터
  length: [
    u('mm', 'Millimetre', 'mm', 1e-3), u('cm', 'Centimetre', 'cm', 1e-2), u('m', 'Metre', 'm', 1), u('km', 'Kilometre', 'km', 1e3),
    u('in', 'Inch', 'in', IN), u('ft', 'Foot', 'ft', FT), u('yd', 'Yard', 'yd', YD), u('mi', 'Mile', 'mi', MI), u('nmi', 'Nautical mile', 'nmi', 1852),
  ],
  // 기준: 킬로그램
  mass: [
    u('mg', 'Milligram', 'mg', 1e-6), u('g', 'Gram', 'g', 1e-3), u('kg', 'Kilogram', 'kg', 1), u('t', 'Tonne', 't', 1e3),
    u('oz', 'Ounce', 'oz', LB / 16), u('lb', 'Pound', 'lb', LB), u('st', 'Stone', 'st', 14 * LB),
    u('ton_us', 'Short ton (US)', 'ton', 2000 * LB), u('ton_uk', 'Long ton (UK)', 'LT', 2240 * LB),
  ],
  // 온도는 배수가 아니라 별도 공식 (factor 미사용)
  temperature: [u('c', 'Celsius', '°C', 1), u('f', 'Fahrenheit', '°F', 1), u('k', 'Kelvin', 'K', 1), u('r', 'Rankine', '°R', 1)],
  // 기준: 세제곱미터
  volume: [
    u('ml', 'Millilitre', 'mL', 1e-6), u('l', 'Litre', 'L', 1e-3), u('m3', 'Cubic metre', 'm³', 1),
    u('tsp', 'Teaspoon (US)', 'tsp', GAL_US / 768), u('tbsp', 'Tablespoon (US)', 'tbsp', GAL_US / 256), u('floz', 'Fluid ounce (US)', 'fl oz', GAL_US / 128),
    u('cup', 'Cup (US)', 'cup', GAL_US / 16), u('pt', 'Pint (US)', 'pt', GAL_US / 8), u('qt', 'Quart (US)', 'qt', GAL_US / 4), u('gal', 'Gallon (US)', 'gal', GAL_US),
    u('pt_uk', 'Pint (UK)', 'pt UK', GAL_UK / 8), u('gal_uk', 'Gallon (UK)', 'gal UK', GAL_UK), u('in3', 'Cubic inch', 'in³', IN ** 3), u('ft3', 'Cubic foot', 'ft³', FT ** 3),
  ],
  // 기준: 제곱미터
  area: [
    u('cm2', 'Square centimetre', 'cm²', 1e-4), u('m2', 'Square metre', 'm²', 1), u('ha', 'Hectare', 'ha', 1e4), u('km2', 'Square kilometre', 'km²', 1e6),
    u('in2', 'Square inch', 'in²', IN ** 2), u('ft2', 'Square foot', 'ft²', FT ** 2), u('yd2', 'Square yard', 'yd²', YD ** 2),
    u('ac', 'Acre', 'ac', 4840 * YD ** 2), u('mi2', 'Square mile', 'mi²', MI ** 2),
  ],
  // 기준: 미터/초
  speed: [
    u('mps', 'Metres per second', 'm/s', 1), u('kph', 'Kilometres per hour', 'km/h', 1000 / 3600),
    u('mph', 'Miles per hour', 'mph', MI / 3600), u('fps', 'Feet per second', 'ft/s', FT), u('kn', 'Knot', 'kn', 1852 / 3600),
  ],
  // 기준: 초 (월·년은 그레고리력 평균: 1년 = 365.2425일)
  time: [
    u('ms', 'Millisecond', 'ms', 1e-3), u('s', 'Second', 's', 1), u('min', 'Minute', 'min', 60), u('h', 'Hour', 'h', 3600),
    u('d', 'Day', 'd', 86400), u('wk', 'Week', 'wk', 604800), u('mo', 'Month (average)', 'mo', 365.2425 * 86400 / 12), u('yr', 'Year (average)', 'yr', 365.2425 * 86400),
  ],
  // 기준: 바이트. SI 접두어(10의 거듭제곱)와 IEC 접두어(2의 거듭제곱) 분리
  data: [
    u('bit', 'Bit', 'bit', 1 / 8), u('B', 'Byte', 'B', 1),
    u('kB', 'Kilobyte', 'kB', 1e3), u('MB', 'Megabyte', 'MB', 1e6), u('GB', 'Gigabyte', 'GB', 1e9), u('TB', 'Terabyte', 'TB', 1e12),
    u('KiB', 'Kibibyte', 'KiB', 2 ** 10), u('MiB', 'Mebibyte', 'MiB', 2 ** 20), u('GiB', 'Gibibyte', 'GiB', 2 ** 30), u('TiB', 'Tebibyte', 'TiB', 2 ** 40),
    u('Mbit', 'Megabit', 'Mbit', 1e6 / 8), u('Gbit', 'Gigabit', 'Gbit', 1e9 / 8),
  ],
};

// 온도: 켈빈을 거쳐 변환
const toK: Record<string, (v: number) => number> = { c: (v) => v + 273.15, f: (v) => (v + 459.67) * 5 / 9, k: (v) => v, r: (v) => v * 5 / 9 };
const fromK: Record<string, (v: number) => number> = { c: (v) => v - 273.15, f: (v) => v * 9 / 5 - 459.67, k: (v) => v, r: (v) => v * 9 / 5 };

export type ConvertResult = { ok: true; value: number } | { ok: false; error: 'invalid' | 'unit' | 'belowZero' };

export function convert(cat: CategoryId, from: string, to: string, value: number): ConvertResult {
  if (!Number.isFinite(value)) return { ok: false, error: 'invalid' };
  const units = CATEGORIES[cat];
  const a = units?.find((x) => x.id === from), b = units?.find((x) => x.id === to);
  if (!a || !b) return { ok: false, error: 'unit' };
  let r: number;
  if (cat === 'temperature') {
    const k = toK[from](value);
    if (k < -1e-9) return { ok: false, error: 'belowZero' }; // 절대영도 미만
    r = fromK[to](k);
  } else {
    r = (value * a.factor) / b.factor;
  }
  // 이진 부동소수 잡음 제거 (유효숫자 12자리)
  return { ok: true, value: Number(r.toPrecision(12)) };
}
