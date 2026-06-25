# Phase 2 — Organisation & Navigation (Spec — in Arbeit)

> ⚠️ **Logik/Datenseitig implementierungsreif — nur Visuelles offen.** Dieses
> Spec entstand inkrementell, während [Phase 1](./phase-1-rezepte-ansehen.md)
> lief. Alle **entkoppelten** Entscheidungen (Logik, Datenmodell, State, Scope)
> sind jetzt festgezurrt; offen bleibt nur das **Visuelle/Layout**, das bewusst
> **nach Phase 1** kommt — sobald die real gerenderte Liste vorliegt und wir
> darauf aufsetzen können.
>
> **Entschieden (Logik/Daten/State) — siehe jeweiligen Abschnitt:**
> - **A — Filtern/Suchen/Sortieren:** Facetten + UND/ODER-Verknüpfung, Sortierung,
>   Counts, Such-Semantik, Empty-Zustand, Client-seitig → [§A](#a--filtern--suchen--sortieren--entschieden). ✅
> - **D — Rollen-Modi:** Zwei-Achsen-Modell, gültige Zellen, Relax-Verhalten → [§D](#d--rollen-modi-filter-nach-rolle--entschieden). ✅
> - **Rating-Sichtbarkeit** (kollaborationsabhängig: eigenes Rating vs. Durchschnitt) → [§Rating-Sichtbarkeit](#rating-sichtbarkeit-kollaborationsabhängig--entschieden). ✅
> - **Rollen-/Collaboration-Indikator** in der Listenzeile (zwei Glyphen, Farbe verstärkt) → [§Indikator](#rollen-collaboration-indikator-listenzeile--kodierung-entschieden). ✅
> - **State / URL / Persistenz** → [§State](#state--url--persistenz--entschieden). ✅
> - **Zutaten-Filter-Quelle** → [§Zutaten-Quelle](#zutaten-filter-quelle--entschieden). ✅
> - **Mock-Ausbau** (Voraussetzung, damit D/Suche/Sort sichtbar werden) → [§Mock-Ausbau](#mock-ausbau--stand--restlücke). ✅
>
> **Noch offen — alles visuell/benennend, nach Phase 1:**
> - **Layout/Design** — Sidebar, Filter-Leiste, Zeilen- & Ansichts-Varianten,
>   Mobile-Drawer. Baut auf der in Phase 1 entstehenden Liste auf.
> - **C — Listen-Ansichten** (`detailed ↔ compact`, `by category ↔ flat`):
>   Anatomie, einklappbare Gruppen, Default-Ansicht. Logik-Rahmen steht ([§C](#c--listen-ansichten)).
> - **Achse-1-Label-Wortlaut** der Rollen-Modi + single-/multi-select je Achse
>   (Annahme: single + `Any`). Grau-Tooltip = optionale Politur.
> - Diverse **Protokoll-/Backend-Fragen** — siehe `../plan.md` „Offene Punkte".
>
> **Implementierungs-Startpunkt:** Branch **`phase-1-rezepte-ansehen`** (enthält
> die Phase-1-App *und* die 14 Mock-Rezepte aus PR #3) — **nicht** `main`
> abzweigen. Phase 2 baut direkt auf Phase 1 auf.

## Scope

Phase 2 = **A + C + D**. Das **Dashboard/Startseite** ist herausgelöst zu
**Phase 5** (backend-blockiert auf fehlende Timestamps), siehe `../plan.md`.

- **A — Filtern / Suchen / Sortieren** über die Liste (Kategorie-Sidebar,
  Tag-Filter, Volltext, Sortierung).
- **C — Listen-Ansichten** (umschaltbar: `detailed/compact`, `by-category/flat`).
- **D — Rollen-Modi** (Filter nach der Rolle des aktuellen Users).

---

## D — Rollen-Modi (Filter nach Rolle) ✅ entschieden

Ersetzt die frühere flache, überlappende 5-Modi-Liste (`all / editable / shared
/ provided / private`) durch ein **Zwei-Achsen-Modell**. Beide Achsen sind aus
`recipe.owner` / `recipe.viewers` / `recipe.editors` und `CURRENT_USER_ID`
ableitbar — **kein Backend nötig**.

### Die zwei Achsen

**Achse 1 — meine Rolle** (`owner` / `editor` / `viewer`): beantwortet „darf ich
das bearbeiten?".

- `owner` — `recipe.owner === CURRENT_USER_ID`
- `editor` — ich stehe in `recipe.editors` (und bin nicht owner)
- `viewer` — ich stehe in `recipe.viewers` (und bin weder owner noch editor)

**Achse 2 — Collaboration** (Sharing-Zustand des Rezepts, unabhängig von mir):

- **Private** — keine viewers, keine editors (nur der owner hat Zugriff)
- **Shared** — es gibt viewers, aber keine weiteren editors (andere dürfen nur
  **lesen**)
- **Collaborative** — mindestens ein editor außer dem owner (andere dürfen
  **mitbearbeiten**)

Benennung bewusst **englisch**, mit „Collaboration"-Stamm als Anker. `Shared`
ist eindeutig, weil es *zwischen* Private und Collaborative steht = read-only
rausgegeben. (Eindeutige Alternative fürs Mittelfeld, falls je nötig:
`Read-only`.)

Jede Achse hat zusätzlich **`Any`** (= „egal"). `Any × Any` ist der frühere
„all"-Modus.

### Gültige Kombinationen (3 × 3)

Die Achsen sind **nicht unabhängig** — meine Rolle erzwingt teils den
Sharing-Zustand:

- bin ich `editor` ⇒ es gibt editors ⇒ zwingend `Collaborative`.
- bin ich `viewer` ⇒ es gibt viewers ⇒ nie `Private` (mindestens `Shared`).

| Rolle ↓ \ Collaboration → | **Private** | **Shared** | **Collaborative** |
|---|---|---|---|
| **owner** | ✅ persönliches Rezept | ✅ read-only rausgegeben | ✅ meins, co-editiert |
| **editor** | ❌ Widerspruch | ❌ Widerspruch | ✅ mit mir zum Mitbearbeiten geteilt |
| **viewer** | ❌ Widerspruch | ✅ read-only mit mir geteilt | ✅ read-only, aber kollaborativ gepflegt |

**6 von 9 gültig, 3 logisch unmöglich.** Die unmöglichen Zellen folgen aus
echten Widersprüchen, nicht aus Designgeschmack → die UI braucht **keine**
willkürlichen Prioritätsregeln, um Überlappungen aufzulösen.

### Darstellung & Interaktion — Variante (a)

Beide Achsen als sichtbare Controls (z.B. zwei segmented controls), inklusive
`Any`.

- **Ungültige Zellen werden ausgegraut**, bleiben aber **klickbar**.
- **Klick auf eine ausgegraute Option → „letzter Klick gewinnt":** die
  *Schwester-Achse* wird auf `Any` zurückgesetzt (relaxed) — **nicht** geraten.
  Beispiel: Rolle = `editor`, Klick auf `Private` → Rolle springt auf `Any`,
  Collaboration = `Private`. Keine Sackgasse, kein Intent-Raten.
- **Grau bedeutet nur *logisch* unmöglich.** Eine gültige, aber gerade **leere**
  Kombination (0 Treffer) wird **nicht** gesperrt, sondern als **„0"** angezeigt
  — sonst verwischt die Bedeutung von Grau.
- **Tooltip** (warum ausgegraut) ist **optionale Politur**: das Relax-Verhalten
  lehrt die Regel schon beim Tun. Erst nachrüsten, wenn sich im echten Gebrauch
  Bedarf zeigt.

### Offen in D (nur noch visuell/benennend)

> - **Single- vs. multi-select je Achse.** Annahme: **single-select je Achse mit
>   `Any`** (deckt „all" ab). Final beim Layout-Schliff nach Phase 1.
> - **Achse-1-Label-Wortlaut** ebenfalls dort.
> - Beide ändern die Logik nicht — nur die Control-Form.

---

## Rating-Sichtbarkeit (kollaborationsabhängig) ✅ entschieden

Wer welche Bewertung sieht, hängt vom **Collaboration-Zustand** ab (Achse 2 aus
[§D](#d--rollen-modi-filter-nach-rolle--entschieden)) — Bewertungen sind in
nicht-kollaborativen Rezepten **privat pro Rater**:

- **Private & Shared (nicht-kollaborativ):** jeder sieht **nur die eigene**
  Bewertung — **kein** Durchschnitt, **keine** fremden Ratings.
- **Collaborative:** jeder sieht den **Gesamtdurchschnitt** über alle
  Bewertungen (gepoolt).

**Konsequenz fürs Frontend (verfeinert Phase 1):**

- Neuer reiner Helfer in `views.ts`, z.B.
  `visibleRating(recipe, currentUserId): number | null` → bei Private/Shared das
  **eigene** Rating, bei Collaborative der **Durchschnitt** (`averageRating`);
  `null`, wenn nichts anzuzeigen ist (nicht selbst bewertet bzw. keine Ratings).
  Ersetzt den pauschalen `averageRating`-Aufruf an den Anzeigestellen.
- **Liste (`RecipeRow`):** das `★ <Zahl>` nutzt `visibleRating` (eigenes Rating
  bzw. Durchschnitt), statt immer den Durchschnitt zu zeigen.
- **Detail (`Rating`-Popover):**
  - Private/Shared → nur **„Deine Bewertung"**, **kein** Breakdown (es gibt
    nichts Fremdes zu zeigen).
  - Collaborative → **Durchschnitt** als Kopf; der Phase-1-Breakdown nach Rolle
    bleibt **nur hier** sinnvoll (einziger Kontext, in dem fremde Ratings
    sichtbar sind). Ob der Breakdown auch dort gezeigt wird, ist eine kleine
    Layout-Wahl (Default: ja).
- **Defensiv:** liefert das Backend für nicht-kollaborative Rezepte trotzdem
  fremde Ratings mit, **filtert** das Frontend sie für die Anzeige weg — nie mehr
  zeigen, als die Regel erlaubt.

> **Backend-/Protokoll-Implikation:** idealerweise sendet das Backend fremde
> Ratings für nicht-kollaborative Rezepte gar nicht erst mit (Privacy an der
> Quelle). Gehört zu den „Offene Punkte" in `../plan.md`, mit dem Backend-Team
> zu klären.

---

## Rollen-/Collaboration-Indikator (Listenzeile) ✅ Kodierung entschieden

Man soll **ohne Detail-View** sehen, welche **Rechte/Rolle** man an einem Rezept
hat und ob es **Shared/Collaborative** ist. Dafür pro Zeile **zwei kleine
Glyphen**, die genau die zwei [§D](#d--rollen-modi-filter-nach-rolle--entschieden)-Achsen
spiegeln — gespeist aus denselben reinen Helfern wie der §D-Filter
(`myRole(recipe, currentUserId)` / `collaborationState(recipe)` in `views.ts`,
wiederverwendet — **kein neues Datenmodell**).

**Kodierung — zwei Glyphen, Farbe verstärkt:**

- **Rolle** (Icon, „darf ich bearbeiten?"): `owner` / `editor` / `viewer`.
- **Collaboration** (Icon **+ Farbe**, „wer noch?"): **Private** (grau) /
  **Shared** (blau) / **Collaborative** (grün).
- Icon-Vorschlag (lucide, final beim Layout): owner `Crown`, editor `Pencil`,
  viewer `Eye`; Private `Lock`, Shared `Users`, Collaborative `Network`.

**Regeln:**

- **Farbe ist nie der alleinige Kanal** (Farbsehschwäche): die Bedeutung tragen
  **Icon + Tooltip** (Klartext, z.B. „Bearbeiter · kollaborativ"); Farbe nur als
  Verstärkung fürs schnelle Scannen.
- Beide Glyphen **immer** zeigen (auch owner/Private) — konsistente
  Zeichensprache, kein „mal da, mal weg".
- Collaboration-Farben als eigene **Tokens** (grau/blau/grün); falls sie je
  Theme variieren müssen, über die übliche `theme.css`→`styles.css`-Brücke
  light/dark-fähig (siehe CLAUDE.md).
- Konsistenz mit §D: dieselben drei Collaboration-Farben kann das §D-Control
  wiederverwenden (ein Vokabular für Filter *und* Zeilen-Indikator).

**Offen (Layout, nach Phase 1):** genaue Icons, Platzierung (Cluster bei Titel/
Tags vs. am Thumbnail), Größe; ob die **`compact`-Ansicht** (§C) die Glyphen
verdichtet — sie darf die *Darstellung* straffen, nicht die *Kodierung* ändern.

---

## A — Filtern / Suchen / Sortieren ✅ entschieden

Mehrere Verengungen wirken gleichzeitig auf die Liste. **Facetten kombinieren
untereinander als UND** (Schnittmenge): ein Rezept wird gezeigt, wenn es *jede*
aktive Facette erfüllt. *Innerhalb* einer Facette gilt die jeweils notierte
Verknüpfung (Tags/Zutaten UND, Kategorie ODER).

**Alles client-seitig:** Filtern, Suchen und Sortieren laufen über das einmal
geladene `listRecipes()`-Array — kein Server-Query, kein Refetch pro Facette.
(Skaliert für die absehbare Rezeptzahl problemlos; Server-seitige Queries/
Pagination wären eine spätere, separate Entscheidung.)

### Facetten

1. **Kategorie** (Sidebar, `userCategory`) — **Multi-select, ODER-verknüpft:**
   ein Rezept matcht, wenn seine `id` in `userCategory.recipes` **irgendeiner**
   gewählten Kategorie liegt. (`UserCategory.recipes: RecipeId[]` — ein Rezept
   kann in mehreren Kategorien sein.) Das ist die **eine bewusste Ausnahme** von
   „innerhalb UND": Kategorien intern ODER (Schnittmengen von Kategorien sind
   unintuitiv, und ODER spielt sauber mit der `by-category`-Gruppierung — mehrere
   Gruppen sichtbar). Als *Facette* bleibt Kategorie weiter **UND** mit Tags/
   Zutaten/Dauer/Rolle/Suche. Jede Kategorie zeigt einen **statischen Zähler**
   (`userCategory.recipes.length`, ungefiltert — billig).
2. **Tags** — Mehrfachauswahl, **UND** verknüpft (Rezept muss *alle* gewählten
   Tags haben).
3. **Zutaten** — Mehrfachauswahl **UND** verknüpft. Match: Rezept hat je ein
   `RecipeIngredient` mit passender `ingredient.id`. Reine Freitext-Zutaten
   (`ingredient === null`) sind nicht filterbar. **Quelle der Auswahlliste:**
   siehe [§Zutaten-Quelle](#zutaten-filter-quelle--entschieden) (Katalog als
   Namens-Quelle, angeboten nur die tatsächlich verwendeten Zutaten).
4. **Dauer** — **Max-Schwellwert („bis")** auf **`workMinutes`** (kein Range; ein
   „von" hat real keinen Nutzen). `overallMinutes` als sekundäre, weniger
   prominente Option (Umschalter „auf Gesamtzeit"). Rezepte mit
   `workMinutes === null` fallen bei aktivem Filter raus („unbekannt" ≠ „≤ X").
   Filtert die **rohen** Minuten-Felder, nicht den gerenderten `time`-String.
5. **Rollen-Modi** — siehe [§D](#d--rollen-modi-filter-nach-rolle--entschieden);
   zählt als eine weitere UND-Facette.
6. **Volltext-Suche** — durchsucht **`recipe.name` (Titel) + `Section.name`
   (Abschnitts-Subtitel) + Tag-Namen**, ODER-verknüpft über diese Felder. Tags
   sind dabei, weil billig & bequem (tippen statt Tag-Filter öffnen) — kein
   Konflikt mit dem präzisen Tag-Filter. **Bewusst NICHT durchsucht:**
   Zutatennamen (dafür der strukturierte Zutaten-Filter) und Schritt-Text.

### Counts an Optionen

- **Rollen-Grid (§D):** **Live-Counts** — jede gültige Zelle zeigt ihre
  Trefferzahl gegen die übrigen aktiven Facetten; das trägt die „0-vs-grau"-
  Unterscheidung (gültig-aber-leer = „0", logisch unmöglich = grau).
- **Kategorien:** **statischer** Zähler (`recipes.length`, ungefiltert).
- **Tags / Zutaten:** **keine** Zähler — schlichte Multi-Select-Toggles.
- (Volle faceted counts über *alle* Facetten wären schöner, aber spürbar mehr
  Rechen-/Datenfluss-Aufwand — bewusst nicht in Phase 2.)

### Sortierung ✅

- Optionen: **Name** (A–Z) · **`workMinutes`** (↑) · **`overallMinutes`** (↑) ·
  **Rating** (↓; `averageRating` aus `views.ts`).
- Default: **Name A–Z**. Richtung je Option umschaltbar.
- Rezepte mit `null` im Sortierfeld **ans Ende** (in beide Richtungen).
- (`overallMinutes` ergänzt, passend dazu, dass der Dauer-Filter beide
  Minuten-Felder kennt. „Zuletzt erstellt" wäre wünschenswert, ist aber auf
  fehlendes `createdAt` blockiert — siehe `../plan.md` / Phase 5.)

### Such-Semantik

- **Teilstring**, **case-insensitiv** und **diakritik-insensitiv** (z.B. „apfel"
  matcht „Apfelkuchen", „creme" matcht „Crème").
- Durchsucht **`recipe.name` + `Section.name` + Tag-Namen**, **ODER** über diese
  Felder. **Nicht** durchsucht: Zutatennamen (dafür der Zutaten-Filter) und
  Schritt-Text.

### Empty-Zustand (gefiltert leer)

Wenn aktive Facetten alles ausschließen, **nicht** das Phase-1-Empty
(„Noch keine Rezepte") zeigen, sondern einen eigenen Treffer-leer-Hinweis
(„Keine Treffer") **plus „Filter zurücksetzen"** (leert alle Facetten + Suche →
URL/State neutral). Unterscheidet „du hast keine Rezepte" von „dein Filter ist
zu eng".

---

## State / URL / Persistenz ✅ entschieden

**Zwei Schichten**, damit gefilterte Sichten *teilbar* sind **und** ein frisches
Öffnen nicht bei null beginnt:

- **URL-Query** = die **aktive, teilbare** Sicht (Deep-Link, Back-Button, F5-fest).
  React Router ist schon da. Hier liegen Filter, Sortierung, Ansicht **und** die
  Suche (solange aktiv).
- **`localStorage`** = der **letzte Zustand** fürs frische Öffnen.

**Vorrang beim Laden:**

- **URL hat Query-Params** (man folgt einem geteilten/Deep-Link) → **URL gewinnt**;
  dieser Zustand wird zugleich in `localStorage` geschrieben.
- **URL ist nackt** (man öffnet `/` frisch) → aus `localStorage` **hydrieren** und
  in die URL **spiegeln**.

**Was persistiert** (localStorage): strukturierte Filter (Kategorie, Tags,
Zutaten, Dauer, Rollen-Modi) **+ Sortierung + Ansicht** (`detailed/compact`,
`by-category/flat`).

**Was NICHT persistiert:** die **Volltext-Suche** — startet beim Öffnen immer
leer (ein wiederhergestellter alter Suchbegriff fühlt sich wie „wo sind meine
Rezepte?" an). Sie ist aber, *während sie aktiv ist*, in der URL und damit
teilbar.

**Key & Robustheit:** `foodly:list-state:<userId>` (nach aktuellem User
benannt — zukunftssicher für späteren Login) mit **Schema-Versionsfeld**; bei
Versions-Mismatch oder Parse-Fehler **verwerfen** (auf Defaults zurückfallen),
nicht crashen.

---

## Zutaten-Filter-Quelle ✅ entschieden

- Der **globale `Ingredient`-Katalog** wird im **`CatalogProvider`** geladen
  (`foodly.listIngredients()` → `ingredientsById`) — er ist die **kanonische**
  Quelle für id→Name (und später Icon/Einheit/Nährwerte, siehe `protocol.ts`).
  Das erweitert den Phase-1-`CatalogProvider` (lädt bisher nur Tags/Users/me) um
  einen vierten Katalog (gleiche Graceful-Degrade-Logik: Filter degradiert,
  Rezepte bleiben sichtbar).
- **Angeboten** werden im Filter aber **nur die Zutaten, die in ≥1 geladenen
  Rezept tatsächlich vorkommen** (Vereinigung der `ingredient.id` über
  `listRecipes()`), alphabetisch nach Katalog-Name. → keine toten Optionen, die
  immer 0 treffen.
- Match wie gehabt: Rezept hat ein `RecipeIngredient` mit passender
  `ingredient.id`; reine Freitext-Zutaten (`ingredient === null`) sind nicht
  filterbar.

---

## Mock-Ausbau — Stand & Restlücke

Voraussetzung, damit D / Suche / Sortierung / Zutaten-Filter real vorführbar
sind. **Stand auf `phase-1-rezepte-ansehen`** (PR #3, ids 1–14; User 1=Kolja,
2=Mara, 3=Jonas) — die meiste Arbeit ist schon da:

**Rollen×Collaboration-Abdeckung für Kolja (User 1):**

| Zelle | # Rezepte | Status |
|---|---|---|
| owner × Private | 4 (4, 5, 10, 12) | ✅ |
| owner × Shared | 3 (2, 6, 13) | ✅ |
| owner × Collaborative | 2 (1, 8) | ✅ |
| editor × Collaborative | 1 (11) | ✅ |
| viewer × Shared | 3 (3, 7, 9) | ✅ |
| **viewer × Collaborative** | **0** | ❌ **Lücke** |

`workMinutes`/`overallMinutes` sind durchgängig befüllt, Ratings gestreut (inkl.
0-Rating bei #4) — Suche/Sortierung sind damit greifbar.

**Noch zu tun:**

1. **Lücke `viewer × Collaborative` schließen:** ein Rezept, das **einem anderen
   User gehört**, Kolja als **viewer** führt **und** ≥1 weiteren **editor** hat
   (z.B. `owner: 2, editors: [3], viewers: [1]`). Damit sind alle **6** gültigen
   Zellen belegt.
2. **Cleanup Rezept 14** („Asiatische Gemüsepfanne"): aktuell fremd-owned,
   **Private**, ohne Kolja-Rolle (`none`) — ein echtes Backend würde Kolja so ein
   Rezept **nie ausliefern**. Entweder Kolja eine Rolle geben (z.B. als zweites
   `viewer × Collaborative`-Beispiel nutzen) **oder** entfernen. Kein Rezept im
   `listRecipes()`-Mock sollte für den aktuellen User rollenlos sein.
3. **Zutaten-Katalog** (`ingredients.json`) prüfen/befüllen, sodass die in den
   Rezepten referenzierten `ingredient.id` darin existieren (kanonische Namen für
   den Zutaten-Filter).
4. **Kategorien** (`categories.json`): genug Streuung, damit Multi-ODER und die
   `by-category`-Gruppierung (mehrere Gruppen, Mehrfach-Zugehörigkeit, „Ohne
   Kategorie") sichtbar werden.

Alle Mock-Erweiterungen müssen **typkonform zu `protocol.ts`** bleiben.

---

## C — Listen-Ansichten

> **Visuelle Anatomie noch offen** (nach Phase 1, baut auf der dort entstehenden
> Zeile/Liste auf): `detailed ↔ compact`, einklappbare `by-category`-Gruppen,
> Default-Ansicht.

**Logik-Rahmen steht** (entkoppelt, gilt schon jetzt):

- **`detailed ↔ compact`** und **`by-category ↔ flat`** sind **zwei
  orthogonale** Ansichts-Umschalter; beide werden persistiert (siehe §State).
- **`by-category` ist eine reine Ansichts-Gruppierung über die bereits
  gefilterte Menge** (orthogonal zur Kategorie-**Filter**-Facette in §A — nicht
  derselbe Mechanismus):
  - Rezepte werden unter **Kategorie-Überschriften** gruppiert.
  - Ein Rezept in **mehreren** Kategorien erscheint **in jeder** dieser Gruppen.
  - Rezepte **ohne** Kategorie kommen in einen **„Ohne Kategorie"**-Topf.
  - Ist die Kategorie-Filter-Facette aktiv, gruppiert `by-category` eben nur die
    durchgelassenen (ODER-) Kategorien — konsistent, kein Sonderfall.
- **`flat`** = die heutige Phase-1-Liste, nur eben gefiltert/sortiert.
