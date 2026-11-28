// REST-mode stub for the personal note (no backend endpoint). Each load() is a fresh
// module graph, which is how a page reload looks to src/api.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function json(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

let me = 7

beforeEach(() => {
  localStorage.clear()
  me = 7
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('/users/me')) return json({ id: me, name: 'Me', profilePicture: null })
    throw new Error(`unexpected fetch ${url}`)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function load() {
  vi.stubEnv('VITE_MOCK', '')
  vi.resetModules()
  const { foodly } = await import('./index')
  await foodly.me()
  return foodly
}

describe('REST personal note stub', () => {
  it('keeps a created, changed and cleared note across a reload', async () => {
    let foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('')
    await foodly.setMyNote(5, 'Weniger Salz')
    foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('Weniger Salz')

    await foodly.setMyNote(5, 'Doppelte Menge Knoblauch')
    foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('Doppelte Menge Knoblauch')

    await foodly.setMyNote(5, '   ')
    foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('')
  })

  it('does not show one user’s note to another user', async () => {
    let foodly = await load()
    await foodly.setMyNote(5, 'Nur für mich')
    me = 8
    foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('')
    await foodly.setMyNote(5, 'Meine eigene')
    me = 7
    foodly = await load()
    expect(await foodly.getMyNote(5)).toBe('Nur für mich')
  })
})
