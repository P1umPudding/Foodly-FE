# Phase 5 — Dashboard & App Restructure — Design (rev. 2)

Status: revised design, pre-plan. Replaces the 2026-07-07 version.
Date: 2026-10-28.
Related: `docs/plan.md` (Phase 5), `docs/phases/phase-2-organisation-navigation.md`,
`docs/backend-questions.md`, `docs/decisions/0001-rest-transport.md`.

## Why a revision

The first version was written on 2026-07-07 and merged on 2026-10-27 (PR #11) without being
re-checked. Since then:

- The app talks REST (`src/api/rest.ts`, ADR 0001); mocks are a dev/preview mode only.
- The Phase 4 editor is live at `/recipes/new` and `/recipes/:id/edit`.
- The backend already returns `createdAt` / `updatedAt` on recipes (G1).
- Groups have no endpoints yet (backend #13) and their recipe model is undecided (B12).

This revision drops what is blocked, uses what now exists, and simplifies where the old plan
duplicated existing machinery.

## Problem

The app has the recipe list at `/`, plus detail and editor routes. The list *is* the home
screen, and the `Nav` has no concept of app sections. Phase 5 wants a **Dashboard as the landing
screen**. That forces a top-level restructure: where the list moves, and what the primary
navigation is.

Phases 6–7 (mobile, native wrap) mean the navigation shell must work on mobile from day one.

## Decisions

- **Scope:** new navigation shell + IA, plus a light cohesion pass on existing screens (no logic
  rewrite).
- **Nav destinations:** **Home · Recipes · +Create**. Groups is hidden until unblocked (see
  Blocked). Categories are reachable from the Dashboard and the list filters, not a tab.
- **+Create:** a plain link to the existing editor `/recipes/new`. No menu; it becomes one once
  categories or groups can be created in the FE.
- **Responsive shell:** one `NAV_DESTINATIONS` definition.
  - Mobile (`<md`): fixed bottom tab bar, Create as a centre "+".
  - Desktop (`md+`): tabs inside the existing header, no left rail (three items do not justify
    one). Switching to a rail later, once Groups/Categories grow the nav, is a layout change only.
- **Connection dot removed from the header.** It shows WebSocket status labelled "Backend", which
  is misleading in REST mode. The component stays in the code and returns with socket-based live
  editing.

## Blocked (not in this phase until decided)

| Feature | Waiting on |
|---|---|
| Groups tab, `/groups`, `/groups/:id`, "My groups" tile | B12 (group ↔ recipe model, decision) and backend #13 (groups endpoints) |
| "Recently added to you" tile | backend #14 (B6, `added_at` / `myAccessSince`) |

No stand-ins: in particular no id-order proxy for "recently added", because a recipe id says when
it was created, not when it was shared with the viewer.

## Routing

`src/App.tsx`:

| Route | Screen | Status |
|---|---|---|
| `/` | Dashboard | new |
| `/` with list params | redirect to `/recipes?…` (same params) | new |
| `/recipes` | Recipe list (moved from `/`) | moved |
| `/recipes/new` | Recipe editor | unchanged |
| `/recipes/:id` | Recipe detail | unchanged |
| `/recipes/:id/edit` | Recipe editor | unchanged |
| `*` | NotFound | unchanged |

**Legacy list URLs.** The list keeps its state in the URL (`src/list/url.ts`). If `/` is opened
with any list param (`cat`, `tag`, `ing`, `dmax`, `role`, `collab`, `q`, `sort`, `dir`, `view`,
`group`), it redirects to `/recipes` with the same query string, so bookmarks and shared links keep
working. Plain `/` shows the Dashboard. The Dashboard has no filters of its own.

**No `/categories/:id` route.** Category links go to `/recipes?cat=<id>`, the existing URL filter.

## App shell

New `AppShell` component wrapping `<Routes>`, replacing today's bare `<Nav> + <main> + <Footer>`.
It owns:

- **`NAV_DESTINATIONS`** — single source of truth: `{ icon, label, path }` for Home, Recipes,
  +Create.
- **Desktop:** header = wordmark · tabs · (search, timers, theme toggle on the right).
- **Mobile:** bottom tab bar; header shrinks to wordmark + search.
- Active-route highlighting via `NavLink`.

The Phase 2 filter rail and category sidebar stay **inside `/recipes`**; they are list controls,
not app navigation. Timers stay app-global.

**Migration risk:** `/recipes` inherits the scroll-restore and sticky-header measurement logic that
assumed it lives at `/`, and the header height changes because the tabs move into it. The sticky
offsets must be re-verified (see Testing). This is the riskiest part of the phase.

## Dashboard (`/`)

Responsive tile grid (1 col mobile → 2 tablet → 3 desktop). Each tile: heading, short body,
"see all →" link. Tiles with nothing to show hide themselves.

- **My categories** — the user's `UserCategory` list as coloured chips/rows (Phase 2 colour
  tokens), each linking to `/recipes?cat=<id>`. No "+" button: the FE cannot create categories.
- **Your recent creations** — the user's own recipes, newest first by real `createdAt`.
  "See all" links to the list filtered to own recipes.
- **Jump back in** — recipes whose detail was most recently opened, from a local recently-viewed
  store (no backend). Shows the last N.

**Recent creations — sorting.** `POST /recipes/search` cannot sort by `created_at` (only name, work
time, total time, rating; anything else falls back to `id ASC`). For now the FE loads the user's
own recipes and sorts them client-side. This sits behind one helper (e.g.
`recentCreations(n)`), so switching to a server-side sort later changes only the helper's body.
Backend issue: [#16](https://github.com/klassenserver7b/Foodly-backend/issues/16) (B15).

## Recipe list (`/recipes`)

Unchanged logic. Additions:

- When **exactly one** category is filtered, the header shows that category's name in its colour.
  The filter stays removable and combinable like any other.
- Header realigned to the new shell (see Cohesion pass).

## Cohesion pass (existing screens, no logic changes)

- **`PageHeader`** — shared scaffold (title + optional subtitle/colour + right-aligned actions
  slot), used by the Dashboard and the list. Groups will reuse it later.
- **`Tile`** — one card look for the Dashboard tiles. Prefer a `@postxl/ui-components` primitive;
  otherwise one thin local wrapper.
- **List header realignment** — required, not optional: header height and sticky offsets change
  with the tabs in the header. This is the one place that touches the sticky-measurement code.
- **Detail and editor** — unchanged visually; they inherit the shell chrome only.

## Data / API additions

- **`protocol.ts`:** add `createdAt` and `updatedAt` (ISO 8601 strings) to `Recipe` and
  `RecipePreview` (G1). The backend returns both on `GET /recipes/{id}` and in search results;
  `updatedAt` changes only on content edits.
- **Mocks:** mock recipes get `createdAt` / `updatedAt` values so the Dashboard works in mock
  mode.
- **Recently-viewed store** (`localStorage`, per user): `/recipes/:id` pushes its id on view;
  "Jump back in" reads the last N. Same family as `src/list/persistence.ts`.
- **`recentCreations` helper** — client-side `createdAt` sort now, server-side sort later.
- No groups API or mock groups in this phase.

## Testing

Repo pattern: pure logic unit-tested, components smoke-tested (vitest).

- **Unit:**
  - redirect from `/` with list params to `/recipes` (params preserved, plain `/` not
    redirected)
  - `recentCreations` sort by `createdAt`
  - recently-viewed store
  - category heading shown only when exactly one `cat` filter is set
- **Smoke:**
  - shell renders both nav modes (header tabs, bottom bar)
  - Dashboard tiles show/hide correctly
  - +Create opens the editor
- **Visual (required):** list sticky offsets line up under the new header. Via Chrome MCP if QA's
  Chrome works by then; otherwise a manual check by a person in the Skaile preview before merge.

## Out of scope / later

- Groups (blocked; see above).
- "Recently added to you" tile (blocked on backend #14).
- **"At a glance" tile** (counts: visible recipes, shared with you, categories, groups) —
  later option, once Groups is unblocked.
- Left rail on desktop — later, if the nav grows.
- Category creation in the FE.
- Connection dot / any backend health indicator — returns with live editing.

## Follow-ups

- **Backend:** `created_at` / `updated_at` as sort fields in `POST /recipes/search` —
  filed as [#16](https://github.com/klassenserver7b/Foodly-backend/issues/16) (B15).
- **Plan:** the 2026-07-07 M1 plan was dropped; implementation issues come from the Lead's
  breakdown of this spec.
