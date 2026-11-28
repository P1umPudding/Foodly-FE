import { StrictMode, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Button } from '@postxl/ui-components'
import { describe, expect, it } from 'vitest'
import { HomeSection } from './HomeSection'
import { HomeSectionsProvider, NothingToShow, type SectionState } from './HomeSections'

const CARD_TEXT = 'Hier erscheinen deine Kategorien und die zuletzt bearbeiteten Rezepte.'

function Page({ states }: { states: SectionState[] }) {
  return (
    <MemoryRouter useTransitions={false}>
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
    <MemoryRouter useTransitions={false}>
      <HomeSectionsProvider>
        <Button onClick={() => setShown(false)}>weg</Button>
        {shown && <HomeSection title="A" state="ready" onRetry={() => {}} />}
        <NothingToShow />
      </HomeSectionsProvider>
    </MemoryRouter>
  )
}

describe('NothingToShow', () => {
  it('shows the card with its one link when there are no sections', () => {
    render(<Page states={[]} />)
    const card = screen.getByText(CARD_TEXT).parentElement!
    // One action at most (design.md §5): only "Neues Rezept"; the list is one click away in the navigation.
    expect(within(card).queryByRole('link', { name: 'Alle Rezepte' })).toBeNull()
    expect(within(card).getByText('Noch nichts zu sehen')).toBeTruthy()
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
