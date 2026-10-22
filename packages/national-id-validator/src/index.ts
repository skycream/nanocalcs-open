// 사이트 pii-redactor 의 검증·탐지 로직을 그대로 재수출한다 (단일 진실 원천: site/src/tools/pii-redactor).
import { detect, PII_TYPES, type PiiType } from '../../../shared/tools/pii-redactor/logic';

export {
  realDate, luhnAny, rrnDateOk, myNumberValid, cnIdValid, verhoeff, aadhaarValid, panValid, tcknValid,
  cpfValid, cnpjValid, nikValid, snilsValid, innValid, dniValid, nirValid, cnicValid, mykadValid, saIdValid, cccdValid,
} from '../../../shared/tools/pii-redactor/ids';
export { NATIONAL_TYPES, NATIONAL_COUNTRY, NATIONAL_NAME, type NationalType } from '../../../shared/tools/pii-redactor/national';
export { detect, ibanValid, luhn, rrnChecksum, PII_TYPES, COMMON_TYPES, type PiiType, type Match } from '../../../shared/tools/pii-redactor/logic';

/** 값 전체가 해당 종류의 유효한 번호인가. 구분자(공백·하이픈)가 있어도 된다 */
export function validate(type: PiiType, value: string): boolean {
  if (!PII_TYPES.includes(type)) throw new RangeError(`unknown type: ${type}`);
  const v = value.trim();
  const m = detect(v, new Set<PiiType>([type]));
  return m.length === 1 && m[0].start === 0 && m[0].end === v.length;
}
