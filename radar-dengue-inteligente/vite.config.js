import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.js', 'src/utils/**/*.js', 'src/repositories/**/*.js'],
      exclude: ['src/utils/icons.js', 'src/utils/html.js'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
