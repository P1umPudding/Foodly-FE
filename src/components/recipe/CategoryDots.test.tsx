import { act, fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { CategoryDots } from './CategoryDots'
import type { UserCategory } from '../../api/protocol'

const desktop = vi.hoisted(() => ({ value: true }))
vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => desktop.value }))

const cats: UserCategory[] = ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({
  id: i + 1,
  user: 1,
  name,
  recipes: [1],
  order: i,
  color: '#3366cc',
  colorLight: null,
  colorDark: null,
}))

function renderDots(categories: UserCategory[]) {
  return render(
    <TooltipProvider delayDuration={0}>
      <CategoryDots categories={categories} />
    </TooltipProvider>,
  )
}

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)))

beforeEach(() => {
  desktop.value = true
})

it('renders nothing without categories', () => {
  const { container } = renderDots([])
  expect(container.firstChild).toBeNull()
})

it('shows at most three dots and +n for the rest', () => {
  const { container } = renderDots(cats)
  expect(screen.getAllByTestId('category-dot')).toHaveLength(3)
  expect(container.querySelectorAll('[data-cat]')).toHaveLength(3)
  expect(screen.getByText('+2')).toBeTruthy()
  expect(screen.getByText('Kategorien: A, B, C, D, E')).toBeTruthy()
})

it('colours dots only through the category vars', () => {
  const { container } = renderDots(cats.slice(0, 1))
  const dot = container.querySelector('[data-cat]') as HTMLElement
  expect(dot.className).toContain('bg-cat-dot')
  expect(dot.getAttribute('style')).toMatch(/--cat-dot-l/)
})

it('is never focusable', () => {
  const { container } = renderDots(cats)
  expect(container.querySelector('[tabindex], button, a')).toBeNull()
})

describe('desktop', () => {
  it('hovering a dot shows its category name', async () => {
    renderDots(cats)
    fireEvent.pointerMove(screen.getAllByTestId('category-dot')[1])
    expect((await screen.findByRole('tooltip')).textContent).toBe('B')
  })

  it('hovering +n lists the remaining names', async () => {
    renderDots(cats)
    fireEvent.pointerMove(screen.getByText('+2'))
    expect((await screen.findByRole('tooltip')).textContent).toBe('D, E')
  })
})

describe('phone', () => {
  it('shows no tooltip', async () => {
    desktop.value = false
    renderDots(cats)
    const dot = screen.getAllByTestId('category-dot')[0]
    expect(dot.hasAttribute('data-state')).toBe(false)
    fireEvent.pointerMove(dot)
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('control: the same sequence on desktop does open one', async () => {
    renderDots(cats)
    const dot = screen.getAllByTestId('category-dot')[0]
    expect(dot.hasAttribute('data-state')).toBe(true)
    fireEvent.pointerMove(dot)
    await flush()
    expect(screen.queryByRole('tooltip')).not.toBeNull()
  })
})
