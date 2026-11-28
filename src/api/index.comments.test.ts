// REST-mode stub for recipe comments (no backend endpoint). Each load() is a fresh module graph, which is how a page
// reload looks to src/api.
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

describe('REST comments stub', () => {
  it('keeps a written comment across a reload, trimmed and clipped to 2000 characters', async () => {
    let foodly = await load()
    expect(await foodly.listComments(5)).toEqual([])
    const added = await foodly.addComment(5, '  Lecker!  ')
    expect(added).toMatchObject({ user: 7, text: 'Lecker!' })
    await foodly.addComment(5, 'x'.repeat(2100))
    await expect(foodly.addComment(5, '   ')).rejects.toThrow('Kommentar ist leer')

    foodly = await load()
    const list = await foodly.listComments(5)
    expect(list.map((c) => c.text.length)).toEqual([7, 2000])
    expect(await foodly.listComments(6)).toEqual([])
  })

  it('lets me delete my own comment, someone else’s only as recipe owner', async () => {
    let foodly = await load()
    const mine = await foodly.addComment(5, 'von 7')
    me = 8
    foodly = await load()
    const theirs = await foodly.addComment(5, 'von 8')

    // 8 doesn't own the recipe (owner 7): only their own comment goes.
    await expect(foodly.deleteComment(5, mine.id, 7)).rejects.toThrow('Nicht erlaubt')
    await foodly.deleteComment(5, theirs.id, 7)
    await foodly.addComment(5, 'nochmal von 8')

    me = 7
    foodly = await load()
    const [other] = (await foodly.listComments(5)).filter((c) => c.user === 8)
    await foodly.deleteComment(5, other.id, 7)
    await foodly.deleteComment(5, mine.id, 7)
    expect(await foodly.listComments(5)).toEqual([])
    expect(JSON.parse(localStorage.getItem('foodly.stub.comments')!)).toEqual({ 5: [] })
  })
})
