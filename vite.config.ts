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
  // VITE_API_URL is provided (env or .env files).
  const inPreview = !!process.env.SKAILE_PREVIEW_BASE?.trim()
  const apiUrl = process.env.VITE_API_URL || loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL
  if (inPreview && !apiUrl) process.env.VITE_MOCK ??= '1'
  const previewServer = inPreview ? { host: true, allowedHosts: true as const } : {}

  return {
    base: previewBase(process.env.SKAILE_PREVIEW_BASE),
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
