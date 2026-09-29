import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [
      './src/tests/setupTests.ts',
    ],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
})