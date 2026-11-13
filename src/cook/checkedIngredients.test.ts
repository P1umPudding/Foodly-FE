import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openRecipe, resetCheckedIngredients, useCheckedIngredients } from './checkedIngredients'

afterEach(() => {
  vi.restoreAllMocks()
  resetCheckedIngredients()
})

describe('checkedIngredients', () => {
  it('toggles ticks and the check-off switch', () => {
    openRecipe(5)
    const { result } = renderHook(() => useCheckedIngredients(5))

    act(() => result.current.setCheckable(true))
    act(() => result.current.toggle(1))
    act(() => result.current.toggle(2))
    act(() => result.current.toggle(1))

    expect(result.current.checkable).toBe(true)
    expect([...result.current.checkedIds]).toEqual([2])
  })

  it('keeps the state when the same recipe opens again and shares it between readers', () => {
    openRecipe(5)
    const detail = renderHook(() => useCheckedIngredients(5))
    act(() => detail.result.current.toggle(3))

    openRecipe(5)
    const cook = renderHook(() => useCheckedIngredients(5))

    expect([...cook.result.current.checkedIds]).toEqual([3])
    expect([...detail.result.current.checkedIds]).toEqual([3])
  })

  it('clears everything when another recipe opens', () => {
    openRecipe(5)
    const { result } = renderHook(() => useCheckedIngredients(5))
    act(() => {
      result.current.setCheckable(true)
      result.current.toggle(3)
    })

    act(() => openRecipe(6))

    expect(result.current.checkable).toBe(false)
    expect(result.current.checkedIds.size).toBe(0)
    openRecipe(5)
    expect(renderHook(() => useCheckedIngredients(5)).result.current.checkedIds.size).toBe(0)
  })

  it('reads another recipe as empty before it is opened, and a write starts it fresh', () => {
    openRecipe(5)
    renderHook(() => useCheckedIngredients(5)).result.current.toggle(3)

    const { result } = renderHook(() => useCheckedIngredients(6))
    expect(result.current.checkedIds.size).toBe(0)

    act(() => result.current.toggle(9))
    expect([...result.current.checkedIds]).toEqual([9])
  })

  it('never touches Web Storage', () => {
    const calls = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ]
    openRecipe(5)
    const { result } = renderHook(() => useCheckedIngredients(5))
    act(() => {
      result.current.setCheckable(true)
      result.current.toggle(1)
    })
    openRecipe(6)

    for (const spy of calls) expect(spy).not.toHaveBeenCalled()
  })
})
