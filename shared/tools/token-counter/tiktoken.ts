// js-tiktoken 동적 로드: 랭크 파일이 커서(o200k 약 2.3MB) 처음 입력할 때만 내려받는다
import type { Tiktoken } from 'js-tiktoken/lite';

export type Encoding = 'o200k_base' | 'cl100k_base';
export const ENCODINGS: Encoding[] = ['o200k_base', 'cl100k_base'];

const cache = new Map<Encoding, Promise<Tiktoken>>();

export function loadEncoder(name: Encoding): Promise<Tiktoken> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const [{ Tiktoken }, ranks] = await Promise.all([
        import('js-tiktoken/lite'),
        name === 'o200k_base' ? import('js-tiktoken/ranks/o200k_base') : import('js-tiktoken/ranks/cl100k_base'),
      ]);
      return new Tiktoken(ranks.default);
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

/** 특수 토큰 문구(<|endoftext|> 등)도 일반 글자로 센다 */
export async function countExact(text: string, name: Encoding): Promise<number> {
  if (!text) return 0;
  return (await loadEncoder(name)).encode(text, [], []).length;
}
