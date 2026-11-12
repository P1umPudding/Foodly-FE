import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedSession } from './test/auth'
import App from './App'

// The real route table with stand-in pages: which routes are guarded and that /login wins over `*`.
function Page({ name }: { name: string }) {
  const { pathname, search } = useLocation()
  return <p data-testid="page">{`${name} ${pathname}${search}`}</p>
}

vi.mock('./components/shell/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('./catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('./pages/Login', () => ({ Login: () => <Page name="login" /> }))
vi.mock('./pages/Register', () => ({ Register: () => <Page name="register" /> }))
vi.mock('./pages/RecipeList', () => ({ RecipeList: () => <Page name="list" /> }))
vi.mock('./pages/RecipeDetail', () => ({ RecipeDetail: () => <Page name="detail" /> }))
vi.mock('./pages/Categories', () => ({ Categories: () => <Page name="categories" /> }))
vi.mock('./pages/NotFound', () => ({ NotFound: () => <Page name="404" /> }))

const at = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return screen.getByTestId('page').textContent
}

afterEach(() => localStorage.clear())

describe('App routes', () => {
  it.each([
    ['/recipes/5', 'login /login?next=%2Frecipes%2F5'],
    ['/categories', 'login /login?next=%2Fcategories'],
    ['/recipes', 'login /login?next=%2Frecipes'],
    ['/nowhere', 'login /login?next=%2Fnowhere'],
    ['/login', 'login /login'],
    ['/register', 'register /register'],
  ])('without a session %s shows %s', (path, page) => {
    expect(at(path)).toBe(page)
  })

  it.each([
    ['/recipes/5', 'detail /recipes/5'],
    ['/categories', 'categories /categories'],
    ['/nowhere', '404 /nowhere'],
    ['/login', 'list /recipes'],
    ['/register', 'list /recipes'],
  ])('with a session %s shows %s', (path, page) => {
    seedSession()
    expect(at(path)).toBe(page)
  })
})
