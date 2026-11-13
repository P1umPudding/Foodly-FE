# Audit „Liste“: Mockup `#/list`, `#/listf` gegen App `/recipes`

Stand: App main dda7820 (localhost:4173) gegen Mockup (localhost:4174), Desktop 1440×900 und Handy 390×844, hell und dunkel.
Screenshots und Skripte: (lokale Screenshots, nicht im Repo) (`mock-*` / `app-*`, z. B. `*-sort-d-light`, `*-view-m-light`, `*-f-<facette>-d|m`, `*-listf-*`, `*-compact-*`, `*-tiles-*`, `*-flat-*`, `*-empty-*`, `*-scrolled-*`), Skript `liste/shoot.mjs`, Jobs `jobs1-3.py`.

Dunkel: Bei Sortiermenü, Liste und Kacheln weicht nichts zusätzlich zu Hell ab. Alle Punkte unten gelten für beide Themes.
Nicht aufgenommen: Unterschiede in den Mockdaten (andere Rezepte, Kategorien, Tags wie „Portionen“, laufender Timer „18:42“), Schriftrendering und Shell-Punkte außerhalb der Liste (Seitenleiste, Kopfzeile; siehe #228).

Legende Art: **S** = Layout/Struktur, **V** = Verhalten, **T** = Text, **F** = Fein (Abstände, Farbe, Größe).

---

## 1. Kopfbereich: Suche, Sortieren, Ansicht

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 1.1 | Liste · Desktop + Handy | Suchfeld mit Lupe links, Platzhalter „Rezept oder Zutat suchen“, ✕ als 22-px-`x-btn` (app.js:429, base.css `.input` 38 px) | Kein Icon, „Suchen…“ (`RecipeList.tsx:240`, `SearchInput.tsx`) | S/T | #227 |
| 1.2 | Liste · Desktop | Sortierknopf, Segmente und Suche sind alle 38 px hoch, Text 14 px (screens.css:2332-2340) | Suche 36 px (`min-h-9`), Sortierknopf 32 px (`size="sm"` = h-8), Segmente 38 px: Die Zeile ist nicht bündig | F | NEU (A) |
| 1.3 | Liste · Desktop | Der Sortierknopf ist so breit wie sein Inhalt: „⇅ Name ▾“ (app.js:303) | Reserviert die Breite des längsten Kriteriums, deshalb großer Leerraum vor dem Chevron (`SortMenu.tsx:611-620`) | F | NEU (A) |
| 1.4 | Liste · Desktop | Zwischen Sortierknopf und Ansicht steht ein senkrechter Trenner `vsep` (1 px, `--border`, app.js:431, screens.css:83). Ansicht und Gliederung stehen 6 px auseinander | Kein Trenner, Abstände 16 px / 10 px (`RecipeList.tsx:247`, `ViewToggles.tsx:718`) | F | NEU (A) |
| 1.5 | Liste · Desktop | Ansicht und Gliederung als Segment-Track (`.seg`) | Umrandete ToggleGroups | S | #227 |
| 1.6 | Sortiermenü offen · Desktop | Keine Gruppenüberschriften. 4 Einträge `.mi`: Icon **links**, Label, ✓ **rechts** beim gewählten; Gewähltes in fg/500, Rest muted; 34 px hoch; Breite 240. Darunter Trennlinie und die Richtung als **Segment** „A → Z | Z → A“ über die volle Breite (app.js:296-299, screens.css:1360-1395) | Überschriften „Sortieren nach“ und „Richtung“, Radio-Punkt links, Icon rechts (muted), Richtung als zweite Radio-Liste (`SortMenu.tsx:624-651`) | S | NEU (A) |
| 1.7 | Sortieren · Kriterium wechseln | Ein neues Kriterium setzt die Richtung zurück: „Bewertung“ wird absteigend („Beste zuerst“), alle anderen aufsteigend (app.js:1031) | Die bisherige Richtung bleibt. Wer „Bewertung“ wählt, bekommt „Schlechteste zuerst“ (`SortMenu.tsx:629`) | V | NEU (A) |
| 1.8 | Liste · Handy · Knopf neben der Suche | Icon `sliders-horizontal`, aria „Sortieren und Ansicht“ (app.js:430) | Icon `ArrowUpDown` (`MobileListOptions.tsx:84`) | S | NEU (A) |
| 1.9 | Sheet „Sortieren & Ansicht“ · Handy | Abschnitt „Sortieren nach“: Menüliste wie Desktop (Icon links, ✓ rechts), Richtung als Segment. „Ansicht“ als 3er-Segment mit Icon und Text, „Gliederung“ als 2er-Segment (app.js:436-452). Alles passt ohne Scrollen ins Sheet | Überschrift „Sortieren“, alle vier Gruppen als Radio-Listen (Richtung mit Icons). Das Sheet ist höher als der Bildschirm: „Einfache Liste“ wird abgeschnitten, man muss scrollen (`MobileListOptions.tsx:88-123`) | S/T | NEU (A) |
| 1.10 | Liste · Handy · Seitenrand | `.page` mit 12 px oben und 16 px seitlich (base.css:689) | `px-6` / `pt-6` (24 px), die Filterleiste ebenfalls ±24 px (`RecipeList.tsx:228`, `FilterBar.tsx:440`) | F | #228 („Handy wie Mockup“) |
| 1.11 | Liste · Desktop · Breite | Die Liste ist `.page.wide` mit max. 1280 px und 32 px seitlich (app.js:547, base.css:215) | `max-w-6xl` (1152) mit 24 px. Achtung: #228 setzt pauschal 1080 px, für die Liste schreibt das Mockup aber 1280 vor | F | #228 (Hinweis für #228 nötig) |
| 1.12 | Liste · gescrollt · Desktop + Handy | Nur die Kopfzeile (60/56 px) und der jeweilige Gruppenkopf kleben. Suche, Filterleiste und Trefferzahl scrollen mit weg (`.toolbar` ist nicht sticky; `.lgroup-h` sticky mit top 60/56, screens.css:1539) | Der ganze Block aus Suche, Filterleiste und Trefferzahl klebt (`RecipeList.tsx:232`, `sticky top-(--site-nav-h)`). Auf dem Handy belegt er rund 200 von 844 px, die Gruppenköpfe kleben darunter | S/V | NEU (D) |

## 2. Filterleiste und Filterknöpfe

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 2.1 | Filterleiste · inaktiv | Icon je Facette (folder, tag, list-checks, clock, users) vor dem Label | Kein Icon | S | #227 |
| 2.2 | Filterknopf · Größe/Schrift | Desktop 30 px hoch, 13 px / 500, Text muted, Icons 14 px, 6 px Abstand; Handy 32 px (screens.css:2069-2131) | 32 px, 14 px / 400, Abstand 8 px; Handy 40 px (Ausnahme §7, ok) | F | NEU (C) |
| 2.3 | Filterknopf · aktiv | Ein Rahmen umschließt beide Teile: Fläche `surface` (keine graue Füllung), Rahmen `border-strong`. „Tags:“ in subtle, Wert in fg/600 (max. 180 px), ✕ durch eine 1-px-Linie getrennt (screens.css:2104-2149) | Grau gefüllt (`bg-muted`, `FilterButton.tsx:487`). Label und Wert sind gleich stark (medium), das ✕ ist ein eigener Outline-Knopf | F | NEU (C) (#227 regelt nur „Label: Wert + ✕“, das ist vorhanden) |
| 2.4 | Filterknopf · geöffnet | `.fbtn.open`: Rahmen wird `--fg-subtle`, keine Füllung | Der Trigger wird grau gefüllt (Radix open/hover) | F | NEU (C) |
| 2.5 | Trefferzeile | „5 von 14 Rezepte“, 13 px muted; „Alle Filter zurücksetzen“ als `link-btn` 12 px / 500 mit Hover-Fläche, 10 px daneben, ohne Trennpunkt (app.js:434, screens.css:1414) | „5 Rezepte · Alle Filter zurücksetzen“, Link 14 px / 400. „x von y“ fehlt, das ist eine bewusste Ausnahme (design.md §4, B16, kein Fund) | F | NEU (C) |
| 2.6 | Trefferzeile · nur Suchtext, kein Filter | „Alle Filter zurücksetzen“ erscheint nur bei aktiven Facetten (`facetCount()`, app.js:434). Eine reine Suche zeigt den Link nicht | Der Link erscheint schon bei reinem Suchtext, weil `isFilterActive` die Suche mitzählt (`state.ts:47`) | V | NEU (C) |
| 2.7 | Filterleiste · Handy | Scrollt seitlich, Rand 16 px | Wie Mockup, aber Rand 24 px (siehe 1.10) | F | #228 |

## 3. Filter-Popover (Desktop) und Filter-Sheets (Handy)

### 3a. Gemeinsam

| # | Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 3.1 | Jedes Popover mit aktivem Wert | Fußzeile `.fp-f` mit Trennlinie, links der Link „Zurücksetzen“ (app.js:419, screens.css:2257) | Kein „Zurücksetzen“ im Popover (nur Arbeitszeit hat eigenes, siehe 3.10); Reset nur über das ✕ am Knopf | S | NEU (B) |
| 3.2 | Checkbox-Zeilen | `.ck`: 32 px, 13 px, Text **muted**, gewählt fg/500; Checkbox 16 px, gewählt **gefüllt** (fg-Fläche, Haken in bg-Farbe) (screens.css:2172-2203, base.css:416-429) | Zeilen ca. 28 px, 14 px, Text immer fg/normal; postxl-Checkbox gewählt = heller Kasten mit Haken (`FilterCheckRow.tsx`) | F | NEU (B) |
| 3.3 | Radio-Zeilen (Zugriff) | `.radio` 16 px, gewählt = 5-px-fg-Ring (wirkt gefüllt), Label gewählt fg/500 (screens.css:2229-2238) | postxl-Radio mit kleinem Punkt, Label immer normal | F | NEU (B) |
| 3.4 | Handy · Filter-Sheet-Kopf | Titel **linksbündig** 16 px / 650, ✕ als Ghost-Icon-Button rechts in einer Zeile, kein Griff (`.fp-h`, app.js:417) | Griff, Titel **zentriert**, kleines ✕ oben rechts in der Ecke (postxl `Sheet`/`BottomSheet`). Der Griff ist laut design.md §7 gewollt | S/F | NEU (F) |
| 3.5 | Handy · Filter-Sheet-Fuß | Links „Zurücksetzen“ (bei aktivem Wert), rechts „Anzeigen“ (`btn sm primary`, flex 1) (screens.css:2320-2326) | Nur „Anzeigen“ über die volle Breite. Konflikt: design.md §7 sagt „Filter-Sheets haben unten nur ‚Anzeigen‘“. Owner entscheiden | S | NEU (F), Owner |
| 3.6 | Handy · Sheet-Höhe | `.fpop` max. 80vh, Listen max. 50vh (Tags zeigen rund 10 Zeilen) | Listen `max-h-60` (240 px, Tags 6 Zeilen) | F | NEU (B) |

### 3b. Je Facette

| # | Facette | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 3.7 | Kategorie | „Ohne Kategorie“ zuerst, mit **hohlem** Punkt (`cat-dot none`) und Anzahl; darunter der Hinweis „Mehrere = Rezepte aus einer davon.“ (app.js:360-369) | Grau gefüllter Punkt, **keine Anzahl** (bewusst, B16: `CategoryFilter.tsx:592`), **kein Hinweis** | T/F | NEU (B); Anzahl bei „Ohne Kategorie“ = Ausnahme prüfen |
| 3.8 | Tags | Suche `input sm search` mit Lupe, Platzhalter „Tag suchen“ (ohne „…“), Fokus nicht automatisch; Reihenfolge: gewählte, dann **nach Häufigkeit**; max. 40; Tag-Icon subtle davor; Hinweis „Mehrere = Rezept hat alle.“ (app.js:371-384) | Suche ohne Lupe, „Tag suchen…“, bekommt beim Öffnen den Fokus (Desktop); Reihenfolge wie im Katalog; **kein Hinweis** (`TagFilter.tsx`) | S/T/V | NEU (B) (Lupe/Platzhalter teils #227) |
| 3.9 | Zutaten | Wie Tags, „Zutat suchen“; ohne Suche **9** Zutaten **nach Häufigkeit**; Hinweis immer: „Alle weiteren über die Suche. Mehrere = Rezept enthält alle.“ | 12 Zutaten **alphabetisch** (scrollt); Hinweis „Weitere über die Suche“ nur, wenn gekürzt (`IngredientFilter.tsx:10,49`) | T/V | NEU (B) |
| 3.10 | Arbeitszeit | Zeile: Regler (Spur und Füllung in fg, dunkel) und Feld „≤ [–] min“, Präfix und Suffix **immer** sichtbar, Platzhalter „–“. Darunter drei **umrandete** `btn sm`: „15 min“ „30 min“ „60 min“, die gewählte `pressed` (graue Fläche). Hinweis „Zählt die Arbeitszeit. Rezepte ohne Angabe fallen raus.“ Zurücksetzen nur in der Fußzeile (app.js:386-392, screens.css:2343ff) | Regler grau (`sliderVariant="gray"`); Feld mit Platzhalter „Keine Grenze“, ohne ≤/min solange leer; Presets **„≤ 15 Min“** (großes M, entgegen design.md §8 „min“) als randlose Toggles; leere Platzhalterzeile unten (Popover hat Leerraum); „✕ Zurücksetzen“ als Ghost-Knopf rechts im Inhalt; **kein Hinweis** (`DurationFilter.tsx:160-230`) | S/T/F | NEU (B) |
| 3.11 | Zugriff | Unterüberschriften „Meine Rolle“, „Freigabe“: 12 px / 600 subtle. „Alle“ **ohne** Icon-Platzhalter (Label direkt nach dem Radio), Icons subtle (grau). Option „**Geteilt (nur lesen)**“ (app.js:393-410) | Überschriften 14 px muted; „Alle“ mit leerem 14-px-Platzhalter (Label eingerückt); Icons in Textfarbe; Option „**Geteilt**“ (`AccessFilter.tsx:363,461`). Die App hat zusätzlich Tooltips und Hinweise bei unmöglichen Kombinationen; README: „heutige Logik bleibt“ (ok) | T/F | NEU (B) |

## 4. Listeninhalt: Ansichten, Gruppen, Fotos

Die Zeilen und Gruppenköpfe stehen fast alle in #229. Hier nur die konkreten Abweichungen, damit #229 sie prüfen kann:

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 4.1 | Detailliert · Desktop | Flache Zeile ohne Rahmen; Meta in der Reihenfolge **Zeit, ★, „von Name“**; rechts in **einer** Zeile, vertikal mittig: Tags (max. 2, Chips), Zugriff, Punkte (app.js:150-159) | Karte mit Rahmen; ★ vor der Zeit; „von Name“ fehlt; Tags oben (bis 3, Klartext), Zugriff und Punkte darunter | S | #229, #227 |
| 4.2 | Detailliert · Handy | Meta einzeilig („1 h 30 min ★ 5,0“), rechts Zugriff und Punkte | ★ und Zeit in zwei Zeilen, Zeit „40 min + Backzeit 50 min“ | S | #229 |
| 4.3 | Kompakt · Desktop | Name, ★, Zeit (muted, **ohne** Uhr-Icon, Gesamtzeit „1 h 30 min“), dann rechts **Tags → Zugriff → Punkte**; Zeile 34 px (app.js:160-167) | Uhr-Icon und Rohtext-Zeit; rechts **Zugriff → Tags → Punkte**; Zeile 32 px | S/F | #229 (Reihenfolge rechts explizit nennen) |
| 4.4 | Kompakt · Handy | Zeit bleibt lesbar („1 h 30 min“), Name kürzt sich zuerst | Die Zeit wird auf „2…“ / „10 …“ gekürzt; Zeile 32 px | S | #229, #219 |
| 4.5 | Kacheln · Desktop | `.list-layout .cgrid`: Spalten mit min. **190 px**, Abstand 24/16 → **5 Spalten** bei 1440 (screens.css:2052) | min. 230 px, Abstand 28/20 → 4 Spalten (`RecipeListView.tsx:24`) | F | #229 („Kacheln gegen Mockup prüfen“), Wert explizit nennen |
| 4.6 | Kacheln · in einer Gruppe | Kategorie-Zeile zeigt **alle** Kategorien des Rezepts, auch die der Gruppe („● ● ● Favoriten +2“, `recipeCard` ignoriert `except`, app.js:168-176) | Die Gruppenkategorie wird ausgelassen (`recipeCategories(..., exceptCategoryId)`) | F | NEU (G), vermutlich Mockup-Ungenauigkeit: README sagt das nur für Zeilen. Owner kurz fragen |
| 4.7 | Kacheln · Handy | Meta einzeilig („1 h 30 min ★ 5,0 ⇄“) | Zeit bricht über 2–3 Zeilen um | S | #229 (Zeitformat) |
| 4.8 | Gruppenkopf | 32 px, 13 px / 600, neutraler Name, Punkt, Anzahl; „Öffnen ›“ 12 px subtle, erst bei Hover sichtbar (Desktop); eingeklappt: muted / 500; Abstand zwischen Gruppen 16 px | Name 18 px in Kategorienfarbe, ohne Punkt, „Öffnen ›“ immer sichtbar, Abstand 24 px | S | #229 |
| 4.9 | Fotos (img=1 / img=0) | Spalte mit Vorschaubildern nur, wenn Fotos da sind; Fallback-Kachel mit Besteck-Icon | Gleiche Regel (`hasDisplayableImages`) | – | ok |
| 4.10 | Flach (`group=0`) | Zeilen ohne Gruppenlinie, Punkte zeigen alle Kategorien | Wie Mockup, nur die Zeilenoptik weicht ab (4.1) | – | #229 |

## 5. Zustände

| # | Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| 5.1 | Keine Treffer | Karte (`.empty.card`) mit 44-px-Kreis und Lupe, Titel „Keine Rezepte gefunden“ (600), Text „Lockere die Filter oder such nach etwas anderem.“, `btn sm` „Filter zurücksetzen“ (app.js:515). Unter `#/states` als Variante für die Suche: „Nichts gefunden für „Lasagne““ / „Prüf die Schreibweise oder setz die Filter zurück.“ | Ohne Karte, kleines SearchX-Icon, „Keine Treffer für die aktuellen Filter.“, bei Suchtext ein Zusatzhinweis zur Zutatensuche. Konflikt: design.md §5 schreibt genau diesen Text vor, dazu „kein großes Icon“. Owner entscheiden | S/T | NEU (E), Owner |
| 5.2 | Leere Sammlung | Gibt es im Mockup nicht (für Listen nur „Leere Kategorie“) | „Noch keine Rezepte.“ mit „Neues Rezept“ (design.md §5) | – | ok (design.md) |
| 5.3 | Laden | `#/states`: Karte mit Zeilen-Skeletten (48-px-Thumb und 2 Textbalken, Shimmer) (app.js:965-969) | Einfarbige Balken `h-18` (detailliert) / `h-8` (kompakt), keine Thumb- oder Textform (`ListSkeleton.tsx:56-66`) | F | NEU (E) |
| 5.4 | Fehler | Neutrale Karte: Info-Icon im Kreis, „Rezepte konnten nicht geladen werden“, „Server nicht erreichbar.“, `btn sm` mit ↻ „Erneut versuchen“ | Rotes postxl-`Alert` (destructive), „Konnte Rezepte nicht laden“. design.md §5 verlangt postxl `Alert`. Owner entscheiden | S/T | NEU (E), Owner |
| 5.5 | FAB · Handy | 52 px, `fg`-Fläche, Schatten 0 6 20 / 22 %, 16 px über der Tab-Leiste (screens.css:2523) | 56 px (`size-14`), `bottom-20` | F | NEU (D) (Kleinigkeit), Safe-Area #220 |

---

## Vorschlag für neue Issues (je ein PR)

- **A: Sortieren und Ansicht wie im Mockup** (1.2–1.4, 1.6–1.9). `SortMenu` wird zur Menüliste (Icon links, ✓ rechts, keine Labels) mit dem Richtungs-Segment. Sortierknopf 38 px, so breit wie sein Inhalt; `vsep` zwischen Sortierung und Ansicht. Ein neues Kriterium setzt die Richtung zurück (Bewertung absteigend). Handy: Icon `sliders-horizontal`, Sheet mit „Sortieren nach“ (Menüliste und Richtungs-Segment) sowie „Ansicht“ und „Gliederung“ als Segmente mit Text; passt ohne Scrollen. Baut auf dem Segment-Look aus #227 auf.
- **B: Inhalte der Filter-Popover** (3.1–3.3, 3.6–3.11). Fußzeile „Zurücksetzen“ in jedem aktiven Popover. Hinweistexte für Kategorie, Tags, Zutaten und Arbeitszeit. Tags und Zutaten nach Häufigkeit sortiert (über die geladenen Rezepte, sonst Katalog), Zutaten auf 9 begrenzt, Suche mit Lupe und ohne „…“. Arbeitszeit: Presets „15 min“ als umrandete Knöpfe, Feld „≤ – min“, Regler in fg, ohne Leerzeile. Zugriff: „Geteilt (nur lesen)“, kein Platzhalter bei „Alle“, Überschriften 12/600. Checkbox und Radio im Mockup-Look (gefüllt), Zeilentext muted, gewählt fg/500.
- **C: Filterknopf-Zustände und Trefferzeile** (2.2–2.6). Größe und Schrift 30 px, 13/500, Abstand 6. Aktiv: Fläche `surface`, `border-strong`, Label subtle, Wert 600, ✕ mit Trennlinie im selben Rahmen. Geöffnet: Rahmen `fg-subtle`. Der Link „Alle Filter zurücksetzen“ im `link-btn`-Stil, ohne „·“, nur bei Facetten (nicht bei reiner Suche). Am besten zusammen mit oder direkt nach #227.
- **D: Listenkopf scrollt mit** (1.12, 5.5). Suche, Filterleiste und Trefferzahl sind nicht mehr sticky, nur die Kopfzeile und die Gruppenköpfe (top 60/56, siehe #229). Die Messung `--list-sticky-top` entfällt dann. FAB auf 52 px.
- **E: Leer-, Fehler- und Ladezustände der Liste wie im Mockup** (5.1, 5.3, 5.4). Bei 5.1 und 5.4 vorher die Owner fragen, weil sie design.md §5 widersprechen. Das Skelett (5.3) geht ohne Rückfrage.
- **F: Sheet-Kopf und Filter-Sheet-Fuß auf dem Handy** (3.4, 3.5). Titel linksbündig 16/650 und ✕ als Ghost-Button in `BottomSheet`/`ResponsivePanel`; wirkt auf alle Sheets, der Griff bleibt laut §7. „Zurücksetzen“ und „Anzeigen“ im Fuß nur nach Owner-Entscheidung, weil §7 „nur Anzeigen“ sagt.
- **G (klein, optional): Kacheln** (4.5, 4.6). Spaltenbreite min. 190 px, Abstände 24/16. Ob die Gruppenkategorie in Kacheln erscheinen soll, klärt der Owner. Lässt sich auch in #229 aufnehmen.

## Hinweise zu bestehenden Issues

- **#228:** setzt pauschal 1080 px Inhaltsbreite. Die Liste ist im Mockup `.page.wide` mit 1280 px (1.11). Im Issue ergänzen, sonst wird die Liste schmaler als im Mockup.
- **#229:** sollte die Reihenfolge rechts in Kompakt (Tags → Zugriff → Punkte, 4.3), die Meta-Reihenfolge Zeit vor ★ (4.1) und die Kachel-Spaltenbreite 190 px (4.5) ausdrücklich nennen.
- **#227:** deckt Icon, Lupe und Platzhalter ab. Die Optik des aktiven Filterknopfs (2.3) und das Sortiermenü stehen nicht darin, dafür C bzw. A.
