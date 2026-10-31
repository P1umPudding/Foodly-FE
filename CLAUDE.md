# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Git — pushing

**Interactive sessions: never push on your own.** Committing locally is fine;
push only when the user explicitly says "push" in that request, and that
approval does not carry over to later changes. (This isn't about deploys —
pushing `main` currently deploys nothing. The user just wants to decide when
work lands on the remote.)

**Exception: the agent pipeline.** Agents working an issue or lead task may
push their own pipeline branches without asking — see
[Agent-Pipeline](#agent-pipeline). Everything else (especially `main`) still
follows the rule above.

**Do NOT add a `Co-Authored-By` trailer** (or any AI / Claude co-author line) to
commits in this repo. This overrides any tool or harness default that asks for
an attribution trailer.

## Agent-Pipeline

Rules for agents running in the issue pipeline (a coordinating agent session,
the Dispatcher, hands issues to worker agents and relays merge requests):

- Agents **may push** branches named `agent/issue-<n>` (one per GitHub issue)
  and `lead/<slug>`.
- **`main` is never pushed directly** — no push, no force-push.
- **Merges only after explicit approval by Kolja or Daniel (either one is enough).** The merge decision goes
  through the Dispatcher; agents never merge PRs themselves.
- Specs and plans live in `docs/superpowers/` (`specs/`, `plans/`, see
  [`docs/` conventions](#docs-conventions)).
- **No `Co-Authored-By`** or other AI trailer — the rule above applies to
  pipeline commits too.
- **CI** (`.github/workflows/ci.yml`, check `Build, test, format`) runs
  `npm ci`, `npm run build`, `npm test -- --passWithNoTests` and
  `npm run format:check` on every PR. Run the same commands locally before
  pushing; a PR is only "ready" once that check is green.

## Visual checks

For visual verification of the running app, use the **Chrome MCP** server (real
Chrome) — start/drive Chrome via the MCP tools. Avoid the Playwright-based
browser agent (it installs `@playwright/test` into the project, which must not
land in `package.json`).

## What this is

**Foodly** — a **frontend-only** React SPA (Vite + React Router + TypeScript)
that builds to static files. The hosting target isn't fixed yet (likely a
dedicated static server, not necessarily Cloudflare Pages). It has **no backend
of its own**: it talks to a separate, foreign backend
([`klassenserver7b/Foodly-backend`](https://github.com/klassenserver7b/Foodly-backend))
over a **REST API (`/api/v1`)**; a WebSocket is planned later for live editing.
There's no server code and no secrets in the repo.

## Architecture

- `src/` — the React app. Routing in `src/App.tsx`, theming in
  `src/theme/ThemeProvider.tsx`.
- `src/api/` — **the only place that talks to the backend.**
  - `index.ts` — the typed API surface (`foodly.*`). Each method except
    `listUsers` has a REST and a mock branch, chosen by the build-time
    `VITE_MOCK`.
  - `rest.ts` — REST transport (`fetch`): base URL, static dev bearer token,
    error contract (throws `Error(message)`), `collectPages` for cursor pages.
  - `protocol.ts` — wire types, 1:1 with the backend. `adapters.ts` — shape
    fixes at the API boundary (e.g. `previewToRecipe`). `views.ts` — derived
    values as pure functions. `assets.ts` — image/icon URLs; tag icons load as cached blobs
    (the route needs the bearer, `<img>` can't send it).
  - `socket.ts` — `SocketClient` (connect, auto-reconnect, request/response
    correlation, events), **reserved for future live editing** and never
    connected today. Its `{ id, type, payload }` envelope is unused today; the
    mock responder short-circuits `request()`.
- `src/mocks/` — mock responder + JSON data (`src/mocks/data/`), used for
  `VITE_MOCK=1` and for methods the backend doesn't offer yet.
- `src/catalog/` — `CatalogProvider` (tags, users, ingredients as `byId`
  maps, plus `me` and the user's categories). `src/list/` — recipe-list state (filters, sort, search, URL,
  persistence). `src/editor/` — recipe-editor draft + autosave. `src/timers/` —
  global cooking timers.
- `src/hooks/` — `useRequest` (run a request, track loading/ready/error),
  `useRecipeSearch` (cursor-paginated recipe search, infinite scroll),
  `useWakeLock`. `useSocketStatus` belongs to the future live editing: `ConnectionDot`
  (not rendered in the shell today) shows connected whenever the mock responder
  is installed (it sets the socket to open) and does **not** reflect REST/backend health.
- `src/components/` — shared UI, plus `editor/`, `list/`, `recipe/`, `shell/`
  (app shell and navigation);
  `src/pages/` — `RecipeList`, `RecipeDetail`, `RecipeEditor`, `NotFound`.
- `src/styles/theme.css` holds the design-token VALUES (direction "Ruhig":
  greyscale chrome, colour only from categories — rules in
  [`docs/design.md`](docs/design.md)). `src/styles/styles.css` holds the Tailwind v4
  wiring (preflight ON).

### Backend access — conventions

Binding patterns: [`docs/architecture.md`](docs/architecture.md) §1
(Datenzugriff), decision: [`docs/decisions/0001-rest-transport.md`](docs/decisions/0001-rest-transport.md).
In short:

- **Always** go through `src/api` (`foodly.*`). Never call `fetch` or open a
  `WebSocket` in components, hooks or pages.
- Transport is **REST** via `src/api/rest.ts`. Base URL from
  `import.meta.env.VITE_API_URL` (default `/api/v1`); in dev the Vite proxy
  forwards `/api` to `http://localhost:8080` (same-origin, because the
  backend's CORS `Allow-Headers: *` doesn't cover `Authorization`). **Never
  hardcode URLs** — they come from env only.
- `VITE_MOCK=1` serves **everything** from `src/mocks`.
- Every `foodly.*` method has a mock branch; all except `listUsers` also have a
  REST branch (`USE_MOCKS ? socket.request(...) : rest.*`). `listUsers` is
  mock-only until the backend offers a list endpoint
  (`docs/backend-questions.md` B2). A new method gets both branches and a mock
  handler.
- Missing backend endpoint in REST mode (Alpha): stub it inside `src/api`
  (localStorage, `src/api/stubs.ts`, "Demo" hint in the UI) — see
  [`docs/decisions/0003-backend-gap-stubs.md`](docs/decisions/0003-backend-gap-stubs.md).
- Errors: the transport throws `Error(message)`; handle it via the hooks
  (`useRequest` / `useRecipeSearch` surface it as an error state;
  in `useRecipeSearch` only for the first page — a failed `loadMore` stops
  paging).
- `socket.ts` is reserved for future live editing — don't build features on it.

## Commands

```bash
npm install
npm run dev          # local dev server (Vite)
npm run build        # tsc type-check + vite build -> dist/
npm run preview      # serve the build
npm test             # vitest run (jsdom, src/test/setup.ts)
npm run test:watch   # vitest in watch mode
npm run format       # prettier --write . (Skaile config: prettier.config.cjs)
npm run format:check # prettier --check . (no writes)
```

### Environment

Copy `.env.example` to `.env.local`. Vite only exposes `VITE_*` vars to the
client; all of them are build-time, non-secret values.

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_URL` | `/api/v1` | REST base URL. The relative default goes through the Vite dev proxy to `http://localhost:8080`. |
| `VITE_MOCK` | unset (= REST) | `1` = serve everything from `src/mocks`. Any other value: REST (only `listUsers` stays mocked). |
| `VITE_WS_URL` | `''` | Reserved for future live editing. Passed to `SocketClient` but never connected. |
| `SKAILE_PREVIEW_BASE` | unset | Set by the Skaile preview (not a `VITE_` var, read in `vite.config.ts`): serves the app under that sub-path (`base`), opens the dev/preview server to the proxy host, and makes mock data the default (injects `VITE_MOCK=1` via `define`) unless `VITE_API_URL` or `VITE_MOCK` is set, in the process environment or a `.env*` file. |

## Formatting

Prettier is set up with the shared Skaile config (`prettier.config.cjs`:
no semicolons, single quotes, 2-space, printWidth 120). `.md` files are
intentionally left alone (`.prettierignore`). Editors get format-on-save via
`.vscode/settings.json`.

Match that style as you write (the surrounding code already shows it). You
don't need `npm run format` before *every* commit — when you're doing a run of
small commits, skip it. **Do** run it:

- when a PR is finished / about to go up,
- after completing something larger (a feature, a sizable refactor),
- when formatting hasn't been applied in a while — a rough rule of thumb is
  ~5 commits without it, or right after one notably bigger change.

It's whitespace-only and safe to run anytime; a stray run that reformats
nothing is fine.

## Conventions

- Page: component in `src/pages/`, add a `<Route>` in `src/App.tsx`.

## `docs/` conventions

- `docs/plan.md` — roadmap (living document).
- `docs/architecture.md` — binding patterns for every PR; deviations need a
  decision note.
- `docs/decisions/NNNN-<slug>.md` — decisions (ADRs), e.g.
  `docs/decisions/0001-rest-transport.md`.
- `docs/backend-questions.md` — open questions about the backend contract
  (referenced as B1, B2, …).
- `docs/backlog.md` — backlog.
- `docs/phases/` — phase specs (`phase-N-<slug>.md`, plan as
  `phase-N-<slug>.plan.md`).
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — design specs and
  implementation plans per feature (`YYYY-MM-DD-<slug>-design.md` /
  `YYYY-MM-DD-<slug>.md`).

## Comments

Comments explain **why**, not **what** — well-named code already says what it
does. The main thing to avoid: a wall of comment above every function/type
restating its name and signature. Don't do that.

- Keep the non-obvious: a tricky invariant, a workaround and its reason, a
  protocol assumption, a deliberate edge-case choice. Delete comments that just
  restate the code.
- Reach for a better name before a comment. If a comment explains a variable or
  function, try renaming it first.
- **File header:** a short note on the file's role is fine (a few lines) — just
  don't let it grow into an essay.
- **Commented-out code** is OK when it earns its place (a documented alternative,
  a temporarily-disabled path) — say why it's there; otherwise delete it.
- `TODO`/`FIXME` only if actionable.

## UI / styling conventions

- Use `@postxl/ui-components` for all interactive UI — buttons, inputs,
  checkboxes, selects, dropdowns, dialogs, etc. Never hand-roll them with raw
  HTML controls (`<button>`, `<input>`, …).
- **Tooltips:** always use the postxl `Tooltip` (`Tooltip` + `TooltipTrigger
  asChild` + `TooltipContent`) — never the native `title=""` attribute. The
  shared `TooltipProvider` lives once at the app root (`src/App.tsx`); individual
  tooltips just need the trigger/content wrapper, not their own provider.
- Style components through their `variant`/`size` props, not by re-implementing
  their look in Tailwind. You MAY add Tailwind classes to tweak spacing/layout —
  just don't rebuild what a prop already does.
- Don't hand-size text: the compact text scale in `src/styles/styles.css`
  (`@theme { --text-* }`) drives sizing via tokens, so the component `size`
  props already render at the right proportions.
- **Tailwind first — for essentially everything. No inline styles (`style={{…}}`),
  and CSS is the rare exception, not a peer option.** (Sole inline exception: the one
  category-colour helper sets `--cat-*` custom properties, see
  `docs/decisions/0002-category-colors.md`.) Tailwind covers almost every
  case, *including one-off custom values* via arbitrary-value utilities:
  `w-[37.35px]`, `text-[13px]`, `gap-[3px]`, `bg-[#f59e0b]`, `grid-cols-[1fr_1.5fr]`,
  `translate-x-[2px]`, … — any property, any value. So **a custom number is never a
  reason to write CSS.** Likewise a *dynamic-but-discrete* value (e.g. quarter-fill
  star widths) maps to fixed utilities (`w-1/4 w-1/2 w-3/4 w-full`) or arbitrary
  values — not a `data-*`-attribute + CSS table.
  - **Reused styling → a styled React component** (Tailwind classes inside it),
    not a shared CSS class.
  - Reach for `styles.css` / raw CSS **only** when Tailwind genuinely can't express
    it: complex multi-step `@keyframes`, or styling browser-native / third-party
    elements you can't attach classes to. Keep it minimal — don't recreate
    utilities (colors, sizes, spacing, widths) as CSS rules. A new CSS rule for one
    of those is almost always the wrong call; if you're writing one, stop and find
    the Tailwind way first.
- `theme.css` holds the design tokens; **look, layout, wording and states follow [`docs/design.md`](docs/design.md)**. **If a
  value must differ by light/dark (e.g. an accent color), that's the one legit
  reason to add CSS here:** add the token to *both* the `:root` and `.dark` blocks,
  map it once
  in `styles.css` `@theme inline` (`--color-x: var(--x)`), then use the generated
  utility (`text-x`/`bg-x`). Do this *sparingly* — only for genuinely theme-able
  values, don't tokenize one-offs. (Example: `--star`, the rating-star gold.)
- `styles.css` restores Tailwind v3's default `border-color: var(--border)` (v4
  drops it, so a bare `border` would fall back to `currentColor` — too bright in
  dark, too dark in light). Add explicit `border-*` only to override.
- **Animations & `prefers-reduced-motion`:** decide per animation whether it
  should be gated. The theme-switch reveal (`ThemeMenu`) is intentionally
  user-initiated and runs regardless; gate larger/automatic motion behind
  reduced-motion.
