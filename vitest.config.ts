import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*'],
    exclude: ['**/build/**', '**/dist/**', '**/node_modules/**', '**/.react-router/**', '**/.local/**'],
  },
})
