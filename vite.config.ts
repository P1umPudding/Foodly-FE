/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Skaile preview: the app is served under a proxy sub-path given in
// SKAILE_PREVIEW_BASE. There's no backend reachable from the preview, so it runs
// on the mock data unless a VITE_API_URL is provided.
const previewBase = process.env.SKAILE_PREVIEW_BASE
if (previewBase && !process.env.VITE_API_URL) process.env.VITE_MOCK ??= '1'
const base = previewBase ? `/${previewBase.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/') : '/'
const previewServer = previewBase ? { host: true, allowedHosts: true as const } : {}

// https://vitejs.dev/config/
export default defineConfig({
  base,
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
})
