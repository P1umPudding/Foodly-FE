// Sample comments for the mock, written into the shared stub storage the first time a recipe's comments are read.
// Authors can all see their recipe (mocks/data/recipes.json).
import type { RecipeComment } from '../api/comments'

export const SEED_COMMENTS: Record<number, Omit<RecipeComment, 'id'>[]> = {
  1: [{ user: 2, createdAt: '2026-11-20T18:30:00.000Z', text: 'Mit Räuchertofu noch besser!' }],
  2: [{ user: 3, createdAt: '2026-11-22T15:05:00.000Z', text: 'Bei mir 5 Minuten länger im Ofen, dann perfekt.' }],
  3: [
    { user: 2, createdAt: '2026-11-24T09:12:00.000Z', text: 'Tipp: Teig 30 Minuten ruhen lassen.' },
    { user: 1, createdAt: '2026-11-25T08:00:00.000Z', text: 'Danke, probiere ich am Wochenende.' },
  ],
}
