# Foodly Redesign – Entwürfe (Stand 29.10.2026)

Zwei fertig durchdachte Entwürfe für das komplette UI. Beide teilen dieselben Grundregeln (Abschnitt 1) und unterscheiden
sich in Haltung, Dichte und Bildanteil (Abschnitte 2 und 3).

**Ansehen:** `index.html` im Browser öffnen. Umschalter für Entwurf, Hell/Dunkel, mit/ohne Fotos, Desktop/Handy und Screen.
Jeder Screen ist klickbar (Navigation, Rezept, Kochen, …). Statische Übersichten liegen in `screens/`:

| Datei | Inhalt |
|---|---|
| `screens/ruhig-light.png`, `ruhig-dark.png` | Ruhig: Start, Rezepte, Detail (Desktop) + Start, Rezepte, Kategorie, Detail, Kochen (Handy) |
| `screens/ruhig-ohne-fotos.png` | Ruhig im heutigen Zustand (Bilder backend-blockiert) |
| `screens/ruhig-weitere-screens.png` | Kategorie, Rezept ohne Kategorie, Planer, Einkauf, Gruppen, Profil, Kategorien, Zustände |
| `screens/bildstark-*.png` | dasselbe für Bildstark |

Fotos: frei lizenziert (Wikimedia Commons), Nachweise in `img/CREDITS.md`. Nur für die Mockups.

---

## 1. Gemeinsame Grundregeln (gelten für beide Entwürfe)

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
- Mit Foto: Liste mit 48-px-Vorschaubild, Detail mit Bild (Ruhig: 4:3 neben dem Text, Bildstark: 21:9 Hero).
- Ohne Fotos (heute, B1): **keine Platzhalter-Wand.** Die Vorschaubild-Spalte entfällt komplett, solange es keine Fotos gibt.
  Ein einzelnes Rezept ohne Foto zwischen Rezepten mit Foto bekommt einen neutralen grauen Platzhalter mit Besteck-Symbol.
  Im Detail ohne Foto füllt der Text-Kopf die Breite, ohne leeren Hero.
- Bildstark-Raster ohne Foto: ruhige **Typo-Kachel** (Rezeptname groß in Grau). Kein Kategorie-Farbton, kein Fake-Bild.

### 1.6 Struktur und Navigation
- **Desktop (ab 761 px):** linke Seitenleiste mit „Neues Rezept“ (primär), Start, Rezepte, Planer, Einkauf, Gruppen,
  dann „Kategorien“ (Punkt, Name, Anzahl), unten Profil. Oben eine schmale Kopfzeile mit Titel/Breadcrumb und Seitenaktionen.
- **Handy:** Tab-Leiste unten (5 Ziele, Icon + Label), Kopfzeile mit Titel und Aktionen; „+“ (neues Rezept) als runde
  Primär-Schaltfläche oben rechts auf Start und Rezepte.
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

## 2. Entwurf „Ruhig“ (Empfehlung)

Werkzeughaft, ruhig, dicht. Orientiert an Linear und Things. Die Liste steht im Mittelpunkt, Farbe gibt es nur als Signal.

- **Flächen:** Hintergrund fast weiß bzw. neutrales Dunkelgrau (kein reines Schwarz), Karten mit Haarlinie, keine Schatten.
- **Form:** Radius 10 (Karten), 7 (Bedienelemente), 5 (Chips). Ruhige Ecken, nichts Pill-förmiges.
- **Schrift:** Inter. 14 px Text (Handy 15), Seitentitel 26 px / 650, Abschnittstitel 15 px / 600, Zutaten/Schritte 15 px.
- **Rezeptliste:** Zeilen (Bild 48, Name, Zeit, Bewertung, ggf. „von Mara“, 2 Tags, Farbpunkte), gruppiert nach Kategorie,
  einklappbar. Raster als zweite Ansicht.
- **Start:** Kategorie-Kacheln (getönt) oben, dann „Heute geplant“, „Zuletzt bearbeitet“ (Zeilen), rechts „Geteilt mit dir“, Einkauf.
- **Detail:** Bild links, Infos rechts (Desktop), Abschnitte mit Zutaten (2/5) und Schritten (3/5).
- Warum Empfehlung: funktioniert heute ohne Fotos am besten, lässt sich fast vollständig über die bestehenden
  `@postxl/ui-components`-Tokens umsetzen, und dichte Zeilen sind auf dem Handy leichter zu bedienen als Kacheln. Deckt sich mit dem Lead-Feedback.

### Tokens „Ruhig“ (Namen wie in `src/styles/theme.css`)

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
| `--radius` | `0.4375rem` (7 px) | |
| `--font-sans` | `Inter, system-ui, …` | |

Text-Skala: Basis 14 px statt heute 13 px (Lesbarkeit beim Kochen); Handy 15 px.

---

## 3. Entwurf „Bildstark“

Ein Feed wie bei X oder Reddit. Fotos sind das Hauptelement, Titel fett, alles rund. Gedacht für die Zeit, wenn die
meisten Rezepte Fotos haben.

- **Flächen:** reines Weiß bzw. **reines Schwarz** im Dunkelmodus (wie X „Lights out“). Trennung über Abstand statt über Rahmen.
- **Form:** Pill-Buttons und Pill-Eingaben, Bilder Radius 16 bis 20.
- **Schrift:** Inter. 15 px Text, Seitentitel 28 px / 800, Rezepttitel in Karten 17 px / 700, Detail-Titel 40 px.
- **Rezeptliste:** Raster 4:3-Bilder (Desktop 3–4 Spalten, Handy 2), darunter Farbpunkte + erste Kategorie neutral
  („Favoriten +2“), Titel, Zeit/Bewertung. Liste als zweite Ansicht.
- **Start:** Kategorie-Kacheln, „Heute geplant“ als große Bildkarten mit Titel auf dem Foto, „Zuletzt bearbeitet“ als Raster.
- **Detail:** 21:9-Hero über die ganze Breite (Handy: randlos 4:3), darunter Titel groß, rechts ein Kasten mit Portionen und „Kochen“.
- Risiko: Heute gibt es keine Fotos. Dann besteht das Raster aus Typo-Kacheln. Das sieht ordentlich aus, aber die
  Stärke des Entwurfs kommt erst mit Fotos. Außerdem braucht er mehr eigene Komponenten.

### Tokens „Bildstark“ (Abweichungen zu Ruhig)

| Token | Hell | Dunkel |
|---|---|---|
| `--background`, `--card` | `#fff` | `#000` |
| `--muted`, `--secondary` | `oklch(0.97 0 0)` | `oklch(0.2 0 0)` |
| `--input` (Fläche) | `oklch(0.96 0 0)` | `oklch(0.2 0 0)` |
| `--border` | `oklch(0.9 0 0)` | `oklch(0.3 0 0)` |
| `--radius` | `999px` für Buttons/Inputs, 16 px Karten | |

---

## 4. Umsetzung (Vorschlag)

1. **Token-PR:** neue Werte in `theme.css`, Text-Skala, Inter, Kategorie-Farb-Util (TS) mit Tests, `docs/design.md`.
2. **App-Shell und Navigation:** Seitenleiste (Desktop), Tab-Leiste (Handy).
3. **Rezeptliste**, dann **Detail**, dann **Koch-Modus**, dann **Start/Dashboard** (Phase 5).
4. Editor mit Phase 4; Planer, Einkauf und Gruppen erst, wenn sie im Plan und im Backend sind.

Die Reihenfolge entscheidet Kolja.

## 5. Offen / zu entscheiden

- **Welcher Entwurf?** Empfehlung: Ruhig. Bildstark-Elemente (Raster-Ansicht, Hero bei Foto) lassen sich später in Ruhig übernehmen.
- **Eine Farbe pro Kategorie:** Der Nutzer wählt nur eine Farbe, Hell/Dunkel berechnet Foodly. `colorLight`/`colorDark`
  bleiben als Override. Empfehlung: ja.
- **B11:** Kategorie-Symbol als Tag-Referenz (Backend).
