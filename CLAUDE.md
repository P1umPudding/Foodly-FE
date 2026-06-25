# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Git — pushing

**Never push on your own.** Committing locally is fine; push only when the user
explicitly says "push" in that request, and that approval does not carry over to
later changes. (This isn't about deploys — pushing `main` currently deploys
nothing. The user just wants to decide when work lands on the remote.)

**Do NOT add a `Co-Authored-By` trailer** (or any AI / Claude co-author line) to
commits in this repo.

## Visual checks

For visual verification of the running app, use the **Chrome MCP** server (real
Chrome) — start/drive Chrome via the MCP tools. Avoid the Playwright-based
browser agent (it installs `@playwright/test` into the project, which must not
land in `package.json`).

## What this is

**Foodly** — a **frontend-only** React SPA (Vite + React Router + TypeScript)
that builds to static files. The hosting target isn't fixed yet (likely a
dedicated static server, not necessarily Cloudflare Pages). It has **no backend
of its own**: it talks to a separate, foreign backend over a **WebSocket**.
There's no server code and no secrets in the repo.

## Architecture

- `src/` — the React app. Routing in `src/App.tsx`, theming in
  `src/theme/ThemeProvider.tsx`.
- `src/api/` — **the only place that talks to the backend.**
  - `socket.ts` — `SocketClient`: connect + auto-reconnect (exponential
    backoff), connection-status subscriptions, request/response correlation,
    and server-pushed events.
  - `index.ts` — the shared `socket` instance + a typed API surface
    (`foodly.*`). The methods are examples; adapt the message `type`s/types to
    the real protocol.
- `src/hooks/` — `useSocketStatus` (live connection state), `useRequest` (run a
  request, track loading/ready/error).
- `src/styles/theme.css` holds the design-token VALUES (shared Skaile brand,
  kept in sync by hand with the Homepage/Recipes apps). `src/styles/styles.css`
  holds the Tailwind v4 wiring (preflight ON).

### Backend access — conventions

- **Always** go through `src/api` (the shared `socket`). Never open ad-hoc
  WebSocket/fetch connections in components.
- The backend URL comes from `import.meta.env.VITE_WS_URL` — **never hardcode
  it.** It's a build-time, non-secret value.
- A request is `socket.request<T>('message.type', payload)`; it resolves with
  the correlated response or rejects on `{ ok:false }` / timeout. Handle the
  rejection (the `useRequest` hook surfaces it as an error state).
- Reconnection is automatic; components react to it via `useSocketStatus()`.
- **Message envelope** (assumed — `{ id, type, payload }` request,
  `{ id, ok, result|error }` response, `{ type, payload }` event): if the real
  backend differs, change only `request()` (the send) and `handleMessage()`
  (the parse) in `socket.ts`.

## Commands

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # tsc type-check + vite build -> dist/
npm run preview  # serve the build
```

Local dev needs `VITE_WS_URL` in `.env.local` (see `.env.example`) for the
backend to connect.

## Conventions

- Page: component in `src/pages/`, add a `<Route>` in `src/App.tsx`.

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
- Style components through their `variant`/`size` props, not by re-implementing
  their look in Tailwind. You MAY add Tailwind classes to tweak spacing/layout —
  just don't rebuild what a prop already does.
- Don't hand-size text: the compact text scale in `src/styles/styles.css`
  (`@theme { --text-* }`) drives sizing via tokens, so the component `size`
  props already render at the right proportions.
- No inline styles (`style={{…}}`). Use Tailwind utilities, or a class in
  `styles.css` for anything Tailwind can't express. A page-specific scoped CSS
  block is usually a sign the content should be React components instead.
- `theme.css` (brand tokens) is a manual copy shared with the Homepage/Recipes
  apps — keep them in sync when changing colors/radii/shadows.
- `styles.css` restores Tailwind v3's default `border-color: var(--border)` (v4
  drops it, so a bare `border` would fall back to `currentColor` — too bright in
  dark, too dark in light). Add explicit `border-*` only to override.
- **Animations & `prefers-reduced-motion`:** decide per animation whether it
  should be gated. The theme-switch reveal (`ThemeToggle`) is intentionally
  user-initiated and runs regardless; gate larger/automatic motion behind
  reduced-motion.
