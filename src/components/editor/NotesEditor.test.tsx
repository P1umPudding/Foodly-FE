import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotesEditor } from './NotesEditor'
import type { DraftNote } from '../../editor/draft'

function Stateful({ initial }: { initial: DraftNote[] }) {
  const [notes, setNotes] = useState(initial)
  return <NotesEditor notes={notes} onChange={setNotes} />
}

const notes: DraftNote[] = [
  { key: 1, text: 'Erste' },
  { key: 2, text: 'Zweite' },
]
const texts = () => screen.getAllByRole('textbox').map((t) => (t as HTMLTextAreaElement).value)
const openMenu = (n: number) =>
  fireEvent.keyDown(screen.getByRole('button', { name: `Notiz ${n}: Aktionen` }), { key: 'Enter' })

describe('NotesEditor', () => {
  it('shows each note as a multi-line field with a ⋮ menu instead of arrow and bin buttons', () => {
    render(<Stateful initial={notes} />)

    expect(screen.getByLabelText('Notiz 1').tagName).toBe('TEXTAREA')
    expect(screen.queryByRole('button', { name: 'Nach oben' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Notiz 2: Aktionen' })).toBeTruthy()
  })

  it('moves a note down via the menu', async () => {
    render(<Stateful initial={notes} />)

    openMenu(1)
    expect((await screen.findByRole('menuitem', { name: 'Nach oben' })).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nach unten' }))

    expect(texts()).toEqual(['Zweite', 'Erste'])
  })

  it('moves a note up via the menu', async () => {
    render(<Stateful initial={notes} />)

    openMenu(2)
    expect((await screen.findByRole('menuitem', { name: 'Nach unten' })).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nach oben' }))

    expect(texts()).toEqual(['Zweite', 'Erste'])
  })

  it('removes a note via "Entfernen"', async () => {
    render(<Stateful initial={notes} />)

    openMenu(1)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Entfernen' }))

    expect(texts()).toEqual(['Zweite'])
  })

  it('adds a note with "+ Notiz"', () => {
    render(<Stateful initial={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Notiz' }))

    expect(texts()).toEqual([''])
  })

  it('after "Entfernen" focus lands on "+ Notiz", not the page', async () => {
    render(<Stateful initial={notes} />)

    openMenu(1)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Entfernen' }))

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Notiz' })))
  })
})
