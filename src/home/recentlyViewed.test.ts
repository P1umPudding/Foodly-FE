import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pushRecentlyViewed, readRecentlyViewed, removeRecentlyViewed } from './recentlyViewed'

const KEY = 'foodly:recently-viewed:1'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('recentlyViewed', () => {
  it('starts empty', () => {
    expect(readRecentlyViewed(1)).toEqual([])
  })

  it('puts a new id first', () => {
    pushRecentlyViewed(1, 5)
    pushRecentlyViewed(1, 7)
    expect(readRecentlyViewed(1)).toEqual([7, 5])
  })

  it('moves a reopened id to the front without a duplicate', () => {
    pushRecentlyViewed(1, 5)
    pushRecentlyViewed(1, 7)
    pushRecentlyViewed(1, 5)
    expect(readRecentlyViewed(1)).toEqual([5, 7])
  })

  it('drops the oldest entry on the 21st', () => {
    for (let id = 1; id <= 21; id++) pushRecentlyViewed(1, id)
    const ids = readRecentlyViewed(1)
    expect(ids).toHaveLength(20)
    expect(ids[0]).toBe(21)
    expect(ids).not.toContain(1)
  })

  it('keeps a separate list per user', () => {
    pushRecentlyViewed(1, 5)
    pushRecentlyViewed(2, 7)
    expect(readRecentlyViewed(1)).toEqual([5])
    expect(readRecentlyViewed(2)).toEqual([7])
  })

  it('reads broken JSON as empty', () => {
    localStorage.setItem(KEY, '{not json')
    expect(readRecentlyViewed(1)).toEqual([])
  })

  it('reads foreign values as empty or drops the bad entries', () => {
    for (const raw of ['null', '[1,2]', '{"version":2,"ids":[1]}', '{"version":1,"ids":"1"}']) {
      localStorage.setItem(KEY, raw)
      expect(readRecentlyViewed(1)).toEqual([])
    }
    localStorage.setItem(KEY, JSON.stringify({ version: 1, ids: [3, 'x', -1, 2.5, 0, null, 3, 4] }))
    expect(readRecentlyViewed(1)).toEqual([3, 4])
  })

  it('caps a hand-edited list at 20', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, ids: Array.from({ length: 30 }, (_, i) => i + 1) }))
    expect(readRecentlyViewed(1)).toHaveLength(20)
  })

  it('removes ids and keeps the order', () => {
    for (const id of [1, 2, 3, 4]) pushRecentlyViewed(1, id)
    removeRecentlyViewed(1, [3, 1])
    expect(readRecentlyViewed(1)).toEqual([4, 2])
  })

  it('swallows write errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => pushRecentlyViewed(1, 5)).not.toThrow()
    expect(readRecentlyViewed(1)).toEqual([])
  })
})
