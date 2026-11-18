import { afterEach, expect, it, vi } from 'vitest'
import { loadSidebarCollapsed } from './Sidebar'

const KEY = 'foodly:sidebar-collapsed'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('tells "nothing saved" apart from a saved choice', () => {
  expect(loadSidebarCollapsed()).toBeNull()
  localStorage.setItem(KEY, '1')
  expect(loadSidebarCollapsed()).toBe(true)
  localStorage.setItem(KEY, '0')
  expect(loadSidebarCollapsed()).toBe(false)
  localStorage.setItem(KEY, 'x')
  expect(loadSidebarCollapsed()).toBeNull()
})

it('treats blocked storage as nothing saved', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(loadSidebarCollapsed()).toBeNull()
})
