# REST Backend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's mock data path with real REST calls to `foodly-backend` for everything the backend already implements (recipe list/search, recipe detail, tags, ingredients) plus recipe clone, keeping `me`/`users`/`categories` mocked and deferring live editing to a future WebSocket phase.

**Architecture:** A thin `fetch`-based `RestClient` becomes a second transport alongside the existing `SocketClient`. The typed `foodly.*` API surface routes each method to REST or to the mock responder per-method. The recipe list moves to server-side filter/sort/pagination via `POST /recipes/search`, consumed through a new accumulating `useRecipeSearch` hook (infinite scroll). Free-text search stays client-side. A Vite dev proxy makes browser calls same-origin so CORS/`Authorization` preflight is a non-issue.

**Tech Stack:** React 18 + TypeScript 5.5 + Vite 7, react-router-dom 6, `@postxl/ui-components`, Vitest + Testing Library. Backend is Axum REST under `/api/v1` with `Bearer` auth mocked to `user_id = 1`.

## Global Constraints

- **Prettier (Skaile config):** no semicolons, single quotes, 2-space indent, printWidth 120. Match surrounding style.
- **No `Co-Authored-By` trailer** on commits in this repo. **Never push** — commit locally only.
- **UI:** use `@postxl/ui-components` for all interactive controls (`Button`, etc.); never hand-roll. Tooltips via postxl `Tooltip`, never native `title`.
- **Backend access only through `src/api`** — never open ad-hoc fetch/WebSocket in components.
- **Never hardcode the backend URL** — read from `import.meta.env` (`VITE_API_URL`, default `/api/v1`).
- **Backend wire format:** camelCase JSON. Error body is `{ "error": { "code", "message" } }`. Search/tags/ingredients responses are `{ data, cursor? }`-wrapped; `GET /recipes/{id}` and `POST /recipes/{id}/copy` return a raw `Recipe`.
- **Backend sort field strings:** `name`, `worktime`, `totaltime`, `rating`. **Access/share enum strings:** `owner`/`editor`/`viewer`, `private`/`shared`/`collaborative`.
- All work on branch `feat/rest-backend-wiring` (already created).

---

### Task 1: Config foundations — dev proxy, env, wire types

**Files:**
- Modify: `vite.config.ts`
- Modify: `.env.example`
- Modify: `src/api/protocol.ts` (append new types)

**Interfaces:**
- Produces: `RecipePreview`, `PaginatedResponse<T>`, `RecipeFilters`, `RecipeSort`, `RecipeSearchQuery`, `PaginatedRecipes`, and the string-literal types `RecipeAccessRight`, `RecipeShareStateWire`, `RecipeSortField`, `SortOrder` — all from `src/api/protocol.ts`.

- [ ] **Step 1: Add the dev proxy to `vite.config.ts`**

Add a `server.proxy` entry so `/api/*` is proxied to the backend (same-origin in the browser → no CORS). Full file:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev-only: proxy REST calls to the backend so the browser talks same-origin.
  // Avoids CORS entirely — the backend's `Allow-Headers: *` does NOT cover the
  // required `Authorization` header cross-origin. Prod must serve same-origin.
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 2: Document env vars in `.env.example`**

Replace `.env.example` with:

```bash
# Copy to `.env.local` and fill in. Vite only exposes vars prefixed with VITE_.

# REST base URL of the backend. Default (relative) goes through the Vite dev
# proxy (see vite.config.ts), so leave it unset for local dev.
VITE_API_URL=/api/v1

# WebSocket endpoint — reserved for the future live-editing phase. Not used yet.
VITE_WS_URL=wss://your-backend.example/ws

# Dev only: 1 = serve everything from local mocks (src/mocks). Unset/0 = use REST
# for recipes/tags/ingredients (+ clone); me/users/categories stay mocked either
# way until the backend implements them.
VITE_MOCK=0
```

- [ ] **Step 3: Append wire types to `src/api/protocol.ts`**

Append at the end of the file:

```ts
// --- REST wire additions -------------------------------------------------

// List projection returned by GET /recipes and POST /recipes/search. Carries no
// sections/notes/images (see previewToRecipe, which fills them empty).
export type RecipePreview = Omit<Recipe, 'sections' | 'notes' | 'images'>

// Paginated envelope. `cursor` is the next page number as a string, or null.
export type PaginatedResponse<T> = { data: T[]; cursor: string | null }

export type RecipeAccessRight = 'owner' | 'editor' | 'viewer'
export type RecipeShareStateWire = 'private' | 'shared' | 'collaborative'
export type RecipeSortField = 'name' | 'worktime' | 'totaltime' | 'rating'
export type SortOrder = 'asc' | 'desc'

export type RecipeFilters = {
  categories?: number[]
  tags?: string[]
  ingredients?: number[]
  maxWorkTime?: number
  accessRights?: RecipeAccessRight[]
  shareStates?: RecipeShareStateWire[]
}
export type RecipeSort = { field: RecipeSortField; order: SortOrder }
export type RecipeSearchQuery = { filters?: RecipeFilters; sort?: RecipeSort }

// Frontend-normalized paginated recipe result (cursor parsed to a page number).
export type PaginatedRecipes = { items: Recipe[]; cursor: number | null }
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: `tsc` passes (build succeeds, no type errors).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts .env.example src/api/protocol.ts
git commit -m "feat(api): add REST wire types, dev proxy, env config"
```

---

### Task 2: REST client

**Files:**
- Create: `src/api/rest.ts`
- Test: `src/api/rest.test.ts`

**Interfaces:**
- Produces: `rest.get<T>(path: string): Promise<T>` and `rest.post<T>(path: string, body?: unknown): Promise<T>` from `src/api/rest.ts`. Sends `Authorization: Bearer <dev-token>`; throws `Error` with the backend's `error.message` (or `HTTP <status>`) on non-2xx; returns `undefined` for 204.

- [ ] **Step 1: Write the failing tests**

Create `src/api/rest.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rest } from './rest'

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const res = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  } as unknown as Response
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
}

afterEach(() => vi.restoreAllMocks())

describe('rest', () => {
  it('GET sends a Bearer auth header and returns parsed JSON', async () => {
    const spy = mockFetch({ jsonBody: { data: [1, 2] } })
    const out = await rest.get<{ data: number[] }>('/tags')
    expect(out).toEqual({ data: [1, 2] })
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain('/tags')
    expect((init?.headers as Record<string, string>).Authorization).toMatch(/^Bearer /)
  })

  it('POST serializes the body and sets the JSON content type', async () => {
    const spy = mockFetch({ jsonBody: { data: [], cursor: null } })
    await rest.post('/recipes/search?page=1&limit=100', { sort: { field: 'name', order: 'asc' } })
    const [, init] = spy.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"sort":{"field":"name","order":"asc"}}')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws the backend error.message on non-2xx', async () => {
    mockFetch({ ok: false, status: 403, jsonBody: { error: { code: 'FORBIDDEN', message: 'nope' } } })
    await expect(rest.get('/recipes/1')).rejects.toThrow('nope')
  })

  it('returns undefined for 204', async () => {
    mockFetch({ ok: true, status: 204, jsonBody: undefined })
    await expect(rest.get('/x')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/api/rest.test.ts`
Expected: FAIL (cannot resolve `./rest`).

- [ ] **Step 3: Write `src/api/rest.ts`**

```ts
// REST transport to the backend. Same-origin in dev (Vite proxy); base URL from
// VITE_API_URL. Auth is a static bearer — the backend maps any bearer to user 1.
// Mirrors SocketClient.request's contract: resolves the parsed body, throws Error
// on failure, so useRequest/useRecipeSearch error handling is transport-agnostic.

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'
const DEV_TOKEN = 'dev-token'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${DEV_TOKEN}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const parsed = (await res.json()) as { error?: { message?: string } }
      if (parsed?.error?.message) message = parsed.error.message
    } catch {
      // non-JSON error body — keep the status-based message
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const rest = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/api/rest.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api/rest.ts src/api/rest.test.ts
git commit -m "feat(api): add fetch-based REST client"
```

---

### Task 3: `previewToRecipe` adapter

**Files:**
- Create: `src/api/adapters.ts`
- Test: `src/api/adapters.test.ts`

**Interfaces:**
- Consumes: `RecipePreview`, `Recipe` from `src/api/protocol.ts`.
- Produces: `previewToRecipe(p: RecipePreview): Recipe` from `src/api/adapters.ts` — fills `sections`, `notes`, `images` with `[]`.

- [ ] **Step 1: Write the failing test**

Create `src/api/adapters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { previewToRecipe } from './adapters'
import type { RecipePreview } from './protocol'

const preview: RecipePreview = {
  id: 7,
  owner: 1,
  editors: [],
  viewers: [],
  name: 'Soup',
  tags: ['t'],
  source: null,
  rating: [],
  time: null,
  workMinutes: 10,
  overallMinutes: 20,
  sizeNumber: null,
  sizeText: null,
  mainImage: null,
}

describe('previewToRecipe', () => {
  it('fills the missing collections with empty arrays', () => {
    const r = previewToRecipe(preview)
    expect(r.sections).toEqual([])
    expect(r.notes).toEqual([])
    expect(r.images).toEqual([])
    expect(r.id).toBe(7)
    expect(r.name).toBe('Soup')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/adapters.test.ts`
Expected: FAIL (cannot resolve `./adapters`).

- [ ] **Step 3: Write `src/api/adapters.ts`**

```ts
import type { Recipe, RecipePreview } from './protocol'

// The list endpoints return a preview without sections/notes/images. The list UI
// never reads those, so fill them empty to satisfy the Recipe shape.
export function previewToRecipe(preview: RecipePreview): Recipe {
  return { ...preview, sections: [], notes: [], images: [] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/adapters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/adapters.ts src/api/adapters.test.ts
git commit -m "feat(api): add RecipePreview -> Recipe adapter"
```

---

### Task 4: Search-query mapping + mock query application

**Files:**
- Create: `src/list/query.ts`
- Test: `src/list/query.test.ts`

**Interfaces:**
- Consumes: `ListState` from `src/list/state.ts`; `roleOf`, `collaborationState`, `averageRating` from `src/api/views.ts`; `Recipe`, `RecipeSearchQuery` from `src/api/protocol.ts`.
- Produces: `PAGE_SIZE = 100`; `buildSearchQuery(state: ListState): RecipeSearchQuery`; `applyQuery(recipes: Recipe[], query: RecipeSearchQuery, currentUserId: number | null): Recipe[]` from `src/list/query.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/list/query.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applyQuery, buildSearchQuery } from './query'
import { DEFAULT_STATE } from './state'
import type { Recipe } from '../api/protocol'

describe('buildSearchQuery', () => {
  it('maps facets and sort, omitting inactive ones', () => {
    const q = buildSearchQuery({
      ...DEFAULT_STATE,
      tags: ['vegan'],
      ingredients: [3],
      durationMax: 30,
      role: 'owner',
      collab: 'shared',
      sortKey: 'overall',
      sortDir: 'desc',
    })
    expect(q).toEqual({
      filters: {
        tags: ['vegan'],
        ingredients: [3],
        maxWorkTime: 30,
        accessRights: ['owner'],
        shareStates: ['shared'],
      },
      sort: { field: 'totaltime', order: 'desc' },
    })
  })

  it('omits the filters object entirely when no facet is active, and never sends categories', () => {
    const q = buildSearchQuery({ ...DEFAULT_STATE, categories: [1, 2] })
    expect(q.filters).toBeUndefined()
    expect(q.sort).toEqual({ field: 'name', order: 'asc' })
  })
})

function recipe(over: Partial<Recipe>): Recipe {
  return {
    id: 1, owner: 1, editors: [], viewers: [], name: 'x', tags: [], source: null,
    rating: [], time: null, workMinutes: null, overallMinutes: null, sizeNumber: null,
    sizeText: null, notes: [], mainImage: null, images: [], sections: [], ...over,
  }
}

describe('applyQuery', () => {
  const recipes = [
    recipe({ id: 1, name: 'B', tags: ['vegan'], workMinutes: 40 }),
    recipe({ id: 2, name: 'A', tags: [], workMinutes: 10 }),
  ]

  it('filters by tags', () => {
    const out = applyQuery(recipes, { filters: { tags: ['vegan'] } }, 1)
    expect(out.map((r) => r.id)).toEqual([1])
  })

  it('filters by maxWorkTime (unknown excluded)', () => {
    const out = applyQuery(recipes, { filters: { maxWorkTime: 20 } }, 1)
    expect(out.map((r) => r.id)).toEqual([2])
  })

  it('sorts by name ascending', () => {
    const out = applyQuery(recipes, { sort: { field: 'name', order: 'asc' } }, 1)
    expect(out.map((r) => r.id)).toEqual([2, 1])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/list/query.test.ts`
Expected: FAIL (cannot resolve `./query`).

- [ ] **Step 3: Write `src/list/query.ts`**

```ts
// Maps the frontend ListState to the backend RecipeSearchQuery (server-side
// filter/sort), and — for VITE_MOCK dev — applies the same query to an in-memory
// recipe list so mock mode filters/sorts like the real backend.

import type { ListState } from './state'
import type {
  Recipe,
  RecipeAccessRight,
  RecipeSearchQuery,
  RecipeShareStateWire,
  RecipeSortField,
} from '../api/protocol'
import { averageRating, collaborationState, roleOf } from '../api/views'

export const PAGE_SIZE = 100

const SORT_FIELD: Record<ListState['sortKey'], RecipeSortField> = {
  name: 'name',
  work: 'worktime',
  overall: 'totaltime',
  rating: 'rating',
}

export function buildSearchQuery(state: ListState): RecipeSearchQuery {
  const filters: NonNullable<RecipeSearchQuery['filters']> = {}
  if (state.tags.length) filters.tags = state.tags
  if (state.ingredients.length) filters.ingredients = state.ingredients
  if (state.durationMax !== null) filters.maxWorkTime = state.durationMax
  if (state.role !== 'any') filters.accessRights = [state.role as RecipeAccessRight]
  if (state.collab !== 'any') filters.shareStates = [state.collab as RecipeShareStateWire]
  // Category facet is intentionally NOT sent: categories are still mocked, so
  // their ids don't map to real backend categories — sending them would filter
  // the real list to empty. (Grouping-by-category stays a client-only view.)

  const query: RecipeSearchQuery = { sort: { field: SORT_FIELD[state.sortKey], order: state.sortDir } }
  if (Object.keys(filters).length > 0) query.filters = filters
  return query
}

function recipeIngredientIds(recipe: Recipe): Set<number> {
  const ids = new Set<number>()
  for (const section of recipe.sections)
    for (const line of section.ingredients) if (line.ingredient) ids.add(line.ingredient.id)
  return ids
}

function sortValue(recipe: Recipe, field: RecipeSortField): number | string | null {
  switch (field) {
    case 'name':
      return recipe.name.toLowerCase()
    case 'worktime':
      return recipe.workMinutes
    case 'totaltime':
      return recipe.overallMinutes
    case 'rating':
      return averageRating(recipe)
  }
}

export function applyQuery(recipes: Recipe[], query: RecipeSearchQuery, currentUserId: number | null): Recipe[] {
  let out = recipes
  const f = query.filters
  if (f) {
    if (f.tags?.length) out = out.filter((r) => f.tags!.every((t) => r.tags.includes(t)))
    if (f.ingredients?.length)
      out = out.filter((r) => {
        const have = recipeIngredientIds(r)
        return f.ingredients!.every((id) => have.has(id))
      })
    if (f.maxWorkTime != null) out = out.filter((r) => r.workMinutes !== null && r.workMinutes <= f.maxWorkTime!)
    if (f.accessRights?.length)
      out = out.filter((r) => currentUserId !== null && f.accessRights!.includes(roleOf(r, currentUserId) as RecipeAccessRight))
    if (f.shareStates?.length)
      out = out.filter((r) => f.shareStates!.includes(collaborationState(r) as RecipeShareStateWire))
  }

  const sort = query.sort
  if (sort) {
    const dir = sort.order === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = sortValue(a, sort.field)
      const vb = sortValue(b, sort.field)
      if (va === null && vb === null) return 0
      if (va === null) return 1 // nulls last, both directions
      if (vb === null) return -1
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }
  return out
}
```

Note: `roleOf`/`collaborationState` return the frontend `Role`/`Collaboration` unions, which for the values used here (`owner`/`editor`/`viewer`, `private`/`shared`/`collaborative`) coincide with the wire strings — hence the `as` casts.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/list/query.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/list/query.ts src/list/query.test.ts
git commit -m "feat(list): map ListState to RecipeSearchQuery (+ mock query application)"
```

---

### Task 5: API surface routing + mock handlers

**Files:**
- Modify: `src/api/index.ts`
- Modify: `src/mocks/index.ts`
- Test: `src/mocks/search.test.ts`

**Interfaces:**
- Consumes: `rest` (Task 2), `previewToRecipe` (Task 3), `PAGE_SIZE`/`applyQuery` (Task 4), `PaginatedResponse`/`RecipePreview`/`RecipeSearchQuery`/`PaginatedRecipes` (Task 1).
- Produces: `foodly.searchRecipes(query, page): Promise<PaginatedRecipes>`, `foodly.getRecipe(id): Promise<Recipe>`, `foodly.copyRecipe(id): Promise<Recipe>`, `foodly.listTags()`, `foodly.listIngredients()`, plus unchanged `foodly.me()/listUsers()/listCategories()`. Mock responder handles new types `recipes.search` and `recipes.copy`.

- [ ] **Step 1: Write the failing test (mock search pagination)**

Create `src/mocks/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mockRequest } from './index'
import type { PaginatedRecipes } from '../api/protocol'

describe('mock recipes.search', () => {
  it('returns a page and a copy handler that suffixes the name', async () => {
    const page = (await mockRequest('recipes.search', {
      query: { sort: { field: 'name', order: 'asc' } },
      page: 1,
    })) as PaginatedRecipes
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)

    const first = page.items[0]
    const copy = (await mockRequest('recipes.copy', { id: first.id })) as { id: number; name: string; owner: number }
    expect(copy.id).not.toBe(first.id)
    expect(copy.name).toContain('(Kopie)')
    expect(copy.owner).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/mocks/search.test.ts`
Expected: FAIL (`[mock] no handler for message type "recipes.search"`).

- [ ] **Step 3: Add the mock handlers in `src/mocks/index.ts`**

Add the import at the top (after the existing imports):

```ts
import { applyQuery, PAGE_SIZE } from '../list/query'
import type { PaginatedRecipes, RecipeSearchQuery } from '../api/protocol'
```

Add these two cases inside the `switch (type)` in `mockRequest`, before `default:`:

```ts
    case 'recipes.search': {
      const { query, page } = payload as { query: RecipeSearchQuery; page: number }
      const all = applyQuery(mockData.recipes, query, CURRENT_USER_ID)
      const start = (page - 1) * PAGE_SIZE
      const items = all.slice(start, start + PAGE_SIZE)
      const cursor = start + PAGE_SIZE < all.length ? page + 1 : null
      return { items, cursor } satisfies PaginatedRecipes
    }
    case 'recipes.copy': {
      const original = mockData.recipes.find((r) => r.id === id)
      if (!original) throw new Error(`recipe ${id} not found`)
      const nextId = mockData.recipes.reduce((max, r) => Math.max(max, r.id), 0) + 1
      const copy: Recipe = {
        ...original,
        id: nextId,
        name: `${original.name} (Kopie)`,
        owner: CURRENT_USER_ID,
        editors: [],
        viewers: [],
      }
      mockData.recipes.push(copy)
      return copy
    }
```

- [ ] **Step 4: Rewire `src/api/index.ts`**

Replace the whole file with:

```ts
import { SocketClient } from './socket'
import { rest } from './rest'
import { previewToRecipe } from './adapters'
import { PAGE_SIZE } from '../list/query'
import type {
  Ingredient,
  PaginatedRecipes,
  PaginatedResponse,
  Recipe,
  RecipeId,
  RecipePreview,
  RecipeSearchQuery,
  Tag,
  User,
  UserCategory,
} from './protocol'

const WS_URL = import.meta.env.VITE_WS_URL ?? ''
const USE_MOCKS = import.meta.env.VITE_MOCK === '1'

export const socket = new SocketClient(WS_URL)
export { type SocketStatus } from './socket'

// The mock responder is attached in BOTH modes: in mock mode it answers
// everything; in REST mode it answers only me/users/categories (no backend yet).
// The real WS connection (for future live editing) is not established here.
export async function bootstrap(): Promise<void> {
  const { mockRequest } = await import('../mocks')
  socket.useMocks(mockRequest)
}

// Reads with a real backend go over REST; the still-mocked reads go through the
// socket's mock responder. In VITE_MOCK dev, everything goes through the mock.
export const foodly = {
  me: () => socket.request<User>('me'),
  listUsers: () => socket.request<User[]>('users.list'),
  listCategories: () => socket.request<UserCategory[]>('categories.list'),

  searchRecipes: (query: RecipeSearchQuery, page: number): Promise<PaginatedRecipes> =>
    USE_MOCKS
      ? socket.request<PaginatedRecipes>('recipes.search', { query, page })
      : rest
          .post<PaginatedResponse<RecipePreview>>(`/recipes/search?page=${page}&limit=${PAGE_SIZE}`, query)
          .then((res) => ({ items: res.data.map(previewToRecipe), cursor: res.cursor ? Number(res.cursor) : null })),

  getRecipe: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.get', { id }) : rest.get<Recipe>(`/recipes/${id}`),

  copyRecipe: (id: RecipeId): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.copy', { id }) : rest.post<Recipe>(`/recipes/${id}/copy`),

  listTags: (): Promise<Tag[]> =>
    USE_MOCKS ? socket.request<Tag[]>('tags.list') : rest.get<PaginatedResponse<Tag>>('/tags').then((r) => r.data),

  listIngredients: (): Promise<Ingredient[]> =>
    USE_MOCKS
      ? socket.request<Ingredient[]>('ingredients.list')
      : rest.get<PaginatedResponse<Ingredient>>('/ingredients').then((r) => r.data),
}

export type { PaginatedRecipes } from './protocol'
```

Note: `PaginatedResponse<Tag>` has an optional `cursor` the catalog endpoints omit — harmless; only `data` is read.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/mocks/search.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check the surface changes**

Run: `npm run build`
Expected: `tsc` passes. (`foodly.listRecipes` no longer exists — Task 7 updates its only caller, `RecipeList`, so a transient type error there is expected until Task 7. If building the whole app now fails only on `RecipeList.tsx`/`listRecipes`, that is expected; proceed.)

- [ ] **Step 7: Commit**

```bash
git add src/api/index.ts src/mocks/index.ts src/mocks/search.test.ts
git commit -m "feat(api): route reads to REST with per-method mock fallback; add search/copy"
```

---

### Task 6: `useRecipeSearch` pagination hook

**Files:**
- Create: `src/hooks/useRecipeSearch.ts`
- Test: `src/hooks/useRecipeSearch.test.ts`

**Interfaces:**
- Consumes: `foodly.searchRecipes` (Task 5); `Recipe`, `RecipeSearchQuery` from `src/api/protocol.ts`.
- Produces: `useRecipeSearch(query: RecipeSearchQuery): { recipes: Recipe[]; status: 'loading' | 'ready' | 'error'; error: Error | null; hasMore: boolean; loadingMore: boolean; loadMore: () => void; reload: () => void }`.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useRecipeSearch.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecipeSearch } from './useRecipeSearch'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

function rec(id: number): Recipe {
  return {
    id, owner: 1, editors: [], viewers: [], name: `r${id}`, tags: [], source: null,
    rating: [], time: null, workMinutes: null, overallMinutes: null, sizeNumber: null,
    sizeText: null, notes: [], mainImage: null, images: [], sections: [],
  }
}

afterEach(() => vi.restoreAllMocks())

describe('useRecipeSearch', () => {
  it('loads page 1 then accumulates on loadMore', async () => {
    const spy = vi
      .spyOn(foodly, 'searchRecipes')
      .mockResolvedValueOnce({ items: [rec(1)], cursor: 2 })
      .mockResolvedValueOnce({ items: [rec(2)], cursor: null })

    const { result } = renderHook(() => useRecipeSearch({ sort: { field: 'name', order: 'asc' } }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.recipes.map((r) => r.id)).toEqual([1])
    expect(result.current.hasMore).toBe(true)

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.recipes.length).toBe(2))
    expect(result.current.recipes.map((r) => r.id)).toEqual([1, 2])
    expect(result.current.hasMore).toBe(false)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('exposes an error status when the request fails', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useRecipeSearch({ sort: { field: 'name', order: 'asc' } }))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('boom')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useRecipeSearch.test.ts`
Expected: FAIL (cannot resolve `./useRecipeSearch`).

- [ ] **Step 3: Write `src/hooks/useRecipeSearch.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { foodly } from '../api'
import type { Recipe, RecipeSearchQuery } from '../api/protocol'

type Status = 'loading' | 'ready' | 'error'

export type RecipeSearchResult = {
  recipes: Recipe[]
  status: Status
  error: Error | null
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  reload: () => void
}

// Accumulating, cursor-paginated recipe search. useRequest can't drive this — it
// is one-shot and nulls data on every run — so pagination state lives here.
// Changing the query (by value, via its JSON key) resets to page 1.
export function useRecipeSearch(query: RecipeSearchQuery): RecipeSearchResult {
  const key = JSON.stringify(query)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nonce, setNonce] = useState(0)
  // Bumped on every query-epoch change so stale loadMore responses are dropped.
  const epoch = useRef(0)

  useEffect(() => {
    const mine = ++epoch.current
    setStatus('loading')
    setError(null)
    setRecipes([])
    setCursor(null)
    foodly
      .searchRecipes(query, 1)
      .then((res) => {
        if (mine !== epoch.current) return
        setRecipes(res.items)
        setCursor(res.cursor)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (mine !== epoch.current) return
        setError(e as Error)
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const loadMore = useCallback(() => {
    if (cursor === null || loadingMore) return
    const mine = epoch.current
    const page = cursor
    setLoadingMore(true)
    foodly
      .searchRecipes(query, page)
      .then((res) => {
        if (mine !== epoch.current) return
        setRecipes((prev) => [...prev, ...res.items])
        setCursor(res.cursor)
      })
      .catch(() => {
        if (mine === epoch.current) setCursor(null) // stop paging on error
      })
      .finally(() => {
        if (mine === epoch.current) setLoadingMore(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loadingMore, key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { recipes, status, error, hasMore: cursor !== null, loadingMore, loadMore, reload }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useRecipeSearch.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRecipeSearch.ts src/hooks/useRecipeSearch.test.ts
git commit -m "feat(hooks): add accumulating useRecipeSearch pagination hook"
```

---

### Task 7: Rewire `RecipeList` to server-side search + infinite scroll

**Files:**
- Modify: `src/pages/RecipeList.tsx`
- Test: `src/pages/RecipeList.search.test.tsx`

**Interfaces:**
- Consumes: `useRecipeSearch` (Task 6), `buildSearchQuery` (Task 4), `matchesSearch` from `src/list/search.ts`, `foodly.listCategories`.

**Behavior notes (REST mode):** the server now does category/tag/ingredient/duration/role/collab filtering and sorting; the client narrows only by free-text `search`. Because the list endpoint returns previews (no sections) and categories stay mocked, three things degrade and are accepted for this pass: (a) category grouping collapses toward "uncategorised"; (b) free-text search matches name/tags only (no step text); (c) the ingredient facet falls back to the full catalog when loaded recipes carry no ingredient data. All documented in the spec.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RecipeList.search.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeList } from './RecipeList'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

function rec(id: number, name: string): Recipe {
  return {
    id, owner: 1, editors: [], viewers: [], name, tags: [], source: null, rating: [],
    time: null, workMinutes: null, overallMinutes: null, sizeNumber: null, sizeText: null,
    notes: [], mainImage: null, images: [], sections: [],
  }
}

// The catalog context the page reads from.
vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: {}, status: 'ready' }),
}))

afterEach(() => vi.restoreAllMocks())

describe('RecipeList (server-side search)', () => {
  it('renders recipes returned by searchRecipes', async () => {
    vi.spyOn(foodly, 'searchRecipes').mockResolvedValue({ items: [rec(1, 'Pancakes')], cursor: null })
    vi.spyOn(foodly, 'listCategories').mockResolvedValue([])

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Pancakes')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/RecipeList.search.test.tsx`
Expected: FAIL (currently `RecipeList` calls the removed `foodly.listRecipes`).

- [ ] **Step 3: Update the imports in `src/pages/RecipeList.tsx`**

Replace the import block (lines 16–31, from `import { foodly }` through `import { SearchInput }`) with:

```tsx
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { useCurrentUserId, useTags, useIngredients } from '../catalog/CatalogProvider'
import { useListState } from '../list/useListState'
import { groupingCategories } from '../list/filter'
import { buildSearchQuery } from '../list/query'
import { matchesSearch } from '../list/search'
import { usedIngredients } from '../list/counts'
import { canViewRecipe } from '../api/views'
import { activeFacetCount, isFilterActive } from '../list/state'
import { loadCollapsed, saveCollapsed } from '../list/persistence'
import { ActiveFilters } from '../components/list/ActiveFilters'
import { FilterControls } from '../components/list/FilterControls'
import { ListToolbar } from '../components/list/ListToolbar'
import { RecipeListView } from '../components/list/RecipeListView'
import { ResultCount } from '../components/list/ResultCount'
import { SearchInput } from '../components/list/SearchInput'
```

- [ ] **Step 4: Replace the data-fetching + derived-state block**

Replace lines 35–54 (from `export function RecipeList() {` through the `uncategorizedCount` line) with:

```tsx
export function RecipeList() {
  const { state, set, clear } = useListState()
  const currentUserId = useCurrentUserId()
  const tags = useTags()
  const ingredients = useIngredients()

  // Server-side filter/sort/pagination. Query changes (by value) reset to page 1.
  const search = useRecipeSearch(buildSearchQuery(state))
  const categoriesReq = useRequest(() => foodly.listCategories(), [])

  // Access guard is redundant (backend enforces it) but harmless.
  const accessibleRecipes = search.recipes.filter((r) => canViewRecipe(r, currentUserId))
  const categories = categoriesReq.data ?? []
  const tagList = Object.values(tags.byId)

  // Ingredient facet: prefer ingredients actually present on loaded recipes; when
  // those carry no ingredient data (REST previews), fall back to the full catalog
  // so the ingredient filter stays usable.
  const usedIngredientList = usedIngredients(accessibleRecipes, ingredients.byId)
  const ingredientOptions =
    usedIngredientList.length > 0
      ? usedIngredientList
      : Object.values(ingredients.byId).sort((a, b) => a.name.localeCompare(b.name))

  // The server already applied every facet; the client only narrows by free-text.
  const visible = accessibleRecipes.filter((r) => matchesSearch(r, state.search))

  // Count of accessible recipes in no category — drives the "Ohne Kategorie" filter.
  const categorizedIds = new Set(categories.flatMap((c) => c.recipes))
  const uncategorizedCount = accessibleRecipes.filter((r) => !categorizedIds.has(r.id)).length
```

- [ ] **Step 5: Point the two `FilterControls`/`ActiveFilters` ingredient props at `ingredientOptions`**

In the `filters` JSX (the `FilterControls`), change `ingredients={usedIngredientList}` to `ingredients={ingredientOptions}`. In the `ActiveFilters` element, change `ingredients={usedIngredientList}` to `ingredients={ingredientOptions}`.

- [ ] **Step 6: Replace the scroll-restore effect's status source**

In the scroll-restore effect (the one reading `recipesReq.status`), replace both references:

```tsx
  const scrollRestored = useRef(false)
  useEffect(() => {
    if (scrollRestored.current || search.status !== 'ready') return
    scrollRestored.current = true
    const y = Number(sessionStorage.getItem(SCROLL_KEY) ?? '')
    if (y > 0) window.scrollTo(0, y)
  }, [search.status])
```

- [ ] **Step 7: Add the infinite-scroll sentinel effect**

Immediately after the scroll-restore effect, add:

```tsx
  // Load the next page when a sentinel near the list end scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !search.hasMore) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) search.loadMore()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [search.hasMore, search.loadMore])
```

- [ ] **Step 8: Replace the results render block**

Replace the render block that switches on `recipesReq.status` (the `<div className="pt-1">…</div>` block, lines ~211–267) with:

```tsx
          <div className="pt-1">
            {search.status === 'loading' && (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
                ))}
              </div>
            )}

            {search.status === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>{search.error?.message}</span>
                  <Button variant="outline" size="sm" onClick={search.reload}>
                    Erneut versuchen
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {search.status === 'ready' && accessibleRecipes.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Noch keine Rezepte.</p>
              </div>
            )}

            {search.status === 'ready' && accessibleRecipes.length > 0 && visible.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <SearchX className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Keine Treffer für die aktuellen Filter.</p>
                {state.search.trim() !== '' && (
                  <p className="max-w-xs text-sm text-muted-foreground/80">
                    Die Suche durchsucht Name, Tags &amp; Abschnitte – nach Zutaten filterst du über den Zutaten-Filter.
                  </p>
                )}
                {isFilterActive(state) && (
                  <Button variant="outline" size="sm" onClick={clear}>
                    Filter zurücksetzen
                  </Button>
                )}
              </div>
            )}

            {search.status === 'ready' && visible.length > 0 && (
              <RecipeListView
                recipes={visible}
                categories={groupingCats}
                detail={state.detail}
                grouped={state.grouped}
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
              />
            )}

            {/* Infinite-scroll trigger + more-pages spinner. */}
            <div ref={sentinelRef} aria-hidden className="h-1" />
            {search.loadingMore && (
              <div className="space-y-3 pt-3">
                <Skeleton className="h-[4.5rem] w-full rounded-xl" />
              </div>
            )}
          </div>
```

- [ ] **Step 9: Fix the `ResultCount` + `categoriesLoading` references**

The `ResultCount` (`matching={visible.length} total={accessibleRecipes.length}`) already uses the new names — no change needed. Confirm `FilterControls` still gets `categoriesLoading={categoriesReq.status === 'loading'}` (unchanged). Confirm no remaining references to `recipesReq`, `nonce`, `setNonce`, `filterRecipes`, or `sortRecipes` exist:

Run: `grep -nE 'recipesReq|setNonce|\bnonce\b|filterRecipes|sortRecipes' src/pages/RecipeList.tsx`
Expected: no output.

- [ ] **Step 10: Run the test + full type-check**

Run: `npx vitest run src/pages/RecipeList.search.test.tsx`
Expected: PASS.
Run: `npm run build`
Expected: `tsc` passes (whole app now type-checks — `listRecipes` no longer referenced anywhere).

- [ ] **Step 11: Commit**

```bash
git add src/pages/RecipeList.tsx src/pages/RecipeList.search.test.tsx
git commit -m "feat(list): server-side recipe search with infinite scroll"
```

---

### Task 8: Clone action on the recipe detail page

**Files:**
- Modify: `src/pages/RecipeDetail.tsx`
- Test: `src/pages/RecipeDetail.clone.test.tsx`

**Interfaces:**
- Consumes: `foodly.copyRecipe` (Task 5); `useNavigate` from `react-router-dom`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RecipeDetail.clone.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

function recipe(id: number): Recipe {
  return {
    id, owner: 1, editors: [], viewers: [], name: 'Base', tags: [], source: null, rating: [],
    time: null, workMinutes: null, overallMinutes: null, sizeNumber: null, sizeText: null,
    notes: [], mainImage: null, images: [], sections: [],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  navigate.mockReset()
})

describe('RecipeDetail clone', () => {
  it('copies the recipe and navigates to the new one', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe(5))
    vi.spyOn(foodly, 'copyRecipe').mockResolvedValue(recipe(99))

    render(<RecipeDetail />)
    await waitFor(() => expect(screen.getByText('Base')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /duplizieren/i }))

    await waitFor(() => expect(foodly.copyRecipe).toHaveBeenCalledWith(5))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes/99'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/RecipeDetail.clone.test.tsx`
Expected: FAIL (no "Duplizieren" button).

- [ ] **Step 3: Add the clone action to `src/pages/RecipeDetail.tsx`**

Update the react-router import (line 2) to include `useNavigate`:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
```

Add `Copy` to the lucide import (line 3):

```tsx
import { Clock, Copy, Info, ListChecks } from 'lucide-react'
```

Inside the component, after the `recipeId` line, add clone state/handler:

```tsx
  const navigate = useNavigate()
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)

  const onClone = async () => {
    if (!recipe) return
    setCloning(true)
    setCloneError(null)
    try {
      const copy = await foodly.copyRecipe(recipe.id)
      navigate(`/recipes/${copy.id}`)
    } catch (e) {
      setCloneError((e as Error).message)
      setCloning(false)
    }
  }
```

Replace the back-button block (lines ~66–68, the single `<Button asChild variant="ghost" …>` with the `Link`) with a row holding the back button and the clone action:

```tsx
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">← Zurück</Link>
        </Button>
        {status === 'ready' && recipe && (
          <div className="flex items-center gap-2">
            {cloneError && <span className="text-sm text-destructive">{cloneError}</span>}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone} disabled={cloning}>
              <Copy className="h-4 w-4" />
              Duplizieren
            </Button>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/RecipeDetail.clone.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RecipeDetail.tsx src/pages/RecipeDetail.clone.test.tsx
git commit -m "feat(recipe): add clone action wired to POST /recipes/{id}/copy"
```

---

### Task 9: Finalize — full suite, format, build, mark spec done

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-rest-backend-wiring-design.md` (status line only)

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: all tests pass (new + pre-existing). If any pre-existing test referenced `foodly.listRecipes`, update it to `searchRecipes` per Task 5/6 patterns and re-run.

- [ ] **Step 2: Format**

Run: `npm run format`
Expected: Prettier writes any whitespace fixes (no logic changes).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc` type-check + `vite build` succeed.

- [ ] **Step 4: Update the spec status line**

In `docs/superpowers/specs/2026-07-10-rest-backend-wiring-design.md`, change:

```markdown
Status: Approved (design), pending implementation plan
```

to:

```markdown
Status: Implemented
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(rest-wiring): format, finalize, mark spec implemented"
```

---

## Manual verification (against a running backend)

Not automated — do once after Task 9 if a backend is available:

1. Start the backend on `:3000` (`cargo run` in `foodly-backend`, with its DB up).
2. In `Foodly-FE`, create `.env.local` with `VITE_MOCK=0` (and no `VITE_API_URL`, so it uses `/api/v1` through the proxy). Run `npm run dev`.
3. Recipe list loads from the backend; applying a tag/duration/role/sort filter changes the results (server-side); scrolling loads more pages.
4. Open a recipe → detail loads. Recipe images show placeholders (no image endpoint yet — expected).
5. Click "Duplizieren" → lands on the new copy's detail page.
6. Set `VITE_MOCK=1` → everything still works offline (search, clone) from fixtures.

## Self-review notes (coverage vs spec)

- Spec §1 (config/proxy/RestClient) → Tasks 1, 2. §2 (API surface) → Task 5. §3 (adapters) → Tasks 1, 3. §4 (list rewire, mapping, infinite scroll, category-facet omission, mock reuse) → Tasks 4, 6, 7. §5 (clone) → Tasks 5, 8. §6 (images placeholder) → covered by no change (previews carry numeric ids; existing asset resolver falls back) + manual step 4. §7 (testing) → tests in Tasks 2–8, suite in Task 9. Still-mocked me/users/categories → unchanged in Task 5. No backend/Rust changes, matching the spec's out-of-scope list.
