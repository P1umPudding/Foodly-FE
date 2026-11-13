# Redesign Schritt 6: Rezept-Detail und Koch-Modus — Issue-Plan

> Freigegeben von Daniel am 2026-11-13. Die Abschnitte R1–R5 sind die Issue-Texte; der Titel ist jeweils die
> Überschrift ohne „Rx —“.

Spec: `docs/superpowers/specs/2026-11-13-detail-cook-redesign-design.md`. Design-Quelle:
`docs/design/redesign/README.md` §1.6 und §2 sowie das Mockup `docs/design/redesign/app.js` (`detailBody`, `S.cook`).

Labels: `agent-ready`, `alpha`, `ui`, `redesign`. Das Backend blockiert keines der Issues.
Statt CI laufen lokale Checks (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`,
`npm run format:check`, `npm run lint`.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| R1 | Rezept-Detail: Kopf, Aktionen und Größe in der URL | – | R4 |
| R2 | Rezept-Detail: Abschnitte im neuen Layout | R1 | R4, R5 |
| R3 | Rezept-Detail: Galerie in einer Reihe | R2 | R4, R5 |
| R4 | Koch-Modus: Vollbild-Seite Schritt für Schritt | R1 | R2, R3 |
| R5 | Koch-Modus: Zutaten, Größe und Abhaken | R4 | R2, R3 |

R1, R2 und R3 ändern alle `RecipeDetail.tsx` und laufen deshalb nacheinander.

---

## R1 — Rezept-Detail: Kopf, Aktionen und Größe in der URL

Labels: agent-ready, alpha, ui, redesign · Hängt ab von: –

### Context
Spec, Abschnitte „Detail“ und „Geteilter Zustand“. Heute hält `src/pages/RecipeDetail.tsx` den Faktor und die
Häkchen in lokalem `useState`. Der Kopf besteht aus Titel (`font-display text-4xl`), einer Steuerzeile mit Abhaken,
Wachhalten und `PortionScaler` und darunter dem Bilderblock `RecipeImages`.

### Goal
Der Kopf folgt dem Redesign. Größe und Häkchen liegen so, dass der Koch-Modus (R4/R5) sie mitnutzt.

### Behaviour
- **Layout:**
  - Ab 1100 px stehen Hauptbild (4:3) und Infos nebeneinander, darunter wird gestapelt (Maße in der Spec).
  - Ohne Foto gibt es keinen Hero: Der Text-Kopf ist max. 720 px breit, der Titel 32 px groß.
  - Das Hauptbild öffnet die Lightbox ab Bild 1. Die Galerie bleibt bis R3 vorerst, wie sie ist, aber ohne das
    Hauptbild.
- **Reihenfolge der Infos:** Kategorie-Chips → Titel (26 px / 650) → Meta-Zeile → Tags → Notizen → Aktionszeile.
  - Meta-Zeile: Sterne, Zeit, „von <Besitzer>“ oder „mit <Name>“, die Namen kommen aus dem Katalog.
  - Notizen: als `ul` ohne Icon, 14 px, muted.
  - Aktionszeile: Stepper, Abhaken und Wachhalten, rechts der Primärknopf „Kochen“. Der Knopf entfällt, wenn alle
    Abschnitte zusammen keinen Schritt haben, und verlinkt auf `/recipes/:id/cook` mit dem Größen-Parameter.
  - Leere Teile entfallen ohne Leerzeile.
- **Aktionen oben:**
  - Aus „Duplizieren“ wird „Kopie erstellen“ (Icon mit Tooltip).
  - „Bearbeiten“ bekommt, wer bearbeiten darf; Löschen bleibt dem Besitzer.
  - Auf dem Handy gibt es nur Icons mit 40 px. Wer nur ansehen darf, bekommt statt des Stifts „Kopie erstellen“.
- **Größe in der URL:**
  - `?servings=<n>` gilt für Portionen-Rezepte, `?factor=<x>` für Rezepte mit fester Größe. Ungültige oder fehlende
    Werte bedeuten Faktor 1.
  - Der Stepper schreibt mit `replace`. Parsen und Serialisieren erledigt eine reine Funktion mit Tests, z. B. in
    `src/cook/size.ts`.
- **Häkchen:** Neuer In-Memory-Store `src/cook/checkedIngredients.ts`:
  - Pro Rezept-ID ein Set, gelesen über `useSyncExternalStore`.
  - Öffnet man ein anderes Rezept, wird der Store geleert; ein Reload leert ihn ohnehin.
  - Es gibt kein Web Storage.
  - Der Zustand, ob Abhaken an ist, gehört dazu.

### Acceptance criteria
1. Rezept mit Foto: Unterhalb von 1100 px ist das Layout gestapelt, ab 1100 px zweispaltig. Ein Test prüft die Klassen
   oder die Struktur.
2. Rezept ohne Foto: Es gibt kein Bild-Element und keinen Platzhalter, und der Titel ist größer.
3. „Kochen“ ist bei einem Rezept ohne Schritte nicht vorhanden, sonst verlinkt es auf `/recipes/:id/cook?servings=…`.
   Je ein Test.
4. Der Stepper schreibt `?servings`/`?factor`, und ein Reload mit dem Parameter zeigt die skalierten Mengen. Die
   Parse-Funktion hat Tests: ungültig, 0, negativ, Werte außerhalb der Reihe.
5. Häkchen bleiben erhalten, wenn ein anderes Element neu gerendert wird. Nach dem Wechsel auf ein anderes Rezept sind
   sie leer. Es gibt keinen `localStorage`- oder `sessionStorage`-Zugriff (Test mit Spy).
6. Viewer auf dem Handy sehen „Kopie erstellen“ statt des Stifts, Editoren den Stift (Test).
7. Bestehende Detail-Tests sind angepasst (`RecipeDetail.*.test.tsx`), und „Duplizieren“ heißt überall
   „Kopie erstellen“.
8. Die vier Zustände bleiben erhalten (Laden als Skelett in Kopfform, Fehler). Es gibt nur postxl-Bedienelemente und
   keine Inline-Styles.
9. Die lokalen Checks sind grün, alle fünf, und die PR-Beschreibung sagt das.

### Non-goals
Abschnitte (R2), Galerie (R3), Koch-Modus (R4/R5), Teilen.

### Affected areas
`src/pages/RecipeDetail.tsx` (+Tests), `src/components/recipe/PortionScaler.tsx`, `src/components/recipe/RecipeImages.tsx`,
neu `src/cook/size.ts`, `src/cook/checkedIngredients.ts` (+Tests), `CLAUDE.md`/`docs/architecture.md` (Ordner
`src/cook/` kurz nennen).

---

## R2 — Rezept-Detail: Abschnitte im neuen Layout

Labels: agent-ready, alpha, ui, redesign · Hängt ab von: R1

### Context
Spec, Abschnitt „Abschnitte“. Heute nutzt `src/components/recipe/SectionBlock.tsx` das Raster
`minmax(0,1fr) / minmax(0,1.55fr)` ab `md`, einen Titel in `font-display text-2xl` und Schrittnummern als „1.“.

### Goal
Die Abschnitte entsprechen dem Redesign.

### Behaviour
- Ab 1024 px (`lg:`) gilt `2fr 3fr` mit 40 px Abstand, darunter gestapelt mit 24 px. Zwischen den Abschnitten liegen
  40 px (`mt-10`).
- Spaltentitel „Zutaten“ / „Zubereitung“: 12 px / 600, muted.
- Abschnittstitel 19 px / 650, nur wenn es mehr als einen Abschnitt gibt und dieser einen Namen hat.
- Schrittnummern stehen in runden Kreisen mit `tabular-nums`. Zutaten und Schritte haben 15 px (Token aus der
  Text-Skala).
- Timer-Chips, Abhaken und skalierte Mengen bleiben, wie sie sind.

### Acceptance criteria
1. Ein Rezept mit einem benannten Abschnitt zeigt keinen Abschnittstitel, eines mit zwei benannten Abschnitten zeigt
   beide (Test).
2. Beide Spaltentitel sind vorhanden. Die Schrittnummern zählen über die Abschnitte weiter wie heute (`stepOffset`,
   Test).
3. Timer-Chips und Abhaken funktionieren unverändert, die bestehenden Tests sind grün.
4. Kein handgesetztes `text-[…]` neben den Tokens der Text-Skala, es sei denn, kein Token passt. Es gibt keine
   Inline-Styles.
5. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Galerie, Koch-Modus, Zuordnung von Schritt zu Zutat.

### Affected areas
`src/components/recipe/SectionBlock.tsx`, `src/components/recipe/IngredientLine.tsx`, `src/components/recipe/StepText.tsx`
(nur Darstellung), die zugehörigen Tests.

---

## R3 — Rezept-Detail: Galerie in einer Reihe

Labels: agent-ready, alpha, ui, redesign · Hängt ab von: R2

### Context
Spec, Abschnitt „Galerie“. `src/components/recipe/RecipeImages.tsx` zeigt heute Hauptbild und Kacheln in einem Block.
Nach R1 steht das Hauptbild im Kopf.

### Goal
Die weiteren Bilder stehen als Galerie in genau einer Reihe unter den Abschnitten.

### Behaviour
- Überschrift „Fotos“ mit der Anzahl aller Bilder (Hauptbild und Galerie).
- Ab 761 px vier Kacheln, darunter drei. Die Kacheln sind 1:1 mit 8 px Abstand.
- Gezeigt werden alle Bilder in Viewer-Reihenfolge. Gibt es mehr Bilder als Kacheln, trägt die letzte sichtbare
  Kachel „+N“ mit N = Gesamtzahl − sichtbare Kacheln + 1. Ein Klick darauf öffnet die Lightbox ab diesem Bild.
- Jede Kachel öffnet die Lightbox ab ihrem Bild.
- Ohne Foto gibt es keine Galerie und keine Überschrift. Bei nur einem Bild (dem Hauptbild) ebenfalls keine Galerie.

### Acceptance criteria
1. 6 Bilder auf dem Desktop: Es gibt 4 Kacheln, die 4. trägt „+3“ und öffnet die Lightbox bei Index 3. Auf dem Handy
   gibt es 3 Kacheln und „+4“ (Tests über `matchMedia`-Mock oder getrennte Rendervarianten).
2. 3 Bilder: 3 Kacheln ohne „+N“. 1 Bild: keine Galerie (Tests).
3. Die Lightbox ist unverändert, ihre Tests sind grün.
4. Die Kacheln haben aussagekräftige `aria-label`s, z. B. „Foto 2 groß ansehen“ und „Alle 6 Fotos ansehen“.
5. Die lokalen Checks sind grün, alle fünf.

### Affected areas
`src/components/recipe/RecipeImages.tsx` (+Test), `src/pages/RecipeDetail.tsx`.

---

## R4 — Koch-Modus: Vollbild-Seite Schritt für Schritt

Labels: agent-ready, alpha, ui, redesign · Hängt ab von: R1

### Context
Spec, Abschnitt „Koch-Modus“. Bisher gibt es keine eigene Ansicht. `RequireAuth`
(`src/components/shell/RequireAuth.tsx`) setzt jede geschützte Route in die `AppShell`, und der Timer-Knopf
(`TimerPanel`) und der `TimerPanelProvider` liegen in der `AppShell`.

### Goal
`/recipes/:id/cook` führt im Vollbild durch alle Schritte des Rezepts.

### Behaviour
- **Route und Rahmen:**
  - Die Route liegt hinter `RequireAuth`, aber ohne Shell. Dafür bekommt `RequireAuth` eine Variante ohne Shell, oder
    die Shell eine Route-Gruppe.
  - Timer-Provider und `TimerPanel` stehen im Kopf zur Verfügung.
- **Kopf:** ✕, Titel, Unterzeile „<Abschnitt> · Schritt x von y“ (über alle Abschnitte gezählt), Wachhalten-Schalter und
  Timer-Knopf. Darunter ein Fortschrittsbalken von 3 px.
- **Wake Lock:** Beim Öffnen ist er an (`useWakeLock(true)`), der Schalter macht ihn aus, beim Verlassen wird er
  freigegeben.
- **Schritt:**
  - Überschrift „Schritt n“, darunter der Text mit Timer-Chips (`StepText`, Label „<Rezept> · Schritt n“). Größen und
    Abstände stehen in der Spec.
  - Darunter „Danach“ mit dem nächsten Schritt. Beim Wechsel des Abschnitts steht dessen Name davor, im letzten
    Schritt entfällt der Block.
- **Fuß:**
  - „Zurück“ ist im ersten Schritt deaktiviert.
  - In der Mitte Punkte, bei mehr als 12 Schritten „x / y“.
  - Rechts „Weiter ›“, im letzten Schritt „Fertig“ mit Haken.
  - Tastatur: ← und → blättern, Esc beendet.
- **Beenden:** ✕, „Fertig“ und Esc führen mit `navigate(-1)` zurück, wenn es einen Verlauf in der App gibt (über
  `useHasAppHistory`). Sonst geht es zu `/recipes/:id` mit dem Größen-Parameter.
- **Zustände:**
  - Laden: ein Skelett in Schrittform.
  - Fehler: `RetryAlert`.
  - Ohne Schritte: Leerzustand „Dieses Rezept hat noch keine Schritte.“ mit „Zum Rezept“ und, bei Bearbeitungsrecht,
    „Bearbeiten“, ohne Balken und ohne Fuß.
- **Seitentitel:** „Kochen: <Rezept>“.

### Acceptance criteria
1. `/recipes/:id/cook` rendert ohne Seitenleiste und ohne Tab-Leiste und ist ohne Anmeldung nicht erreichbar (Tests).
2. Ein Rezept mit 2 Abschnitten (3 + 2 Schritte) zeigt „Schritt 4 von 5“ und den Namen des zweiten Abschnitts. „Danach“
   im 3. Schritt trägt den Namen des zweiten Abschnitts als Präfix (Test).
3. Weiter, Zurück und die Pfeiltasten blättern. Im ersten Schritt ist „Zurück“ deaktiviert, im letzten steht „Fertig“
   statt „Weiter“ (Tests).
4. Esc, ✕ und „Fertig“ gehen mit Verlauf zurück und ohne Verlauf zu `/recipes/:id` (Tests).
5. Ein Timer-Chip im Schritt startet einen Timer mit dem Label „<Rezept> · Schritt n“, und der Timer-Knopf ist sichtbar
   (Test).
6. Der Wake Lock wird beim Öffnen angefordert und beim Verlassen freigegeben (Test mit Mock).
7. Bei mehr als 12 Schritten steht „x / y“ statt der Punkte (Test).
8. Die Zustände Laden, Fehler und ohne Schritte sind getestet. Es gibt nur postxl-Bedienelemente und keine
   Inline-Styles.
9. `docs/architecture.md` §5 (Routing) nennt die neue Route. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Zutaten-Spalte, Sheet, Größe und „Dafür“ (alles R5). Der aktuelle Schritt kommt nicht in die URL. Teilen.

### Affected areas
`src/App.tsx`, `src/components/shell/RequireAuth.tsx`/`AppShell.tsx`, neu `src/pages/CookMode.tsx` (+Tests), neu
`src/cook/steps.ts` (flache Schrittliste mit Abschnitt, reine Funktion mit Tests), `src/hooks/useWakeLock.ts`,
`src/timers/TimerPanel*`, `docs/architecture.md`.

---

## R5 — Koch-Modus: Zutaten, Größe und Abhaken

Labels: agent-ready, alpha, ui, redesign · Hängt ab von: R4

### Context
Spec, Abschnitte „Koch-Modus / Zutaten“, „Geteilter Zustand“ und Entscheidung 4. R1 hat `src/cook/size.ts` und
`src/cook/checkedIngredients.ts` eingeführt, R4 die Seite `src/pages/CookMode.tsx`.

### Goal
Der Koch-Modus zeigt die Zutaten skaliert und abhakbar, mit denselben Werten wie das Detail.

### Behaviour
- **Zutaten-Spalte ab 1024 px:**
  - 280 px breit, ab 1280 px 320 px, mit `border-r`.
  - Oben `PortionScaler`, er liest und schreibt `?servings` bzw. `?factor` wie im Detail.
  - Darunter alle Zutaten nach Abschnitten (Abschnittsname wie im Detail), abhakbar. Abgehakt heißt durchgestrichen
    und muted.
- **Unter 1024 px:** Der Knopf „Zutaten“ im Kopf öffnet ein `BottomSheet` mit demselben Inhalt.
- **„Dafür“:** In der Hauptspalte unter dem Schritt stehen die Zutaten des Abschnitts, zu dem der Schritt gehört, als
  Chips mit skalierten Mengen. Abgehakte Zutaten erscheinen auch dort muted. Hat der Abschnitt keine Zutaten, entfällt
  der Block.
- **Häkchen:** Sie kommen aus `checkedIngredients` und gelten für Detail und Koch-Modus gemeinsam. Sie liegen nur im
  Speicher; beim Wechsel auf ein anderes Rezept oder bei einem Reload sind sie weg.
- „Kochen“ im Detail und das Beenden des Koch-Modus nehmen den Größen-Parameter mit.

### Acceptance criteria
1. Desktop (≥ 1024 px) zeigt die Spalte, darunter steht der Knopf „Zutaten“, und das Sheet öffnet sich (Tests).
2. `?servings=8` bei einem 4-Portionen-Rezept zeigt doppelte Mengen in der Spalte und in „Dafür“. Eine Änderung am
   Stepper schreibt die URL (Test).
3. Im Detail abgehakt, dann „Kochen“: Die Zutat ist im Koch-Modus abgehakt, und nach ✕ ist sie im Detail weiterhin
   abgehakt. Nach dem Öffnen eines anderen Rezepts ist sie es nicht mehr (Test).
4. Kein Zugriff auf `localStorage`/`sessionStorage` für Häkchen (Test mit Spy).
5. „Dafür“ im Schritt eines Abschnitts ohne Zutaten erscheint nicht (Test).
6. Es gibt nur postxl-Bedienelemente und keine Inline-Styles. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Eine Zuordnung von Schritt zu Zutat oder eine Hervorhebung „für diesen Schritt“. Mengen im Schritttext skalieren.

### Affected areas
`src/pages/CookMode.tsx` (+Tests), neu `src/components/cook/` (Zutaten-Spalte, Sheet, „Dafür“),
`src/components/recipe/IngredientLine.tsx`, `src/components/recipe/PortionScaler.tsx`, `src/components/BottomSheet.tsx`.
