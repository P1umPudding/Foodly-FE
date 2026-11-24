import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedSession } from './test/auth'
import App from './App'

// The real route table with stand-in pages: which routes are guarded and that /login wins over `*`.
function Page({ name }: { name: string }) {
  const { pathname, search } = useLocation()
  return <p data-testid="page">{`${name} ${pathname}${search}`}</p>
}

// A marker instead of the real shell: cook mode must render without it.
vi.mock('./components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <nav aria-label="Shell">{children}</nav>,
}))
vi.mock('./catalog/CatalogProvider', () => ({
  CatalogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('./pages/Login', () => ({ Login: () => <Page name="login" /> }))
vi.mock('./pages/Register', () => ({ Register: () => <Page name="register" /> }))
vi.mock('./pages/Home', () => ({ Home: () => <Page name="home" /> }))
vi.mock('./pages/RecipeList', () => ({ RecipeList: () => <Page name="list" /> }))
vi.mock('./pages/RecipeDetail', () => ({ RecipeDetail: () => <Page name="detail" /> }))
vi.mock('./pages/Categories', () => ({ Categories: () => <Page name="categories" /> }))
vi.mock('./pages/Profile', () => ({ Profile: () => <Page name="profile" /> }))
vi.mock('./pages/NotFound', () => ({ NotFound: () => <Page name="404" /> }))
vi.mock('./pages/CookMode', () => ({ CookMode: () => <Page name="cook" /> }))

// Some routes load their page lazily (#221); the first import in a file can take a moment.
const WAIT = { timeout: 3000 }

const at = async (path: string) => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return (await screen.findByTestId('page', {}, WAIT)).textContent
}

afterEach(() => localStorage.clear())

describe('App routes', () => {
  it.each([
    ['/recipes/5', 'login /login?next=%2Frecipes%2F5'],
    ['/recipes/5/cook', 'login /login?next=%2Frecipes%2F5%2Fcook'],
    ['/categories', 'login /login?next=%2Fcategories'],
    ['/profile', 'login /login?next=%2Fprofile'],
    ['/recipes', 'login /login?next=%2Frecipes'],
    ['/nowhere', 'login /login?next=%2Fnowhere'],
    ['/', 'login /login?next=%2F'],
    ['/login', 'login /login'],
    ['/register', 'register /register'],
  ])('without a session %s shows %s', async (path, page) => {
    expect(await at(path)).toBe(page)
  })

  it.each([
    ['/recipes/5', 'detail /recipes/5'],
    ['/recipes/5/cook?servings=4', 'cook /recipes/5/cook?servings=4'],
    ['/categories', 'categories /categories'],
    ['/profile', 'profile /profile'],
    ['/nowhere', '404 /nowhere'],
    ['/', 'home /'],
    ['/?cat=3&q=x', 'list /recipes?cat=3&q=x'],
    ['/?foo=1', 'home /?foo=1'],
    ['/login', 'list /recipes'],
    ['/register', 'list /recipes'],
  ])('with a session %s shows %s', async (path, page) => {
    seedSession()
    expect(await at(path)).toBe(page)
  })

  it('renders cook mode without the shell', async () => {
    seedSession()
    await at('/recipes/5/cook')
    expect(screen.queryByRole('navigation', { name: 'Shell' })).toBeNull()
  })

  it('keeps the shell around the recipe page', async () => {
    seedSession()
    await at('/recipes/5')
    expect(screen.getByRole('navigation', { name: 'Shell' })).toBeTruthy()
  })
})
