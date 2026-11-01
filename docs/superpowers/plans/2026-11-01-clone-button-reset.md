# Plan: #67 Duplizieren-Knopf bleibt nach erfolgreichem Duplizieren deaktiviert

Basis: spec.md incl. assumptions A1–A5. Smallest change: extend the existing reset effect, one ref guard in `onClone`, one new route test file. No new components, no text change.

## Step 0: Commit the plan
- Copy this plan as `docs/superpowers/plans/2026-11-01-clone-button-reset.md` (CLAUDE.md: plans live in docs/superpowers/plans; precedent #47). Own commit.

## Step 1: Fix in `src/pages/RecipeDetail.tsx`
- Reset effect on `recipeId` (:73-78): add `setCloning(false)`, `setCloneError(null)` and `cloneAttempt.current++` (AC1, AC2, AC3).
- Stale-failure guard (A2) via an attempt counter: `const cloneAttempt = useRef(0)`. In `onClone`: `const attempt = ++cloneAttempt.current`; in catch only `setCloneError`/`setCloning(false)` when `attempt === cloneAttempt.current`. Also correct when the user leaves and comes back to the same recipe and clicks again (an id comparison would let the first, late rejection re-enable the button during the second clone). One-line why-comment (bump in the reset effect invalidates in-flight clones of the previous recipe).
- Known and out of scope (A2): a late success still navigates and can override a newer clone; mention in the PR.
- Success path unchanged (navigate to copy); no `finally`, no key remount (non-goals).
- StrictMode double effect only bumps the counter twice — harmless.

## Step 2: Test `src/pages/RecipeDetail.route.test.tsx` (new, AC4)
Modelled on `RecipeEditor.route.test.tsx`: real `MemoryRouter initialEntries={['/recipes/5']}` + `Routes` with `Route path="/recipes/:id" element={<RecipeDetail />}`, `TooltipProvider`, mocked `CatalogProvider` (`useTags`, `useCurrentUserId` only, like the clone test). `getRecipe` spy: `mockImplementation(async (id) => recipe(id))` with `name: \`Rezept ${id}\``. Outside `<Routes>`: a `Link to="/recipes/6"` ("test-go-6") and a test-only back helper ("test-back", `useNavigate()(-1)`, postxl `Button`). Assertions via `(el as HTMLButtonElement).disabled` (no jest-dom). Header comment: real router on purpose, the mocked router in the clone test can't reproduce the shared-instance bug.
- Test A (AC1+AC2): click Duplizieren, `copyRecipe` resolves `recipe(99)` → `await findByText('Rezept 99')`, Duplizieren enabled and `getRecipe` called with 99; click test-back → `await findByText('Rezept 5')`, enabled.
- Test B (error not carried over, AC3): `copyRecipe` rejects `new Error('Kopieren fehlgeschlagen')` → message shown, enabled; click test-go-6 → `await findByText('Rezept 6')`, then message absent.
- Test C (A2 stale failure): deferred `copyRecipe`; click Duplizieren on 5, click test-go-6, `await findByText('Rezept 6')`, then `await act(async () => reject(new Error('Alter Fehler 5')))`; assert `queryByText('Alter Fehler 5')` is null (primary assertion) and Duplizieren enabled.
- Every negative assertion happens only after the target recipe's name is visible (action bar renders only at `status === 'ready'`).
- Existing `RecipeDetail.clone.test.tsx` stays unchanged.

## Step 3: Verify
- Mutation checks: (a) remove only the two reset lines → A and B must fail; (b) keep reset, remove only the guard check → C must fail; (c) remove only the counter bump in the effect → C must fail. Restore.
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`. No browser in this container (A5) → router test is the proof, noted in the PR.

## Commits
0. `Plan: Duplizieren-Knopf nach Kopieren wieder bedienbar (#67)` (docs/superpowers/plans)
1. `RecipeDetail: Duplizieren nach Kopieren und Rezeptwechsel wieder bedienbar (#67)` (fix + route test)
`npm run format` before the commit. No Co-Authored-By or other AI trailer.

## Review log
- Review pass 1 (fresh subagent): no blocker. Major adopted: negative assertions only after target recipe is loaded; deferred reject inside act; separate mutation checks for reset and guard. Minor adopted: attempt counter instead of id ref (leave-and-return case), A2 "after unmount" dropped, commit conventions spelled out, id-dependent getRecipe mock + links outside Routes, plan copied to docs/superpowers/plans. Nits adopted: postxl Button + collision-free names for test helpers, noise bullet dropped. Not adopted: derived `cloningFor` state (AC3 wording favours the effect).
- Review pass 2 (fresh subagent): no blocker/major; guard verified for all orderings incl. StrictMode. Minor adopted: late-success override documented as out of scope, distinctive error text in Test C, extra mutation (c) for the counter bump. Nits adopted: assert getRecipe(99) in Test A, effect ordering in the why-comment.
