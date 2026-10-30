# Plan — #35 Alpha: stub base + set/clear own rating (localStorage)

Source: `.git/agent-work/spec.md` (ACs 1–7 and assumptions A1–A10). Conventions: CLAUDE.md, ADR 0003.

Facts this plan relies on:
- `CatalogProvider` waits until `foodly.me()` has settled before it renders its children. So in the app, the stub user id is always set before `getRecipe`/`searchRecipes` run.
- `PAGE_SIZE = 100`.
- postxl exports `Button`, `Popover*` and `Separator`.
- `Rating.tsx` and `RecipeDetail.tsx` (line 148) hide the rating when no rating exists.

## Step 1 — `src/api/stubs.ts` (new) + tests  [AC1, AC6]

- `export type StubFeature = 'ratings' | 'sharing' | 'groups' | 'addedAt' | 'images'`. The comment says the type is extensible and follows the ADR §3 list.
- `const USE_MOCKS = import.meta.env.VITE_MOCK === '1'` (same check as `index.ts`).
- `export const STUBBED: ReadonlySet<StubFeature> = new Set(USE_MOCKS ? [] : ['ratings', 'images'])`.
- `export function isStubbed(f: StubFeature): boolean`.
- localStorage helper: `stubStore = { read<T>(key, fallback: T): T, write(key, value) }`.
  - The key is prefixed `foodly.stub.`.
  - `read` returns `fallback` on missing or corrupt JSON (try/catch), and also when localStorage is unavailable.
- Current user for stub data:
  - `setStubUser(id: UserId | null)` and `stubUserId(): UserId | null`, held in module scope.
  - Comment: `me` only lives in React, and ADR §1 keeps stubs in `src/api`, so `foodly.me()` records it here.
- Ratings stub (also lives here, so the `foodly` branches stay one-liners):
  - Storage: `foodly.stub.ratings` → `{ [userId]: { [recipeId]: number } }`.
  - `readMyRating(recipeId)`, `writeMyRating(recipeId, rating | null)`.
  - `mergeMyRating(recipe: R extends { id; rating }) → R`:
    - If there is no stub user or no stored value, return the recipe unchanged.
    - Otherwise, replace or add the `{ user: me, rating }` entry.
  - `sortByRating(items, order)`: keyed on `averageRating` of the merged items, the same key the mock uses (`src/list/query.ts`). Today REST `rating[]` holds only the own entry, so this equals the own value, and it stays right once #11 lands. Rated items come first, in `order`; unrated items last.
  - A comment points to Backend #11 (ADR §6), and to `PUT|DELETE /recipes/{id}/ratings/me` in `docs/backend-questions.md` as the future endpoint.
- Validation: `assertRating(n)` lives in `src/api/views.ts` (pure, no I/O), so `src/mocks` does not depend on stubs. It throws `Error('Bewertung muss eine ganze Zahl von 1 bis 5 sein')` when `n` is not an integer from 1 to 5. Both the mock and the stub use it.
- Tests in `src/api/stubs.test.ts`, with `localStorage.clear()` and `setStubUser(null)` in `beforeEach`:
  - Mode-dependent cases always set the mode explicitly, in both directions, so a developer `.env.local` with `VITE_MOCK=1` can't flip them: `vi.stubEnv('VITE_MOCK', '' | '1')`, then `vi.resetModules()`, then a dynamic import, and `vi.unstubAllEnvs()` in `afterEach`.
    - REST mode: ratings and images are on, sharing is off.
    - Mock mode: the set is empty.
  - The pure helpers (store, merge, sort) are imported statically.
  - The store uses the prefix, falls back on corrupt JSON, and keeps data per user.
  - `mergeMyRating`: no user → unchanged; replaces an existing entry and keeps other users' entries; no value → unchanged.
  - `sortByRating` puts nulls last in both directions.
  - `assertRating` rejects 0, 6 and 2.5.

## Step 2 — `src/api/index.ts`: new methods + REST merge  [AC2, AC3]

- `me`: only the REST branch records the user, by calling `.then((u) => { setStubUser(u?.id ?? null); return u })` on the result.
- `getRecipe`: the REST branch becomes `rest.get<Recipe>(...).then(mergeMyRating)`.
- `searchRecipes`: in the REST branch, map the items through `mergeMyRating`. If `query.sort?.field === 'rating'`, re-sort the page with `sortByRating`. Comment: the server sorts without stub ratings; order is per page only; PAGE_SIZE 100.
- `setMyRating(id, rating): Promise<Recipe>` and `clearMyRating(id): Promise<Recipe>`:
  - Mock branch: `socket.request<Recipe>('ratings.set', { id, rating })` and `'ratings.clear', { id }`.
  - REST branch (stub, comment Backend #11): `assertRating` (set only), then `writeMyRating`, then `foodly.getRecipe(id)`. That call already merges, so the method returns the merged recipe.
  - If there is no stub user, the REST stub throws `Error('Nicht angemeldet')`. The UI disables the controls in that case, so this is only a guard.
- Gate the merge explicitly: `.then((r) => (isStubbed('ratings') ? mergeMyRating(r) : r))`, and the same for search/sort. `setMyRating`/`clearMyRating` are not flag-gated: their REST branch *is* the stub and gets replaced wholesale when #11 lands.

## Step 3 — `src/mocks/index.ts`: handlers + tests  [AC2]

- `case 'ratings.set'`:
  - Find the recipe (throw if not found), then `assertRating(rating)`.
  - Replace or add `{ user: CURRENT_USER_ID, rating }` and return the recipe.
- `case 'ratings.clear'`: filter out the entry for `CURRENT_USER_ID` and return the recipe.
- Tests in `src/mocks/rating.test.ts`, styled after `write.test.ts`:
  - set, overwrite, clear;
  - invalid value rejected;
  - unknown recipe rejected;
  - other users' ratings untouched.

## Step 4 — REST stub branch tests  [AC3, AC5, AC6]

`src/api/index.ratings.test.ts`:
- A `load()` helper runs `vi.stubEnv('VITE_MOCK', '')` and `vi.resetModules()`, then dynamically imports `./index` and `./stubs` together and returns both, so `setStubUser`/`stubUserId` hit the same instance `index` uses. It runs after every reset.
- A `fetch` spy returns `/users/me` → `{id: 7}`, `/recipes/5` → a recipe with `rating: [{user: 3, rating: 2}]`, and search → a page with 3 previews.
- `localStorage.clear()` in `beforeEach`; `vi.unstubAllEnvs()` and `restoreAllMocks` in `afterEach`.

Cases:
1. Seed `foodly.stub.ratings = {"7":{"5":4}}`. Before `me()`, `getRecipe` returns no own entry, which proves the user gating.
2. After `me()` + `setMyRating(5, 4)`, the result contains `{user:7, rating:4}` and keeps user 3. localStorage `foodly.stub.ratings` equals `{"7":{"5":4}}`.
3. **Reload (AC5):** `load()` again, call `me()` again (a reload loses the module-level user, just like the app, which reloads `me` first), then `getRecipe(5)` → still 4.
   Then `clearMyRating(5)`, `load()` again, call `me()` again → no `{user:7}` entry, and storage no longer holds `5` under user 7.
4. `searchRecipes` with sort rating desc merges the entries and orders rated items first.
5. `setMyRating(5, 6)` rejects.
6. No REST write: no fetch URL matches `/ratings`, and no method is PUT/POST/DELETE during set/clear.

## Step 5 — `src/components/DemoHint.tsx` (new)  [AC4]

- `export function DemoHint({ feature }: { feature: StubFeature })` returns `null` unless `isStubbed(feature)`.
- The text comes from a `Partial<Record<StubFeature, string>>` with only `ratings`: „Demo: nur in diesem Browser gespeichert“. Any other feature falls back to the ADR default „Demo: wird noch nicht gespeichert“.
- Styling: a small muted line using Tailwind tokens only (`text-xs text-muted-foreground`) with a lucide `FlaskConical` icon. Tokens make light/dark work.
- Test `DemoHint.test.tsx`: `vi.mock('../api/stubs')` with a hoisted, controllable `isStubbed` mock. When it is true, the ratings text renders; when false, nothing renders. No module reset, so there is no duplicate React.

## Step 6 — `Rating.tsx` editable + `RecipeDetail.tsx` wiring  [Behaviour, A1, A6, A9]

- `Rating` props: `{ recipe, onChange?: (r: Recipe) => void }`. List rows don't use this component, so they stay display-only.
- Trigger:
  - When `visibleRating` is null, show an empty `<Stars value={0} size="md" />` with a visible muted label "Bewerten".
  - Collaborative with no ratings: the "Durchschnitt" row renders only when `value !== null`. Test it.
  - The `return null` goes away.
- In the popover, add a new section `MyRatingInput`, rendered in all modes:
  - In collaborative mode it replaces the read-only "Du" row.
  - Otherwise it replaces the "Deine Bewertung" read-only row: label "Deine Bewertung", plus 5 postxl `Button variant="ghost" size="icon"` with a lucide `Star`.
    - Stars up to and including the own value are filled (`fill-current text-star`), the others `text-muted-foreground/40`.
    - Each button has `aria-label="N von 5"` and `aria-pressed`.
  - Below that, a postxl `Button variant="ghost" size="sm"` „Entfernen“, shown only when there is an own rating.
  - Below that, `<DemoHint feature="ratings" />`.
- State: `saving` (buttons disabled while a write is in flight) and `error` (inline `text-destructive text-xs` line).
  - Clicking calls `foodly.setMyRating` / `clearMyRating` and then `onChange(updated)`.
  - Clicking the current value again is a no-op. Removing is the explicit button.
  - `currentUserId === null` → controls disabled.
- `RecipeDetail.tsx`:
  - Add new state `const [ratedRecipe, setRatedRecipe] = useState<Recipe | null>(null)`.
  - Inside the ready branch: `const ratingRecipe = ratedRecipe?.id === recipe.id ? ratedRecipe : recipe`.
  - Also call `setRatedRecipe(null)` in the existing `[recipeId]` reset effect, so an A→B→A navigation never shows a stale override.
  - Line 148: always render `<Rating recipe={ratingRecipe} onChange={setRatedRecipe} />`. No other read of `recipe` changes.
  - Remove the now-unused `averageRating` import.
  - Test: add a case to a new `RecipeDetail.rating.test.tsx`, styled after `RecipeDetail.clone.test.tsx`: an unrated recipe shows the "Bewerten" trigger.
- Tests `src/components/recipe/Rating.test.tsx`: mock `../../api` (`foodly.setMyRating`/`clearMyRating`) and `../../catalog/CatalogProvider` (`useCurrentUserId: () => 1`, `useUser`).
  - Unrated recipe → the "Bewerten" trigger renders.
  - Open the popover, click "4 von 5" → `setMyRating(id, 4)` is called and `onChange` gets the result.
  - "Entfernen" → `clearMyRating`.
  - A rejected promise shows the inline error.
  - Collaborative recipe (editors non-empty, CatalogProvider mock with `useUser`): the average and raters still show, and the editable row replaces "Du".
  - Demo hint: `vi.mock('../../api/stubs', ...)` with a controllable `isStubbed`, so the result doesn't depend on `.env.local` and no second React copy is loaded.
- Check the existing `RecipeDetail.*.test.tsx` still pass: their CatalogProvider mock has no `useUser`, which is only used for collaborative raters.

## Step 7 — Verify  [AC6, AC7]

- Run `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, then `npm run format:check`.
- Visual check is optional; Chrome MCP isn't available here. If it is not possible, the PR states that only test-level verification was done.

## Step 8 — PR body notes

The PR body (in the open-pr step) states:
- the REST stub references Backend #11;
- the sort limitation: per page, so with infinite scroll page 2's rated items sit below page 1's unrated ones (PAGE_SIZE 100 makes this rare in the Alpha);
- the phone bottom-sheet rule for popovers with form content (`docs/design.md` ~l.169) is out of scope and needs a follow-up;
- assumptions A1–A10 in brief;
- the verification done.

## Commit sequence (no AI trailer)

1. `Stub-Basis: src/api/stubs.ts (STUBBED, isStubbed, localStorage-Helper) + Tests`, plus the condensed plan as `docs/superpowers/plans/2026-10-30-alpha-rating-stub.md` (CLAUDE.md: plans live in docs/superpowers)
2. `Rating abgeben: foodly.setMyRating/clearMyRating, Mock-Handler, REST-Stub (#11) + Tests`
3. `DemoHint-Komponente + Tests`
4. `Rating-Popover: eigene Bewertung setzen/entfernen, immer sichtbar auf der Detailseite`
5. Formatting fixes folded into the last commit, or a final `format` commit if needed.

## AC → verification

| AC | Verified by |
|----|-------------|
| 1 | `stubs.test.ts` |
| 2 | `mocks/rating.test.ts` + `index.ratings.test.ts` (stub branch, #11 comment by review) |
| 3 | `index.ratings.test.ts` cases 1, 2, 4 |
| 4 | `DemoHint.test.tsx` + `Rating.test.tsx` |
| 5 | `index.ratings.test.ts` case 3 |
| 6 | all of the above, `localStorage.clear()` in `beforeEach`, full suite green |
| 7 | the CI commands run locally (build/test/format:check) |

## Review log

- **Review pass 1** (fresh subagent): 0 blockers, 2 majors, 7 minors, 4 nits. All fixed in the plan:
  - Major 1: `RecipeDetail` override decided (id-checked `ratedRecipe` state, no effect), plus a test.
  - Major 2: mode-dependent tests set the mode explicitly; component tests mock `stubs` instead of resetting modules.
  - Minors: the `load()` helper, a stricter no-write assertion, the PR notes step (sort limitation, bottom-sheet follow-up), a collaborative Rating test, and committing the plan to `docs/superpowers/plans/`.
  - Nits: `assertRating` moved to `views.ts`, the mock-branch `setStubUser` and the full text record dropped, the stray `ToggleGroup` mention removed.
- **Review pass 2** (fresh subagent): 0 blockers, 1 major, 4 minors, 3 nits. The pass-1 fixes were verified, including that `vi.stubEnv` + `resetModules` works with this `vite.config`.
  - Major fixed: the two vacuous negative cases in Step 4 now seed storage and call `me()` again.
  - Minors fixed: the collaborative "no ratings" row is guarded and tested; sort keys on `averageRating`, the same as the mock; gating is explicit, and set/clear are knowingly ungated; the override is also reset in the `[recipeId]` effect.
  - Nits: a visible "Bewerten" label is used. Case 6 already asserts no PUT/POST/DELETE. No separate spec doc: the issue body is the spec.
