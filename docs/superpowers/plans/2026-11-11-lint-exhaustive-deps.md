# Plan — #137 Lint-Altlast: react-hooks/exhaustive-deps (3 Stellen)

Scope: the three suppressed `react-hooks/exhaustive-deps` violations. No behaviour change; the spec is the issue body.

## Step 1 — `src/pages/RecipeList.tsx`, paging effect
- The flagged effect is the IntersectionObserver paging effect, not the scroll restore (`[listReady]`, lint-clean, untouched).
- `const { hasMore, loadMore } = search` right above the effect; deps `[hasMore, loadMore, awaitingCategories]`. `search` is a new object every render; `loadMore` is a `useCallback` in `useRecipeSearch`, so the observer re-subscribes exactly as before (once per page). No disable.

## Step 2 — `src/editor/useAutosave.ts`, `run`
- Keep `[]` with `eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>`: `settleWaiter` reads refs only and calls `run` back, so neither can be memoized against the other. Adding it would give `run` a new identity each render, and the debounce effect (deps include `run`) would restart its timer on every re-render.

## Step 3 — `src/pages/RecipeEditor.route.test.tsx`, `VisitLog`
- Deps `[location.key, location.pathname]`. A pathname change always comes with a new key in `MemoryRouter`, so the log fires exactly as before.

## Step 4 — Suppressions
- `npx eslint . --prune-suppressions`: the three `exhaustive-deps` entries go; the two `react/forbid-elements` entries stay. The file only shrinks.

## Verification
- AC1: diff of `eslint-suppressions.json`; `npm run lint` exit 0 (`reportUnusedDisableDirectives` catches stray disables).
- AC2: no behaviour change, so the existing tests cover it: `useAutosave.test.ts` (debounce, single-flight), `pendingSaves.integration.test.ts`, `RecipeList.search.test.tsx` (paging), `RecipeList.categories.test.tsx` (restore position), `RecipeEditor.route.test.tsx` (visit log).
- AC3: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`.

## Out of scope
Pre-existing `exhaustive-deps` disables without a reason (`useAutosave.ts` unmount effect, `useRecipeSearch.ts`, `Lightbox.tsx`): not in the suppressions file.

## Commits
1. `Lint-Altlast react-hooks/exhaustive-deps abbauen (#137)`: code, pruned suppressions and this plan. No Co-Authored-By / AI trailer.
