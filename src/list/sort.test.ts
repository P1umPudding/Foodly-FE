import { sortRecipes } from './sort';
import { DEFAULT_STATE } from './state';
import type { Recipe } from '../api/protocol';

const base: Recipe = {
  id: 0, owner: 1, editors: [], viewers: [], name: '', tags: [], source: null,
  rating: [], time: null, workMinutes: null, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [], sections: [],
};
const recipes: Recipe[] = [
  { ...base, id: 1, name: 'Banane', workMinutes: 30 },
  { ...base, id: 2, name: 'Apfel', workMinutes: null },
  { ...base, id: 3, name: 'Clementine', workMinutes: 10 },
];
const ids = (rs: Recipe[]) => rs.map((r) => r.id);

describe('sortRecipes', () => {
  it('name asc (default)', () => {
    expect(ids(sortRecipes(recipes, DEFAULT_STATE, 1))).toEqual([2, 1, 3]);
  });
  it('name desc', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortDir: 'desc' }, 1))).toEqual([3, 1, 2]);
  });
  it('work asc puts null last', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortKey: 'work', sortDir: 'asc' }, 1))).toEqual([3, 1, 2]);
  });
  it('work desc still puts null last', () => {
    expect(ids(sortRecipes(recipes, { ...DEFAULT_STATE, sortKey: 'work', sortDir: 'desc' }, 1))).toEqual([1, 3, 2]);
  });
  it('does not mutate the input', () => {
    const copy = [...recipes];
    sortRecipes(recipes, DEFAULT_STATE, 1);
    expect(recipes).toEqual(copy);
  });
});
