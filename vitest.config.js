import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/popup/**', 'src/background/**', 'src/content/index.js'],
      reporter: ['text', 'lcov'],
    },
  },
});
