// 나라별 신분번호 검증·탐지 표 테스트. 실제 개인 번호는 쓰지 않고, 아래 생성기가 각 알고리즘으로 만든 가짜 값만 쓴다.
import { describe, it, expect } from 'vitest';
import * as V from './ids';
import { detect, redact, restore, defaultTypes, PII_TYPES, COMMON_TYPES, type PiiType } from './logic';
import { NATIONAL_TYPES, LOCALE_IDS } from './national';
import { SAMPLES } from './samples';

describe('로케일 예문', () => {
  it.each(Object.entries(SAMPLES))('%s: 숫자 개인정보와 이메일이 모두 태그로 바뀐다', (l, s) => {
    const out = redact(s, defaultTypes(l)).output;
    expect(out).not.toMatch(/\d{4}/);
    expect(out).not.toMatch(/@/);
  });
});

// ── 가짜 번호 생성기: 본문을 주면 체크디지트를 붙인다 ──
const dsum = (s: string, w: number[]) => w.reduce((a, x, i) => a + x * Number(s[i]), 0);
const br = (s: string, w: number[]) => { const r = dsum(s, w) % 11; return r < 2 ? 0 : 11 - r; };
const gen = {
  myNumber(b11: string) {
    let s = 0; for (let n = 1; n <= 11; n++) s += Number(b11[11 - n]) * (n <= 6 ? n + 1 : n - 5);
    const r = s % 11; return b11 + (r <= 1 ? 0 : 11 - r);
  },
  cnId(b17: string) { return b17 + '10X98765432'[dsum(b17, [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]) % 11]; },
  verhoeff(b: string) { for (let c = 0; c < 10; c++) if (V.verhoeff(b + c)) return b + c; throw new Error('verhoeff'); },
  tckn(b9: string) {
    const d = [...b9].map(Number);
    const d10 = (((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10;
    const d11 = (d.reduce((a, x) => a + x, 0) + d10) % 10; return b9 + d10 + d11;
  },
  cpf(b9: string) { const a = b9 + br(b9, [10, 9, 8, 7, 6, 5, 4, 3, 2]); return a + br(a, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]); },
  cnpj(b12: string) { const w = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const a = b12 + br(b12, w); return a + br(a, [6, ...w]); },
  snils(b9: string) {
    const s = dsum(b9, [9, 8, 7, 6, 5, 4, 3, 2, 1]);
    let c = s < 100 ? s : s === 100 || s === 101 ? 0 : s % 101; if (c === 100) c = 0; return b9 + String(c).padStart(2, '0');
  },
  inn10(b9: string) { return b9 + (dsum(b9, [2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10; },
  inn12(b10: string) {
    const a = b10 + (dsum(b10, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10;
    return a + (dsum(a, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10;
  },
  dni(n: string, prefix = '') { return prefix + n + 'TRWAGMYFPDXBNJZSQVHLCKE'[Number((prefix ? 'XYZ'.indexOf(prefix) : '') + n) % 23]; },
  nir(b13: string) { const k = 97n - (BigInt(b13.replace('2A', '19').replace('2B', '18')) % 97n); return b13 + String(k).padStart(2, '0'); },
  luhn(b: string) { for (let c = 0; c < 10; c++) if (V.luhnAny(b + c)) return b + c; throw new Error('luhn'); },
  rrn(b12: string) { const s = dsum(b12, [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]); return b12 + (11 - (s % 11)) % 10; },
};
// 마지막 자리를 바꿔 체크디지트를 깨뜨린다
const bump = (s: string) => s.slice(0, -1) + ((Number(s.at(-1)) + 1) % 10);

const F = {
  myNumber: gen.myNumber('12345678901'),
  cnId: gen.cnId('11010519900307123'),
  aadhaar: gen.verhoeff('23456789012'),
  tckn: gen.tckn('100000001'),
  cpf: gen.cpf('123456789'),
  cnpj: gen.cnpj('112223330001'),
  snils: gen.snils('112233445'),
  inn10: gen.inn10('770708389'),
  inn12: gen.inn12('5003012345'),
  dni: gen.dni('12345678'),
  nie: gen.dni('1234567', 'X'),
  nir: gen.nir('1850578006084'),
  nirCorse: gen.nir('290012A123456'),
  said: gen.luhn('105000000'),
  rrn: gen.rrn('950615123456'),
};

describe('검증기: 생성한 가짜 값은 통과, 체크디지트를 깨면 실패', () => {
  const rows: [string, (s: string) => boolean, string, string][] = [
    ['마이넘버', V.myNumberValid, F.myNumber, bump(F.myNumber)],
    ['중국 신분증', V.cnIdValid, F.cnId, F.cnId.slice(0, -1) + (F.cnId.endsWith('0') ? '1' : '0')],
    ['Aadhaar', V.aadhaarValid, F.aadhaar, bump(F.aadhaar)],
    ['TC Kimlik', V.tcknValid, F.tckn, bump(F.tckn)],
    ['CPF', V.cpfValid, F.cpf, bump(F.cpf)],
    ['CNPJ', V.cnpjValid, F.cnpj, bump(F.cnpj)],
    ['SNILS', V.snilsValid, F.snils, bump(F.snils)],
    ['INN 10', V.innValid, F.inn10, bump(F.inn10)],
    ['INN 12', V.innValid, F.inn12, bump(F.inn12)],
    ['DNI', V.dniValid, F.dni, F.dni.slice(0, -1) + (F.dni.endsWith('A') ? 'B' : 'A')],
    ['NIE', V.dniValid, F.nie, F.nie.slice(0, -1) + (F.nie.endsWith('A') ? 'B' : 'A')],
    ['NIR', V.nirValid, F.nir, bump(F.nir)],
    ['NIR 코르시카', V.nirValid, F.nirCorse, bump(F.nirCorse)],
    ['사우디 ID', V.saIdValid, F.said, bump(F.said)],
  ];
  it.each(rows)('%s', (_n, fn, ok, bad) => { expect(fn(ok)).toBe(true); expect(fn(bad)).toBe(false); });

  const shape: [string, (s: string) => boolean, string, boolean][] = [
    ['PAN 개인', V.panValid, 'ABCPE1234F', true],
    ['PAN 4번째 글자 틀림', V.panValid, 'ABCDE1234F', false],
    ['NIK', V.nikValid, '3174015505900001', true], // 여성 생일 15+40
    ['NIK 도 코드 틀림', V.nikValid, '0174011505900001', false],
    ['NIK 날짜 틀림', V.nikValid, '3174013213900001', false],
    ['CNIC', V.cnicValid, '3520112345671', true],
    ['CNIC 지역 9', V.cnicValid, '9520112345671', false],
    ['MyKad', V.mykadValid, '900101145678', true],
    ['MyKad 출생지 00', V.mykadValid, '900101005678', false],
    ['MyKad 날짜 틀림', V.mykadValid, '901301145678', false],
    ['CCCD', V.cccdValid, '001095123456', true],
    ['CCCD 성 코드 없음', V.cccdValid, '003095123456', false],
    ['주민번호 2000년대 2월 29일', V.rrnDateOk, '0002293123456', true],
    ['주민번호 1900년대 2월 29일(평년)', V.rrnDateOk, '0102291123456', false],
    ['CPF 같은 숫자 반복', V.cpfValid, '11111111111', false],
    ['중국 신분증 생일 틀림', V.cnIdValid, gen.cnId('11010519901307123'), false],
  ];
  it.each(shape)('%s', (_n, fn, v, want) => { expect(fn(v)).toBe(want); });
});

const all = new Set<PiiType>(PII_TYPES);
const kinds = (s: string, t: Set<PiiType> = all) => detect(s, t).map((m) => `${m.type}:${m.value}`);
const only = (...t: PiiType[]) => new Set<PiiType>([...COMMON_TYPES, ...t]);

describe('탐지: 글 속 번호 (그 나라 기본 유형으로)', () => {
  const f = (s: string, a: number[]) => { let o = '', i = 0; for (const n of a) { o += s.slice(i, i + n) + ' '; i += n; } return o.trim(); };
  const rows: [string, PiiType[], string, string][] = [
    ['주민번호 맨숫자', ['RRN'], `번호 ${F.rrn} 입니다`, `RRN:${F.rrn}`],
    ['마이넘버 공백', ['MYNUMBER'], `マイナンバー ${f(F.myNumber, [4, 4, 4])} です`, `MYNUMBER:${f(F.myNumber, [4, 4, 4])}`],
    ['중국 신분증', ['CNID'], `身份证号${F.cnId}。`, `CNID:${F.cnId}`],
    ['Aadhaar 공백', ['AADHAAR'], `Aadhaar ${f(F.aadhaar, [4, 4, 4])}`, `AADHAAR:${f(F.aadhaar, [4, 4, 4])}`],
    ['PAN', ['PAN'], 'PAN: ABCPE1234F.', 'PAN:ABCPE1234F'],
    ['TC Kimlik', ['TCKN'], `TC ${F.tckn}`, `TCKN:${F.tckn}`],
    ['CPF 서식', ['CPF'], `CPF ${F.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`, `CPF:${F.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`],
    ['CNPJ 서식', ['CNPJ'], `CNPJ ${F.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`, `CNPJ:${F.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`],
    ['NIK', ['NIK'], 'NIK 3174015505900001', 'NIK:3174015505900001'],
    ['SNILS 서식', ['SNILS'], `СНИЛС ${F.snils.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1-$2-$3 $4')}`, `SNILS:${F.snils.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1-$2-$3 $4')}`],
    ['INN 12', ['INN'], `ИНН ${F.inn12}`, `INN:${F.inn12}`],
    ['DNI', ['DNI'], `DNI ${F.dni}.`, `DNI:${F.dni}`],
    ['NIE 하이픈', ['DNI'], `NIE X-${F.nie.slice(1, 8)}-${F.nie.slice(8)}`, `DNI:X-${F.nie.slice(1, 8)}-${F.nie.slice(8)}`],
    ['NIR 공백', ['NIR'], `n° ${f(F.nir, [1, 2, 2, 2, 3, 3, 2])}`, `NIR:${f(F.nir, [1, 2, 2, 2, 3, 3, 2])}`],
    ['CNIC', ['CNIC'], 'CNIC 35201-1234567-1', 'CNIC:35201-1234567-1'],
    ['MyKad', ['MYKAD'], 'IC 900101-14-5678', 'MYKAD:900101-14-5678'],
    ['사우디 ID', ['SAID'], `رقم الهوية ${F.said}`, `SAID:${F.said}`],
    ['CCCD', ['CCCD'], 'CCCD 001095123456', 'CCCD:001095123456'],
    ['중국 휴대폰', [], '手机 13812345678', 'PHONE:13812345678'],
    ['중국 휴대폰 +86', [], '+86 138 1234 5678', 'PHONE:+86 138 1234 5678'],
    ['일본 휴대폰', [], '携帯 090-1234-5678', 'PHONE:090-1234-5678'],
    ['한국 휴대폰', [], '010-9876-5432', 'PHONE:010-9876-5432'],
  ];
  it.each(rows)('%s', (_n, t, input, want) => { expect(kinds(input, only(...t))).toContain(want); });
});

describe('탐지: 오탐 방지', () => {
  const rows: [string, PiiType[], string][] = [
    ['마이넘버 체크 실패', ['MYNUMBER'], `番号 ${bump(F.myNumber)}`],
    ['CPF 체크 실패', ['CPF'], `CPF ${bump(F.cpf)}`],
    ['TC 체크 실패', ['TCKN'], `TC ${bump(F.tckn)}`],
    ['DNI 글자 틀림', ['DNI'], `DNI ${F.dni.slice(0, -1)}${F.dni.endsWith('A') ? 'B' : 'A'}`],
    ['PAN 소문자 단어', ['PAN'], 'abcpe1234f'],
    ['긴 숫자열 일부를 자르지 않음', ['CCCD', 'MYKAD', 'INN'], 'order 0010951234567890123'],
    ['꺼진 유형은 찾지 않음', [], `TC ${F.tckn}`],
  ];
  it.each(rows)('%s', (_n, t, input) => { expect(detect(input, only(...t)).filter((m) => m.type !== 'PHONE')).toEqual([]); });
});

describe('로케일 기본값', () => {
  it.each(Object.entries(LOCALE_IDS))('%s: 공통 + 그 나라 번호', (l, ids) => {
    expect([...defaultTypes(l)].sort()).toEqual([...COMMON_TYPES, ...ids!].sort());
  });
  it('모르는 로케일은 공통만', () => { expect([...defaultTypes('xx')]).toEqual([...COMMON_TYPES]); });
  it('모든 신분번호 유형이 어떤 로케일의 기본값에 들어 있다', () => {
    const used = new Set(Object.values(LOCALE_IDS).flat());
    expect(NATIONAL_TYPES.filter((t) => !used.has(t))).toEqual([]);
  });
});

describe('치환·복원 왕복 (신분번호 포함)', () => {
  it('여러 나라 번호가 섞여도 원문으로 돌아온다', () => {
    const t = `TC ${F.tckn}, CPF ${F.cpf}, DNI ${F.dni}, mail a@b.co, 身份证 ${F.cnId}`;
    const r = redact(t, all);
    expect(r.output).toBe('TC [TCKN_1], CPF [CPF_1], DNI [DNI_1], mail [EMAIL_1], 身份证 [CNID_1]');
    expect(restore(r.output, r.vault).output).toBe(t);
  });
});
