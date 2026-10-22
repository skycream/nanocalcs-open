import { describe, it, expect } from 'vitest';
import { validate, detect, cpfValid, NATIONAL_TYPES, ibanValid } from '../src/index';

describe('공개 API', () => {
  it('validate: CPF 유효·무효', () => {
    expect(validate('CPF', '529.982.247-25')).toBe(true);
    expect(validate('CPF', '529.982.247-26')).toBe(false);
    expect(cpfValid('52998224725')).toBe(true);
  });
  it('validate: IBAN', () => {
    expect(validate('IBAN', 'GB82 WEST 1234 5698 7654 32')).toBe(true);
    expect(ibanValid('GB82WEST12345698765433')).toBe(false);
  });
  it('validate: 값 앞뒤에 다른 글자가 있으면 거부', () => {
    expect(validate('CPF', 'x 529.982.247-25')).toBe(false);
  });
  it('detect: 문장 속 번호 탐지', () => {
    const m = detect('id 529.982.247-25 ok', new Set(['CPF']));
    expect(m).toHaveLength(1);
    expect(m[0].value).toBe('529.982.247-25');
  });
  it('국가별 종류 16개 이상', () => expect(NATIONAL_TYPES.length).toBeGreaterThanOrEqual(16));
});
