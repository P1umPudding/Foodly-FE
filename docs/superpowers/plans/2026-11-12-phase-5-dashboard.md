# Phase 5 Dashboard / Start — Issue-Plan

> Freigegeben von Daniel am 2026-11-12 (`dec_6000b8fe`). Die Abschnitte D1–D4 sind die Issue-Texte (Titel =
> Überschrift ohne „Dx —“).

Spec: `docs/superpowers/specs/2026-07-07-phase-5-dashboard-app-restructure-design.md` (rev. 3). Design-Quelle:
`docs/design/redesign/README.md` §1.6, §1.7, Mockup `docs/design/redesign/app.js` (`S.home`).

Labels: `alpha`, `ui`, `phase:5`, `redesign`; `agent-ready` für D1, D2 und D4; D3 zusätzlich `backend-blocked`
(Backend-PR #22).
Lokale Checks statt CI (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`,
`npm run lint`.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| D1 (#194) | Start-Seite `/`: Gerüst, Navigation, Weiterleitung | – | – |
| D2 (#195) | Start: Kategorie-Kacheln | D1, #183 | D4 |
| D3 (#196) | Start: Zuletzt erstellt | D1, Backend #22, U1 | D2, D4 |
| D4 (#197) | Start: Zuletzt angesehen | D1 | D2 |

„Kürzlich mit dir geteilt“ wird bewusst nicht geschnitten (Spec, „Umfang“).

---

## D1 (#194) — Start-Seite `/`: Gerüst, Navigation, Weiterleitung

Labels: agent-ready, alpha, ui, phase:5, redesign · Depends on: –

### Context
Spec rev. 3, Abschnitte „Routing“ und „Seite „Start““. Heute leitet `/` über `RootRedirect`
(`src/components/shell/RootRedirect.tsx`) immer auf `/recipes` weiter, und „Start“ ist in `NAV_DESTINATIONS`
(`src/components/shell/nav.ts`) `hidden`. D2–D4 füllen die Seite später mit Abschnitten.

### Goal
`/` zeigt eine eigene Start-Seite mit Begrüßung und einem Abschnitts-Baustein; „Start“ ist in der Navigation.

### Behaviour
- Route `/`: ohne Listen-Parameter `src/pages/Home.tsx`; mit mindestens einem Listen-Parameter (`cat`, `tag`, `ing`,
  `dmax`, `role`, `collab`, `q`, `sort`, `dir`, `view`, `group`) Weiterleitung auf `/recipes` mit derselben Query und
  `hash` (`replace`). Die Parameterliste kommt aus `src/list/url.ts` (eine Quelle, keine Kopie).
- `NAV_DESTINATIONS`: „Start“ ohne `hidden`. Seitenleiste und Tab-Leiste zeigen „Start“ vor „Rezepte“, aktiv nur auf
  `/` (`end`). `routeTitle('/')` = „Start“; Handy-Kopfzeile auf `/` zeigt das Foodly-Logo statt eines Titels.
- Kopf: Datum („Donnerstag, 12. November“, `Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month:
  'long' })`), darunter `h1` „Hallo <Vorname>“ (erstes Wort von `useMe().name`; ohne Namen nur „Hallo“).
- Baustein `HomeSection` (`src/components/home/`): Props `title`, optional `link` (`{ label, to }`), `state`
  (`loading | error | empty | ready`), `onRetry`, `skeleton`, `children`. `loading` → Skelett; `error` → `RetryAlert`;
  `empty` → rendert nichts; `ready` → Überschrift `h2` + Link rechts + Inhalt.
- Karte „Nichts zu zeigen“, solange kein Abschnitt Inhalt hat (in D1 immer): Text „Hier erscheinen deine Kategorien und
  Rezepte, die du zuletzt erstellt oder angesehen hast.“, Knöpfe „Alle Rezepte“ (`/recipes`) und „Neues Rezept“
  (`/recipes/new`). Die Seite fragt dafür die Abschnitte ab (z. B. über einen Zähler im Kontext oder einen
  `useHomeSections`-Hook); D2–D4 hängen sich dort an, ohne `Home.tsx` umzubauen.
- FAB „+“ (Handy) wie auf `/recipes`.

### Acceptance criteria
1. `/` ohne Query rendert die Start-Seite mit „Hallo <Vorname>“ und Datum (Test mit festem `Date`).
2. `/?cat=3&q=x` leitet auf `/recipes?cat=3&q=x` weiter; `/?foo=1` nicht (Tests).
3. Seitenleiste und Tab-Leiste zeigen „Start“; auf `/` ist „Start“ aktiv, auf `/recipes` nicht (Tests in
   `AppShell.test.tsx`/`nav.test.ts` angepasst).
4. `HomeSection`: je ein Test für `loading`, `error` (Retry ruft `onRetry`), `empty` (rendert nichts), `ready`.
5. Karte „Nichts zu zeigen“ mit beiden Links erscheint, wenn kein Abschnitt Inhalt hat (Test).
6. Seitentitel „Start“ (`App.pageTitle.test.tsx`).
7. Nur postxl-Bedienelemente, keine Inline-Styles.
8. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Die Abschnitte selbst (D2–D4). „Kürzlich mit dir geteilt“, Gruppen, Planer, Einkauf.

### Assumptions
- `RootRedirect` wird ersetzt oder auf die Weiterleitung mit Parametern reduziert; `architecture.md` §5 (Zeile „`/`
  leitet bis zum Dashboard-Issue … weiter“) zieht der Worker im selben PR nach.

### Affected areas
`src/App.tsx`, `src/pages/Home.tsx` (+test), `src/components/home/HomeSection.tsx` (+test),
`src/components/shell/RootRedirect.tsx` (+test), `src/components/shell/nav.ts` (+test), `AppShell`/Kopfzeile,
`docs/architecture.md` §5.

---

## D2 (#195) — Start: Kategorie-Kacheln

Labels: agent-ready, alpha, ui, phase:5, redesign · Depends on: D1, #183

### Context
Spec rev. 3, „Kategorien (D2)“, Mockup `S.home` (`cat-tiles`). Kategorien kommen aus `useCategories()`, Symbol aus
`CategoryMark` (#179), die Kategorie-Seite `/categories/:id` aus #183.

### Goal
Auf Start stehen die eigenen Kategorien als getönte Kacheln, mit Link auf ihre Seite.

### Behaviour
- `HomeSection` „Kategorien“ mit Link „Verwalten“ → `/categories`.
- Je Kategorie (nach `order`) eine Kachel: `categoryColorVars`, `bg-cat-soft`, Rahmen `border-cat-line`, Radius 8 px;
  `CategoryMark md`, Name (eine Zeile, Ellipse, `text-cat-ink`), Anzahl rechts (`tabular-nums`). Link auf
  `/categories/:id`. Raster: Handy 2, Desktop 4 Spalten.
- Zustände aus `useCategories().status`: Laden → 4 Kachel-Skelette; Fehler → `RetryAlert` mit `retry`; keine
  Kategorien → Abschnitt leer (blendet sich aus).

### Acceptance criteria
1. Mock-Kategorien erscheinen in `order`-Reihenfolge mit Namen und Anzahl; jede Kachel verlinkt auf
   `/categories/<id>` (Test).
2. „Verwalten“ führt auf `/categories` (Test).
3. Ohne Kategorien kein Abschnitt; gibt es auch sonst nichts, erscheint die Karte „Nichts zu zeigen“ (Test).
4. Lade- und Fehlerzustand mit Test.
5. Farben nur über `categoryColorVars`; Kontrast kommt aus dem Util (keine eigenen Farbwerte).
6. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Anlegen/Bearbeiten auf Start. Sortieren per Ziehen.

### Assumptions
- `CategoryMark` hat die Größe `md` (#179).

### Affected areas
`src/components/home/CategoryTiles.tsx` (+test), `src/pages/Home.tsx`.

---

## D3 (#196) — Start: Zuletzt erstellt

Labels: alpha, ui, phase:5, redesign, backend-blocked · Depends on: D1, U1 (siehe
`2026-11-12-backend-22-followups.md`), Backend klassenserver7b/Foodly-backend#22

### Context
Spec rev. 3, „Zuletzt erstellt (D3)“ und „Daten / API“. Backend-PR #22 liefert `myAccessSince` (Owner: `createdAt`) und
`sort.field = "accessSince"`. Das FE-Typsystem kennt heute weder `createdAt`/`updatedAt` (G1) noch `myAccessSince`.
Entscheidung (Daniel, 2026-11-12): keine clientseitige Übergangslösung, D3 wartet auf #22.

### Goal
Auf Start stehen die 6 zuletzt erstellten eigenen Rezepte.

### Behaviour
- `protocol.ts`: `createdAt: string | null`, `updatedAt: string | null`, `myAccessSince: string | null` an `Recipe`;
  `RecipeSortField` um `'accessSince'` erweitern. `previewToRecipe` reicht die Felder durch.
- Mocks: jedes Mock-Rezept bekommt `createdAt`/`updatedAt` (ISO mit `+00:00`) und `myAccessSince` (Owner =
  `createdAt`, sonst ein eigener Wert); `applyQuery` sortiert `accessSince` wie das Backend, Tie-Breaker `id`.
- `HomeSection` „Zuletzt erstellt“ mit Link „Alle Rezepte“ → `/recipes?role=owner` (über `listHref`-Logik bzw.
  `toSearchParams`, gespeicherte Ansicht bleibt).
- Daten: `foodly.searchRecipes({ filters: { accessRights: ['owner'] }, sort: { field: 'accessSince', order: 'desc' } }, 1)`
  über `useRequest`, die ersten 6 als `RecipeTile` (Raster Handy 2, Desktop 3). Keine eigenen Rezepte → leer.

### Acceptance criteria
1. Request enthält genau `accessRights: ['owner']` und `sort: { field: 'accessSince', order: 'desc' }` (Test mit
   gemocktem `foodly`).
2. Im Mock-Modus erscheinen die 6 jüngsten eigenen Rezepte in absteigender Reihenfolge; fremde nicht (Test).
3. „Alle Rezepte“ führt auf `/recipes` mit `role=owner` (Test).
4. Lade-, Fehler-, Leerzustand mit Test.
5. Mock-Sortierung `accessSince` unit-getestet (`query.test.ts`).
6. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Sortieren nach `createdAt`/`updatedAt` in der Liste (B15). „Kürzlich mit dir geteilt“.

### Assumptions
- #22 ist auf Backend-`main`, bevor das Issue startet (Label `backend-blocked` wird dann entfernt).

### Affected areas
`src/api/protocol.ts`, `src/api/adapters.ts`, `src/mocks/data/recipes.json`, `src/list/query.ts` (+test),
`src/components/home/RecentCreations.tsx` (+test), `src/pages/Home.tsx`.

---

## D4 (#197) — Start: Zuletzt angesehen

Labels: agent-ready, alpha, ui, phase:5, redesign · Depends on: D1

### Context
Spec rev. 3, „Zuletzt angesehen (D4)“. Entscheidung (Daniel, 2026-11-12): „Jump back in“ = zuletzt angesehen, lokal
pro Nutzer, max. 20 gespeichert, Kachel zeigt 6. Es gibt kein Backend dafür und braucht keins.

### Goal
Auf Start stehen die zuletzt geöffneten Rezepte.

### Behaviour
- `src/home/recentlyViewed.ts`: `readRecentlyViewed(userId)`, `pushRecentlyViewed(userId, recipeId)`,
  `removeRecentlyViewed(userId, ids)`. Schlüssel `foodly:recently-viewed:<userId>`; neueste zuerst, ohne Doppelte,
  max. 20; kaputte oder fremde Werte → leere Liste; Schreibfehler still (wie `src/list/persistence.ts`).
- `RecipeDetail` ruft `pushRecentlyViewed` einmal, sobald das Rezept geladen ist (nicht bei Fehler/404, nicht erneut
  beim Portionen ändern).
- `HomeSection` „Zuletzt angesehen“ ohne Link: die ersten 6 IDs über `foodly.getRecipe` parallel; Reihenfolge wie im
  Speicher. Antworten mit Fehler fallen still raus und werden per `removeRecentlyViewed` entfernt. Alle fehlgeschlagen
  oder keine IDs → leer. Kacheln als `RecipeTile`.

### Acceptance criteria
1. Unit-Tests `recentlyViewed`: neue ID vorne; erneutes Öffnen schiebt nach vorne ohne Doppelte; 21. Eintrag schneidet
   den ältesten ab; getrennte Listen pro Nutzer; kaputtes JSON → leer; `remove` entfernt.
2. Öffnen eines Rezepts im Detail speichert die ID; ein 404 nicht (Tests).
3. Start zeigt die gespeicherten Rezepte in Reihenfolge; ein gelöschtes Rezept fehlt und ist danach aus dem Speicher
   entfernt (Test, Mock-Modus).
4. Ohne Einträge kein Abschnitt (Test).
5. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Synchronisieren über Geräte. Löschen beim Abmelden.

### Assumptions
- 6 parallele `getRecipe`-Aufrufe sind für die Alpha in Ordnung (kein Bulk-Endpunkt nötig).

### Affected areas
`src/home/recentlyViewed.ts` (+test), `src/pages/RecipeDetail.tsx` (+test), `src/components/home/RecentlyViewed.tsx`
(+test), `src/pages/Home.tsx`.
