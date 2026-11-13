import { act, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const failure = new Error('bootstrap failed')

// Replaces all of `./api`: the real module runs session side effects on import.
vi.mock('./api', () => ({ bootstrap: vi.fn(() => Promise.reject(failure)) }))
vi.mock('./App', () => ({ default: () => <p>App rendered</p> }))

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

// One test per file: `./main` runs its side effects once, on first import.
it('logs a failed bootstrap and still renders the app', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)

  // Render follows bootstrap a few microtasks after the import; a macrotask drains them inside act.
  await act(async () => {
    await import('./main')
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  expect(error.mock.calls).toEqual([[failure]])
  expect(screen.getByText('App rendered')).toBeTruthy()
})
