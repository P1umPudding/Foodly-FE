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

  const blocked = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('main.tsx import blocked on bootstrap (top-level await?)')), 500),
  )
  await Promise.race([import('./main'), blocked])
  await flush()
  expect(screen.queryByText('App rendered')).toBeNull()

  await act(async () => {
    bootstrap.resolve()
    await flush()
  })

  expect(screen.getByText('App rendered')).toBeTruthy()
  expect(error).not.toHaveBeenCalled()
})
