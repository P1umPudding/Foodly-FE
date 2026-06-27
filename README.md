# Foodly — Frontend

A **frontend-only** React SPA that talks to a separate backend —
[**Foodly-backend**](https://github.com/klassenserver7b/Foodly-backend) — over a
**WebSocket**.

**Stack:** Vite · React · TypeScript · React Router · Tailwind v4 ·
[`@postxl/ui-components`](https://www.npmjs.com/package/@postxl/ui-components)
(shadcn-style component library) · light/dark theming.

## Setup

```bash
npm install
cp .env.example .env.local        # then set VITE_WS_URL
npm run dev                        # http://localhost:5173
```

`npm run build` type-checks (`tsc`) and builds to `dist/`. `npm run preview`
serves the build locally.

### Environment

Vite only exposes vars prefixed with `VITE_`. The only required one:

| Var | Example | Purpose |
|-----|---------|---------|
| `VITE_WS_URL` | `wss://api.example/ws` | Backend WebSocket endpoint |

It's a **build-time** value (baked into the bundle), so it's not a secret —
just configure it per environment (`.env.local` locally, a build variable in
your host).

## Backend connection (WebSocket)

The backend lives in a separate repo:
[**klassenserver7b/Foodly-backend**](https://github.com/klassenserver7b/Foodly-backend).
All backend access goes through the single shared socket in `src/api/`:

- `src/api/socket.ts` — the `SocketClient`: connect + **auto-reconnect**
  (exponential backoff), connection-status subscriptions, **request/response
  correlation**, and server-pushed events.
- `src/api/index.ts` — the shared `socket` instance + a **typed API surface**
  (`foodly.listItems()`, `foodly.syncChanges(...)`, …). These are **examples** —
  adapt the message `type` strings and types to the real protocol.

**Message envelope** (assumed — align with the real backend):

```text
client → server (request):   { id, type, payload? }
server → client (response):  { id, ok, result? | error? }
server → client (event):     { type, payload? }      // no id
```

If the backend differs, change the `send` line in `request()` and the parse
logic in `handleMessage()` — nothing else needs to change.

**Using it in components:**

```tsx
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';

const { status, data } = useRequest(() => foodly.listItems(), []);
```

`useSocketStatus()` exposes the live connection state (see the `ConnectionDot`
in the nav).

## Project structure

```text
src/
  api/         WebSocket client + typed API surface (the only backend access)
  components/  Nav, Footer, ThemeToggle, ConnectionDot
  hooks/       useSocketStatus, useRequest
  pages/       Home, NotFound  (add routes in App.tsx)
  theme/       ThemeProvider (light/dark/system, no-flash)
  styles/      theme.css (brand tokens) + styles.css (Tailwind v4 wiring)
```

## Deployment (static)

Frontend-only → builds to static files and can be served by any static host.
The target isn't fixed yet (likely a dedicated server, not necessarily
Cloudflare Pages).

- Build command: `npm run build` → output in `dist/`.
- Needs an **SPA fallback** (serve `index.html` for unknown routes).
  `public/_redirects` (`/* /index.html 200`) covers Cloudflare-style hosts; on a
  plain server configure the equivalent (e.g. nginx `try_files`).
- Provide `VITE_WS_URL` as a build-time env var for the target environment.
