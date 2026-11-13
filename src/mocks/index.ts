// In-browser mock backend for VITE_MOCK=1. bootstrap() lazy-loads it (own chunk) and
// every request is routed here.

import type {
  CategoryInput,
  CreateRecipe,
  ImageId,
  Ingredient,
  Recipe,
  RecipeId,
  Tag,
  User,
  UserCategory,
  UserCategoryId,
  UserId,
} from '../api/protocol'
import { applyQuery, PAGE_SIZE } from '../list/query'
import { assertRating } from '../api/views'
import { imageRef, withImageRefs } from './images'
import type { PaginatedRecipes, RecipeSearchQuery } from '../api/protocol'

import recipes from './data/recipes.json'
import users from './data/users.json'
import tags from './data/tags.json'
import ingredients from './data/ingredients.json'
import categories from './data/categories.json'

type RawRecipe = Omit<Recipe, 'mainImage' | 'images'> & { mainImage: ImageId | null; images: ImageId[] }

export const mockData = {
  recipes: (recipes as RawRecipe[]).map((r): Recipe => ({ ...r, ...withImageRefs(r) })),
  users: users as User[],
  tags: tags as Tag[],
  ingredients: ingredients as Ingredient[],
  categories: categories as UserCategory[],
}

export const CURRENT_USER_ID = 1

// Latency so loading states are actually visible in dev.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

let nextId = 10_000

// Mirrors the backend's expansion of a CreateRecipe into a Recipe: fresh ids
// everywhere (the real PUT deletes and re-inserts nested rows, so ids are not
// stable across an update) and IngredientRefs resolved from the catalog.
function expand(input: CreateRecipe, id: RecipeId, owner: number): Recipe {
  return {
    id,
    owner,
    editors: [],
    viewers: [],
    createdAt: null,
    updatedAt: null,
    myAccessSince: null,
    rating: [],
    name: input.name,
    tags: input.tags,
    source: input.source,
    time: input.time,
    workMinutes: input.workMinutes,
    overallMinutes: input.overallMinutes,
    sizeNumber: input.sizeNumber,
    sizeText: input.sizeText,
    notes: input.notes,
    ...withImageRefs(input),
    sections: input.sections.map((section) => ({
      id: nextId++,
      name: section.name,
      steps: section.steps,
      ingredients: section.ingredients.map((line) => ({
        id: nextId++,
        ingredient:
          line.ingredient === null ? null : (mockData.ingredients.find((i) => i.id === line.ingredient) ?? null),
        text: line.text,
        amount: line.amount,
        amountPrefix: line.amountPrefix,
        unit: line.unit,
      })),
    })),
  }
}

// Same rules as the backend (422 there), English like its messages.
function assertCategoryInput(input: CategoryInput): void {
  if (!input.name.trim()) throw new Error('Name must not be empty')
  if (!input.color) throw new Error('Color must not be empty')
}

function findCategory(id: UserCategoryId | undefined): UserCategory {
  const category = mockData.categories.find((c) => c.id === id)
  if (!category) throw new Error('Category not found')
  return category
}

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
      // A snapshot, like a REST response: copy/delete change the live arrays in place. Sorted like the backend.
      return structuredClone(mockData.categories).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    case 'categories.create': {
      const { input } = payload as { input: CategoryInput }
      assertCategoryInput(input)
      // Like the backend: the new category goes to the end.
      const order = Math.max(-1, ...mockData.categories.map((c) => c.order ?? 0)) + 1
      const created: UserCategory = {
        id: nextId++,
        user: CURRENT_USER_ID,
        name: input.name,
        recipes: [],
        order,
        color: input.color,
        colorLight: input.colorLight,
        colorDark: input.colorDark,
      }
      mockData.categories.push(created)
      return structuredClone(created)
    }
    case 'categories.update': {
      const { input } = payload as { input: CategoryInput }
      const category = findCategory(id)
      assertCategoryInput(input)
      Object.assign(category, {
        name: input.name,
        color: input.color,
        colorLight: input.colorLight,
        colorDark: input.colorDark,
      })
      return structuredClone(category)
    }
    case 'categories.delete': {
      mockData.categories.splice(mockData.categories.indexOf(findCategory(id)), 1)
      return undefined
    }
    case 'categories.setRecipes': {
      const { recipeIds } = payload as { recipeIds: RecipeId[] }
      const category = findCategory(id)
      const unknown = recipeIds.find((recipeId) => !mockData.recipes.some((r) => r.id === recipeId))
      if (unknown !== undefined) throw new Error(`recipe ${unknown} not found`)
      category.recipes = [...recipeIds]
      return structuredClone(category)
    }
    case 'categories.reorder': {
      const { categoryIds } = payload as { categoryIds: UserCategoryId[] }
      // Check every id first, so a bad one changes nothing.
      const listed = categoryIds.map(findCategory)
      listed.forEach((category, index) => (category.order = index))
      return undefined
    }
    case 'tags.list':
      return mockData.tags
    case 'ingredients.list':
      return mockData.ingredients
    case 'users.get': {
      const { ids } = payload as { ids: UserId[] }
      return mockData.users.filter((u) => ids.includes(u.id))
    }
    case 'me':
      return mockData.users.find((u) => u.id === CURRENT_USER_ID) ?? null
    case 'recipes.search': {
      const { query, page } = payload as { query: RecipeSearchQuery; page: number }
      // The backend filters by category; applyQuery can't, it doesn't know the categories. A recipe in any of them
      // matches (only the category page sends one, so AND vs. OR, Backend #17, doesn't matter yet).
      const wanted = query.filters?.categories ?? []
      const inCategories = wanted.length
        ? mockData.recipes.filter((r) =>
            mockData.categories.some((c) => wanted.includes(c.id) && c.recipes.includes(r.id)),
          )
        : mockData.recipes
      const all = applyQuery(inCategories, query, CURRENT_USER_ID)
      const start = (page - 1) * PAGE_SIZE
      const items = all.slice(start, start + PAGE_SIZE)
      const cursor = start + PAGE_SIZE < all.length ? page + 1 : null
      return { items, cursor } satisfies PaginatedRecipes
    }
    case 'recipes.copy': {
      const original = mockData.recipes.find((r) => r.id === id)
      if (!original) throw new Error(`recipe ${id} not found`)
      const copy: Recipe = {
        ...original,
        id: nextId++,
        name: `${original.name} (Kopie)`,
        owner: CURRENT_USER_ID,
        editors: [],
        viewers: [],
      }
      mockData.recipes.push(copy)
      // Carry the clone into every category the original belonged to.
      for (const category of mockData.categories) {
        if (category.recipes.includes(original.id)) category.recipes.push(copy.id)
      }
      return copy
    }
    case 'recipes.delete': {
      const index = mockData.recipes.findIndex((r) => r.id === id)
      if (index === -1) throw new Error(`recipe ${id} not found`)
      mockData.recipes.splice(index, 1)
      for (const category of mockData.categories) {
        category.recipes = category.recipes.filter((r) => r !== id)
      }
      return undefined
    }
    case 'recipes.create': {
      const { input } = payload as { input: CreateRecipe }
      const created = expand(input, nextId++, CURRENT_USER_ID)
      mockData.recipes.push(created)
      return created
    }
    case 'recipes.update': {
      const { input } = payload as { input: CreateRecipe }
      const index = mockData.recipes.findIndex((r) => r.id === id)
      if (index === -1) throw new Error(`recipe ${id} not found`)
      const existing = mockData.recipes[index]
      const updated = expand(input, existing.id, existing.owner)
      updated.editors = existing.editors
      updated.viewers = existing.viewers
      updated.rating = existing.rating
      mockData.recipes[index] = updated
      return updated
    }
    case 'ratings.set': {
      const { rating } = payload as { rating: number }
      const recipe = mockData.recipes.find((r) => r.id === id)
      if (!recipe) throw new Error(`recipe ${id} not found`)
      assertRating(rating)
      recipe.rating = [...recipe.rating.filter((r) => r.user !== CURRENT_USER_ID), { user: CURRENT_USER_ID, rating }]
      // A fresh object: callers hold the stored one, and React skips identical state.
      return { ...recipe }
    }
    case 'ratings.clear': {
      const recipe = mockData.recipes.find((r) => r.id === id)
      if (!recipe) throw new Error(`recipe ${id} not found`)
      recipe.rating = recipe.rating.filter((r) => r.user !== CURRENT_USER_ID)
      return { ...recipe }
    }
    case 'images.upload': {
      return imageRef(nextId++)
    }
    default:
      throw new Error(`[mock] no handler for message type "${type}"`)
  }
}
