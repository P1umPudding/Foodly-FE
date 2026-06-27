import { describe, it, expect } from 'vitest'
import { roleAllowsCollab, collabDisabled, roleDisabled, ROLE_COLOR, COLLAB_COLOR } from './access'

describe('roleAllowsCollab (§D matrix, 6 of 9 valid)', () => {
  const cases: [string, string, boolean][] = [
    ['owner', 'private', true],
    ['owner', 'shared', true],
    ['owner', 'collaborative', true],
    ['editor', 'private', false],
    ['editor', 'shared', false],
    ['editor', 'collaborative', true],
    ['viewer', 'private', false],
    ['viewer', 'shared', true],
    ['viewer', 'collaborative', true],
  ]
  it.each(cases)('%s × %s → %s', (role, collab, expected) => {
    expect(roleAllowsCollab(role as never, collab as never)).toBe(expected)
  })

  it('treats "any" on either axis as always allowed', () => {
    expect(roleAllowsCollab('any', 'private')).toBe(true)
    expect(roleAllowsCollab('editor', 'any')).toBe(true)
    expect(roleAllowsCollab('any', 'any')).toBe(true)
  })
})

describe('disabled helpers', () => {
  it('greys impossible collab options for a selected role', () => {
    expect(collabDisabled('private', 'editor')).toBe(true)
    expect(collabDisabled('shared', 'editor')).toBe(true)
    expect(collabDisabled('collaborative', 'editor')).toBe(false)
    expect(collabDisabled('private', 'viewer')).toBe(true)
    expect(collabDisabled('shared', 'viewer')).toBe(false)
  })
  it('greys impossible role options for a selected collab', () => {
    expect(roleDisabled('editor', 'private')).toBe(true)
    expect(roleDisabled('viewer', 'private')).toBe(true)
    expect(roleDisabled('owner', 'private')).toBe(false)
    expect(roleDisabled('editor', 'shared')).toBe(true)
  })
  it('disables nothing while the sister axis is "any"', () => {
    expect(collabDisabled('private', 'any')).toBe(false)
    expect(roleDisabled('editor', 'any')).toBe(false)
  })
})

const CATEGORY_HEXES = ['#e11d48', '#0ea5e9', '#f59e0b', '#10b981']

describe('colour maps', () => {
  it('exposes literal icon classes per type', () => {
    expect(ROLE_COLOR.owner.icon).toBe('text-[#a07b3f]')
    expect(COLLAB_COLOR.collaborative.icon).toBe('text-[#5a9183]')
  })

  it('never reuses a category hue (access is the muted, distinct axis)', () => {
    const accessIcons = [...Object.values(ROLE_COLOR), ...Object.values(COLLAB_COLOR)].map((c) => c.icon)
    for (const hex of CATEGORY_HEXES) {
      expect(accessIcons.some((cls) => cls.includes(hex))).toBe(false)
    }
  })
})
