import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // 테스트(node)에서는 server-only 검사가 필요 없다
      'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    // PGlite 를 띄우고 마이그레이션을 올리는 DB 테스트는 여러 파일이 함께 돌면 5초를 넘기기도 한다
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
