import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 사이트의 기존 테스트도 그대로 돌린다 (사이트 파일이 이 패키지의 vitest 를 쓰도록 별칭)
export default defineConfig({
  tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
  resolve: { alias: { vitest: fileURLToPath(new URL('./node_modules/vitest/dist/index.js', import.meta.url)) } },
  test: { include: ['test/**/*.test.ts', '../../shared/tools/vision-token-calculator/logic.test.ts'] },
  server: { fs: { strict: false } },
});
