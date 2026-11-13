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
host).

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_URL` | `/api/v1` | REST base URL. The relative default goes through the Vite dev proxy to `http://localhost:8080`. |
| `VITE_MOCK` | unset (= REST) | `1` = serve everything from `src/mocks`. Any other value: REST. |
| `VITE_WS_URL` | `''` | Reserved for future live editing. Passed to `SocketClient` but never connected. |
| `SKAILE_PREVIEW_BASE` | unset | Set by the Skaile preview (not a `VITE_` var, read in `vite.config.ts`): serves the app under that sub-path (`base`), opens the dev/preview server to the proxy host, and makes mock data the default (injects `VITE_MOCK=1` via `define`) unless `VITE_API_URL` or `VITE_MOCK` is set, in the process environment or a `.env*` file. |

## Backend connection (REST)

The backend lives in a separate repo:
[**klassenserver7b/Foodly-backend**](https://github.com/klassenserver7b/Foodly-backend).
All backend access goes through `src/api/` — components never call `fetch`
themselves. Binding patterns are in [`docs/architecture.md`](docs/architecture.md)
§1, the transport decision in
[`docs/decisions/0001-rest-transport.md`](docs/decisions/0001-rest-transport.md).

- `src/api/rest.ts` — the REST client (`fetch`). Base URL from `VITE_API_URL`,
  bearer token from the session in `src/api/auth.ts`; a 401 triggers one token
  refresh and one retry. On failure it throws `Error(message)` with the
  backend's `error.message`, else `HTTP <status>` (sign-in and sign-up throw
  `ApiError` with `status` and `code`). `collectPages` drains small
  cursor-paginated lists.
- `src/api/auth.ts` — the session: access and refresh token in
  `localStorage["foodly.auth"]`, refreshed shortly before they expire, at most
  one refresh at a time (also across tabs). Exposed as `foodly.auth`
  (`signIn`, `signUp`, `signOut`, `session`, `subscribe`); with `VITE_MOCK=1`
  you are always signed in as user 1.
- `src/api/index.ts` — the typed API surface `foodly.*`. Each method has a
  REST and a mock branch, chosen by the build-time `VITE_MOCK`; response
  wrappers (`{ data }`, cursors) are unwrapped here, so pages only see domain
  types.
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
| `deleteRecipe` | `DELETE /recipes/{id}` |
| `listTags` | `GET /tags` |
| `listIngredients` | `GET /ingredients` |
| `createRecipe` | `POST /recipes` |
| `updateRecipe` | `PUT /recipes/{id}` |
| `uploadImage` | `POST /images` (raw binary body) |
| `getUsers` | `GET /users?ids=…` (chunks of 100, in parallel) |

With `VITE_MOCK=1` every method is answered by `src/mocks`.

**Dev proxy.** `vite.config.ts` proxies `/api` to `http://localhost:8080`, so
the browser talks same-origin and CORS doesn't come into play.

**Signing in.** In REST mode every page except `/login` and `/register` needs a
session. Against a local backend, create the seed users with
`cargo run --bin seed` in the backend repo and sign in as `user1@example.com`
(also `user2`, `user3`); the password is in the
[backend README](https://github.com/klassenserver7b/Foodly-backend#readme), or
register a new account. "Abmelden" sits in the profile menu (REST mode only).

- **Cross-origin backend:** with a `VITE_API_URL` on another origin, add the
  app's origin to the backend's `CORS_ALLOWED_ORIGINS` (default
  `http://localhost:5173`). The backend allows `Authorization` and
  `Content-Type` for those origins.
- **HTTPS:** access and refresh token live in `localStorage` and go out as
  bearer headers, so serve both app and backend over HTTPS anywhere but
  `localhost`.

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
on the mock data unless `VITE_API_URL` or `VITE_MOCK` is set (process
environment or a `.env*` file).

## Checks

There is no GitHub Actions CI in this repo, on purpose
(`docs/decisions/0004-no-github-actions.md`). Run the checks locally before
pushing, in this order:

1. `npm ci`
2. `npm run build`
3. `npm test -- --passWithNoTests`
4. `npm run format:check`
5. `npm run lint`

The Node version comes from `.nvmrc`. If `format:check` fails, run
`npm run format` and commit. `npm run lint` must exit 0; known legacy violations
are listed in `eslint-suppressions.json` (see CLAUDE.md, Linting).

## Deployment (static)

Frontend-only → builds to static files and can be served by any static host.
The target isn't fixed yet (likely a dedicated server, not necessarily
Cloudflare Pages).

- Build command: `npm run build` → output in `dist/`.
- Needs an **SPA fallback** (serve `index.html` for unknown routes).
  `public/_redirects` (`/* /index.html 200`) covers Cloudflare-style hosts; on a
  plain server configure the equivalent (e.g. nginx `try_files`).
- Serve `/api` **same-origin** (reverse proxy to the backend), or point
  `VITE_API_URL` at the backend and add the app's origin to its
  `CORS_ALLOWED_ORIGINS` (see "Signing in" above). HTTPS only.
