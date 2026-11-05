import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategoryFilter } from './CategoryFilter'
import { categoryColors } from '../../../lib/categoryColor'
import type { ListState } from '../../../list/state'
import type { UserCategory } from '../../../api/protocol'

const cat = (id: number, name: string, order: number, recipes: number[]): UserCategory => ({
  id,
  user: 1,
  name,
  recipes,
  order,
  color: '#e11d48',
  colorLight: null,
  colorDark: null,
})

const cats = [cat(2, 'Suppen', 1, [1, 2, 3]), cat(1, 'Favoriten', 0, [10])]

function Stateful({ set }: { set: (patch: Partial<ListState>) => void }) {
  const [selected, setSelected] = useState<number[]>([])
  return (
    <CategoryFilter
      categories={cats}
      selected={selected}
      set={(patch) => {
        set(patch)
        if (patch.categories) setSelected(patch.categories)
      }}
    />
  )
}

const labelText = (box: HTMLInputElement) =>
  Array.from(box.labels ?? [])
    .map((l) => l.textContent)
    .join('')

describe('CategoryFilter', () => {
  it('lists "Ohne Kategorie" first and without a count, then categories by order', () => {
    render(<CategoryFilter categories={cats} selected={[]} set={() => {}} />)
    const labels = screen.getAllByRole<HTMLInputElement>('checkbox').map((b) => labelText(b))
    expect(labels).toEqual([
      'Ohne Kategorie',
      'Favoriten1, 1 Rezepte',
      'Suppen3, 3 Rezepte',
    ])
  })

  it('keeps "Ohne Kategorie" neutral and colours real categories', () => {
    render(<CategoryFilter categories={cats} selected={[]} set={() => {}} />)
    expect(screen.getByRole('checkbox', { name: /Ohne Kategorie/ }).closest('[data-cat]')).toBeNull()
    const row = screen.getByRole('checkbox', { name: /Favoriten/ }).closest<HTMLElement>('[data-cat]')!
    const { light, dark } = categoryColors(cats[1])
    expect(row.style.getPropertyValue('--cat-dot-l')).toBe(light.dot)
    expect(row.style.getPropertyValue('--cat-dot-d')).toBe(dark.dot)
    expect(row.querySelector('.bg-cat-dot')).not.toBeNull()
  })

  it('selects several categories (OR)', () => {
    const set = vi.fn()
    render(<Stateful set={set} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Favoriten/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Suppen/ }))
    expect(set).toHaveBeenLastCalledWith({ categories: [1, 2] })
    expect(screen.getByRole('checkbox', { name: /Favoriten/ })).toHaveProperty('checked', true)
  })

  it('selects "Ohne Kategorie" as the uncategorised sentinel', () => {
    const set = vi.fn()
    render(<CategoryFilter categories={cats} selected={[]} set={set} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Ohne Kategorie/ }))
    expect(set).toHaveBeenCalledWith({ categories: [0] })
  })
})
