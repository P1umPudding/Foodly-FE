# Plan: #69 „Fertig“ wartet auf den ausstehenden Save (PUT/GET-Race)

Spec: `.git/agent-work/spec.md` (AC1-AC5, assumptions A1-A8).

## Step 1 — `flush()` in `useAutosave` (`src/editor/useAutosave.ts`)

- Return `{ status, retry, flush }`; `flush: () => Promise<void>`, stable (`useCallback`).
- New refs: `waiter` (one shared deferred `{ promise, resolve, reject } | null`; concurrent flush calls get the same promise), `lastAttempt` (`{ value, error } | null`, set in `run()` `.then`/`.catch`).
- `flush()`:
  - resolves immediately when `!enabledRef.current`, or `!inFlight.current && !dirty()` (AC4). Does not look at `timer.current` (the debounce cleanup leaves a stale id there).
  - otherwise clears the debounce timer **and nulls the ref**, creates/reuses the deferred, and calls `run()` when nothing is in flight. When a save is in flight it only waits. Invariant (short why-comment): waiter set ⇒ a flight is running (`run()` sets `inFlight` synchronously; the unmount cleanup's direct-save path cannot run while a waiter exists), so `.finally()` always settles it.
- `lastAttempt.value` is `pending` (the value actually sent), never `latest.current` read later.
- Settling goes through a `settle()` helper that takes the deferred, sets `waiter.current = null`, then resolves/rejects — so a later flush (e.g. Fertig again after a failure) gets a fresh promise.
- In `run()`'s `.finally()`: after the existing `queued` branch, when no follow-up started and a waiter exists (also after unmount — the `await` must not leak):
  - `!enabledRef.current` -> resolve (no PUT while disabled, even with a newer edit);
  - `!dirty()` -> resolve (AC1, AC2: only the last save of the chain counts);
  - dirty and `lastAttempt` failed on exactly `latest.current` -> reject with that error (AC3);
  - otherwise (newer edit than the last attempt, A2) -> clear + null the timer, `run()`.
  No timer branch -> no loop on a stale timer id; a failure ends the chain unless there is a newer value.
- Unmount flush untouched (AC5). `retry()` unchanged (mid-flight retry only queues one extra PUT — acceptable).

## Step 2 — "Fertig" button (`src/pages/RecipeEditor.tsx`)

- Take `flush` from `useAutosave`.
- `finishing` state + `alive` ref with StrictMode-safe effect: `useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])` (A4).
- `finish()`: `setFinishing(true)`; `await flush()`; if `alive.current` -> `navigate(\`/recipes/${recipeId}\`)`. Rejection is swallowed (the existing `SaveStatusIndicator` shows "Nicht gespeichert" + "Erneut versuchen", A6; after unmount the hook's `onFlushError` toast stays as today, AC5). `finally`: reset `finishing` if still alive.
- Replace `<Button asChild><Link>Fertig</Link></Button>` with `<Button className="gap-1.5" onClick={finish} disabled={finishing} aria-busy={finishing}>` with `Loader2` (`h-4 w-4 animate-spin`) while finishing; label stays "Fertig" (A5). postxl `Button`, Tailwind only.

## Step 3 — Tests

`src/editor/useAutosave.test.ts` (fake timers; attach `.catch`/`rejects` before triggering failures; several `await act(async () => {})` hops per `.then/.catch/.finally`):
- flush with nothing pending resolves, no save (AC4).
- flush during debounce saves the newest value now; resolves only after the save resolves (AC1, hook level).
- flush while in flight with a queued edit -> resolves after the follow-up; exactly 2 saves, never overlapping (AC2).
- flush rejects when the save fails; status `error`; `retry()` afterwards saves (AC3).
- first save fails, queued follow-up succeeds -> resolves.
- edit typed while waiting is folded in (third value saved before resolve, A2).
- fail, then flush again, success -> the second flush resolves (fresh deferred).
- revert-to-baseline edit (stale timer id) then flush -> resolves without save/loop.
- disabled -> resolves without save; disabling while waiting with an edit typed during the flight -> resolves, no extra save.
- flush under `<StrictMode>` resolves.
- existing unmount-flush tests stay green (AC5).

`src/pages/RecipeEditor.route.test.tsx` (real router, **real timers**, stub `/recipes/:id` route element that calls `foodly.getRecipe` and renders the name; in-memory "server" record updated only when the deferred `updateRecipe` resolves; `getRecipe` resolves at once with the current record):
- AC1: edit title, click Fertig at once -> button disabled + aria-busy, stub not rendered, `getRecipe` called only once (editor load); resolve PUT -> stub shows new title.
- AC2: let the debounce fire (slow PUT 1), type again, click Fertig, resolve PUT 1 -> second `updateRecipe` with the newest title, no navigation until PUT 2 resolves.
- AC3: `updateRecipe` rejects -> stays on editor, "Nicht gespeichert" + "Erneut versuchen" visible, button enabled again; click Fertig again with a succeeding PUT -> detail shows the new title.
- AC4: no edit -> Fertig navigates, `updateRecipe` not called.
- A4: while Fertig waits, click another link; resolve PUT -> stays on the other route.
`RecipeEditor.test.tsx` needs no change (no Fertig references).

## Step 4 — Verification

- `npm run build`, `npm test -- --passWithNoTests`, `npm run format` / `format:check`.
- Visual check: Chrome is not available in this container (issue note: libglib missing); try the Chrome MCP if present, otherwise state in the PR that the browser check is still open and the behaviour is covered by the route test with delayed PUT.

## Commits

1. `fix(editor): add flush() to useAutosave that waits for the pending save` (+ hook tests)
2. `fix(editor): Fertig waits for the pending save before navigating (#69)` (+ route tests)
3. `docs: plan for #69` — copy plan to `docs/superpowers/plans/2026-11-01-fertig-waits-for-save.md` (as earlier pipeline PRs did).
4. `chore: format` only if prettier changes something.

No Co-Authored-By trailer.

## Out of scope (note in PR)

Race on other navigation paths (sidebar, back) remains (A7); Ctrl-click on Fertig no longer opens a new tab (A5).

## Review log

- Review pass 1 (fresh subagent): 0 blocker, 3 major, 6 minor, 3 nit. Fixed: settling no longer depends on the stale `timer.current` (loop risk) — decided via `lastAttempt`; StrictMode-safe `alive` ref; AC1 route test uses a stub detail + in-memory server with deferred PUT and real timers. Adopted minors: waiter invariant comment, settle after unmount, enabled-toggle + StrictMode tests, retry note, rejection-test hygiene, plan copied to docs/superpowers/plans; nits: single shared deferred, `gap-1.5`.
- Review pass 2 (fresh subagent, scenario trace a-i): 0 blocker, 2 major, 4 minor, 2 nit. Fixed: waiter nulled on settle (Fertig after failure), `!enabled` -> resolve before the dirty check (no PUT while disabled); `lastAttempt.value = pending`; route tests for AC2 and Fertig-after-failure; invariant comment wording. Accepted as harmless: rare duplicate PUT when a save resolves between render and effect (scenario i).
