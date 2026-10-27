# Foodly — Frontend

A **frontend-only** React SPA for recipes. It has no backend of its own and
talks to a separate backend —
[**Foodly-backend**](https://github.com/klassenserver7b/Foodly-backend) — over
its **REST API under `/api/v1`**. A WebSocket is reserved for future live
editing and isn't used yet.

**Stack:** Vite · React · TypeScript · React Router · Tailwind v4 ·
[`@postxl/ui-components`](https://www.npmjs.com/package/@postxl/ui-components)
(shadcn-style component library) · Vitest + Testing Library · light/dark theming.

## Setup

```bash
npm install
cp .env.example .env.local        # defaults work with the backend on :8080
npm run dev                        # http://localhost:5173
```

No backend running locally? Set `VITE_MOCK=1` in `.env.local` and everything is
served from the local mocks.

`npm run build` type-checks (`tsc`) and builds to `dist/`. `npm run preview`
serves the build locally. `npm test` runs the Vitest suite once
(`npm run test:watch` in watch mode). `npm run format` / `npm run format:check`
apply / check Prettier.

### Environment

Vite only exposes vars prefixed with `VITE_` to the client. They're
**build-time** values (baked into the bundle), so they're not secrets —
configure them per environment (`.env.local` locally, a build variable in your
host). The code is authoritative; some comments in `.env.example` and
`skaile.preview.json` are outdated.

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_URL` | `/api/v1` | REST base URL. The relative default goes through the Vite dev proxy to `http://localhost:8080`. |
| `VITE_MOCK` | unset (= REST) | `1` = serve everything from `src/mocks`. Any other value: REST (only `listUsers` stays mocked). |
| `VITE_WS_URL` | `''` | Reserved for future live editing. Passed to `SocketClient` but never connected. |
| `SKAILE_PREVIEW_BASE` | unset | Set by the Skaile preview (not a `VITE_` var, read in `vite.config.ts`): serves the app under that sub-path (`base`), opens the dev/preview server to the proxy host, and sets `VITE_MOCK=1` when neither `VITE_API_URL` nor `VITE_MOCK` is set in the process environment (`.env*` files don't count and are overridden). |

## Backend connection (REST)

The backend lives in a separate repo:
[**klassenserver7b/Foodly-backend**](https://github.com/klassenserver7b/Foodly-backend).
All backend access goes through `src/api/` — components never call `fetch`
themselves. Binding patterns are in [`docs/architecture.md`](docs/architecture.md)
§1, the transport decision in
[`docs/decisions/0001-rest-transport.md`](docs/decisions/0001-rest-transport.md).

- `src/api/rest.ts` — the REST client (`fetch`). Base URL from `VITE_API_URL`,
  a static dev bearer token (`Authorization: Bearer dev-token`; the backend
  maps any bearer to user 1). On failure it throws `Error(message)` with the
  backend's `error.message`, else `HTTP <status>`. `collectPages` drains small
  cursor-paginated lists.
- `src/api/index.ts` — the typed API surface `foodly.*`. Each method except
  `listUsers` has a REST and a mock branch, chosen by the build-time
  `VITE_MOCK`; response wrappers (`{ data }`, cursors) are unwrapped here, so
  pages only see domain types.
- `src/api/adapters.ts` — shape fixes at the API boundary (e.g.
  `previewToRecipe` for search results). Wire types are in
  `src/api/protocol.ts`.

**REST vs. mocked** (with `VITE_MOCK` unset):

| `foodly.*` | Backend call |
|------------|--------------|
| `me` | `GET /users/me` |
| `listCategories` | `GET /categories` (all pages) |
| `searchRecipes` | `POST /recipes/search` (cursor-paginated) |
| `getRecipe` | `GET /recipes/{id}` |
| `copyRecipe` | `POST /recipes/{id}/copy` |
| `listTags` | `GET /tags` |
| `listIngredients` | `GET /ingredients` |
| `createRecipe` | `POST /recipes` |
| `updateRecipe` | `PUT /recipes/{id}` |
| `uploadImage` | `POST /images` (raw binary body) |
| `listUsers` | **mocked** — the backend has no list endpoint yet (`docs/backend-questions.md` B2) |

With `VITE_MOCK=1` every method is answered by `src/mocks`.

**Dev proxy.** `vite.config.ts` proxies `/api` to `http://localhost:8080`, so
the browser talks same-origin. That's needed because the backend's CORS
`Allow-Headers: *` doesn't cover the `Authorization` header cross-origin.

**WebSocket.** `src/api/socket.ts` (`SocketClient`) is reserved for future live
editing and is never connected today; the mock responder runs through it. The
nav `ConnectionDot` shows "connected" whenever the mock responder is
installed — it doesn't reflect REST/backend health.

**Using it in components:**

```tsx
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useRecipeSearch } from '../hooks/useRecipeSearch'

function Example() {
  const { status, data } = useRequest(() => foodly.listTags(), [])
  const { recipes, hasMore, loadMore } = useRecipeSearch({})
  // …
}
```

## Project structure

```text
src/
  api/         the only backend access
               index.ts (foodly.*), rest.ts (REST client), adapters.ts,
               protocol.ts (wire types), views.ts, assets.ts,
               socket.ts (reserved for live editing)
  catalog/     CatalogProvider (tags, users, ingredients, me)
  components/  Nav, Footer, ThemeToggle, ConnectionDot, …
               + editor/, list/, recipe/
  editor/      recipe-editor draft, autosave, access
  hooks/       useRequest, useRecipeSearch (paginated), useWakeLock,
               useSocketStatus (future live editing)
  list/        recipe-list state: filters, sort, search, URL, persistence
  mocks/       mock responder + data/*.json
  pages/       RecipeList, RecipeDetail, RecipeEditor, NotFound
               (add routes in App.tsx)
  styles/      theme.css (brand tokens) + styles.css (Tailwind v4 wiring)
  test/        Vitest setup
  theme/       ThemeProvider (light/dark/system, no-flash)
  timers/      global cooking timers
docs/
  plan.md, architecture.md, backend-questions.md, backlog.md
  decisions/   ADRs (NNNN-<slug>.md)
  phases/      phase specs
  superpowers/ specs/ and plans/ per feature
```

## Skaile preview

`skaile.preview.json` declares the Vite dev server as the preview app. The
Skaile preview sets `SKAILE_PREVIEW_BASE`; `vite.config.ts` then serves the app
under that sub-path and, since no backend is reachable from the preview, runs
on the mock data unless `VITE_API_URL` or `VITE_MOCK` is set in the process
environment.

## Deployment (static)

Frontend-only → builds to static files and can be served by any static host.
The target isn't fixed yet (likely a dedicated server, not necessarily
Cloudflare Pages).

- Build command: `npm run build` → output in `dist/`.
- Needs an **SPA fallback** (serve `index.html` for unknown routes).
  `public/_redirects` (`/* /index.html 200`) covers Cloudflare-style hosts; on a
  plain server configure the equivalent (e.g. nginx `try_files`).
- Serve `/api` **same-origin** (reverse proxy to the backend). A cross-origin
  `VITE_API_URL` won't work until the backend allows `Authorization` in CORS
  (`docs/backend-questions.md` B7).
