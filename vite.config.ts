/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { previewBase } from './src/previewBase'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Skaile preview: the app is served under a proxy sub-path given in
  // SKAILE_PREVIEW_BASE. A value of `/` still counts as preview. There's no
  // backend reachable from the preview, so it runs on the mock data unless a
  // VITE_API_URL (or an explicit VITE_MOCK) is set in the env or .env files.
  // Injected via `define`, not process.env: Vite restarts the server in-process
  // on .env/config changes, and a written process.env value would outlive that.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const inPreview = !!process.env.SKAILE_PREVIEW_BASE?.trim()
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
