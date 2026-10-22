import { describe, it, expect } from 'vitest';
import * as T from '../src/index';

describe('공개 API', () => {
  it('Claude Haiku 4.5 1000x1000 = 1,296 토큰 (패치 28px)', () => {
    const m = T.MODELS.find((x) => x.id === 'claude-haiku-4.5')!;
    expect(T.tokensFor(m, 1000, 1000, 'high').tokens).toBe(1296);
  });
  it('GPT-4.1 타일: 1024x1024 high = 85 + 4*170', () => {
    expect(T.tokensFor(T.MODELS.find((x) => x.id === 'gpt-4.1')!, 1024, 1024, 'high').tokens).toBe(765);
  });
  it('Gemini 2.5: 작은 이미지 258', () => expect(T.gemini2Tokens(300, 300)).toBe(258));
  it('입력 검증', () => expect(T.validInput(0, 10, 1)).toBe(false));
});
