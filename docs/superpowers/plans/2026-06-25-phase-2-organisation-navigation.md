# Phase 2 — Organisation & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat Phase-1 recipe list into an organised, navigable surface — category sidebar, tag/ingredient/duration/role filters, full-text search, sorting, list-view toggles — with collaboration-aware ratings and an at-a-glance role/collaboration indicator per row, all client-side over the loaded recipes, with filter state in the URL and personal defaults in localStorage.

**Architecture:** A pure, framework-free core (`src/list/` + additions to `src/api/views.ts`) does all derivation: role/collaboration from a recipe, facet predicates, sorting, search normalisation, faceted counts, and URL⇄localStorage serialisation. A single `useListState` hook owns the live state (URL is the shareable truth; localStorage restores the last session). The `CatalogProvider` gains an ingredient catalog. UI components (sidebar, filter controls, row indicator) are thin shells over that core, built with `@postxl/ui-components`.

**Tech Stack:** React 18 + TypeScript (strict), React Router 6 (`useSearchParams`), Vite 7, Tailwind v4, `@postxl/ui-components`, `lucide-react`. Tests: Vitest + jsdom + `@testing-library/react` (added in Task 0).

## Global Constraints

- **Backend access only through `src/api`** (the shared `socket` / `foodly.*`). Never open ad-hoc WebSocket/fetch in components. (CLAUDE.md)
- **All interactive UI via `@postxl/ui-components`** (`Button`, `Badge`, `Input`, `Checkbox`, `Select`, `Popover`, `Separator`, `Card`, `Tooltip`, …). Never hand-roll raw `<button>`/`<input>`. Style via `variant`/`size` props; Tailwind only for spacing/layout. **No inline styles.** (CLAUDE.md)
- **Tailwind-first**: arbitrary values (`w-[37px]`, `bg-[#10b981]`) over new CSS. New CSS rules only when Tailwind genuinely can't express it. (CLAUDE.md)
- **Icons from `lucide-react`** (transitive dep of `@postxl/ui-components`).
- **Do NOT add a `Co-Authored-By` trailer** to commits. **Never push** unless the user says so in that request. (CLAUDE.md)
- **`@playwright/test` must never land in `package.json`.** (CLAUDE.md) Visual checks use the Chrome MCP server.
- **Current user is mocked**: `CURRENT_USER_ID` comes from `foodly.me()` via `useCurrentUserId()` (value `1` = Kolja in mocks). No auth.
- **Dev/test data**: run with `VITE_MOCK=1`. Mocks already cover all 6 valid role×collaboration cells (recipes 1–14) and 4 categories with multi-membership + uncategorised recipes.
- **Branch**: work on `phase-2-organisation-navigation` (already created off `phase-1-rezepte-ansehen`; has the Phase-1 app + 14 mock recipes + this spec). Do not branch from `main`.
- **Spec**: `docs/phases/phase-2-organisation-navigation.md` is the source of truth for behaviour. Visual layout (sidebar placement, filter-bar arrangement, compact-row anatomy, exact icons) is the deliberately-tunable surface; the UI tasks below give a working baseline consistent with Phase 1 — refine arrangement without changing tested interfaces/behaviour.

---

## File Structure

**Pure core (no React):**
- `src/api/views.ts` *(modify)* — add `roleOf`, `myRole`, `collaborationState`, `visibleRating`; refactor `ratingsByRole` to reuse `roleOf`.
- `src/list/state.ts` *(create)* — `ListState` type, the facet/sort/view enums, `DEFAULT_STATE`, `isFilterActive`, `clearedState`.
- `src/list/search.ts` *(create)* — `normalizeText`, `matchesSearch`.
- `src/list/filter.ts` *(create)* — facet predicates + `filterRecipes`.
- `src/list/sort.ts` *(create)* — `sortRecipes`.
- `src/list/counts.ts` *(create)* — `roleGridCounts`, `usedIngredients`.
- `src/list/url.ts` *(create)* — `toSearchParams`, `fromSearchParams`.
- `src/list/persistence.ts` *(create)* — `loadPersisted`, `savePersisted` (versioned, keyed by user, excludes search).

**State hook (React):**
- `src/list/useListState.ts` *(create)* — ties URL ⇄ localStorage ⇄ state; exposes `{ state, set, clear }`.

**Catalog (React):**
- `src/catalog/CatalogProvider.tsx` *(modify)* — load ingredient catalog; add `useIngredients`/`useIngredient`.

**UI (React):**
- `src/components/recipe/RoleCollabIndicator.tsx` *(create)* — two-glyph role+collaboration indicator.
- `src/components/recipe/Rating.tsx` *(modify)* — collaboration-aware visibility.
- `src/components/recipe/RecipeRow.tsx` *(modify)* — `visibleRating`, indicator, compact variant.
- `src/components/list/CategorySidebar.tsx` *(create)* — multi-select OR categories + static counts.
- `src/components/list/FilterControls.tsx` *(create)* — search, tags, ingredients, duration, role grid, sort, view toggles.
- `src/components/list/RecipeListView.tsx` *(create)* — renders flat or by-category grouping over the result set.
- `src/pages/RecipeList.tsx` *(modify)* — wire everything together; empty/reset states.

**Test infra:**
- `vite.config.ts` *(modify)* — add Vitest `test` block.
- `tsconfig.json` *(modify)* — exclude test files from the build typecheck.
- `package.json` *(modify, via npm)* — add devDeps + `test` script.

---

## Task 0: Test infrastructure (Vitest + jsdom + Testing Library)

**Files:**
- Modify: `package.json` (scripts + devDeps via npm)
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `src/list/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` (Vitest, jsdom env) that all later tasks rely on. Test files are excluded from the `tsc` build.

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm install -D vitest@^3 jsdom @testing-library/react@^16 @testing-library/dom@^10
```
Expected: installs without touching `dependencies`; no `@playwright/*`. (`@testing-library/dom` is a required peer of `@testing-library/react` v16; Vitest 3 matches Vite 7. If npm reports an ERESOLVE peer conflict with Vite, re-run with `--legacy-peer-deps` — these are dev-only.)

- [ ] **Step 2: Add the Vitest config to `vite.config.ts`**

Replace the file with:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

In `"scripts"`, add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Exclude test files from the build typecheck in `tsconfig.json`**

Add a top-level `"exclude"` (sibling of `"include"`):
```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
```
Rationale: `npm run build` runs `tsc` over `src`; without this it would typecheck (and could fail on) test files. Vitest transpiles tests itself.

- [ ] **Step 5: Add `vitest/globals` to TS types so `describe/it/expect` resolve**

In `tsconfig.json` `compilerOptions.types`, change `["vite/client"]` to `["vite/client", "vitest/globals"]`.

- [ ] **Step 6: Write a smoke test**

`src/list/smoke.test.ts`:
```ts
describe('test infra', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test suite and the build**

Run: `npm test`
Expected: 1 passing test.
Run: `npm run build`
Expected: builds clean (tsc ignores `*.test.ts`).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json src/list/smoke.test.ts
git commit -m "test: add vitest + jsdom + testing-library, exclude tests from build"
```

---

## Task 1: Role & collaboration derivation (`views.ts`)

**Files:**
- Modify: `src/api/views.ts`
- Test: `src/api/views.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `UserId` from `protocol.ts`.
- Produces:
  - `type Role = 'owner' | 'editor' | 'viewer' | 'other'`
  - `roleOf(recipe: Recipe, user: UserId): Role`
  - `myRole(recipe: Recipe, currentUserId: UserId | null): Role` (`'other'` when `null`)
  - `type Collaboration = 'private' | 'shared' | 'collaborative'`
  - `collaborationState(recipe: Recipe): Collaboration`
  - `ratingsByRole` keeps its existing signature but now reuses `roleOf`.

- [ ] **Step 1: Write the failing test**

`src/api/views.test.ts`:
```ts
import { roleOf, myRole, collaborationState } from './views';
import type { Recipe } from './protocol';

const base: Recipe = {
  id: 1, owner: 1, editors: [], viewers: [], name: 'X', tags: [], source: null,
  rating: [], time: null, workMinutes: null, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [], sections: [],
};
const r = (over: Partial<Recipe>): Recipe => ({ ...base, ...over });

describe('roleOf / myRole', () => {
  it('classifies owner, editor, viewer, other', () => {
    const rec = r({ owner: 1, editors: [2], viewers: [3] });
    expect(roleOf(rec, 1)).toBe('owner');
    expect(roleOf(rec, 2)).toBe('editor');
    expect(roleOf(rec, 3)).toBe('viewer');
    expect(roleOf(rec, 9)).toBe('other');
  });
  it('owner wins over editor/viewer membership', () => {
    expect(roleOf(r({ owner: 1, editors: [1], viewers: [1] }), 1)).toBe('owner');
  });
  it('myRole returns other for null user', () => {
    expect(myRole(r({ owner: 1 }), null)).toBe('other');
  });
});

describe('collaborationState', () => {
  it('private when no viewers and no editors', () => {
    expect(collaborationState(r({ viewers: [], editors: [] }))).toBe('private');
  });
  it('shared when viewers but no editors', () => {
    expect(collaborationState(r({ viewers: [2], editors: [] }))).toBe('shared');
  });
  it('collaborative when any editor', () => {
    expect(collaborationState(r({ viewers: [], editors: [2] }))).toBe('collaborative');
    expect(collaborationState(r({ viewers: [3], editors: [2] }))).toBe('collaborative');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- views`
Expected: FAIL — `roleOf`/`myRole`/`collaborationState` not exported.

- [ ] **Step 3: Implement in `views.ts`**

Add near the top (after imports) and refactor `ratingsByRole`:
```ts
export type Role = 'owner' | 'editor' | 'viewer' | 'other';

export function roleOf(recipe: Recipe, user: UserId): Role {
  return user === recipe.owner ? 'owner'
    : recipe.editors.includes(user) ? 'editor'
      : recipe.viewers.includes(user) ? 'viewer'
        : 'other';
}

export function myRole(recipe: Recipe, currentUserId: UserId | null): Role {
  return currentUserId === null ? 'other' : roleOf(recipe, currentUserId);
}

export type Collaboration = 'private' | 'shared' | 'collaborative';

export function collaborationState(recipe: Recipe): Collaboration {
  if (recipe.editors.length > 0) return 'collaborative';
  if (recipe.viewers.length > 0) return 'shared';
  return 'private';
}
```
Then update `ratingsByRole` to drop its local `roleOf` arrow and call the shared one. `RatedRole` already equals `Role`; replace the `RatedRole` type alias with `Role` (keep a `export type RatedRole = Role;` alias so `Rating.tsx`'s import keeps working) and `ROLE_ORDER` keyed by `Role`:
```ts
export type RatedRole = Role; // back-compat alias for existing imports

const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1, viewer: 2, other: 3 };

export function ratingsByRole(
  recipe: Recipe,
): { user: UserId; rating: number; role: Role }[] {
  return recipe.rating
    .map((rt) => ({ user: rt.user, rating: rt.rating, role: roleOf(recipe, rt.user) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rating - a.rating);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- views`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/views.ts src/api/views.test.ts
git commit -m "feat(views): add roleOf/myRole/collaborationState, reuse in ratingsByRole"
```

---

## Task 2: Collaboration-aware visible rating (`views.ts`)

**Files:**
- Modify: `src/api/views.ts`
- Test: `src/api/views.test.ts`

**Interfaces:**
- Consumes: `averageRating`, `collaborationState` (Task 1).
- Produces: `visibleRating(recipe: Recipe, currentUserId: UserId | null): number | null`
  - Private/Shared → the current user's own rating, else `null`.
  - Collaborative → `averageRating(recipe)`.

- [ ] **Step 1: Write the failing test (append to `views.test.ts`)**

```ts
import { visibleRating } from './views';

describe('visibleRating', () => {
  it('private/shared: shows only the current user own rating', () => {
    const shared = r({ owner: 1, viewers: [2], editors: [],
      rating: [{ user: 1, rating: 5 }, { user: 2, rating: 1 }] });
    expect(visibleRating(shared, 1)).toBe(5); // own, not the average
    const noOwn = r({ owner: 2, viewers: [1], editors: [],
      rating: [{ user: 2, rating: 4 }] });
    expect(visibleRating(noOwn, 1)).toBeNull(); // I have not rated
  });
  it('collaborative: shows the pooled average', () => {
    const collab = r({ owner: 1, editors: [2], viewers: [],
      rating: [{ user: 1, rating: 5 }, { user: 2, rating: 3 }] });
    expect(visibleRating(collab, 1)).toBe(4);
  });
  it('null current user: private/shared yields null', () => {
    const shared = r({ owner: 1, viewers: [2], rating: [{ user: 1, rating: 5 }] });
    expect(visibleRating(shared, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- views`
Expected: FAIL — `visibleRating` not exported.

- [ ] **Step 3: Implement in `views.ts`**

```ts
export function visibleRating(recipe: Recipe, currentUserId: UserId | null): number | null {
  if (collaborationState(recipe) === 'collaborative') return averageRating(recipe);
  if (currentUserId === null) return null;
  const own = recipe.rating.find((rt) => rt.user === currentUserId);
  return own ? own.rating : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- views`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/views.ts src/api/views.test.ts
git commit -m "feat(views): add collaboration-aware visibleRating"
```

---

## Task 3: List state type & helpers (`list/state.ts`)

**Files:**
- Create: `src/list/state.ts`
- Test: `src/list/state.test.ts`

**Interfaces:**
- Produces:
  - `type RoleFilter = 'any' | 'owner' | 'editor' | 'viewer'`
  - `type CollabFilter = 'any' | 'private' | 'shared' | 'collaborative'`
  - `type SortKey = 'name' | 'work' | 'overall' | 'rating'`
  - `type SortDir = 'asc' | 'desc'`
  - `type DetailView = 'detailed' | 'compact'`
  - `type GroupView = 'flat' | 'by-category'`
  - `interface ListState { categories: number[]; tags: string[]; ingredients: number[]; durationMax: number | null; durationField: 'work' | 'overall'; role: RoleFilter; collab: CollabFilter; search: string; sortKey: SortKey; sortDir: SortDir; detail: DetailView; group: GroupView; }`
  - `const DEFAULT_STATE: ListState`
  - `isFilterActive(state: ListState): boolean` — true if any *filter/search* facet is non-default (ignores sort + view).
  - `clearedState(state: ListState): ListState` — resets filters + search, keeps sort + view.

- [ ] **Step 1: Write the failing test**

`src/list/state.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- state`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/state.ts`**

```ts
// The full filter/search/sort/view state of the recipe list. One object, mirrored
// to the URL (shareable) and localStorage (personal defaults) — see url.ts / persistence.ts.

export type RoleFilter = 'any' | 'owner' | 'editor' | 'viewer';
export type CollabFilter = 'any' | 'private' | 'shared' | 'collaborative';
export type SortKey = 'name' | 'work' | 'overall' | 'rating';
export type SortDir = 'asc' | 'desc';
export type DetailView = 'detailed' | 'compact';
export type GroupView = 'flat' | 'by-category';

export interface ListState {
  categories: number[];   // OR within this facet
  tags: string[];         // AND
  ingredients: number[];  // AND (ingredient ids)
  durationMax: number | null;
  durationField: 'work' | 'overall';
  role: RoleFilter;
  collab: CollabFilter;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
  detail: DetailView;
  group: GroupView;
}

export const DEFAULT_STATE: ListState = {
  categories: [], tags: [], ingredients: [],
  durationMax: null, durationField: 'work',
  role: 'any', collab: 'any',
  search: '',
  sortKey: 'name', sortDir: 'asc',
  detail: 'detailed', group: 'flat',
};

export function isFilterActive(s: ListState): boolean {
  return (
    s.categories.length > 0 ||
    s.tags.length > 0 ||
    s.ingredients.length > 0 ||
    s.durationMax !== null ||
    s.role !== 'any' ||
    s.collab !== 'any' ||
    s.search.trim() !== ''
  );
}

export function clearedState(s: ListState): ListState {
  return {
    ...s,
    categories: [], tags: [], ingredients: [],
    durationMax: null, durationField: 'work',
    role: 'any', collab: 'any',
    search: '',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/state.ts src/list/state.test.ts
git commit -m "feat(list): add ListState type, defaults, isFilterActive/clearedState"
```

---

## Task 4: Search normalisation & matching (`list/search.ts`)

**Files:**
- Create: `src/list/search.ts`
- Test: `src/list/search.test.ts`

**Interfaces:**
- Consumes: `Recipe` from `protocol.ts`.
- Produces:
  - `normalizeText(s: string): string` — lowercase + strip diacritics.
  - `matchesSearch(recipe: Recipe, query: string): boolean` — substring over `recipe.name` + each `Section.name` + each `recipe.tags` entry; empty/blank query → `true`.

- [ ] **Step 1: Write the failing test**

`src/list/search.test.ts`:
```ts
import { normalizeText, matchesSearch } from './search';
import type { Recipe } from '../api/protocol';

const base: Recipe = {
  id: 1, owner: 1, editors: [], viewers: [], name: 'Gedeckter Apfelkuchen',
  tags: ['Backen', 'Dessert'], source: null, rating: [], time: null,
  workMinutes: null, overallMinutes: null, amount: null, basePortionMultiplier: null,
  notes: ['Crème fraîche dazu'], mainImage: null, images: [],
  sections: [{ id: 1, name: 'Mürbeteig', ingredients: [], steps: ['Mehl mischen'] }],
};

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Crème Brûlée')).toBe('creme brulee');
    expect(normalizeText('Über GRÜN')).toBe('uber grun');
  });
});

describe('matchesSearch', () => {
  it('blank query matches everything', () => {
    expect(matchesSearch(base, '')).toBe(true);
    expect(matchesSearch(base, '   ')).toBe(true);
  });
  it('matches recipe name, case/diacritic-insensitive substring', () => {
    expect(matchesSearch(base, 'apfel')).toBe(true);
    expect(matchesSearch(base, 'APFELKUCHEN')).toBe(true);
  });
  it('matches a section name', () => {
    expect(matchesSearch(base, 'murbe')).toBe(true);
  });
  it('matches a tag name', () => {
    expect(matchesSearch(base, 'dessert')).toBe(true);
  });
  it('does NOT match step text or notes', () => {
    expect(matchesSearch(base, 'mehl')).toBe(false);
    expect(matchesSearch(base, 'fraiche')).toBe(false);
  });
});
```
- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- search`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/search.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- search`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/search.ts src/list/search.test.ts
git commit -m "feat(list): add diacritic-insensitive search over name/section/tags"
```

---

## Task 5: Facet predicates & `filterRecipes` (`list/filter.ts`)

**Files:**
- Create: `src/list/filter.ts`
- Test: `src/list/filter.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `UserId`, `UserCategory` (`protocol.ts`); `ListState` (Task 3); `roleOf`, `collaborationState` (Task 1); `matchesSearch` (Task 4).
- Produces: `filterRecipes(recipes: Recipe[], state: ListState, currentUserId: UserId | null, categories: UserCategory[]): Recipe[]`
  - Categories: OR (recipe id in **any** selected category's `recipes`).
  - Tags: AND. Ingredients: AND (over `ingredient.id`). Duration: `≤ durationMax` on the chosen field; `null` field excluded. Role/collab: equality unless `'any'`. Search: `matchesSearch`.
  - Facets AND together.

- [ ] **Step 1: Write the failing test**

`src/list/filter.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- filter`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/filter.ts`**

```ts
import type { Recipe, UserId, UserCategory } from '../api/protocol';
import type { ListState } from './state';
import { roleOf, collaborationState } from '../api/views';
import { matchesSearch } from './search';

function inSelectedCategory(recipe: Recipe, selected: number[], categories: UserCategory[]): boolean {
  if (selected.length === 0) return true; // facet inactive
  return categories.some((c) => selected.includes(c.id) && c.recipes.includes(recipe.id));
}

function hasAllTags(recipe: Recipe, tags: string[]): boolean {
  return tags.every((t) => recipe.tags.includes(t));
}

function recipeIngredientIds(recipe: Recipe): Set<number> {
  const out = new Set<number>();
  for (const s of recipe.sections) for (const i of s.ingredients) if (i.ingredient) out.add(i.ingredient.id);
  return out;
}

function hasAllIngredients(recipe: Recipe, ingredients: number[]): boolean {
  if (ingredients.length === 0) return true;
  const have = recipeIngredientIds(recipe);
  return ingredients.every((id) => have.has(id));
}

function withinDuration(recipe: Recipe, max: number | null, field: 'work' | 'overall'): boolean {
  if (max === null) return true;
  const mins = field === 'work' ? recipe.workMinutes : recipe.overallMinutes;
  return mins !== null && mins <= max; // unknown (null) is excluded
}

export function filterRecipes(
  recipes: Recipe[],
  state: ListState,
  currentUserId: UserId | null,
  categories: UserCategory[],
): Recipe[] {
  return recipes.filter((recipe) =>
    inSelectedCategory(recipe, state.categories, categories) &&
    hasAllTags(recipe, state.tags) &&
    hasAllIngredients(recipe, state.ingredients) &&
    withinDuration(recipe, state.durationMax, state.durationField) &&
    (state.role === 'any' || (currentUserId !== null && roleOf(recipe, currentUserId) === state.role)) &&
    (state.collab === 'any' || collaborationState(recipe) === state.collab) &&
    matchesSearch(recipe, state.search),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- filter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/filter.ts src/list/filter.test.ts
git commit -m "feat(list): add facet predicates and filterRecipes"
```

---

## Task 6: Sorting (`list/sort.ts`)

**Files:**
- Create: `src/list/sort.ts`
- Test: `src/list/sort.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `UserId`; `ListState`; `visibleRating` (Task 2).
- Produces: `sortRecipes(recipes: Recipe[], state: ListState, currentUserId: UserId | null): Recipe[]` — returns a new sorted array. `null` sort values always sort to the **end** regardless of direction. Rating uses `visibleRating`.

- [ ] **Step 1: Write the failing test**

`src/list/sort.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sort`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/sort.ts`**

```ts
import type { Recipe, UserId } from '../api/protocol';
import type { ListState, SortKey } from './state';
import { visibleRating } from '../api/views';

// Numeric/string sort key; null = "unknown" and always sinks to the end.
function sortValue(recipe: Recipe, key: SortKey, currentUserId: UserId | null): number | string | null {
  switch (key) {
    case 'name': return recipe.name.toLowerCase();
    case 'work': return recipe.workMinutes;
    case 'overall': return recipe.overallMinutes;
    case 'rating': return visibleRating(recipe, currentUserId);
  }
}

export function sortRecipes(recipes: Recipe[], state: ListState, currentUserId: UserId | null): Recipe[] {
  const dir = state.sortDir === 'asc' ? 1 : -1;
  return [...recipes].sort((a, b) => {
    const va = sortValue(a, state.sortKey, currentUserId);
    const vb = sortValue(b, state.sortKey, currentUserId);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;   // nulls last, both directions
    if (vb === null) return -1;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sort`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/sort.ts src/list/sort.test.ts
git commit -m "feat(list): add sortRecipes with nulls-last and visibleRating"
```

---

## Task 7: Faceted role-grid counts & used ingredients (`list/counts.ts`)

**Files:**
- Create: `src/list/counts.ts`
- Test: `src/list/counts.test.ts`

**Interfaces:**
- Consumes: `Recipe`, `UserId`, `UserCategory`, `Ingredient`; `ListState`; `filterRecipes` (Task 5); `roleOf`, `collaborationState` (Task 1).
- Produces:
  - `roleCellKey(role: Role, collab: Collaboration): string` — `` `${role}|${collab}` ``.
  - `roleGridCounts(recipes, state, currentUserId, categories): Record<string, number>` — counts per role×collab cell, applying **all facets except role & collab** (standard faceted count). Keyed by `roleCellKey`.
  - `usedIngredients(recipes: Recipe[], ingredientsById: Record<number, Ingredient>): Ingredient[]` — catalog entries whose id appears in ≥1 recipe, sorted by name.

- [ ] **Step 1: Write the failing test**

`src/list/counts.test.ts`:
```ts
import { roleGridCounts, roleCellKey, usedIngredients } from './counts';
import { DEFAULT_STATE } from './state';
import type { Recipe, UserCategory, Ingredient } from '../api/protocol';

const base: Recipe = {
  id: 0, owner: 1, editors: [], viewers: [], name: 'R', tags: [], source: null,
  rating: [], time: null, workMinutes: 10, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [],
  sections: [{ id: 1, name: null, ingredients: [], steps: [] }],
};
const recipes: Recipe[] = [
  { ...base, id: 1, owner: 1, editors: [], viewers: [], tags: ['T'] },             // owner|private
  { ...base, id: 2, owner: 1, editors: [], viewers: [2], tags: ['T'] },            // owner|shared
  { ...base, id: 3, owner: 2, editors: [3], viewers: [1] },                        // viewer|collaborative
];
const cats: UserCategory[] = [];

describe('roleGridCounts', () => {
  it('counts cells with no role/collab filter active', () => {
    const c = roleGridCounts(recipes, DEFAULT_STATE, 1, cats);
    expect(c[roleCellKey('owner', 'private')]).toBe(1);
    expect(c[roleCellKey('owner', 'shared')]).toBe(1);
    expect(c[roleCellKey('viewer', 'collaborative')]).toBe(1);
    expect(c[roleCellKey('owner', 'collaborative')] ?? 0).toBe(0);
  });
  it('counts reflect OTHER facets but ignore role/collab selection', () => {
    const c = roleGridCounts(recipes, { ...DEFAULT_STATE, tags: ['T'], role: 'viewer' }, 1, cats);
    expect(c[roleCellKey('owner', 'private')]).toBe(1);   // tag T applied
    expect(c[roleCellKey('viewer', 'collaborative')] ?? 0).toBe(0); // recipe 3 lacks tag T
  });
});

describe('usedIngredients', () => {
  it('only ingredients present in recipes, sorted by catalog name', () => {
    const r: Recipe[] = [{ ...base, sections: [{ id: 1, name: null, steps: [],
      ingredients: [{ id: 1, ingredient: { id: 5, name: 'Zwiebel' }, text: null, amount: null, amountPrefix: null, unit: null }] }] }];
    const cat: Record<number, Ingredient> = { 5: { id: 5, name: 'Zwiebel' }, 9: { id: 9, name: 'Apfel' } };
    expect(usedIngredients(r, cat)).toEqual([{ id: 5, name: 'Zwiebel' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- counts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/counts.ts`**

```ts
import type { Recipe, UserId, UserCategory, Ingredient } from '../api/protocol';
import type { ListState } from './state';
import { roleOf, collaborationState, type Role, type Collaboration } from '../api/views';
import { filterRecipes } from './filter';

export function roleCellKey(role: Role, collab: Collaboration): string {
  return `${role}|${collab}`;
}

// Faceted: apply every facet EXCEPT the role/collab axes, then bucket survivors
// into role×collab cells. Lets the UI show "0" for a valid-but-empty cell.
export function roleGridCounts(
  recipes: Recipe[],
  state: ListState,
  currentUserId: UserId | null,
  categories: UserCategory[],
): Record<string, number> {
  const withoutRoleCollab: ListState = { ...state, role: 'any', collab: 'any' };
  const survivors = filterRecipes(recipes, withoutRoleCollab, currentUserId, categories);
  const counts: Record<string, number> = {};
  for (const r of survivors) {
    if (currentUserId === null) continue;
    const key = roleCellKey(roleOf(r, currentUserId), collaborationState(r));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function usedIngredients(recipes: Recipe[], ingredientsById: Record<number, Ingredient>): Ingredient[] {
  const used = new Set<number>();
  for (const r of recipes) for (const s of r.sections) for (const i of s.ingredients) {
    if (i.ingredient) used.add(i.ingredient.id);
  }
  return [...used]
    .map((id) => ingredientsById[id])
    .filter((ing): ing is Ingredient => Boolean(ing))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- counts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/counts.ts src/list/counts.test.ts
git commit -m "feat(list): add faceted roleGridCounts and usedIngredients"
```

---

## Task 8: URL serialisation (`list/url.ts`)

**Files:**
- Create: `src/list/url.ts`
- Test: `src/list/url.test.ts`

**Interfaces:**
- Consumes: `ListState`, `DEFAULT_STATE`, enums (Task 3).
- Produces:
  - `toSearchParams(state: ListState): URLSearchParams` — only non-default keys are written (clean URLs).
  - `fromSearchParams(params: URLSearchParams): ListState` — missing/garbage keys fall back to `DEFAULT_STATE`.
  - Round-trip: `fromSearchParams(toSearchParams(s))` deep-equals `s` for any valid `s`.
- Key names: `cat`,`tag`,`ing` (repeatable), `dmax`,`dfield`,`role`,`collab`,`q`,`sort`,`dir`,`view`,`group`.

- [ ] **Step 1: Write the failing test**

`src/list/url.test.ts`:
```ts
import { toSearchParams, fromSearchParams } from './url';
import { DEFAULT_STATE } from './state';
import type { ListState } from './state';

describe('url serialisation', () => {
  it('default state → empty querystring', () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe('');
  });
  it('round-trips a fully-populated state', () => {
    const s: ListState = {
      categories: [2, 5], tags: ['Vegan', 'Schnell'], ingredients: [3, 9],
      durationMax: 30, durationField: 'overall', role: 'editor', collab: 'collaborative',
      search: 'apfel kuchen', sortKey: 'rating', sortDir: 'desc',
      detail: 'compact', group: 'by-category',
    };
    expect(fromSearchParams(toSearchParams(s))).toEqual(s);
  });
  it('ignores unknown/garbage values', () => {
    const p = new URLSearchParams('role=bogus&sort=nope&dmax=NaN');
    const out = fromSearchParams(p);
    expect(out.role).toBe('any');
    expect(out.sortKey).toBe('name');
    expect(out.durationMax).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- url`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/url.ts`**

```ts
import {
  DEFAULT_STATE, type ListState, type RoleFilter, type CollabFilter,
  type SortKey, type SortDir, type DetailView, type GroupView,
} from './state';

const ROLES: RoleFilter[] = ['any', 'owner', 'editor', 'viewer'];
const COLLABS: CollabFilter[] = ['any', 'private', 'shared', 'collaborative'];
const SORTS: SortKey[] = ['name', 'work', 'overall', 'rating'];
const DIRS: SortDir[] = ['asc', 'desc'];
const DETAILS: DetailView[] = ['detailed', 'compact'];
const GROUPS: GroupView[] = ['flat', 'by-category'];

const oneOf = <T extends string>(allowed: T[], raw: string | null, fallback: T): T =>
  (raw && (allowed as string[]).includes(raw) ? (raw as T) : fallback);

const nums = (params: URLSearchParams, key: string): number[] =>
  params.getAll(key).map(Number).filter((n) => Number.isInteger(n));

export function toSearchParams(state: ListState): URLSearchParams {
  const p = new URLSearchParams();
  for (const c of state.categories) p.append('cat', String(c));
  for (const t of state.tags) p.append('tag', t);
  for (const i of state.ingredients) p.append('ing', String(i));
  if (state.durationMax !== null) p.set('dmax', String(state.durationMax));
  if (state.durationField !== DEFAULT_STATE.durationField) p.set('dfield', state.durationField);
  if (state.role !== DEFAULT_STATE.role) p.set('role', state.role);
  if (state.collab !== DEFAULT_STATE.collab) p.set('collab', state.collab);
  if (state.search.trim() !== '') p.set('q', state.search);
  if (state.sortKey !== DEFAULT_STATE.sortKey) p.set('sort', state.sortKey);
  if (state.sortDir !== DEFAULT_STATE.sortDir) p.set('dir', state.sortDir);
  if (state.detail !== DEFAULT_STATE.detail) p.set('view', state.detail);
  if (state.group !== DEFAULT_STATE.group) p.set('group', state.group);
  return p;
}

export function fromSearchParams(p: URLSearchParams): ListState {
  const dmaxRaw = p.get('dmax');
  const dmax = dmaxRaw !== null && Number.isFinite(Number(dmaxRaw)) ? Number(dmaxRaw) : null;
  return {
    categories: nums(p, 'cat'),
    tags: p.getAll('tag'),
    ingredients: nums(p, 'ing'),
    durationMax: dmax,
    durationField: oneOf(['work', 'overall'], p.get('dfield'), DEFAULT_STATE.durationField),
    role: oneOf(ROLES, p.get('role'), DEFAULT_STATE.role),
    collab: oneOf(COLLABS, p.get('collab'), DEFAULT_STATE.collab),
    search: p.get('q') ?? '',
    sortKey: oneOf(SORTS, p.get('sort'), DEFAULT_STATE.sortKey),
    sortDir: oneOf(DIRS, p.get('dir'), DEFAULT_STATE.sortDir),
    detail: oneOf(DETAILS, p.get('view'), DEFAULT_STATE.detail),
    group: oneOf(GROUPS, p.get('group'), DEFAULT_STATE.group),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- url`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/url.ts src/list/url.test.ts
git commit -m "feat(list): add URL <-> ListState serialisation"
```

---

## Task 9: localStorage persistence (`list/persistence.ts`)

**Files:**
- Create: `src/list/persistence.ts`
- Test: `src/list/persistence.test.ts`

**Interfaces:**
- Consumes: `ListState`, `DEFAULT_STATE` (Task 3); `UserId`.
- Produces:
  - `loadPersisted(userId: UserId | null): Partial<ListState> | null` — reads `foodly:list-state:<userId>`; on missing/parse-error/version-mismatch returns `null`.
  - `savePersisted(userId: UserId | null, state: ListState): void` — writes everything **except `search`** (search never persists), with a schema `version`.
- Storage key: `` `foodly:list-state:${userId ?? 'anon'}` ``. Schema `version: 1`.

- [ ] **Step 1: Write the failing test**

`src/list/persistence.test.ts`:
```ts
import { loadPersisted, savePersisted } from './persistence';
import { DEFAULT_STATE } from './state';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('round-trips everything except search', () => {
    savePersisted(1, { ...DEFAULT_STATE, tags: ['Vegan'], search: 'secret', detail: 'compact' });
    const loaded = loadPersisted(1);
    expect(loaded?.tags).toEqual(['Vegan']);
    expect(loaded?.detail).toBe('compact');
    expect('search' in (loaded ?? {})).toBe(false);
  });
  it('returns null when nothing stored', () => {
    expect(loadPersisted(1)).toBeNull();
  });
  it('namespaces by user', () => {
    savePersisted(1, { ...DEFAULT_STATE, tags: ['A'] });
    expect(loadPersisted(2)).toBeNull();
  });
  it('discards a version mismatch', () => {
    localStorage.setItem('foodly:list-state:1', JSON.stringify({ version: 99, state: { tags: ['X'] } }));
    expect(loadPersisted(1)).toBeNull();
  });
  it('discards unparseable data', () => {
    localStorage.setItem('foodly:list-state:1', '{not json');
    expect(loadPersisted(1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- persistence`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/persistence.ts`**

```ts
import type { UserId } from '../api/protocol';
import type { ListState } from './state';

const VERSION = 1;
const keyFor = (userId: UserId | null) => `foodly:list-state:${userId ?? 'anon'}`;

// search is deliberately never persisted (it starts empty on each open).
type Persisted = Omit<ListState, 'search'>;

export function loadPersisted(userId: UserId | null): Partial<ListState> | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; state?: Persisted };
    if (parsed.version !== VERSION || !parsed.state) return null;
    return parsed.state;
  } catch {
    return null; // corrupt/unavailable storage → fall back to defaults
  }
}

export function savePersisted(userId: UserId | null, state: ListState): void {
  try {
    const { search: _search, ...rest } = state;
    localStorage.setItem(keyFor(userId), JSON.stringify({ version: VERSION, state: rest }));
  } catch {
    // storage full/blocked → silently skip; persistence is best-effort
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- persistence`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/persistence.ts src/list/persistence.test.ts
git commit -m "feat(list): add versioned, per-user localStorage persistence (excl. search)"
```

---

## Task 10: `useListState` hook (URL ⇄ localStorage ⇄ state)

**Files:**
- Create: `src/list/useListState.ts`
- Test: `src/list/useListState.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams` (react-router), `useCurrentUserId` (CatalogProvider), `fromSearchParams`/`toSearchParams` (Task 8), `loadPersisted`/`savePersisted` (Task 9), `DEFAULT_STATE`, `clearedState`.
- Produces: `useListState(): { state: ListState; set: (patch: Partial<ListState>) => void; clear: () => void }`
  - **Mount precedence:** if the URL has any of our params → URL wins (and is persisted). If the URL is bare → hydrate from `loadPersisted` merged over `DEFAULT_STATE`, and reflect into the URL (replace, no history entry).
  - `set` merges a patch, writes URL (push) + persists. `clear` = `clearedState`.

- [ ] **Step 1: Write the failing test**

`src/list/useListState.test.tsx`:
```tsx
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useListState } from './useListState';

// Stub the catalog hook so the test needs no provider.
vi.mock('../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }));

const wrapper = (initialEntries: string[]) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );

beforeEach(() => localStorage.clear());

describe('useListState', () => {
  it('reads initial state from the URL', () => {
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/?tag=Vegan&sort=rating']) });
    expect(result.current.state.tags).toEqual(['Vegan']);
    expect(result.current.state.sortKey).toBe('rating');
  });

  it('set() updates state and persists', () => {
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/']) });
    act(() => result.current.set({ tags: ['Schnell'] }));
    expect(result.current.state.tags).toEqual(['Schnell']);
    expect(localStorage.getItem('foodly:list-state:1')).toContain('Schnell');
  });

  it('hydrates from localStorage when the URL is bare', () => {
    localStorage.setItem('foodly:list-state:1', JSON.stringify({ version: 1, state: { detail: 'compact' } }));
    const { result } = renderHook(() => useListState(), { wrapper: wrapper(['/']) });
    expect(result.current.state.detail).toBe('compact');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useListState`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/list/useListState.ts`**

```ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUserId } from '../catalog/CatalogProvider';
import { DEFAULT_STATE, clearedState, type ListState } from './state';
import { fromSearchParams, toSearchParams } from './url';
import { loadPersisted, savePersisted } from './persistence';

const OUR_KEYS = ['cat', 'tag', 'ing', 'dmax', 'dfield', 'role', 'collab', 'q', 'sort', 'dir', 'view', 'group'];

export function useListState(): { state: ListState; set: (patch: Partial<ListState>) => void; clear: () => void } {
  const [params, setParams] = useSearchParams();
  const currentUserId = useCurrentUserId();
  const hydrated = useRef(false);

  const urlHasOurParams = useMemo(() => OUR_KEYS.some((k) => params.has(k)), [params]);

  const state = useMemo<ListState>(() => fromSearchParams(params), [params]);

  // One-time hydration: bare URL → restore personal defaults from localStorage,
  // reflect them into the URL (replace = no history entry). URL params win if present.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (urlHasOurParams) {
      savePersisted(currentUserId, state);
      return;
    }
    const persisted = loadPersisted(currentUserId);
    if (persisted) {
      const restored = { ...DEFAULT_STATE, ...persisted, search: '' };
      setParams(toSearchParams(restored), { replace: true });
    }
  }, [urlHasOurParams, state, currentUserId, setParams]);

  const set = useCallback((patch: Partial<ListState>) => {
    const next = { ...fromSearchParams(params), ...patch };
    savePersisted(currentUserId, next);
    setParams(toSearchParams(next));
  }, [params, currentUserId, setParams]);

  const clear = useCallback(() => set(clearedState(fromSearchParams(params))), [params, set]);

  return { state, set, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useListState`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/list/useListState.ts src/list/useListState.test.tsx
git commit -m "feat(list): add useListState hook (URL wins, localStorage hydrates)"
```

---

## Task 11: Ingredient catalog in `CatalogProvider`

**Files:**
- Modify: `src/catalog/CatalogProvider.tsx`
- Test: `src/catalog/CatalogProvider.test.tsx`

**Interfaces:**
- Consumes: `foodly.listIngredients()` (already in `src/api/index.ts`), `Ingredient`/`IngredientId`.
- Produces: `useIngredients(): { byId: Record<IngredientId, Ingredient>; status: CatalogStatus }` and `useIngredient(id): Ingredient | undefined`. Ingredients join the existing `settled` gate (children render once all four loads settle).

- [ ] **Step 1: Write the failing test**

`src/catalog/CatalogProvider.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { CatalogProvider, useIngredient } from './CatalogProvider';

vi.mock('../api', () => ({
  foodly: {
    listTags: () => Promise.resolve([]),
    listUsers: () => Promise.resolve([]),
    me: () => Promise.resolve({ id: 1, name: 'Kolja', profilePicture: null }),
    listIngredients: () => Promise.resolve([{ id: 5, name: 'Zwiebel' }]),
  },
}));

function Probe() {
  return <span>ing:{useIngredient(5)?.name ?? '-'}</span>;
}

it('loads ingredients into the catalog', async () => {
  render(<CatalogProvider><Probe /></CatalogProvider>);
  await waitFor(() => screen.getByText('ing:Zwiebel'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CatalogProvider`
Expected: FAIL — `useIngredient` not exported / ingredients not loaded.

- [ ] **Step 3: Modify `CatalogProvider.tsx`**

Add the import and extend the `Catalog` type, requests, settled gate, value, and hooks:
```ts
import type { Ingredient, IngredientId, Tag, TagId, User, UserId } from '../api/protocol';
```
In `type Catalog`, add:
```ts
  ingredients: { byId: Record<IngredientId, Ingredient>; status: CatalogStatus };
```
In the component, add the request and include it in `settled`:
```ts
  const ingredientsReq = useRequest(() => foodly.listIngredients(), []);
  const settled = [tagsReq, usersReq, meReq, ingredientsReq].every((r) => r.status !== 'loading');
```
In `value`, add:
```ts
    ingredients: { byId: indexBy(ingredientsReq.data, (i) => i.id), status: ingredientsReq.status === 'error' ? 'error' : 'ready' },
```
At the bottom, add hooks:
```ts
export function useIngredients() { return useCatalog().ingredients; }
export function useIngredient(id: IngredientId): Ingredient | undefined { return useCatalog().ingredients.byId[id]; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CatalogProvider`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog/CatalogProvider.tsx src/catalog/CatalogProvider.test.tsx
git commit -m "feat(catalog): load ingredient catalog, add useIngredients/useIngredient"
```

---

> **UI baseline note (Tasks 12–16):** the spec defers final *layout* (sidebar placement, filter-bar arrangement, compact-row anatomy, exact icons). The components below are functional baselines consistent with Phase 1's `RecipeRow`/`RecipeList`, built with `@postxl/ui-components`. Their internal Tailwind arrangement is the tunable surface — refine it during a layout pass **without changing the tested interfaces/behaviour**.

## Task 12: Role/collaboration row indicator

**Files:**
- Create: `src/components/recipe/RoleCollabIndicator.tsx`
- Test: `src/components/recipe/RoleCollabIndicator.test.tsx`

**Interfaces:**
- Consumes: `myRole`, `collaborationState` (Task 1); `useCurrentUserId`; `@postxl/ui-components` `Tooltip*`; `lucide-react`.
- Produces: `<RoleCollabIndicator recipe={recipe} />` — two glyphs (role icon + collaboration icon, collaboration tinted), each with a tooltip carrying the plain-text meaning. Both always rendered.

- [ ] **Step 1: Write the failing test**

`src/components/recipe/RoleCollabIndicator.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { RoleCollabIndicator } from './RoleCollabIndicator';
import type { Recipe } from '../../api/protocol';

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }));

const base: Recipe = {
  id: 1, owner: 1, editors: [], viewers: [], name: 'R', tags: [], source: null,
  rating: [], time: null, workMinutes: null, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [], sections: [],
};

it('labels owner + private', () => {
  render(<RoleCollabIndicator recipe={{ ...base, owner: 1 }} />);
  expect(screen.getByLabelText(/Besitzer/i)).toBeTruthy();
  expect(screen.getByLabelText(/privat/i)).toBeTruthy();
});

it('labels viewer + collaborative', () => {
  render(<RoleCollabIndicator recipe={{ ...base, owner: 2, editors: [3], viewers: [1] }} />);
  expect(screen.getByLabelText(/Betrachter/i)).toBeTruthy();
  expect(screen.getByLabelText(/kollaborativ/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RoleCollabIndicator`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RoleCollabIndicator.tsx`**

```tsx
import { Crown, Pencil, Eye, Lock, Users, Network } from 'lucide-react';
import { myRole, collaborationState, type Role, type Collaboration } from '../../api/views';
import { useCurrentUserId } from '../../catalog/CatalogProvider';
import type { Recipe } from '../../api/protocol';

const ROLE = {
  owner: { Icon: Crown, label: 'Besitzer' },
  editor: { Icon: Pencil, label: 'Bearbeiter' },
  viewer: { Icon: Eye, label: 'Betrachter' },
  other: { Icon: Eye, label: 'Kein Zugriff' },
} satisfies Record<Role, { Icon: typeof Crown; label: string }>;

// Colour reinforces collaboration but never carries meaning alone — aria-label + title do.
const COLLAB = {
  private: { Icon: Lock, label: 'privat', tint: 'text-muted-foreground' },
  shared: { Icon: Users, label: 'geteilt (read-only)', tint: 'text-[#0ea5e9]' },
  collaborative: { Icon: Network, label: 'kollaborativ', tint: 'text-[#10b981]' },
} satisfies Record<Collaboration, { Icon: typeof Lock; label: string; tint: string }>;

export function RoleCollabIndicator({ recipe }: { recipe: Recipe }) {
  const role = ROLE[myRole(recipe, useCurrentUserId())];
  const collab = COLLAB[collaborationState(recipe)];
  // Baseline hint via native title + aria-label: no TooltipProvider dependency,
  // test-robust. A layout pass MAY upgrade to the library `Tooltip` once provider
  // placement is decided. (A tooltip hint is not one of CLAUDE.md's "interactive
  // controls", so native title is allowed here.)
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-label={role.label} title={role.label}>
        <role.Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <span aria-label={collab.label} title={collab.label}>
        <collab.Icon className={`h-3.5 w-3.5 ${collab.tint}`} />
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RoleCollabIndicator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/recipe/RoleCollabIndicator.tsx src/components/recipe/RoleCollabIndicator.test.tsx
git commit -m "feat(recipe): add at-a-glance role/collaboration row indicator"
```

---

## Task 13: Collaboration-aware Rating + RecipeRow

**Files:**
- Modify: `src/components/recipe/Rating.tsx`
- Modify: `src/components/recipe/RecipeRow.tsx`
- Test: `src/components/recipe/RecipeRow.test.tsx`

**Interfaces:**
- Consumes: `visibleRating` (Task 2), `collaborationState` (Task 1), `RoleCollabIndicator` (Task 12), `useCurrentUserId`.
- Produces: `<RecipeRow recipe compact?={boolean} />` — `★` uses `visibleRating`; renders `RoleCollabIndicator`; `compact` hides the avatar. `Rating` shows only "Du" for non-collaborative, full breakdown for collaborative.

- [ ] **Step 1: Write the failing test**

`src/components/recipe/RecipeRow.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecipeRow } from './RecipeRow';
import type { Recipe } from '../../api/protocol';

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1, useTags: () => ({ byId: {} }) }));

const base: Recipe = {
  id: 1, owner: 1, editors: [], viewers: [2], name: 'Shared Dish', tags: [], source: null,
  rating: [{ user: 1, rating: 5 }, { user: 2, rating: 1 }], time: null,
  workMinutes: null, overallMinutes: null, amount: null, basePortionMultiplier: null,
  notes: [], mainImage: null, images: [], sections: [],
};

it('shared recipe shows the own rating, not the average', () => {
  render(<MemoryRouter><RecipeRow recipe={base} /></MemoryRouter>);
  expect(screen.getByText('5.0')).toBeTruthy(); // own, not avg (3.0)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RecipeRow`
Expected: FAIL — row still shows `averageRating` (3.0).

- [ ] **Step 3: Update `RecipeRow.tsx`**

Swap `averageRating` for `visibleRating`, add the indicator and a `compact` prop:
```tsx
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { RoleCollabIndicator } from './RoleCollabIndicator';
import { visibleRating } from '../../api/views';
import { useCurrentUserId } from '../../catalog/CatalogProvider';
import type { Recipe } from '../../api/protocol';

export function RecipeRow({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) {
  const rating = visibleRating(recipe, useCurrentUserId());
  const initial = recipe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        {!compact && (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <RoleCollabIndicator recipe={recipe} />
              <span className="truncate font-medium"><TagText value={recipe.name} /></span>
            </span>
            {recipe.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {recipe.tags.map((t) => (
                  <Badge key={t} variant="secondary"><TagText value={t} /></Badge>
                ))}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {rating !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {rating.toFixed(1)}
              </span>
            )}
            {rating !== null && recipe.time && <span aria-hidden>·</span>}
            {recipe.time && <span>🕒 <TagText value={recipe.time} /></span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Update `Rating.tsx` for collaboration-aware visibility**

Replace the body so non-collaborative recipes show only "Deine Bewertung" (no breakdown), and collaborative shows the average + breakdown. Use `visibleRating` and `collaborationState`:
```tsx
import { Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, Separator, Button } from '@postxl/ui-components';
import { Stars } from './Stars';
import { visibleRating, ratingsByRole, collaborationState, type RatedRole } from '../../api/views';
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider';
import type { Recipe, UserId } from '../../api/protocol';

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter', other: 'Weitere',
};

function UserName({ id }: { id: UserId }) {
  const user = useUser(id);
  return <>{user?.name ?? `User ${id}`}</>;
}

export function Rating({ recipe }: { recipe: Recipe }) {
  const currentUserId = useCurrentUserId();
  const value = visibleRating(recipe, currentUserId);
  if (value === null) return null;

  const collaborative = collaborationState(recipe) === 'collaborative';
  const rows = collaborative ? ratingsByRole(recipe) : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 px-1.5 py-0.5">
          <Stars value={value} />
          <span className="text-sm tabular-nums text-muted-foreground">{value.toFixed(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        {collaborative ? (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium">Bewertungen</span>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {value.toFixed(1)} · {rows.length}
              </span>
            </div>
            <Separator className="my-3" />
            <ul className="space-y-1">
              {rows.map((rrow) => (
                <li key={rrow.user} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <UserName id={rrow.user} />
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[rrow.role]}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-current text-star" />
                    {rrow.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deine Bewertung</span>
            <span className="inline-flex items-center gap-1 text-sm tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current text-star" />
              {value.toFixed(1)}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: Run tests + build**

Run: `npm test -- RecipeRow`
Expected: PASS.
Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/recipe/RecipeRow.tsx src/components/recipe/Rating.tsx src/components/recipe/RecipeRow.test.tsx
git commit -m "feat(recipe): collaboration-aware ratings in row + detail, row indicator + compact"
```

---

## Task 14: Category sidebar

**Files:**
- Create: `src/components/list/CategorySidebar.tsx`
- Test: `src/components/list/CategorySidebar.test.tsx`

**Interfaces:**
- Consumes: `UserCategory`; `@postxl/ui-components` (`Checkbox`, `Button`).
- Produces: `<CategorySidebar categories selected onToggle />` where `selected: number[]`, `onToggle: (id: number) => void`. Multi-select; each row shows the category name, a colour swatch (`category.color`), and the static count (`category.recipes.length`).

- [ ] **Step 1: Write the failing test**

`src/components/list/CategorySidebar.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CategorySidebar } from './CategorySidebar';
import type { UserCategory } from '../../api/protocol';

const cats: UserCategory[] = [
  { id: 1, user: 1, name: 'Favoriten', recipes: [1, 2, 3], order: 0, color: '#e11d48', colorLight: null, colorDark: null },
  { id: 2, user: 1, name: 'Schnell', recipes: [4], order: 1, color: '#0ea5e9', colorLight: null, colorDark: null },
];

it('renders categories with static counts and toggles', () => {
  const onToggle = vi.fn();
  render(<CategorySidebar categories={cats} selected={[1]} onToggle={onToggle} />);
  expect(screen.getByText('Favoriten')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy(); // static count
  fireEvent.click(screen.getByText('Schnell'));
  expect(onToggle).toHaveBeenCalledWith(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CategorySidebar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CategorySidebar.tsx`**

```tsx
import { Button, Checkbox } from '@postxl/ui-components';
import type { UserCategory } from '../../api/protocol';

// Known mock palette → literal Tailwind classes (the v4 scanner only keeps literal
// strings, so a dynamic `bg-[${hex}]` would not be generated). Unknown colours fall
// back to a neutral dot. When the real backend supplies arbitrary category colours,
// switch this to CSS-variable tokens (theme.css → styles.css bridge).
const SWATCH: Record<string, string> = {
  '#e11d48': 'bg-[#e11d48]',
  '#0ea5e9': 'bg-[#0ea5e9]',
  '#f59e0b': 'bg-[#f59e0b]',
  '#10b981': 'bg-[#10b981]',
};

export function CategorySidebar({
  categories, selected, onToggle,
}: { categories: UserCategory[]; selected: number[]; onToggle: (id: number) => void }) {
  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <nav className="flex flex-col gap-1">
      <h2 className="px-2 py-1 text-sm font-medium text-muted-foreground">Kategorien</h2>
      {ordered.map((c) => (
        <Button
          key={c.id}
          type="button"
          variant="ghost"
          onClick={() => onToggle(c.id)}
          className="h-auto w-full justify-start gap-2 px-2 py-1.5 font-normal"
        >
          <Checkbox checked={selected.includes(c.id)} className="pointer-events-none" />
          <span className={`h-3 w-3 shrink-0 rounded-full ${SWATCH[c.color] ?? 'bg-muted'}`} />
          <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
          <span className="tabular-nums text-xs text-muted-foreground">{c.recipes.length}</span>
        </Button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run test + build**

Run: `npm test -- CategorySidebar`
Expected: PASS.
Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/list/CategorySidebar.tsx src/components/list/CategorySidebar.test.tsx
git commit -m "feat(list): add multi-select category sidebar with static counts"
```

---

## Task 15: Filter controls (search, tags, ingredients, duration, role grid, sort, view)

**Files:**
- Create: `src/components/list/FilterControls.tsx`
- Test: `src/components/list/FilterControls.test.tsx`

**Interfaces:**
- Consumes: `ListState` + `set` patch (Task 3/10); `roleGridCounts`, `roleCellKey` (Task 7); `Tag`, `Ingredient`; `@postxl/ui-components` (`Input`, `Button`, `Badge`, `Select*`, `Popover*`, `Checkbox`).
- Produces: `<FilterControls state set tags ingredients gridCounts />` where `set: (patch: Partial<ListState>) => void`, `tags: Tag[]`, `ingredients: Ingredient[]` (already restricted to used ones), `gridCounts: Record<string, number>`. Renders: search input (`q`), tag multi-select (AND), ingredient multi-select (AND), duration max input + field toggle, the 3×3 role grid (invalid cells greyed but clickable with relax behaviour; valid-but-empty shows count `0`), sort key + direction, and the detailed/compact + flat/by-category toggles.

- [ ] **Step 1: Write the failing test**

`src/components/list/FilterControls.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterControls } from './FilterControls';
import { DEFAULT_STATE } from '../../list/state';
import { roleCellKey } from '../../list/counts';

const noop = () => {};
const counts = { [roleCellKey('owner', 'private')]: 2, [roleCellKey('viewer', 'shared')]: 1 };

it('search input pushes a q patch', () => {
  const set = vi.fn();
  render(<FilterControls state={DEFAULT_STATE} set={set} tags={[]} ingredients={[]} gridCounts={counts} />);
  fireEvent.change(screen.getByPlaceholderText(/suchen/i), { target: { value: 'apfel' } });
  expect(set).toHaveBeenCalledWith({ search: 'apfel' });
});

it('relax behaviour: clicking an invalid role cell resets the sister axis to any', () => {
  const set = vi.fn();
  render(<FilterControls state={{ ...DEFAULT_STATE, role: 'editor' }} set={set} tags={[]} ingredients={[]} gridCounts={counts} />);
  // editor × private is logically impossible → clicking it relaxes role to 'any'
  fireEvent.click(screen.getByRole('button', { name: /Bearbeiter.*privat|privat.*Bearbeiter/i }));
  expect(set).toHaveBeenCalledWith({ role: 'any', collab: 'private' });
});
```
*If the grid is not implemented as one button per cell with that accessible name, adjust the query in Step 3 to match your markup — but keep a test that asserts the relax patch `{ role: 'any', collab: 'private' }`.*

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FilterControls`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `FilterControls.tsx`**

```tsx
import { Fragment } from 'react';
import { Input, Button, Badge } from '@postxl/ui-components';
import type { ListState, RoleFilter, CollabFilter, SortKey } from '../../list/state';
import { roleCellKey } from '../../list/counts';
import type { Tag, Ingredient } from '../../api/protocol';

const ROLES: Exclude<RoleFilter, 'any'>[] = ['owner', 'editor', 'viewer'];
const COLLABS: Exclude<CollabFilter, 'any'>[] = ['private', 'shared', 'collaborative'];
const ROLE_LABEL: Record<Exclude<RoleFilter, 'any'>, string> = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' };
const COLLAB_LABEL: Record<Exclude<CollabFilter, 'any'>, string> = { private: 'privat', shared: 'geteilt', collaborative: 'kollaborativ' };

// editor ⇒ collaborative; viewer ⇒ shared|collaborative. Everything else with owner is valid.
function cellValid(role: Exclude<RoleFilter, 'any'>, collab: Exclude<CollabFilter, 'any'>): boolean {
  if (role === 'editor') return collab === 'collaborative';
  if (role === 'viewer') return collab !== 'private';
  return true; // owner: all three valid
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' }, { key: 'work', label: 'Arbeitszeit' },
  { key: 'overall', label: 'Gesamtzeit' }, { key: 'rating', label: 'Bewertung' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function FilterControls({
  state, set, tags, ingredients, gridCounts,
}: {
  state: ListState; set: (patch: Partial<ListState>) => void;
  tags: Tag[]; ingredients: Ingredient[]; gridCounts: Record<string, number>;
}) {
  // Last-click-wins relax: clicking a cell sets both axes; if invalid, the sister axis relaxes to 'any'.
  const clickCell = (role: Exclude<RoleFilter, 'any'>, collab: Exclude<CollabFilter, 'any'>) => {
    if (cellValid(role, collab)) set({ role, collab });
    else if (role === 'editor' || role === 'viewer') set({ role: 'any', collab }); // role forced the conflict
    else set({ role, collab: 'any' });
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Rezepte suchen…"
        value={state.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      {/* Tags (AND) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge
              key={t.id}
              variant={state.tags.includes(t.id) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => set({ tags: toggle(state.tags, t.id) })}
            >{t.id}</Badge>
          ))}
        </div>
      )}

      {/* Ingredients (AND) */}
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ingredients.map((i) => (
            <Badge
              key={i.id}
              variant={state.ingredients.includes(i.id) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => set({ ingredients: toggle(state.ingredients, i.id) })}
            >{i.name}</Badge>
          ))}
        </div>
      )}

      {/* Duration max */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-24"
          placeholder="Minuten"
          value={state.durationMax ?? ''}
          onChange={(e) => set({ durationMax: e.target.value === '' ? null : Number(e.target.value) })}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => set({ durationField: state.durationField === 'work' ? 'overall' : 'work' })}
        >{state.durationField === 'work' ? 'Arbeitszeit' : 'Gesamtzeit'}</Button>
      </div>

      {/* Role × Collaboration grid */}
      <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-xs">
        <span />
        {COLLABS.map((c) => <span key={c} className="px-1 text-center text-muted-foreground">{COLLAB_LABEL[c]}</span>)}
        {ROLES.map((role) => (
          <Fragment key={role}>
            <span className="px-1 text-muted-foreground">{ROLE_LABEL[role]}</span>
            {COLLABS.map((collab) => {
              const valid = cellValid(role, collab);
              const active = state.role === role && state.collab === collab;
              const count = gridCounts[roleCellKey(role, collab)] ?? 0;
              return (
                <Button
                  key={collab}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-label={`${ROLE_LABEL[role]} ${COLLAB_LABEL[collab]}`}
                  className={valid ? '' : 'opacity-40'}
                  onClick={() => clickCell(role, collab)}
                >{valid ? count : '—'}</Button>
              );
            })}
          </Fragment>
        ))}
      </div>
      {(state.role !== 'any' || state.collab !== 'any') && (
        <Button variant="ghost" size="sm" onClick={() => set({ role: 'any', collab: 'any' })}>Rolle zurücksetzen</Button>
      )}

      {/* Sort */}
      <div className="flex flex-wrap items-center gap-1">
        {SORTS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={state.sortKey === s.key ? 'default' : 'outline'}
            onClick={() => set(state.sortKey === s.key
              ? { sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' }
              : { sortKey: s.key })}
          >{s.label}{state.sortKey === s.key ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</Button>
        ))}
      </div>

      {/* View toggles */}
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant={state.detail === 'compact' ? 'default' : 'outline'}
          onClick={() => set({ detail: state.detail === 'detailed' ? 'compact' : 'detailed' })}>
          {state.detail === 'compact' ? 'Kompakt' : 'Detailliert'}
        </Button>
        <Button size="sm" variant={state.group === 'by-category' ? 'default' : 'outline'}
          onClick={() => set({ group: state.group === 'flat' ? 'by-category' : 'flat' })}>
          {state.group === 'by-category' ? 'Nach Kategorie' : 'Flache Liste'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test + build**

Run: `npm test -- FilterControls`
Expected: PASS.
Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/list/FilterControls.tsx src/components/list/FilterControls.test.tsx
git commit -m "feat(list): add filter controls (search, tags, ingredients, duration, role grid, sort, view)"
```

---

## Task 16: Result view — flat & by-category grouping

**Files:**
- Create: `src/components/list/RecipeListView.tsx`
- Test: `src/components/list/RecipeListView.test.tsx`

**Interfaces:**
- Consumes: `Recipe`, `UserCategory`; `RecipeRow` (Task 13); `GroupView`, `DetailView`.
- Produces: `<RecipeListView recipes categories group detail />` — `flat` renders rows in order; `by-category` renders one section per category that has ≥1 matching recipe (recipe appears in **each** of its categories), plus an **"Ohne Kategorie"** bucket for recipes in none. `detail==='compact'` passes `compact` to each row.

- [ ] **Step 1: Write the failing test**

`src/components/list/RecipeListView.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecipeListView } from './RecipeListView';
import type { Recipe, UserCategory } from '../../api/protocol';

vi.mock('../../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1, useTags: () => ({ byId: {} }) }));

const base: Recipe = {
  id: 0, owner: 1, editors: [], viewers: [], name: '', tags: [], source: null,
  rating: [], time: null, workMinutes: null, overallMinutes: null, amount: null,
  basePortionMultiplier: null, notes: [], mainImage: null, images: [], sections: [],
};
const recipes: Recipe[] = [
  { ...base, id: 1, name: 'In Both' }, { ...base, id: 2, name: 'Loner' },
];
const cats: UserCategory[] = [
  { id: 10, user: 1, name: 'Fav', recipes: [1], order: 0, color: '#000', colorLight: null, colorDark: null },
  { id: 11, user: 1, name: 'Quick', recipes: [1], order: 1, color: '#000', colorLight: null, colorDark: null },
];

it('by-category shows a recipe under each of its categories + Ohne Kategorie bucket', () => {
  render(<MemoryRouter><RecipeListView recipes={recipes} categories={cats} group="by-category" detail="detailed" /></MemoryRouter>);
  expect(screen.getByText('Fav')).toBeTruthy();
  expect(screen.getByText('Quick')).toBeTruthy();
  expect(screen.getByText('Ohne Kategorie')).toBeTruthy();
  expect(screen.getAllByText('In Both').length).toBe(2); // appears in both categories
  expect(screen.getAllByText('Loner').length).toBe(1);   // only in the bucket
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RecipeListView`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RecipeListView.tsx`**

```tsx
import { RecipeRow } from '../recipe/RecipeRow';
import type { Recipe, UserCategory } from '../../api/protocol';
import type { GroupView, DetailView } from '../../list/state';

function Rows({ recipes, compact }: { recipes: Recipe[]; compact: boolean }) {
  return (
    <div className="space-y-3">
      {recipes.map((r) => <RecipeRow key={r.id} recipe={r} compact={compact} />)}
    </div>
  );
}

export function RecipeListView({
  recipes, categories, group, detail,
}: { recipes: Recipe[]; categories: UserCategory[]; group: GroupView; detail: DetailView }) {
  const compact = detail === 'compact';

  if (group === 'flat') return <Rows recipes={recipes} compact={compact} />;

  const ordered = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const inAnyCategory = new Set<number>();
  for (const c of categories) for (const id of c.recipes) inAnyCategory.add(id);
  const uncategorised = recipes.filter((r) => !inAnyCategory.has(r.id));

  return (
    <div className="space-y-6">
      {ordered.map((c) => {
        const inThis = recipes.filter((r) => c.recipes.includes(r.id));
        if (inThis.length === 0) return null;
        return (
          <section key={c.id}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{c.name}</h3>
            <Rows recipes={inThis} compact={compact} />
          </section>
        );
      })}
      {uncategorised.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ohne Kategorie</h3>
          <Rows recipes={uncategorised} compact={compact} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test + build**

Run: `npm test -- RecipeListView`
Expected: PASS.
Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/list/RecipeListView.tsx src/components/list/RecipeListView.test.tsx
git commit -m "feat(list): add flat + by-category result view with Ohne-Kategorie bucket"
```

---

## Task 17: Wire it together in `RecipeList` page

**Files:**
- Modify: `src/pages/RecipeList.tsx`
- Test: manual (Chrome MCP smoke) + `npm run build`

**Interfaces:**
- Consumes: `useListState` (Task 10); `useCurrentUserId`, `useTags`, `useIngredients` (Catalog); `foodly.listRecipes`, `foodly.listCategories`; `filterRecipes`, `sortRecipes` (Tasks 5/6); `roleGridCounts`, `usedIngredients` (Task 7); `isFilterActive` (Task 3); `CategorySidebar`, `FilterControls`, `RecipeListView`.
- Produces: the full organised list page. Loading/error states preserved from Phase 1; a distinct **filtered-empty** state with a **"Filter zurücksetzen"** button (calls `clear`).

- [ ] **Step 1: Rewrite `src/pages/RecipeList.tsx`**

```tsx
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider';
import { useListState } from '../list/useListState';
import { filterRecipes } from '../list/filter';
import { sortRecipes } from '../list/sort';
import { roleGridCounts, usedIngredients } from '../list/counts';
import { isFilterActive } from '../list/state';
import { CategorySidebar } from '../components/list/CategorySidebar';
import { FilterControls } from '../components/list/FilterControls';
import { RecipeListView } from '../components/list/RecipeListView';

export function RecipeList() {
  const [nonce, setNonce] = useState(0);
  const recipesReq = useRequest(() => foodly.listRecipes(), [nonce]);
  const categoriesReq = useRequest(() => foodly.listCategories(), [nonce]);
  const { state, set, clear } = useListState();
  const currentUserId = useCurrentUserId();
  const tags = useTags();
  const ingredients = useIngredients();

  const allRecipes = recipesReq.data ?? [];
  const categories = categoriesReq.data ?? [];
  const tagList = Object.values(tags.byId);
  const usedIngredientList = usedIngredients(allRecipes, ingredients.byId);
  const gridCounts = roleGridCounts(allRecipes, state, currentUserId, categories);

  const visible = sortRecipes(
    filterRecipes(allRecipes, state, currentUserId, categories),
    state, currentUserId,
  );

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-[14rem_1fr]">
      <aside className="md:sticky md:top-4 md:self-start">
        <CategorySidebar
          categories={categories}
          selected={state.categories}
          onToggle={(id) => set({
            categories: state.categories.includes(id)
              ? state.categories.filter((x) => x !== id)
              : [...state.categories, id],
          })}
        />
      </aside>

      <div className="min-w-0">
        <h1 className="font-display mb-6 text-3xl text-foreground">Rezepte</h1>

        <div className="mb-6">
          <FilterControls
            state={state} set={set}
            tags={tagList} ingredients={usedIngredientList} gridCounts={gridCounts}
          />
        </div>

        {recipesReq.status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {recipesReq.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{recipesReq.error?.message}</span>
              <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>Erneut versuchen</Button>
            </AlertDescription>
          </Alert>
        )}

        {recipesReq.status === 'ready' && allRecipes.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Noch keine Rezepte.</p>
        )}

        {recipesReq.status === 'ready' && allRecipes.length > 0 && visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
            {isFilterActive(state) && (
              <Button variant="outline" size="sm" onClick={clear}>Filter zurücksetzen</Button>
            )}
          </div>
        )}

        {recipesReq.status === 'ready' && visible.length > 0 && (
          <RecipeListView recipes={visible} categories={categories} group={state.group} detail={state.detail} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Chrome MCP smoke (run `VITE_MOCK=1 npm run dev`, drive real Chrome)**

Verify on the running app:
- Sidebar lists 4 categories with colour swatches + counts; selecting "Favoriten" + "Schnelle Küche" narrows the list (OR).
- Tag filter narrows (AND across two tags); ingredient filter narrows; duration "Minuten" + field toggle works; clearing shows all.
- Role grid: invalid cells greyed; clicking `Bearbeiter × privat` relaxes role to Any; valid-but-empty cells show `0`.
- Search "apfel" finds "Gedeckter Apfelkuchen"; "mehl" finds nothing (steps not searched).
- Sort by Bewertung/Arbeitszeit/Gesamtzeit; direction toggles; null durations sink to the end.
- Row indicator: two glyphs per row with tooltips; ratings show own (Private/Shared) vs average (Collaborative).
- Toggle Kompakt (avatar hidden) and "Nach Kategorie" (groups + "Ohne Kategorie"; recipes 8 & 13 appear in two groups).
- Reload with filters set → URL keeps them (shareable); open `/` in a fresh tab → personal defaults restored, search empty.
- "Keine Treffer" + "Filter zurücksetzen" appears when filters exclude everything.
- Console clean; rough mobile width (sidebar stacks above).

- [ ] **Step 4: Commit**

```bash
git add src/pages/RecipeList.tsx
git commit -m "feat(list): wire sidebar + filters + sort + views into the recipe list page"
```

---

## Task 18: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass (views, state, search, filter, sort, counts, url, persistence, useListState, CatalogProvider, RoleCollabIndicator, RecipeRow, CategorySidebar, FilterControls, RecipeListView).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean tsc + Vite build.

- [ ] **Step 3: Final Chrome MCP smoke** — repeat Task 17 Step 3 end-to-end once more on the production `npm run preview` build with `VITE_MOCK=1`.

- [ ] **Step 4: Confirm no stray deps** — `git diff main -- package.json` shows only `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom` added under `devDependencies`; **no `@playwright/*`**, nothing under `dependencies`.

- [ ] **Step 5: Commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(phase-2): verification fixups"
```

---

## Self-Review (completed)

**Spec coverage:** every spec section maps to a task — §D→T15, §Rating-Sichtbarkeit→T2/T13, §Indikator→T12, §A facets→T4/T5, counts→T7, sort→T6, search→T4, empty→T17, §State→T8/T9/T10, §Zutaten-Quelle→T11/T7/T17, §C views→T15/T16. §Mock-Ausbau was already done (commit `d66b381`). No gaps.

**Type consistency (checked):** `Role`/`Collaboration` from T1 are reused everywhere (`roleOf`/`myRole`/`collaborationState`); `filterRecipes(recipes, state, currentUserId, categories)` (4 args) is called identically in T7 and T17; `sortRecipes`/`roleGridCounts`/`usedIngredients`/`visibleRating` signatures match across producer and consumer tasks; `useListState()` → `{state,set,clear}` consumed in T17; `RecipeRow` gained `compact?` and every caller (T16) passes it; `RatedRole` kept as an alias so `Rating.tsx`'s import survives.

**Fixes applied inline during review:**
1. **T0 deps** — added `@testing-library/dom` (required peer of RTL 16) and bumped to `vitest@^3` for Vite 7; noted the ERESOLVE fallback.
2. **T4** — replaced a tautological diacritic assertion with `normalizeText('Über GRÜN') → 'uber grun'` and dropped the redundant "simplify" step (renumbered).
3. **T12** — dropped the library `Tooltip` (would need a `TooltipProvider`, fragile in unit tests) for native `title` + `aria-label`; the test asserts via `getByLabelText`, so it's provider-independent.
4. **T14** — removed invalid `style-token` placeholder JSX and the raw `<button>` (CLAUDE.md forbids hand-rolled controls): now a library `Button variant="ghost"` row + a literal-class `SWATCH` map for the known mock palette.
5. **T15** — replaced the keyless `<>` fragment in `.map` with `<Fragment key={role}>`.

No remaining placeholders or TODOs.
