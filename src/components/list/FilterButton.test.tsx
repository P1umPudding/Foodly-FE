import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FilterButton } from './FilterButton'

const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

beforeEach(() => {
  desktop.value = true
})

// Clears its own value, as the filter bar will.
function Clearable({ onClear }: { onClear: () => void }) {
  const [value, setValue] = useState<string | null>('Vegetarisch +1')
  return (
    <FilterButton
      label="Tags"
      value={value}
      onClear={() => {
        onClear()
        setValue(null)
      }}
    >
      <p>Tag-Liste</p>
    </FilterButton>
  )
}

describe('inactive / active', () => {
  it('shows only the filter name while inactive', () => {
    render(
      <FilterButton label="Tags" value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    expect(screen.getByRole('button', { name: 'Tags' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tags entfernen' })).toBeNull()
  })

  it('shows "<Filter>: <Wert>" and a separate ✕ while active, both muted and 40 px on phones', () => {
    render(
      <FilterButton label="Tags" value="Vegetarisch +1" onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags: Vegetarisch +1' })
    const clear = screen.getByRole('button', { name: 'Tags entfernen' })
    expect(trigger.contains(clear)).toBe(false)
    expect(trigger.className).toContain('bg-muted')
    expect(trigger.className).toContain('phone:h-10')
    expect(clear.className).toContain('bg-muted')
    expect(clear.className).toContain('phone:size-10')
  })

  it.each([true, false])('✕ only clears: nothing opens and focus moves to the trigger (desktop: %s)', (isDesktop) => {
    desktop.value = isDesktop
    const onClear = vi.fn()
    render(<Clearable onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tags entfernen' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    const trigger = screen.getByRole('button', { name: 'Tags' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tags entfernen' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('truncates a long value instead of widening the bar', () => {
    render(
      <FilterButton label="Kategorie" value="Sehr lange Kategoriebezeichnung +3" onClear={() => {}}>
        <p>Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Kategorie: Sehr lange Kategoriebezeichnung +3' })
    expect(trigger.className).toContain('max-w-56')
    expect(trigger.querySelector('.truncate')?.textContent).toBe('Kategorie: Sehr lange Kategoriebezeichnung +3')
  })
})

describe('desktop', () => {
  it('opens a popover with the content; Esc closes it and returns focus to the trigger', async () => {
    render(
      <FilterButton label="Tags" value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags' })
    fireEvent.click(trigger)
    const popover = screen.getByRole('dialog', { name: 'Tags' })
    expect(within(popover).getByText('Tag-Liste')).toBeTruthy()

    fireEvent.keyDown(popover, { key: 'Escape' })
    expect(screen.queryByText('Tag-Liste')).toBeNull()
    // Radix restores focus on a timeout.
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('phone', () => {
  it('opens a bottom sheet titled by the filter; "Anzeigen" closes it', async () => {
    desktop.value = false
    render(
      <FilterButton label="Tags" value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags' })
    fireEvent.click(trigger)
    const sheet = screen.getByRole('dialog', { name: 'Tags' })
    expect(within(sheet).getByText('Tag-Liste')).toBeTruthy()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Anzeigen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
