/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { buildBase, nativeEnvError, nativeEnvWarnings } from './src/nativeBuild'
import { hasModuleSideEffects } from './src/treeshake'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Skaile preview: served under the proxy sub-path SKAILE_PREVIEW_BASE, with no
  // backend reachable, so mock data is the default unless VITE_API_URL or
  // VITE_MOCK is set (env or .env files). Injected via `define`, not process.env:
  // Vite restarts in-process on .env/config changes and would keep a stale value.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const inPreview = !!process.env.SKAILE_PREVIEW_BASE?.trim() // `/` counts too
  const forceMock = inPreview && !env.VITE_API_URL && !env.VITE_MOCK
  const previewServer = inPreview ? { host: true, allowedHosts: true as const } : {}

  // `--mode native` (npm run build:native) builds for the Capacitor shell, which serves dist/ from its own root.
  // The guard passes only with VITE_MOCK=1 or a VITE_API_URL, so forceMock is already off there.
  if (mode === 'native') {
    const error = nativeEnvError(env)
    if (error) throw new Error(error)
    nativeEnvWarnings(env).forEach((warning) => console.warn(warning))
  }

  return {
    base: buildBase(mode, process.env.SKAILE_PREVIEW_BASE),
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
    // The entry chunk stays ~704 kB minified even with the rare routes split off (#221) and unused postxl dependencies
    // dropped (#309): most of it is react-dom and @postxl/ui-components, whose single pre-bundled file can't be
    // tree-shaken without rewriting its code (ruled out, #309), plus React Router 7, whose core is one module the app
    // needs almost whole (#334). The limit sits just above the size with the native PRs #336/#337 (708.34 kB web,
    // 708.73 kB native), so a growing entry warns, and so does a dropped dependency creeping back in (~19 kB).
    build: {
      chunkSizeWarningLimit: 710,
      rollupOptions: { treeshake: { moduleSideEffects: hasModuleSideEffects } },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      // vm contexts keep each file isolated but skip the per-file worker/import cost (#298, ~4x faster).
      // `isolate: false` is no alternative: `vi.mock` leaks into modules other files already loaded.
      pool: 'vmThreads',
      // Fixed cap per worker: the default (memory / maxWorkers) gives a lone worker the whole container,
      // so it only recycles near OOM.
      vmMemoryLimit: '1024MB',
      // Vitest blanks CSS imports, `?raw` included; focusRing.test.ts needs the real token values,
      // phoneVariant.test.ts the real `phone` variant.
      css: { include: [/src\/styles\/(theme|styles)\.css\?raw$/] },
    },
  }
})
