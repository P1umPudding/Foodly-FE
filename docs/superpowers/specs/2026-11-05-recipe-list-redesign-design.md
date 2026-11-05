# Rezeptliste „Ruhig“ (Redesign Schritt 4) — Design

> Status: Entwurf (Lead, 2026-11-05). Grundlage: `docs/design/redesign/README.md` §3.1, §1.2, §1.5, §1.7
> (freigegeben von Kolja am 29.10.), Mockup `docs/design/redesign/index.html` (Screens „Rezepte“,
> Ansicht Kompakt/Detailliert/Kacheln, Handy, ohne Fotos). Nur Frontend, keine Protokolländerung.

## Ziel

Die Rezeptliste `/recipes` bekommt die Bedienung aus dem Redesign: Suche, Sortieren und Ansicht in einer
Zeile, darunter eine **Filterleiste** statt der rechten Filter-Spalte, eine dritte Ansicht **Kacheln** und
**Kategorie-Punkte** an jedem Rezept. Funktional bleibt alles wie heute (`ListState`); die Liste bekommt die
volle Breite.

## Bildschirm

### Desktop (ab 761 px, `useIsDesktop`)

```
Zeile 1  [ Suchen…                              ] [↑ Name ▾] [Kompakt|Detailliert|Kacheln] [Nach Kategorie|Einfache Liste]
Zeile 2  [Kategorie ▾] [Tags: Vegetarisch +1 ✕] [Zutaten ▾] [Arbeitszeit: ≤ 30 min ✕] [Zugriff ▾]
Zeile 3  14 Rezepte · Alle Filter zurücksetzen
Liste    Gruppen / flache Liste / Kachelraster
```

- **Suche:** wie heute (`SearchInput`, URL `q`, `replace` pro Tastendruck). Auf dem Desktop beim Öffnen fokussiert,
  ohne Scroll-Sprung (`focus({ preventScroll: true })`); auf dem Handy nicht.
- **Sortieren:** ein Knopf mit Richtungs-Icon + Kriterium („↑ Name ▾“). Das Menü (postxl `DropdownMenu` mit
  zwei `DropdownMenuRadioGroup`s, wie in `src/components/shell/ProfileMenu.tsx` importiert) listet die vier Kriterien (Name, Arbeitszeit, Gesamtzeit, Bewertung)
  und darunter die zwei Richtungen mit Klartext je Kriterium („A → Z / Z → A“, „Kürzeste/Längste zuerst“,
  „Beste/Schlechteste zuerst“, wie `dirLabel` heute). Der heutige Richtungsknopf und das `Select` entfallen.
- **Ansicht:** zwei Segment-Gruppen wie heute (`ViewToggle`), Dichte jetzt dreiteilig in der Reihenfolge
  Kompakt · Detailliert · Kacheln (Icons `Menu`, `LayoutList`, `LayoutGrid`, Tooltips). Gliederung unverändert.
  In der Kachel-Ansicht gilt die Gliederung ebenfalls (Kachelraster je Gruppe).
- **Filterleiste:** je Filter ein `Button variant="outline" size="sm"`. Inaktiv: Name + Chevron. Aktiv: neutral
  hervorgehoben (`bg-muted` + `font-medium`, wie `SELECTED_CHIP`, keine Akzentfarbe), Text immer
  „<Filter>: <Wert>“, und ein eigenes ✕ als getrennte Tippfläche (Handy ≥ 40 px, Label „<Filter> entfernen“).
  Klick auf den Knopf öffnet das Popover, Klick auf ✕ löscht nur diesen Filter. Werte:
  - „Kategorie: Favoriten“, „Kategorie: Favoriten +2“, „Kategorie: Ohne Kategorie“.
  - „Tags: Vegetarisch +1“, „Zutaten: Tomaten +2“ (erster Name + „+n“).
  - „Arbeitszeit: ≤ 30 min“.
  - „Zugriff: Bearbeiter“, „Zugriff: Geteilt“, „Zugriff: Bearbeiter · Geteilt“.
- **Zeile 3:** Trefferzahl und, nur wenn ein Filter oder die Suche aktiv ist, der Link-Knopf
  „Alle Filter zurücksetzen“ (`clear`). Die Chip-Zeile `ActiveFilters` entfällt.
  Die Trefferzahl zeigt nur, was wirklich bekannt ist: „N Rezepte“ = sichtbare Rezepte; solange weitere Seiten
  ausstehen (`hasMore`), „N+ Rezepte“. „x von y Rezepten“ erst, wenn der Server eine Gesamtzahl liefert (B16).
  Heute zeigt `ResultCount` „x von y“ mit y = geladene, serverseitig gefilterte Rezepte; das ist irreführend und
  entfällt.

### Popover je Filter (Desktop) / Sheet (Handy)

Desktop: postxl `Popover` am Knopf. Handy: `src/components/BottomSheet.tsx` (#97, nicht postxl `Sheet` direkt)
mit Titel des Filters und unten „Anzeigen“ (schließt nur; Änderungen wirken sofort, wie heute). Keine
Trefferzahl im Sheet-Knopf: README §3.1 nennt zwar „x Rezepte anzeigen“, der B16-Absatz dort überholt das.

| Filter | Inhalt | Logik |
|---|---|---|
| Kategorie | Checkbox-Liste: „Ohne Kategorie“ zuerst, dann Kategorien in `order`; je Zeile Farbpunkt, Name, Anzahl (`UserCategory.recipes.length`, vollständig). „Ohne Kategorie“ **ohne** Zahl: sie ließe sich nur über die geladenen Seiten zählen (B16). Der Filter filtert nur, er navigiert nicht | ODER, clientseitig (wie heute) |
| Tags | Suchfeld + Checkbox-Liste, ausgewählte oben; Tag-Icon wie heute (`TagIcon`) | UND |
| Zutaten | Suchfeld + Checkbox-Liste, ausgewählte oben; ohne Suche nur ein Ausschnitt (erste 12 nach Name), Rest über die Suche, Hinweis „Weitere über die Suche“ | UND |
| Arbeitszeit | Regler 0–180 (5er-Schritte), Feld „≤ … min“ (`NumberInput`), Schnellwahl 15/30/60. Ein Wert, alle drei folgen einander sofort; die Schnellwahl ist hervorgehoben, solange der Wert passt. „Zurücksetzen“ = keine Grenze | `durationMax` |
| Zugriff | Zwei `RadioGroup`s: „Meine Rolle“ (Alle, Besitzer, Bearbeiter, Betrachter) und „Freigabe“ (Alle, Privat, Geteilt, Kollaborativ). Unmögliche Kombinationen ausgegraut wie heute (`src/list/access.ts`) | `role`, `collab` |

Keine Trefferzahlen bei Tags und Zutaten (die Liste ist serverseitig gefiltert und lädt seitenweise).
Die Logik der heutigen `FilterControls` (Suche normalisiert über `normalizeText`, Slider-Max = keine Grenze,
Zugriffs-Matrix) wird in die neuen Popover-Inhalte übernommen, nicht neu erfunden.

### Handy (bis 760 px)

- Zeile 1: Suche + **ein** Icon-Knopf „Sortieren & Ansicht“ (40 px). Er öffnet ein `BottomSheet` mit drei
  Blöcken: Sortieren (Kriterium und Richtung als zwei `RadioGroup`s), Ansicht (Kompakt/Detailliert/Kacheln),
  Gliederung. Kein „Anzeigen“-Knopf, die Liste ändert sich sofort.
- Zeile 2: Filterleiste scrollt seitlich (`overflow-x-auto`, ohne sichtbare Scrollleiste), Knöpfe ≥ 40 px hoch.
- Handy-Regeln über die `phone:`-Variante (z. B. `phone:hidden`, `phone:grid-cols-2`); `useIsDesktop` nur, wo CSS nicht
  reicht: Popover vs. Sheet, Tooltips, Handy-Kopfzeile, Autofokus.
- Der „+“-FAB verdeckt das Listenende nicht (bestehende Lösung aus #87 / `phone-fab-clearance` bleibt, auch für
  Kacheln).
- Zeile 3 wie Desktop.
- Der Kopf (Zeilen 1–3) klebt wie heute oben; die Gruppenköpfe schieben sich darunter (`--list-sticky-top`).

### Rezept in der Liste

- **Kategorie-Punkte** (§1.2): bis zu 3 Punkte (`bg-cat-dot` über `categoryColorVars`), danach „+n“. Reihenfolge
  der Kategorien nach `order`. In der gruppierten Ansicht zeigt die Zeile innerhalb einer Kategorie-Gruppe nur die
  **anderen** Kategorien. Desktop: jeder Punkt hat einen eigenen postxl-Tooltip mit dem Kategorienamen, „+n“
  nennt die übrigen; Trefferfläche je Punkt mit Innenabstand größer als 8 px; am rechten Zeilenrand öffnen die
  Tooltips nach links (`side="left"`). Handy: keine Tooltips.
  Ein Rezept ohne Kategorie zeigt nichts. Neue reine Funktion `recipeCategories(recipe, categories, except?)`
  in `src/list/` (getestet), Komponente `CategoryDots` in `src/components/recipe/`.
- **Zugriffs-Icons:** `RoleCollabIndicator` zeigt heute immer Rolle + Freigabe (auch Krone + Schloss beim eigenen
  privaten Rezept). Neu nur, wenn sie etwas sagen: Rolle nur bei Bearbeiter/Betrachter, Freigabe nur bei
  Geteilt/Kollaborativ; ein eigenes privates Rezept hat keins (§3.1). Gilt für Zeilen und Kacheln.
- **Vorschaubild (§1.5):** Heute zeigt Detailliert immer eine 44-px-Zelle (ohne Foto mit Besteck-Symbol). Neu:
  48 px, und die Spalte erscheint nur, wenn mindestens ein geladenes Rezept ein anzeigbares Foto hat
  (`mainImage !== null && showsRecipeImages()`). Dann bekommt ein Rezept ohne Foto den grauen Platzhalter mit
  Besteck-Symbol. Gibt es kein Foto (REST heute, B1), entfällt die Spalte. Bringt eine spätere Seite das erste
  Foto, erscheint die Spalte; beim Nachladen verschwindet sie nicht wieder.
- **Kompakt / Detailliert:** Aufbau wie heute plus Punkte rechts außen (nach den Zugriffs-Icons), Tags auf dem
  Handy ausgeblendet wie im Mockup.

### Kacheln (neu)

- Raster `grid-cols-[repeat(auto-fill,minmax(230px,1fr))]`, Abstand 28 × 20 px; Handy 2 Spalten, 20 × 12 px.
- Karte ohne Rahmen: Medium 4:3 (`rounded-lg`), darunter Kategorie-Zeile (Punkte + Name der ersten Kategorie +
  „+n“, Name neutral; in einer Kategorie-Gruppe nur die *anderen* Kategorien), Titel (17 px / 700, Handy 15 px),
  Meta-Zeile (Zeit, Bewertung, „von <Name>“ bei fremden Rezepten, nur wenn der Name bekannt ist (B2, heute
  Mock-Liste), Zugriffs-Icons).
- Mit Foto: Bild `object-cover`, Hover leichtes Zoomen (nur ohne `prefers-reduced-motion`).
- Ohne Foto: **Typo-Kachel** — `bg-muted`, Rezeptname unten links groß in `text-muted-foreground` (22 px / 750,
  Handy 17 px, max. 3 Zeilen); der Titel darunter entfällt dann. Kein Kategorie-Farbton, kein Fake-Bild.
- Gruppiert: derselbe Gruppen-Container wie bei den Zeilen (Kopf mit Punkt, 2-px-Linie links), darin das Raster.
- Neue Komponente `RecipeTile` in `src/components/recipe/`.

### Zustände (§1.7)

- Laden: Skelette in Form der gewählten Ansicht (Zeilen bzw. Kacheln 4:3).
- Leer (keine Rezepte): wie heute „Noch keine Rezepte.“
- Keine Treffer: wie heute, Knopf „Filter zurücksetzen“ — aber erst, wenn `!hasMore`. Kategorie und Suche filtern
  clientseitig über die geladenen Seiten; solange weitere Seiten laden, Skelett statt Leer-Text.
- Fehler: wie heute `Alert` + „Erneut versuchen“.
- Nachladen (Infinite Scroll): ein Skelett der gewählten Ansicht.
- Skelette statt postxl `Loader` (Redesign §1.7, so auch heute); architecture.md §4 wird im Docs-PR nachgezogen.
- Gruppen: einklappbar, Kopf klebt, „Ohne Kategorie“ zuerst und eingeklappt, graue Linie (alles wie heute).
  „Öffnen ›“ an der Gruppe gibt es erst mit der Kategorie-Seite; bis dahin kein toter Link.
- Ton: `tabular-nums`, Zeiten „45 min“ / „1 h 30 min“, Bewertung mit Komma, Du-Form, keine Ausrufezeichen.

## Daten und API

Keine neuen Endpunkte. Alles über bestehende Hooks: `useRecipeSearch(buildSearchQuery(state))`,
`useCategories`, `useTags`, `useIngredients`, `useCurrentUserId`. Kategorie-Filter und Suche bleiben
clientseitig auf der geladenen Seite (wie heute, `inSelectedCategory`, `matchesSearch`).

## Zustand, URL, Persistenz

- `DetailView = 'detailed' | 'compact' | 'tiles'`; `url.ts` (`view=tiles`) und `persistence.ts` übernehmen den Wert,
  unbekannte Werte fallen auf `'detailed'` zurück (heute schon über `oneOf`; Persistenz prüft den Wert noch nicht —
  ergänzen).
- `activeFacetCount` wird nicht mehr gebraucht, sobald das Handy-Filter-Sheet weg ist (entfernen, wenn ungenutzt).
- Keine neuen URL-Parameter.

## Architektur

- Passt zu `docs/architecture.md` §1 (Daten nur über `src/api`), §3 (Kataloge), §4 (Zustände), §6 (postxl,
  Tailwind, Kategorie-Farben nur über `categoryColorVars`).
- Neue Komponenten in `src/components/list/`: `SortMenu`, `ViewToggles` (aus `ListToolbar`), `FilterBar`,
  `FilterButton` (Knopf + Wert + ✕, Popover/Sheet je nach `useIsDesktop`), je Filter ein Inhalt
  (`CategoryFilter`, `TagFilter`, `IngredientFilter`, `DurationFilter`, `AccessFilter`), `MobileListOptions`.
- `RecipeList.tsx` wird schlanker: Rail, `--rail-*`- und `--list-search-offset`-Messung (`railSlotRef`,
  `searchRowRef`) und Handy-Filter-Sheet entfallen;
  `--list-sticky-top`-Messung und Scroll-Restore bleiben.
- Entfallen nach dem Umbau: `FilterControls.tsx`, `CategorySidebar.tsx`, `ActiveFilters.tsx` (inkl. Tests, Logik
  vorher in die neuen Komponenten übernommen).

## Nicht in diesem Block

- **Kategorie-Seite** („Öffnen ›“ an der Gruppe, getönter Kopf, Leiste ohne Filter): gehört zu „Kategorien
  verwalten“ / Phase 5 (architecture.md §5: heute keine eigene Route).
- Trefferzahlen bei Tags/Zutaten und im Sheet-Knopf (B16, Backend #17).
- Kategorie-Filter serverseitig (Backend-Doku: UND, Design: ODER; Frage in Backend #17).
- Kategorie-Symbol (B11), echte Fotos (B1).
- Rezept-Detail, Start, Koch-Modus (Redesign Schritte 5–6).

## Risiken

- **Popover in Popover / Sheet-Fokus:** Suche im Popover (Tags/Zutaten) darf den Fokus nicht an die Seite
  verlieren; Tests mit Testing Library für Öffnen, Tippen, Auswählen, Schließen (Esc).
- **Sticky-Kopf-Höhe** ändert sich (3 statt 2 Zeilen, Zeile 3 manchmal leer): `--list-sticky-top` muss weiter
  stimmen; ResizeObserver bleibt.
- **Viele Einzel-PRs am selben `RecipeList.tsx`:** Reihenfolge einhalten (siehe Issue-Liste), damit Merges
  nicht kollidieren.
- `Command` evtl. nicht in postxl 1.8.1 exportiert → dann `SearchInput` + Checkbox-Liste.

## Backend-Abhängigkeiten

Keine blockierenden. Bekannt und unverändert: B16 / Backend #17 (Gesamtzahl, Facetten-Zahlen, UND/ODER bei
Kategorien), B1 / Backend #9 (Bilder), B2 / Backend #10 (Namen für „von <Name>“), #49 (Bewertungs-Sortierung pro
Seite).

## Offene Entscheidungen

Keine. Das Design ist freigegeben (29.10.); die Abgrenzung „Kategorie-Seite nicht in diesem Block“ folgt
architecture.md §5 und der Plan-Reihenfolge (Kategorien verwalten als eigener Breakdown).

## QA-Journeys (nach L7)


1. Liste öffnen (Desktop, REST): Suche hat Fokus, Trefferzahl „N Rezepte“/„N+ Rezepte“, keine Bildspalte, Zeilen mit Kategorie-Punkten und Tooltips, eigenes privates Rezept ohne Zugriffs-Icon.
2. Ansicht wechseln Kompakt → Detailliert → Kacheln, gruppiert und flach; Typo-Kacheln ohne Foto; Reload behält die Ansicht; `?view=tiles` teilen.
3. Sortieren über das Menü (alle vier Kriterien, beide Richtungen).
4. Jeden Filter über die Leiste setzen und per ✕ entfernen; Kategorie „Ohne Kategorie“; Arbeitszeit über Regler, Feld und Schnellwahl; unmögliche Zugriffs-Kombination; „Alle Filter zurücksetzen“.
5. Suche ohne Treffer bei vielen Rezepten: erst Laden, dann „Keine Treffer“ + „Filter zurücksetzen“.
6. Handy 390 px: Suche ohne Autofokus, „Sortieren & Ansicht“-Sheet, Filterleiste seitlich scrollbar, Filter-Sheets mit „Anzeigen“, 2-Spalten-Kacheln, FAB verdeckt nichts.
7. Mock-Modus mit Fotos: Bildspalte erscheint, Platzhalter für Rezepte ohne Foto, Kacheln mit Bildern.
8. Dunkelmodus: Punkte, Gruppenlinien, aktive Filterknöpfe lesbar; Tastaturfokus überall sichtbar.

## Review-Log

- 2026-11-05, unabhängiger Reviewer (Subagent): keine Blocker. Eingearbeitet: Trefferzahl ehrlich (kein „x von y“
  ohne Server-Gesamtzahl), „Ohne Kategorie“ ohne Zahl, „Keine Treffer“ erst bei `!hasMore`, „von <Name>“ hängt an
  B2, `DropdownMenu` statt Hedge, Tooltip `side="left"`, einheitliche Knopf-Texte, 44 → 48 px und Spalte nur
  einblenden, Skelett-vs-`Loader`-Notiz, Aufräumliste ergänzt, `phone:`-Variante, B16-Hinweis zum Sheet-Knopf.
- 2026-11-05, Foodly Designer: eingearbeitet: `BottomSheet.tsx` statt postxl `Sheet`, aktiver Filter neutral
  mit getrenntem ✕, Sortier-Sheet mit zwei RadioGroups ohne „Anzeigen“, Kacheln in Gruppen zeigen nur andere
  Kategorien, FAB-Abstand, kein „Öffnen ›“ ohne Kategorie-Seite, Ton-Regeln. Trefferzahl: Designer wollte
  „x von y“ nur mit Server-Gesamtzahl — übernommen.
