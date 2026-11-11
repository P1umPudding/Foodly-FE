import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResponsivePanel } from './ResponsivePanel'
import { TriggerButton } from './TriggerButton'
import { setViewport } from '../test/viewport'

type PanelProps = Partial<Parameters<typeof ResponsivePanel>[0]>

function renderPanel(props: PanelProps = {}) {
  render(
    <>
      <TriggerButton>Außerhalb</TriggerButton>
      <ResponsivePanel
        trigger={<TriggerButton>Öffnen</TriggerButton>}
        popover={{ 'aria-label': 'Panel', align: 'end', className: 'w-80' }}
        sheet={{ title: 'Panel-Titel', description: 'Beschreibung', __e2e_test_id__: 'panel-sheet' }}
        {...props}
      >
        {props.children ?? ((variant) => <p>Inhalt {variant}</p>)}
      </ResponsivePanel>
    </>,
  )
  return screen.getByRole('button', { name: 'Öffnen' })
}

function Controlled({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        setOpen(next)
      }}
      trigger={<TriggerButton>Öffnen</TriggerButton>}
      popover={{ 'aria-label': 'Panel' }}
      sheet={{ title: 'Panel', description: 'Beschreibung' }}
    >
      <p>Inhalt</p>
    </ResponsivePanel>
  )
}

afterEach(() => {
  cleanup()
  setViewport(1024)
})

describe('ResponsivePanel on the desktop', () => {
  it('opens a named popover with the popover props and the popover content', () => {
    fireEvent.click(renderPanel())
    const panel = screen.getByRole('dialog', { name: 'Panel' })
    expect(panel.getAttribute('data-slot')).toBe('popover-content')
    expect(panel.getAttribute('data-align')).toBe('end')
    expect(panel.className).toContain('w-80')
    expect(within(panel).getByText('Inhalt popover')).toBeTruthy()
  })

  it('starts at 761 px', () => {
    setViewport(761)
    fireEvent.click(renderPanel())
    expect(screen.getByRole('dialog', { name: 'Panel' }).getAttribute('data-slot')).toBe('popover-content')
  })

  it('is non-modal by default and modal on request', async () => {
    fireEvent.click(renderPanel())
    await screen.findByRole('dialog', { name: 'Panel' })
    expect(document.body.style.pointerEvents).not.toBe('none')
    cleanup()
    fireEvent.click(renderPanel({ modal: true }))
    await screen.findByRole('dialog', { name: 'Panel' })
    expect(document.body.style.pointerEvents).toBe('none')
  })

  it('accepts plain children', () => {
    fireEvent.click(renderPanel({ children: <p>Fester Inhalt</p> }))
    expect(within(screen.getByRole('dialog', { name: 'Panel' })).getByText('Fester Inhalt')).toBeTruthy()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const trigger = renderPanel()
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Panel' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('passes the outside-press and focus-return handlers to the popover', async () => {
    const onInteractOutside = vi.fn()
    const onCloseAutoFocus = vi.fn()
    fireEvent.click(renderPanel({ onInteractOutside, onCloseAutoFocus }))
    await screen.findByRole('dialog', { name: 'Panel' })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Außerhalb' }))
    expect(onInteractOutside).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalled())
  })
})

describe('ResponsivePanel on a phone', () => {
  it('opens a bottom sheet titled by the sheet props, with the sheet content', async () => {
    setViewport(760)
    fireEvent.click(renderPanel())
    const sheet = await screen.findByRole('dialog', { name: 'Panel-Titel' })
    expect(sheet.getAttribute('data-test-id')).toBe('panel-sheet')
    expect(within(sheet).getByText('Inhalt sheet')).toBeTruthy()
  })

  it('closes from "Schließen" and returns focus to the trigger', async () => {
    setViewport(375)
    const trigger = renderPanel()
    fireEvent.click(trigger)
    const sheet = await screen.findByRole('dialog', { name: 'Panel-Titel' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('is modal by default', async () => {
    setViewport(375)
    fireEvent.click(renderPanel())
    await screen.findByRole('dialog', { name: 'Panel-Titel' })
    expect(document.body.style.pointerEvents).toBe('none')
  })

  it('stays usable around it with modal={false} and passes the handlers to the sheet', async () => {
    setViewport(375)
    const onInteractOutside = vi.fn()
    const onCloseAutoFocus = vi.fn()
    fireEvent.click(renderPanel({ modal: false, onInteractOutside, onCloseAutoFocus }))
    await screen.findByRole('dialog', { name: 'Panel-Titel' })
    expect(document.body.style.pointerEvents).not.toBe('none')
    // getByRole fails here if a modal sheet has hidden the rest of the page from the accessibility tree.
    const outside = screen.getByRole('button', { name: 'Außerhalb' })
    fireEvent.pointerDown(outside)
    expect(onInteractOutside).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalled())
  })
})

describe('ResponsivePanel across the breakpoint', () => {
  it('closes an uncontrolled panel and leaves the page unlocked', async () => {
    setViewport(375)
    fireEvent.click(renderPanel())
    await screen.findByRole('dialog', { name: 'Panel-Titel' })
    setViewport(1024)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('keeps a controlled panel open and reports closing to its owner', async () => {
    const onOpenChange = vi.fn()
    render(<Controlled onOpenChange={onOpenChange} />)
    expect(screen.getByRole('dialog', { name: 'Panel' }).getAttribute('data-slot')).toBe('popover-content')
    setViewport(375)
    const sheet = await screen.findByRole('dialog', { name: 'Panel' })
    expect(sheet.getAttribute('data-slot')).not.toBe('popover-content')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Schließen' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
