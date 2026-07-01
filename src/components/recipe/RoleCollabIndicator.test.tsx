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
  it('labels owner + private', () => {
    renderIndicator({ ...base, owner: 1 })
    expect(screen.getByLabelText(/Besitzer/i)).toBeTruthy()
    expect(screen.getByLabelText(/privat/i)).toBeTruthy()
    // neutral grey at rest, no hover colour-reveal
    const ownerClass = screen
      .getByLabelText(/Besitzer/i)
      .querySelector('svg')
      ?.getAttribute('class')
    expect(ownerClass).toContain('text-muted-foreground/70')
    expect(ownerClass).not.toContain('group-hover:')
  })

  it('labels viewer + collaborative', () => {
    renderIndicator({ ...base, owner: 2, editors: [3], viewers: [1] })
    expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy()
    expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
  })
})
