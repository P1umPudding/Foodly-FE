# Audit „shell“: Shell, Start, Kategorien, Kategorie-Seite, Timer, Profil, Zustände, Login

App main dda7820 (http://localhost:4173, Mock) gegen Mockup (http://localhost:4174/app.html). Desktop 1440 und Handy 390, hell und dunkel.
Screenshots und Skript liegen in (lokale Screenshots, nicht im Repo) (`mock-*` / `app-*`, Suffix `-d|m-light|dark`).
Dunkel: Die Tokens (bg, sidebar, cat-soft/ink, Karten) stimmen weitgehend überein. Abweichungen gibt es nur dort, wo sie auch hell auftreten, deshalb sind sie unten nicht doppelt aufgeführt.
Planer, Einkauf, Gruppen, „Heute geplant“ und die Konzept-Badges sind nicht bewertet. Laut README §1.6 und design.md §3 zeigt die Shell nur echte Ziele.
`/login` und `/register` lassen sich im Mock-Modus nicht rendern (`RedirectIfSignedIn` leitet weiter), sie sind nur aus dem Quelltext geprüft.

Legende Art: **L** = Layout/Struktur, **V** = Verhalten, **T** = Text, **F** = Fein (Abstand/Farbe/Größe)

## 1. Shell: Seitenleiste (Desktop)

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| S1 | Seitenleiste · Marke | 26-px-Symbol `brand-mark` (Kochmütze, `bg-fg`), „Foodly“ 17 px/700 (`app.js:248`, `base.css .brand/.brand-mark`) | nur Wortmarke `font-display text-xl` (20 px), kein Symbol (`Sidebar.tsx`) | L | #228 (Symbol). Schriftgröße 17/700: NEU (G7) |
| S2 | Seitenleiste · Breite | `--sidebar-w: 248px` (`base.css:9`) | `w-60` = 240 px (`AppShell.tsx SIDEBAR_WIDTH`) | F | NEU (G7) |
| S3 | Seitenleiste · Kopf „Kategorien“ | 12 px/600 in `--fg-subtle`, Padding 18/10/6, Zahnrad als schlichter Link (`.nav-label`) | `text-xs font-semibold text-muted-foreground` (dunkler), Zahnrad als 28-px-Ghost-Button mit Tooltip | F | Farbe: NEU (G7). Tippfläche: #219 |
| S4 | Seitenleiste · Kategorie-Eintrag | Punkt 8 px mit Rand `0 3px 0 4px` (`screens.css .nav-item .cat-dot`), der Text beginnt also weiter rechts | Punkt `size-2.5` (10 px) direkt am Rand, `gap-2.5` | F | NEU (G7) |
| S5 | Eingeklappt (64 px) | Zwischen Zielen und Kategorien eine 24-px-Haarlinie (`.side-c .nav-label`: 1 px, `--nav-border`, Abstand 14/8) | kein Trenner, die ganze Kopfzeile fehlt (`{!collapsed && …}`) | L | NEU (G7) |
| S6 | Eingeklappt · Tooltip Kategorie | Tooltip nur mit Name (`data-tip="${c.name}"`) | „Name (Anzahl)“ | T | NEU (G7, klein) |
| S7 | Profil-Eintrag unten | `nav-item` als **Link** auf `#/profile`, Avatar `xs` 22 px, aktiv hinterlegt auf der Profilseite (`app.js:256`) | Dropdown-Trigger mit 24-px-Avatar, öffnet das Menü (`ProfileMenu.tsx`) | V | siehe Profil P1 (Entscheidung) |

## 2. Shell: Kopfzeile, Timer-Knopf

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| K1 | Kopfzeile Desktop | 60 px, `bg` 85 % + `blur(12px)`, Padding **0 32 px**, Titel 15 px/600 (`base.css .topbar`) | `h-14` (56), deckend `bg-background`, `px-6` (24) | L/F | #228 (Höhe, Blur). Seitenpadding 32 px: NEU (G7) |
| K2 | Unterseiten (Kategorie, Kategorien) | Zurück-Chevron links, Brotkrume „<Herkunft> / Name“ mit subtilem Teil vor dem Slash, rechts Aktionen (⋯), dann Timer (`app.js:261-265`) | Kategorie: Brotkrume „Rezepte / Favoriten“ ohne Zurück-Pfeil, kein ⋯. `/categories`: nur Titel, Zurück als „← Zurück“ im Inhalt | L/V | #228 für Kategorie-Seite. **/categories nicht genannt**: NEU (G3) |
| K3 | Timer-Knopf · Timer läuft | Ghost-Knopf, Padding 0 10, 13 px/600; Restzeit in einer **Pille** (`--surface-2`, Radius 4, Padding 1/6) (`screens.css .timer-btn`) | Ghost-Knopf, Restzeit als nackter Text 14 px, muted | F | NEU (G1) |
| K4 | Timer-Knopf · kein Timer | Im Mockup laufen immer Timer, ein Leerzustand ist nicht gezeigt | nur Icon | – | kein Befund |

## 3. Shell: Handy (Kopf, Tab-Leiste, FAB, Avatar)

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| H1 | Start · Kopfzeile | `m-brand`: 24-px-Symbol und „Foodly“ 17 px/700 (`app.js:505`, `screens.css .m-brand`) | „Foodly“ `font-display text-xl`, kein Symbol | L | #228 („Handy wie Mockup“, Marke). Größe: G7 |
| H2 | Kopfzeile Handy | 56 px, Padding 0 16, Blur wie Desktop | 56 px ✓, deckend | F | #228 |
| H3 | Avatar oben rechts | `.me-btn` 40 px mit **28-px**-Avatar, `margin-right:-6px`, `--avatar-bg` | 40-px-Ziel mit **32-px**-Avatar (`size-8`) | F | NEU (G7) |
| H4 | Tab-Leiste | durchscheinend (`nav-bg` 92 % + `blur(14px)`), Icons 22 px, Label 11 px/500, inaktiv `--fg-subtle`, Abstand 3 px (`base.css .tabbar`) | deckend `bg-sidebar`, Icons 20 px, Label 12 px, inaktiv `muted-foreground`, Abstand 4 px (`TabBar.tsx`) | F | NEU (G7). Safe Area: #220 |
| H5 | FAB „+“ | 52 px, `bg-fg`, Schatten `0 6px 20px rgb(0 0 0/.22)`, Icon 24 px, Strich 2 (`screens.css .fab`) | `size-14` (56 px), `shadow-lg` | F | NEU (G7) |
| H6 | Unterseite `/categories` | Zurück-Chevron links, Titel „Kategorien“, kein Avatar | Titel ohne Zurück-Pfeil, „← Zurück“ im Inhalt | L | NEU (G3) |
| H7 | Kategorie-Seite | kein Titel, nur Zurück, ⋯ und Timer (`mobileTitle: ''`) | Brotkrume „Rezepte / Favoriten“, ⋮ im Kategorie-Kopf | L | #228, #230 |

## 4. Timer-Panel (Mockup `sheet=timer`, `#/timer`)

| # | Screen · Zustand | Mockup (`app.js:213-232`, `screens.css .trow/.tpresets/.tnew`) | App (`TimerPanel.tsx`, `TimerForm.tsx`, `TimerRow.tsx`) | Art | Abgedeckt |
|---|---|---|---|---|---|
| T1 | Panel · Reihenfolge | **oben die laufenden Timer**, darunter „Neuer Timer“ | oben das Formular, darunter die Liste | L | NEU (G1) |
| T2 | Panel · Kopf | `sheet-h`: „Timer“ 16 px/650 links, **✕-Knopf** rechts, auch im Desktop-Popover | Desktop: „Timer“ `font-semibold`, **kein ✕**. Handy: Titel **zentriert**, ✕ absolut oben rechts | L | NEU (G1). Titel zentriert im BottomSheet allgemein: G7 |
| T3 | Timer-Zeile | flache Zeile mit Haarlinie unten, Name 500, **3-px-Fortschrittsbalken** unter dem Namen, Restzeit **rechts** 20 px/600, Ghost-`sm`-Icons ⏸/▶, ↺, **✕** | umrandete Karte je Timer, Restzeit **unter** dem Namen (`font-display text-xl`), **kein Fortschrittsbalken**, Löschen mit **Mülleimer** | L | NEU (G1) |
| T4 | Timer pausiert | Restzeit und Balken in `--fg-subtle` (`.trow.paused`) | kein optischer Unterschied für „pausiert“ (blasser sind nur unbenannte Timer) | V/F | NEU (G1) |
| T5 | Neuer Timer · Kopf | Spaltenkopf „Neuer Timer“ (`col-h` 12 px/600 subtle) | keine Überschrift | T | NEU (G1) |
| T6 | Presets 5/10/15/30 | Raster mit 4 gleich breiten Spalten, `btn sm` outline, keine Aktiv-Füllung | `flex-wrap`, `size="xs"`, gewähltes Preset schwarz gefüllt | L/F | NEU (G1). Tippfläche: #219 |
| T7 | Dauer + Start | **Textfeld „0:12:00“** (h:mm:ss) und daneben primär „**▶ Starten**“ in einer Zeile | `DurationPicker` (3 Scroll-Räder) und darunter „Timer starten“ über die volle Breite, ohne Icon | L/T | NEU (G1) |
| T8 | Hinweis | Fußtext „Timer laufen weiter, wenn du die Seite wechselst. Zeitangaben in Rezeptschritten starten direkt einen Timer.“ (`fhint`) | fehlt | T | NEU (G1) |
| T9 | Popover-Maße | 360 px breit, fest unter der Kopfzeile (`top:56px; right:24px`) | `w-80` (320 px), am Knopf verankert | F | NEU (G1) |

## 5. Start (`/` gegen `#/home`)

| # | Screen · Zustand | Mockup (`app.js:458-509`, `screens.css` Home) | App (`Home.tsx`, `components/home/*`) | Art | Abgedeckt |
|---|---|---|---|---|---|
| A1 | Seitenbreite | Inhalt max. 1080 px, Padding 24/32 | `max-w-6xl` (1152), `px-6 py-10` | L | #228 |
| A2 | Datumszeile | 13 px/500, `--fg-subtle` | `text-base` (16), `muted-foreground` | F | NEU (G2) |
| A3 | Begrüßung | `page-title` 26 px/650, -0,025em (`base.css .page-title`) | `font-display text-4xl` (36 px), auch auf dem Handy | F | NEU (G2) |
| A4 | Abschnittskopf | h2 15 px/600. Link rechts 13 px/500 `--fg-muted`, Abstand 32 oben / 12 unten (`.section-h`) | h2 `text-lg` (18). Link als postxl `Button variant=link size=sm` (Vordergrundfarbe, Unterstreichung bei Hover) | F | NEU (G2) |
| A5 | Kategorie-Kacheln | randlos, `auto-fill minmax(190px)`, Symbolfeld 32 px. Handy: waagerechter Streifen 44 px | Rahmen, fest 4 Spalten (Handy 2), Symbolfeld 28 px | L | #230 |
| A6 | Kachel · Hover | `filter: brightness(.98)` | `hover:border-cat-dot` (verschwindet mit #230) | F | #230 (prüfen) |
| A7 | Rezept-Abschnitt | „**Zuletzt bearbeitet**“ mit Link „**Alle Rezepte**“, 6 Karten in 3 Spalten in der Hauptspalte (`home-grid`: 1fr + 300 px) | „**Zuletzt angesehen**“ ohne Link, 3 Spalten über die volle Breite | T/L | #196 („Zuletzt erstellt“ + Link „Alle Rezepte“). **Titel weicht von allen dreien ab**: Mockup und design.md §4 sagen „bearbeitet“, #196 „erstellt“, die App „angesehen“ (Entscheidung Daniel 12.11. im Phase-5-Plan). Klären |
| A8 | Zweispalten-Raster | rechte Spalte 300 px: „Geteilt mit dir“ (Zeilenkarte) und Einkauf (Konzept). Unter 1100 px einspaltig | keine Seitenspalte | L | Blockiert (README §5: hängt an B4–B6). Kein Issue |
| A9 | Leerzustand Start | im Mockup nicht vorhanden | `NothingToShow`-Karte mit Text, „Alle Rezepte“ (outline) und „Neues Rezept“ (primär) | – | kein Mockup. Optik siehe Z2 |
| A10 | Laden/Fehler | im Mockup nicht gezeigt (allgemein: Skelett, Fehlerkarte siehe `#/states`) | Kachel-Skelette ✓. Fehler als rote `RetryAlert` | F | siehe Z3 |

## 6. Kategorien verwalten (`/categories` gegen `#/categories`)

| # | Screen · Zustand | Mockup (`app.js:930-967`, `screens.css` Settings) | App (`Categories.tsx`, `CategoryEditDialog.tsx`, `CategoryColorPicker.tsx`, `CategoryMark.tsx`) | Art | Abgedeckt |
|---|---|---|---|---|---|
| C1 | Kopf | Zurück-Chevron in der Kopfzeile, Titel „Kategorien“. Zurück ohne Verlauf → **Profil** (`back:'profile'`, README §3.4) | „← Zurück“-Ghost-Knopf im Inhalt, Fallback `/recipes`, `h1` nur `sr-only` | L/V | NEU (G3) |
| C2 | Breite/Lage | `.narrow` max. 640 px, **linksbündig** in der 1080-px-Seite | `max-w-3xl` (768), **zentriert**, `py-10` | L | NEU (G3) |
| C3 | „Neue Kategorie“ | `btn sm` **outline** mit Plus | primärer Knopf in Normalgröße (zweite schwarze Fläche neben „Neues Rezept“) | F | NEU (G3) |
| C4 | Zeile · Griff | `grip-vertical` links (nur Desktop) zum Ziehen | kein Griff, Sortieren über das Menü „Nach oben/Nach unten“ | V | #184 (später, nicht agent-ready) |
| C5 | Zeile · Symbolfeld | `cat-mark` 32 px, Radius 6, Anfangsbuchstabe 14 px/**700** | `CategoryMark md`: 28 px, `rounded-sm` (4), `font-medium` | F | NEU (G3). Gilt für `CategoryMark` überall außer Start und Kopf (#230) |
| C6 | Zeile · Name | Text (`.t`), Zeile hat Hover-Fläche (`.row:hover`), Unterzeile 12 px subtle | Name als Link mit `hover:underline`, Unterzeile `text-sm` muted, kein Zeilen-Hover | F | NEU (G3) |
| C7 | Zeile · Aktionen | **⋯ waagerecht** (`more-horizontal`), Ghost `sm` | **⋮ senkrecht** (`EllipsisVertical`) | F | NEU (G3). Gleiches Icon im Kategorie-Kopf (Handy) |
| C8 | Liste · Trenner | Haarlinien mit 12 px Einzug (`.divided > * + *::before`), Karte mit Innenabstand (`pad-rows`) | `border-b` über die volle Breite | F | NEU (G3) |
| C9 | ⋯-Menü-Inhalt | im Mockup nicht ausgeführt | Bearbeiten, Nach oben/unten, Löschen (rot) | – | kein Befund |
| C10 | Bearbeiten · Form | **Inline-Karte** „Kategorie bearbeiten“ unter der Liste (`.cat-editor`) | Desktop: modaler `Dialog`. Handy: `BottomSheet` (design.md §7: Formulare auf dem Handy als Sheet) | L | NEU (G4). **Entscheidung nötig**: inline wie im Mockup oder Dialog/Sheet behalten (Mockup zeigt nur den Zustand, nicht den Weg dorthin) |
| C11 | Bearbeiten · Symbol | 38-px-Symbolknopf **links neben dem Namensfeld**, Hinweis „Symbol kommt aus den Tag-Symbolen. Ohne Symbol zeigt Foodly den Anfangsbuchstaben.“ | kein Symbolfeld. Label „Name“ über dem Feld | L/T | NEU (G4). Auswahl selbst blockiert durch **B11**. Anzeige des Anfangsbuchstabens ginge schon |
| C12 | Bearbeiten · Farbe | Spaltenkopf „Farbe“. **Runde** Swatches 30 px (Kern 22 px), Auswahl als 2-px-Ring in `--fg`. 13. Swatch „+“ gestrichelt rund = eigene Farbe | kein Kopf „Farbe“. **Quadratische** 40-px-Swatches `rounded-md` in 6er-Raster (2 Reihen), Auswahl per Outline. Eigene Farbe als natives `<input type=color>` mit Label „Eigene Farbe“ in eigener Zeile | L | NEU (G4) |
| C13 | Bearbeiten · Palette | 12 feste Werte inkl. Navy `#1e3a8a`, Blassgelb `#fde047`, **Grau `#78716c`** | 12 Farbtöne im 30°-Abstand mit gleicher Helligkeit, **kein Grau/Neutral** (`SUGGESTED_COLORS`) | V | NEU (G4) |
| C14 | Bearbeiten · Vorschau | Kopf „So sieht es aus“, dann **Chip**, **Symbolfeld** und **Punkt-Label** | ohne Kopf. Mini-Chip (mit 20-px-Mark) und Punkt-Label, kein eigenständiges Symbolfeld | L/T | NEU (G4) |
| C15 | Bearbeiten · Ähnlichkeit | `.warn` mit **Info-Icon**, 13 px muted, Abstand 14 | gleicher Text als `role=status` ohne Icon, 12 px | F | NEU (G4) |
| C16 | Bearbeiten · Aktionen | keine sichtbar (statisch) | Abbrechen / Speichern | – | kein Befund |
| C17 | Löschen | nicht im Mockup | `AlertDialog` „„X“ löschen?“ + Hinweis | – | kein Befund |
| C18 | Leer (keine Kategorien) | nicht gezeigt. Muster `.empty` aus `#/states` | gestrichelter Rahmen, Text, Knopf | F | siehe Z2 |
| C19 | Laden | Skelett-Zeilen (`#/states`) | 3 Skelett-Zeilen ✓ | – | ok |

## 7. Kategorie-Seite (`/categories/1` gegen `#/category`)

| # | Screen · Zustand | Mockup (`app.js:554-578`) | App (`CategoryPage.tsx`) | Art | Abgedeckt |
|---|---|---|---|---|---|
| K-1 | Kopf (Fläche, Symbol 56 px `bg-surface`, Unterzeile .75, randlos) | wie beschrieben | Rahmen, 40-px-Symbol ohne Feld, Unterzeile ohne Opacity | L | #230 |
| K-2 | Titel im Kopf | `page-title` 26/650 in `cat-ink` | `font-display text-2xl` (24) | F | NEU (G2) |
| K-3 | „Bearbeiten“ | Desktop: `btn sm` outline mit Stift. Handy: entfällt (⋯ oben) | Desktop: outline in Normalgröße ✓ (Höhe 36 statt sm). Handy: ⋮ im Kopf | F/L | #230/#228 |
| K-4 | ⋯ in der Kopfzeile | `more-horizontal` (Desktop und Handy) | fehlt | L | #228 |
| K-5 | Suche | Lupe, Platzhalter „Rezept oder Zutat suchen“ | ohne Lupe, Platzhalter „**Suchen…**“: die Seite übergibt `placeholder` selbst (`CategoryPage.tsx`) | T | #227 (Achtung: das Issue nennt `SearchInput`, die Kategorie-Seite überschreibt den Platzhalter) |
| K-6 | Optionen-Knopf Handy | `sliders-horizontal` (`app.js:430`) | `ArrowUpDown`-Icon (`MobileListOptions`) | F | NEU (Liste/G7, vermutlich auch im Listen-Audit) |
| K-7 | Zeilen, Segment-Umschalter | siehe Liste | – | – | #227/#229 |
| K-8 | Leere Kategorie | `.empty`-Karte: Kreis-Icon 44 px (Ordner), Titel **fett** „Noch nichts in „Sommer““, darunter muted „Öffne ein Rezept und füg es über „+ Kategorie“ hinzu.“, **kein Knopf** (`app.js:979`) | ohne Karte: kleines blasses Ordner-Icon, ein Satz „Noch nichts in „X“. Öffne ein Rezept und füg es über „+“ hinzu.“ und Knopf „Zu den Rezepten“ | L/T | NEU (G5) |
| K-9 | Keine Treffer (Suche) | `.empty`-Karte, Lupe im Kreis, Titel „Nichts gefunden für „Lasagne““, muted „Prüf die Schreibweise …“, Knopf | `SearchX` klein, „Keine Treffer.“, „Suche leeren“ | L/T | NEU (G5) |
| K-10 | Nicht gefunden | nicht im Mockup | eigener Text mit Knopf | – | kein Befund |

## 8. Profil & Einstellungen (`#/profile` gegen Profil-Menü)

| # | Screen · Zustand | Mockup (`app.js:913-928`) | App (`ProfileMenu.tsx`, `ThemeMenu.tsx`) | Art | Abgedeckt |
|---|---|---|---|---|---|
| P1 | Profil als Seite | eigene Seite: Kopf mit 56-px-Avatar, Name 22 px, „42 Rezepte · 2 Gruppen“. Karten „Darstellung“ (Design: Segment Hell/Dunkel/System), „Kochen“ (Schalter „Bildschirm wach halten“, „Timer-Ton“), Offline (Konzept), Liste Kategorien › / **Abmelden** (rot). Handy-Titel „Profil“ | **Dropdown-Menü**: Name, Kategorien, Theme ▸ (Hell/Dunkel/System), Abmelden (nur REST) | L/V | NEU (G6). **Entscheidung nötig**: README §5 / design.md §3 (R3) sagen „Dropdown, bis es mehr Einstellungen gibt (z. B. Kategorien verwalten)“. Diese Bedingung ist mit `/categories` erfüllt |
| P2 | Theme-Eintrag | Bezeichnung „**Design**“ unter „Darstellung“ | „**Theme**“ (englisch, `ThemeSubmenu`) | T | NEU (G6) |
| P3 | Wake-Lock / Timer-Ton | als Einstellungen im Profil | Wake-Lock nur auf der Rezeptseite, kein Timer-Ton-Schalter (design.md §3 nennt Wake-Lock im Menü, steht dort aber nicht) | V | NEU (G6) |
| P4 | Abmelden | rot (`danger`), letzte Zeile | normaler Menüeintrag mit Icon. Im Mock ausgeblendet | F | NEU (G6) |
| P5 | Avatar-Stil | `--avatar-bg` oklch .92, Text `--fg-muted` 12/600 | postxl `AvatarFallback` (`bg-muted`, `text-xs font-semibold`) | F | kein Befund (gleichwertig) |

## 9. Zustände (`#/states` gegen App-Muster)

| # | Muster | Mockup (`app.js:969-987`, `screens.css .empty/.banner/.skel`) | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| Z1 | Verbindung verloren | ruhiges graues Banner oben (`.banner`, `cloud-off`, Text, „Erneut versuchen“) | gibt es nicht (`ConnectionDot` unbenutzt, misst nur den Socket) | V | NEU (G5, braucht Online-Erkennung) |
| Z2 | Leer / Keine Treffer | `.empty` **in einer Karte**, zentriert, Padding 28, Icon im 44-px-Kreis `surface-2`, Titel 600, muted Unterzeile 13 px, optional `btn sm` | uneinheitlich: Kategorie-Seite (Icon ohne Kreis, kein Titel), `/categories` (gestrichelter Rahmen), Start (`Card` linksbündig mit 2 Knöpfen) | L | NEU (G5). **Widerspruch** zu design.md §5 („Kein großes Icon“) → Owner klären |
| Z3 | Fehler | **neutrale** `.empty`-Karte, Info-Icon im Kreis, Titel „Rezepte konnten nicht geladen werden“, muted Meldung, Knopf „↺ Erneut versuchen“ | `RetryAlert`: **rote** `Alert variant=destructive`, Titel „Konnte „X“ nicht laden“, Knopf ohne Icon | L/F | NEU (G5). **Widerspruch** zu design.md §5 („postxl Alert inline“) → klären |
| Z4 | Laden | Skelett mit **Shimmer**-Verlauf (`.skel`, 1,4 s) in der Form des Inhalts | postxl `Skeleton` (Pulse) in Inhaltsform ✓ | F | NEU (G5, klein) |
| Z5 | Farb-Stresstest | Navy/Blassgelb/Schwarz in Mark/Chip/Label lesbar | Util rechnet gleich (ADR 0002). Neutrale Farben sind im Picker aber nicht wählbar (C13) | – | siehe C13 |

## 10. Login / Registrierung

Das Mockup hat keine Auth-Seiten. Geprüft ist nur die Konsistenz mit Shell und Tokens (`AuthCard.tsx`):

| # | Punkt | Mockup-Regel | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| L1 | Marke | Symbol + „Foodly“ 17/700 (wie Seitenleiste/`m-brand`) | „Foodly“ als kleiner muted Text über dem Titel | F | NEU (G7) |
| L2 | Titel | `page-title` 26/650 | `font-display text-2xl` (24) | F | NEU (G2) |
| L3 | Karte | `.card` Haarlinie, Radius 8 | `rounded-lg border bg-card` ✓ | – | ok |
| L4 | Tippflächen | – | Knopf 36, Link 16 hoch | – | #219 |

---

## NEU-Befunde gruppiert (Vorschlag: je Gruppe ein PR-großes Issue)

- **G1 · Timer-Panel und Timer-Knopf wie Mockup** (T1–T9, K3): Liste oben, Zeile mit Fortschrittsbalken, Restzeit rechts und ✕ statt Mülleimer, „pausiert“ subtil, „Neuer Timer“ mit 4er-Preset-Raster, Dauer-Textfeld + „▶ Starten“ in einer Zeile, Hinweistext, Kopf mit ✕ im Popover, 360 px, Restzeit-Pille im Knopf. Dateien: `src/timers/*`, eventuell `DurationPicker` ersetzen. Offene Frage: Scroll-Räder gegen Textfeld (Eingabe „0:12:00“ braucht Parser/Validierung).
- **G2 · Seitentitel und Abschnittsköpfe** (A2–A4, K-2, L2): eine gemeinsame `PageTitle` (26/650) und ein `SectionHeader` (h2 15/600, Link 13/500 muted), Datumszeile 13/500 subtle. Betrifft Start, Kategorie-Kopf, Auth und NotFound. Klein, berührt aber Tests mit `font-display`.
- **G3 · `/categories` als Unterseite wie Mockup** (C1–C3, C5–C8, H6, K2 für /categories): Zurück-Pfeil und Titel in der Kopfzeile (Fallback Profil bzw. Start, solange es keine Profilseite gibt), „← Zurück“ im Inhalt entfernen, 640 px linksbündig, „Neue Kategorie“ outline sm, `CategoryMark md` 32 px/r6/700, ⋯ waagerecht (auch Kategorie-Kopf Handy), eingezogene Trenner und Zeilen-Hover. Hängt am Kopfzeilen-Slot aus #228 → danach schneiden oder in #228 ergänzen.
- **G4 · Kategorie-Formular wie Mockup-Editor** (C10–C15): Symbolfeld neben dem Namen (zeigt vorerst den Anfangsbuchstaben, Auswahl wartet auf B11) + Hinweis, Kopf „Farbe“, runde Swatches mit Ring, „+“-Swatch für eigene Farbe statt nativem Feld in eigener Zeile, Palette mit Neutral/Grau (Mockup-Werte), Vorschau „So sieht es aus“ (Chip, Mark, Punkt-Label), Warnung mit Info-Icon. Vorher entscheiden: inline (Mockup) oder Dialog/Sheet.
- **G5 · Zustands-Bausteine** (Z1–Z4, K-8, K-9, C18, A9/A10): ein `EmptyState` (Karte, Icon-Kreis, Titel, Text, optionale Aktion) für leere Kategorie, Keine Treffer, leeres `/categories` und Start-Leerzustand. Fehler als neutrale Karte mit „↺ Erneut versuchen“. Shimmer-Skelett. Offline-Banner als eigener Teil (eventuell eigenes Issue, braucht `navigator.onLine` bzw. Fehlerklassifikation). **Widerspricht design.md §5**: erst Owner-Entscheidung, dann design.md anpassen.
- **G6 · Profil & Einstellungen** (P1–P4, S7): Owner-Entscheidung „Profilseite jetzt“ (Bedingung aus README §5 erfüllt). Dann `/profile` mit Kopf, Design-Segment, Wake-Lock und Timer-Ton (falls es den gibt), Link Kategorien, Abmelden rot. Avatar unten links und Avatar auf dem Handy führen dorthin. Fallback-Elternseite von `/categories` = Profil. Minimal ohne Seite: „Theme“ → „Design“.
- **G7 · Shell-Feinschliff, der nicht in #228 steht** (S1-Schrift, S2–S6, K1-Padding, H3–H5, T2-Sheet-Titel, K-6, L1): Seitenleiste 248 px, Marke 17/700, Kategorien-Kopf in subtle, Punkt-Einzug, Trennlinie im eingeklappten Zustand, Tooltip ohne Anzahl, Kopfzeilen-Padding 32 px, Avatar 28 px, Tab-Leiste durchscheinend mit 22-px-Icons und 11-px-Labels, FAB 52 px mit Mockup-Schatten, `BottomSheet`-Titel linksbündig 16/650, Optionen-Icon `sliders-horizontal`, Marke auf Login/Registrierung. Am besten nach #228 als Folge-PR (gleiche Dateien).

## Zu klären (Owner)
1. Start: „Zuletzt bearbeitet“ (Mockup, design.md §4), „Zuletzt erstellt“ (#196) oder „Zuletzt angesehen“ (App, D4)? Nebeneinander oder ersetzen?
2. Zustände: Mockup (Icon-Kreis, neutrale Fehlerkarte) gegen design.md §5 (kein großes Icon, destruktiver Alert).
3. Profil: eigene Seite jetzt (Mockup) oder Dropdown behalten (R3)?
4. Kategorie bearbeiten: inline wie im Mockup oder Dialog/Sheet?
5. Timer-Dauer: Textfeld (Mockup) statt Scroll-Räder?
