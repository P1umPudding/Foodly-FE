> Spec: `docs/superpowers/specs/2026-11-11-load-more-error-design.md`.

# Plan: #112 Rezeptliste – Nachladen mit Fehlerzustand und Statusansage

## Step 1 – Hook: keep paging state on loadMore failure (`src/hooks/useRecipeSearch.ts`)
- New state `loadMoreError: Error | null` (reset to `null` in the query/nonce effect together with the rest).
- Extract the page fetch into `const fetchPage = useCallback((page: number) => {…}, [key])` (same `eslint-disable-next-line react-hooks/exhaustive-deps` pattern as the existing callbacks; no suppressions file change), used by both callbacks (epoch check as today). It sets `loadingMore(true)` itself:
  - success: append items, set cursor;
  - failure: `if (mine === epoch.current) setLoadMoreError(toError(e))`; cursor is **kept** (so `hasMore` stays true);
  - finally: `setLoadingMore(false)` (epoch-guarded).
- Remove today's `setCursor(null)` catch. The `eslint-disable-next-line react-hooks/exhaustive-deps` stays only on `fetchPage` (uses `query`); remove it from `loadMore` and don't add one to `retryLoadMore` (deps `[loadMoreError, cursor, loadingMore, fetchPage]`) — `reportUnusedDisableDirectives` is an error.
- `loadMore` deps `[cursor, loadingMore, loadMoreError, fetchPage]`: returns early also when `loadMoreError !== null` (no auto-retry by the sentinel, whose fresh observer re-reports a visible sentinel each time `loadMore` changes identity).
- New `retryLoadMore`: no-op unless an error stands and `cursor !== null` and not loading; clears the error and calls `fetchPage(cursor)` in the same handler (batched with `setLoadingMore(true)`, so the sentinel's fresh observer after re-subscription hits the `loadingMore` guard — no double fetch).
- Extend `RecipeSearchResult` with `loadMoreError` and `retryLoadMore`. Add one 'why' line to the hook header about the sentinel loop.
- Tests in `src/hooks/useRecipeSearch.test.ts`:
  - page 2 fails → `hasMore` true, `loadMoreError.message`, `loadingMore` false, recipes unchanged; `loadMore()` again → no extra call;
  - `retryLoadMore()` → same cursor requested (assert call args page 2), items appended, error cleared;
  - stale failure after a query change is ignored (error stays `null`); a query change (`rerender` with new props) and `reload()` both reset an existing error.

## Step 2 – Page: alert, skeleton gating, status region (`src/pages/RecipeList.tsx`)
- `const loadMoreFailed = listReady && search.loadMoreError !== null`.
- Pending skeleton (`list-pending-skeleton`) only when `pending && visible.length === 0 && !loadMoreFailed` (A5).
- Sentinel effect: unchanged logic (the hook guard is the single mechanism, so the page test really exercises it); update its comment (paging pauses while a load-more error stands).
- Below the sentinel, at the LoadMoreSkeleton spot: when `loadMoreFailed && !search.loadingMore`, render
  `<div className="pt-3"><RetryAlert title="Weitere Rezepte konnten nicht geladen werden." message={search.loadMoreError?.message} onRetry={search.retryLoadMore} /></div>` (full width, also in grouped/tiles; A3).
  LoadMoreSkeleton condition unchanged (during retry `loadingMore` is true and error cleared → skeleton shows, A4).
- Status region, always mounted, inside the list container:
  `<p role="status" aria-live="polite" className="sr-only">{loadingAnnounced ? 'Weitere Rezepte werden geladen …' : ''}</p>`
  with `loadingAnnounced = (listReady && search.loadingMore) || (pending && visible.length === 0 && !loadMoreFailed)` (A6). ResultCount untouched.
- Empty texts: unchanged (`allLoaded` is false while hasMore stays true, so "Keine Treffer" can't appear).

## Step 3 – Page tests (new `src/pages/RecipeList.loadMore.test.tsx`)
Reuse the setup pattern of `RecipeList.search.test.tsx` (CatalogProvider mock, `renderList('/recipes?group=0')`, capturing IntersectionObserver via `vi.stubGlobal`, `listCategories` → `[]`).
- AC1: page 1 = 1 recipe, cursor 2; intersect; page 2 rejects → alert text „Weitere Rezepte konnten nicht geladen werden.“ + button „Erneut versuchen“; count reads „1+ Rezepte“ (no „Keine Treffer“ is asserted in the 0-visible case); firing the latest captured observer callback again does not call `searchRecipes` a third time (a fresh observer is created after the failure because `loadMore` changes identity, so this exercises the hook guard).
- AC2: click „Erneut versuchen“, page 2 resolves (cursor null) → second recipe visible, alert gone, count „2 Rezepte“; page 2 retry is a deferred promise; fire `intersect` in the same `act` right after `fireEvent.click`, before resolving it → total calls stay 3; then resolve.
- AC3: page 2 pending → `getByRole('status')` has „Weitere Rezepte werden geladen …“; after it resolves the status is empty.
- 0-visible case (use the existing `FiringIO` pattern from `RecipeList.search.test.tsx` ~l.563, which fires on every observe, so a missing hook guard would loop; assert `searchRecipes` stays at 2 calls): search term matching none of page 1 (`?group=0&q=…`, CapturingIO + manual `intersect`, two `Once` mocks), page 2 rejects → alert shown, no `list-pending-skeleton`, no „Keine Treffer“; while pending, status text is announced.

## Step 4 – Docs
- `CLAUDE.md` errors bullet: "in `useRecipeSearch` the first page sets the error state; a failed `loadMore` keeps the cursor and sets `loadMoreError` (paging pauses until `retryLoadMore`)".
- `docs/architecture.md:75`: append the same short note.
- `docs/qa/checklist.md:19`: „Ergebnisanzahl („N Rezepte“, „N+ Rezepte“ solange Seiten ausstehen)“ and add „Nachladefehler mit Erneut-versuchen“.
- `docs/design.md` §5 Fehler: at most one clause (failed reload: Alert inline under the list).
- Feature notes: `docs/superpowers/specs/2026-11-11-load-more-error-design.md` (short, from spec.md) and `docs/superpowers/plans/2026-11-11-load-more-error.md` (this plan) per docs conventions.

## Step 5 – Checks & visual
- Focus on retry: the Alert unmounts during the retry, focus falls to body — same as the existing first-page RetryAlert; accepted and mentioned in the PR (status region announces the loading).
- After `npm ci`, check whether postxl `Alert` renders `role="alert"`; if not, note in the PR that the failure itself is announced only via focusable Alert content (no second live region); also confirm `getByRole('status')` is unique on the page (else query within the status element by testid).
- `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format` then `format:check`, `npm run lint` (no new suppressions).
- Visual check (light/dark, list + tiles, grouped): Chrome MCP if available in the session; otherwise state in the PR that it was not done visually and rely on tests.

## Commits (no AI trailer)
1. `useRecipeSearch: keep paging state on loadMore failure, add retryLoadMore` (+ hook tests)
2. `RecipeList: inline retry alert and status announcement for loading more` (+ page tests)
3. `docs: load-more error state, QA checklist count wording` (+ spec/plan notes)

## Review log
- Review pass 1 (fresh subagent): 0 blocker, 2 major (page test wouldn't exercise the hook guard because of the page-level sentinel guard → page guard dropped; inner fetch function vs exhaustive-deps → `fetchPage` useCallback, remove setCursor(null) catch), 5 minor (retry/sentinel batching invariant + test, comment updates, Alert role check, 0-visible test setup, reset tests incl. reload) — all applied; nits noted.
- Review pass 2 (fresh subagent): 0 blocker, 0 major, 4 minor (unused eslint-disable on loadMore → removed; 0-visible test via FiringIO to exercise the loop; focus loss on retry accepted/documented; AC2 intersect before resolving deferred retry) — all applied; nits (Alert condition kept, AC1 'Keine Treffer' moved to 0-visible case, status role uniqueness check) applied.
