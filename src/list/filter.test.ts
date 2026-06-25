import { filterRecipes } from './filter';
import { DEFAULT_STATE } from './state';
import type { Recipe, UserCategory } from '../api/protocol';

const base: Recipe = {
  id: 0, owner: 1, editors: [], viewers: [], name: 'R', tags: [], source: null,
  rating: [], time: null, workMinutes: null, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [],
  sections: [{ id: 1, name: null, ingredients: [], steps: [] }],
};
const withIng = (ids: number[]): Recipe['sections'] => [{
  id: 1, name: null, steps: [],
  ingredients: ids.map((id, i) => ({ id: 100 + i, ingredient: { id, name: `i${id}` }, text: null, amount: null, amountPrefix: null, unit: null })),
}];
const recipes: Recipe[] = [
  { ...base, id: 1, tags: ['Vegan', 'Schnell'], workMinutes: 10, sections: withIng([1, 2]) },
  { ...base, id: 2, tags: ['Vegan'], workMinutes: 40, sections: withIng([2]) },
  { ...base, id: 3, owner: 2, viewers: [1], tags: ['Schnell'], workMinutes: 20, sections: withIng([3]) },
  { ...base, id: 4, owner: 2, editors: [1], tags: [], workMinutes: null, sections: withIng([1]) },
];
const cats: UserCategory[] = [
  { id: 10, user: 1, name: 'A', recipes: [1, 2], order: 0, color: '#000', colorLight: null, colorDark: null },
  { id: 11, user: 1, name: 'B', recipes: [3], order: 1, color: '#000', colorLight: null, colorDark: null },
];
const ids = (rs: Recipe[]) => rs.map((r) => r.id).sort((a, b) => a - b);

describe('filterRecipes', () => {
  it('no filters → all', () => {
    expect(ids(filterRecipes(recipes, DEFAULT_STATE, 1, cats))).toEqual([1, 2, 3, 4]);
  });
  it('categories OR', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, categories: [10, 11] }, 1, cats))).toEqual([1, 2, 3]);
  });
  it('tags AND', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, tags: ['Vegan', 'Schnell'] }, 1, cats))).toEqual([1]);
  });
  it('ingredients AND', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, ingredients: [1, 2] }, 1, cats))).toEqual([1]);
  });
  it('duration max on workMinutes excludes null and > max', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, durationMax: 20 }, 1, cats))).toEqual([1, 3]);
  });
  it('role filter: editor', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, role: 'editor' }, 1, cats))).toEqual([4]);
  });
  it('collab filter: collaborative', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, collab: 'collaborative' }, 1, cats))).toEqual([4]);
  });
  it('facets AND together', () => {
    expect(ids(filterRecipes(recipes, { ...DEFAULT_STATE, tags: ['Vegan'], durationMax: 15 }, 1, cats))).toEqual([1]);
  });
});
