# Phase 5 — Dashboard / Start — Design (rev. 3)

Status: freigegeben (Daniel, 2026-11-12, Entscheidung `dec_6000b8fe`). Ersetzt rev. 2 (2026-10-28).
Issue-Plan: `docs/superpowers/plans/2026-11-12-phase-5-dashboard.md` (D1–D4).
Grundlage: `docs/design/redesign/README.md` §1.6, §1.7, §3 („Start“), Mockup `docs/design/redesign/app.js` (`S.home`).

## Was sich seit rev. 2 geändert hat

- App-Shell, Seitenleiste und Tab-Leiste gibt es (Redesign Schritt 3, #27). „Start“ steht schon in `NAV_DESTINATIONS`
  (`src/components/shell/nav.ts`), ist aber `hidden`, und `/` leitet über `RootRedirect` auf `/recipes` weiter.
- Kategorien lassen sich verwalten, und es gibt die Kategorie-Seite `/categories/:id` (Block „Kategorien verwalten“,
  #178–#183). Kategorie-Links zeigen dorthin, nicht mehr auf `/recipes?cat=`.
- Backend-PR #22 bringt `myAccessSince` und `sort.field = "accessSince"`. Für eigene Rezepte gilt `myAccessSince =
  createdAt`. „Zuletzt erstellt“ wird damit serverseitig sortierbar, der Client-Helper aus rev. 2 entfällt.

## Umfang (Entscheidungen Daniel, 2026-11-12)

| Kachel | Quelle | Status |
|---|---|---|
| Kategorien | `useCategories()` | baubar (D2, nach #183) |
| Zuletzt erstellt | `POST /recipes/search`, `accessRights:[owner]`, `accessSince desc` | wartet auf Backend #22 (D3) |
| Zuletzt angesehen („Jump back in“) | lokal pro Nutzer | baubar (D4) |
| Kürzlich mit dir geteilt | `accessSince` mit `accessRights:[editor, viewer]` | **nicht geschnitten**: kommt mit Teilen (Backend #12). Ohne Teilen wird im Backend niemand Editor oder Viewer, die Kachel wäre immer leer. |
| Gruppen | – | blockiert (B12, Backend #13) |
| Heute geplant, Einkauf | – | Konzept, spätere Phasen |

D3 wird **nicht** vorab clientseitig sortiert. D3 wartet auf #22.

## Routing

| Route | Bildschirm |
|---|---|
| `/` ohne Query | Start (`src/pages/Home.tsx`) |
| `/` mit Listen-Parametern (`cat`, `tag`, `ing`, `dmax`, `role`, `collab`, `q`, `sort`, `dir`, `view`, `group`) | Weiterleitung auf `/recipes` mit derselben Query (alte Lesezeichen) |
| alle anderen | unverändert |

„Start“ wird in Seitenleiste und Tab-Leiste sichtbar (`hidden` entfällt). Ziele der Navigation beginnen einen neuen
Verlauf (README §3.4).

## Seite „Start“

- **Kopf:** Datum klein („Donnerstag, 12. November“, `Intl.DateTimeFormat('de-DE')`), darunter „Hallo <Vorname>“
  (`useMe().name`, erstes Wort). Handy: Kopfzeile mit Foodly-Logo als Titel, Avatar rechts; FAB „+“ wie auf
  `/recipes`.
- **Aufbau Desktop:** „Kategorien“ über die volle Breite, darunter die Rezept-Abschnitte. Handy: alles in einer Spalte.
- **Abschnitt:** Überschrift (`h2`) links, Link rechts („Verwalten“, „Alle Rezepte“). Rezepte als Kacheln
  (`RecipeTile`, Raster 2 Spalten Handy, 3 Desktop), höchstens 6.
- **Leere Abschnitte blenden sich aus.** Ein Abschnitt zeigt Skelette in Kachelform, solange er lädt. Bei einem
  Fehler steht im Abschnitt ein `RetryAlert`; die anderen Abschnitte bleiben nutzbar.
- **Nichts zu zeigen** (alle Abschnitte leer, auch solange es nur das Gerüst aus D1 gibt): eine Karte „Hier erscheinen
  deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.“ mit „Alle Rezepte“ (`/recipes`) und
  „Neues Rezept“ (`/recipes/new`). Neutral formuliert, weil sie auch bei bestehenden Nutzern erscheinen kann.

### Kategorien (D2)
Getönte Kacheln (`categoryColorVars`, `bg-cat-soft`, Rahmen `border-cat-line`, Radius 8 px): `CategoryMark md`, Name
(eine Zeile, Ellipse), Anzahl rechts (`tabular-nums`). Reihenfolge nach `order`. Link auf `/categories/:id`. Raster:
Handy 2, Desktop 4 Spalten. Abschnitts-Link „Verwalten“ → `/categories`. Ohne Kategorien blendet sich der Abschnitt aus
wie die anderen (angelegt wird über `/categories` oder den „+“-Chip im Rezept).

### Zuletzt erstellt (D3)
`foodly.searchRecipes({ filters: { accessRights: ['owner'] }, sort: { field: 'accessSince', order: 'desc' } }, 1)`,
die ersten 6. Link „Alle Rezepte“ → `/recipes` mit Zugriff „Meine“ (`role=owner`) und Sortierung wie gespeichert.

### Zuletzt angesehen (D4)
- Speicher `src/home/recentlyViewed.ts`: `localStorage["foodly:recently-viewed:<userId>"]`, Liste von Rezept-IDs,
  neueste zuerst, ohne Doppelte, max. 20. Schreiben ist best-effort (wie `src/list/persistence.ts`).
- `RecipeDetail` merkt sich die ID, sobald das Rezept geladen ist (nicht bei Fehler/404).
- Kachel: die ersten 6 IDs über `foodly.getRecipe` (parallel). IDs, die mit Fehler antworten (gelöscht, kein
  Zugriff), fallen still raus und werden aus dem Speicher entfernt. Überschrift „Zuletzt angesehen“, kein Link.
- Abmelden löscht den Speicher nicht (pro Nutzer geschlüsselt).

## Daten / API

- Keine neue `foodly.*`-Methode. D3 ergänzt den Wire-Vertrag um das, was das Backend schon bzw. mit #22 liefert:
  `createdAt: string | null`, `updatedAt: string | null` (G1, bisher nicht im FE-Typ) und `myAccessSince: string | null`
  an `Recipe` (und damit `RecipePreview`), dazu `'accessSince'` in `RecipeSortField`. Die Mock-Rezepte bekommen
  Zeitstempel, der Mock sortiert `accessSince` wie das Backend (Owner: `createdAt`).
- Rezept-Liste der Kacheln über `previewToRecipe` wie in der Liste.

## Tests

- Unit: Weiterleitung `/` mit/ohne Listen-Parameter; `recentlyViewed` (Reihenfolge, Doppelte, max. 20, pro Nutzer,
  Entfernen); Begrüßung (Vorname, Datum).
- Komponenten (Mock-Modus): Abschnitte zeigen/verbergen sich; Lade-, Fehler-, Leerzustand je Abschnitt; Karte „Nichts zu zeigen“; Kategorie-Kachel verlinkt auf `/categories/:id`; „Start“ in Seitenleiste und Tab-Leiste aktiv auf `/`.

## Später

- „Kürzlich mit dir geteilt“ (mit Teilen, Backend #12), Gruppen (B12, #13), „Heute geplant“, Einkauf.
- Activity-Feed (B6 Stufe 2).
