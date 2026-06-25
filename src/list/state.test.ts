import { DEFAULT_STATE, isFilterActive, clearedState } from './state';

describe('list state helpers', () => {
  it('DEFAULT_STATE has no active filters', () => {
    expect(isFilterActive(DEFAULT_STATE)).toBe(false);
  });
  it('detects an active facet', () => {
    expect(isFilterActive({ ...DEFAULT_STATE, tags: ['Vegan'] })).toBe(true);
    expect(isFilterActive({ ...DEFAULT_STATE, search: 'apf' })).toBe(true);
    expect(isFilterActive({ ...DEFAULT_STATE, role: 'owner' })).toBe(true);
    expect(isFilterActive({ ...DEFAULT_STATE, durationMax: 30 })).toBe(true);
  });
  it('sort/view changes are not "filters"', () => {
    expect(isFilterActive({ ...DEFAULT_STATE, sortKey: 'rating', detail: 'compact' })).toBe(false);
  });
  it('clearedState keeps sort + view, drops filters', () => {
    const dirty = { ...DEFAULT_STATE, tags: ['X'], search: 'y', sortKey: 'rating' as const, group: 'by-category' as const };
    const out = clearedState(dirty);
    expect(out.tags).toEqual([]);
    expect(out.search).toBe('');
    expect(out.sortKey).toBe('rating');
    expect(out.group).toBe('by-category');
  });
});
