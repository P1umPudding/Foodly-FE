import { fireEvent, render, screen, within } from '@testing-library/react'
import { Sheet } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

function renderSheet(props: { scroll?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  render(
    <Sheet open onOpenChange={props.onOpenChange}>
      <BottomSheet title="Titel" description="Beschreibung" scroll={props.scroll}>
        <p>Inhalt</p>
      </BottomSheet>
    </Sheet>,
  )
  return screen.getByRole('dialog', { name: 'Titel', description: 'Beschreibung' })
}

describe('BottomSheet', () => {
  it('puts the title left-aligned and the ✕ in one header row', () => {
    const sheet = renderSheet()
    const title = within(sheet).getByRole('heading', { name: 'Titel' })
    const close = within(sheet).getByRole('button', { name: 'Schließen' })
    expect(title.closest('.text-center')).toBeNull()
    expect(title.className).toContain('text-left')
    expect(title.parentElement?.contains(close)).toBe(true)
    expect(close.className).not.toContain('absolute')
  })

  // The lib's SheetTitle brings text-lg/font-semibold; ours must win the merge.
  it('sets the title at 16/650', () => {
    const title = within(renderSheet()).getByRole('heading', { name: 'Titel' })
    expect(title.className).toContain('text-[16px]')
    expect(title.className).toContain('font-[650]')
    expect(title.className).not.toContain('text-lg')
    expect(title.className).not.toContain('font-semibold')
  })

  it('sizes the ✕ 30 px, 40 px on touch', () => {
    const close = within(renderSheet()).getByRole('button', { name: 'Schließen' })
    expect(close.className.split(' ')).toEqual(expect.arrayContaining(['size-7.5', 'touch:size-10']))
  })

  // The lib's own ✕ is hidden by a first-child selector (no CSS in tests, so check the structure it relies on).
  // Ours sits inside the header row, not among the direct children, so the selector can't reach it.
  it('keeps the lib close button first, followed by the grip', () => {
    const sheet = renderSheet()
    expect(sheet.firstElementChild?.tagName).toBe('BUTTON')
    expect(sheet.firstElementChild?.textContent).toBe('Close')
    expect(sheet.children[1].getAttribute('aria-hidden')).toBe('true')
    expect(within(sheet).getByRole('button', { name: 'Schließen' }).parentElement).not.toBe(sheet)
  })

  // A long word (a category name) must wrap, not push the ✕ out of the row.
  it('gives the title the wrap classes', () => {
    const title = within(renderSheet()).getByRole('heading', { name: 'Titel' })
    expect(title.className.split(' ')).toEqual(expect.arrayContaining(['min-w-0', 'break-words']))
  })

  it('closes from "Schließen"', () => {
    const onOpenChange = vi.fn()
    const sheet = renderSheet({ onOpenChange })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Schließen' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('wraps the content in a scroll region by default', () => {
    renderSheet()
    expect(screen.getByText('Inhalt').parentElement?.className).toContain('overflow-y-auto')
  })

  it('leaves the layout to the caller without scroll', () => {
    const sheet = renderSheet({ scroll: false })
    expect(screen.getByText('Inhalt').parentElement).toBe(sheet)
  })
})
