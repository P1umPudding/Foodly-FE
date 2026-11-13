# Kategorien verwalten (Alpha) — Design

> Status: freigegeben (Daniel, 2026-11-12, Entscheidung `dec_bb753b5c`). Grundlage: `docs/design/redesign/README.md`
> §1.2–1.4, §1.6, §1.7, §3.1 (Kategorie-Seite), §3.4, Mockup `docs/design/redesign/app.js` (`S.categories`,
> `S.category`, `detailBody` → `catCtl`), ADR [0002](../../decisions/0002-category-colors.md).
> Issue-Plan: `docs/superpowers/plans/2026-11-12-categories-manage.md` (K1–K6).

## Ziel

Kategorien sind persönliche Sammlungen (`UserCategory`, 0 bis n pro Rezept, nur für den Nutzer sichtbar). Heute
kann man sie nur ansehen (Seitenleiste, Filter, Gruppen, Punkte). Neu kann man sie **anlegen, umbenennen, umfärben,
löschen, sortieren** und **Rezepte zuordnen**. Dazu kommt die **Kategorie-Seite** aus Redesign Schritt 4.

## Backend (auf `main`, geprüft 2026-11-12)

Alles vorhanden, kein `backend-blocked`, kein Stub (ADR 0003 greift nicht).

| Aufruf | Body | Antwort | Hinweis |
|---|---|---|---|
| `GET /categories?page&limit` | – | `PaginatedResponse<UserCategory>` | sortiert nach `order`, dann `id`; `recipes` in Zuordnungs-Reihenfolge |
| `POST /categories` | `{ name, color, colorLight?, colorDark? }` | `UserCategory` | neue Kategorie kommt ans Ende (`max(order)+1`); leerer Name oder leere Farbe → 422 |
| `PUT /categories/{id}` | wie POST | `UserCategory` | **ersetzt alles:** Umbenennen schickt die Farbe mit (und `colorLight`/`colorDark` unverändert) |
| `DELETE /categories/{id}` | – | 204 | Rezepte bleiben erhalten |
| `PUT /categories/{id}/recipes` | `{ recipeIds: number[] }` | `UserCategory` | **ersetzt die ganze Liste.** Fremde, nicht zugängliche Rezepte → 422 |
| `PUT /categories/order` | `{ categoryIds: number[] }` | `{ data: { id, order }[] }` | `order` = Index in der Liste |
| `POST /recipes/search` | `filters.categories: [id]` | wie heute | eine Kategorie: eindeutig (UND/ODER-Frage #17 betrifft nur mehrere) |

Folge für das FE: Zuordnen ist Lesen–Ändern–Schreiben auf `category.recipes` aus dem Katalog. Zwei Tabs, die
gleichzeitig dieselbe Kategorie ändern, überschreiben sich (letzter gewinnt). Das ist in der Alpha akzeptiert.
`UserCategory.order` ist im Backend nie `null`; der Typ `number | null` bleibt (Mock-Daten).

## Entscheidungen (Daniel, 2026-11-12)

1. **Eigene Route** `/categories/:id` für die Kategorie-Seite (nicht die gefilterte Liste). Seitenleisten-Einträge
   und „Öffnen ›“ an den Listengruppen zeigen dorthin.
2. **Sortieren** per „Nach oben“/„Nach unten“ im ⋮-Menü jeder Zeile. Keine neue Abhängigkeit. Ziehen am Griff ist
   ein späteres, eigenes Issue.
3. **Neu aus dem „+“-Chip** im Rezept-Detail: nur Name; Farbe = erste Vorschlagsfarbe (`SUGGESTED_COLORS`), deren
   Farbton keiner bestehenden Kategorie nahe ist (`hueDistance` ≥ 20°), sonst die erste. Änderbar auf `/categories`.
4. **Einstieg** in die Verwaltung: Eintrag „Kategorien“ im Profil-Menü (`ProfileMenu`, Avatar bzw. Seitenleiste)
   und ein Zahnrad-Knopf neben der Überschrift „Kategorien“ in der Seitenleiste. Keine eigene Profilseite.

## Daten und Zustand

- `foodly.*` bekommt `createCategory`, `updateCategory`, `deleteCategory`, `setCategoryRecipes`,
  `reorderCategories` (REST + Mock-Zweig, Mock-Handler in `src/mocks/index.ts`).
- Der Katalog (`CatalogProvider`) bleibt die eine Quelle für Kategorien. Jede Schreib-Aktion läuft über einen Hook
  `useCategoryActions()` aus `src/catalog/`, der `foodly.*` ruft und danach die Kategorien im Katalog ersetzt
  (Antwort einsetzen bzw. neu laden). Komponenten rufen `foodly.*` für Kategorien nicht direkt.
- Sortieren ist **optimistisch**: Reihenfolge sofort umstellen, bei Fehler zurücksetzen und Fehler zeigen. Alle
  anderen Aktionen warten auf die Antwort (Knopf im Ladezustand), Fehler erscheinen im Dialog bzw. als Alert.
- Kein neuer Wire-Typ außer den Request-Bodies (`CategoryInput`, `{ recipeIds }`, `{ categoryIds }`) in
  `protocol.ts`.

## Bildschirme

### Bausteine (K2)

- **`CategoryMark`**: Symbol-Slot einer Kategorie. Bis B11 der **Anfangsbuchstabe** (erstes Graphem, groß) in
  `ink` auf `soft`, Radius 4 px, Größen `sm` (20 px), `md` (28 px), `xl` (40 px). Farben nur über
  `categoryColorVars`.
- **`CategoryColorPicker`**: 12 Vorschläge (`SUGGESTED_COLORS`) als Radio-Gruppe (Pfeiltasten, Name je Farbe als
  `aria-label`, z. B. „Farbe 1“), dazu „Eigene Farbe“ (postxl-Input `type="color"` bzw. Hex-Feld). Darunter
  Vorschau (`CategoryMark`, Chip, Punkt + Name) und der Hinweis „Du wählst eine Farbe, die Varianten für Hell und
  Dunkel rechnet Foodly selbst.“
- **Warnung „zu ähnlich“**: reine Funktion `similarCategory(color, categories, exceptId?)` in
  `src/lib/categoryColor.ts` liefert die erste Kategorie mit `hueDistance < 20` (sonst `null`). Text:
  „Ähnlich wie „<Name>“. Eine andere Farbe macht die beiden leichter unterscheidbar.“ Kein Blocker, nur Hinweis.

### „Meine Kategorien“ `/categories` (K3, K4)

- Kopf „Kategorien“ (Breadcrumb wie andere Unterseiten). Zurück ohne Verlauf → `/recipes` (README §3.4 nennt
  „Profil“, das es noch nicht gibt).
- Abschnitt „Meine Kategorien“ + Knopf „Neue Kategorie“, darunter der Satz „Kategorien sind deine persönlichen
  Sammlungen. Ein Rezept kann in mehreren sein, andere sehen sie nicht.“
- Karte mit Zeilen (Reihenfolge nach `order`): `CategoryMark`, Name, „n Rezepte“, ⋮-Menü mit **Bearbeiten**,
  **Nach oben**, **Nach unten** (K4; erste/letzte Zeile ohne den sinnlosen Eintrag), **Löschen**. Klick auf
  den Namen öffnet die Kategorie-Seite.
- **Neu/Bearbeiten**: postxl `Dialog` auf dem Desktop, `BottomSheet` auf dem Handy (`useIsDesktop`), eine Komponente `CategoryEditDialog`, mit Name (Pflicht, getrimmt, max.
  60 Zeichen) und `CategoryColorPicker`. Speichern bleibt aus, solange der Name leer ist. Neu startet mit der
  ersten freien Vorschlagsfarbe (Regel aus Entscheidung 3).
- **Löschen**: postxl `AlertDialog` (Muster `src/components/recipe/DeleteRecipeButton.tsx`) „„<Name>“ löschen? Die Rezepte bleiben erhalten, nur die Sammlung verschwindet.“
  Knöpfe „Abbrechen“ / „Löschen“ (destructive).
- Zustände: Skelett-Zeilen; Fehler mit „Erneut versuchen“ (`categories.retry`); leer: „Noch keine Kategorien. Leg
  eine an und sammle darin Rezepte.“ mit Knopf „Neue Kategorie“.

### Rezept-Detail: Kategorie-Chips (K5)

- Über dem Titel eine Chip-Zeile: je Kategorie des Rezepts ein getönter Chip (`soft`/`ink`, `CategoryMark sm` +
  Name, Link auf `/categories/:id`), Reihenfolge nach `order`. Danach ein gestrichelter „+“-Chip; ohne Kategorien
  heißt er „Zu Kategorie hinzufügen“.
- „+“ öffnet auf dem Desktop ein Popover, auf dem Handy ein Sheet (`ResponsivePanel`): Checkbox-Liste aller
  Kategorien (Punkt, Name), angehakt = Rezept liegt drin. Umschalten speichert sofort
  (`setCategoryRecipes` mit `recipes` ± Rezept-ID); die Checkbox ist während des Speicherns gesperrt, ein Fehler
  erscheint im Panel und die Checkbox springt zurück.
- Unten im Panel „Neue Kategorie“: Eingabefeld + „Anlegen“. Legt an (Farbe nach Entscheidung 3) und ordnet das
  Rezept direkt zu.
- Gilt für jedes Rezept, das man sehen kann (Owner, Editor, Viewer), auch für fremde: Kategorien sind persönlich.
- Kategorien sind **nicht** im Editor (README §3.3).

### Kategorie-Seite `/categories/:id` (K6)

- Getönter Kopf (`soft`-Fläche, `line`-Rahmen): `CategoryMark xl`, Name als Seitentitel, „n Rezepte · nur für dich
  sichtbar“, Knopf „Bearbeiten“ (öffnet den Dialog aus K3; auf dem Handy im ⋮ der Kopfzeile).
- Darunter dieselbe Leiste wie die Rezeptliste **ohne Filter und ohne Gliederung**: Suche, Sortieren, Dichte
  (Kompakt/Detailliert/Kacheln), Trefferzahl. Zustand lokal zur Seite (eigener URL-Zustand `q`, `sort`, `dir`,
  `view`), nicht der Listen-Zustand von `/recipes`.
- Rezepte über `useRecipeSearch` mit `filters.categories = [id]` (serverseitig) plus Sortierung; Suche wie in der
  Liste. Zeilen zeigen die **anderen** Kategorien als Punkte (`exceptCategoryId`).
- Zustände: Skelette; Fehler mit „Erneut versuchen“; leere Kategorie: „Noch nichts in „<Name>“. Öffne ein Rezept
  und füg es über „+“ hinzu.“; unbekannte/fremde ID (nicht in `useCategories()` nach dem Laden): „Kategorie nicht
  gefunden“ mit Link zu `/recipes`.
- Navigation: Seitenleisten-Einträge der Kategorien und ein neuer Link „Öffnen ›“ im Kopf jeder Kategorie-Gruppe der
  Rezeptliste führen hierher. Der Seitenleisten-Eintrag ist aktiv, solange `/categories/:id` offen ist. „Rezepte“
  in der Tab-Leiste bleibt aktiv. Der FAB „+“ erscheint auch hier (README §1.6).

## Nicht in diesem Block

- Ziehen am Griff (eigenes Issue, nicht agent-ready).
- Kategorie-Symbol aus Tags (B11, Backend).
- Reihenfolge der Rezepte innerhalb einer Kategorie (Backend speichert `position`, UI später).
- Kategorie-Filter der Liste auf den Server verlegen (wartet auf #17, UND/ODER).
- Dashboard-Kacheln (Phase 5, D2).

## Tests (Überblick)

- `src/api`: REST-Zweige (Pfad, Methode, Body) gegen gemocktes `fetch`; Mock-Handler (`src/mocks/categories.test.ts`).
- Reine Funktionen: `similarCategory`, erste freie Farbe, Umsortieren (`moveCategory(list, id, ±1)`).
- Seiten/Komponenten im Mock-Modus: anlegen → erscheint in Seitenleiste; umbenennen; löschen mit Bestätigung;
  nach oben/unten; „+“-Chip an/aus; Kategorie-Seite mit Leer- und Nicht-gefunden-Zustand.
