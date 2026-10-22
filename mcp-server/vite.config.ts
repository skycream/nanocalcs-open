// 서버 번들: 사이트 logic.ts·urlState·catalog.json 을 dist/index.js 하나로 묶는다. npm 의존성은 외부로 남긴다
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = import.meta.dirname;
const req = createRequire(resolve(here, 'package.json'));
// 테스트에서는 사이트 파일(token-counter/tiktoken.ts)의 js-tiktoken import 가 site/node_modules 를 찾는다. 이 패키지 것으로 돌린다.
// 빌드에서는 외부 의존성으로 남겨 실행 시 Node 가 패키지 node_modules 에서 찾는다
const TIKTOKEN = ['js-tiktoken/lite', 'js-tiktoken/ranks/o200k_base', 'js-tiktoken/ranks/cl100k_base'];
const testAlias = process.env.VITEST ? TIKTOKEN.map((id) => ({ find: id, replacement: req.resolve(id) })) : [];

export default defineConfig({
  // site/tsconfig.json 은 astro 설정을 상속해 사이트 의존성 없이 못 읽는다
  tsconfig: resolve(here, 'tsconfig.json'),
  resolve: { alias: testAlias },
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    target: 'node20',
    minify: false,
    emptyOutDir: true,
    rolldownOptions: { external: [/^@modelcontextprotocol\/sdk(\/.*)?$/, /^zod(\/.*)?$/, /^js-tiktoken(\/.*)?$/], output: { entryFileNames: 'index.js', codeSplitting: false } },
  },
  test: { include: ['test/**/*.test.ts'], testTimeout: 30000 },
});
