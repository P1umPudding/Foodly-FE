import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeMyRating, readMyRating, setStubUser, sortByRating, stubStore, writeMyRating } from './stubs'
import { assertRating } from './views'
import type { Recipe } from './protocol'

function recipe(id: number, rating: Recipe['rating'] = []): Recipe {
  return {
    id,
    owner: 1,
    editors: [],
    viewers: [],
    name: `R${id}`,
    tags: [],
    source: null,
    rating,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
  }
}

beforeEach(() => {
  localStorage.clear()
  setStubUser(null)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('STUBBED register', () => {
  it('stubs ratings and images in REST mode', async () => {
    vi.stubEnv('VITE_MOCK', '')
    vi.resetModules()
    const { STUBBED, isStubbed } = await import('./stubs')
    expect([...STUBBED].sort()).toEqual(['images', 'ratings'])
    expect(isStubbed('ratings')).toBe(true)
    expect(isStubbed('sharing')).toBe(false)
  })

  it('stubs nothing in mock mode', async () => {
    vi.stubEnv('VITE_MOCK', '1')
    vi.resetModules()
    const { STUBBED, isStubbed } = await import('./stubs')
    expect(STUBBED.size).toBe(0)
    expect(isStubbed('ratings')).toBe(false)
  })
})

describe('stubStore', () => {
  it('prefixes keys with foodly.stub.', () => {
    stubStore.write('x', { a: 1 })
    expect(localStorage.getItem('foodly.stub.x')).toBe('{"a":1}')
    expect(stubStore.read('x', {})).toEqual({ a: 1 })
  })

  it('falls back on missing, corrupt or non-object JSON', () => {
    const fallback = { fb: true }
    expect(stubStore.read('missing', fallback)).toBe(fallback)
    for (const raw of ['{nope', 'null', '5', '"x"', '[]']) {
      localStorage.setItem('foodly.stub.bad', raw)
      expect(stubStore.read('bad', fallback)).toBe(fallback)
    }
  })

  it('treats stored values of the wrong shape as unrated', () => {
    setStubUser(7)
    for (const raw of ['[]', '{"7":"abc"}', '{"7":{"5":"4"}}', '{"7":{"5":99}}', '{"7":{"5":2.5}}']) {
      localStorage.setItem('foodly.stub.ratings', raw)
      expect(readMyRating(5)).toBeNull()
    }
    localStorage.setItem('foodly.stub.ratings', '{"7":"abc"}')
    writeMyRating(5, 4)
    expect(JSON.parse(localStorage.getItem('foodly.stub.ratings')!)).toEqual({ '7': { '5': 4 } })
  })

  it('turns a failed write into a readable error', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => stubStore.write('x', 1)).toThrow('Konnte nicht im Browser gespeichert werden')
  })
})

describe('rating stub', () => {
  it('keeps ratings per user', () => {
    setStubUser(7)
    writeMyRating(5, 4)
    setStubUser(8)
    expect(readMyRating(5)).toBeNull()
    writeMyRating(5, 2)
    expect(JSON.parse(localStorage.getItem('foodly.stub.ratings')!)).toEqual({ '7': { '5': 4 }, '8': { '5': 2 } })
  })

  it('clears only the own entry', () => {
    setStubUser(7)
    writeMyRating(5, 4)
    writeMyRating(6, 3)
    writeMyRating(5, null)
    expect(readMyRating(5)).toBeNull()
    expect(readMyRating(6)).toBe(3)
  })

  it('refuses to write without a current user', () => {
    expect(() => writeMyRating(5, 4)).toThrow()
  })

  it('merges nothing without a current user', () => {
    localStorage.setItem('foodly.stub.ratings', '{"7":{"5":4}}')
    const r = recipe(5)
    expect(mergeMyRating(r)).toBe(r)
  })

  it('merges nothing when there is no stored value', () => {
    setStubUser(7)
    const r = recipe(5, [{ user: 3, rating: 2 }])
    expect(mergeMyRating(r)).toBe(r)
  })

  it('replaces the own entry and keeps other users', () => {
    setStubUser(7)
    writeMyRating(5, 4)
    const merged = mergeMyRating(
      recipe(5, [
        { user: 3, rating: 2 },
        { user: 7, rating: 1 },
      ]),
    )
    expect(merged.rating).toEqual([
      { user: 3, rating: 2 },
      { user: 7, rating: 4 },
    ])
  })
})

describe('sortByRating', () => {
  const items = [recipe(1), recipe(2, [{ user: 7, rating: 2 }]), recipe(3, [{ user: 7, rating: 5 }])]

  it('sorts rated items by value, unrated last, in both directions', () => {
    expect(sortByRating(items, 'desc').map((r) => r.id)).toEqual([3, 2, 1])
    expect(sortByRating(items, 'asc').map((r) => r.id)).toEqual([2, 3, 1])
  })
})

describe('assertRating', () => {
  it('accepts whole stars 1–5 only', () => {
    for (const ok of [1, 3, 5]) expect(() => assertRating(ok)).not.toThrow()
    for (const bad of [0, 6, 2.5, NaN]) expect(() => assertRating(bad)).toThrow()
  })
})
