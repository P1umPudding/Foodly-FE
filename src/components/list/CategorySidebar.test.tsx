import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategorySidebar } from './CategorySidebar'
import type { UserCategory } from '../../api/protocol'

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [10], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
]

describe('CategorySidebar toggle buttons', () => {
  it('shows the category colour as a border when inactive and fires onToggle', () => {
    const onToggle = vi.fn()
    render(<CategorySidebar categories={cats} selected={[]} onToggle={onToggle} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    expect(btn.className).toContain('border-[#e11d48]')
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('applies the colour tint when active', () => {
    render(<CategorySidebar categories={cats} selected={[1]} onToggle={() => {}} />)
    const btn = screen.getByRole('button', { name: /Favoriten/i })
    expect(btn.className).toContain('bg-[#e11d48]/15')
  })
})
