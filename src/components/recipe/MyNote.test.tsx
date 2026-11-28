import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MyNote } from './MyNote'
import { foodly } from '../../api'

let stored: Record<number, string>

beforeEach(() => {
  stored = {}
  vi.spyOn(foodly, 'getMyNote').mockImplementation(async (id) => stored[id] ?? '')
  vi.spyOn(foodly, 'setMyNote').mockImplementation(async (id, text) => {
    if (text.trim() === '') delete stored[id]
    else stored[id] = text
  })
})

afterEach(() => vi.restoreAllMocks())

describe('MyNote', () => {
  it('adds a note and shows it after "Fertig"', async () => {
    render(<MyNote recipeId={5} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Notiz hinzufügen' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Meine Notiz' }), { target: { value: 'Weniger Salz' } })
    expect(screen.getByText('12 / 5000')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(await screen.findByText('Weniger Salz')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(stored[5]).toBe('Weniger Salz')
  })

  it('autosaves while typing', async () => {
    render(<MyNote recipeId={5} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Notiz hinzufügen' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Meine Notiz' }), { target: { value: 'Entwurf' } })
    await waitFor(() => expect(stored[5]).toBe('Entwurf'), { timeout: 2000 })
  })

  it('opens an existing note without writing it back, and clearing it shows the empty state', async () => {
    stored[5] = 'Alt'
    render(<MyNote recipeId={5} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }))
    expect((screen.getByRole('textbox', { name: 'Meine Notiz' }) as HTMLTextAreaElement).value).toBe('Alt')
    await new Promise((r) => setTimeout(r, 900))
    expect(foodly.setMyNote).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Meine Notiz' }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    expect(await screen.findByRole('button', { name: 'Notiz hinzufügen' })).toBeTruthy()
    expect(stored[5]).toBeUndefined()
  })

  it('stays in the editor when the save fails', async () => {
    vi.mocked(foodly.setMyNote).mockRejectedValue(new Error('Konnte nicht im Browser gespeichert werden'))
    render(<MyNote recipeId={5} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Notiz hinzufügen' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Meine Notiz' }), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Nicht gespeichert')
    expect(screen.getByRole('textbox', { name: 'Meine Notiz' })).toBeTruthy()
  })
})
