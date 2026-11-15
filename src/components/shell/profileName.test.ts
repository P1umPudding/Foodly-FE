import { describe, expect, it } from 'vitest'
import { profileName } from './profileName'

describe('profileName', () => {
  it('shows the name and its upper-case initial', () => {
    expect(profileName({ name: ' kolja ' })).toEqual({ name: 'kolja', initial: 'K' })
  })

  it('falls back for a missing or blank name', () => {
    expect(profileName(null)).toEqual({ name: 'Profil', initial: '?' })
    expect(profileName({ name: '  ' })).toEqual({ name: 'Profil', initial: '?' })
  })
})
