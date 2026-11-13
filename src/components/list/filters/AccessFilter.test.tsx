import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { AccessFilter } from './AccessFilter'
import type { CollabFilter, RoleFilter } from '../../../list/state'

function setup(role: RoleFilter = 'any', collab: CollabFilter = 'any') {
  const set = vi.fn()
  render(
    <TooltipProvider>
      <AccessFilter role={role} collab={collab} set={set} />
    </TooltipProvider>,
  )
  return { set }
}

const group = (name: string) => within(screen.getByRole('radiogroup', { name }))
const roleRadio = (name: RegExp) => group('Meine Rolle').getByRole('radio', { name })
const collabRadio = (name: RegExp) => group('Freigabe').getByRole('radio', { name })
// Greyed options fade their content; the radio itself stays at full strength.
const isGreyed = (radio: HTMLElement) =>
  radio.parentElement!.querySelector('label > span')!.className.split(/\s+/).includes('opacity-40')

describe('AccessFilter', () => {
  it('renders both groups with an "Alle" option each', () => {
    setup()
    expect(group('Meine Rolle').getAllByRole('radio')).toHaveLength(4)
    expect(group('Freigabe').getAllByRole('radio')).toHaveLength(4)
    expect(roleRadio(/Alle/).getAttribute('aria-checked')).toBe('true')
    expect(collabRadio(/Alle/).getAttribute('aria-checked')).toBe('true')
  })

  it('greys impossible Freigabe options once a role is chosen', () => {
    setup('editor')
    // editor → only Kollaborativ is valid
    expect(isGreyed(collabRadio(/Privat/))).toBe(true)
    expect(isGreyed(collabRadio(/Geteilt/))).toBe(true)
    expect(isGreyed(collabRadio(/Kollaborativ/))).toBe(false)
    expect(isGreyed(collabRadio(/Alle/))).toBe(false)
    expect(collabRadio(/Privat/).hasAttribute('disabled')).toBe(false)
  })

  it('greys impossible roles once a Freigabe is chosen', () => {
    setup('any', 'private')
    expect(isGreyed(roleRadio(/Bearbeiter/))).toBe(true)
    expect(isGreyed(roleRadio(/Betrachter/))).toBe(true)
    expect(isGreyed(roleRadio(/Besitzer/))).toBe(false)
  })

  // design.md §2: rows are controls (rounded-md), greyed or not.
  it('rounds every option row like other controls', () => {
    setup('viewer', 'shared')
    for (const name of ['Meine Rolle', 'Freigabe']) {
      const radios = group(name).getAllByRole('radio')
      expect(radios).toHaveLength(4)
      expect(radios.some(isGreyed)).toBe(true)
      for (const radio of radios) {
        expect(radio.parentElement!.classList.contains('rounded-md')).toBe(true)
        expect(radio.parentElement!.classList.contains('rounded-sm')).toBe(false)
      }
    }
  })

  it('describes why a greyed option does not fit, beyond the hover tooltip', () => {
    setup('editor')
    const privat = collabRadio(/Privat/)
    const reason = document.getElementById(privat.getAttribute('aria-describedby')!)
    expect(reason?.textContent).toBe('Passt nicht zur gewählten Rolle – Klick setzt sie zurück')
    expect(collabRadio(/Kollaborativ/).hasAttribute('aria-describedby')).toBe(false)
  })

  it('relaxes the sister axis when an impossible option is clicked', () => {
    const { set } = setup('editor')
    fireEvent.click(collabRadio(/Privat/))
    expect(set).toHaveBeenCalledWith({ collab: 'private', role: 'any' })
  })

  it('keeps a compatible sister axis', () => {
    const { set } = setup('owner')
    fireEvent.click(collabRadio(/Geteilt/))
    expect(set).toHaveBeenCalledWith({ collab: 'shared', role: 'owner' })
  })

  it('"Alle" resets that axis only', () => {
    const { set } = setup('viewer', 'shared')
    fireEvent.click(collabRadio(/Alle/))
    expect(set).toHaveBeenCalledWith({ collab: 'any', role: 'viewer' })
  })

  it('marks the chosen role as checked', () => {
    setup('owner')
    expect(roleRadio(/Besitzer/).getAttribute('aria-checked')).toBe('true')
    expect(roleRadio(/Bearbeiter/).getAttribute('aria-checked')).toBe('false')
  })

  it('arrow keys pass over greyed options instead of relaxing the other axis', async () => {
    const { set } = setup('owner', 'private')
    const owner = roleRadio(/Besitzer/)
    owner.focus()
    fireEvent.keyDown(owner, { key: 'ArrowDown' })
    // Radix moves focus on the next tick; Bearbeiter can't pair with Privat
    await waitFor(() => expect(document.activeElement).toBe(roleRadio(/Bearbeiter/)))
    expect(set).not.toHaveBeenCalled()
  })

  it('arrow keys still select a compatible option', async () => {
    const { set } = setup('any', 'private')
    const all = roleRadio(/Alle/)
    all.focus()
    fireEvent.keyDown(all, { key: 'ArrowDown' })
    await waitFor(() => expect(set).toHaveBeenCalledWith({ role: 'owner', collab: 'private' }))
  })

  it('a click still picks a greyed option and relaxes the other axis', () => {
    const { set } = setup('owner', 'private')
    fireEvent.click(roleRadio(/Bearbeiter/))
    expect(set).toHaveBeenCalledWith({ role: 'editor', collab: 'any' })
  })

  it('a greyed option is selectable again once the arrow key is released', async () => {
    const { set } = setup('owner', 'private')
    const owner = roleRadio(/Besitzer/)
    owner.focus()
    fireEvent.keyDown(owner, { key: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(roleRadio(/Bearbeiter/)))
    fireEvent.keyUp(roleRadio(/Bearbeiter/), { key: 'ArrowDown' })
    fireEvent.click(roleRadio(/Bearbeiter/))
    expect(set).toHaveBeenCalledWith({ role: 'editor', collab: 'any' })
  })

  it('a click is not swallowed when the arrow key was released outside the group', async () => {
    const { set } = setup('owner', 'private')
    const owner = roleRadio(/Besitzer/)
    owner.focus()
    fireEvent.keyDown(owner, { key: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(roleRadio(/Bearbeiter/)))
    fireEvent.keyUp(document.body, { key: 'ArrowDown' })
    fireEvent.pointerDown(roleRadio(/Betrachter/))
    fireEvent.click(roleRadio(/Betrachter/))
    expect(set).toHaveBeenCalledWith({ role: 'viewer', collab: 'any' })
  })

  it('clicking the label text of a greyed option picks it', () => {
    const { set } = setup('owner', 'private')
    const label = roleRadio(/Bearbeiter/).parentElement!.querySelector('label')!
    fireEvent.pointerDown(label)
    fireEvent.click(label)
    expect(set).toHaveBeenCalledWith({ role: 'editor', collab: 'any' })
  })

  // design.md §7: the reason must be visible without hover, so phones see it too.
  describe('hint under a group with greyed options', () => {
    const ROLE_HINT = 'Blasse Optionen passen nicht zur Freigabe. Auswählen setzt sie auf „Alle“.'
    const COLLAB_HINT = 'Blasse Optionen passen nicht zur Rolle. Auswählen setzt sie auf „Alle“.'

    it('shows the matching hint directly under each group that greys something', () => {
      // viewer × shared greys Bearbeiter (role) and Privat (Freigabe).
      setup('viewer', 'shared')
      for (const [name, text] of [
        ['Meine Rolle', ROLE_HINT],
        ['Freigabe', COLLAB_HINT],
      ]) {
        const hint = screen.getByText(text)
        expect(hint.previousElementSibling).toBe(screen.getByRole('radiogroup', { name }))
        expect(hint.getAttribute('aria-hidden')).toBe('true')
        expect([...hint.classList]).toEqual(expect.arrayContaining(['text-xs', 'text-muted-foreground', 'px-1']))
      }
    })

    it('shows only the role hint for Besitzer × Geteilt, since Besitzer fits every Freigabe', () => {
      setup('owner', 'shared')
      expect(screen.getByText(ROLE_HINT).previousElementSibling).toBe(
        screen.getByRole('radiogroup', { name: 'Meine Rolle' }),
      )
      expect(screen.queryByText(COLLAB_HINT)).toBeNull()
    })

    it('drops both hints once both axes are back on "Alle"', () => {
      const { rerender } = render(<AccessFilter role="viewer" collab="shared" set={vi.fn()} />, {
        wrapper: TooltipProvider,
      })
      expect(screen.getByText(ROLE_HINT)).toBeTruthy()
      expect(screen.getByText(COLLAB_HINT)).toBeTruthy()
      rerender(<AccessFilter role="any" collab="any" set={vi.fn()} />)
      expect(screen.queryByText(ROLE_HINT)).toBeNull()
      expect(screen.queryByText(COLLAB_HINT)).toBeNull()
    })
  })
})
