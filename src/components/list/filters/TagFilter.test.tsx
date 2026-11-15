import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { checkboxLabels } from '../../../test/checkboxes'
import { TagFilter } from './TagFilter'
import type { ListState } from '../../../list/state'
import type { Tag } from '../../../api/protocol'

const tags: Tag[] = ['schnell', 'günstig', 'vegan', 'vegetarisch', 'scharf'].map((id) => ({ id, svg: null }) as Tag)

function Stateful({ set }: { set: (patch: Partial<ListState>) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return (
    <TagFilter
      tags={tags}
      selected={selected}
      set={(patch) => {
        set(patch)
        if (patch.tags) setSelected(patch.tags)
      }}
    />
  )
}

describe('TagFilter', () => {
  it('moves a selected tag to the top', () => {
    const set = vi.fn()
    render(<Stateful set={set} />)
    expect(checkboxLabels()[0]).toBe('schnell')
    fireEvent.click(screen.getByRole('checkbox', { name: 'vegan' }))
    expect(set).toHaveBeenCalledWith({ tags: ['vegan'] })
    expect(checkboxLabels()).toEqual(['vegan', 'schnell', 'günstig', 'vegetarisch', 'scharf'])
    expect(screen.getByRole('checkbox', { name: 'vegan' })).toHaveProperty('checked', true)
  })

  it('filters the list by the search', () => {
    render(<TagFilter tags={tags} selected={[]} set={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Tag suchen'), { target: { value: 'veg' } })
    expect(checkboxLabels()).toEqual(['vegan', 'vegetarisch'])
  })

  it('says so when nothing matches', () => {
    render(<TagFilter tags={tags} selected={[]} set={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Tag suchen'), { target: { value: 'xyz' } })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByText('Keine Treffer')).toBeTruthy()
  })
})

describe('TagFilter, order and hint', () => {
  it('shows the mockup hint', () => {
    render(<TagFilter tags={tags} selected={[]} set={() => {}} />)
    expect(screen.getByText('Mehrere = Rezept hat alle.')).toBeTruthy()
  })

  it('keeps the unselected order from when it opened (toggling refetches the frequencies)', () => {
    const { rerender } = render(<TagFilter tags={tags} selected={[]} set={() => {}} />)
    rerender(<TagFilter tags={[...tags].reverse()} selected={['vegan']} set={() => {}} />)
    expect(checkboxLabels()).toEqual(['vegan', 'schnell', 'günstig', 'vegetarisch', 'scharf'])
  })

  it('shows at most 40 tags without a search', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ id: `t${i}`, svg: null }) as Tag)
    render(<TagFilter tags={many} selected={[]} set={() => {}} />)
    expect(checkboxLabels()).toHaveLength(40)
  })
})
