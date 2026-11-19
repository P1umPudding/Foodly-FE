// The web app manifest is a static file in public/, which Vite copies without touching. Its URLs are relative so
// they resolve against the manifest's own URL and follow any `base` (Skaile preview sub-path, #220).
import { describe, expect, it } from 'vitest'
import manifestRaw from '../public/manifest.webmanifest?raw'
import indexHtml from '../index.html?raw'

type Icon = { src: string; sizes: string; type: string; purpose?: string }
const manifest = JSON.parse(manifestRaw) as Record<string, unknown> & { icons: Icon[] }
const iconFiles = Object.keys(import.meta.glob('/public/icons/*.png', { query: '?url' })).map((k) =>
  k.replace('/public/', ''),
)

describe('manifest.webmanifest', () => {
  it('describes an installable standalone app', () => {
    expect(manifest).toMatchObject({
      name: 'Foodly',
      short_name: 'Foodly',
      lang: 'de',
      display: 'standalone',
      background_color: '#fafafa',
      theme_color: '#fafafa',
    })
    expect(manifest.icons.map((i) => [i.sizes, i.purpose ?? 'any'])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ])
  })

  it('points start_url, scope and icons at the sub-path it is served from', () => {
    const at = 'https://example.test/preview/abc/manifest.webmanifest'
    const urls = [manifest.id, manifest.start_url, manifest.scope, ...manifest.icons.map((i) => i.src)] as string[]
    for (const url of urls) expect(url).not.toMatch(/^\/|^[a-z]+:/)
    expect(new URL(manifest.start_url as string, at).pathname).toBe('/preview/abc/')
    expect(new URL(manifest.scope as string, at).pathname).toBe('/preview/abc/')
    expect(new URL(manifest.icons[0].src, at).pathname).toBe('/preview/abc/icons/icon-192.png')
  })

  it('only lists icons that exist', () => {
    for (const icon of manifest.icons) expect(iconFiles).toContain(icon.src)
    expect(iconFiles).toContain('icons/apple-touch-icon.png')
  })
})

describe('index.html', () => {
  it('links the manifest and touch icon root-relative, so Vite prefixes them with base', () => {
    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
  })

  it('draws under the notch and home indicator', () => {
    expect(indexHtml).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/)
  })

  it('registers no service worker (manifest only, #220)', () => {
    expect(indexHtml).not.toContain('serviceWorker')
    const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/manifest.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    expect(Object.keys(sources).length).toBeGreaterThan(50)
    const registering = Object.entries(sources).filter(([, code]) => String(code).includes('serviceWorker'))
    expect(registering.map(([file]) => file)).toEqual([])
  })
})
