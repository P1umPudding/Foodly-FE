import { afterEach, describe, expect, it, vi } from 'vitest'

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
  it('hides recipe images in list and detail', async () => {
    const { showsRecipeImages } = await loadAssets({ mock: false })
    expect(showsRecipeImages()).toBe(false)
  })

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
  it('shows recipe images', async () => {
    const { showsRecipeImages } = await loadAssets({ mock: true })
    expect(showsRecipeImages()).toBe(true)
  })

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
