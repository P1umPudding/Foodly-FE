# #112 Rezeptliste: Nachladen mit Fehlerzustand und Statusansage

> Issue #112 (Folge aus der Design-Review von #110). Plan: `docs/superpowers/plans/2026-11-11-load-more-error.md`.

## Problem
1. Schlägt das Nachladen einer Folgeseite fehl, setzt `useRecipeSearch` den Cursor auf `null`. Die Liste gilt dann als vollständig und zeigt eine exakte Zahl („14 Rezepte“ statt „14+“) oder sogar „Keine Treffer für die aktuellen Filter.“, obwohl Seiten fehlen. Das verletzt docs/design.md §5 (Fehler: inline `Alert` mit „Erneut versuchen“).
2. Während bei 0 sichtbaren Zeilen weitergeladen wird (Skelett `list-pending-skeleton`) und beim Nachlade-Skelett gibt es keine Ansage für Screenreader.

## Soll
- `loadMore`-Fehler: `hasMore` bleibt wahr (Zahl bleibt „N+ Rezepte“, kein „Keine Treffer“). Unter der Liste, an der Stelle des Nachlade-Skeletts, ein postxl `Alert` (variant wie der bestehende Lade-Fehler in `RecipeList.tsx`) mit „Weitere Rezepte konnten nicht geladen werden.“ + Button „Erneut versuchen“ (`variant="outline"`, `size="sm"`). Kein automatisches Endlos-Retry über den Sentinel, solange der Fehler steht.
- Ein `sr-only` `role="status"` (`aria-live="polite"`) in `RecipeList.tsx`: „Weitere Rezepte werden geladen …“ während `loadingMore` bzw. Pending-Skelett; sonst leer. Die sichtbare Trefferzahl bleibt ohne live-region (sonst Ansage bei jeder Seite).

## Akzeptanzkriterien
1. Test: Seite 2 schlägt fehl → kein „Keine Treffer“, Zahl mit „+“, Alert mit „Erneut versuchen“ sichtbar.
2. Test: „Erneut versuchen“ lädt Seite 2; danach verschwindet der Alert.
3. Test: während des Nachladens enthält `role=status` „Weitere Rezepte werden geladen …“.
4. Lokale Checks grün (build, test, format:check).

## Non-goals
- Kein Auto-Retry, keine Änderung am Fehler der ersten Seite.

## Annahmen (Worker)
1. State lives in `useRecipeSearch`: new `loadMoreError: Error | null` and `retryLoadMore()`. On a failed `loadMore` the cursor is kept (`hasMore` stays true), `loadMoreError` is set. `loadMore` is a no-op while `loadMoreError` is set (prevents sentinel auto-retry loop, since a fresh IntersectionObserver re-reports the visible sentinel). Only `retryLoadMore` clears the error and refetches the same cursor.
2. `loadMoreError` resets on query change / `reload` (same effect that resets everything); stale failures from an older epoch are ignored.
3. UI: reuse `RetryAlert` (destructive, outline/sm button "Erneut versuchen") with title "Weitere Rezepte konnten nicht geladen werden." and `error.message` as body; rendered below the list, full width, `pt-3`, at the spot of the load-more skeleton.
4. During a retry the Alert is hidden and the load-more skeleton + status text show; a repeated failure brings the Alert back.
5. 0 visible rows + loadMore error: no pending skeleton, Alert shown, no "Keine Treffer"/"Noch keine Rezepte". Count stays the invisible "0+" placeholder (ResultCount behaviour unchanged); AC1's "Zahl mit +" is tested with ≥1 visible row.
6. Status region: always mounted `sr-only` `role="status"` `aria-live="polite"`; text "Weitere Rezepte werden geladen …" when `(listReady && loadingMore) || (pending && visible.length === 0 && !loadMoreError)`, else empty. First-page loading gets no announcement (non-goal).
7. Docs: update CLAUDE.md error note (failed loadMore keeps paging state + retry), add a line in docs/architecture.md if it describes useRecipeSearch errors, align docs/qa/checklist.md:19 ("N Rezepte"/"N+ Rezepte") and add the reload-error check. Design reference is docs/design.md §5 (errors), not §6.
8. Checks: all five from CLAUDE.md (ci, build, test, format:check, lint).
