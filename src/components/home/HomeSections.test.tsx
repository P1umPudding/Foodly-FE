import { StrictMode, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Button } from '@postxl/ui-components'
import { describe, expect, it } from 'vitest'
import { HomeSection } from './HomeSection'
import { HomeSectionsProvider, NothingToShow, type SectionState } from './HomeSections'

const CARD_TEXT = 'Hier erscheinen deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.'

function Page({ states }: { states: SectionState[] }) {
  return (
    <MemoryRouter>
      <HomeSectionsProvider>
        {states.map((state, i) => (
          <HomeSection key={i} title={`Abschnitt ${i}`} state={state} onRetry={() => {}}>
            <p>content {i}</p>
          </HomeSection>
        ))}
        <NothingToShow />
      </HomeSectionsProvider>
    </MemoryRouter>
  )
}

function Toggle() {
  const [shown, setShown] = useState(true)
  return (
    <MemoryRouter>
      <HomeSectionsProvider>
        <Button onClick={() => setShown(false)}>weg</Button>
        {shown && <HomeSection title="A" state="ready" onRetry={() => {}} />}
        <NothingToShow />
      </HomeSectionsProvider>
    </MemoryRouter>
  )
}

describe('NothingToShow', () => {
  it('shows the card with both links when there are no sections', () => {
    render(<Page states={[]} />)
    const card = screen.getByText(CARD_TEXT).parentElement!
    expect(within(card).getByRole('link', { name: 'Alle Rezepte' }).getAttribute('href')).toBe('/recipes')
    expect(within(card).getByRole('link', { name: 'Neues Rezept' }).getAttribute('href')).toBe('/recipes/new')
  })

  it('shows the card when every section is empty', () => {
    render(<Page states={['empty', 'empty']} />)
    screen.getByText(CARD_TEXT)
  })

  it.each<SectionState>(['loading', 'error', 'ready'])('hides the card while a section is %s', (state) => {
    render(<Page states={['empty', state]} />)
    expect(screen.queryByText(CARD_TEXT)).toBeNull()
  })

  it('shows the card again once the only section with content is gone', () => {
    render(<Toggle />)
    expect(screen.queryByText(CARD_TEXT)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'weg' }))
    screen.getByText(CARD_TEXT)
  })

  // StrictMode runs each layout effect, its cleanup and the effect again: the cleanup must remove the entry
  // and the second run must add it back.
  it('keeps the registry right under StrictMode', () => {
    render(
      <StrictMode>
        <Toggle />
      </StrictMode>,
    )
    expect(screen.queryByText(CARD_TEXT)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'weg' }))
    screen.getByText(CARD_TEXT)
  })
})
