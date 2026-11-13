import { act, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const bootstrap = vi.hoisted(() => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
})

// Replaces all of `./api`: the real module runs session side effects on import.
vi.mock('./api', () => ({ bootstrap: vi.fn(() => bootstrap.promise) }))
vi.mock('./App', () => ({ default: () => <p>App rendered</p> }))

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// One test per file: `./main` runs its side effects once, on first import.
// Vitest doesn't bundle, so this guards against a top-level await in main.tsx, not the chunk cycle itself (#233).
it('finishes importing while bootstrap is pending and renders once it settles', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)

  // Load the heavy dependencies first, so the budget below times main.tsx itself, not a cold transform.
  await Promise.all([import('react-dom/client'), import('react-router-dom'), import('./theme/ThemeProvider')])
  let timer: ReturnType<typeof setTimeout> | undefined
  const blocked = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('main.tsx import blocked on bootstrap (top-level await?)')), 2000)
  })
  try {
    await Promise.race([import('./main'), blocked])
  } finally {
    clearTimeout(timer)
  }
  await flush()
  expect(screen.queryByText('App rendered')).toBeNull()

  await act(async () => {
    bootstrap.resolve()
    await flush()
  })

  expect(screen.getByText('App rendered')).toBeTruthy()
  expect(error).not.toHaveBeenCalled()
})
