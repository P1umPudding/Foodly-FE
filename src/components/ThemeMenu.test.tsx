import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSegment, ThemeSubmenu } from './ThemeMenu'
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

function stubFailingReveal() {
  // jsdom has no View Transitions API: the stub applies the change, then the reveal is skipped.
  const startViewTransition = vi.fn((update: () => void) => {
    update()
    return { ready: Promise.reject(new Error('skipped')), finished: Promise.resolve() } as unknown as ViewTransition
  })
  Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true })
  return startViewTransition
}

function renderSegment() {
  render(
    <ThemeProvider>
      <span id="design">Design</span>
      <ThemeSegment labelledBy="design" />
    </ThemeProvider>,
  )
}

describe('ThemeSegment', () => {
  it('offers Hell, Dunkel and System, with the stored mode checked', () => {
    localStorage.setItem('foodly-theme', 'light')
    renderSegment()
    screen.getByRole('group', { name: 'Design' })
    expect(screen.getByRole('radio', { name: 'Hell' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('false')
  })

  it('switches to dark and stores the choice', async () => {
    renderSegment()
    fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(localStorage.getItem('foodly-theme')).toBe('dark')
    expect(screen.getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('true')
  })

  it('keeps the active mode checked when it is clicked again', () => {
    localStorage.setItem('foodly-theme', 'dark')
    renderSegment()
    fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }))
    expect(screen.getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('true')
  })

  it('applies the mode and cleans up when the reveal transition fails', async () => {
    const startViewTransition = stubFailingReveal()
    renderSegment()
    fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }))

    expect(startViewTransition).toHaveBeenCalledOnce()
    const root = document.documentElement
    await waitFor(() => {
      expect(root.classList.contains('dark')).toBe(true)
      expect(root.dataset.themeAnim).toBeUndefined()
      expect(root.dataset.themeTransition).toBeUndefined()
    })
  })
})
