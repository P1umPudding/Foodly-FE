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
})
