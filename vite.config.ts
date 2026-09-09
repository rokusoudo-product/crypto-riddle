/// <reference types="vitest/config" />
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    // src/ui/**/*.test.tsx 側は各ファイル先頭の `/** @vitest-environment jsdom */`
    // docblock で jsdom に切り替える（Vitest 4 は environmentMatchGlobs 廃止）。
    setupFiles: ['./src/test/setup.ts'],
  },
})
