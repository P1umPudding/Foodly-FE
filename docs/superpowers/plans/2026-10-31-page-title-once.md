# Plan: #42 Seitentitel nur einmal

The shell header (`routeTitle`) shows the page title; List and Editor also had a big visible `h1` with the same text.

Variant: the page keeps its single `h1`, but as `sr-only` on List and Editor. The shell header stays a plain span (look unchanged). Detail (recipe name as visible `h1`) and NotFound are unchanged.

## Steps
- `src/pages/RecipeList.tsx`: `h1` „Rezepte“ → `sr-only`, same place in the sticky header (present in every list state).
- `src/pages/RecipeEditor.tsx`: one `sr-only` `h1` („Neues Rezept“ / „Rezept bearbeiten“) in every state (loading, error, „Kein Zugriff“, ready); the visible title row and its loading skeleton go.
- Comments in `AppShell.tsx` and `ResultCount.tsx` updated.
- `src/App.pageTitle.test.tsx`: AppShell + real pages. Title once in the header, page `h1` is `sr-only` (jsdom has no CSS); exactly one `h1` per page and state.

## Out of scope
Detail has no `h1` while loading / on error (detail redesign). List header layout (now only the result count next to the filter button) is left to the list-header issue.
