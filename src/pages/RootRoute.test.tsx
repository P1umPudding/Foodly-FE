import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RootRoute } from './RootRoute'

vi.mock('./Home', () => ({ Home: () => <Where /> }))

function Where() {
  const { pathname, search, hash } = useLocation()
  return <p data-testid="where">{pathname + search + hash}</p>
}

function renderAt(entry: string, basename?: string) {
  render(
    <MemoryRouter basename={basename} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/recipes" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.getByTestId('where').textContent
}

describe('RootRoute', () => {
  it('shows the start page for a bare /', () => {
    expect(renderAt('/')).toBe('/')
  })

  it('forwards list params to /recipes', () => {
    expect(renderAt('/?cat=1&q=pasta&group=0')).toBe('/recipes?cat=1&q=pasta&group=0')
  })

  it('forwards an empty list param too', () => {
    expect(renderAt('/?q=')).toBe('/recipes?q=')
  })

  it('keeps the hash', () => {
    expect(renderAt('/?q=x#top')).toBe('/recipes?q=x#top')
  })

  it('stays on the start page for other params', () => {
    expect(renderAt('/?foo=1')).toBe('/?foo=1')
  })

  it('works under a sub-path basename', () => {
    expect(renderAt('/foo/?cat=2', '/foo/')).toBe('/recipes?cat=2')
  })
})
