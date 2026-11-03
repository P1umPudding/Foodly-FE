import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { foodly } from './index'
import { pendingSaveFor, resetPendingSaves, trackPendingSave } from './pendingSaves'

// The mode is read when the modules load, so pin REST before the imports run (vi.hoisted),
// whatever the shell env or .env.local sets.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))

function json(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function deferred() {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const settle = () => new Promise((r) => setTimeout(r, 0))

let fetchSpy: MockInstance<typeof fetch>
const calls = () => fetchSpy.mock.calls.map(([input]) => String(input))

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/recipes/search')) return json({ data: [], cursor: null })
    const id = Number(url.split('/').pop())
    return json({ id, name: `R${id}`, rating: [], sections: [], notes: [], images: [] })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  resetPendingSaves()
})

afterAll(() => vi.unstubAllEnvs())

describe('pending saves · reads', () => {
  it('sends a read at once when nothing is pending', () => {
    void foodly.getRecipe(5)
    // Synchronous on purpose: rest.request calls fetch() before its first await.
    expect(calls()).toEqual(['/api/v1/recipes/5'])
  })

  it('holds a read of the same recipe until its save settles', async () => {
    const save = deferred()
    trackPendingSave(5, save.promise)

    const read = foodly.getRecipe(5)
    await settle()
    expect(calls()).toEqual([])

    save.resolve()
    await expect(read).resolves.toMatchObject({ id: 5 })
    expect(calls()).toEqual(['/api/v1/recipes/5'])
  })

  it('does not hold a read of another recipe', () => {
    trackPendingSave(5, deferred().promise)
    void foodly.getRecipe(6)
    expect(calls()).toEqual(['/api/v1/recipes/6'])
  })

  it('holds a search until every pending save settles', async () => {
    const a = deferred()
    const b = deferred()
    trackPendingSave(5, a.promise)
    trackPendingSave(6, b.promise)

    const search = foodly.searchRecipes({}, 1)
    a.resolve()
    await settle()
    expect(calls()).toEqual([])

    b.resolve()
    await expect(search).resolves.toEqual({ items: [], cursor: null })
    expect(calls()).toHaveLength(1)
  })

  it('lets the read through after a failed save', async () => {
    const save = deferred()
    trackPendingSave(5, save.promise)

    const read = foodly.getRecipe(5)
    save.reject(new Error('boom'))

    await expect(read).resolves.toMatchObject({ id: 5 })
    expect(pendingSaveFor(5)).toBeNull()
  })

  it('waits for every save registered for the same recipe', async () => {
    const first = deferred()
    const second = deferred()
    trackPendingSave(5, first.promise)
    trackPendingSave(5, second.promise)

    const read = foodly.getRecipe(5)
    second.resolve()
    await settle()
    expect(calls()).toEqual([])

    first.resolve()
    await read
    expect(calls()).toEqual(['/api/v1/recipes/5'])
  })

  it('gives up waiting on a save that never settles after 10 s', async () => {
    vi.useFakeTimers()
    trackPendingSave(5, new Promise(() => {}))

    const read = foodly.getRecipe(5)
    await vi.advanceTimersByTimeAsync(9_999)
    expect(calls()).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    await expect(read).resolves.toMatchObject({ id: 5 })
  })

  it('clears the cap timer when the save wins', async () => {
    vi.useFakeTimers()
    const save = deferred()
    trackPendingSave(5, save.promise)

    const read = foodly.getRecipe(5)
    expect(vi.getTimerCount()).toBe(1)
    save.resolve()
    await read
    expect(vi.getTimerCount()).toBe(0)
  })
})
