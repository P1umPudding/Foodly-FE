// Dev-only mock backend. Loaded lazily by `src/api/index.ts` when VITE_MOCK=1,
// so none of this (including the JSON fixtures) ends up in a production build.
//
// `mockRequest(type, payload)` mirrors what the real socket would answer for a
// given message `type`; extend the switch as the protocol grows.

import type {
  Ingredient,
  Recipe,
  Tag,
  User,
  UserCategory,
} from '../api/protocol';

import recipes from './data/recipes.json';
import users from './data/users.json';
import tags from './data/tags.json';
import ingredients from './data/ingredients.json';
import categories from './data/categories.json';

export const mockData = {
  recipes: recipes as Recipe[],
  users: users as User[],
  tags: tags as Tag[],
  ingredients: ingredients as Ingredient[],
  categories: categories as UserCategory[],
};

/** The "logged-in" user while mocking. */
export const CURRENT_USER_ID = 1;

/** Simulate a little network latency so loading states are visible. */
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Resolve a mock response for a backend message `type`, or reject like the real backend would. */
export async function mockRequest(type: string, payload?: unknown): Promise<unknown> {
  await delay();
  const id = (payload as { id?: number } | undefined)?.id;

  switch (type) {
    case 'recipes.list':
      return mockData.recipes;
    case 'recipes.get': {
      const recipe = mockData.recipes.find((r) => r.id === id);
      if (!recipe) throw new Error(`recipe ${id} not found`);
      return recipe;
    }
    case 'categories.list':
      return mockData.categories;
    case 'tags.list':
      return mockData.tags;
    case 'ingredients.list':
      return mockData.ingredients;
    case 'users.list':
      return mockData.users;
    case 'me':
      return mockData.users.find((u) => u.id === CURRENT_USER_ID) ?? null;
    default:
      throw new Error(`[mock] no handler for message type "${type}"`);
  }
}
