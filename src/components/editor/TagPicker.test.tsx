import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagPicker } from './TagPicker'
import type { TagId } from '../../api/protocol'

vi.mock('../../catalog/CatalogProvider', () => ({
  useTags: () => ({
    byId: { Vegan: { id: 'Vegan' }, Vegetarisch: { id: 'Vegetarisch' }, Scharf: { id: 'Scharf' } },
    status: 'ready',
  }),
}))

function Stateful({ initial = [] as TagId[], onChange = vi.fn() }) {
  const [tags, setTags] = useState(initial)
  return (
    <TagPicker
      inputId="tags"
      value={tags}
      onChange={(next) => {
        onChange(next)
        setTags(next)
      }}
    />
  )
}

const input = () => screen.getByRole('combobox')
const chips = () => screen.queryAllByRole('button', { name: / entfernen$/ }).map((b) => b.getAttribute('aria-label'))

describe('TagPicker', () => {
  it('is one field with the placeholder "Tag hinzufügen"', () => {
    render(<Stateful initial={['Vegan']} />)

    expect(input().getAttribute('placeholder')).toBe('Tag hinzufügen')
    expect(chips()).toEqual(['Vegan entfernen'])
  })

  it('suggests matching tags right below the field while typing, without the chosen ones', () => {
    render(<Stateful initial={['Vegan']} />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'veg' } })

    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Vegetarisch'])
  })

  it('adds a tag with the arrow keys and Enter', () => {
    const onChange = vi.fn()
    render(<Stateful onChange={onChange} />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 've' } })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    const active = screen.getByRole('option', { selected: true })
    expect(input().getAttribute('aria-activedescendant')).toBe(active.id)
    expect(active.textContent).toBe('Vegetarisch')
    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith(['Vegetarisch'])
    expect(chips()).toEqual(['Vegetarisch entfernen'])
    expect((input() as HTMLInputElement).value).toBe('')
  })

  it('does not add free text that is no known tag', () => {
    const onChange = vi.fn()
    render(<Stateful onChange={onChange} />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'Neu' } })
    expect(screen.getByText('Kein passender Tag.')).toBeTruthy()
    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes the last tag with Backspace in the empty field', () => {
    render(<Stateful initial={['Vegan', 'Scharf']} />)

    fireEvent.keyDown(input(), { key: 'Backspace' })

    expect(chips()).toEqual(['Vegan entfernen'])
  })

  it('removes a tag with its ✕ (a button, so reachable by Tab and Enter)', () => {
    render(<Stateful initial={['Vegan', 'Scharf']} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vegan entfernen' }))

    expect(chips()).toEqual(['Scharf entfernen'])
  })

  it('closes the suggestions with Escape', () => {
    render(<Stateful />)

    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(input(), { key: 'Escape' })

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input().getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the suggestions when the field loses focus', () => {
    render(<Stateful />)

    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.blur(input())

    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ArrowUp from the first suggestion wraps to the last', () => {
    render(<Stateful />)

    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowUp' })

    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Scharf')
  })

  it('keeps focus in the field after removing a tag with its ✕', () => {
    render(<Stateful initial={['Vegan']} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vegan entfernen' }))

    expect(document.activeElement).toBe(input())
  })

  it('adds a tag by clicking its suggestion', () => {
    render(<Stateful />)

    fireEvent.focus(input())
    fireEvent.click(screen.getByRole('option', { name: 'Scharf' }))

    expect(chips()).toEqual(['Scharf entfernen'])
  })
})
