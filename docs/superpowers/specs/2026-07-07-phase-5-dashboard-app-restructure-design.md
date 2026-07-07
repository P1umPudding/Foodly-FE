# Phase 5 — Dashboard & App Restructure — Design

Status: approved design, pre-plan.
Date: 2026-07-07.
Related: `docs/plan.md` (Phase 5), `docs/phases/phase-2-organisation-navigation.md`.

## Problem

The app today has exactly two routes — `/` (recipe list) and `/recipes/:id`
(detail). The list *is* the home screen, and the `Nav` has no concept of app
sections. Phase 5 wants a **Dashboard to become the landing screen** (tiles for
categories, groups, recent recipes). That forces a top-level restructure:
where does the list move, what is the primary navigation, and how do categories
and groups become real destinations instead of just list filters?

Phases 6–7 (mobile, native wrap) mean the navigation shell must survive contact
with mobile from day one.

## Decisions (locked)

- **Scope:** new navigation shell + IA, plus a *light* cohesion pass on the
  existing list/detail screens (no logic rewrite). Not a ground-up rethink.
- **Mobile posture:** build a **responsive shell now** — one nav definition that
  renders as a desktop left rail and a mobile bottom tab bar. Phase 6 becomes
  polish, not a rebuild.
- **Nav pattern:** **Option A — compact tab set.** Top-level destinations are
  **Home · Recipes · Groups · +Create**. Categories are reachable (dashboard
  tiles + a section inside Recipes) but are **not** a top-level tab. This keeps
  the bottom bar within its ~3–5 item sweet spot and can graduate to a
  "living sidebar" later if category/group counts grow.

## Milestone split

The shell is fully buildable now with mocks. Phase 5's two headline recency
tiles are the exact things blocked on backend timestamps (`createdAt`,
per-viewer "added-at").

- **Milestone 1 (no backend):** the whole shell + all routes + moving the list
  + Categories/Groups screens + all dashboard tiles (the two recency tiles use a
  swappable mock-order proxy — see below).
- **Milestone 2 (backend-blocked):** swap the recency tiles' ordering from the
  mock proxy to real timestamps. One-line change behind a seam; no UI change.

## Routing

`src/App.tsx`:

| Route | Screen | Status |
|---|---|---|
| `/` | Dashboard (new) | new |
| `/recipes` | Recipe list (moved from `/`) | moved |
| `/recipes/:id` | Recipe detail | unchanged |
| `/categories/:id` | List pre-scoped to a category | new (thin) |
| `/groups` | Groups overview | new |
| `/groups/:id` | Single group + its recipes | new |
| `/recipes/new`, `/recipes/:id/edit` | Phase 4 — reserve paths, don't build | later |

## App shell

New `AppShell` component wrapping `<Routes>`, replacing today's bare
`<Nav> + <main> + <Footer>`. It owns:

- **`NAV_DESTINATIONS`** — single source of truth: `{ icon, label, path }` for
  Home, Recipes, Groups, +Create.
- **Desktop (`md+`):** slim left rail rendering those destinations; header keeps
  global search / timers / connection dot / theme toggle.
- **Mobile (`<md`):** fixed **bottom tab bar** rendering the same array (Create
  as a center "+"); header shrinks to wordmark + search.
- Active-route highlighting via `NavLink`.

The Phase 2 filter rail and category sidebar stay **inside `/recipes`** — they
are list controls, not app navigation. Timers stay app-global (already are).

**Migration risk:** `/recipes` inherits the scroll-restore and sticky-header
measurement logic that currently assumes it lives at `/`. The move is
mechanical; verify sticky offsets still line up under the new shell (Chrome MCP
visual check).

## Dashboard (`/`)

Responsive tile grid (1 col mobile → 2 tablet → 3 desktop). Each tile: heading,
short body, "see all →" link. Tiles with nothing to show hide themselves.

**Tiles buildable now (M1):**

- **My categories** — the user's `UserCategory` list as colored chips/rows,
  each linking to `/categories/:id`. Uses Phase 2 color tokens. `+` create is a
  Phase 4 stub.
- **My groups** — `Group`s the user is a member of, each linking to
  `/groups/:id`, with member count.
- **Jump back in** — recipes whose detail was most recently *opened*. Derived
  from a local recently-viewed store (no backend). Reads the last N.
- **At a glance** (optional, small) — counts: recipes you can see, shared with
  you, categories, groups. Makes a fresh account feel populated.

**Recency tiles (Phase 5 spec headline) — mock-order proxy now:**

- **Recently added to you** (as viewer/editor).
- **Your recent creations**.

Both are rendered now using a **single seam** `recencyOrder(recipes)`:
- M1: sorts by **descending `id`** (mock-order proxy). Carries a `TODO`
  pointing at the timestamp blocker.
- M2: swap the body to sort by the real timestamp. Tiles unchanged.

This is deliberately a stand-in ("fake it from mock order"), isolated to one
function so M2 is a one-line swap and the UI never learns about it.

## Categories & Groups

**`/categories/:id` — thin, reuses the list.** A category is "the recipe list,
pre-scoped to this category." The route renders the **existing `/recipes` list
machinery** with the category filter pre-applied (list filter state initializes
from the route param) and the heading swapped to the category name in its color.
Search / sort / view-modes / role+collab filters all work inside a category for
free. Unknown/empty id → the list's existing empty state. Keeps Phase 2 as the
one list implementation.

**`/groups` — overview.** Grid/list of the `Group`s you're a member of: name,
member avatars/count, owner. Each links to `/groups/:id`. Empty state when you
are in none. This is the destination behind the Groups tab.

**`/groups/:id` — single group.** Header (name, members, owner), then a recipe
section. The data model has **no `Group → Recipe` link** (plan open question
"Gruppen ↔ Rezepte"). Decision: **derive** the recipe section as "recipes shared
with **all** current members" — real data, honestly labeled, with a note that
the model may change. Not a placeholder.

## Light cohesion pass (existing screens, no logic changes)

- **Recipe-list header** — realigned to read as a screen *within* a section
  (size, spacing, sticky offsets) matching Dashboard/Categories/Groups. This is
  the one spot that touches the sticky-measurement code.
- **`PageHeader`** — small shared scaffold (title + optional subtitle/color +
  right-aligned actions slot), used by Dashboard, Categories, Groups, and the
  list, so headers aren't re-invented per screen.
- **Cards/Tiles** — Dashboard tiles and Groups overview share one card look.
  Prefer a `@postxl/ui-components` primitive; else one thin local `Tile`
  wrapper.
- **Detail** (`/recipes/:id`) — unchanged visually; inherits shell chrome only.

## Data / API additions

- `foodly.listGroups()` → `Group[]`, plus a `groups.list` mock case and mock
  group data (mocks currently have no groups).
- **Recently-viewed store** (`localStorage`, per user): `/recipes/:id` pushes its
  id on view; "Jump back in" reads the last N. Same family as
  `src/list/persistence.ts`.
- `recencyOrder(recipes)` seam (id-desc now, timestamp later).
- **No `protocol.ts` changes** — `Group` already exists; timestamps stay
  deferred (documented backend blocker).

## Testing

Repo pattern: pure logic unit-tested, components smoke-tested (vitest).

- **Unit:** `recencyOrder`; the recently-viewed store; group → members → recipes
  derivation; category-scope initialization from route param.
- **Smoke:** shell renders both nav modes; Dashboard tiles show/hide correctly;
  `/categories/:id` and `/groups/:id` render with mock data.
- **Visual:** list sticky offsets still line up after the move (Chrome MCP).

## Explicitly out of scope

- Phase 4 create/edit screens (paths reserved, not built).
- Any `protocol.ts` / backend timestamp work (Milestone 2 unblocks the recency
  tiles later).
- Categories as a top-level tab (reachable, not a tab — may revisit if counts
  grow → "living sidebar").
