import { describe, expect, it } from 'vitest'
import { previewToRecipe } from './adapters'
import type { RecipePreview } from './protocol'

const preview: RecipePreview = {
  id: 7,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: 'Soup',
  tags: ['t'],
  source: null,
  rating: [],
  time: null,
  workMinutes: 10,
  overallMinutes: 20,
  sizeNumber: null,
  sizeText: null,
  mainImage: null,
}

describe('previewToRecipe', () => {
  it('fills the missing collections with empty arrays', () => {
    const r = previewToRecipe(preview)
    expect(r.sections).toEqual([])
    expect(r.notes).toEqual([])
    expect(r.images).toEqual([])
    expect(r.id).toBe(7)
    expect(r.name).toBe('Soup')
  })

  it('passes the timestamps through', () => {
    const r = previewToRecipe({
      ...preview,
      createdAt: '2026-05-14T18:20:00+00:00',
      updatedAt: '2026-06-01T09:00:00+00:00',
      myAccessSince: '2026-05-14T18:20:00+00:00',
    })
    expect(r.createdAt).toBe('2026-05-14T18:20:00+00:00')
    expect(r.updatedAt).toBe('2026-06-01T09:00:00+00:00')
    expect(r.myAccessSince).toBe('2026-05-14T18:20:00+00:00')
  })
})
