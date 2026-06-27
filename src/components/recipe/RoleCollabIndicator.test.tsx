import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { RoleCollabIndicator } from './RoleCollabIndicator'
import type { Recipe } from '../../api/protocol'
import type { RoleFilter, CollabFilter } from '../../list/state'

function renderIndicator(recipe: Recipe, active?: { activeRole?: RoleFilter; activeCollab?: CollabFilter }) {
  return render(
    <TooltipProvider>
      <RoleCollabIndicator recipe={recipe} {...active} />
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
  amount: null,
  basePortionMultiplier: null,
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
    // neutral grey at rest; the muted owner colour is revealed only on row hover
    const ownerClass = screen
      .getByLabelText(/Besitzer/i)
      .querySelector('svg')
      ?.getAttribute('class')
    expect(ownerClass).toContain('text-muted-foreground/70')
    expect(ownerClass).toContain('group-hover:text-[#a07b3f]')
  })

  it('labels viewer + collaborative', () => {
    renderIndicator({ ...base, owner: 2, editors: [3], viewers: [1] })
    expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy()
    expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy()
  })

  it('colours the icon permanently when its value is the active filter', () => {
    renderIndicator({ ...base, owner: 1 }, { activeRole: 'owner' })
    const ownerClass = screen
      .getByLabelText(/Besitzer/i)
      .querySelector('svg')
      ?.getAttribute('class')
    expect(ownerClass).toContain('text-[#a07b3f]')
    expect(ownerClass).not.toContain('text-muted-foreground/70')
  })
})
