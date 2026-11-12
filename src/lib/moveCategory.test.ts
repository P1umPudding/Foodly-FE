import { describe, expect, it } from 'vitest'
import { moveCategory } from './moveCategory'

describe('moveCategory', () => {
  const ids = [1, 2, 3, 4]

  it('moves a middle element up', () => {
    expect(moveCategory(ids, 3, -1)).toEqual([1, 3, 2, 4])
  })

  it('moves a middle element down', () => {
    expect(moveCategory(ids, 2, 1)).toEqual([1, 3, 2, 4])
  })

  it('leaves the order unchanged when the first element moves up', () => {
    expect(moveCategory(ids, 1, -1)).toEqual(ids)
  })

  it('leaves the order unchanged when the last element moves down', () => {
    expect(moveCategory(ids, 4, 1)).toEqual(ids)
  })

  it('leaves the order unchanged for an unknown id', () => {
    expect(moveCategory(ids, 9, 1)).toEqual(ids)
  })

  it('returns a new array and leaves the input alone', () => {
    const input = [1, 2]
    const result = moveCategory(input, 1, 1)
    expect(result).toEqual([2, 1])
    expect(input).toEqual([1, 2])
    expect(moveCategory(input, 1, -1)).not.toBe(input)
  })
})
