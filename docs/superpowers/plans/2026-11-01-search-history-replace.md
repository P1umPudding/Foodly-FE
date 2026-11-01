# Plan: #68 Listensuche ersetzt den Verlaufseintrag statt pro Tastendruck zu pushen

Spec: issue #68 (acceptance criteria AC1–AC4).

## Step 1 — `setSearch` in `useListState` (`src/list/useListState.ts`)

- Move `set`'s body into a private helper `apply(patch, replace: boolean)` (`useCallback`): merge into `fromSearchParams(params)`, then `savePersisted`, then `setParams(next, { replace })`. `set(patch)` = `apply(patch, false)`. Its public signature and every caller stay untouched, so they keep pushing. Persistence is unchanged (AC3).
- Stale `params` is not a risk: input changes are discrete events, so React 18 re-renders before the next keystroke. react-router-dom is ^6.26 without `v7_startTransition`. No refs needed.
- New `setSearch(search: string)`, returned alongside `state/set/clear` (return type extended). It marks the history entry it creates via router location state `{ listSearch: true }` (constant `SEARCH_ENTRY_STATE` in the hook file). `useLocation()` is added to the hook. Decision:
  - current entry is a search entry (`location.state?.listSearch === true`) → **replace**, keep the marker. This covers further keystrokes, clearing, and retyping after a clear. So clear + retype never piles up duplicates.
  - otherwise, next AND current search blank → **replace** without a marker. The URL is identical anyway, since blank `q` is dropped by `toSearchParams`. This avoids pushing a no-op entry and never marks a filter entry as a search entry. Clearing a linked, unmarked `?q=` pushes (with marker), so Back still reaches the linked search.
  - otherwise → **push** with the marker. This is the start of a search: exactly ONE new entry, even when the URL already has `q` from a deep link.
  - `apply` gets an optional `state` argument that is passed through to `setParams(next, { replace, state })`. Location state is safe: the only other reader is `isShellNav` (`nav.ts:58`), which checks `shellNav === true`. A replace drops shell-nav state just as every `set()` push already does.
  - Why-comment, 1–2 lines: Back after typing should land on the state before the search, not on each letter, and must not overwrite the preceding filter entry.
  - Known trade-off (accepted): clearing keeps the search entry, now showing the pre-search URL. So the stack holds that state twice, and one Back after clearing changes nothing visible. Retyping reuses that entry, so there is at most one such duplicate per search session. Mention this in the comment and in the PR.
- Deps: `apply` `[params, currentUserId, setParams]`, `set` `[apply]`, `setSearch` `[location.state, apply]`, `clear` unchanged (`[params, set]`).
- `clear()` unchanged (still pushes).
- The policy lives in the hook, not in `SearchInput` (shared with tag/ingredient field searches). It is testable without the page.

## Step 2 — call site (`src/pages/RecipeList.tsx`)

- Take `setSearch` from `useListState()`. Change the page search to `onChange={setSearch}`. That is the only change. `ListToolbar`, `ActiveFilters` and the filters keep `set`/`clear`.
- `SearchInput.tsx` stays unchanged.

## Step 3 — tests (`src/list/useListState.test.tsx`)

Use the existing pattern: `renderHook` with `{ list: useListState(), navigate: useNavigate(), type: useNavigationType() }`, and a `MemoryRouter` with `initialEntries` + `initialIndex` (extend the `wrapper` helper with an optional index).

1. **AC1/AC2:** start at `['/other', '/?cat=1']`, index 1.
   - `set({ tags: ['Vegan'] })` (push), then `setSearch` with `p`, `pa`, `pas`, `past`, `pasta`, each in its own `act`. Expect `state.search === 'pasta'`.
   - `navigate(-1)` → `search === ''`, tags `['Vegan']`, categories `[1]`.
   - `navigate(-1)` again → categories `[1]`, tags `[]`. So the chip entry still exists and was not overwritten.
   - `navigate(-1)` a third time → `/other` (categories `[]`). This proves no per-letter entries remain anywhere in the stack.
2. **Replace type:** after the 2nd keystroke `useNavigationType()` is `'REPLACE'`. After the first keystroke it is `'PUSH'`.
3. **Clear + retype:** start at `['/other', '/?cat=1']`, chip push (tags Vegan), type `pasta`, `setSearch('')` (`'REPLACE'`, search `''`), type `n`, `nu`, `nudel`.
   - `navigate(-1)` → search `''`, tags Vegan. That is the single remaining pre-search entry: the search entry was reused, so no duplicate was added.
   - `navigate(-1)` → no tags.
   - Also: after clear without retyping, the first Back shows the same state and the second removes the chip. This documents the accepted single duplicate.
4. **Blank input + deep link:** `setSearch('  ')` on a non-search entry → `'REPLACE'`. A following `setSearch('p')` still pushes, because the blank replace set no marker. Starting from a `?q=pas` deep link, `setSearch('pas')` pushes once and the next keystroke replaces.
5. **Filters still push (AC2):** `set({ sortKey: 'rating' })` → `'PUSH'`, and `navigate(-1)` restores the previous sort.
6. **AC3:** the existing `set() updates state and persists` / hydration / nav-link tests stay green. Add an assertion that after `setSearch` the tags are still persisted in localStorage.
7. Read `result.current.list.setSearch` fresh inside each `act` (never destructure it once), because every render makes a new callback.

No page-level test: the hook tests cover AC4. The call-site change is one line.

## Step 4 — verification

- `npm run build`, `npm test -- --passWithNoTests`, `npm run format` (then `format:check`).
- Browser re-check (issue asks for it): Chrome MCP per CLAUDE.md, if available in this container. The QA container lacked Chrome. If unavailable, say so in the PR, and give the manual steps (`/recipes`, chip, type "pasta", Back ×2).

## Step 0 / 5 — docs + commits

- Step 0: copy this plan (without the review log) to `docs/superpowers/plans/2026-11-01-search-history-replace.md`. Earlier pipeline PRs commit their plan there (CLAUDE.md docs conventions).
- Commits (German subject, no Co-Authored-By/AI trailer):
  1. `docs: Plan für #68 (Listensuche ohne Verlaufseintrag pro Tastendruck)` (plan file, Step 0)
  2. `Listensuche: Tippen ersetzt den Verlaufseintrag statt pro Buchstabe zu pushen (#68)` (hook + call site + tests)

