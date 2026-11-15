import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSegment } from './ThemeMenu'
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

  it('keeps the active mode checked and skips the reveal when it is clicked again', () => {
    localStorage.setItem('foodly-theme', 'dark')
    const startViewTransition = stubFailingReveal()
    renderSegment()
    fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }))
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('true')
  })

  it('anchors the reveal at the viewport centre for a keyboard pick (a click without coordinates)', async () => {
    localStorage.setItem('foodly-theme', 'dark')
    Object.defineProperty(document, 'startViewTransition', {
      value: (update: () => void) => {
        update()
        return { ready: Promise.resolve(), finished: Promise.resolve() } as unknown as ViewTransition
      },
      configurable: true,
    })
    const animate = vi.fn()
    Object.defineProperty(document.documentElement, 'animate', { value: animate, configurable: true })
    try {
      renderSegment()
      fireEvent.click(screen.getByRole('radio', { name: 'Hell' }), { detail: 0, clientX: 0, clientY: 0 })
      await waitFor(() => expect(animate).toHaveBeenCalledOnce())
      const [keyframes] = animate.mock.calls[0] as [{ clipPath: string[] }]
      expect(keyframes.clipPath[0]).toContain(`at ${window.innerWidth / 2}px ${window.innerHeight / 2}px`)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    } finally {
      Reflect.deleteProperty(document.documentElement, 'animate')
    }
  })

  it('anchors the reveal at the click point for a pointer pick', async () => {
    localStorage.setItem('foodly-theme', 'light')
    Object.defineProperty(document, 'startViewTransition', {
      value: (update: () => void) => {
        update()
        return { ready: Promise.resolve(), finished: Promise.resolve() } as unknown as ViewTransition
      },
      configurable: true,
    })
    const animate = vi.fn()
    Object.defineProperty(document.documentElement, 'animate', { value: animate, configurable: true })
    try {
      renderSegment()
      fireEvent.click(screen.getByRole('radio', { name: 'Dunkel' }), { detail: 1, clientX: 100, clientY: 50 })
      await waitFor(() => expect(animate).toHaveBeenCalledOnce())
      const [keyframes] = animate.mock.calls[0] as [{ clipPath: string[] }]
      expect(keyframes.clipPath[0]).toContain('at 100px 50px')
    } finally {
      Reflect.deleteProperty(document.documentElement, 'animate')
    }
  })

  it('offers System', () => {
    renderSegment()
    fireEvent.click(screen.getByRole('radio', { name: 'System' }))
    expect(localStorage.getItem('foodly-theme')).toBe('system')
    expect(screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true')
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
