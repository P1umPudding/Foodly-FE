/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: proxy REST calls to the backend so the browser talks same-origin.
  // Avoids CORS entirely — the backend's `Allow-Headers: *` does NOT cover the
  // required `Authorization` header cross-origin. Prod must serve same-origin.
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
