# Phase 6 — Mobile optimieren — Issue-Plan

> Freigegeben von Daniel am 2026-11-13. Die Abschnitte M1–M8 sind die Issue-Texte; der Titel ist jeweils die
> Überschrift ohne „Mx —“.

Spec: `docs/superpowers/specs/2026-11-13-phase-6-mobile-design.md`. Regeln: `docs/design.md` §7. Befunde: QA-Mobile-Audit
vom 2026-11-13; die Nummern in Klammern stehen für die Audit-Befunde.

Labels: `agent-ready`, `alpha`, `phase:6`, dazu `ui`, wo passend. Das Backend blockiert keines der Issues.
Statt CI laufen lokale Checks (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`,
`npm run format:check`, `npm run lint`.
Abgenommen wird in Chrome mit Touch-Emulation (DevTools, „Mobile“) bei 375×812 und 768×1024.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| M1 | Eingabefelder auf Touch-Geräten mit 16 px | – | M2, M6, M8 |
| M2 | Rezeptliste: Scroll-Position nach Zurück | – | M1, M6, M8 |
| M3 | Editor auf dem Handy: Zutaten als Zeilen, Bearbeiten im Sheet | M1 | M5, M6 |
| M4 | Editor auf dem Handy: Aufbau, Tippflächen, keine Tab-Leiste | M3 | M5 |
| M5 | Tippflächen mindestens 40 px auf Touch-Geräten | M1 | M3, M6 |
| M6 | PWA-Manifest, Safe Areas und Sheets mit Tastatur | – | M1, M2, M3, M5 |
| M7 | Routen per Code-Splitting nachladen | #209 | alle |
| M8 | Tablet hochkant: Seitenleiste startet eingeklappt | – | M1, M2, M6 |

---

## M1 — Eingabefelder auf Touch-Geräten mit 16 px

Labels: agent-ready, alpha, phase:6, ui · Depends on: –

### Context
Audit (2): Eingabefelder haben auf dem Handy 14 px und auf dem Tablet 13 px, die Textareas im Editor 14 px. Unter 16 px
zoomt iOS Safari beim Fokus. Die Ursache ist die kompakte Text-Skala in `src/styles/styles.css` (`@theme`,
`--text-base` 14, `--text-sm` 13), über die die postxl-Felder (`text-base md:text-sm`) laufen. Spec, Entscheidung b und 1.

### Goal
Auf Touch-Geräten haben alle Eingabefelder 16 px, ohne die übrige Text-Skala zu ändern.

### Behaviour
- In `styles.css` kommt `@custom-variant touch (@media (pointer: coarse));` neben `phone`.
- Eine zentrale Regel setzt für alle Eingabefelder auf `touch:` die Schriftgröße auf 16 px: postxl `Input`, `Textarea`,
  Combobox- und Suchfelder sowie die Felder in `AuthField`, `IngredientPicker`, `TagPicker`, `DurationPicker` und
  `TimerForm`. Erlaubt ist eine Basisregel in `@layer base` für `input`, `textarea` und `[contenteditable]` auf
  `pointer: coarse`. Das ist einer der seltenen CSS-Fälle aus CLAUDE.md, weil die Klassen der Fremdkomponenten nicht
  erreichbar sind. Ein Kommentar im Code nennt den Grund (iOS-Zoom).
- Den Viewport-Meta-Tag lässt du unverändert, also kein `maximum-scale` und kein `user-scalable=no`.
- Die Feldhöhen bleiben, wo sie sind. Wo 16 px das Feld sprengen, wird es auf `touch:` höher, mindestens 40 px
  (vorweg aus M5).

### Acceptance criteria
1. In Chrome mit Touch-Emulation haben die Felder auf `/login`, in der Suche auf `/recipes`, in den Filter-Sheets für
   Tags, Zutaten und Arbeitszeit, im Timer-Sheet, bei „Neue Kategorie“ und im Editor (Titel, Zutat, Schritt-Textarea)
   eine berechnete `font-size` von 16 px. Die PR-Beschreibung listet die geprüften Felder.
2. Ohne Touch (Desktop-Maus) bleiben die Felder bei 13 bzw. 14 px.
3. `index.html` enthält weder `maximum-scale` noch `user-scalable`.
4. `docs/design.md` §2 („Schrift“) nennt die Ausnahme „Eingabefelder auf Touch 16 px“.
5. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/styles/styles.css`, `docs/design.md`, gegebenenfalls `src/components/auth/AuthField.tsx`.

---

## M2 — Rezeptliste: Scroll-Position nach Zurück

Labels: agent-ready, alpha, phase:6, bug · Depends on: –

### Context
Audit (3): Zurück aus einem Rezept landet auf dem Handy rund 230 px zu hoch (900 → 685, 1052 → 817). Auf dem Tablet geht
es nach einem Scroll bis ans Listenende ganz nach oben. Gespeichert wird richtig (`sessionStorage`, `SCROLL_KEY`), aber
`src/pages/RecipeList.tsx` (ca. Zeile 125–165) stellt die Position einmal wieder her, sobald `listReady` gilt. Dann ist
nur die erste Seite geladen, und der Browser kürzt `scrollTo` auf die aktuelle Dokumenthöhe; danach ist
`scrollRestored` schon gesetzt.

### Goal
Zurück zur Liste stellt die gespeicherte Position zuverlässig wieder her, auch wenn sie hinter der ersten Seite liegt.

### Behaviour
- Ist die gespeicherte Position höher als die Dokumenthöhe, werden weitere Seiten nachgeladen (`useRecipeSearch.loadMore`),
  bis die Position erreichbar ist, die Liste zu Ende ist oder ein Fehler auftritt. Erst danach wird gescrollt, und erst
  dann wird `scrollRestored` gesetzt.
- Es gibt eine Obergrenze von 10 Seiten. Danach wird so weit gescrollt wie möglich.
- Solange die Wiederherstellung läuft, werden Scroll-Events nicht gespeichert, wie heute.
- Alles andere bleibt: Ein Klick in der Shell-Navigation startet oben, eine andere Liste startet oben.

### Acceptance criteria
1. Test: Eine gespeicherte Position, die eine zweite Seite braucht, löst `loadMore` aus und scrollt danach genau auf den
   gespeicherten Wert (mit gemocktem `scrollHeight`/`scrollTo`).
2. Test: Eine Position am Listenende bei vollständig geladener Liste scrollt ans Ende, nicht auf 0.
3. Test: Schlägt `loadMore` fehl, wird so weit wie möglich gescrollt, und die Liste zeigt den bestehenden Fehlerzustand.
4. Die bestehenden Tests zur Scroll-Wiederherstellung und zur Shell-Navigation sind grün.
5. Manuell bei 375 und 768 px: Liste scrollen, Rezept öffnen, zurück. Das angetippte Rezept steht wieder an derselben
   Stelle (in der PR-Beschreibung festhalten).
6. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/pages/RecipeList.tsx` (+Test), gegebenenfalls `src/hooks/useRecipeSearch.ts`.

---

## M3 — Editor auf dem Handy: Zutaten als Zeilen, Bearbeiten im Sheet

Labels: agent-ready, alpha, phase:6, ui, redesign · Depends on: M1

### Context
Audit (6): Auf dem Handy zeigt der Editor pro Zutat das ganze Formular (Präfix, Menge, Einheit, Zutat, Zusatz,
Aktionen), umbrochen auf 3–4 Zeilen. Die Seite wird dadurch rund 10 Bildschirme lang. Redesign §3.3 („Handy“): Zutaten
stehen als lesbare Zeilen, Antippen öffnet ein Sheet. Code: `src/components/editor/IngredientRow.tsx`, `SectionEditor.tsx`,
`IngredientPicker.tsx`, `RowActions.tsx`.

### Goal
Auf dem Handy (`phone:`) bearbeitet man Zutaten einzeln in einem Sheet. Die Liste bleibt kurz und lesbar.

### Behaviour
- **Zeile auf dem Handy:** Jede Zutat ist eine Zeile, z. B. „ca. 800 g Tomaten gehackt“. Präfix, Menge, Einheit und
  Zutat stehen normal, der Zusatz muted, alles mit derselben Formatierung wie `IngredientLine` im Detail. Die Zeile ist
  mindestens 40 px hoch und als Ganzes antippbar.
- **Leere Zeile:** Eine neue Zutat ohne Inhalt zeigt „Neue Zutat“ in muted. „Zutat hinzufügen“ öffnet das Sheet direkt
  für die neue Zeile.
- **Sheet** (`BottomSheet`, Titel „Zutat“):
  - Felder Menge (mit Präfix-Regel aus §3.3), Einheit (Combobox), Zutat (`IngredientPicker`) und Zusatz.
  - Darunter die Aktionen „Nach oben“, „Nach unten“ und „Entfernen“.
  - Änderungen gehen sofort in den Draft, die Autosave-Logik bleibt unverändert. „Fertig“ schließt das Sheet.
  - Ist die Zutat beim Schließen leer, wird die Zeile entfernt, wie beim Desktop-Verhalten für leere Zeilen, falls es
    das gibt. Sonst bleibt sie stehen.
- „Mehrere einfügen“ bleibt erreichbar, wie heute.
- **Desktop und Tablet** (≥ 761 px) bleiben unverändert.

### Acceptance criteria
1. Phone-Breite (Tests mit `phone`-Mock oder getrennter Rendervariante): Eine Zutat erscheint als Text „ca. 800 g
   Tomaten gehackt“ ohne Eingabefelder. Antippen öffnet das Sheet mit den vier Feldern.
2. Eine Änderung im Sheet aktualisiert die Zeile und den Draft; der Autosave-Test ist grün.
3. „Nach oben“, „Nach unten“ und „Entfernen“ im Sheet funktionieren (Tests).
4. „Zutat hinzufügen“ öffnet das Sheet für eine neue Zeile (Test).
5. Auf ≥ 761 px ist alles unverändert; die bestehenden Editor-Tests sind grün.
6. Alle Tippflächen im Sheet und in der Zeile sind mindestens 40 px groß. Es gibt nur postxl-Bedienelemente und keine
   Inline-Styles.
7. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Schritte, Bilder, Notizen und die Tab-Leiste (M4). Desktop-Editor.

### Affected areas
`src/components/editor/IngredientRow.tsx`, `SectionEditor.tsx`, `RowActions.tsx`, neu z. B.
`src/components/editor/IngredientSheet.tsx` (+Tests), `src/components/BottomSheet.tsx`.

---

## M4 — Editor auf dem Handy: Aufbau, Tippflächen, keine Tab-Leiste

Labels: agent-ready, alpha, phase:6, ui, redesign · Depends on: M3

### Context
Audit (6–8): Auf dem Handy stehen die Bilder unten, und die Schritt-Textareas sind nur rund 150 px breit. Die
Tippflächen sind zu klein: Tag-✕ 16 × 16, Radio Portionen/Freitext 16 × 16, Zeilen-Aktionen 36 × 32,
„… hinzufügen“ 32 hoch, Bild-Aktionen 36 × 32. Die feste Leiste „Änderungen werden automatisch gespeichert · Fertig“
(`src/pages/RecipeEditor.tsx`, `fixed … bottom-[var(--shell-bottom)]`) sitzt über der Tab-Leiste, zusammen nehmen sie
rund 130 px weg. Redesign §3.3 und Spec, Entscheidungen 1 und 3.

### Goal
Der Editor auf dem Handy folgt §3.3 und lässt sich bequem bedienen.

### Behaviour
- **Reihenfolge auf `phone:`:** Bilder oben (nach dem Titel), dann Grunddaten, Abschnitte, Notizen und Quelle unten.
  Desktop bleibt unverändert.
- **Schritte** gehen auf dem Handy über die volle Breite. Nummer und Aktionen sitzen über oder neben dem Feld, nicht in
  einer eigenen Spalte, die Breite kostet.
- **Tippflächen** auf `touch:` mindestens 40 px: Tag-✕, Radios (die ganze Zeile mit Label ist die Fläche), Zeilen-Aktionen
  (`⋮`), „Zutat/Schritt/Abschnitt/Notiz hinzufügen“ und die Bild-Aktionen.
- **Tab-Leiste:** Auf `/recipes/new` und `/recipes/:id/edit` wird sie auf dem Handy ausgeblendet, der FAB ebenso. Die
  Editor-Leiste sitzt dann ganz unten und hält `env(safe-area-inset-bottom)` frei. Andere Seiten sind nicht betroffen.

### Acceptance criteria
1. Phone-Breite: Der Bilderbereich steht im DOM vor den Abschnitten. Desktop: unverändert (Tests).
2. Auf dem Handy gibt es im Editor keine Tab-Leiste und keinen FAB, auf `/recipes` schon (Tests in
   `AppShell.test.tsx`).
3. Eine Messung mit Touch-Emulation bei 375 px zeigt keine Tippfläche im Editor unter 40 × 40 px; die PR-Beschreibung
   listet die geprüften Elemente.
4. Die Editor-Leiste liegt unten am Rand und hat Safe-Area-Padding.
5. Die bestehenden Editor-Tests sind grün. Es gibt nur postxl-Bedienelemente und keine Inline-Styles.
6. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/pages/RecipeEditor.tsx`, `src/components/editor/*`, `src/components/shell/AppShell.tsx`, `TabBar.tsx`.

---

## M5 — Tippflächen mindestens 40 px auf Touch-Geräten

Labels: agent-ready, alpha, phase:6, ui · Depends on: M1

### Context
Audit (9–14, 18). Spec, Entscheidungen 1 und 4, und `docs/design.md` §7: mindestens 40 × 40 px auf `touch:`
(`pointer: coarse`); die Variante führt M1 ein. Editor (M3/M4) sowie Detail und Koch-Modus (#206–#210) sind
ausgenommen.

### Goal
Keine Tippfläche außerhalb von Editor und Detail ist auf Touch-Geräten kleiner als 40 × 40 px.

### Behaviour
Auf `touch:` werden diese Stellen mindestens 40 px groß:
- **Rezeptliste:** Zeilen der Kompakt-Ansicht (heute 30 px; Entscheidung 4, auf dem Handy mindestens 40 px),
  Gruppenköpfe (34), „Öffnen ›“ (78 × 32), Filter- und Sortier-Knöpfe sowie Icon-Buttons (32–36).
- **Shell:** Einträge der Seitenleiste (36) und „Kategorien verwalten“ (28 × 28).
- **Menüs:** Dropdown-Einträge (30) im Profil-Menü und im Kategorie-Aktionsmenü.
- **Timer:** Presets 5/10/15/30 min (30), „Timer starten“ und das Namensfeld (36).
- **Login und Registrierung:** Hauptknopf (36) und Link „Registrieren“/„Anmelden“ (16 hoch).
- **Start, Kategorien und 404:** „Verwalten“, „← Zurück“ (32), „Neue Kategorie“ und „Zur Startseite“ (36) sowie der
  Kategoriename-Link in `/categories` (20).

Bevorzugt werden die `size`-Props von postxl genutzt (`size="icon"` / `default`) oder `touch:min-h-10 touch:min-w-10`.
Ein neues CSS gibt es nicht. Mit Maus und Desktop bleibt die Dichte wie heute.

### Acceptance criteria
1. Messung mit Touch-Emulation bei 375 und 768 px auf `/`, `/recipes` (alle drei Ansichten, Filter- und Sortier-Sheet),
   `/categories`, `/categories/:id`, `/login`, `/register`, im Timer-Sheet, im Profil-Menü und auf 404: keine
   Tippfläche unter 40 × 40 px. Die PR-Beschreibung enthält die Liste mit den Werten vorher und nachher.
2. Ohne Touch (Maus, ≥ 1024 px) sind die Höhen unverändert. Stichprobe: Höhe einer Kompakt-Zeile und eines
   Sidebar-Eintrags im Test oder in der PR-Beschreibung.
3. Die bestehenden Tests sind grün. Es gibt keine Inline-Styles und keine neuen CSS-Regeln.
4. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/components/list/*`, `src/components/shell/*`, `src/timers/TimerForm.tsx`, `src/components/auth/AuthCard.tsx`,
`src/pages/Home.tsx`, `Categories.tsx`, `CategoryPage.tsx`, `NotFound.tsx`.

---

## M6 — PWA-Manifest, Safe Areas und Sheets mit Tastatur

Labels: agent-ready, alpha, phase:6, ui · Depends on: –

### Context
Spec, Entscheidung a. Heute gibt es kein Manifest und keine App-Icons; `index.html` hat kein `viewport-fit=cover`.
Audit (15, 16):
- `BottomSheet` (`src/components/BottomSheet.tsx`) nutzt `max-h-[80vh]` ohne Behandlung der Tastatur.
- Die Tab-Leiste hat kein eigenes Safe-Area-Padding.
- Mit `cover` läge der Home-Indikator über den Tab-Labels.

### Goal
Foodly lässt sich als App auf den Home-Bildschirm legen. Notch, Home-Indikator und Bildschirmtastatur verdecken nichts.

### Behaviour
- **Manifest:**
  - `public/manifest.webmanifest` mit `name` „Foodly“, `short_name` „Foodly“, `start_url` und `scope` passend zu
    Vites `base`, `display: standalone`, `background_color` und `theme_color` (hell `#fafafa`), `lang: de`.
  - Icons 192, 512 und 512 maskable als PNG unter `public/icons/`, abgeleitet aus `favicon.svg`.
  - In `index.html` ein Link auf das Manifest, `apple-touch-icon` (180), `apple-mobile-web-app-capable` und
    `apple-mobile-web-app-status-bar-style`.
- **Kein Service Worker** und kein `vite-plugin-pwa`.
- **Viewport:** `viewport-fit=cover`.
- **Safe Areas:**
  - Die Tab-Leiste bekommt `pb-[env(safe-area-inset-bottom)]`, und der FAB sitzt darüber.
  - Die Kopfzeile bekommt `pt-[env(safe-area-inset-top)]`.
  - Seitliche Insets gelten für die Seitenleiste bzw. den Inhalt im Querformat.
  - Die Editor-Leiste (falls M4 noch nicht gemergt ist) und der Koch-Modus-Fuß, sobald es ihn gibt, folgen demselben
    Muster.
- **Sheets mit Tastatur:**
  - `BottomSheet` misst seine Höhe in `dvh` (`max-h-[80dvh]`).
  - Ist die Tastatur offen, hält es seine Fußzeile über ihr. Dafür gibt es einen kleinen Hook
    `useVisualViewportInset` in `src/hooks/`, der auf `visualViewport` hört und den unteren Abstand als
    CSS-Variable auf dem Sheet setzt.
  - Das ist die eine erlaubte Inline-Ausnahme für eine CSS-Variable. Wenn das nicht nötig ist, weil `dvh` und
    `interactive-widget=resizes-content` reichen, ist es umso besser. Die PR-Beschreibung begründet die Wahl.

### Acceptance criteria
1. Im Build liegen `dist/manifest.webmanifest` und die Icons. Chrome DevTools → Application → Manifest zeigt keine
   Fehler und meldet die App als installierbar (Screenshot oder Beschreibung im PR).
2. Es gibt keinen Service Worker (`navigator.serviceWorker` wird nirgends registriert).
3. Bei 375 px mit simulierten Insets (DevTools oder CSS-Override) liegen Tab-Leiste, FAB und Sheet-Fuß über dem unteren
   Inset.
4. Test für den Hook: Ein Mock von `visualViewport` mit verkleinerter Höhe setzt die Variable, ein Resize zurück setzt sie
   wieder auf 0.
5. Mit `SKAILE_PREVIEW_BASE` (Unterpfad) zeigen `start_url`, `scope` und die Icon-Pfade auf den Unterpfad, ein Test
   oder eine Build-Prüfung belegt das.
6. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Offline, Caching, Push, Installations-Banner im UI.

### Affected areas
`index.html`, `public/manifest.webmanifest`, `public/icons/*`, `vite.config.ts` (falls `base` eingesetzt werden muss),
`src/components/BottomSheet.tsx`, neu `src/hooks/useVisualViewportInset.ts` (+Test), `src/components/shell/*`.

---

## M7 — Routen per Code-Splitting nachladen

Labels: agent-ready, alpha, phase:6 · Depends on: #209

### Context
`vite build` erzeugt heute ein Bundle mit 729 kB (219 kB gzip) und warnt wegen der Chunk-Größe. `React.lazy` gibt es
noch nicht. Auf dem Handy verzögert das den ersten Start. #209 bringt den Koch-Modus als eigene Route, deshalb läuft
dieses Issue erst danach.

### Goal
Der Einstieg lädt nur, was die erste Seite braucht. Der Einstiegs-Chunk wird mindestens 40 % kleiner (gzip).

### Behaviour
- `React.lazy` mit `Suspense` für die Routen `RecipeEditor` (new/edit), `CookMode`, `Categories`, `CategoryPage`, `Login`
  und `Register`. Start, Liste und Detail bleiben im Einstieg, sie sind die häufigsten ersten Seiten.
- Der Fallback ist ein Skelett in Seitenform bzw. das vorhandene Lade-Skelett der Seite, kein Vollbild-Spinner
  (design.md §5).
- Scheitert ein Chunk beim Laden, etwa nach einem Deploy mit neuen Hashes, erscheint `RetryAlert` mit
  „Erneut versuchen“, das die Seite neu lädt. Dafür sorgt eine Error Boundary um die lazy Routen.
- Optional werden große Bibliotheken über `manualChunks` in einen Vendor-Chunk gelegt, wenn das den Einstieg weiter
  verkleinert.

### Acceptance criteria
1. Die PR-Beschreibung zeigt die Ausgabe von `vite build` vorher und nachher. Der Einstiegs-Chunk ist (gzip) mindestens
   40 % kleiner als die Ausgangsbasis von 219 kB, und die Chunk-Warnung ist weg oder begründet.
2. Alle Routen-Tests sind grün, die lazy Routen in den Tests mit `await findBy…`.
3. Test: Ein lazy Import, der fehlschlägt, zeigt `RetryAlert`.
4. Lazy Routen zeigen ein Skelett, keinen Spinner.
5. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/App.tsx`, neu z. B. `src/components/RouteErrorBoundary.tsx` (+Test), gegebenenfalls `vite.config.ts`.

---

## M8 — Tablet hochkant: Seitenleiste startet eingeklappt

Labels: agent-ready, alpha, phase:6, ui · Depends on: –

### Context
Audit (17): Bei 768 px ist die Seitenleiste mit 215 px offen. Das Suchfeld schrumpft auf 81 px, die Filterleiste bricht
zweizeilig um, und die Zeitangaben brechen um. `loadSidebarCollapsed()` in `src/components/shell/Sidebar.tsx` liefert
`false`, wenn nichts gespeichert ist (Key `foodly:sidebar-collapsed`). Spec, Entscheidung 2.

### Goal
Zwischen 761 und 1023 px startet die Seitenleiste eingeklappt (64-px-Icon-Leiste), solange der Nutzer nichts anderes
gewählt hat.

### Behaviour
- `loadSidebarCollapsed` unterscheidet „nichts gespeichert“ von „offen gespeichert“. Ist nichts gespeichert, gilt unter
  1024 px eingeklappt und ab 1024 px offen.
- Gemerkt wird erst, wenn der Nutzer selbst umschaltet; das Verhalten bleibt sonst unverändert. Danach gilt seine Wahl
  auf allen Breiten.
- Wird das Fenster ohne gespeicherte Wahl über 1024 px hinaus oder darunter gezogen, folgt die Seitenleiste dem
  Breakpoint.

### Acceptance criteria
1. Ohne gespeicherten Wert ist sie bei 800 px eingeklappt und bei 1280 px offen (Tests mit `matchMedia`-Mock).
2. Hat der Nutzer bei 800 px „offen“ gewählt, bleibt sie nach einem Reload bei 800 px offen (Test).
3. Bei 768 px hat das Suchfeld auf `/recipes` mindestens 200 px, das wird manuell geprüft und im PR notiert.
4. Die bestehenden Sidebar- und AppShell-Tests sind grün.
5. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/components/shell/Sidebar.tsx` (+Test), `src/components/shell/AppShell.tsx`.
