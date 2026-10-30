import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategorySidebar } from './CategorySidebar'
import { categoryColors } from '../../lib/categoryColor'
import type { UserCategory } from '../../api/protocol'

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [10], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
]

describe('CategorySidebar toggle buttons', () => {
  it('carries the category colours and fires onToggle', () => {
    const onToggle = vi.fn()
    render(<CategorySidebar categories={cats} selected={[]} onToggle={onToggle} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    const { light, dark } = categoryColors(cats[0])
    expect(btn.hasAttribute('data-cat')).toBe(true)
    expect(btn.style.getPropertyValue('--cat-dot-l')).toBe(light.dot)
    expect(btn.style.getPropertyValue('--cat-dot-d')).toBe(dark.dot)
    expect(btn.className).toContain('border-cat-line')
    expect(btn.className).toContain('font-normal')
    expect(btn.className).not.toContain('bg-cat-soft')
    expect(btn.className).not.toContain('border-cat-dot')
    expect(btn.querySelector('.bg-cat-dot')).not.toBeNull()
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('fills with the soft category colour when active', () => {
    render(<CategorySidebar categories={cats} selected={[1]} onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    expect(btn.className).toContain('bg-cat-soft')
    expect(btn.className).toContain('text-cat-ink')
    expect(btn.className).toContain('border-cat-dot')
    expect(btn.className).toContain('font-medium')
    expect(btn.className).not.toContain('border-cat-line')
  })

  it('keeps "Ohne Kategorie" neutral', () => {
    render(<CategorySidebar categories={cats} selected={[]} onToggle={() => {}} uncategorizedCount={2} />)
    expect(screen.getByRole('button', { name: /Ohne Kategorie/i }).hasAttribute('data-cat')).toBe(false)
  })
})
