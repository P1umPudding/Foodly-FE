// Dev-only mock backend, lazy-loaded when VITE_MOCK=1 so it stays out of prod.

import type { Ingredient, Recipe, Tag, User, UserCategory } from '../api/protocol'
import { applyQuery, PAGE_SIZE } from '../list/query'
import type { PaginatedRecipes, RecipeSearchQuery } from '../api/protocol'

import recipes from './data/recipes.json'
import users from './data/users.json'
import tags from './data/tags.json'
import ingredients from './data/ingredients.json'
import categories from './data/categories.json'

export const mockData = {
  recipes: recipes as Recipe[],
  users: users as User[],
  tags: tags as Tag[],
  ingredients: ingredients as Ingredient[],
  categories: categories as UserCategory[],
}

export const CURRENT_USER_ID = 1

// Latency so loading states are actually visible in dev.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

export async function mockRequest(type: string, payload?: unknown): Promise<unknown> {
  await delay()
  const id = (payload as { id?: number } | undefined)?.id

  switch (type) {
    case 'recipes.list':
      return mockData.recipes
    case 'recipes.get': {
      const recipe = mockData.recipes.find((r) => r.id === id)
      if (!recipe) throw new Error(`recipe ${id} not found`)
      return recipe
    }
    case 'categories.list':
      return mockData.categories
    case 'tags.list':
      return mockData.tags
    case 'ingredients.list':
      return mockData.ingredients
    case 'users.list':
      return mockData.users
    case 'me':
      return mockData.users.find((u) => u.id === CURRENT_USER_ID) ?? null
    case 'recipes.search': {
      const { query, page } = payload as { query: RecipeSearchQuery; page: number }
      const all = applyQuery(mockData.recipes, query, CURRENT_USER_ID)
      const start = (page - 1) * PAGE_SIZE
      const items = all.slice(start, start + PAGE_SIZE)
      const cursor = start + PAGE_SIZE < all.length ? page + 1 : null
      return { items, cursor } satisfies PaginatedRecipes
    }
    case 'recipes.copy': {
      const original = mockData.recipes.find((r) => r.id === id)
      if (!original) throw new Error(`recipe ${id} not found`)
      const nextId = mockData.recipes.reduce((max, r) => Math.max(max, r.id), 0) + 1
      const copy: Recipe = {
        ...original,
        id: nextId,
        name: `${original.name} (Kopie)`,
        owner: CURRENT_USER_ID,
        editors: [],
        viewers: [],
      }
      mockData.recipes.push(copy)
      return copy
    }
    default:
      throw new Error(`[mock] no handler for message type "${type}"`)
  }
}
