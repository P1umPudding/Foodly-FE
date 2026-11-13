import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import type { Recipe } from '../../api/protocol'

function renderIndicator(recipe: Recipe) {
  return render(
    <TooltipProvider>
      <RoleCollabIndicator recipe={recipe} />
    </TooltipProvider>,
  )
}

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

const base: Recipe = {
  id: 1,
  owner: 1,
  editors: [],
  viewers: [],
  createdAt: null,
  updatedAt: null,
  myAccessSince: null,
  name: 'R',
  tags: [],
  source: null,
  rating: [],
  time: null,
  workMinutes: null,
  overallMinutes: null,
  sizeNumber: null,
  sizeText: null,
  notes: [],
  mainImage: null,
  images: [],
  sections: [],
}

describe('RoleCollabIndicator', () => {
  it('renders nothing for an own private recipe', () => {
    const { container } = renderIndicator({ ...base, owner: 1 })
    expect(container.firstChild).toBeNull()
  })

  it('shows only the sharing icon for an own shared recipe', () => {
    renderIndicator({ ...base, owner: 1, viewers: [2] })
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByLabelText(/geteilt/i)).toBeTruthy()
  })

  it('shows only the sharing icon for an own collaborative recipe', () => {
    renderIndicator({ ...base, owner: 1, editors: [2] })
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
  })

  it('labels viewer + shared', () => {
    renderIndicator({ ...base, owner: 2, viewers: [1] })
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy()
    expect(screen.getByLabelText(/geteilt/i)).toBeTruthy()
    // neutral grey at rest, no hover colour-reveal
    const viewerClass = screen
      .getByLabelText(/Betrachter/i)
      .querySelector('svg')
      ?.getAttribute('class')
    expect(viewerClass).toContain('text-muted-foreground/70')
    expect(viewerClass).not.toContain('group-hover:')
  })

  it('labels editor + collaborative', () => {
    renderIndicator({ ...base, owner: 2, editors: [1] })
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByLabelText(/Bearbeiter/i)).toBeTruthy()
    expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
  })

  it('labels viewer + collaborative', () => {
    renderIndicator({ ...base, owner: 2, editors: [3], viewers: [1] })
    expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy()
    expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
  })
})
