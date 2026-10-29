# Foodly Redesign „Ruhig“ (Stand 29.10.2026, Runde 2)

Das finale Design ist **„Ruhig“**. Aus „Bildstark“ sind zwei Dinge übernommen: die **Kacheln** als dritte Ansicht der
Rezeptliste und die **Startseite** mit großen Bildkarten. Runde 2 setzt Koljas Feedback vom 29.10. um (Abschnitt 3), inklusive der neuen Filterleiste.

**Ansehen:** `index.html` im Browser öffnen. Umschalter für Hell/Dunkel, mit/ohne Fotos, Desktop/Handy, Listen-Ansicht
und Screen. Alles ist klickbar: Ansicht, Sortierung, Filter (filtern wirklich), Gruppen einklappen, Seitenleiste, Timer.
Die Rahmen laden ihren Inhalt per `srcdoc`, weil die Plattform das Einbetten ihrer Seiten per Header verbietet (Firefox).
`app.html` geht auch einzeln, z. B. `app.html?theme=dark&view=tiles#/list`.

Fotos: frei lizenziert (Wikimedia Commons), Nachweise in `img/CREDITS.md`. Nur für die Mockups.
Die Übersichtsbilder in `screens/` sind Stand Runde 1.

---

## 1. Grundregeln

### 1.1 Farbe kommt nur aus Kategorien
- Die Oberfläche ist **neutral** (Graustufen). Es gibt **keine Akzentfarbe**.
- Die **Primäraktion** ist neutral invertiert: fast-schwarz auf hell, fast-weiß auf dunkel („Neues Rezept“, „Kochen“, „Weiter“, „Fertig“).
  Höchstens eine Primäraktion pro Screen.
- Ausnahme Bewertungssterne: bleiben gold (`--star`), weil Gold als „Bewertung“ universell gelesen wird. Sonst keine
  Farbe außerhalb von Kategorien.
- Fokus-Ring, Auswahl, Fortschritt, Toggles: neutral (Vordergrundfarbe).

### 1.2 Kategorien sind persönliche Sammlungen (0 bis n pro Rezept)
Eine Kategorie gehört einem Nutzer und enthält Rezepte. Ein Rezept hat deshalb **keine eigene Farbe**: Es kann in keiner,
einer oder mehreren Kategorien liegen, und jeder Nutzer sieht es anders. Daraus folgt:

| Wo | Darstellung |
|---|---|
| Rezept in Liste/Raster | **Farbpunkte** (max. 3, dann „+n“), Name der Kategorie neutral. 0 Kategorien: nichts. |
| Rezept-Detail | **Kategorie-Chips** (getönt, mit Symbol) + gestrichelter „+“-Chip zum Hinzufügen/Entfernen. 0 Kategorien: „+ Zu Kategorie hinzufügen“. |
| Eine Kategorie im Fokus | **Getönte Fläche** erlaubt: Kachel auf der Startseite, Kopf der Kategorie-Ansicht. Nur dort. |
| Navigation | Punkt + Name + Anzahl in der Seitenleiste. |
| Gruppierte Liste | Gruppenkopf mit Punkt; ein Rezept in mehreren Kategorien erscheint in jeder Gruppe; „Ohne Kategorie“ zuletzt. |

Nie: ein Rezept-Kopf, eine Karte oder ein Label in „der“ Kategoriefarbe eines Rezepts.

### 1.3 Farb-Pipeline (jede Nutzerfarbe wird lesbar)
Der Nutzer wählt **eine** Farbe. Daraus entstehen fünf Rollen. Helligkeit ist pro Theme fest, Sättigung gedeckelt, Farbton bleibt:

| Rolle | Einsatz | Hell L / max C | Dunkel L / max C |
|---|---|---|---|
| `dot` | Punkte, Swatches | 0,62 / 0,17 | 0,70 / 0,15 |
| `soft` | Chip-, Kachel-, Kopf-Fläche | 0,955 / 0,035 | 0,27 / 0,045 |
| `ink` | Text/Symbol auf `soft` | 0,46 / 0,13 | 0,86 / 0,10 |
| `line` | Linien, Rahmen | 0,84 / 0,08 | 0,42 / 0,09 |
| `solid` | (Reserve, z. B. Grafiken) | 0,60 / 0,15 | 0,70 / 0,14 |

Werte in OKLCH. Nachgerechnet mit 14 Testfarben, darunter Navy, Blassgelb, Schwarz, Weiß und Neongrün:
- Chip-Text (`ink` auf `soft`): mindestens 6,0:1 (hell) bzw. 9,6:1 (dunkel). Das erfüllt WCAG AA für normalen Text.
- Punkte gegen den Hintergrund: mindestens 3,3:1 (hell) bzw. 6,7:1 (dunkel). Das erfüllt WCAG für Grafiken.

Umsetzung (Lead-Empfehlung): **einmal in TypeScript berechnen** (Util in `src/lib`, testbar), Ergebnis als CSS-Variablen
pro Kategorie setzen (`--cat-dot`, `--cat-soft`, `--cat-ink`, `--cat-line`). Keine CSS Relative Color Syntax in der App,
wegen älterer WebViews (Capacitor). Die Mockups nutzen sie nur der Einfachheit halber.
Backend-Overrides `colorLight`/`colorDark`, falls gesetzt, gehen vor den berechneten Wert.

Nebenwirkung: Weil die Helligkeit angeglichen wird, sehen Navy und Hellblau sich ähnlich. Deshalb bietet die Farbwahl
12 im Farbton gut verteilte Vorschläge. Eine eigene Farbe ist möglich, und Foodly warnt, wenn sie einer vorhandenen
Kategorie im Farbton zu nahe kommt (unter etwa 20°). Schwarz, Weiß und Grau ergeben eine neutrale graue Kategorie.

### 1.4 Kategorie-Symbol
- Ein Symbol-Slot pro Kategorie. Quelle: Tag-Symbol (Emoji oder SVG), siehe offene Backend-Frage **B11**
  (`UserCategory.icon: TagId | null`). Kein Freitext-Feld.
- Ohne Symbol zeigt der Slot den **Anfangsbuchstaben** in `ink` auf `soft`.
- Emojis fügen sich in beiden Entwürfen gut ein, solange sie klein bleiben (14 bis 28 px) und auf `soft` oder neutraler Fläche stehen.
  Eigene Icons sind nicht nötig.

### 1.5 Fotos
- Mit Foto: Liste mit 48-px-Vorschaubild, Detail mit 4:3-Bild neben dem Text.
- Ohne Fotos (heute, B1): **keine Platzhalter-Wand.** Die Vorschaubild-Spalte entfällt komplett, solange es keine Fotos gibt.
  Ein einzelnes Rezept ohne Foto zwischen Rezepten mit Foto bekommt einen neutralen grauen Platzhalter mit Besteck-Symbol.
  Im Detail ohne Foto füllt der Text-Kopf die Breite, ohne leeren Hero.
- Kachel ohne Foto: ruhige **Typo-Kachel** (Rezeptname groß in Grau). Kein Kategorie-Farbton, kein Fake-Bild.

### 1.6 Struktur und Navigation
- **Desktop/Tablet (ab 761 px):** linke Seitenleiste mit „Neues Rezept“ (primär), Start, Rezepte, Planer, Einkauf, Gruppen,
  dann „Kategorien“ (Punkt, Name, Anzahl), unten Profil. Sie lässt sich oben rechts auf eine 64-px-Icon-Leiste
  **einklappen** (Tooltips statt Labels; Einstellung wird gemerkt). Oben eine schmale Kopfzeile mit Titel/Breadcrumb,
  Seitenaktionen und dem **Timer-Knopf**.
- **Handy:** keine Seitenleiste, stattdessen Tab-Leiste unten (5 Ziele, Icon + Label). Kopfzeile mit Titel, Aktionen und
  Timer-Knopf; „+“ (neues Rezept) oben rechts auf Start und Rezepte. **Zur Kategorie-Seite** kommt man über die
  Kategorie-Kacheln auf Start, „Öffnen ›“ an jeder Gruppe der Liste und `›` im Kategorie-Filter.
- Planer, Einkauf, Gruppen sind laut Plan noch nicht dran: Sie sind als **Konzept** markiert und nur skizziert.
- **Koch-Modus:** Vollbild ohne Navigation. Oben Schließen, Titel und Schritt x von y, darunter ein Fortschrittsbalken.
  Der Schritt steht groß (Desktop 34 px, Handy 26 px). Darunter „Dafür“-Zutaten, laufende Timer und „Danach“ als Vorschau.
  Unten Zurück, Punkte und Weiter. Auf dem Desktop stehen die Zutaten links mit Markierung, auf dem Handy hinter dem Knopf „Zutaten“.

### 1.7 Zustände
Lade-Skelette in der Form des Inhalts. „Keine Treffer“ mit „Filter zurücksetzen“, leere Kategorie mit Hinweis, Fehler mit
„Erneut versuchen“, Verbindungsverlust als ruhiges Banner oben. Siehe Screen „Zustände“.

### 1.8 Text und Ton
Kurz, Du-Form, keine Ausrufezeichen. Zahlen tabellarisch (`tabular-nums`), Zeiten als „45 min“ / „1 h 30 min“,
Bewertung mit Komma („4,5“).

---

## 2. Gestaltung „Ruhig“

Werkzeughaft, ruhig, dicht. Orientiert an Linear und Things. Die Liste steht im Mittelpunkt, Farbe gibt es nur als Signal.

- **Flächen:** Hintergrund fast weiß bzw. neutrales Dunkelgrau (kein reines Schwarz), Karten mit Haarlinie, keine Schatten
  (nur Sheets und Popover haben einen weichen Schatten).
- **Radien, genau drei:** 4 px (Chips, Tags, Checkboxen, Badges), 6 px (**jedes** Bedienelement: Inputs, Textareas,
  Buttons, Zeilen, Navigation), 8 px (Karten, Fotos, Sheets). Verschachtelt gilt außen = innen + Abstand
  (Segment-Schalter: 6 + 2 = 8). Rund nur Avatare, Punkte, Schrittnummern, Schalter. Zutaten- und Schritt-Felder haben
  damit denselben Radius.
- **Trennlinien** in Karten sind eigene Haarlinien mit 12 px Einzug, nie `border-top` auf einer abgerundeten Zeile
  (das war der Fehler im Profil: die Linie bog sich an den Enden hoch).
- **Schrift:** Inter. 14 px Text (Handy 15), Seitentitel 26 px / 650, Abschnittstitel 15 px / 600, Zutaten/Schritte 15 px.
- **Start:** Kategorie-Kacheln (getönt), „Heute geplant“ als große Bildkarten mit Titel auf dem Foto (Desktop, 16:9);
  auf dem Handy so groß wie die Karten von „Zuletzt bearbeitet“ (2 Spalten, 4:3). „Zuletzt bearbeitet“ als Kacheln,
  rechts „Geteilt mit dir“ und Einkauf.
- **Detail:** Bild links, Infos rechts (Desktop), Abschnitte mit Zutaten (2/5) und Schritten (3/5). Portionen-Rezept:
  Stepper über die Anzahl. Rezept mit fester Größe (z. B. „26 cm Springform“, `sizeNumber = null`): Stepper über den
  Faktor ×¼ … ×2.

### Tokens (Namen wie in `src/styles/theme.css`)

| Token | Hell | Dunkel |
|---|---|---|
| `--background` | `oklch(0.985 0 0)` | `oklch(0.17 0 0)` |
| `--card`, `--popover` | `#fff` | `oklch(0.205 0 0)` |
| `--foreground` | `oklch(0.2 0 0)` | `oklch(0.95 0 0)` |
| `--muted-foreground` | `oklch(0.47 0 0)` | `oklch(0.72 0 0)` |
| `--muted`, `--secondary` | `oklch(0.965 0 0)` | `oklch(0.235 0 0)` |
| `--accent` (Hover) | `oklch(0.955 0 0)` | `oklch(0.235 0 0)` |
| `--border`, `--input` | `oklch(0.91 0 0)` | `oklch(0.29 0 0)` |
| `--primary` | = `--foreground` | = `--foreground` |
| `--primary-foreground` | = `--background` | = `--background` |
| `--ring` | `oklch(0.2 0 0 / 0.35)` | `oklch(0.95 0 0 / 0.35)` |
| `--sidebar` | `oklch(0.975 0 0)` | `oklch(0.155 0 0)` |
| `--star` | `oklch(0.78 0.15 75)` | `oklch(0.82 0.14 80)` |
| `--radius` | `0.375rem` (6 px); Tailwind `rounded-sm` 4, `rounded-md` 6, `rounded-lg` 8 | |
| `--font-sans` | `Inter, system-ui, …` | |

Text-Skala: Basis 14 px statt heute 13 px (Lesbarkeit beim Kochen); Handy 15 px.

---

## 3. Runde 2: was sich geändert hat

### 3.1 Rezeptliste: alle Funktionen von heute, Filter neu gedacht

Funktional 1:1 wie `ListState` heute (`src/list/state.ts`), die Bedienung ist neu:

- **Zeile 1:** Suche (auf dem Desktop steht der Cursor beim Öffnen schon drin, ohne Scroll-Sprung; auf dem Handy nicht, sonst klappt die Tastatur auf), daneben Sortierung und Ansicht. **Sortieren** ist ein Knopf
  (Richtungs-Icon + Kriterium, z. B. „↑ Name ▾“). Das Menü enthält die vier Kriterien und die Richtung
  („A → Z / Z → A“, „Kürzeste/Längste zuerst“, „Beste/Schlechteste zuerst“). Einen extra Richtungsknopf gibt es nicht.
  Daneben die Ansicht, geordnet von dicht zu luftig: Kompakt, Detailliert (**Standard**), Kacheln, und die Gliederung (Nach Kategorie / Einfache Liste).
- **Zeile 2: Filterleiste** statt Filter-Spalte. Ein Knopf je Filter: `Kategorie`, `Tags`, `Zutaten`, `Arbeitszeit`,
  `Zugriff`. Ein aktiver Filter zeigt seinen Wert im Knopf („Tags: Vegetarisch +1“) und hat ein eigenes ✕. Eine
  zusätzliche Chip-Zeile gibt es nicht mehr. Die Liste bekommt die volle Breite.
- **Popover je Filter** (Handy: Sheet mit „x Rezepte anzeigen“):
  - Kategorie: Checkbox-Liste mit Farbpunkt und Anzahl, „Ohne Kategorie“ zuerst; mehrere = ODER. `›` öffnet die
    Kategorie-Seite.
  - Tags, Zutaten: Suche + Checkbox-Liste mit Trefferzahl, ausgewählte oben, dann die häufigsten; mehrere = UND.
    Bei Zutaten nur die häufigsten, den Rest über die Suche, statt einer Chip-Wand.
  - Arbeitszeit: Beliebig, ≤ 15, ≤ 30, ≤ 60 oder „Höchstens … min“. Kein Regler mehr (heute: Regler, Zahl und Presets
    für einen Wert).
  - Zugriff: „Meine Rolle“ (Alle, Besitzer, Bearbeiter, Betrachter) und „Freigabe“ (Alle, Privat, Geteilt,
    Kollaborativ) als Optionsliste. Die heutige Logik für unmögliche Kombinationen bleibt.
- **Zeile 3:** „5 von 14 Rezepten“ und „Alle Filter zurücksetzen“.
- **Handy:** Suche + ein Knopf für Sortieren & Ansicht (Sheet); die Filterleiste scrollt seitlich.
- Gruppen einklappbar, „Ohne Kategorie“ zuerst und eingeklappt, Kopf klebt beim Scrollen (wie heute).
- Rolle/Freigabe-Icons in der Zeile nur, wenn sie etwas sagen (bearbeiten/ansehen, geteilt/kollaborativ).
  Ein eigenes privates Rezept bekommt kein Icon.
- Komponenten: postxl `Popover` + `Command` (Suche/Liste) bzw. `Sheet` auf dem Handy, `Checkbox`, `RadioGroup`.

- **Farbige Linie entlang der Gruppe:** Ja, Kolja hat recht. In langen Listen sagt die 2-px-Linie in Kategoriefarbe,
  wo man ist. Die Gruppe „Ohne Kategorie“ hat eine graue Linie. Innerhalb einer Gruppe zeigt die Zeile nur die
  *anderen* Kategorien als Punkte, die eigene ist ja schon die Linie.
- Die Kategorie-Seite nutzt dieselbe Leiste ohne Filter und Gliederung.

### 3.2 Timer ohne Koch-Modus

- **Timer-Knopf** in jeder Kopfzeile (auch im Koch-Modus), zeigt den nächsten ablaufenden Timer („18:42“).
  Öffnet auf dem Desktop ein Popover, auf dem Handy ein Sheet: laufende Timer (Pause/Weiter, Neustart, Entfernen,
  Fortschritt) und „Neuer Timer“ mit Name (optional), 5/10/15/30 min oder eigener Dauer. Entspricht dem heutigen
  `TimerPanel`, nur sichtbarer.
- **Zeitangaben in Schritten** („30 Minuten“, „ca. 2 Stunden“, „5–6 Minuten“) werden zu antippbaren Timer-Chips, im
  Detail wie im Koch-Modus. Der Timer heißt dann „Rezept · Schritt“.

### 3.3 Editor: alle Felder, weniger Felder auf einmal

Alle Felder aus `Draft` sind drin: Titel, Arbeitszeit, Gesamtzeit, Größe (Portionen **oder** Freitext), Tags, Abschnitte
(Name optional), Zutaten (Präfix, Menge, Einheit, Zutat aus Katalog oder Freitext, Zusatz), Schritte, Notizen (mehrere),
Bilder (Hauptbild + Galerie), Quelle. Vereinfacht wird so:

- **Präfix steckt im Mengenfeld:** „ca. 800“ wird zu Präfix „ca.“ + Menge „800“ (alles vor der ersten Zahl). „1–2“ und
  „½“ bleiben Menge. Kein eigenes Präfix-Feld mehr.
- **Zusatz steckt im Zutatenfeld:** „Salz, nach Geschmack“ wird zu Zutat „Salz“ + Zusatz „nach Geschmack“.
  (Der Draft verwirft heute den Zusatz, sobald eine Katalog-Zutat gewählt ist, das muss sich dafür ändern.)
- **Größe als Umschalter** Portionen/Freitext mit einem Satz Erklärung: Portionen → beim Kochen Anzahl wählen;
  Freitext (z. B. „26 cm {Springform}“) → beim Kochen mit Faktor skalieren (der Multiplikator).
- **Einheit** als Combobox mit Vorschlägen (g, kg, ml, EL, TL, Prise, Stück) und freiem Text.
- **Mehrere einfügen:** Zutatenliste einfügen, Foodly zerlegt sie in Zeilen (gleiche Regeln wie oben).
- Zeilen-Aktionen (hoch, runter, entfernen) hinter `⋮`, Ziehen am Griff auf dem Desktop.
- **Handy:** Zutaten stehen als lesbare Zeilen („ca. 800 g Tomaten“). Antippen öffnet ein Sheet mit Menge, Einheit,
  Zutat, Zusatz und den Aktionen. Bilder stehen oben, Notizen und Quelle unten.
- Kategorien und Teilen sind **nicht** im Editor: Kategorien sind persönlich (Detail, „+“-Chip), Teilen hat einen
  eigenen Dialog.
- Schritte und Zutaten nutzen denselben Input-Radius (6 px).

### 3.4 Einkauf (Konzept)

- Listen wechseln: Desktop über die Spalte „Listen“ (dort „+“ für eine neue Liste; der doppelte Knopf „Neue Liste“
  oben ist weg). Handy: Der Titel ist der Umschalter („Wocheneinkauf ▾“), das Sheet hat „Neue Liste“.
- Die Rezepte oben heißen jetzt „Erstellt aus 6 Rezepten · aus dem Wochenplan“: Aus ihren Zutaten ist die Liste
  entstanden. Jeder Artikel zeigt darunter, wofür er ist („für Spaghetti Bolognese, Rindergulasch“). „+ Rezept“ fügt
  die Zutaten eines weiteren Rezepts hinzu.

### 3.5 Profil

Trennlinien-Fehler behoben (siehe Radien/Trennlinien oben). Gilt auch für alle anderen Karten-Listen.

---

## 4. Umsetzung (Vorschlag)

1. **Token-PR:** neue Werte in `theme.css`, Text-Skala, Inter, Kategorie-Farb-Util (TS) mit Tests, `docs/design.md`.
2. **App-Shell und Navigation:** Seitenleiste (Desktop), Tab-Leiste (Handy).
3. **Rezeptliste**, dann **Detail**, dann **Koch-Modus**, dann **Start/Dashboard** (Phase 5).
4. Editor mit Phase 4; Planer, Einkauf und Gruppen erst, wenn sie im Plan und im Backend sind.

Die Reihenfolge entscheidet Kolja.

## 5. Offen / zu entscheiden

- **Eine Farbe pro Kategorie:** Der Nutzer wählt nur eine Farbe, Hell/Dunkel berechnet Foodly. `colorLight`/`colorDark`
  bleiben als Override. Empfehlung: ja.
- **Reihenfolge der Umsetzung** (Abschnitt 4).
- **B11:** Kategorie-Symbol als Tag-Referenz (Backend).
- Editor: Zusatz bei Katalog-Zutat erhalten (Draft-Änderung, siehe 3.3).
