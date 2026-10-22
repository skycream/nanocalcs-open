import { describe, it, expect } from 'vitest';
import { detect, redact, restore, luhn, ibanValid, entropy, summarize, PII_TYPES, type PiiType } from './logic';

const kinds = (s: string) => detect(s).map((m) => `${m.type}:${m.value}`);

// 체크섬이 맞는 주민번호 13자리를 만든다
function rrn(front6: string, back6: string): string {
  const d12 = front6 + back6;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = [...d12].reduce((a, c, i) => a + Number(c) * w[i], 0);
  return d12 + String((11 - (sum % 11)) % 10);
}

describe('탐지: 잡아야 하는 것', () => {
  const hit: [string, string, string][] = [
    ['이메일', 'mail me at Jane.Doe+tag@example.co.uk now', 'EMAIL:Jane.Doe+tag@example.co.uk'],
    ['이메일 문장 끝 마침표', 'Contact bob@corp.io.', 'EMAIL:bob@corp.io'],
    ['카드 공백', 'card 4111 1111 1111 1111 exp', 'CARD:4111 1111 1111 1111'],
    ['카드 하이픈', 'card 5500-0000-0000-0004.', 'CARD:5500-0000-0000-0004'],
    ['카드 AmEx 15자리', '378282246310005', 'CARD:378282246310005'],
    ['IPv4', 'server 192.168.0.12, up', 'IP:192.168.0.12'],
    ['IPv4 문장 끝', 'ping 10.0.0.1.', 'IP:10.0.0.1'],
    ['IPv6 전체', 'at 2001:0db8:85a3:0000:0000:8a2e:0370:7334 ok', 'IP:2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
    ['IPv6 축약', 'host 2001:db8::ff00:42:8329 up', 'IP:2001:db8::ff00:42:8329'],
    ['IPv6 루프백', 'bind ::1 only', 'IP:::1'],
    ['IBAN 공백', 'pay to DE89 3704 0044 0532 0130 00 please', 'IBAN:DE89 3704 0044 0532 0130 00'],
    ['IBAN 붙여쓰기', 'GB82WEST12345698765432', 'IBAN:GB82WEST12345698765432'],
    ['전화 국제', 'call +82 10-1234-5678 today', 'PHONE:+82 10-1234-5678'],
    ['전화 국내', '연락처 010-1234-5678 입니다', 'PHONE:010-1234-5678'],
    ['전화 미국', 'dial (415) 555-2671 now', 'PHONE:(415) 555-2671'],
    ['전화 구분자 없음 0시작', 'tel 01012345678', 'PHONE:01012345678'],
    ['OpenAI 키', 'key sk-proj-AbC123xYz789QwErTy456UiOp0', 'KEY:sk-proj-AbC123xYz789QwErTy456UiOp0'],
    ['AWS 키', 'AKIAIOSFODNN7EXAMPLE', 'KEY:AKIAIOSFODNN7EXAMPLE'],
    ['GitHub 토큰', 'ghp_' + 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG5', 'KEY:ghp_aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG5'],
    ['이름 붙은 값', 'password = "Tr0ub4dor&3xK"', 'KEY:Tr0ub4dor&3xK'],
    ['주민번호 하이픈', '주민번호 900101-1234567 확인', 'RRN:900101-1234567'],
    ['주민번호 외국인', '010203-5123456', 'RRN:010203-5123456'],
    ['미국 SSN', 'ssn 123-45-6789', 'SSN:123-45-6789'],
    ['긴 임의 토큰', 'token Zk9Qm2Xv7Lp4Rt8Wn3Yb6Hc1Sd5Fg0JaKq', 'KEY:Zk9Qm2Xv7Lp4Rt8Wn3Yb6Hc1Sd5Fg0JaKq'],
  ];
  it.each(hit)('%s', (_n, input, want) => { expect(kinds(input)).toContain(want); });

  it('체크섬이 맞는 맨숫자 주민번호', () => {
    const r = rrn('900101', '123456');
    expect(kinds(`id ${r}`)).toEqual([`RRN:${r}`]);
  });
});

describe('탐지: 오탐 방지', () => {
  const miss: [string, string][] = [
    ['Luhn 실패 16자리', 'order 4111 1111 1111 1112'],
    ['ISO 날짜', 'on 2024-01-15 and 2024.01.15'],
    ['시각', 'at 12:30:45 sharp'],
    ['버전 번호', 'use v1.2.3 or 2.0'],
    ['옥텟 초과', 'ip 999.1.1.1 and 256.256.256.256'],
    ['@멘션', 'thanks @jane for the fix'],
    ['도메인 없는 이메일', 'a@b'],
    ['IBAN 체크섬 실패', 'DE89 3704 0044 0532 0130 01'],
    ['커밋 해시', 'fixed in 9fceb02d0ae598e95dc970b74767f19372d61af8'],
    ['MD5', 'md5 d41d8cd98f00b204e9800998ecf8427e'],
    ['sk- 가 든 평문', 'the sk-learn-pipeline-example-docs page'],
    ['하이픈 없는 긴 카멜케이스', 'SupercalifragilisticexpialidociousIsAWordInEnglish'],
    ['월이 틀린 주민번호', '901301-1234567'],
    ['SSN 불가 영역', '000-12-3456 and 666-12-3456 and 900-12-3456'],
    ['짧은 숫자열', 'room 1234 floor 12'],
    ['구분자 없는 9자리 일반 숫자', 'order 123456789'],
    ['C++ 범위 연산자', 'std::vector and Foo::bar'],
    ['password 단어만', 'reset your password: abc'],
    ['낮은 엔트로피 값', 'token=aaaaaaaaaaaaaaaa'],
  ];
  it.each(miss)('%s', (_n, input) => { expect(detect(input)).toEqual([]); });

  it('겹치면 카드가 전화보다 우선', () => {
    const m = detect('4111111111111111');
    expect(m.map((x) => x.type)).toEqual(['CARD']);
  });
  it('IP 는 전화로 중복 탐지되지 않는다', () => {
    expect(detect('172.16.254.1').map((x) => x.type)).toEqual(['IP']);
  });
});

describe('알려진 누락(한계) 문서화', () => {
  it('이름·주소·구분자 없는 임의 숫자·16진수 비밀값은 잡지 않는다', () => {
    expect(detect('Jane Doe lives at 12 Main Street, Springfield')).toEqual([]);
    expect(detect('secret 0123456789abcdef0123456789abcdef01234567')).toEqual([]);
  });
});

describe('유틸', () => {
  it('luhn', () => { expect(luhn('4111111111111111')).toBe(true); expect(luhn('4111111111111112')).toBe(false); expect(luhn('12')).toBe(false); });
  it('iban', () => { expect(ibanValid('DE89370400440532013000')).toBe(true); expect(ibanValid('DE89370400440532013001')).toBe(false); expect(ibanValid('DE893704004405320130')).toBe(false); });
  it('entropy', () => { expect(entropy('aaaa')).toBe(0); expect(entropy('abcd')).toBeCloseTo(2); });
});

describe('치환과 복원', () => {
  const text = 'Mail jane@x.com, again JANE@x.com, call 010-1234-5678, key AKIAIOSFODNN7EXAMPLE';
  it('같은 값은 같은 번호, 다른 값은 새 번호', () => {
    const r = redact(text);
    expect(r.output).toBe('Mail [EMAIL_1], again [EMAIL_1], call [PHONE_1], key [KEY_1]');
    expect(summarize(r.matches)).toEqual({ EMAIL: 2, PHONE: 1, KEY: 1 });
    expect(redact('a@b.co c@d.co').output).toBe('[EMAIL_1] [EMAIL_2]');
  });
  it('치환 결과에 원본 값이 남지 않는다', () => {
    const out = redact(text).output;
    for (const s of ['jane@x.com', '010-1234-5678', 'AKIAIOSFODNN7EXAMPLE']) expect(out).not.toContain(s);
  });
  it('복원: 왕복이 원문과 같다 (이메일 대소문자는 첫 값)', () => {
    const t = 'ip 10.0.0.1, card 4111 1111 1111 1111, mail a@b.co';
    const r = redact(t);
    expect(restore(r.output, r.vault).output).toBe(t);
  });
  it('복원: 마크다운 역슬래시와 모르는 태그', () => {
    const r = redact('a@b.co');
    const res = restore('Hi \\[EMAIL_1\\] and [EMAIL_9] and [NOPE]', r.vault);
    expect(res.output).toBe('Hi a@b.co and [EMAIL_9] and [NOPE]');
    expect(res.restored).toBe(1);
    expect(res.unknown).toEqual(['[EMAIL_9]']);
  });
  it('유형을 끄면 그 유형은 그대로 둔다', () => {
    const types = new Set<PiiType>(['EMAIL']);
    expect(redact('a@b.co 10.0.0.1', types).output).toBe('[EMAIL_1] 10.0.0.1');
  });
  it('빈 입력과 전체 유형', () => {
    expect(redact('').output).toBe('');
    expect(PII_TYPES.length).toBe(24);
  });
});
