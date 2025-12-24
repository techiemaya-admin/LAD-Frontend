import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['features/**/*.ts', 'features/**/*.tsx'],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@/sdk/shared': path.resolve(__dirname, './shared'),
      '@/sdk/features': path.resolve(__dirname, './features'),
      '@/sdk': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});
