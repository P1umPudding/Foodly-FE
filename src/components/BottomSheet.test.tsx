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
  it('has a 40 px close button labelled "Schließen"', () => {
    const sheet = renderSheet()
    const close = within(sheet).getByRole('button', { name: 'Schließen' })
    expect(close.className).toContain('size-10')
    expect(close.className).not.toContain('size-9')
  })

  // The lib's own ✕ is hidden by a first-child selector (no CSS in tests, so check the structure it relies on).
  it('keeps the lib close button first, so the selector hides it and not ours', () => {
    const sheet = renderSheet()
    expect(sheet.firstElementChild?.tagName).toBe('BUTTON')
    expect(sheet.firstElementChild?.textContent).toBe('Close')
    expect(sheet.children[1].getAttribute('aria-label')).toBe('Schließen')
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
