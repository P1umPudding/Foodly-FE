# 0001 — REST als Transport, WebSocket nur für Live-Editing

**Status:** angenommen (umgesetzt in `feat/rest-backend-wiring`, PR #12) · 2026-10-27

## Kontext

Das Frontend war auf ein WebSocket-Backend ausgelegt (`src/api/socket.ts`,
`CLAUDE.md`). Das Backend (`klassenserver7b/Foodly-backend`, `web-api`) ist eine
REST-API unter `/api/v1`; WebSocket ist dort erst für Live-Editing geplant.

## Entscheidung

- Reads und Writes laufen über `src/api/rest.ts` (fetch), Routing pro Methode in
  `src/api/index.ts`.
- Was das Backend noch nicht hat, bleibt auf dem Mock-Responder; `VITE_MOCK=1`
  mockt alles.
- `SocketClient` bleibt unverändert und für Live-Editing reserviert.
- Dev läuft same-origin über den Vite-Proxy (CORS-`*` deckt `Authorization` nicht ab).

## Konsequenzen

- Neue Methoden brauchen REST- **und** Mock-Zweig.
- Prod muss same-origin hinter einem Reverse-Proxy laufen, oder das Backend erlaubt
  `Authorization` explizit (`docs/backend-questions.md` B7).
- `CLAUDE.md` muss nach dem Merge den REST-Transport beschreiben.
