import { describe, expect, it } from 'vitest'
import { canEdit } from './access'
import type { Recipe } from '../api/protocol'

const recipe = (over: Partial<Recipe>): Recipe =>
  ({ id: 1, owner: 1, editors: [], viewers: [], name: 'R', ...over }) as Recipe

describe('canEdit', () => {
  it('allows the owner', () => {
    expect(canEdit(recipe({ owner: 7 }), 7)).toBe(true)
  })

  it('allows an editor', () => {
    expect(canEdit(recipe({ owner: 1, editors: [7] }), 7)).toBe(true)
  })

  it('denies a viewer', () => {
    expect(canEdit(recipe({ owner: 1, viewers: [7] }), 7)).toBe(false)
  })

  it('denies an unrelated user and an unknown user', () => {
    expect(canEdit(recipe({ owner: 1 }), 7)).toBe(false)
    expect(canEdit(recipe({ owner: 1 }), null)).toBe(false)
  })
})
