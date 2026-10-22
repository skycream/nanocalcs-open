import { defineConfig } from 'tsup';

// 사이트 소스를 번들해 의존성 0 으로 낸다
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2022',
  treeshake: true,
});
