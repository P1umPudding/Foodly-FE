import type { Recipe } from '../api/protocol';

// Lowercase + strip combining diacritics so "apfel" matches "Äpfel", "creme" matches "Crème".
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// OR over: recipe name, each section name, each tag. Deliberately NOT ingredient
// names (structured filter) or step text. Blank query matches all.
export function matchesSearch(recipe: Recipe, query: string): boolean {
  const q = normalizeText(query.trim());
  if (q === '') return true;
  const haystacks = [
    recipe.name,
    ...recipe.sections.map((s) => s.name ?? ''),
    ...recipe.tags,
  ];
  return haystacks.some((h) => normalizeText(h).includes(q));
}
