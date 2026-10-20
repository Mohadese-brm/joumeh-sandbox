import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3001' } },
  preview: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3001' } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], css: false, include: ['tests/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['tests/api*.test.ts', 'node'], ['tests/db.test.ts', 'node']] },
});
