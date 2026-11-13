import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Tag } from 'lucide-react'
import { FilterButton } from './FilterButton'
import type { FilterValue } from '../../list/filterLabels'

const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

beforeEach(() => {
  desktop.value = true
})

// Clears its own value, as the filter bar will.
function Clearable({ onClear }: { onClear: () => void }) {
  const [value, setValue] = useState<FilterValue | null>({ first: 'Vegetarisch', more: 1 })
  return (
    <FilterButton
      label="Tags" icon={Tag}
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
      <FilterButton label="Tags" icon={Tag} value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    expect(screen.getByRole('button', { name: 'Tags' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tags entfernen' })).toBeNull()
  })

  it('shows its icon and a chevron while inactive', () => {
    render(
      <FilterButton label="Tags" icon={Tag} value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags' })
    expect(trigger.querySelector('svg.lucide-tag')).toBeTruthy()
    expect(trigger.querySelector('svg.lucide-chevron-down')).toBeTruthy()
  })

  it('shows "<Filter>: <Wert>" and a separate ✕ in one frame while active, without icon or chevron', () => {
    render(
      <FilterButton label="Tags" icon={Tag} value={{ first: 'Vegetarisch', more: 1 }} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags: Vegetarisch +1' })
    const clear = screen.getByRole('button', { name: 'Tags entfernen' })
    expect(trigger.contains(clear)).toBe(false)
    expect(trigger.querySelector('svg')).toBeNull()
    expect(within(trigger).getByText('Vegetarisch').className).toContain('font-semibold')
    // One frame around both, in border-strong; the ✕ sits behind a hairline. 40 px on phones.
    const frame = trigger.parentElement!
    expect(frame).toBe(clear.parentElement)
    expect(frame.className.split(/\s+/)).toEqual(expect.arrayContaining(['border', 'border-border-strong', 'phone:h-10']))
    expect(clear.className.split(/\s+/)).toEqual(expect.arrayContaining(['border-l', 'phone:w-10']))
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

  it('truncates only the first name, never "<Filter>:" or "+n"', () => {
    render(
      <FilterButton label="Kategorie" icon={Tag} value={{ first: 'Sehr lange Kategoriebezeichnung', more: 2 }} onClear={() => {}}>
        <p>Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Kategorie: Sehr lange Kategoriebezeichnung +2' })
    expect(trigger.className).toContain('max-w-56')
    const truncated = trigger.querySelectorAll('.truncate')
    expect(truncated).toHaveLength(1)
    expect(truncated[0].textContent).toBe('Sehr lange Kategoriebezeichnung')
    const more = within(trigger).getByText('+2')
    expect(more.className).toContain('shrink-0')
    expect(more.className).not.toContain('truncate')
    expect(within(trigger).getByText('Kategorie:').className).toContain('shrink-0')
  })

  it('shows no "+n" when only one value is selected', () => {
    render(
      <FilterButton label="Arbeitszeit" icon={Tag} value={{ first: '≤ 30 min', more: 0 }} onClear={() => {}}>
        <p>Regler</p>
      </FilterButton>,
    )
    expect(screen.getByRole('button', { name: 'Arbeitszeit: ≤ 30 min' })).toBeTruthy()
  })
})

describe('desktop', () => {
  it('opens a popover with the content; Esc closes it and returns focus to the trigger', async () => {
    render(
      <FilterButton label="Tags" icon={Tag} value={null} onClear={() => {}}>
        <p>Tag-Liste</p>
      </FilterButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Tags' })
    fireEvent.click(trigger)
    const popover = screen.getByRole('dialog', { name: 'Tags' })
    expect(within(popover).getByText('Tag-Liste')).toBeTruthy()
    // Open look: the frame's border follows the trigger's data-state via :has (jsdom can't evaluate :has itself).
    expect(trigger.getAttribute('data-state')).toBe('open')
    expect(trigger.parentElement!.className).toContain('has-[[data-state=open]]:border-subtle-foreground')

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
      <FilterButton label="Tags" icon={Tag} value={null} onClear={() => {}}>
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
