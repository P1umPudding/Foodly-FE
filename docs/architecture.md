# Architektur — verbindliche Muster

Kurz und konkret. Gilt für jede PR; Abweichungen nur mit Decision-Note
(`docs/decisions/`). Stil-, Kommentar- und Git-Regeln stehen in `CLAUDE.md` und
werden hier nicht wiederholt.

> Stand: `main` (REST-Anbindung #12, Rezept-Editor #13, Skaile-Preview #21).

## 1. Datenzugriff nur über `src/api`

- Komponenten, Hooks und Seiten rufen **ausschließlich** `foodly.*` aus
  `src/api/index.ts`. Kein `fetch`, kein `WebSocket` außerhalb von `src/api`.
- Transport (`docs/decisions/0001-rest-transport.md`):
  - **REST** (`src/api/rest.ts`) für alles, was das Backend implementiert. Basis-URL
    `VITE_API_URL` (Default `/api/v1`, in Dev über den Vite-Proxy → `:8080`,
    `vite.config.ts`). Nie hardcoden.
  - **Mocks** (`src/mocks/index.ts`) über den `SocketClient`-Mock-Responder. Mit
    `VITE_MOCK=1` (die Skaile-Preview setzt das automatisch, außer `VITE_API_URL`
    oder `VITE_MOCK` sind in Env oder `.env*` gesetzt) läuft **alles** über Mocks;
    ohne nur die Methoden, für die das Backend noch nichts hat (aktuell
    `listUsers`, siehe `docs/backend-questions.md` B2).
  - **Stubs** für fehlende Endpoints im REST-Modus (Alpha): Zweig in der
    `foodly.*`-Methode, Daten in `localStorage` (`foodly.stub.*`), Register
    `src/api/stubs.ts` (`isStubbed`), UI-Hinweis „Demo“. Regeln:
    `docs/decisions/0003-backend-gap-stubs.md`.
  - **WebSocket** (`src/api/socket.ts`) ist für späteres Live-Editing reserviert und
    wird heute nicht verbunden.
- Jede neue `foodly.*`-Methode bekommt **beide Zweige** (`USE_MOCKS ? socket.request(...) : rest.*`)
  und einen Mock-Handler, damit `VITE_MOCK=1` vollständig bleibt.
- Fehlervertrag: Transport wirft `Error(message)` (REST: `error.message` aus dem
  Envelope, sonst `HTTP <status>`). Aufrufer fangen das über die Hooks (Abschnitt 4).
- Response-Hüllen (`{ data }`, `{ data, cursor }`) werden **in `foodly.*`** ausgepackt;
  Seiten sehen nur Domain-Typen. Cursor-Pagination: `collectPages` (`rest.ts`) für
  kleine Listen, `useRecipeSearch` für Infinite Scroll.

## 2. Typen: `protocol.ts` vs. View-Modelle

- `src/api/protocol.ts` = **Wire-Vertrag**, 1:1 zum Backend (camelCase, wie geliefert).
  Nur Typen, keine Logik. Write-Bodies eigene Typen (`CreateRecipe`, …), weil sie
  sich von den Read-Typen unterscheiden (IDs statt expandierter Refs).
- Abweichende Formen werden an der API-Grenze angepasst: `src/api/adapters.ts`
  (z. B. `previewToRecipe`).
- Abgeleitete Werte als **reine Funktionen** in `src/api/views.ts` (`myRole`,
  `collaborationState`, `averageRating`, `formatIngredient`, `scaleAmount`, …).
  Keine abgeleiteten Felder in die Wire-Typen schreiben.
- Asset-URLs (Bilder, Tag-Icons) nur über `src/api/assets.ts` — eine Stelle für das
  Backend-Schema (offen: B1). Tag-Icons braucht die REST-Route mit Bearer, darum lädt
  `assets.ts` sie als Blob (`loadTagIcon`, gecacht); `useTagIcon` ist der eine Hook,
  der `assets.ts` statt `foodly.*` aufruft.

## 3. Kataloge & globaler State

- `src/catalog/CatalogProvider.tsx` lädt Tags, Users, Ingredients und `me` einmal und
  stellt `byId`-Maps bereit. Neue globale Lookup-Daten gehören hierhin, nicht in
  Seiten-State.
- App-weiter State als Provider in `src/App.tsx` (z. B. `TimerProvider`, der die
  `AppShell` umschließt, damit Timer Navigation überleben). Kein globaler Store (kein
  Redux/Zustand) ohne Decision-Note.
- Feature-State als reine Reducer/Funktionen + Hook: Liste in `src/list/`
  (`state.ts`, `query.ts`, `url.ts`, `persistence.ts`, `useListState.ts`), Editor in
  `src/editor/` (`draft.ts`, `useAutosave.ts`, `access.ts`).
- Persistenz im Browser nur über versionierte `localStorage`-Keys pro User
  (Muster: `src/list/persistence.ts`, `foodly:<feature>:<userId>`, `VERSION`).
- URL ist Quelle für teilbaren State (Filter in `src/list/url.ts`).

## 4. Hooks & Lade-/Fehler-/Leer-Zustände

- One-shot-Reads: `useRequest(run, deps)` (`src/hooks/useRequest.ts`) →
  `loading | ready | error`.
- Paginierte Reads: `useRecipeSearch` (akkumuliert Seiten, reset bei Query-Wechsel).
- Schreiben mit Autosave: `useAutosave` (Debounce, single-flight, Koaleszenz).
- Jede datengetriebene Ansicht rendert **alle drei** Zustände:
  - Laden → postxl `Loader`,
  - Fehler → postxl `Alert` (Muster: `src/pages/RecipeDetail.tsx`),
  - Leer → expliziter Leer-Text, nie eine leere Fläche.
- Einzelaktionen (Upload, Duplizieren) melden Fehler per `Toaster`-Toast.
- Berechtigungen im UI sind UX, nicht Sicherheit: reine Prädikate (`canEdit`,
  `canViewRecipe`) neben den Views; das Backend erzwingt per 403.

## 5. Routing

- `BrowserRouter` + `<Routes>` in `src/App.tsx`; Seite = Komponente in `src/pages/`.
- Statische Segmente vor Parametern (`/recipes/new` vor `/recipes/:id`).
- Seiten mit seed-einmal-State per `key` auf die Route-Identität remounten
  (`RecipeEditorRoute` in `src/App.tsx`).
- Kein Data Router (`createBrowserRouter`) → kein `useBlocker`; Verlassen-Schutz via
  `beforeunload` + Flush bei Unmount. Migration nur mit Decision-Note.
- Struktur (Phase 5 rev. 2, `docs/superpowers/specs/2026-07-07-phase-5-dashboard-app-restructure-design.md`;
  bei der Navigationsform hat das Redesign Vorrang, `docs/design/redesign/README.md` §1.6):
  `/recipes` Liste; `/` leitet bis zum Dashboard-Issue mit Query auf `/recipes` weiter
  (`RootRedirect`). Kategorien nur als Filter `/recipes?cat=<id>` (keine eigene Route).
  `src/components/shell/`: `AppShell` mit `NAV_DESTINATIONS` (`nav.ts`, einzige Quelle,
  „Start“ vorbereitet, aber ausgeblendet); ab 761 px (`useIsDesktop`) Seitenleiste
  (einklappbar, Kategorien, Profil), darunter Tab-Leiste + „+“-FAB + Avatar. Das Fenster
  bleibt der Scroll-Container; feste Seitenleisten nutzen `--shell-left`/`--shell-bottom`.
  Groups-Routen erst nach B12 + Backend #13.

## 6. UI & Styling

Verbindlich nach `CLAUDE.md`: nur `@postxl/ui-components` für Controls, postxl
`Tooltip`, Tailwind first, keine Inline-Styles, Theme-Tokens nur in `theme.css` für
Light/Dark-Werte. Wiederverwendetes Styling = React-Komponente. Komponenten nach
Feature in `src/components/<feature>/`.

Kategorie-Farben (ADR [0002](decisions/0002-category-colors.md)): eine gespeicherte
Farbe, Rollen `dot/soft/ink/line` pro Theme aus `src/lib/categoryColor.ts`.
Einzige Inline-Ausnahme: der eine Helper setzt `--cat-*`-Custom-Properties am
Element, Komponenten nutzen nur `bg-cat-dot`, `bg-cat-soft`, `text-cat-ink`, `border-cat-line`.

## 7. Tests

- Vitest + Testing Library, jsdom (`vite.config.ts`, Stubs in `src/test/setup.ts`).
- **Reine Logik wird unit-getestet** (Reducer, Mapper, Views, Adapter) — Datei
  `x.test.ts` neben `x.ts`.
- Komponenten/Seiten: Smoke- und Flow-Tests gegen den Mock-Pfad
  (Vorbild `src/pages/RecipeDetail.clone.test.tsx`, `RecipeEditor.test.tsx`).
- REST-Client-Tests mocken `fetch` (`src/api/rest.test.ts`).
- Visuelle Prüfung über Chrome MCP, nie Playwright ins Projekt.
- Vor PR: `npm test`, `npm run build`, `npm run format`.

## 8. Offene Architekturpunkte

- Auth/Token-Handling fehlt (statischer `dev-token` in `rest.ts`), wartet auf B7.
