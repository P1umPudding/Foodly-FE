/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { previewBase } from './src/previewBase'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Skaile preview: served under the proxy sub-path SKAILE_PREVIEW_BASE, with no
  // backend reachable, so mock data is the default unless VITE_API_URL or
  // VITE_MOCK is set (env or .env files). Injected via `define`, not process.env:
  // Vite restarts in-process on .env/config changes and would keep a stale value.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const inPreview = !!process.env.SKAILE_PREVIEW_BASE?.trim() // `/` counts too
  const forceMock = inPreview && !env.VITE_API_URL && env.VITE_MOCK === undefined
  const previewServer = inPreview ? { host: true, allowedHosts: true as const } : {}

  return {
    base: previewBase(process.env.SKAILE_PREVIEW_BASE),
    define: forceMock ? { 'import.meta.env.VITE_MOCK': JSON.stringify('1') } : {},
    plugins: [react(), tailwindcss()],
    // Dev-only: proxy REST calls to the backend so the browser talks same-origin.
    // Avoids CORS entirely — the backend's `Allow-Headers: *` does NOT cover the
    // required `Authorization` header cross-origin. Prod must serve same-origin.
    server: {
      ...previewServer,
      proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
    },
    preview: previewServer,
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
