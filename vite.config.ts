import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// API_PORT lets a second local preview (e.g. admin-demo) run next to another one. Default 3001.
const apiTarget = `http://127.0.0.1:${process.env.API_PORT ?? 3001}`;
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', proxy: { '/api': apiTarget } },
  preview: { host: '127.0.0.1', proxy: { '/api': apiTarget } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], css: false, include: ['tests/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['tests/api*.test.ts', 'node'], ['tests/db.test.ts', 'node']] },
});
