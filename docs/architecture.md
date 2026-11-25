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
    ohne wird der Mock-Responder gar nicht geladen (fehlende Endpoints: Stubs, s. u.).
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
  Backend-Schema (Rezeptbilder: Lesen als `ImageRef`, Schreiben als IDs;
  angezeigt über das öffentliche `GET /images/{hash}`, FE #144). Tag-Icons braucht die REST-Route mit Bearer, darum lädt
  `assets.ts` sie als Blob (`loadTagIcon`, gecacht); `useTagIcon` ist der eine Hook,
  der `assets.ts` statt `foodly.*` aufruft.

## 3. Kataloge & globaler State

- `src/catalog/CatalogProvider.tsx` lädt Tags, Users, Ingredients und `me` einmal und
  stellt `byId`-Maps bereit. Neue globale Lookup-Daten gehören hierhin, nicht in
  Seiten-State. Ohne `me` rendert er statt der App einen Fehler mit „Erneut versuchen“.
  Die Kategorien des Nutzers lädt er beim Start und neu (im Hintergrund), wenn eine
  Rezept-Änderung ihre Mitglieder ändert: wer anlegt, kopiert oder löscht, ruft
  `useRefreshCategories()`.
- App-weiter State als Provider in `src/App.tsx` oder, wenn er an der Sitzung hängt,
  in `RequireAuth` (z. B. `TimerProvider`: pro Nutzer, mit `key` auf die User-ID, umschließt
  die `AppShell`, damit Timer Navigation überleben). Kein globaler Store (kein
  Redux/Zustand) ohne Decision-Note.
- Feature-State als reine Reducer/Funktionen + Hook: Liste in `src/list/`
  (`state.ts`, `query.ts`, `url.ts`, `persistence.ts`, `useListState.ts`), Editor in
  `src/editor/` (`draft.ts`, `useAutosave.ts`, `access.ts`), zuletzt angesehene Rezepte in
  `src/home/recentlyViewed.ts`, Detail und Koch-Modus in `src/cook/` (`size.ts`: Größe als
  `?servings`/`?factor`; `checkedIngredients.ts`: abgehakte Zutaten als kleiner In-Memory-Store mit
  `useSyncExternalStore`, pro Rezept, ohne Web Storage — festgelegt in
  `docs/superpowers/specs/2026-11-13-detail-cook-redesign-design.md`).
- Persistenz im Browser nur über versionierte `localStorage`-Keys pro User
  (Muster: `src/list/persistence.ts`, `foodly:<feature>:<userId>`, `VERSION`).
- URL ist Quelle für teilbaren State (Filter in `src/list/url.ts`, Rezeptgröße in `src/cook/size.ts`).

## 4. Hooks & Lade-/Fehler-/Leer-Zustände

- One-shot-Reads: `useRequest(run, deps)` (`src/hooks/useRequest.ts`) →
  `loading | ready | error`.
- Paginierte Reads: `useRecipeSearch` (akkumuliert Seiten, reset bei Query-Wechsel). Schlägt eine Folgeseite
  fehl, bleibt der Cursor (`hasMore`), `loadMoreError` ist gesetzt und das Paging pausiert bis `retryLoadMore`
  (kein Auto-Retry über den Sentinel).
- Schreiben mit Autosave: `useAutosave` (Debounce, single-flight, Koaleszenz).
- Jede datengetriebene Ansicht rendert **alle drei** Zustände:
  - Laden → Skelette in der Form des Inhalts (postxl `Skeleton`, Redesign §1.7; z. B.
    Rezeptliste je Ansicht), postxl `Loader` nur für kleine Einzelbereiche,
  - Fehler → postxl `Alert` (Muster: `src/pages/RecipeDetail.tsx`),
  - Leer → expliziter Leer-Text, nie eine leere Fläche.
- Einzelaktionen (Upload, Kopie erstellen) melden Fehler per `Toaster`-Toast.
- Berechtigungen im UI sind UX, nicht Sicherheit: reine Prädikate (`canEdit`,
  `canViewRecipe`) neben den Views; das Backend erzwingt per 403.

## 5. Routing

- `BrowserRouter` + `<Routes>` in `src/App.tsx`; Seite = Komponente in `src/pages/`.
- Statische Segmente vor Parametern (`/recipes/new` vor `/recipes/:id`).
- Seiten mit seed-einmal-State per `key` auf die Route-Identität remounten
  (`RecipeEditorRoute` in `src/App.tsx`).
- Code-Splitting (#221): Start, Liste, Detail, Profil und 404 liegen im Einstiegs-Chunk (häufige erste Seiten);
  Editor, Koch-Modus, Kategorien, Kategorieseite, Login und Registrierung lädt `React.lazy` nach. Jede lazy Route
  steckt einzeln in `LazyRoute` (`src/components/RouteErrorBoundary.tsx`), damit Shell und Tab-Leiste stehen bleiben:
  Fallback ist ein Skelett in Seitenform aus dem Einstieg (nie aus der Seite selbst importieren), ein gescheiterter
  Chunk zeigt `ErrorState`, „Erneut versuchen“ lädt die Seite neu (React.lazy merkt sich den Fehler). Neue seltene
  Seiten genauso einhängen; Tests warten auf lazy Seiten mit `await findBy…` oder `lazyPageLoaded()`
  (`src/test/lazyRoutes.ts`), nie darauf, dass ein früherer Test die Seite schon geladen hat.
- Einstiegs-Chunk und `@postxl/ui-components` (#309): postxl kommt als eine vorgebündelte Datei ohne PURE-Annotationen und
  lässt sich nicht tree-shaken; ungenutzte Komponenten bleiben im Einstieg. Den Code von postxl beim Build umschreiben ist
  ausgeschlossen (gilt als Patch). Ungenutzte postxl-Abhängigkeiten, die nur ihr eigener Top-Level-Code im Einstieg hält,
  kommen in die Liste in `src/treeshake.ts` (Kriterien dort). `chunkSizeWarningLimit` in `vite.config.ts` liegt knapp
  über der Einstiegsgröße und warnt, wenn sie wächst. React Router 7 (#333, Begründung #334) gehört ebenfalls in den
  Einstieg: sein Kern ist ein einziges Modul, das Foodly fast vollständig nutzt. Ihn in einen eigenen, immer geladenen
  Vendor-Chunk auszulagern hilft nicht, weil der erste Seitenaufruf gleich viel lädt und die Warnung ihren Sinn verlöre.
  Wächst der Einstieg durch eine Abhängigkeit, die er wirklich braucht, und lässt er sich nicht sinnvoll verkleinern,
  kommt das Limit knapp über die neue Größe; die Begründung steht hier. Stand #334: Limit 710 kB, Einstieg 704,26 kB,
  mit den nativen PRs #336/#337 708,34 kB (Web) bzw. 708,73 kB (Native).
- Kein Data Router (`createBrowserRouter`) → kein `useBlocker`; Verlassen-Schutz via
  `beforeunload` + Flush bei Unmount. Lesezugriffe (`getRecipe`, `searchRecipes`) warten auf den
  noch laufenden Unmount-Save (`src/api/pendingSaves.ts`, max. 10 s); Requests deshalb in Effects
  starten, nicht im Render. Migration nur mit Decision-Note.
- Struktur (Phase 5 rev. 3, `docs/superpowers/specs/2026-07-07-phase-5-dashboard-app-restructure-design.md`;
  bei der Navigationsform hat das Redesign Vorrang, `docs/design/redesign/README.md` §1.6):
  `/recipes` Liste; `/` Start-Seite (`Home`, Spec rev. 3); mit mindestens einem Listen-Parameter
  (`LIST_PARAM_KEYS` in `src/list/url.ts`) leitet `/` samt Query und Hash auf `/recipes` weiter
  (`src/pages/RootRoute.tsx`). Abschnitte der Start-Seite sind `HomeSection`s
  (`src/components/home/`); sie melden ihren Zustand an `HomeSectionsProvider`, der die Karte
  „Nichts zu zeigen“ nur zeigt, solange keiner gemeldet ist oder alle leer sind. Kategorien nur
  als Filter `/recipes?cat=<id>` (keine eigene Route).
  `src/components/shell/`: `AppShell` mit `NAV_DESTINATIONS` (`nav.ts`, einzige Quelle,
  „Start“ vor „Rezepte“); ab 761 px (`useIsDesktop`) Seitenleiste
  (einklappbar, Kategorien, Profil), darunter Tab-Leiste + „+“-FAB + Avatar. Das Fenster
  bleibt der Scroll-Container; feste Seitenleisten nutzen `--shell-left`/`--shell-bottom`.
  Kopfzeile (#228): Unterseiten (Rezept, Kategorie, Editor) zeigen Zurück-Pfeil und Brotkrume
  „<Herkunft> / <Name>“. Seiten legen ihre Aktionen per `HeaderActions` (Portal) in die Kopfzeile
  und melden den Namen per `HeaderCrumbName` (`PageHeader.tsx`, ohne Router-Import); Dialoge
  bleiben im Seitenbaum. Die Herkunft merkt sich `useOrigin` je History-Eintrag (sessionStorage).
  Seiteninhalt in `Page` (max. 1080 px, Liste `wide` 1280 px).
  Groups-Routen erst nach B12 + Backend #13.
- Koch-Modus (#209): `/recipes/:id/cook` (`CookMode`, per `key` auf die id) liegt hinter `RequireAuth`, aber
  ohne `AppShell`. Unter `RequireAuth` wählt jede Route ihren Rahmen per Layout-Route: `ShellLayout`
  (`AppShell`) für alle anderen Seiten, `BareLayout` (nur `TimerPanelProvider`) für den Koch-Modus. Timer,
  Kataloge und der eine `Toaster` (`AppToaster`, Abstand je nach Route) hängen an `RequireAuth`, damit
  laufende Timer und ein offener Alarm-Toast den Wechsel Detail ↔ Koch-Modus überstehen. Der aktuelle
  Schritt steht nicht in der URL; ✕/„Fertig“/Esc gehen mit Verlauf zurück, sonst zu `/recipes/:id` mit
  dem Größen-Parameter.
- Anmeldung (#142): `/login` und `/register` liegen **außerhalb** von `AppShell` und
  `CatalogProvider` (hinter `RedirectIfSignedIn`); alle anderen Routen inkl. 404 hängen an
  `RequireAuth` (`src/components/shell/RequireAuth.tsx`), der ohne Sitzung synchron mit
  `replace` auf `/login?next=<pfad+query+hash>` umleitet und `TimerProvider` und `CatalogProvider` mit
  `key={userId}` rendert (die Shell kommt erst darunter, siehe Koch-Modus). `next` nur app-intern (`src/lib/safeNext.ts`). Nach dem
  Anmelden leitet `RedirectIfSignedIn` weiter, nicht die Seite. Im Mock-Modus ist immer
  jemand angemeldet: nichts geschützt, `/login` → `/recipes`.
- Sitzungsende (#143): Wie die Sitzung in diesem Tab endete, steht in
  `foodly.auth.sessionEnd()`. Abmelden hier → `/login` ohne `next`; Ablauf (`expired`) →
  `/login?next=…` mit Router-State `{ expired, email }` für Hinweis und Vorausfüllen; Abmelden in
  einem anderen Tab → `/login?next=…` ohne Hinweis.

## 6. UI & Styling

Verbindlich nach `CLAUDE.md`: nur `@postxl/ui-components` für Controls, postxl
`Tooltip`, Tailwind first, keine Inline-Styles, Theme-Tokens nur in `theme.css` für
Light/Dark-Werte. Wiederverwendetes Styling = React-Komponente. Komponenten nach
Feature in `src/components/<feature>/`.

Kategorie-Farben (ADR [0002](decisions/0002-category-colors.md)): eine gespeicherte
Farbe, Rollen `dot/soft/ink/line` pro Theme aus `src/lib/categoryColor.ts`.
Einzige Inline-Ausnahme: der eine Helper setzt `--cat-*`-Custom-Properties am
Element, Komponenten nutzen nur `bg-cat-dot`, `bg-cat-soft`, `text-cat-ink`, `border-cat-line`.

Maschinell geprüft (`npm run lint`, `eslint.config.js`, alle Regeln `error`,
Altlasten in `eslint-suppressions.json`):

| Regel | setzt durch |
|---|---|
| `react/forbid-elements` (`button`, `input`, `select`, `textarea`, `dialog`) | Controls nur aus `@postxl/ui-components` |
| `react/forbid-dom-props` (`style`, `title`) | Tailwind statt Inline-Style; postxl `Tooltip` statt `title=""` (der `--cat-*`-Helper wird gespreizt und fällt nicht darunter) |
| `no-restricted-syntax` gegen `as Error` | Fehlertexte nicht per Cast lesen |
| `no-restricted-syntax` gegen Effekt-Callbacks ohne Block-Body (`useEffect`, `useLayoutEffect`, `useInsertionEffect`, auch als `React.*`) | Ein Effekt gibt React nur bewusst eine Cleanup-Funktion zurück (#211) |
| `no-restricted-syntax` gegen `BrowserRouter`/`MemoryRouter` ohne `useTransitions={false}` | Navigationen laufen wie in React Router 6 ohne `startTransition` (`useTransitions={false}`, App und Tests gleich, #297) |
| `@typescript-eslint/no-floating-promises`, `no-misused-promises` | Promises behandeln (§4), keine async-Handler, deren Fehler verloren gehen |
| `react-hooks/rules-of-hooks`, `exhaustive-deps` | Hook-Regeln |
| `import-x/no-extraneous-dependencies` | jeder Import steht in `package.json`, devDependencies nur in Tests/Configs |
| `no-restricted-imports` (`@capacitor/*`, `@capacitor-community/*`) | Native APIs nur in `src/native/` (ADR [0005](decisions/0005-native-shell.md)); gilt für statische Importe, `import()` bleibt Konvention |

Tests (`*.test.ts(x)`, `src/test/`) dürfen rohe Elemente und `style` nutzen.
Begründete Einzelausnahme: `eslint-disable-next-line <regel> -- <grund>`.

## 6a. Native (`src/native/`)

Die App läuft zusätzlich in einer Capacitor-Hülle auf Android und iOS (ADR
[0005](decisions/0005-native-shell.md), Bauen und Prüfen: [`native.md`](native.md)). `src/native/` ist die einzige
Stelle, die native APIs anspricht: `platform.ts` (`isNative()`, `platform()`) liest das von der Hülle injizierte
`window.Capacitor`, ohne `@capacitor/core` zu importieren. Plugin-Adapter kommen ab N2 dazu und werden dynamisch
importiert, damit der Web-Entry-Chunk frei von Capacitor bleibt. Das Web bleibt Primärziel; ohne Hülle verhält sich
alles wie bisher.

- `backButton.ts` + `AndroidBackButton.tsx` (#325): die Android-Zurück-Taste. Ein offenes Overlay
  (`[role=dialog|alertdialog|menu|listbox][data-state="open"]`, das zuletzt im DOM stehende) bekommt ein `Escape`, vom
  fokussierten Element darin aus. Sonst geht es per React Router zurück (ohne Verlauf nach `/`). Auf `/` und `/login`
  schließt die App, auf `/register` nur ohne Verlauf. Eigene Overlays ohne Radix brauchen `data-state="open"`, wie die Lightbox.
- `timerNotifications.ts` (#328): Timer-Benachrichtigungen. Beim Wechsel in den Hintergrund bekommt jeder laufende
  Timer eine lokale Benachrichtigung zu seiner Endzeit, bei der Rückkehr werden alle storniert; `TimerProvider` lässt
  einen im Hintergrund abgelaufenen Timer ohne Alarm auf `expired` springen. Details: [`native.md`](native.md).
- `keepAwake.ts` (#326): `keepAwake()`/`allowSleep()` über das Keep-Awake-Plugin, in einer Warteschlange. `useWakeLock`
  nutzt nativ nur diesen Adapter (`supported` immer `true`), im Web die Screen Wake Lock API.
- `openExternal.ts` (#326): öffnet eine URL im In-App-Browser. Der Quelle-Link in `RecipeDetail` ruft ihn nativ per
  `onClick` (mit `preventDefault`) auf; im Web bleibt er ein Link mit `target="_blank"`.
- `appShell.ts` (#324): Splash und Statusleiste. `main.tsx` ruft vor `bootstrap()` `startSplash()` (3-s-Fallback),
  `ThemeProvider` beim ersten Render `hideSplash()` (einmalig) und bei jedem Wechsel des aufgelösten Themes
  `setStatusBarStyle()`. Details: [`native.md`](native.md).
- `storage.ts` (#327): die Sitzung in Preferences (`loadAuth`/`saveAuth`, Schreiben in einer Warteschlange).
  `auth.ts` liest nativ aus einem Speicher-Cache, den `bootstrap()` vor dem ersten Render lädt, und schreibt durch;
  eine alte Sitzung aus `localStorage` wird übernommen. Details: [`native.md`](native.md).

## 7. Tests

- Vitest + Testing Library, jsdom (`vite.config.ts`, Stubs in `src/test/setup.ts`).
- **Reine Logik wird unit-getestet** (Reducer, Mapper, Views, Adapter) — Datei
  `x.test.ts` neben `x.ts`.
- Komponenten/Seiten: Smoke- und Flow-Tests gegen den Mock-Pfad
  (Vorbild `src/pages/RecipeDetail.clone.test.tsx`, `RecipeEditor.test.tsx`).
- REST-Client-Tests mocken `fetch` (`src/api/rest.test.ts`).
- Visuelle Prüfung über Chrome MCP, nie Playwright ins Projekt.
- Vor PR: die fünf lokalen Checks aus `CLAUDE.md` (inkl. `npm run lint`).

## 8. Offene Architekturpunkte

- Auth/Token-Handling: Backend fertig (B7, PR #20); FE baut es in #141–#143
  (Spec `superpowers/specs/2026-11-08-auth-login-design.md`). Sitzung und
  Token-Refresh liegen seit #141 in `src/api/auth.ts`; Anmelden, Registrieren und
  Routen-Schutz seit #142 (§5), Abmelden (heute auf der Profilseite, #245) und Hinweis bei
  abgelaufener Sitzung seit #143. Nativ liegt die Sitzung seit #327 in Preferences statt in
  `localStorage` (§6a).
