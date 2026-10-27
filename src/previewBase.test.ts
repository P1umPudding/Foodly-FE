import { describe, expect, it } from 'vitest'
import { previewBase } from './previewBase'

describe('previewBase', () => {
  it.each([undefined, '', '  ', '/', '//', ' / '])('falls back to the root for %j', (raw) => {
    expect(previewBase(raw)).toBe('/')
  })

  it.each(['foo', '/foo', '/foo/', 'foo/', '//foo//', ' /foo/ '])('normalises %j to /foo/', (raw) => {
    expect(previewBase(raw)).toBe('/foo/')
  })

  it('keeps nested segments', () => {
    expect(previewBase('a/b')).toBe('/a/b/')
  })
})
