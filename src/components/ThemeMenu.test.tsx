import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSubmenu } from './ThemeMenu'
import { ThemeProvider } from '../theme/ThemeProvider'

function reset() {
  localStorage.clear()
  const root = document.documentElement
  root.classList.remove('dark')
  delete root.dataset.themeAnim
  delete root.dataset.themeTransition
}

beforeEach(reset)

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition')
  reset()
})

async function pick(label: string) {
  render(
    <ThemeProvider>
      <DropdownMenu>
        <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
        <DropdownMenuContent>
          <ThemeSubmenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </ThemeProvider>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Menü' }), { key: 'Enter' })
  fireEvent.keyDown(await screen.findByRole('menuitem', { name: /Theme/ }), { key: 'ArrowRight' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: label }))
}

describe('ThemeSubmenu', () => {
  it('applies the mode and cleans up when the reveal transition fails', async () => {
    // jsdom has no View Transitions API: the stub applies the change, then the reveal is skipped.
    const startViewTransition = vi.fn((update: () => void) => {
      update()
      return { ready: Promise.reject(new Error('skipped')), finished: Promise.resolve() } as unknown as ViewTransition
    })
    Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true })

    await pick('Dunkel')

    expect(startViewTransition).toHaveBeenCalledOnce()
    const root = document.documentElement
    await waitFor(() => {
      expect(root.classList.contains('dark')).toBe(true)
      expect(root.dataset.themeAnim).toBeUndefined()
      expect(root.dataset.themeTransition).toBeUndefined()
    })
  })
})
