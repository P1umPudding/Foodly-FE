// With the real CatalogProvider: a failing GET /users?ids=… must end in a row without the "von" line (#303 AC5).
import { StrictMode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CatalogProvider } from '../../catalog/CatalogProvider'
import { SharedWithYou } from './SharedWithYou'

const getUsers = vi.hoisted(() => vi.fn((_ids: number[]) => Promise.reject(new Error('404'))))
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
        <MemoryRouter>
          <CatalogProvider>
            <SharedWithYou />
          </CatalogProvider>
        </MemoryRouter>
      </StrictMode>,
    )
    const link = await screen.findByRole('link', { name: /Rezept 5/ })
    await waitFor(() => expect(getUsers).toHaveBeenCalledWith([4]))
    await waitFor(() => expect(within(link).queryByTestId('shared-owner')).toBeNull())
    expect(link.textContent).toBe('Rezept 5')
  })
})
