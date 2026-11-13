import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SectionBlock } from './SectionBlock'
import { TimerProvider, useTimers } from '../../timers/TimerProvider'
import { TimerPanelProvider } from '../../timers/TimerPanelContext'
import type { Section } from '../../api/protocol'

// Tag rendering depends on the tag catalog; render the text verbatim instead.
vi.mock('../TagText', () => ({ TagText: ({ value }: { value: string }) => value }))

function section(over: Partial<Section> = {}): Section {
  return {
    id: 1,
    name: 'Teig',
    ingredients: [{ id: 11, ingredient: null, text: 'Mehl', amount: '200', amountPrefix: null, unit: 'g' }],
    steps: ['Mehl sieben', '10 Minuten köcheln'],
    ...over,
  }
}

function TimerLabels() {
  const { timers } = useTimers()
  return <output data-testid="timers">{timers.map((t) => t.label).join('|')}</output>
}

function renderBlock(props: Partial<Parameters<typeof SectionBlock>[0]> = {}) {
  const onToggle = vi.fn()
  render(
    <TimerProvider userId={1}>
      <TimerPanelProvider>
        <SectionBlock
          section={section()}
          showTitle
          recipeName="Gulasch"
          stepOffset={0}
          onToggle={onToggle}
          {...props}
        />
        <TimerLabels />
      </TimerPanelProvider>
    </TimerProvider>,
  )
  return { onToggle }
}

const heading = (name: string) => screen.queryByRole('heading', { name })

beforeEach(() => localStorage.clear())

describe('SectionBlock', () => {
  it('shows the section title with column titles one level below', () => {
    renderBlock()
    expect(heading('Teig')?.tagName).toBe('H2')
    expect(heading('Zutaten')?.tagName).toBe('H3')
    expect(heading('Zubereitung')?.tagName).toBe('H3')
  })

  it('hides the title when the recipe has a single section; column titles take its level', () => {
    renderBlock({ showTitle: false })
    expect(heading('Teig')).toBeNull()
    expect(heading('Zutaten')?.tagName).toBe('H2')
    expect(heading('Zubereitung')?.tagName).toBe('H2')
  })

  it('shows no title for an unnamed section', () => {
    renderBlock({ section: section({ name: null }) })
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['Zutaten', 'Zubereitung'])
    expect(heading('Zutaten')?.tagName).toBe('H2')
  })

  it('numbers steps across sections and labels timers alike', () => {
    renderBlock({ stepOffset: 2 })
    const [first, second] = screen.getAllByRole('listitem')
    expect(within(first).getByText('3')).toBeTruthy()
    expect(within(second).getByText('4')).toBeTruthy()
    expect(screen.queryByText('1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Timer starten: 10 Minuten' }))
    expect(screen.getByTestId('timers').textContent).toBe('Gulasch · Schritt 4')
  })

  it('leaves out a column without content', () => {
    renderBlock({ section: section({ ingredients: [] }) })
    expect(heading('Zutaten')).toBeNull()
    expect(heading('Zubereitung')).not.toBeNull()
  })

  it('leaves out the steps column without steps', () => {
    renderBlock({ section: section({ steps: [] }) })
    expect(heading('Zubereitung')).toBeNull()
    expect(heading('Zutaten')).not.toBeNull()
  })

  it('renders only the title for a section without ingredients and steps', () => {
    renderBlock({ section: section({ ingredients: [], steps: [] }) })
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['Teig'])
  })

  it('reports a ticked ingredient', () => {
    const { onToggle } = renderBlock({ checkable: true })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mehl' }))
    expect(onToggle).toHaveBeenCalledWith(11)
  })
})
