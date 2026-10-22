import { redact, defaultTypes } from './logic';

// 로케일별 한 줄 답 예문. 번호는 모두 각 알고리즘으로 만든 가짜 값이다(실제 사람의 번호 아님).
export const SAMPLES: Record<string, string> = {
  en: 'Mail jane@example.com or call 010-1234-5678.',
  ko: 'hong@example.com, 010-1234-5678, 주민번호 900101-1234567',
  ja: 'yamada@example.jp、090-1234-5678、マイナンバー 1234 5678 9018',
  'zh-CN': 'zhang@example.cn，手机 13812345678，身份证 110105199003071239',
  tr: 'ayse@example.com, TC 10000000146',
  'pt-BR': 'joao@example.com, CPF 123.456.789-09',
  ru: 'ivan@example.ru, СНИЛС 112-233-445 95',
  es: 'ana@example.es, DNI 12345678Z',
  fr: 'marie@example.fr, NIR 1 85 05 78 006 084 91',
  hi: 'ravi@example.in, PAN ABCPE1234F',
  id: 'budi@example.id, NIK 3174015505900001',
  ar: 'ali@example.sa, 1050000007',
  vi: 'an@example.vn, CCCD 001095123456',
  ur: 'ahmed@example.pk, CNIC 35201-1234567-1',
  ms: 'aminah@example.my, IC 900101-14-5678',
  de: 'max@example.de, IBAN DE89 3704 0044 0532 0130 00',
};

/** 예문을 그 로케일 기본 유형으로 가린 결과. 한 줄 답에 그대로 인용한다 */
export function masked(locale: string): { input: string; output: string } {
  const input = SAMPLES[locale] ?? SAMPLES.en;
  return { input, output: redact(input, defaultTypes(locale)).output };
}
