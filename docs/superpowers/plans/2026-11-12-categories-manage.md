# Kategorien verwalten (Alpha) — Issue-Plan

> Freigegeben von Daniel am 2026-11-12 (`dec_bb753b5c`). Die Abschnitte K1–K6 sind die Issue-Texte (Titel =
> Überschrift ohne „Kx —“). K7 ist ein Merkposten, nicht agent-ready.

Spec: `docs/superpowers/specs/2026-11-12-categories-manage-design.md`. Design-Quelle: `docs/design/redesign/README.md`
§1.2–1.4, §1.6, §3.1, Mockup `docs/design/redesign/app.js` (`S.categories`, `S.category`, `catCtl`).

Labels für K1–K6: `agent-ready`, `alpha`, dazu `ui` außer K1. Kein `backend-blocked`: alle Endpunkte sind auf
Backend-`main` (Spec, Abschnitt „Backend“).
Lokale Checks statt CI (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`,
`npm run lint`.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| K1 | Kategorien schreiben: API-Methoden und Katalog-Aktionen | – | K2 |
| K2 | Kategorie-Bausteine: Symbol, Farbwahl, Ähnlich-Warnung | – | K1 |
| K3 | Seite „Meine Kategorien“: anlegen, bearbeiten, löschen | K1, K2 | – |
| K4 | Kategorien sortieren (Nach oben / Nach unten) | K3 | K5, K6 |
| K5 | Rezept-Detail: Kategorie-Chips und „+“ zum Zuordnen | K1, K2 | K4, K6 |
| K6 | Kategorie-Seite `/categories/:id` | K1, K3 | K4, K5 |
| K7 | Kategorien per Ziehen am Griff sortieren (später) | K4 | – |

Erster Schwung: K1 und K2. Dann K3. Danach K4, K5 und K6 gleichzeitig. K4 und K6 fassen beide
`src/pages/Categories.tsx` bzw. die Seitenleiste nur an getrennten Stellen an.

---

## K1 — Kategorien schreiben: API-Methoden und Katalog-Aktionen

Labels: agent-ready, alpha · Depends on: –

### Context
Spec `docs/superpowers/specs/2026-11-12-categories-manage-design.md`, Abschnitte „Backend“ und „Daten und Zustand“.
Heute gibt es nur `foodly.listCategories` (`src/api/index.ts`). Der Katalog (`src/catalog/CatalogProvider.tsx`) hält
die Kategorien und bietet `useCategories()` und `useRefreshCategories()`. Das Backend hat alle Schreib-Endpunkte
(`POST /categories`, `PUT|DELETE /categories/{id}`, `PUT /categories/{id}/recipes`, `PUT /categories/order`).

### Goal
Kategorien lassen sich über `src/api` und einen Katalog-Hook anlegen, ändern, löschen, sortieren und mit Rezepten
füllen, in REST und Mock gleich.

### Behaviour
- `protocol.ts`: `CategoryInput = { name: string; color: string; colorLight: string | null; colorDark: string | null }`
  (Body von POST und PUT), dazu die Bodies `{ recipeIds: RecipeId[] }` und `{ categoryIds: UserCategoryId[] }`.
- `foodly.createCategory(input)` → `UserCategory`, `foodly.updateCategory(id, input)` → `UserCategory`,
  `foodly.deleteCategory(id)` → `void`, `foodly.setCategoryRecipes(id, recipeIds)` → `UserCategory`,
  `foodly.reorderCategories(ids)` → `void`. Jede mit REST- und Mock-Zweig (`USE_MOCKS ? socket.request(...) : rest.*`).
- Mock-Handler in `src/mocks/index.ts` (`categories.create|update|delete|setRecipes|reorder`): verhalten sich wie
  das Backend (neue Kategorie ans Ende, `order` = Index nach reorder, leerer Name/Farbe → Fehler, unbekannte ID →
  Fehler „Category not found“).
- `useCategoryActions()` in `src/catalog/` gibt `create`, `update`, `remove`, `setRecipes`, `reorder` zurück. Jede
  Aktion ruft `foodly.*` und aktualisiert danach die Kategorien im Katalog: Antwort einsetzen (create/update/
  setRecipes), entfernen (delete) bzw. Reihenfolge übernehmen (reorder). `reorder` setzt die neue Reihenfolge
  sofort (optimistisch) und stellt bei Fehler die alte wieder her; die anderen Aktionen ändern den Katalog erst
  nach Erfolg. Fehler werfen weiter (der Aufrufer zeigt sie).
- `rename` ist kein eigener Aufruf: `update` schickt immer Name und Farbe (`PUT` ersetzt alles).
- Veralteten Kommentar in `src/list/query.ts` („categories are still mocked …“) ersetzen: Kategorien sind echt. Der
  Kategorie-Filter bleibt clientseitig, bis die UND/ODER-Frage geklärt ist (Backend #17). Verhalten unverändert.

### Acceptance criteria
1. REST-Tests (gemocktes `fetch`, Muster `src/api/rest.test.ts`): jede neue Methode trifft Pfad, Methode und Body
   wie in der Spec-Tabelle (z. B. `PUT /categories/3` mit `{ name, color, colorLight, colorDark }`,
   `PUT /categories/order` mit `{ categoryIds: [2, 1] }`).
2. Mock-Tests in `src/mocks/categories.test.ts`: create hängt ans Ende an; update ändert Name und Farbe; delete
   entfernt; setRecipes ersetzt die Liste; reorder setzt `order` nach Index; leerer Name wirft.
3. Hook-Test (Mock-Modus): nach `create` enthält `useCategories().list` die neue Kategorie ohne manuelles Neuladen;
   nach `remove` fehlt sie.
4. Hook-Test: schlägt `reorder` fehl, steht nach dem Fehler die alte Reihenfolge in `useCategories().list`.
5. Kein `fetch` außerhalb von `src/api`; Komponenten nutzen nur `useCategoryActions()`.
6. Kommentar in `src/list/query.ts` aktualisiert, `buildSearchQuery`-Tests unverändert grün.
7. Lokale Checks grün (`npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`,
   `npm run lint`), PR-Beschreibung sagt das.

### Non-goals
- Keine UI (K2–K6). Kein Kategorie-Filter auf dem Server.

### Assumptions
- Backend-Antworten wie in der Spec (geprüft auf `main` am 2026-11-12, `src/api/rest/categories.rs`).
- `reorder` auf dem Backend antwortet `{ data: [{ id, order }] }`; das FE braucht die Antwort nicht.

### Affected areas
`src/api/protocol.ts`, `src/api/index.ts` (+test), `src/mocks/index.ts`, `src/mocks/categories.test.ts`,
`src/catalog/CatalogProvider.tsx`, `src/catalog/useCategoryActions.ts` (+test), `src/list/query.ts` (Kommentar).

---

## K2 — Kategorie-Bausteine: Symbol, Farbwahl, Ähnlich-Warnung

Labels: agent-ready, alpha, ui · Depends on: –

### Context
Spec Abschnitt „Bausteine (K2)“, README §1.3/§1.4, ADR 0002. `src/lib/categoryColor.ts` hat schon
`SUGGESTED_COLORS` (12 Farbtöne) und `hueDistance`. Es fehlen das Symbol (bis B11 der Anfangsbuchstabe) und eine
Farbwahl. Beides brauchen K3, K5 und K6.

### Goal
Wiederverwendbare Bausteine für Symbol und Farbwahl einer Kategorie, ohne Seite.

### Behaviour
- `similarCategory(color, categories, exceptId?)` in `src/lib/categoryColor.ts`: erste Kategorie (nach `order`) mit
  `hueDistance(color, c.color) < 20`, außer `exceptId`; sonst `null`.
- `firstFreeColor(categories)`: erste Farbe aus `SUGGESTED_COLORS`, für die `similarCategory` `null` ist; sind alle
  belegt, `SUGGESTED_COLORS[0]`.
- `CategoryMark` (`src/components/category/`): Props `category` (Name + Farben), `size: 'sm' | 'md' | 'xl'` (20/28/
  40 px). Zeigt das erste Graphem des Namens groß (`Intl.Segmenter`, Fallback erstes Zeichen) in `text-cat-ink` auf
  `bg-cat-soft`, Radius 4 px, `aria-hidden`. Farben nur über `categoryColorVars`.
- `CategoryColorPicker` (`src/components/category/`): kontrolliert (`value`, `onChange`), Props `categories` und
  `exceptId` für die Warnung, `name` für die Vorschau. 12 Vorschläge als Radio-Gruppe (postxl `RadioGroup` oder
  `ToggleGroup type="single"`, Pfeiltasten, `aria-label` „Farbe 1“ … „Farbe 12“), dazu „Eigene Farbe“ (postxl
  `Input type="color"`). Darunter Vorschau (Chip mit `CategoryMark sm` + Name, Punkt + Name) und der Hinweis „Du
  wählst eine Farbe, die Varianten für Hell und Dunkel rechnet Foodly selbst.“ Liefert `similarCategory` einen
  Treffer, erscheint darunter „Ähnlich wie „<Name>“. Eine andere Farbe macht die beiden leichter unterscheidbar.“
  (Info-Hinweis, kein Fehler).

### Acceptance criteria
1. Unit-Tests `similarCategory`: gleiche Farbe → Treffer; 30° entfernt → `null`; `exceptId` wird übersprungen; graue
   Farbe → `null`.
2. Unit-Tests `firstFreeColor`: keine Kategorien → `SUGGESTED_COLORS[0]`; erste Vorschlagsfarbe belegt → zweite; alle
   belegt → erste.
3. `CategoryMark`: „Ärger“ → „Ä“, „🍝 Pasta“ → „🍝“, „sommer“ → „S“ (Tests).
4. `CategoryColorPicker`: Klick auf „Farbe 3“ ruft `onChange(SUGGESTED_COLORS[2])`; Pfeil rechts bewegt die Auswahl;
   eigene Farbe per Input ruft `onChange` mit dem Hex-Wert (Tests).
5. Warnung erscheint bei einer Farbe nahe einer bestehenden Kategorie und nennt deren Namen; mit `exceptId` dieser
   Kategorie nicht (Tests).
6. Keine Inline-Styles außer `categoryColorVars`; nur postxl-Bedienelemente.
7. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Symbol aus Tags (B11). Eingaben für `colorLight`/`colorDark` (ADR 0002). Die Seite selbst (K3).

### Assumptions
- `SUGGESTED_COLORS` und `hueDistance` bleiben, wie sie sind (ADR 0002).

### Affected areas
`src/lib/categoryColor.ts` (+test), `src/components/category/CategoryMark.tsx` (+test),
`src/components/category/CategoryColorPicker.tsx` (+test).

---

## K3 — Seite „Meine Kategorien“: anlegen, bearbeiten, löschen

Labels: agent-ready, alpha, ui · Depends on: K1, K2

### Context
Spec Abschnitte „Entscheidungen“ (4) und „„Meine Kategorien“ `/categories`“, Mockup `S.categories`. Es gibt
noch keinen Ort, an dem man Kategorien verwaltet. Daten und Aktionen kommen aus K1 (`useCategories`,
`useCategoryActions`), Symbol und Farbwahl aus K2.

### Goal
Unter `/categories` sieht man seine Kategorien und kann sie anlegen, umbenennen, umfärben und löschen. Man findet
die Seite über das Profil-Menü und die Seitenleiste.

### Behaviour
- Route `/categories` in `src/App.tsx` (hinter `RequireAuth`, statisches Segment vor `/categories/:id` aus K6), Seite
  `src/pages/Categories.tsx`, Seitentitel „Kategorien“ (`routeTitle`). Zurück ohne Verlauf → `/recipes`.
- Einstieg: Eintrag „Kategorien“ (Icon `Tags` oder `FolderCog`) im `ProfileMenu` (Avatar und Seitenleiste);
  Zahnrad-Knopf (postxl `Button variant="ghost" size="icon"`, Tooltip und `aria-label` „Kategorien verwalten“)
  neben der Überschrift „Kategorien“ in der Seitenleiste (`src/components/shell/Sidebar.tsx`). Eingeklappt: nur
  der Eintrag im Profil-Menü.
- Inhalt wie in der Spec: Abschnitt „Meine Kategorien“ + „Neue Kategorie“, Erklärsatz, Karte mit Zeilen nach
  `order` (`CategoryMark md`, Name, „n Rezepte“, ⋮-Menü mit „Bearbeiten“ und „Löschen“). Der Name verlinkt auf
  `/categories/:id` (Ziel kommt mit K6; bis dahin zeigt der Link auf die gefilterte Liste `listHref([id])`).
- `CategoryEditDialog` (`src/components/category/`): Desktop postxl `Dialog`, Handy `BottomSheet` (`useIsDesktop`).
  Felder Name (Pflicht, getrimmt, max. 60 Zeichen, Autofokus) und `CategoryColorPicker`. Titel „Neue Kategorie“ bzw.
  „Kategorie bearbeiten“. „Speichern“ ist aus bei leerem Namen, zeigt beim Speichern einen Spinner und schließt bei
  Erfolg; ein Fehler steht im Dialog (postxl `Alert`), Eingaben bleiben. Neu startet mit `firstFreeColor`. Bearbeiten
  schickt `colorLight`/`colorDark` unverändert mit.
- Löschen: postxl `AlertDialog` wie `DeleteRecipeButton`: „„<Name>“ löschen?“, Text „Die Rezepte bleiben erhalten,
  nur die Sammlung verschwindet.“, „Abbrechen“ / „Löschen“ (destructive, Spinner). Fehler im Dialog.
- Zustände: Skelett-Zeilen beim Laden; Fehler mit `RetryAlert` („Konnte Kategorien nicht laden“,
  `categories.retry`); leer: „Noch keine Kategorien. Leg eine an und sammle darin Rezepte.“ + „Neue Kategorie“.

### Acceptance criteria
1. `/categories` rendert im Mock-Modus alle Mock-Kategorien in `order`-Reihenfolge mit Rezeptzahl (Test).
2. Anlegen: Dialog öffnen, Namen tippen, Speichern → Zeile erscheint auf der Seite **und** in der Seitenleiste (Test
   mit `AppShell`).
3. Speichern ist bei leerem bzw. nur Leerzeichen enthaltendem Namen deaktiviert (Test).
4. Bearbeiten: Name und Farbe ändern → Zeile zeigt den neuen Namen; der Request enthält die Farbe (Test).
5. Löschen: Bestätigung nötig; „Abbrechen“ lässt die Kategorie stehen, „Löschen“ entfernt sie aus Seite und
   Seitenleiste (Test).
6. Fehler beim Speichern (gemockte Ablehnung) zeigt die Meldung im Dialog, der Dialog bleibt offen (Test).
7. Profil-Menü enthält „Kategorien“ und navigiert zu `/categories`; der Zahnrad-Knopf in der Seitenleiste ebenso
   (Tests).
8. Lade-, Fehler- und Leerzustand je mit Test.
9. Nur postxl-Bedienelemente, Tooltips über postxl `Tooltip`, keine Inline-Styles außer `categoryColorVars`.
10. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Sortieren (K4), Kategorie-Seite (K6), Zuordnen im Detail (K5), eigene Profilseite.

### Assumptions
- Mobil erreicht man die Seite über das Avatar-Menü; die Tab-Leiste bekommt keinen Eintrag.

### Affected areas
`src/App.tsx`, `src/pages/Categories.tsx` (+test), `src/components/category/CategoryEditDialog.tsx` (+test),
`src/components/shell/ProfileMenu.tsx` (+test), `src/components/shell/Sidebar.tsx`, `src/components/shell/nav.ts`
(`routeTitle`).

---

## K4 — Kategorien sortieren (Nach oben / Nach unten)

Labels: agent-ready, alpha, ui · Depends on: K3

### Context
Spec Entscheidung 2. Die Reihenfolge (`UserCategory.order`) bestimmt Seitenleiste, Filter, Gruppen und Punkte. Auf
`/categories` (K3) gibt es je Zeile ein ⋮-Menü. `useCategoryActions().reorder` (K1) ist optimistisch.

### Goal
Man kann die Reihenfolge seiner Kategorien auf `/categories` ändern, ohne Ziehen.

### Behaviour
- Reine Funktion `moveCategory(ids, id, delta: -1 | 1)` in `src/lib/` (oder `src/catalog/`): liefert die neue
  ID-Liste; am Rand unverändert.
- ⋮-Menü jeder Zeile bekommt „Nach oben“ und „Nach unten“ (Icons `ArrowUp`/`ArrowDown`). Erste Zeile ohne „Nach
  oben“, letzte ohne „Nach unten“.
- Auswahl ruft `reorder(moveCategory(...))`. Die Zeile springt sofort; bei Fehler springt sie zurück und eine
  Meldung „Reihenfolge nicht gespeichert“ erscheint (postxl `Alert` über der Karte, schließbar).
- Nach dem Verschieben bleibt der Fokus auf dem ⋮-Knopf der verschobenen Zeile (Tastatur-Nutzer verlieren den Platz
  nicht).
- Seitenleiste, Kategorie-Filter und Gruppen der Liste folgen der neuen Reihenfolge ohne Neuladen.

### Acceptance criteria
1. Unit-Tests `moveCategory`: Mitte hoch/runter, erstes Element hoch = unverändert, letztes runter = unverändert.
2. „Nach unten“ auf der ersten Zeile tauscht sie mit der zweiten, auf Seite und in der Seitenleiste (Test, Mock-Modus).
3. Erste Zeile hat kein „Nach oben“, letzte kein „Nach unten“ (Test).
4. Gemockter Fehler: Reihenfolge ist danach wie vorher, Meldung sichtbar (Test).
5. Fokus liegt nach dem Verschieben auf dem ⋮-Knopf der verschobenen Kategorie (Test).
6. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Ziehen am Griff (K7). Reihenfolge der Rezepte in einer Kategorie.

### Assumptions
- Mehrere schnelle Klicks hintereinander sind erlaubt; jeder schickt die ganze aktuelle Liste (letzter gewinnt).

### Affected areas
`src/lib/moveCategory.ts` (+test), `src/pages/Categories.tsx` (+test).

---

## K5 — Rezept-Detail: Kategorie-Chips und „+“ zum Zuordnen

Labels: agent-ready, alpha, ui · Depends on: K1, K2

### Context
Spec Abschnitt „Rezept-Detail: Kategorie-Chips (K5)“ und Entscheidung 3, README §1.2 (Tabelle „Rezept-Detail“),
Mockup `catCtl` in `detailBody`. Heute zeigt `src/pages/RecipeDetail.tsx` die Kategorien eines Rezepts gar nicht,
und Rezepte lassen sich keiner Kategorie zuordnen.

### Goal
Im Rezept-Detail sieht man, in welchen eigenen Kategorien das Rezept liegt, und kann es hinzufügen, entfernen oder
dafür eine neue Kategorie anlegen.

### Behaviour
- Chip-Zeile über dem Titel: je Kategorie des Rezepts (`recipeCategories`, nach `order`) ein getönter Chip
  (`bg-cat-soft text-cat-ink`, `CategoryMark sm` + Name, Radius 4 px), Link auf `/categories/:id` (bis K6 auf
  `listHref([id])`). Danach ein gestrichelter „+“-Chip (postxl `Button variant="outline" size="sm"`, `border-dashed`)
  mit `aria-label` „Kategorien ändern“; ohne Kategorien trägt er den Text „Zu Kategorie hinzufügen“.
- „+“ öffnet `ResponsivePanel` (Desktop Popover, Handy Sheet „Kategorien“): Checkbox-Liste aller Kategorien
  (Punkt, Name), angehakt = Rezept liegt drin. Umschalten ruft sofort
  `setRecipes(categoryId, recipes ± recipeId)` (K1). Während des Speicherns ist diese Checkbox gesperrt; bei Fehler
  springt sie zurück und die Meldung steht im Panel.
- Unten im Panel: Eingabefeld „Neue Kategorie“ + Knopf „Anlegen“ (Enter löst aus). Legt mit `firstFreeColor` an und
  ordnet das Rezept direkt zu; das Feld leert sich, die neue Kategorie steht angehakt in der Liste.
- Ohne Kategorien überhaupt: Panel zeigt nur „Noch keine Kategorien“ und das Anlegen-Feld.
- Für jedes sichtbare Rezept, auch fremde (Viewer/Editor). Nicht im Editor.
- Die Chips folgen dem Katalog: Änderungen erscheinen sofort, auch in Liste und Seitenleiste.

### Acceptance criteria
1. Rezept in 2 Kategorien zeigt 2 Chips in `order`-Reihenfolge und einen „+“-Chip ohne Text; Rezept ohne Kategorie
   zeigt „Zu Kategorie hinzufügen“ (Tests, Mock-Modus).
2. Haken setzen fügt das Rezept hinzu: Chip erscheint, Request `setRecipes` enthält die bisherigen IDs + diese (Test).
3. Haken entfernen nimmt es heraus, die anderen IDs bleiben in der Reihenfolge (Test).
4. Gemockter Fehler: Checkbox springt zurück, Meldung sichtbar (Test).
5. „Neue Kategorie“ mit Namen anlegen → neue Kategorie existiert, ist angehakt und als Chip sichtbar (Test).
6. Funktioniert für ein Rezept, bei dem der Nutzer nur Viewer ist (Test mit Mock-Rezept fremden Owners).
7. Desktop Popover, Handy Sheet (Test mit gemocktem `useIsDesktop`).
8. Nur postxl-Bedienelemente; Farben nur über `categoryColorVars`.
9. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Farbe beim Anlegen wählen (geht auf `/categories`). Kategorien im Editor. Kategorie-Seite (K6).

### Assumptions
- Zwei Tabs, die dieselbe Kategorie gleichzeitig ändern, überschreiben sich (Spec, „Backend“); akzeptiert.

### Affected areas
`src/pages/RecipeDetail.tsx` (+test `RecipeDetail.categories.test.tsx`),
`src/components/category/RecipeCategoryChips.tsx` (+test), `src/components/category/CategoryAssignPanel.tsx`.

---

## K6 — Kategorie-Seite `/categories/:id`

Labels: agent-ready, alpha, ui · Depends on: K1, K3

### Context
Spec Abschnitt „Kategorie-Seite `/categories/:id` (K6)“ und Entscheidung 1, README §3.1 („Die Kategorie-Seite nutzt
dieselbe Leiste ohne Filter und Gliederung“), §1.6, Mockup `S.category`. Heute führt ein Seitenleisten-Eintrag auf die
gefilterte Liste `/recipes?cat=<id>` (`listHref`, `activeCategoryId` in `src/components/shell/nav.ts`).
`CategoryEditDialog` kommt aus K3.

### Goal
Eine eigene Seite pro Kategorie mit getöntem Kopf und den Rezepten darin. Seitenleiste und Listengruppen führen
dorthin.

### Behaviour
- Route `/categories/:id` (nach `/categories`), Seite `src/pages/CategoryPage.tsx`. Breadcrumb „Rezepte / <Name>“,
  Seitentitel = Name.
- Kopf (`categoryColorVars`, `bg-cat-soft`, Rahmen `border-cat-line`, Radius 8 px): `CategoryMark xl`, Name als
  `h1`, „n Rezepte · nur für dich sichtbar“ (n = `category.recipes.length`), Knopf „Bearbeiten“ → `CategoryEditDialog`.
  Handy: „Bearbeiten“ im ⋮-Menü der Kopfzeile.
- Leiste wie die Rezeptliste, aber ohne Filter und Gliederung: Suche, Sortieren, Dichte (Kompakt/Detailliert/Kacheln),
  Trefferzahl. Vorhandene Komponenten aus `src/components/list/` wiederverwenden. Zustand in der URL dieser Seite
  (`q`, `sort`, `dir`, `view`), getrennt vom Listen-Zustand.
- Rezepte über `useRecipeSearch` mit `filters.categories = [id]` + Sortierung; die Suche filtert wie in der Liste.
  Flache Liste/Raster über `RecipeListView` mit `exceptCategoryId = id`.
- Zustände: Skelette; Fehler mit „Erneut versuchen“; leer: „Noch nichts in „<Name>“. Öffne ein Rezept und füg es
  über „+“ hinzu.“; Kategorie nach dem Laden nicht in `useCategories()`: „Kategorie nicht gefunden“ + Link
  „Zu den Rezepten“.
- FAB „+“ (Handy) wie auf `/recipes`.
- Navigation: Seitenleisten-Einträge zeigen auf `/categories/:id` und sind dort aktiv (`activeCategoryId` erkennt
  die Route). Kategorie-Gruppen in `RecipeListView` bekommen rechts im Kopf den Link „Öffnen ›“ (nicht für „Ohne
  Kategorie“); er klappt die Gruppe nicht auf/zu. Links aus K3 (Name) und K5 (Chips) zeigen jetzt hierher.
- Wird die Kategorie auf dieser Seite gelöscht (über `/categories` in einem anderen Tab o. ä.), gilt „nicht
  gefunden“.

### Acceptance criteria
1. `/categories/<id>` zeigt Kopf mit Name, Rezeptzahl und „nur für dich sichtbar“ und genau die Rezepte der
   Kategorie (Test, Mock-Modus; der Request enthält `filters.categories: [id]`).
2. Zeilen zeigen den Punkt dieser Kategorie nicht, andere schon (Test).
3. Leere Kategorie zeigt den Leer-Text mit Namen; unbekannte ID zeigt „Kategorie nicht gefunden“ (Tests).
4. Sortieren und Dichte ändern die URL dieser Seite, nicht den gespeicherten Zustand von `/recipes` (Test).
5. „Bearbeiten“ öffnet den Dialog; Umbenennen ändert Kopf und Seitenleiste (Test).
6. Seitenleisten-Eintrag verlinkt auf `/categories/<id>` und ist dort aktiv; Tab-Leiste: „Rezepte“ aktiv (Tests in
   `nav.test.ts`/`AppShell.test.tsx` angepasst).
7. Gruppen-Kopf der Liste hat „Öffnen ›“ zu `/categories/<id>`, „Ohne Kategorie“ nicht; Klick darauf klappt nicht
   (Test).
8. Lade-, Fehler-, Leer-, Nicht-gefunden-Zustand je mit Test.
9. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Filter und Gliederung auf dieser Seite. Reihenfolge der Rezepte in der Kategorie. Dashboard-Kacheln (Phase 5).

### Assumptions
- Der Server filtert eine einzelne Kategorie korrekt (`POST /recipes/search`, `filters.categories`, geprüft auf
  Backend-`main`).
- `/recipes?cat=<id>` bleibt als Filter-URL gültig, nur die Navigation zeigt nicht mehr dorthin.

### Affected areas
`src/App.tsx`, `src/pages/CategoryPage.tsx` (+test), `src/components/shell/nav.ts` (+test),
`src/components/shell/Sidebar.tsx`, `src/components/list/RecipeListView.tsx` (+test), Links in
`src/pages/Categories.tsx` und `src/components/category/RecipeCategoryChips.tsx`.

---

## K7 — Kategorien per Ziehen am Griff sortieren (später)

Labels: enhancement · nicht agent-ready · Depends on: K4

Merkposten aus der Freigabe (Daniel, 2026-11-12): Auf dem Desktop sollen Kategorien auf `/categories` auch per
Ziehen am Griff (`grip-vertical`, Mockup `S.categories`) sortierbar sein, zusätzlich zu „Nach oben/Nach unten“ (K4).
Offen vor dem Schnitt: welche Bibliothek (z. B. `@dnd-kit`, neue Abhängigkeit) oder native Drag-Events,
Tastaturbedienung, und ob der Editor (Zutaten/Schritte, README §3.3) dieselbe Lösung bekommt. Keine Dringlichkeit.
