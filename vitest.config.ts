import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/main/services/**/*.ts', 'src/main/repositories/**/*.ts'],
      exclude: ['src/main/ipc/**', 'src/renderer/**', 'node_modules/**'],
      thresholds: {
        branches: 75,
        functions: 100,
        lines: 100,
        statements: 100
      }
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
