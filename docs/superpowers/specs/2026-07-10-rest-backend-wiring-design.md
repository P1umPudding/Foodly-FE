# REST Backend Wiring — Design

Date: 2026-07-10
Status: Approved (design), pending implementation plan

## Goal

Replace the frontend's mock data path with real calls to the `foodly-backend`
REST API for everything the backend already implements. Live recipe **editing**
is intentionally out of scope here — it will use WebSockets in a later phase.
Recipe **clone** is included because the backend already exposes it over REST.

## Context

- **Backend** (`foodly-backend`) is a REST/HTTP service (Axum) under
  `/api/v1`, with `Bearer` auth currently mocked to always resolve `user_id = 1`.
- **Frontend** (`Foodly-FE`) was built assuming a WebSocket backend
  (`src/api/socket.ts`, `CLAUDE.md`). Its `foodly.*` message types are explicit
  placeholders. Today `VITE_MOCK=1` serves everything from `src/mocks/`.

The two do not currently speak the same protocol. This work reconciles them at
the `src/api` boundary — the only place allowed to talk to the backend — without
touching pages/components except where a feature is genuinely new (clone) or
must change behavior (server-side list).

### What the backend already implements (in scope)

| Frontend need            | Backend endpoint                        | Notes |
|--------------------------|-----------------------------------------|-------|
| recipe list + filter/sort| `POST /api/v1/recipes/search?page=&limit=` | returns `{ data: RecipePreview[], cursor }` |
| recipe detail            | `GET /api/v1/recipes/{id}`              | returns full `Recipe` |
| tags                     | `GET /api/v1/tags`                      | returns `{ data: Tag[] }` |
| ingredients              | `GET /api/v1/ingredients`              | returns `{ data: Ingredient[] }` |
| clone recipe             | `POST /api/v1/recipes/{id}/copy`        | returns the new `Recipe` |

### Deliberately kept mocked (no backend endpoint exists)

`me` (current user), `users.list` (user picker), `categories.list` (category
chips). The backend can *filter recipes by* category but has no endpoint to
*list* a user's categories, and no user endpoints. These stay on the existing
mock responder until the backend adds them.

### Explicitly deferred

- Recipe create / update / delete (live **editing** — will be WebSocket).
- Ratings write, sharing (editors/viewers), image upload/serve, real auth.

## Approach

**Dedicated `RestClient` with per-method routing.** A small `fetch` wrapper in
`src/api/rest.ts`; `src/api/index.ts` routes each `foodly.*` method to REST, to
the mock responder, or (later) to the socket. `SocketClient` is left untouched
and reserved for the future editing channel.

Alternatives rejected:
- Teaching `SocketClient.request()` to send some types over HTTP — muddies a
  class whose whole purpose is the WS envelope; editing would later contend with
  reads over the same abstraction.
- A central `type → transport` dispatch registry — more machinery than ~8
  methods justify; explicit per-method wiring in `index.ts` reads better.

## Design

### 1. Configuration, dev proxy & the REST client

**Dev cross-origin — use a Vite proxy, not direct CORS.** The backend's CORS
layer sends `Access-Control-Allow-Headers: *`. Per the Fetch standard the `*`
wildcard covers every request header *except* `Authorization`, which must be
listed explicitly — so a direct cross-origin `fetch` carrying `Authorization:
Bearer …` (required; the middleware 401s without it) would fail preflight.
Rather than change the backend, add a Vite dev-server proxy so browser calls are
same-origin and CORS drops out:

```ts
// vite.config.ts
server: {
  proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
}
```

(The CORS layer is outermost in `lib.rs`, so OPTIONS preflight is answered before
auth — but the `Authorization` wildcard gap is the blocker, hence the proxy.)
Production note: this proxy is dev-only; prod must serve the app same-origin
behind a reverse proxy, or the backend must add `Authorization` to an explicit
`allow_headers` list.

- Env var `VITE_API_URL`, defaulting to the relative `/api/v1` (works through the
  proxy, same-origin). `VITE_WS_URL` stays for the later editing work. Document
  both in `.env.example`.
- `VITE_MOCK` semantics:
  - `=1` → everything mocked. Preserves today's pure-frontend dev experience.
  - unset / `0` → recipes, tags, ingredients go through REST; `me`, `users`,
    `categories` stay on the mock responder regardless.
- `src/api/rest.ts` — a `fetch`-based client:
  - Prefixes `VITE_API_URL`, sends `Authorization: Bearer <dev-token>` (a static
    placeholder; the backend maps any bearer to user 1), `Content-Type:
    application/json`.
  - On non-2xx, `throw new Error(message)` — mirroring `SocketClient.request`'s
    rejection contract so error handling is unchanged.
  - Methods: `get<T>(path)`, `post<T>(path, body)`.

### 2. API surface (`src/api/index.ts`)

- `searchRecipes(query: RecipeSearchQuery, page: number)` →
  `POST /recipes/search?page=&limit=100` → `{ data: RecipePreview[], cursor }`.
  Replaces `listRecipes` for the list page (an empty query lists everything).
- `getRecipe(id)` → `GET /recipes/{id}` → `Recipe`.
- `listTags()` → `GET /tags`, unwrap `{ data }` → `Tag[]`.
- `listIngredients()` → `GET /ingredients`, unwrap `{ data }` → `Ingredient[]`.
- `copyRecipe(id)` → `POST /recipes/{id}/copy` → `Recipe`.
- `me()`, `listUsers()`, `listCategories()` — unchanged, still routed to the mock
  responder.

Under `VITE_MOCK=1`, the REST-bound methods above resolve through the mock
responder instead (so full mock dev keeps working). The mock `searchRecipes`
handler applies filtering/sorting to the mock dataset by **reusing the existing
`filterRecipes`/`sortRecipes` logic** (`src/list/filter.ts`, `src/list/sort.ts`)
— that code is not deleted, it moves from the page into the mock layer, so mock
mode still filters/sorts while REST mode delegates to the backend. A mock
`copyRecipe` handler is added for parity.

Endpoint response wrapping (verified against the backend):
- `search` → `{ data, cursor }` (unwrap `data`).
- `tags` / `ingredients` → `{ data }` (unwrap).
- `getRecipe` / `copyRecipe` → **raw** `Recipe` (no wrapper).

### 3. Type adapters

- Backend serializes camelCase, matching `src/api/protocol.ts` — no renaming.
- `RecipePreview` (list projection) omits `sections`, `notes`, `images`. A
  `previewToRecipe` adapter fills those with `[]` (list cards don't read them).
- `rating` comes back empty (the backend hardcodes it for now) — ratings won't
  render yet; acceptable.
- `cursor` is the next page number as a string → parsed to an int for the next
  fetch. `cursor === null` means no more pages.

### 4. `RecipeList` rewiring (server-side filter/sort)

Map `ListState` (`src/list/state.ts`) → `RecipeSearchQuery`:

| ListState field | RecipeSearchQuery |
|-----------------|-------------------|
| `categories: number[]` | `filters.categories` |
| `tags: string[]` | `filters.tags` |
| `ingredients: number[]` | `filters.ingredients` |
| `durationMax: number \| null` | `filters.maxWorkTime` |
| `role` (`any`/owner/editor/viewer) | `filters.accessRights: [role]`; omit when `any` |
| `collab` (`any`/private/shared/collaborative) | `filters.shareStates: [collab]`; omit when `any` |
| `sortKey` (`name`/`work`/`overall`/`rating`) | `sort.field` = `name`/`worktime`/`totaltime`/`rating` |
| `sortDir` (`asc`/`desc`) | `sort.order` (`asc`/`desc`) |
| `search` | not sent — handled client-side (see below) |

- **Infinite scroll**: fetch page 1 whenever the search query changes; load the
  next page via `cursor` as the user scrolls; accumulate into a single list.
  This needs a **dedicated pagination hook/state** (e.g. `useRecipeSearch`) —
  `useRequest` is one-shot and nulls `data` on every run, so it cannot accumulate
  pages. The hook tracks: accumulated `RecipePreview[]`, current `cursor`,
  `loadingMore`, and resets on query change.
- **Client-side still**: free-text `search` (over already-loaded results),
  category grouping + collapse, the `canViewRecipe` access guard (redundant since
  the backend enforces access, but harmless).
- The server does category/tag/ingredient/duration/role/collab filtering and
  sorting; the client keeps only the text-search pass.
- Known tradeoff: because grouping and counts run over *loaded* pages, they fill
  in as the user scrolls rather than reflecting the full result set immediately.

**Category facet limitation (REST mode).** Categories stay mocked, but mock
category IDs and their `recipes: RecipeId[]` reference *mock* recipe IDs, which
do not exist in the real DB. Consequences and handling in REST mode:
- Grouping-by-category collapses to "uncategorized" (no membership matches). The
  grouping UI stays but is effectively inert until a categories backend exists.
- The category filter facet is **omitted from the `RecipeSearchQuery`** in REST
  mode — sending a mock category ID as `filters.categories` would filter the real
  list to empty. (In mock mode it still works as today.)
- This is an accepted, documented limitation of keeping categories mocked; it
  resolves when the backend adds a categories endpoint.

### 5. Clone (new, minimal UI)

- Add a "Duplizieren" action (postxl `Button`) on `RecipeDetail` that calls
  `foodly.copyRecipe(id)` and navigates to `/recipes/{newId}` on success.
- Add a mock `copyRecipe` handler in `src/mocks/` so clone also works under
  `VITE_MOCK=1`.
- No other mutation UI is added (create/update/delete remain deferred to the WS
  editing phase).

### 6. Images

Real recipe `mainImage`/`images` are numeric IDs with no serve endpoint. In REST
mode, recipe images fall back to the existing placeholder in `src/api/assets.ts`.
Flagged as a known gap requiring a backend image endpoint later.

### 7. Testing

Vitest unit tests:
- `ListState → RecipeSearchQuery` mapping (each facet, `any` omission, sort map).
- `rest.ts` error mapping (non-2xx → thrown `Error` with message).
- `previewToRecipe` adapter (missing arrays filled).
- Cursor pagination accumulation (page 1 + load-more merge; `null` cursor stops).

Existing mock-mode tests must stay green.

## Out of scope

Recipe create/update/delete (WS editing phase), ratings, sharing, image
upload/serve, real authentication, and any backend changes (the three mocked
reads stay mocked; no Rust code is modified in this work).

## Branch

New branch in `Foodly-FE`: `feat/rest-backend-wiring`.
