# Rezeptliste „Ruhig“ (Redesign Schritt 4) — Issue-Plan

> Freigegeben von Daniel am 2026-11-05. Die Abschnitte L1–L7 sind die Issue-Texte (Titel = Überschrift ohne „Lx —“).

Spec: `docs/superpowers/specs/2026-11-05-recipe-list-redesign-design.md` (im Docs-PR). Design-Quelle:
`docs/design/redesign/README.md` §3.1, §1.2, §1.5, §1.7, Mockup `docs/design/redesign/index.html`.

Labels für alle: `redesign`, `ui`, `alpha`. Kein `backend-blocked`.
Lokale Checks statt CI (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| L1 | Rezeptzeilen: Kategorie-Punkte, Zugriffs-Icons nur wenn aussagekräftig, Bildspalte nur mit Fotos | – | L2, L3 |
| L2 | Trefferzahl ehrlich, „Keine Treffer“ erst nach allen Seiten | – | L1, L3 |
| L3 | Filter-Inhalte als eigene Komponenten (neues Verhalten, noch in der Spalte) | – | L1, L2 |
| L4 | Ansicht „Kacheln“ | L1 | L3 |
| L5 | Sortieren-Menü und Ansicht-Schalter (Desktop + Handy-Sheet) | L4 | L3, L6 |
| L6 | Filterknopf mit Popover/Sheet (Baustein, ohne Seite) | L3 | L4, L5 |
| L7 | Filterleiste statt Filter-Spalte | L2, L5, L6 | – |

Erster Schwung: L1, L2, L3 gleichzeitig (L1 und L3 fassen `RecipeList.tsx` nicht bzw. nur eine Zeile an, L2 den
Leer-/Ladebereich). Dann L4 und L6, dann L5, zuletzt L7.

`docs/architecture.md` §4 (Skelette statt `Loader`) zieht der Docs-PR mit der Spec nach, kein eigenes Issue.
`useIsDesktop` wird außer für Popover vs. Sheet bewusst auch für Tooltips (L1), Handy-Kopfzeile und Autofokus (L5)
genutzt; das lässt sich nicht in CSS ausdrücken.

---

## L1 — Rezeptzeilen: Kategorie-Punkte, Zugriffs-Icons nur wenn aussagekräftig, Bildspalte nur mit Fotos

Labels: redesign, ui, alpha · Depends on: –

### Context
Redesign „Ruhig“ Schritt 4 (Spec `docs/superpowers/specs/2026-11-05-recipe-list-redesign-design.md`, Abschnitt „Rezept in der Liste“; README §1.2, §1.5, §3.1). Heute zeigen die Zeilen (`src/components/recipe/RecipeRow.tsx`) keine Kategorien, `RoleCollabIndicator` zeigt immer Rolle + Freigabe (auch Krone + Schloss beim eigenen privaten Rezept), und Detailliert zeigt immer eine 44-px-Bildzelle mit Besteck-Symbol, auch wenn es gar keine Fotos gibt (REST heute, B1).

### Goal
Jede Rezeptzeile zeigt, in welchen Kategorien das Rezept liegt, Zugriffs-Icons nur wenn sie etwas sagen, und die Bildspalte nur, wenn es Fotos gibt.

### Behaviour
- **Kategorie-Punkte** rechts außen in Kompakt und Detailliert: bis zu 3 Punkte (`bg-cat-dot` über `categoryColorVars`), danach „+n“. Reihenfolge nach `UserCategory.order`. Rezept ohne Kategorie: nichts.
- In der gruppierten Ansicht zeigt eine Zeile innerhalb einer Kategorie-Gruppe nur die **anderen** Kategorien (die Gruppe selbst ist schon die Linie). In „Ohne Kategorie“ und in der flachen Liste alle.
- Desktop (`useIsDesktop`): jeder Punkt hat einen eigenen postxl-Tooltip mit dem Kategorienamen; „+n“ hat einen Tooltip mit den übrigen Namen (Komma-getrennt). Trefferfläche je Punkt über Innenabstand größer als 8 px. Tooltips öffnen nach links (`side="left"`). Handy: keine Tooltips.
- **Zugriffs-Icons** (`RoleCollabIndicator`): Rolle nur bei Bearbeiter/Betrachter, Freigabe nur bei Geteilt/Kollaborativ. Eigenes privates Rezept: kein Icon. Eigenes geteiltes Rezept: nur Freigabe-Icon.
- **Bildspalte** (Detailliert): 48 px statt 44 px. Sie erscheint nur, wenn mindestens ein geladenes Rezept ein anzeigbares Foto hat (`mainImage !== null && showsRecipeImages()`). Dann bekommt ein Rezept ohne Foto den grauen Platzhalter mit Besteck-Symbol. Ohne Fotos entfällt die Spalte ganz. Ableitung aus allen geladenen Rezepten (`search.recipes.some(r => r.mainImage !== null) && showsRecipeImages()`), als Prop `showImages` an `RecipeListView`; kein eigener State. `useRecipeSearch` hängt Seiten nur an, die Spalte verschwindet beim Nachladen also nicht; bei neuer Abfrage wird neu berechnet.
- Tags in den Zeilen auf dem Handy ausgeblendet (`phone:hidden`).

### Acceptance criteria
1. Reine Funktion `recipeCategories(recipe, categories, exceptId?)` in `src/list/` liefert die Kategorien des Rezepts nach `order`, ohne `exceptId`; Unit-Tests (0, 1, 4 Kategorien, except).
2. Komponente `CategoryDots` in `src/components/recipe/` rendert max. 3 Punkte + „+n“; Test: 5 Kategorien → 3 Punkte und „+2“.
3. Desktop: Fokus (`userEvent.tab`) auf einen Punkt zeigt `role="tooltip"` mit dem Kategorienamen; mit gemocktem `useIsDesktop = false` kein Tooltip (Tests).
4. In einer Kategorie-Gruppe fehlt der Punkt dieser Kategorie (Test über `RecipeListView` mit Mock-Kategorien).
5. `RoleCollabIndicator`: eigenes privates Rezept rendert nichts; Bearbeiter + geteilt rendert zwei Icons; eigenes kollaboratives Rezept nur das Freigabe-Icon (Tests).
6. Detailliert ohne ein einziges Foto rendert keine Bildzelle; mit mindestens einem Foto haben alle Zeilen eine 48-px-Zelle, Zeilen ohne Foto den Platzhalter (Tests im Mock-Modus und mit `showsRecipeImages() = false`).
7. Kategorie-Farben nur über `categoryColorVars`/`--cat-*`, keine Inline-Styles sonst.
8. Lokale Checks grün (`npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`), PR-Beschreibung sagt das.

### Non-goals
- Kacheln (L4), Filterleiste (L6), Kategorie-Seite, Kategorie-Symbol (B11).

### Assumptions
- Kategorien kommen aus `useCategories()` (REST `GET /categories`, vollständige `recipes`-Listen).
- `RoleCollabIndicator` wird nur in `RecipeRow` verwendet (geprüft); L4 nutzt ihn für Kacheln mit derselben Regel.

### Affected areas
`src/list/recipeCategories.ts` (+test), `src/components/recipe/CategoryDots.tsx` (+test), `src/components/recipe/RecipeRow.tsx` (+test), `src/components/recipe/RoleCollabIndicator.tsx` (+test), `src/components/list/RecipeListView.tsx` (+test), `src/pages/RecipeList.tsx` (nur die eine Zeile `showImages`).

---

## L2 — Trefferzahl ehrlich, „Keine Treffer“ erst nach allen Seiten

Labels: redesign, ui, alpha · Depends on: –

### Context
Spec Abschnitt „Zeile 3“ und „Zustände“. `ResultCount` zeigt heute „x von y Rezepten“ mit y = geladene, schon serverseitig gefilterte Rezepte (max. 100 pro Seite) — das wirkt wie eine Gesamtzahl, ist aber keine. Kategorie und Suche filtern clientseitig über die geladenen Seiten; ist Seite 1 leer, erscheint „Keine Treffer“, obwohl noch Seiten nachladen. Eine echte Gesamtzahl kommt erst mit Backend #17 (B16).

### Goal
Die Liste behauptet keine Zahlen, die sie nicht kennt, und meldet „Keine Treffer“ erst, wenn wirklich nichts mehr kommt.

### Behaviour
- Trefferzahl = Anzahl der sichtbaren Rezepte: „1 Rezept“, „14 Rezepte“. Solange `hasMore` true ist: „14+ Rezepte“. Kein „x von y“ mehr.
- Sind sichtbar 0 Rezepte, aber `hasMore` true: Skelett (eine Zeile) statt Leer-Text; der Infinite-Scroll-Sentinel lädt weiter.
- „Keine Treffer“ + „Filter zurücksetzen“ erst bei `!hasMore` und 0 sichtbaren Rezepten (Text wie heute).
- „Noch keine Rezepte.“ unverändert.
- Zahlen mit `tabular-nums`.

### Acceptance criteria
1. `ResultCount` bekommt `count` und `more: boolean`; Tests für 0, 1, 14, 14 + more.
2. `ResultCount` rendert kein „von“ (Test).
3. Mit Mock-Daten, Suche ohne Treffer auf Seite 1 und `hasMore = true`: kein „Keine Treffer“, sondern Skelett (Test mit gemocktem `useRecipeSearch`).
4. Mit `hasMore = false` und 0 Treffern: „Keine Treffer für die aktuellen Filter.“ und „Filter zurücksetzen“ (Test).
5. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Zeile 3 als eigene Zeile mit „Alle Filter zurücksetzen“ (kommt mit L6). Gesamtzahl vom Server (B16).

### Assumptions
- `useRecipeSearch` liefert `hasMore` (heute schon).

### Affected areas
`src/components/list/ResultCount.tsx` (+test), `src/pages/RecipeList.tsx`, `src/pages/RecipeList.search.test.tsx` oder neuer Test.

---

## L3 — Filter-Inhalte als eigene Komponenten

Labels: redesign, ui, alpha · Depends on: –

### Context
Spec Abschnitt „Popover je Filter“. Heute steckt alles in `src/components/list/FilterControls.tsx` (≈ 400 Zeilen, inkl. `CategorySidebar`). Die Filterleiste (L6) braucht jeden Filter einzeln als Inhalt für Popover/Sheet. Dieses Issue zieht die Inhalte heraus und bringt ihr Verhalten auf das Redesign; sie werden vorerst weiter in der rechten Spalte und im Handy-Filter-Sheet gezeigt.

### Goal
Fünf eigenständige Filter-Inhalte mit dem Verhalten aus dem Redesign, die L6 nur noch in Knöpfe hängen muss.

### Behaviour
- `CategoryFilter`: Checkbox-Liste (postxl `Checkbox`), „Ohne Kategorie“ zuerst (ohne Zahl), dann Kategorien nach `order` mit Farbpunkt, Name, Anzahl (`recipes.length`). Mehrere = ODER (wie heute). Der Filter filtert nur, er navigiert nicht.
- `TagFilter`: Suchfeld (`SearchInput`, `normalizeText`) + Checkbox-Liste mit `TagIcon`; ausgewählte oben. Keine Trefferzahlen. Mehrere = UND.
- `IngredientFilter`: wie Tags; ohne Suche nur die ersten 12 (nach Name, ausgewählte immer sichtbar und oben), darunter „Weitere über die Suche“. Keine Zahlen.
- `DurationFilter`: ein Wert, drei Wege: `Slider` (0–180, 5er-Schritte; ganz rechts = keine Grenze wie heute), `NumberInput` „≤ … min“, Schnellwahl 15/30/60. Alle folgen einander sofort; die Schnellwahl ist hervorgehoben, solange der Wert passt. „Zurücksetzen“ = keine Grenze.
- `AccessFilter`: zwei `RadioGroup`s „Meine Rolle“ (Alle, Besitzer, Bearbeiter, Betrachter) und „Freigabe“ (Alle, Privat, Geteilt, Kollaborativ). Unmögliche Kombinationen ausgegraut nach `src/list/access.ts` (Logik unverändert).
- Jeder Inhalt bekommt `state` + `set` (bzw. die nötigen Teile) und ist ohne Seite testbar.
- `FilterControls` setzt sich aus den fünf Inhalten zusammen (Spalte und Handy-Sheet sehen danach neu aus, funktionieren aber wie bisher). Seine Props bleiben; `uncategorizedCount` wird ignoriert (entfernt in L7). `src/pages/RecipeList.tsx` wird **nicht** angefasst.

### Acceptance criteria
1. Fünf Komponenten in `src/components/list/filters/` mit je eigenem Test.
2. Kategorie: „Ohne Kategorie“ steht zuerst und hat keine Zahl; zwei gewählte Kategorien ergeben `categories: [a, b]` (Test).
3. Tags: Auswahl eines Tags verschiebt ihn nach oben; Suche „veg“ filtert die Liste (Test).
4. Zutaten: bei 30 Zutaten ohne Suche die ersten 12 nach Name sichtbar + Hinweis, ausgewählte zusätzlich oben; Suche findet die übrigen (Test).
5. Arbeitszeit: Klick auf „30“ setzt `durationMax: 30`, Regler und Feld zeigen 30, „30“ hervorgehoben; Feld auf 45 → Regler 45, keine Schnellwahl hervorgehoben; Zurücksetzen → `null` (Tests).
6. Zugriff: unmögliche Kombination ist ausgegraut, wie heute (bestehende Tests aus `FilterControls.test.tsx` übernommen).
7. Nur postxl-Controls, Tailwind, keine Inline-Styles.
8. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Filterleiste, Popover, Sheets je Filter, Entfernen der Spalte (L6). Trefferzahlen (B16).

### Assumptions
- `Command` wird nicht gebraucht; Suche = `SearchInput` + Liste.
- `CategorySidebar.tsx` darf in `CategoryFilter` aufgehen (Tests mitnehmen).

### Affected areas
`src/components/list/filters/*.tsx` (+tests), `src/components/list/FilterControls.tsx` (+test), `src/components/list/CategorySidebar.tsx` (+test, ggf. entfernt).

---

## L4 — Ansicht „Kacheln“

Labels: redesign, ui, alpha · Depends on: L1

### Context
Spec Abschnitt „Kacheln“, README §1.5, §3.1. `DetailView` kennt heute `'detailed' | 'compact'`. Die Kacheln sind die dritte Ansicht, auch ohne Fotos (REST heute) als ruhige Typo-Kachel.

### Goal
Nutzer können die Liste als Kachelraster ansehen, gruppiert oder flach.

### Behaviour
- `DetailView = 'detailed' | 'compact' | 'tiles'`. `url.ts`: `view=tiles`; unbekannte Werte → `'detailed'`. `persistence.ts`: gespeicherter `detail` wird geprüft, unbekannt → `'detailed'`.
- Der bestehende Dichte-Schalter in `ListToolbar` bekommt die dritte Option, Reihenfolge Kompakt · Detailliert · Kacheln (Icon `LayoutGrid`, Tooltip „Kacheln“).
- Raster `grid-cols-[repeat(auto-fill,minmax(230px,1fr))]`, Abstand 28 × 20 px; Handy (`phone:`) 2 Spalten, 20 × 12 px.
- `RecipeTile` (Link aufs Detail): Medium 4:3 `rounded-lg`; darunter Kategorie-Zeile (Punkte + Name der ersten Kategorie neutral + „+n“, über `recipeCategories`/`CategoryDots` aus L1; in einer Gruppe nur die anderen), Titel (17 px / 700, Handy 15 px), Meta-Zeile (Zeit, Bewertung mit Komma, „von <Name>“ bei fremden Rezepten nur wenn der Name im Katalog steht, Zugriffs-Icons nach L1).
- Mit Foto: `object-cover`, Hover leichtes Zoomen nur ohne `prefers-reduced-motion` (`motion-safe:`).
- Ohne Foto: Typo-Kachel `bg-muted`, Name unten links groß in `text-muted-foreground` (22 px / 750, Handy 17 px, max. 3 Zeilen, `line-clamp-3`); der Titel darunter entfällt. Kein Kategorie-Farbton.
- Gruppiert: derselbe Gruppen-Container wie bei den Zeilen (Kopf, 2-px-Linie, Einklappen), darin das Raster. Flach: ein Raster.
- Lade- und Nachlade-Skelette in Form der gewählten Ansicht: Kacheln 4:3, Zeilen in Kompakt- bzw. Detailliert-Höhe.
- Am Handy verdeckt der „+“-FAB die letzten Kacheln nicht (bestehender Abstand aus #87 gilt auch fürs Raster).

### Acceptance criteria
1. URL `?view=tiles` öffnet die Kachelansicht; `?view=foo` und ein gespeicherter Unsinnswert ergeben Detailliert (Unit-Tests `url.test.ts`, `persistence.test.ts`).
2. Der Ansicht-Schalter hat drei Optionen in der Reihenfolge Kompakt, Detailliert, Kacheln (Test).
3. `RecipeTile` mit Foto zeigt Bild + Titel; ohne Foto die Typo-Kachel mit dem Namen und keinen zweiten Titel (Tests).
4. Gruppierte Kachelansicht: Gruppenköpfe und Einklappen wie bei Zeilen; in Gruppe X fehlt der Punkt von X (Test).
5. Ladezustand in der Kachelansicht rendert Kachel-Skelette (Test).
6. Fremdes Rezept ohne bekannten Owner-Namen zeigt kein „von“ (Test).
7. Manuell (nicht Vitest) über Chrome MCP geprüft, Desktop + 390 px inkl. FAB-Abstand am Listenende, Screenshots im PR.
8. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Sortieren-Menü (L5), Filterleiste (L6), Start-Kacheln (Phase 5).

### Assumptions
- Owner-Namen kommen aus dem Katalog (`useUsers`), der auch im REST-Modus nur die Mock-Liste kennt (B2). Im REST-Modus passen die IDs nicht → kein „von“; AC 6 testet genau das.

### Affected areas
`src/list/state.ts`, `src/list/url.ts` (+test), `src/list/persistence.ts` (+test; wird auch von `src/components/shell/useNavState.ts` gelesen → kurzer Smoke-Test dort), `src/components/recipe/RecipeTile.tsx` (+test), `src/components/list/RecipeListView.tsx` (+test), `src/components/list/ListToolbar.tsx` (+test), `src/pages/RecipeList.tsx` (Skelette).

---

## L5 — Sortieren-Menü und Ansicht-Schalter (Desktop + Handy-Sheet)

Labels: redesign, ui, alpha · Depends on: L4

### Context
Spec Abschnitte „Desktop“ (Sortieren, Ansicht) und „Handy“. Heute: Richtungs-Knopf + `Select` fürs Kriterium + zwei ToggleGroups (`ListToolbar.tsx`), auf dem Handy dieselbe Leiste unter der Suche.

### Goal
Sortieren ist ein Knopf mit Menü; auf dem Handy liegen Sortieren und Ansicht hinter einem Knopf neben der Suche.

### Behaviour
- Desktop: Knopf `Button variant="outline" size="sm"` mit Richtungs-Icon + Kriterium + Chevron („↑ Name ▾“). Menü postxl `DropdownMenu` mit zwei `DropdownMenuRadioGroup`s: Kriterium (Name, Arbeitszeit, Gesamtzeit, Bewertung) und Richtung mit Klartext je Kriterium (heutige `dirLabel`: „A → Z / Z → A“, „Kürzeste/Längste zuerst“, „Beste/Schlechteste zuerst“). Richtungsknopf und `Select` entfallen.
- Daneben die zwei Segment-Gruppen (Ansicht dreiteilig aus L4, Gliederung), Komponenten aufgeteilt in `SortMenu` und `ViewToggles`.
- Handy (`!useIsDesktop`): Suche + ein 40-px-Icon-Knopf „Sortieren & Ansicht“. Er öffnet `BottomSheet` mit Sortieren (zwei `RadioGroup`s: Kriterium, Richtung), Ansicht (Kompakt/Detailliert/Kacheln), Gliederung. Kein „Anzeigen“-Knopf; die Liste ändert sich sofort.
- Suche: auf dem Desktop beim Öffnen der Seite fokussiert, ohne Scroll-Sprung (`focus({ preventScroll: true })`); auf dem Handy kein Autofokus. `SearchInput` bekommt dafür eine `inputRef`-Prop (bzw. forwardRef).

### Acceptance criteria
1. Desktop: Knopf zeigt Kriterium; Menü-Auswahl „Arbeitszeit“ + „Längste zuerst“ setzt `sortKey: 'work', sortDir: 'desc'` (Test).
2. Es gibt keinen separaten Richtungsknopf mehr (Test).
3. Handy-Rendering: ein Knopf „Sortieren & Ansicht“ (aria-label), Sheet enthält Kriterium, Richtung, Ansicht, Gliederung; Auswahl wirkt sofort (Test).
4. Desktop: Suchfeld `toHaveFocus()` nach dem Rendern; Handy nicht (Test mit gemocktem `useIsDesktop`).
5. Tippflächen am Handy ≥ 40 px.
6. Manuell (Chrome MCP, Desktop + 390 px): Gruppenkopf klebt weiter direkt unter dem geänderten Kopf (`--list-sticky-top`).
7. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Filterleiste (L6).

### Assumptions
- `DropdownMenu` ist aus postxl verfügbar (genutzt in `src/components/shell/ProfileMenu.tsx`).

### Affected areas
`src/components/list/SortMenu.tsx` (+test), `src/components/list/ViewToggles.tsx`, `src/components/list/MobileListOptions.tsx` (+test), `src/components/list/ListToolbar.tsx` (+test, ggf. entfernt), `src/components/list/SearchInput.tsx`, `src/pages/RecipeList.tsx`.

---

## L6 — Filterknopf mit Popover/Sheet (Baustein)

Labels: redesign, ui, alpha · Depends on: L3

### Context
Spec Abschnitte „Desktop“ (Filterleiste) und „Popover je Filter“. L7 baut daraus die Filterleiste. Dieses Issue liefert nur den Baustein und die Wert-Texte, ohne die Seite anzufassen, damit es parallel zu L4/L5 laufen kann.

### Goal
Ein wiederverwendbarer Filterknopf, der seinen Wert zeigt, ein eigenes ✕ hat und seinen Inhalt im Popover (Desktop) bzw. Bottom-Sheet (Handy) öffnet.

### Behaviour
- `FilterButton` (Props u. a. `label`, `value: string | null`, `onClear`, `children` = Inhalt aus L3). Inaktiv: `Button variant="outline" size="sm"`, Name + Chevron. Aktiv: `bg-muted font-medium`, Text „<Filter>: <Wert>“ und ein eigenes ✕ als getrennte Tippfläche (Label „<Filter> entfernen“, Handy ≥ 40 px), das nur `onClear` auslöst.
- Desktop (`useIsDesktop`): Klick öffnet postxl `Popover` mit `children`; Esc schließt, Fokus zurück auf den Knopf. Handy: `src/components/BottomSheet.tsx` mit Titel = Filtername und unten „Anzeigen“ (schließt nur). Keine Zahl im Knopf.
- Reine Funktion `filterLabels(state, catalogs)` liefert je Filter den Wert-Text oder `null`: „Favoriten +2“, „Ohne Kategorie“, „Vegetarisch +1“, „Tomaten +2“, „≤ 30 min“, „Bearbeiter · Geteilt“.

### Acceptance criteria
1. `filterLabels` Unit-Tests für alle fünf Filter inkl. leer, ein Wert, mehrere Werte, „Ohne Kategorie“, Zugriff nur Rolle / nur Freigabe / beide.
2. `FilterButton` inaktiv zeigt nur den Namen; aktiv „<Filter>: <Wert>“ und ✕; Klick auf ✕ ruft `onClear` und öffnet nichts (Tests).
3. Desktop: Klick öffnet das Popover mit dem Inhalt; Esc schließt, Knopf hat danach den Fokus (Test).
4. Handy (gemocktes `useIsDesktop = false`): Klick öffnet ein Bottom-Sheet mit Titel und „Anzeigen“; „Anzeigen“ schließt (Test).
5. Keine Änderungen an `src/pages/RecipeList.tsx`.
6. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Einbau in die Seite, Entfernen der Spalte (L7).

### Assumptions
- Die Inhalte aus L3 funktionieren unverändert in Popover und Sheet.

### Affected areas
`src/components/list/FilterButton.tsx` (+test), `src/list/filterLabels.ts` (+test).

---

## L7 — Filterleiste statt Filter-Spalte

Labels: redesign, ui, alpha · Depends on: L2, L5, L6

### Context
Spec Abschnitte „Desktop“ (Zeile 2, Zeile 3), „Handy“, „Architektur“. Nach L3 und L6 gibt es die Filter-Inhalte und den Filterknopf; noch hängen die Filter in der rechten Spalte, im Handy-Filter-Sheet und als Chips (`ActiveFilters`).

### Goal
Eine Filterleiste unter der Suche ersetzt Spalte, Handy-Filter-Sheet und Chip-Zeile; die Liste bekommt die volle Breite.

### Behaviour
- Zeile 2: `FilterBar` mit fünf `FilterButton`s (Kategorie, Tags, Zutaten, Arbeitszeit, Zugriff) und den Inhalten aus L3; Werte über `filterLabels`, ✕ setzt den jeweiligen Filter zurück.
- Handy: Leiste scrollt seitlich ohne sichtbare Scrollleiste.
- Zeile 3: Trefferzahl (L2) und, nur wenn ein Filter oder die Suche aktiv ist, Link-Knopf „Alle Filter zurücksetzen“ (`clear`).
- Entfernt: rechte Spalte inkl. `--rail-*`/`--list-search-offset`-Messung, `railSlotRef`, `searchRowRef`, Handy-Filter-Sheet, `ActiveFilters.tsx`, `FilterControls.tsx`, `uncategorizedCount`, `activeFacetCount` (falls ungenutzt). Die Zutaten-Optionen (`usedIngredients` mit Katalog-Fallback) bleiben als Quelle für `IngredientFilter`. `--list-sticky-top` und Scroll-Restore bleiben.
- FAB-Abstand am Handy bleibt (#87).

### Acceptance criteria
1. Desktop: fünf Filterknöpfe sichtbar, keine Filter-Spalte, Liste in voller Breite (Test: keine Filter-Rail mehr im DOM).
2. Tag im Popover wählen → Knopf zeigt „Tags: <Name>“, ✕ entfernt nur diesen Filter (Test).
3. „Alle Filter zurücksetzen“ erscheint nur bei aktivem Filter/Suche und leert alles (Test).
4. `ActiveFilters.tsx` und `FilterControls.tsx` sind entfernt, keine toten Imports; ihre noch relevanten Tests sind umgezogen.
5. Manuell (nicht Vitest) über Chrome MCP, Desktop + 390 px: Gruppenkopf klebt direkt unter dem Kopf, Leiste scrollt am Handy seitlich, FAB verdeckt nichts; Screenshots im PR.
6. Lokale Checks grün, PR-Beschreibung sagt das.

### Non-goals
- Trefferzahlen pro Filter (B16), Kategorie-Filter serverseitig, Kategorie-Seite.

### Assumptions
- L2, L5, L6 sind gemergt.

### Affected areas
`src/components/list/FilterBar.tsx` (+test), `src/pages/RecipeList.tsx`, `src/pages/RecipeList.search.test.tsx`, `src/list/state.ts`, entfernt: `src/components/list/ActiveFilters.tsx`, `src/components/list/FilterControls.tsx` (+test).

---

## Backend issues

Keine neuen. Bekannt und verlinkt: Backend #17 (B16: Gesamtzahl/Facetten, Kategorie-Filter UND/ODER) — würde später „x von y“ und Zahlen bei Tags/Zutaten erlauben; Backend #9 (B1 Bilder); Backend #10 (B2 Namen).

## QA journeys

1. Liste öffnen (Desktop, REST): Suche hat Fokus, Trefferzahl „N Rezepte“/„N+ Rezepte“, keine Bildspalte, Zeilen mit Kategorie-Punkten und Tooltips, eigenes privates Rezept ohne Zugriffs-Icon.
2. Ansicht wechseln Kompakt → Detailliert → Kacheln, gruppiert und flach; Typo-Kacheln ohne Foto; Reload behält die Ansicht; `?view=tiles` teilen.
3. Sortieren über das Menü (alle vier Kriterien, beide Richtungen).
4. Jeden Filter über die Leiste setzen und per ✕ entfernen; Kategorie „Ohne Kategorie“; Arbeitszeit über Regler, Feld und Schnellwahl; unmögliche Zugriffs-Kombination; „Alle Filter zurücksetzen“.
5. Suche ohne Treffer bei vielen Rezepten: erst Laden, dann „Keine Treffer“ + „Filter zurücksetzen“.
6. Handy 390 px: Suche ohne Autofokus, „Sortieren & Ansicht“-Sheet, Filterleiste seitlich scrollbar, Filter-Sheets mit „Anzeigen“, 2-Spalten-Kacheln, FAB verdeckt nichts.
7. Mock-Modus mit Fotos: Bildspalte erscheint, Platzhalter für Rezepte ohne Foto, Kacheln mit Bildern.
8. Dunkelmodus: Punkte, Gruppenlinien, aktive Filterknöpfe lesbar; Tastaturfokus überall sichtbar.

## Review-Log

- 2026-11-05, unabhängiger Reviewer (Subagent): keine Blocker. Eingearbeitet: L6 geteilt in L6 (Filterknopf-Baustein,
  parallel zu L4/L5) und L7 (Einbau); Merge-Konflikte im ersten Schwung entschärft (L1 nur eine Zeile in
  `RecipeList.tsx`, L3 fasst sie nicht an); Foto-Spalte ohne eigenen State aus `search.recipes` abgeleitet;
  fehlende Spec-Punkte zugeordnet (Kategorie navigiert nicht → L3, FAB bei Kacheln und Zeilen-Skelette → L4,
  Sticky-Check → L5, `uncategorizedCount` entfernen → L7, architecture.md §4 → Docs-PR); `useIsDesktop`-Ausnahmen
  benannt; Tests präzisiert (Tooltip per Fokus, `ResultCount` ohne „von“, Zutaten-Ausschnitt, `toHaveFocus`,
  `inputRef` an `SearchInput`, Persistenz-Smoke-Test für `useNavState`); manuelle Chrome-MCP-Prüfungen als solche markiert.
