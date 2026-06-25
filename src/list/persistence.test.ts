import { loadPersisted, savePersisted } from './persistence'
import { DEFAULT_STATE } from './state'

beforeEach(() => localStorage.clear())

describe('persistence', () => {
  it('round-trips everything except search', () => {
    savePersisted(1, { ...DEFAULT_STATE, tags: ['Vegan'], search: 'secret', detail: 'compact' })
    const loaded = loadPersisted(1)
    expect(loaded?.tags).toEqual(['Vegan'])
    expect(loaded?.detail).toBe('compact')
    expect('search' in (loaded ?? {})).toBe(false)
  })
  it('returns null when nothing stored', () => {
    expect(loadPersisted(1)).toBeNull()
  })
  it('namespaces by user', () => {
    savePersisted(1, { ...DEFAULT_STATE, tags: ['A'] })
    expect(loadPersisted(2)).toBeNull()
  })
  it('discards a version mismatch', () => {
    localStorage.setItem('foodly:list-state:1', JSON.stringify({ version: 99, state: { tags: ['X'] } }))
    expect(loadPersisted(1)).toBeNull()
  })
  it('discards unparseable data', () => {
    localStorage.setItem('foodly:list-state:1', '{not json')
    expect(loadPersisted(1)).toBeNull()
  })
})
