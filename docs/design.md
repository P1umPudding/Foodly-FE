# Foodly – Design-Regeln

Verbindlich für jeden UI-PR, genau wie [`architecture.md`](architecture.md) für den Code. Werte stehen als Tokens in
`src/styles/theme.css` (Hell `:root`, Dunkel `.dark`) und `src/styles/styles.css` (`@theme`); diese Datei erklärt,
**wann** welcher Wert und welches Muster gilt. Zielbild und Screens im Detail: die klickbaren Mockups und ihre
Spezifikation unter `docs/design/redesign/` (`README.md` dort; `index.html` lokal über einen statischen Server öffnen).

Eigentümer: Foodly Designer. Änderungen nur per PR (`lead/design-<slug>`), Entscheidungen von Kolja.

Neue Screens folgen diesen Regeln sofort. Bestehende Screens werden über die Redesign-Issues umgestellt; bis dahin
gilt: nichts Neues im alten Stil bauen.

---

## 1. Grundsätze

- **Ruhig und werkzeughaft.** Graue Oberfläche, Haarlinien, keine Schatten auf Flächen. Dicht, aber nicht gedrängt.
  Vorbilder: Discord, Reddit, X, Linear. Nicht: Instagram, Duolingo (keine Verspieltheit, keine großen Farbflächen,
  keine Gamification).
- **Keine Akzentfarbe.** `primary` ist die Textfarbe (dunkel auf hell, hell auf dunkel). Farbe kommt **nur** aus
  Kategorien – als Punkt, Chip, Kachel-Tönung oder 2-px-Linie. Statusfarben (`destructive`, `success`, `warning`,
  `star`) nur für ihre Bedeutung.
- **Ohne Bilder vollständig.** Jede Ansicht muss ohne Rezeptfotos fertig aussehen (heute der Normalfall, B1). Fotos
  sind ein Bonus, nie Träger von Struktur.
- **Handy und Desktop, Hell und Dunkel sind gleichwertig.** Jeder UI-PR wird in allen vier Kombinationen geprüft.
- **`@postxl/ui-components` für alles Interaktive**, gestylt über `variant`/`size`. Siehe CLAUDE.md.

## 2. Tokens

### Farben (Utilities)

| Utility | Wofür |
|---|---|
| `bg-background` | Seite |
| `bg-card` + `border` | Karten, Listen-Container, Eingabeflächen |
| `bg-muted` / `bg-secondary` | ruhige Flächen: Segment-Schalter, Tags, Skeletons, Foto-Platzhalter |
| `bg-accent` | Hover-Fläche von Zeilen und Ghost-Buttons |
| `text-foreground` | Text, Titel, Icons in Aktionen |
| `text-muted-foreground` | Sekundärtext (Untertitel, Beschreibungen) |
| `text-subtle-foreground` | Meta: Zähler, Zeiten, Platzhalter, „x von y“ |
| `border-border` (Standard) / `border-border-strong` | Haarlinie / Hover- und Checkbox-Rand |
| `bg-sidebar`, `bg-sidebar-accent` | Seitenleiste, aktiver Navigationspunkt |
| `bg-primary text-primary-foreground` | **eine** Hauptaktion pro Ansicht („Neues Rezept“, „Speichern“) |
| `text-star` | Bewertungssterne |
| `bg-cat-soft`, `text-cat-ink`, `bg-cat-dot`, `border-cat-line` | Kategorie-Rollen, siehe 2.4 |

Keine eigenen Grau- oder Hex-Werte in Komponenten (`text-gray-500`, `bg-[#…]`). Fehlt eine Rolle, kommt sie als Token
hierher, nicht als Einzelwert in den Code.

### Radien – genau drei

| Klasse | px | Für |
|---|---|---|
| `rounded-sm` | 4 | Chips, Tags, Badges, Checkboxen |
| `rounded-md` / `rounded` | 6 | **jedes** Bedienelement: Buttons, Inputs, Textareas, Zeilen, Nav-Punkte, Segmente |
| `rounded-lg` | 8 | Karten, Fotos, Sheets, Popover, Dialoge |
| `rounded-full` | – | nur Avatare, Kategorie-Punkte, Schrittnummern, Switches, der Handy-FAB |

`rounded-xl` und größer sind auf 8 px gedeckelt; nicht verwenden. Verschachtelt: außen = innen + Abstand
(Segment-Schalter 6 + 2 = 8).

### Schrift

Inter für alles, selbst gehostet über `@fontsource-variable/inter` (kein externer Request: Datenschutz, offline in Capacitor). Die Text-Skala ist kompakt (`--text-base` 14 px). Zielbild Handy: 15 px Grundschrift; das kommt mit
dem Shell-/Detail-Issue (Override von `--text-base` unter 761 px), weil die heutigen Handy-Kopfzeilen dafür zu breit sind.

| Klasse | px | Rolle |
|---|---|---|
| `text-xs` | 12 | Badges, Chips, Meta unter Zeilen |
| `text-sm` | 13 | Sekundärtext, Labels, Toolbar |
| `text-base` | 14 | Fließtext, Zeilentitel |
| `text-lg font-semibold` | 15 | Abschnittstitel; Zutaten und Schritte im Detail |
| `text-2xl font-display` | 26 / 650 | Seitentitel (genau einer pro Seite) |

Zahlen, die sich vergleichen lassen (Zeiten, Mengen, Zähler), mit `tabular-nums`. Keine weiteren Größen; Koch-Modus
ist die einzige Ausnahme (großer Schritttext, siehe Redesign-README).

### Abstände

Tailwind-Skala in 4-px-Schritten. Üblich: `gap-2` (8) in Zeilen, `gap-3`/`p-3` (12) in Karten, `gap-6` (24) zwischen
Abschnitten, Seitenrand `px-4` Handy / `px-6` Desktop. Trennlinien in Karten sind eigene Haarlinien mit 12 px Einzug,
**nie** `border-t` auf einer abgerundeten Zeile (die Linie biegt sich an den Enden hoch).

### Schatten

Flächen haben keinen Schatten (`shadow-xs`/`shadow-sm` sind bewusst leer). Nur schwebende Ebenen – Popover, Sheet,
Dialog, FAB – nutzen `shadow-md` oder größer.

### 2.4 Kategoriefarbe

Der Nutzer wählt **eine** Farbe pro Kategorie (Entscheidung Kolja, 29.10.2026). Daraus berechnet ein reines
TS-Util (`src/lib/categoryColor.ts`, eigenes Issue) vier Rollen pro Theme: Helligkeit fest, Sättigung gedeckelt,
Farbton bleibt (OKLCH). So ist jede Nutzerfarbe lesbar.

| Rolle | Einsatz | Hell L / max C | Dunkel L / max C |
|---|---|---|---|
| `dot` | Punkte, Swatches | 0,62 / 0,17 | 0,70 / 0,15 |
| `soft` | Chip-, Kachel-, Gruppenkopf-Fläche | 0,955 / 0,035 | 0,27 / 0,045 |
| `ink` | Text/Symbol auf `soft`, Kategorie-Label | 0,46 / 0,13 | 0,86 / 0,10 |
| `line` | 2-px-Linie an Gruppen, Rahmen | 0,84 / 0,08 | 0,42 / 0,09 |

- Spezifikation des Utils (Entscheidung: `docs/decisions/0002-category-colors.md`): Eingabe beliebige Hex-Farbe,
  Ausgabe `{ light, dark }` je mit den vier Rollen als sRGB-Hex. Ungültige Eingabe sowie Schwarz/Weiß/Grau
  (Chroma < 0,02) → neutrale Werte (die Defaults in `theme.css`). Ein Backend-Override `colorLight`/`colorDark`
  ist für das jeweilige Theme die Eingabe statt `color` und wird genauso normalisiert, für alle vier Rollen (ADR 0002), damit auch
  ein Override lesbar bleibt. Eine eigene Eingabe für Overrides gibt es im UI nicht. Tests: 14 Testfarben inkl. Navy, Blassgelb, Neongrün;
  Kontrast `ink` auf `soft` ≥ 4,5:1, `dot` gegen `background` ≥ 3:1.
- Angewendet wird das Ergebnis als CSS-Variablen auf dem Kategorie-Element: Dort stehen beide Varianten als
  `--cat-<rolle>-l` / `--cat-<rolle>-d` (z. B. `--cat-soft-l`, `--cat-soft-d`), und eine generische Regel in
  `styles.css` (`[data-cat]`, `.dark [data-cat]`) wählt daraus `--cat-<rolle>`. So braucht ein Theme-Wechsel kein
  Re-Render. Die Utilities `bg-cat-soft` usw. greifen `--cat-<rolle>` auf. Das ist die **einzige erlaubte
  Inline-Style-Ausnahme** (nur diese acht Variablen). Keine CSS Relative Color Syntax (ältere WebViews).
- Ohne Kategorie gelten die neutralen Defaults aus `theme.css` – das ist ein normaler, kein Fehlerzustand.
- Farbwahl: 12 im Farbton verteilte Vorschläge, eigene Farbe möglich, Hinweis bei < 20° Abstand zu einer vorhandenen.

## 3. Struktur und Navigation

- **Desktop/Tablet (ab 761 px):** linke Seitenleiste (`bg-sidebar`): oben „Neues Rezept“ (primary), dann die Ziele,
  dann „Kategorien“ (Punkt, Name, Anzahl), unten Profil (Avatar). Einklappbar auf 64 px mit Tooltips. Kopfzeile:
  Titel oder Breadcrumb, Seitenaktionen, Timer-Knopf.
- **Handy (bis 760 px):** Tab-Leiste unten (Icon + Label), Kopfzeile mit Titel, Aktionen, Timer-Knopf und ganz
  rechts dem **Avatar → Profil** (auf Hauptseiten; Unterseiten haben stattdessen links den Zurück-Pfeil).
  Erste Stufe: Der Avatar (Handy) bzw. der Profil-Eintrag unten in der Seitenleiste öffnet ein `DropdownMenu` mit
  Name, Theme und Wake-Lock; eine eigene Profilseite kommt erst, wenn es mehr Einstellungen gibt.
  „Neues Rezept“ ist der runde FAB unten rechts über der Tab-Leiste.
- **Nur echte Ziele zeigen** (Kolja/Lead, 29.10.2026): heute Start (`/`) und Rezepte (`/recipes`). Planer, Einkauf,
  Gruppen kommen in Leiste und Tabs, wenn ihre Phase kommt – keine Platzhalter-Einträge.
- **Zurück folgt dem Verlauf;** ohne Verlauf (Direktlink) zur logischen Elternseite (Rezept → Rezepte).
- **Ein Filter filtert nur**, er navigiert nie. Zur Kategorie-Seite führen Seitenleiste, Start-Kacheln und
  „Öffnen ›“ am Gruppenkopf.

## 4. Seitentypen

- **Liste (Rezepte, Kategorie):** volle Breite, keine Filter-Spalte. Zeile 1 Suche · Sortierung · Ansicht
  (Kompakt / Detailliert = Standard / Kacheln); Zeile 2 Filterleiste mit Facetten-Knöpfen (Wert im Knopf, eigenes ✕;
  Desktop Popover, Handy Sheet); Zeile 3 „x von y Rezepte“ · „Alle Filter zurücksetzen“. Gruppiert nach Kategorie mit
  2-px-`cat-line` und Sticky-Kopf; „Ohne Kategorie“ zuerst und eingeklappt.
  Kategorie-Punkte (Zeilen, Kacheln, überall) haben auf dem Desktop **je Punkt** einen postxl-`Tooltip` mit dem
  Kategorienamen, „+N“ nennt die übrigen; wie die Zugriffs-Icons daneben. Trefferfläche größer als der Punkt.
- **Detail:** Desktop Bild links / Infos rechts, darunter Zutaten (2/5) und Schritte (3/5). Ohne Foto rückt der Text
  nach oben, kein leerer Rahmen. Zeitangaben in Schritten werden Timer-Chips.
- **Editor:** eine Spalte Inhalt, rechts Bilder, Notizen, Quelle. Zutatenzeile Desktop: Menge · Einheit · Zutat ·
  Zusatz · `⋮`; Handy: lesbare Zeilen, Bearbeiten im Sheet.
- **Start:** Kategorie-Kacheln (`bg-cat-soft`), „Zuletzt bearbeitet“ als Kacheln; muss ohne die Blöcke aus B4–B6
  vollständig wirken.

## 5. Zustände

Jede Ansicht hat alle vier; ein PR ohne sie ist nicht fertig.

- **Laden:** postxl `Skeleton` in der Form des Inhalts (Zeilen, Kacheln), kein Vollbild-Spinner. `Loader` nur in
  Buttons während einer Aktion.
- **Leer:** ein Satz, was fehlt, plus genau eine Aktion („Noch keine Rezepte. Neues Rezept“). Kein großes Icon,
  keine Illustration.
- **Keine Treffer (Filter):** „Keine Rezepte für diese Filter.“ + „Filter zurücksetzen“.
- **Fehler:** postxl `Alert` inline mit der Meldung und „Erneut versuchen“. Aktion fehlgeschlagen: `toast`.
- **Kein Zugriff / nicht gefunden:** eigene Seite mit Weg zurück (`NotFound.tsx`).

## 6. Formulare

- Labels über dem Feld (`Label`), Hilfetext darunter in `text-sm text-muted-foreground`.
- Validierung beim Verlassen des Feldes, Fehlertext unter dem Feld in `text-destructive`, kein roter Rahmen allein.
- Editor speichert automatisch; Status („Gespeichert“) still in der Kopfzeile, kein Toast pro Speichern.
- Fokus: nur der `ring`-Rand, kein zusätzlicher Ring (siehe `styles.css`).

## 7. Handy

- Tippflächen mindestens 40 × 40 px (Icon-Buttons `size="icon"`).
- Popover mit Inhalt (Filter, Timer, Formulare) werden auf dem Handy zu Bottom-Sheets mit Griff, Titel und ✕;
  Filter-Sheets haben unten nur „Anzeigen“. Kurze Aktionsmenüs (bis 5 Einträge, z. B. das Profil-Menü) bleiben auch
  auf dem Handy ein `DropdownMenu`.
- Horizontal scrollen nur für die Filterleiste und Chip-Reihen, nie für Inhalt.
- Kein Hover-only: alles, was ein Tooltip erklärt, braucht ein Label oder ist selbsterklärend.

## 8. Text und Ton

- Deutsch, Du-Form, kurz, keine Ausrufezeichen, keine Emojis in UI-Texten (Kategorie-Symbole ausgenommen).
- Buttons sagen, was passiert: „Speichern“, „Kopie erstellen“, nicht „OK“.
- Zeiten „45 min“ / „1 h 30 min“, Bewertung mit Komma („4,5“), Mengen ohne unnötige Nullen („0,5“, nicht „0,50“).
- Rollen: „Besitzer“, „Bearbeiten“, „Ansehen“.

## 9. Do / Don't

| Do | Don't |
|---|---|
| Kategorie als Punkt/Chip/Linie (`bg-cat-dot`, `bg-cat-soft text-cat-ink`) | Kategoriefarbe als große Vollfläche oder Textfarbe auf Weiß |
| Neutral für Bedienelemente (siehe Kommentar in `src/components/list/FilterControls.tsx`) | Lila oder eine andere Markenfarbe für Auswahl, Links, Fokus |
| Eine `primary`-Aktion pro Ansicht, Rest `outline`/`ghost` | Mehrere schwarze Buttons nebeneinander |
| `rounded-md` für Controls, `rounded-lg` für Karten | `rounded-xl`, `rounded-2xl`, Pillen-Buttons |
| Haarlinie + `bg-card` | Schatten auf Karten |
| postxl `Tooltip` | `title=""` |
| Text-Tokens (`text-sm`) | `text-[13px]` für normalen Text |
