import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RootRedirect } from './RootRedirect'

function Where() {
  const { pathname, search, hash } = useLocation()
  return <p data-testid="where">{pathname + search + hash}</p>
}

function renderAt(entry: string, basename?: string) {
  return render(
    <MemoryRouter basename={basename} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/recipes" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RootRedirect', () => {
  it('sends a bare / to /recipes', () => {
    renderAt('/')
    expect(screen.getByTestId('where').textContent).toBe('/recipes')
  })

  it('keeps the list params', () => {
    renderAt('/?cat=1&q=pasta&group=0')
    expect(screen.getByTestId('where').textContent).toBe('/recipes?cat=1&q=pasta&group=0')
  })

  it('keeps the hash', () => {
    renderAt('/?q=x#top')
    expect(screen.getByTestId('where').textContent).toBe('/recipes?q=x#top')
  })

  it('works under a sub-path basename', () => {
    renderAt('/foo/?cat=2', '/foo/')
    expect(screen.getByTestId('where').textContent).toBe('/recipes?cat=2')
  })
})
