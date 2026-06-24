// Dev-only mock backend, lazy-loaded when VITE_MOCK=1 so it stays out of prod.

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

export const CURRENT_USER_ID = 1;

// Latency so loading states are actually visible in dev.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

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
