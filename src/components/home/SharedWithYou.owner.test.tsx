// With the real CatalogProvider: a failing GET /users?ids=… must end in a row without the "von" line (#303 AC5).
import { StrictMode } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { CatalogProvider } from '../../catalog/CatalogProvider'
import { SharedWithYou } from './SharedWithYou'

// Held open, so the reserved line can be seen before the lookup fails.
const lookup = vi.hoisted(() => ({ fail: (_e: Error) => {} }))
const getUsers = vi.hoisted(() =>
  vi.fn((_ids: number[]) => new Promise<never>((_resolve, reject) => (lookup.fail = reject))),
)
vi.mock('../../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    me: () => Promise.resolve({ id: 1, name: 'Kolja', profilePicture: null }),
    listIngredients: () => Promise.resolve([]),
    listCategories: () => Promise.resolve([]),
    getUsers: (ids: number[]) => getUsers(ids),
    searchRecipes: () =>
      Promise.resolve({
        items: [
          {
            id: 5,
            owner: 4,
            editors: [],
            viewers: [1],
            createdAt: null,
            updatedAt: null,
            myAccessSince: null,
            rating: [],
            name: 'Rezept 5',
            tags: [],
            source: null,
            time: null,
            workMinutes: null,
            overallMinutes: null,
            sizeNumber: null,
            sizeText: null,
            notes: [],
            mainImage: null,
            images: [],
            sections: [],
          },
        ],
        cursor: null,
      }),
  },
}))

describe('SharedWithYou with the real catalog', () => {
  it('drops the "von" line once the owner lookup has failed', async () => {
    render(
      <StrictMode>
        <MemoryRouter useTransitions={false}>
          <CatalogProvider>
            <SharedWithYou />
          </CatalogProvider>
        </MemoryRouter>
      </StrictMode>,
    )
    const link = await screen.findByRole('link', { name: /Rezept 5/ })
    await waitFor(() => expect(getUsers).toHaveBeenCalledWith([4]))
    expect(within(link).getByTestId('shared-owner').textContent).toBe('')
    await act(async () => lookup.fail(new Error('404')))
    await waitFor(() => expect(within(link).queryByTestId('shared-owner')).toBeNull())
    expect(link.textContent).toBe('Rezept 5')
  })
})
