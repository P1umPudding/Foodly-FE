import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// STUBBED is fixed when stubs.ts loads, so each case sets the env first and
// imports a fresh module graph.
async function loadAssets(env: { mock: boolean; base?: string }) {
  vi.stubEnv('VITE_MOCK', env.mock ? '1' : '')
  if (env.base) vi.stubEnv('BASE_URL', env.base)
  vi.resetModules()
  return import('./assets')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('recipe images in REST mode', () => {
  it('serves the placeholder for every image id', async () => {
    const { recipeImageSrc } = await loadAssets({ mock: false })
    for (const id of [1, 3, 999]) expect(recipeImageSrc(id)).toMatch(/\/recipes\/placeholder\.svg$/)
  })

  it('serves the placeholder under the base path', async () => {
    const { recipeImageSrc } = await loadAssets({ mock: false, base: '/foo/' })
    expect(recipeImageSrc(3)).toBe('/foo/recipes/placeholder.svg')
  })

  it('does not show mock image names', async () => {
    const { imageName } = await loadAssets({ mock: false })
    expect(imageName(1)).toBe('Bild 1')
  })
})

describe('recipe images in mock mode', () => {
  it('keeps the mock asset URLs', async () => {
    const { recipeImageSrc } = await loadAssets({ mock: true })
    expect(recipeImageSrc(1)).toMatch(/\/recipes\/1\.png$/)
    expect(recipeImageSrc(3)).toMatch(/\/recipes\/3\.svg$/)
  })

  it('keeps the mock image names', async () => {
    const { imageName } = await loadAssets({ mock: true })
    expect(imageName(1)).toBe('Fertiger Teller')
    expect(imageName(7)).toBe('Bild 7')
  })
})

const vegan = { id: 'vegan', svg: 'abc123' }

describe('tag icon URLs', () => {
  it('builds the backend route from VITE_API_URL in REST mode', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example/v1')
    const { tagImageSrc } = await loadAssets({ mock: false })
    expect(tagImageSrc(vegan)).toBe('https://api.example/v1/tags/vegan/icon')
  })

  it('encodes the tag id, which is the tag name', async () => {
    vi.stubEnv('VITE_API_URL', '/api/v1')
    const { tagImageSrc } = await loadAssets({ mock: false })
    expect(tagImageSrc({ id: 'Süß/Sauer', svg: 'x' })).toBe('/api/v1/tags/S%C3%BC%C3%9F%2FSauer/icon')
  })

  it('keeps the public mock file in mock mode', async () => {
    const { tagImageSrc } = await loadAssets({ mock: true, base: '/foo/' })
    expect(tagImageSrc(vegan)).toBe('/foo/tags/abc123.svg')
  })
})

describe('tag icon loading', () => {
  function fetchBlob(blob: Blob) {
    return vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, blob: async () => blob } as unknown as Response)
  }

  let created: Blob[]
  const originalCreateObjectURL = URL.createObjectURL
  beforeEach(() => {
    created = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return `blob:icon-${created.length}`
    })
  })
  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    vi.restoreAllMocks()
  })

  it('loads the icon once with the bearer and caches the object URL', async () => {
    const spy = fetchBlob(new Blob(['<svg/>'], { type: 'image/svg+xml' }))
    const { loadTagIcon, peekTagIcon } = await loadAssets({ mock: false })
    expect(peekTagIcon(vegan)).toBeUndefined()
    const [a, b] = await Promise.all([loadTagIcon(vegan), loadTagIcon(vegan)])
    expect(a).toBe('blob:icon-1')
    expect(b).toBe('blob:icon-1')
    expect(await loadTagIcon(vegan)).toBe('blob:icon-1')
    expect(peekTagIcon(vegan)).toBe('blob:icon-1')
    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toMatch(/\/tags\/vegan\/icon$/)
    expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Bearer /)
  })

  it('caches a failed load as null without refetching', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Tag has no icon' } }),
    } as unknown as Response)
    const { loadTagIcon, peekTagIcon } = await loadAssets({ mock: false })
    expect(await loadTagIcon(vegan)).toBeNull()
    expect(await loadTagIcon(vegan)).toBeNull()
    expect(peekTagIcon(vegan)).toBeNull()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not request tags without an icon', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const { loadTagIcon, peekTagIcon } = await loadAssets({ mock: false })
    expect(peekTagIcon({ id: 'Ofen', svg: null })).toBeNull()
    expect(await loadTagIcon({ id: 'Ofen', svg: null })).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('types an untyped blob as SVG so <img> renders it', async () => {
    fetchBlob(new Blob(['<svg/>']))
    const { loadTagIcon } = await loadAssets({ mock: false })
    await loadTagIcon(vegan)
    expect(created[0].type).toBe('image/svg+xml')
  })

  it('serves the public file synchronously in mock mode', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const { loadTagIcon, peekTagIcon } = await loadAssets({ mock: true })
    expect(peekTagIcon(vegan)).toMatch(/\/tags\/abc123\.svg$/)
    expect(await loadTagIcon(vegan)).toMatch(/\/tags\/abc123\.svg$/)
    expect(spy).not.toHaveBeenCalled()
  })
})
