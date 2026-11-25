import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  store: new Map<string, string>(),
  get: vi.fn<(o: { key: string }) => Promise<{ value: string | null }>>(),
  set: vi.fn<(o: { key: string; value: string }) => Promise<void>>(),
  remove: vi.fn<(o: { key: string }) => Promise<void>>(),
}))

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: m.get, set: m.set, remove: m.remove } }))

async function load() {
  vi.resetModules()
  return import('./storage')
}

beforeEach(() => {
  m.store.clear()
  m.get.mockReset().mockImplementation(({ key }) => Promise.resolve({ value: m.store.get(key) ?? null }))
  m.set.mockReset().mockImplementation(({ key, value }) => {
    m.store.set(key, value)
    return Promise.resolve()
  })
  m.remove.mockReset().mockImplementation(({ key }) => {
    m.store.delete(key)
    return Promise.resolve()
  })
})

describe('storage adapter', () => {
  it('loads null when nothing is stored, and what was saved after that', async () => {
    const { loadAuth, saveAuth } = await load()
    expect(await loadAuth()).toBeNull()
    await saveAuth('{"a":1}')
    expect(m.store.get('foodly.auth')).toBe('{"a":1}')
    expect(await loadAuth()).toBe('{"a":1}')
    await saveAuth(null)
    expect(m.store.has('foodly.auth')).toBe(false)
  })

  it('keeps the last write even when an earlier one resolves late', async () => {
    const { saveAuth } = await load()
    let finish!: () => void
    m.set.mockImplementationOnce(({ key, value }) => {
      return new Promise<void>((resolve) => {
        finish = () => {
          m.store.set(key, value)
          resolve()
        }
      })
    })

    const first = saveAuth('first')
    const second = saveAuth(null)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(m.remove).not.toHaveBeenCalled()

    finish()
    await Promise.all([first, second])
    expect(m.store.has('foodly.auth')).toBe(false)
  })

  it('rejects a failing write but keeps the queue going', async () => {
    const { saveAuth } = await load()
    m.set.mockImplementationOnce(() => Promise.reject(new Error('disk full')))

    await expect(saveAuth('x')).rejects.toThrow('disk full')
    await saveAuth('y')
    expect(m.store.get('foodly.auth')).toBe('y')
  })
})
