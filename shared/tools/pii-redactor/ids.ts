// 나라별 신분·납세 번호 검증기. 체크디지트가 있는 번호는 알고리즘으로, 없는 번호는 날짜·지역 코드로 거른다.
// 모든 함수는 숫자(와 허용 문자)만 남긴 문자열을 받는다.

const dg = (s: string, i: number) => s.charCodeAt(i) - 48;
const allSame = (s: string) => /^(.)\1*$/.test(s);
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** 실제 달력에 있는 날짜인가 (연도는 네 자리) */
export function realDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const dim = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}

/** 일반 Luhn (자릿수 제한 없음) */
export function luhnAny(s: string): boolean {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = dg(s, s.length - 1 - i);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** 한국 주민등록번호: 성별자리로 세기를 정해 생년월일 확인 (2020년 10월 이후 발급분은 체크디지트가 없어 날짜만 본다) */
export function rrnDateOk(d: string): boolean {
  const g = dg(d, 6);
  const century = g === 1 || g === 2 || g === 5 || g === 6 ? 1900 : g === 3 || g === 4 || g === 7 || g === 8 ? 2000 : g === 9 || g === 0 ? 1800 : -1;
  return century > 0 && realDate(century + +d.slice(0, 2), +d.slice(2, 4), +d.slice(4, 6));
}

/** 일본 마이넘버 12자리: 앞 11자리에 가중치(오른쪽부터 2..7, 2..6), 11로 나눈 나머지가 0·1이면 0, 아니면 11-나머지 */
export function myNumberValid(d: string): boolean {
  if (!/^\d{12}$/.test(d)) return false;
  let sum = 0;
  for (let n = 1; n <= 11; n++) sum += dg(d, 11 - n) * (n <= 6 ? n + 1 : n - 5);
  const r = sum % 11;
  return (r <= 1 ? 0 : 11 - r) === dg(d, 11);
}

/** 중국 居民身份证 18자리: ISO 7064 MOD 11-2, 마지막은 0-9 또는 X. 7~14자리는 생년월일 */
export function cnIdValid(raw: string): boolean {
  const s = raw.toUpperCase();
  if (!/^[1-9]\d{16}[\dX]$/.test(s)) return false;
  const y = +s.slice(6, 10);
  if (y < 1900 || y > 2099 || !realDate(y, +s.slice(10, 12), +s.slice(12, 14))) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += dg(s, i) * w[i];
  return '10X98765432'[sum % 11] === s[17];
}

// Verhoeff 표 (Aadhaar)
const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

export function verhoeff(s: string): boolean {
  let c = 0;
  for (let i = 0; i < s.length; i++) c = VD[c][VP[i % 8][dg(s, s.length - 1 - i)]];
  return c === 0;
}

/** 인도 Aadhaar 12자리: 첫 자리 2~9, Verhoeff 체크 */
export const aadhaarValid = (d: string) => /^[2-9]\d{11}$/.test(d) && verhoeff(d);

/** 인도 PAN: AAAAA9999A, 4번째 글자는 보유자 유형(P 개인, C 회사 …) */
export const panValid = (s: string) => /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/.test(s);

/** 터키 T.C. Kimlik No 11자리 */
export function tcknValid(d: string): boolean {
  if (!/^[1-9]\d{10}$/.test(d)) return false;
  const odd = dg(d, 0) + dg(d, 2) + dg(d, 4) + dg(d, 6) + dg(d, 8);
  const even = dg(d, 1) + dg(d, 3) + dg(d, 5) + dg(d, 7);
  if ((((odd * 7 - even) % 10) + 10) % 10 !== dg(d, 9)) return false;
  let s10 = 0;
  for (let i = 0; i < 10; i++) s10 += dg(d, i);
  return s10 % 10 === dg(d, 10);
}

// 가중합 mod 11 체크디지트 (브라질식: 나머지 <2 이면 0, 아니면 11-나머지)
function mod11br(d: string, w: number[]): number {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += dg(d, i) * w[i];
  const r = s % 11;
  return r < 2 ? 0 : 11 - r;
}

/** 브라질 CPF 11자리 */
export function cpfValid(d: string): boolean {
  if (!/^\d{11}$/.test(d) || allSame(d)) return false;
  return mod11br(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === dg(d, 9) && mod11br(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === dg(d, 10);
}

/** 브라질 CNPJ 14자리 */
export function cnpjValid(d: string): boolean {
  if (!/^\d{14}$/.test(d) || allSame(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return mod11br(d, w1) === dg(d, 12) && mod11br(d, [6, ...w1]) === dg(d, 13);
}

/** 인도네시아 NIK 16자리: 도(11~96) + 시군 + 구 + 생년월일(여성은 일+40) + 일련번호. 체크디지트 없음 */
export function nikValid(d: string): boolean {
  if (!/^\d{16}$/.test(d)) return false;
  const prov = +d.slice(0, 2);
  if (prov < 11 || prov > 96 || d.slice(2, 4) === '00' || d.slice(4, 6) === '00' || d.slice(12) === '0000') return false;
  let day = +d.slice(6, 8);
  if (day > 40) day -= 40;
  return realDate(2000, +d.slice(8, 10), day); // 연도 두 자리라 윤년을 넉넉히 허용
}

/** 러시아 SNILS 11자리: 앞 9자리 × (9..1) 합 → 100 미만 그대로, 100·101 은 00, 그 외 101로 나눈 나머지(100이면 00) */
export function snilsValid(d: string): boolean {
  if (!/^\d{11}$/.test(d) || allSame(d.slice(0, 9))) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += dg(d, i) * (9 - i);
  let c = s < 100 ? s : s === 100 || s === 101 ? 0 : s % 101;
  if (c === 100) c = 0;
  return c === +d.slice(9);
}

const innCheck = (d: string, w: number[]) => (w.reduce((a, x, i) => a + x * dg(d, i), 0) % 11) % 10;

/** 러시아 INN: 법인 10자리 또는 개인 12자리 */
export function innValid(d: string): boolean {
  if (allSame(d)) return false;
  if (/^\d{10}$/.test(d)) return innCheck(d, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === dg(d, 9);
  if (/^\d{12}$/.test(d)) {
    return innCheck(d, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === dg(d, 10) && innCheck(d, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === dg(d, 11);
  }
  return false;
}

/** 스페인 DNI(8자리+글자)·NIE(X/Y/Z+7자리+글자): 숫자 mod 23 으로 글자 확인 */
export function dniValid(raw: string): boolean {
  const s = raw.toUpperCase();
  const m = s.match(/^([XYZ]?)(\d{7,8})([A-Z])$/);
  if (!m || (m[1] ? m[2].length !== 7 : m[2].length !== 8)) return false;
  const n = Number((m[1] ? 'XYZ'.indexOf(m[1]) : '') + m[2]);
  return 'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23] === m[3];
}

/** 프랑스 NIR(사회보장번호) 15자리: 키 = 97 - (앞 13자리 mod 97). 코르시카 2A·2B 는 19·18 로 바꿔 계산 */
export function nirValid(raw: string): boolean {
  const s = raw.toUpperCase();
  if (!/^[1-478]\d{4}(?:\d{2}|2[AB])\d{8}$/.test(s)) return false;
  const mm = +s.slice(3, 5);
  if (!((mm >= 1 && mm <= 12) || (mm >= 20 && mm <= 42) || mm >= 50)) return false;
  const body = s.slice(0, 13);
  const num = BigInt(body.replace('2A', '19').replace('2B', '18'));
  return 97n - (num % 97n) === BigInt(s.slice(13));
}

/** 파키스탄 CNIC 13자리(12345-1234567-1): 첫 자리는 지역 1~7. 체크디지트 없음 */
export const cnicValid = (d: string) => /^[1-7]\d{12}$/.test(d);

// 말레이시아 MyKad 출생지 코드(국내 주·국외 지역)
const MY_PB = /^(0[1-9]|1[0-6]|2[1-9]|[3-5]\d|6[0-8]|7[1-24-9]|8[2-9]|9[0-35689])$/;

/** 말레이시아 MyKad 12자리(YYMMDD-PB-####): 생년월일과 출생지 코드 확인 */
export function mykadValid(d: string): boolean {
  if (!/^\d{12}$/.test(d) || !MY_PB.test(d.slice(6, 8))) return false;
  return realDate(2000, +d.slice(2, 4), +d.slice(4, 6));
}

/** 사우디 국민 ID(1로 시작)·이카마(2로 시작) 10자리: Luhn */
export const saIdValid = (d: string) => /^[12]\d{9}$/.test(d) && luhnAny(d);

// 베트남 CCCD 앞 3자리 성·시 코드
const VN_PROV = new Set('001 002 004 006 008 010 011 012 014 015 017 019 020 022 024 025 026 027 030 031 033 034 035 036 037 038 040 042 044 045 046 048 049 051 052 054 056 058 060 062 064 066 067 068 070 072 074 075 077 079 080 082 083 084 086 087 089 091 092 093 094 095 096'.split(' '));

/** 베트남 CCCD 12자리: 성 코드 + 성별·세기 자리 + 출생연도 두 자리 + 일련번호. 체크디지트 없음 */
export const cccdValid = (d: string) => /^\d{12}$/.test(d) && VN_PROV.has(d.slice(0, 3)) && d.slice(6) !== '000000';
