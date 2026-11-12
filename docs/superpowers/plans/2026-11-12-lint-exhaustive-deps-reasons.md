# Plan — #173 Lint: 4 exhaustive-deps-Ausnahmen ohne Begründung

Scope: the four `eslint-disable-next-line react-hooks/exhaustive-deps` comments without a reason. Spec is the issue body; when in doubt, add a reason instead of restructuring. `useRequest.ts:35` and `useAutosave.ts:116` stay untouched.

## Step 1 — `src/editor/useAutosave.ts`, unmount effect
- Only `run` is missing; it is `useCallback(..., [])` and stable. Deps `[run]`, no disable. `dirty`/`ensureWaiter` only touch refs, so the rule doesn't ask for them; adding them would re-run the unmount flush on every render.
- Covered by the existing unmount-flush tests in `useAutosave.test.ts`.

## Step 2 — `src/hooks/useRecipeSearch.ts`, search effect and `fetchPage`
- Keep both disables, add reasons: `query` is a new object every render (`RecipeList` builds it inline) and is tracked by value through `key`. Listing `query` would refetch page 1 on every render, and a per-render `fetchPage` would re-subscribe the list's sentinel and refire `loadMore`.

## Step 3 — `src/components/recipe/Lightbox.tsx`, keydown effect
- `go` becomes a `useCallback` over `[index, n, onIndexChange]`; effect deps `[go, onClose]`, no disable. Keys behave as before; the listener now always calls the current handlers (it used to keep the ones from the last `index`/`n` change). Callers with an inline `onClose` re-attach the listener per render — harmless.
- New tests in `Lightbox.test.tsx`: Escape closes, arrows wrap around, a new `index` is used, new handlers with the same `index` are used (red before, green after), no reaction after unmount.

## Verification
- AC1: `rg 'eslint-disable-next-line react-hooks/exhaustive-deps$' src` is empty.
- AC2: existing tests plus the new Lightbox keyboard tests.
- AC3: `eslint-suppressions.json` stays `{}`; `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`.

## Commits
1. this plan  2. useAutosave  3. useRecipeSearch  4. Lightbox + tests. No Co-Authored-By / AI trailer.
