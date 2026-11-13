# Audit „detail“: Rezept-Detail, Koch-Modus, Timer-Panel, Lightbox

Stand: App main dda7820 (http://localhost:4173, Mock-Daten) gegen Mockup (http://localhost:4174/app.html).
Geprüft: Desktop 1440×900 und Handy 390×844, hell und dunkel.
App-Rezepte: `/recipes/1` (Foto, 2 Abschnitte, Besitzer mit Editor), `/recipes/2` (Foto, feste Größe), `/recipes/7` (nur ansehen, ohne Foto, 2 Abschnitte), `/recipes/10` (ohne Kategorie, 2 Abschnitte), `/recipes/13` (ohne Foto, feste Größe, 2 Abschnitte) und eine unbekannte ID (Fehlerzustand).
Mockup: `#/detail` mit `img=1` und `img=0`, `#/detail2`, `#/cook`, `#/timer`, `lb=0` und `lb=3`.
Screenshots liegen in (lokale Screenshots, nicht im Repo) (`app-*`, `mock-*`, `st-*` = geöffnete Zustände), die Skripte in (lokale Screenshots, nicht im Repo).

Diese Owner-Entscheidungen gelten als Ausnahme und sind deshalb **keine** Abweichung (Spec `2026-11-13-detail-cook-redesign-design.md`, #206/#209/#210/#228):
- Abhaken und Wachhalten gibt es im Detail.
- Teilen fehlt (Backend #12).
- Löschen liegt im ⋯-Menü.
- Bild und Infos stehen erst ab 1100 px nebeneinander.
- Im Koch-Modus entfällt die Timer-Karte, „Dafür“ zeigt den ganzen Abschnitt, und es gibt keine Hervorhebung „für diesen Schritt“.
- Tippflächen von 40 px auf dem Handy (design.md §7).

Diese Punkte haben im Mockup kein Vorbild:
- das Kategorie-Popover bzw. -Sheet,
- das Bewertungs-Popover bzw. -Sheet,
- der Lösch-Dialog,
- der Kopie-Ablauf.

Bei diesen Punkten wird nur angeglichen, was das Mockup an gemeinsamen Bausteinen vorgibt (Sheet-Kopf usw.).

## A. Rezept-Detail

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| A1 | Detail · Kopfzeile · Desktop | Zurück-Pfeil + Brotkrume „Rezepte / Spaghetti Bolognese“ in der 60-px-Kopfzeile, rechts Aktionen, dann Timer (app.js:240-266, 661-667) | Kopfzeile nur „Rezept“; eigene Zeile „← Zurück“ + Aktionen im Inhalt (RecipeDetail.tsx:133-199) | Struktur | #228 |
| A2 | Detail · Aktionen · Desktop | Kopie = ghost-Icon, „Bearbeiten“ = Outline-Knopf mit Stift; eine Primäraktion („Kochen“) (app.js:654-660) | Kopie = umrandeter Icon-Knopf, „Bearbeiten“ = **gefüllter Primärknopf** (zwei Primäraktionen, auch dunkel), „Löschen“ als Outline-Knopf mit Text | Struktur | #228 (Bearbeiten outline, Löschen ⋯). Dass Kopie ghost statt outline ist, nennt #228 nicht ausdrücklich |
| A3 | Detail · Aktionen · Handy | Kopfzeile ohne Titel: ‹ links, rechts ghost-Icons (Stift bzw. für Betrachter Kopie) + Timer; kein Avatar | Titel „Rezept“; im Inhalt „← Zurück“, Papierkorb (Outline), Stift **gefüllt/primär** | Struktur | #228 |
| A4 | Detail · Seitenbreite | `.page` max 1080, Padding 24/32, Handy 12/16 (base.css:209, 689) | `max-w-5xl px-6 py-10` (1024 px, 40 px oben, Handy 24 px seitlich) | Layout | #228 |
| A5 | Detail · Kategorie-Chips | `.cat-chip`: 22 px, 12 px/**600**, Emoji nur wenn Symbol vorhanden, **ohne Symbol nur der Name** (app.js:116, base.css:479) | 24 px, 12 px/500, vor jedem Chip ein Anfangsbuchstaben-Feld („F Favoriten“) über `CategoryMark` (RecipeCategoryChips.tsx:150-163) | Fein | NEU |
| A6 | Detail · „+“-Chip | `.add-cat`: 22 px hoch, Padding 0 7, Radius 4 px, **gestrichelt `--border-strong`**, Icon 12 px, Text 12 px/500 muted (screens.css:382-399) | 24 px, Radius 6 px, gestrichelt in `--border` (heller), Icon 16 px, Text 14 px | Fein | NEU |
| A7 | Detail · Kategorie-Popover/Sheet geöffnet | (nicht im Mockup) Mockup-Sheets: Kopf mit Titel **links** 16 px/650 + ✕, Griff oben (screens.css:1319-1347) | Handy-Sheet: Titel zentriert, ✕ oben rechts. Desktop-Popover ohne Titel und ohne ✕ | Fein | NEU (gemeinsames BottomSheet, betrifft auch Timer und Bewertung; ggf. Listen-Audit) |
| A8 | Detail · Titel ohne Foto | `.d-noimg .d-title` 32 px, `line-height 1.15`, letter-spacing −0.025em, margin 10px 0 8px (base.css:353, screens.css:372, 431) | `text-[32px]` mit **line-height 20 px**: Zweizeilige Titel überlappen sich (`/recipes/7` Handy, Screenshot app-r7-m-dark). Kein letter-spacing | Fein (Bug) | NEU |
| A9 | Detail · Bewertung (Anzeige) | **Ein** goldener Stern + Zahl „4,5“ muted in der Meta-Zeile (`stars()`, app.js:131; README §1.8 „Bewertung mit Komma“) | Leiste mit 5 Sternen, keine Zahl (Rating.tsx:220-231). Auf dem Handy bricht die Meta-Zeile deshalb um (Sterne in eigener Zeile) | Struktur | NEU |
| A10 | Detail · Bewertung (Interaktion) | Statisch, kein Popover | Klick öffnet Popover (Desktop) bzw. Sheet (Handy) mit Durchschnitt, eigener Bewertung und Rollenlisten. Desktop: „Deine Bewertung“ bricht in w-72 zweizeilig um; Rollentitel in VERSALIEN (Mockup-Spaltentitel `.col-h`: 12/600, keine Versalien) | Verhalten / Fein | NEU (Interaktion behalten, nur der Auslöser sieht wie in A9 aus; Feinschliff im Popover) |
| A11 | Detail · Notizen | `ul.notes` **mit Aufzählungspunkten** (Marker `--fg-subtle`), padding-left 18 px, 14 px muted, mt 16 (screens.css:2402-2413) | `ul` ohne Marker (Preflight `list-none`), padding 0 | Fein | NEU (#206 sagte „ul ohne Icon“; das Mockup zeigt Punkte) |
| A12 | Detail · Tags | Graue `.tag`-Chips 22 px | Klartext/Icons ohne Chip | Struktur | #227 |
| A13 | Detail · Aktionszeile | `.d-actions` in einer Zeile mit `justify-between`: Stepper links, „Kochen“ rechts in **derselben Zeile** (screens.css:420) | Mit Abhaken + Wachhalten bricht „Kochen“ auf 1440 px **und** auf dem Handy in eine zweite Zeile (app-r1-d-light, app-r1-m-light) | Layout | NEU (Abhaken/Wachhalten bleiben laut Entscheidung 2, sollen aber z. B. als kompakte Icon-Toggles mit Tooltip in die Zeile passen) |
| A14 | Detail · Abhaken/Wachhalten | – | Uneinheitlich: „Abhaken“ 13 px, „Wachhalten“ 15 px (`text-lg`) mit eigenem Tassen-Icon. Der An-Zustand von „Abhaken“ ist nur `text-primary` und in hell kaum vom Aus-Zustand zu unterscheiden | Fein | NEU |
| A15 | Detail · Größen-Stepper | `.portions`: −/+ als `.btn sm icon` (30 px, **umrandet**, Fläche `--surface`), dazwischen „**4** Portionen“ 14 px (fett nur die Zahl), bei fester Größe „**× 1** <muted>26 cm Springform</muted>“ (app.js:618-621) | −/+ ghost ohne Rand, Zahl als Eingabefeld 16 px semibold, Größentext 16 px | Fein | NEU |
| A16 | Detail · „Kochen“ | `.btn.primary` mit chef-hat, verlinkt auf `#/cook` | Optisch ok. Der Link zeigt heute auf `/recipes/:id/cook` → **NotFound**, weil die Route fehlt | Verhalten | #209 |
| A17 | Detail · Abschnittstitel | 19 px/650, nur bei >1 Abschnitt mit Namen (screens.css:446) | `font-display text-2xl` (26 px), auch bei nur einem Abschnitt | Fein | #207 |
| A18 | Detail · Spalten | `2fr 3fr`, Abstand 40, Spaltentitel „Zutaten“/„Zubereitung“ `.col-h` | `1fr 1.55fr` ab md, keine Spaltentitel | Layout | #207 |
| A19 | Detail · Zutaten-Tabelle | `.ings li`: **Haarlinie unter jeder Zeile** (`--divider`), Padding 7 px, Mengenspalte **84 px** rechtsbündig muted, Abstand 12 (screens.css:457-473) | Keine Trennlinien, Padding 4 px, Mengenspalte 128 px (`w-32`) | Fein | NEU (fehlt in #207) |
| A20 | Detail · Zutat mit Zusatz | Name normal, **Zusatz muted** („Salz <muted>nach Geschmack</muted>“, app.js:631) | Name und Zusatz in derselben Farbe („Zitrone Saft einer halben Zitrone“) | Fein | NEU (fehlt in #207) |
| A21 | Detail · Schritte | Nummer im Kreis 24 px (`.sn`), Spalte 28 px + 10 px Abstand, Abstand zwischen Schritten 14 px, line-height 1.55, **keine Trennlinie zwischen den Spalten** (screens.css:478-503) | „1.“, `space-y-2.5`, `leading-snug`, **`md:border-l` + `pl-5`** als vertikale Linie vor den Schritten (SectionBlock.tsx:58) | Fein | Kreise: #207. Linie entfernen, 14 px Abstand und line-height 1.55: NEU (fehlt in #207) |
| A22 | Detail · Timer-Chip im Schritt | `.t-chip`: Text gekürzt „30 Min.“ / „Std.“ (mit „ca.“), 24 px, 13 px/**600**, Rand + `--surface`, Icon 14 px (app.js:580-586, screens.css:1255-1278) | Originaltext „30 Minuten“ / „ca. 50 Minuten“, Gewicht 400, erbt 15 px | Fein / Text | NEU (#207 sagt ausdrücklich „Timer-Chips bleiben, wie sie sind“) |
| A23 | Detail · Timer-Chip **Klick** | Klick öffnet das Timer-Panel (`data-act="sheet:timer"`, app.js:585; README §3.2: Chip startet Timer „Rezept · Schritt“) | 1. Klick startet den Timer, zeigt nur einen Toast, **kein Panel**. Erst der 2. Klick öffnet das Panel (StepText.tsx:41-55) | Verhalten | NEU |
| A24 | Detail · Galerie | „Fotos“ + Anzahl, **eine Reihe** 4 (Handy 3) mit „+N“, **unter** den Abschnitten (app.js:640-650) | Alle Galeriebilder in mehreren Reihen **über** den Abschnitten, ohne Überschrift | Struktur | #208 |
| A25 | Detail · Galerie fein | `.section-h`: „Fotos“ 15 px/600, Anzahl 13 px subtle **rechtsbündig**, margin 32/12. „+N“-Overlay `rgb(0 0 0/.5)`, 20 px/600 weiß (base.css:336, screens.css:2565) | – | Fein | NEU (Ergänzung zu #208: dort nur „Überschrift mit Anzahl“) |
| A26 | Detail · Quelle | `p.muted` 13 px, margin-top 28 px, nach der Galerie (app.js:651) | `mt-16` (64 px), 15,2 px, `foreground/75` | Fein | NEU |
| A27 | Detail · Hero Handy | Bild volle Breite innerhalb von 16 px Rand | 24 px Rand (Seiten-Padding) | Layout | #228 |
| A28 | Detail · Fehlerzustand | Zustände-Screen: `.empty.card` mit Icon, Titel, muted Text, Knopf mit Icon „Erneut versuchen“ (app.js:969ff.) | Rotes `Alert` (destructive) „Rezept nicht gefunden“ + Rohtext „recipe 99999 not found“ + „Zur Liste“ | Struktur / Text | NEU (ggf. zusammen mit dem Zustände-Audit) |
| A29 | Detail · Lösch-Dialog | (nicht im Mockup) | AlertDialog, auf dem Handy mittig mit gestapelten Knöpfen. Kein Mockup-Widerspruch | – | – |
| A30 | Detail · Kopie | (nicht im Mockup, Knopf ohne Aktion) | Kein Dialog, sofortige Navigation zur Kopie. Kein Widerspruch | – | – |

## B. Lightbox (Mockup `lb=<n>`, README §2 „Detail“, screens.css:2415-2520)

| # | Zustand | Mockup | App (Lightbox.tsx) | Art | Abgedeckt |
|---|---|---|---|---|---|
| B1 | Desktop | Deckender Hintergrund `oklch(0.12 0 0)`, Kopfleiste 56 px mit „4 / 9“ **links oben** und ✕ 40 px rechts. Bild füllt die Bühne (Padding 72 px, max-height 100vh−140), Radius 6 | Halbtransparent `bg-black/70` + Blur (Seite scheint durch), Bild fest 50vw × 64vh, ✕ 56 px. Unter dem Bild Bildname groß „Bild 5“ + „4 / 9“ | Struktur | NEU (#208 sagt „Lightbox unverändert“, das Mockup zeigt sie aber restyled) |
| B2 | Desktop · Pfeile | 40-px-Knöpfe am **Bildschirmrand** (16 px), `rgb(255 255 255/.1)` | 56-px-Knöpfe bei 18vw, liegen teils über dem Bild | Layout | NEU |
| B3 | Vorschaubilder | 56 px, inaktiv opacity .55, aktiv 2 px weißer Rand, zentriert am unteren Rand (14 px Padding) | 80 px, inaktiv mit schwarzem Overlay, aktiv `ring-2`, mt-12 unter der Bildunterschrift | Fein | NEU |
| B4 | Handy | Bild **volle Breite** ohne Radius, **keine Pfeilknöpfe**, **Wischen**, Vorschaubilder 44 px | Bild 50vw (≈195 px breit), Pfeilknöpfe liegen auf dem Bild, kein Wischen (touchmove wird geschluckt), Vorschaubilder 80 px | Struktur / Verhalten | NEU |

## C. Timer-Knopf und Timer-Panel (Mockup `#/timer`, app.js:186-210, screens.css:1198-1254, README §3.2)

| # | Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| C1 | Timer-Knopf | ghost, Icon + Restzeit 13 px/600 in einer **Pille** (`--surface-2`, Radius 4) | Restzeit ohne Pille, muted. Ohne Timer nur das Icon (im Mockup nicht gezeigt) | Fein | NEU |
| C2 | Panel · Kopf | Desktop-Popover 360 px unter der Kopfzeile, Kopf „Timer“ 16 px/650 + **✕**. Handy-Sheet: Griff, Titel **links**, ✕ | Desktop 320 px, Titel ohne ✕. Handy: Titel zentriert | Fein | NEU |
| C3 | Panel · Reihenfolge | **Laufende Timer oben**, dann Spaltentitel „Neuer Timer“ und das Formular | Formular oben, Liste darunter. Kein Spaltentitel | Struktur | NEU |
| C4 | Panel · Timer-Zeile | Zeile ohne Karte, Haarlinie unten. Name 500 + **Fortschrittsbalken 3 px**, Restzeit 20 px/600 **rechts daneben**, Icons Pause/Play, Neustart, **✕**. Pausiert: Balken und Zeit subtle | Umrandete Karte, Name und Zeit untereinander, **kein Fortschrittsbalken**, Entfernen als Papierkorb, kein Pausiert-Look | Struktur | NEU |
| C5 | Panel · Neuer Timer | Name-Feld; 4 Presets als gleich breites 4er-Raster (`btn sm`); **Dauer als Textfeld „0:12:00“ + „▷ Starten“ (primär) in einer Zeile** | Presets als flex (aktives Preset gefüllt), **Scroll-Rad** `DurationPicker`, darunter „Timer starten“ in voller Breite ohne Icon | Struktur / Text | NEU |
| C6 | Panel · Hinweis | Fußtext „Timer laufen weiter, wenn du die Seite wechselst. Zeitangaben in Rezeptschritten starten direkt einen Timer.“ (`.fhint`) | fehlt | Text | NEU |
| C7 | Panel · Leer | (nicht gezeigt) | „Kein Timer läuft.“ | – | – |
| C8 | Panel · Labels | Kurze Labels | Die Schritt-Timer heißen „<voller Rezeptname> · Schritt n“ und werden abgeschnitten („Spaghetti Vegan B…“), die Schrittnummer ist dann nicht sichtbar | Fein | NEU (z. B. zweizeilig oder Name vorne kürzen) |

## D. Koch-Modus (Mockup `#/cook`, app.js:682-714, screens.css:514-612, 1072-1080). Die App hat noch keine Route.

#209 und #210 decken ab: Route ohne Shell, Kopf mit ✕/Titel/„Abschnitt · Schritt x von y“/Timer, Balken 3 px, Wake Lock, „Schritt n“, Text mit Chips, „Danach“, Fuß mit Zurück/Punkte/Weiter/Fertig, Tastatur, Zustände, Zutaten-Spalte 280/320 px, Sheet „Zutaten“, „Dafür“ und Häkchen.
**Was die Issues gegenüber dem Mockup nicht nennen:**

| # | Teil | Mockup | In #209/#210 | Art | Vorschlag |
|---|---|---|---|---|---|
| D1 | Fuß · Handy | „Zurück“ ist auf dem Handy **nur das ‹-Icon** (`span.hide-m`), „Weiter ›“ mit Text | nicht erwähnt | Struktur | in #209 ergänzen |
| D2 | Fuß · Knöpfe | Beide `.btn.lg` (48 px, 16 px). **„Weiter“ ist primär** (README §2: „Weiter“, „Fertig“ = Primäraktion), „Zurück“ outline | #209 nennt nur „Fertig“ als Primärknopf | Fein | in #209 ergänzen |
| D3 | Fuß · Punkte | 8-px-Punkte, Abstand 6. Erledigt = `--fg-subtle`, kommend = `--border`, **aktiv = 22 × 8-px-Pille in `--fg`** | nur „Punkte“ | Fein | in #209 ergänzen |
| D4 | Fuß · Rahmen | `border-top` Haarlinie, Padding 16, am unteren Rand (Seite `min-height:100vh`, flex) | nicht erwähnt (Safe Area steht in #220) | Layout | in #209 ergänzen |
| D5 | Kopf | Padding 10/16, **keine eigene Trennlinie** (der Balken trennt), Titel 600, Unterzeile 12 px subtle, ✕ ghost-Icon mit `aria-label` „Koch-Modus beenden“ | Reihenfolge ja, Maße und Label nein | Fein | in #209 ergänzen |
| D6 | Balken | Spur `--divider`, Füllung `--fg` | nur „3 px“ | Fein | in #209 ergänzen |
| D7 | Schritttext | letter-spacing −0.02em, margin 8/20. „Schritt n“ 14 px/600 subtle | Größe, Gewicht, Zeilenhöhe stehen in der Spec, letter-spacing und „Schritt n“-Stil nicht | Fein | in #209 ergänzen |
| D8 | Timer-Chip im großen Schritttext | `.cook-step .t-chip`: Höhe 1.3em, Schrift **0.8em**, vertical-align .12em (skaliert mit dem Text) | nicht erwähnt. Der heutige Chip erbt die volle Größe (34 px) | Fein | in #209 ergänzen |
| D9 | Hauptspalte Handy | Padding **28 px 20 px** (oben 28 px statt 8vh) | Spec: oben 8vh überall | Layout | Spec bzw. #209 angleichen |
| D10 | „Dafür“-Chips | `.cook-need .tag`: 30 px hoch, 14 px, Padding 0 12, graue Tag-Fläche. **Ohne Überschrift „Dafür“** | Chips ja, Größe nein. Ob es eine Überschrift gibt, bleibt offen | Fein / Text | in #210 ergänzen (README nennt das Konzept „Dafür“; das Mockup zeigt kein Label: klären) |
| D11 | Zutaten-Spalte | Spaltentitel `.col-h` „Zutaten · <Abschnitt>“, Zeilen im `.ings`-Stil (Haarlinien, 84-px-Mengenspalte), Padding 28/24, Linie `--divider` | Inhalt (Stepper + alle Abschnitte) weicht bewusst ab. Spaltentitel, Zeilenstil und Padding fehlen | Fein | in #210 ergänzen (Zeilenstil = A19) |
| D12 | Knopf „Zutaten“ (Handy) | `btn sm` mit Icon `list-checks`, **vor** dem Timer-Knopf | nur „Knopf Zutaten im Kopf“ | Fein | in #210 ergänzen |
| D13 | Timer-Chip-Klick | öffnet das Timer-Panel (wie A23) | #209 AK5: „startet einen Timer“, Panel nicht erwähnt | Verhalten | mit A23 lösen |
| D14 | Zutaten-Sheet (Handy) | Im Mockup nicht ausgeführt (Knopf ohne Aktion) | – | – | – |

## Vorschlag: NEU-Funde als Issues (je PR-groß)

1. **Detail: Kopf-Feinschliff** (A5, A6, A8, A9, A11, A13, A14, A15, A26, A10 nur Auslöser):
   - Kategorie-Chip ohne Initialfeld, 600, 22 px.
   - „+“-Chip im Mockup-Maß.
   - Titel mit line-height 1.15 (Bug bei zweizeiligen Titeln ohne Foto).
   - Bewertung als ein Stern + „4,5“ (Popover bleibt).
   - Notizen mit Punkten.
   - Aktionszeile einzeilig mit „Kochen“ rechts (Abhaken/Wachhalten kompakt, gleiche Größe, deutlicher An-Zustand).
   - Stepper mit umrandeten 30-px-Knöpfen und „**4** Portionen“.
   - Quelle 13 px muted, mt 28.
   Datei: `RecipeDetail.tsx`. Erst nach #228/#207/#208 (gleiche Datei).
2. **Ergänzung zu #207 (Abschnitte)**, als Kommentar oder Präzisierung ins offene Issue (A19, A20, A21):
   - Haarlinien je Zutat, 84-px-Mengenspalte, Padding 7.
   - Zusatz muted.
   - Keine Linie zwischen den Spalten, Schrittabstand 14, line-height 1.55.
3. **Timer-Chip: Aussehen und Klick** (A22, A23, D8, D13):
   - Kurzlabel „30 Min.“/„Std.“, 13 px/600, 24 px, `--surface`.
   - Variante im Koch-Modus in em-Größen.
   - Ein Klick startet den Timer und öffnet das Panel.
   Dateien: `StepText.tsx`, `parseDurations.ts` (Label).
4. **Timer-Panel wie Mockup** (C1–C6, C8):
   - Liste oben mit Fortschrittsbalken und Zeitspalte, ✕ statt Papierkorb, Pausiert-Look.
   - „Neuer Timer“ mit Preset-Raster und Dauer-Textfeld + „Starten“ in einer Zeile.
   - Hinweistext.
   - Popover 360 px mit Kopf + ✕.
   - Pille im Timer-Knopf.
   Dateien: `src/timers/*`.
5. **Lightbox restyled** (B1–B4):
   - Deckend dunkel, Zähler oben links, ✕ 40 px.
   - Bild füllt die Bühne, Pfeile am Rand, Vorschaubilder 56/44 px mit Opacity.
   - Handy: volle Breite, keine Pfeile, Wischen.
   Datei: `Lightbox.tsx`. #208 geht noch von „unverändert“ aus, deshalb danach umsetzen.
6. **Sheet-/Popover-Kopf wie Mockup** (A7, C2-Teil): Titel links 16 px/650 + ✕, Griff, Popover mit Titel. Gemeinsam für `ResponsivePanel`/`BottomSheet`. Mit dem Listen-/Filter-Audit abstimmen, falls dort schon erfasst.
7. **Detail-Fehlerzustand** (A28): Leerzustand-Karte mit Icon und „Erneut versuchen“/„Zur Liste“, kein roher Fehlertext. Ggf. mit dem Zustände-Audit bündeln.
8. **Präzisierungen zu #209/#210** (D1–D7, D9–D12), keine eigenen Issues, sondern Kommentare in den offenen Issues:
   - Zurück auf dem Handy nur als Icon, „Weiter“ primär, `lg`-Knöpfe.
   - Punkte mit Pille.
   - Fuß- und Kopf-Maße, Balkenfarben, letter-spacing.
   - Padding auf dem Handy 28/20.
   - „Dafür“-Chips 30 px (und die Label-Frage klären).
   - Spaltentitel „Zutaten · Abschnitt“ und Zeilenstil.
   - Icon des Zutaten-Knopfs.
