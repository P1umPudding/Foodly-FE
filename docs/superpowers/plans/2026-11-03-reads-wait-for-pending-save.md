# Plan: issue #80 – reads wait for a pending editor save

Source: `.git/agent-work/spec.md` (Dispatcher spec + worker assumptions W1–W9).
No UI change, no new components or routes. Touches `src/api`, `src/editor/useAutosave.ts`, `src/pages/RecipeEditor.tsx`.

## Step 1 – pending-save registry (`src/api/pendingSaves.ts`, new)

Module-level state, no React:

```ts
const MAX_WAIT_MS = 10_000            // W5: a hung PUT must not keep reads loading forever
const pending = new Map<RecipeId, Promise<void>>()

export function trackPendingSave(id: RecipeId, done: Promise<unknown>): void
// - settled = done.then(noop, noop)                  (a failed save never rejects a read, W3)
// - chains onto an existing entry for the same id   (Promise.all([prev, settled]))
// - removes the entry once settled, only if it is still the current one

export function pendingSaveFor(id: RecipeId): Promise<void> | null   // null = nothing pending
export function allPendingSaves(): Promise<void> | null               // snapshot at call time, allSettled semantics

// Runs `read` synchronously when nothing is pending (W4: no extra await), otherwise after
// `wait` settles or MAX_WAIT_MS passes (timer cleared when `wait` wins).
export function afterSave<T>(wait: Promise<void> | null, read: () => Promise<T>): Promise<T>
```

Export `resetPendingSaves()` with a "Tests only" comment (precedent: `resetTagIconCache` in `src/api/assets.ts`), clearing the map — called in `afterEach` of `pendingSaves.test.ts`, `useAutosave` integration tests and explicitly `RecipeEditor.route.test.tsx`, because route tests with never-resolving PUTs would otherwise leave entries in the module-level map. `afterSave` clears its cap timer when the save wins (test: `vi.getTimerCount() === 0` afterwards).

## Step 2 – reads wait (`src/api/index.ts`)

- `getRecipe: (id) => afterSave(pendingSaveFor(id), () => USE_MOCKS ? … : …)` — wraps both branches (W6).
- `searchRecipes: (query, page) => afterSave(allPendingSaves(), () => …)` — page 1 and loadMore alike (W3).
- `refetchAfterStubWrite` inherits the wait through `foodly.getRecipe` (W7, intended).
- `copyRecipe` / `deleteRecipe` unchanged (W9).
- `vi.spyOn(foodly, 'getRecipe')` in existing tests keeps working (method still on the object).

## Step 3 – unmount flush returns one chain promise (`src/editor/useAutosave.ts`)

- New option `onUnmountFlush?: (done: Promise<void>) => void`, mirrored into a ref like `onFlushError`.
- Extract the deferred creation from `flush()` into a small `ensureWaiter()` helper used by both.
- Unmount cleanup (after clearing the timer, same early return `!enabled || (!inFlight && !dirty())`):
  - `const { promise } = ensureWaiter()`
  - in flight → `queued.current = true` (as today); idle → `run()` (instead of the bare `saveRef.current(...)` call, so the
    save goes through the single-flight machine and `settleWaiter` settles the waiter after the LAST save, W1).
  - `const done = promise.catch(() => {})` — always attached, so a rejected waiter never leaks an unhandled rejection
    even without a callback; hand `done` to `onUnmountFlushRef.current?.(done)`.
  - Note the early-return condition changes from `!dirty()` to `!inFlight && !dirty()`: an in-flight save of the newest
    value must still be registered, because the target page's GET could overtake it.
- Failure reporting unchanged: `run()`'s `.catch` already routes to `onFlushError` once `mounted` is false, once per failed
  save (PUT1 fails + follow-up fails = two toasts, as today; not changed here). Check `updateStatus` after unmount is harmless (React 18 ignores setState on unmounted components).
- Update the invariant comment in `flush()` ("a waiter only exists while a flight is running"): the unmount cleanup now
  creates waiters too, still only together with a running/started flight.
- One-line comment at the early return: disabled with a PUT in flight registers nothing (practically unreachable).
- Header comment on the unmount effect updated (why: the target page's read waits on this promise; condition: readers start
  their request in effects, which run after the editor's unmount cleanup in the same commit).
- New invariant to test: in flight + nothing dirty + unmount → callback called, promise resolves after that PUT, `save` called
  once (`.finally` sees `queued && !dirty()` and settles the waiter without a second PUT).

## Step 4 – editor registers (`src/pages/RecipeEditor.tsx`)

- Pass `onUnmountFlush: (done) => { if (recipeId !== null) trackPendingSave(recipeId, done) }` to `useAutosave`.
- Unmount cleanups run before the next page's mount effects in the same commit, so the registration is in place before
  RecipeDetail/RecipeList/the editor itself (remount) issue their GET/search.
- "Fertig" path unchanged (AC5): it awaits `flush()`; the subsequent unmount finds nothing pending (or joins the same
  waiter), so nothing extra is registered/waited.

## Verification per acceptance criterion

| AC | How |
|----|-----|
| 1 registry, unmount flush registers per id | `useAutosave.test.ts`: `onUnmountFlush` called once with a promise on unmount when dirty / in flight; not called when clean; in-flight-not-dirty case (above); a StrictMode hook test asserts not called (nothing dirty/in flight at the simulated unmount; in RecipeEditor autosave is still disabled then).  |
| 2 getRecipe waits per id, search waits for all, no delay otherwise | `src/api/pendingSaves.test.ts` (REST mode forced via `vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))` before imports + `afterAll(vi.unstubAllEnvs)` — the #55 pattern; no `resetModules`, so test and `foodly` share one registry; fetch spy): fetch for GET `/recipes/5` not called until the tracked deferred settles; GET for another id goes out at once; search waits for any pending; with empty registry fetch is called synchronously (assert right after the call, no await; comment: relies on `rest.request` calling `fetch()` before its first await). Cap: fake timers, never-settling save → GET goes out after 10 s. |
| 3 (end-to-end) | `RecipeEditor.route.test.tsx` (real router): do NOT spy on `getRecipe`; force REST mode with the same `vi.hoisted` stubEnv pattern; stub `fetch` with a stateful fake whose PUT is a controllable deferred. Edit the title, leave via a link to `/recipes/5` rendered by a small reader route (reuse the file's `DetailStub` if it fits, else a `useRequest(() => foodly.getRecipe(5))` reader) without pressing Fertig; count GETs `/recipes/5` issued AFTER the unmount (the editor's own initial load is also one) — none until the PUT resolves, then one, and the new title shows. `resetPendingSaves()` in `afterEach`. Fails without the fix. |
| 3 unmount with pending PUT → later GET after PUT, new value | Integration test `src/api/pendingSaves.integration.test.ts` (commit 3, needs `onUnmountFlush`): `renderHook(useAutosave)` with `save = foodly.updateRecipe` over a stateful fetch fake with controllable deferreds and `onUnmountFlush → trackPendingSave(5, …)`; case A: idle debounce + unmount; case B: PUT in flight + queued edit + unmount. Then `foodly.getRecipe(5)` → GET issued only after the last PUT resolves and returns the newest name. |
| 4 failed PUT does not block GET | Same file: PUT rejects → GET goes out afterwards and resolves; `onFlushError` called once. |
| 5 Fertig unchanged, autosave tests green | Existing `useAutosave.test.ts` / `RecipeEditor.test.tsx` suites stay green (adjust only the unmount test that relied on the bare save call, if any). |

Plus: `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`. No visual check needed (no UI change; the wait shows the existing loading skeleton). Docs (CLAUDE.md conventions, as #79 did with `docs/superpowers/plans/2026-11-01-fertig-waits-for-save.md`):
- this plan committed as `docs/superpowers/plans/2026-11-03-reads-wait-for-pending-save.md`;
- CLAUDE.md Architecture `src/api/` list: add `pendingSaves.ts` (one line);
- `docs/architecture.md` §5 Routing: extend the existing line "Verlassen-Schutz via beforeunload + Flush bei Unmount" in German, e.g. "…; Lesezugriffe warten auf den laufenden Unmount-Save (`src/api/pendingSaves.ts`, max. 10 s; Requests starten in Effects, nicht im Render)". No new §1 line.

## Commit sequence

1. `docs: Plan zu #80` – plan file only.
2. `api: Registry für laufende Rezept-Saves, Lesezugriffe warten darauf (#80)` – pendingSaves.ts + index.ts + unit tests (`pendingSaves.test.ts`, no hook).
3. `Editor: Unmount-Flush meldet die ganze Save-Kette an die Registry (#80)` – useAutosave.ts, RecipeEditor.tsx + hook tests, integration test, route e2e test, CLAUDE.md + docs/architecture.md lines.
(No Co-Authored-By trailer.)

## Review log
- Review pass 1 (fresh subagent): no blocker. Major: docs claim wrong (#79 did commit a plan) → plan goes to docs/superpowers/plans, CLAUDE.md + architecture.md lines; AC3 not end-to-end through the editor → route test with fetch fake. Minors adopted: StrictMode wording, onFlushError "unchanged" (not "exactly once"), test reset for the registry + cap-timer cleanup test, in-flight-not-dirty invariant test, sync-fetch comment, effect-ordering condition in comment. Nit kept: same-id chaining (cheap, covers leave→return→leave).
- Review pass 2 (fresh subagent): no blocker. Major: REST mode was assumed, not forced → `vi.hoisted(() => vi.stubEnv('VITE_MOCK',''))` (#55 pattern), no resetModules (shared registry). Minors adopted: commit order (integration tests move to commit 3), reset named `resetPendingSaves` with "Tests only" + explicit afterEach in route test, docs line goes into architecture.md §5 instead of §1, update flush() invariant comment, count GETs after unmount in e2e. Nits: disabled-in-flight comment added; redundant RecipeEditor.test registration test dropped.
