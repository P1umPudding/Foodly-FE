# Rezept-Editor als eigene Seite — Design

**Datum:** 2026-07-14
**Mockup:** `mockups/recipe-editor.html`, Vorschlag **A · Eigene Seite**
**Status:** entworfen, noch nicht umgesetzt

## Ziel

Rezepte anlegen und bearbeiten. Der Editor ist eine vollwertige Seite mit
eigener Route, kein Overlay und kein Inline-Modus auf der Rezeptseite.

Routen (englisch, wie die bestehende `/recipes/:id`):

- `/recipes/new` — neues Rezept
- `/recipes/:id/edit` — vorhandenes Rezept

## Was das Backend hergibt

Recherchiert in `foodly-backend` (Axum + sqlx, kein OpenAPI-Spec):

| Operation | Endpoint | Anmerkung |
| --- | --- | --- |
| Anlegen | `POST /recipes` | Body `CreateRecipe`, antwortet **200** (nicht 201) mit vollem `Recipe` |
| Ändern | `PUT /recipes/{id}` | derselbe Body, **Full Replace** |
| Bild | `POST /images` | **roher Binary-Body**, kein Multipart; PNG/JPEG/WEBP; ≤ 8 MiB; 201 `{id, hash, name}` |

(`DELETE /recipes/{id}` gibt es auch, wird hier aber nicht gebraucht — siehe
Bewusst nicht dabei.)

Zwei Einschränkungen prägen das ganze Design:

1. **`PUT` ist ein Full Replace.** Tags, Bilder und Sections werden serverseitig
   gelöscht und neu eingefügt. Section-, Zutaten- und Schritt-IDs sind über ein
   Update hinweg **nicht stabil**, und mitgeschickte verschachtelte `id`-Felder
   werden ignoriert (`skip_deserializing`).
2. **Tags und Zutaten sind Read-only-Kataloge.** Es gibt keinen Endpoint, um
   einen Tag oder eine Zutat anzulegen. Ein unbekannter Tag in einem Rezept
   führt zu 422 („Invalid reference").

Kein Draft-/Publish-Zustand im Backend — „Entwurf speichern" / „Veröffentlichen"
aus dem Mockup haben keine Entsprechung und entfallen.

## Architektur

Der Editor ist ein **lokales Formular mit Autosave im Hintergrund**. Der
Formularzustand ist die Wahrheit, solange bearbeitet wird; Serverantworten
werden **nie** in Felder zurückgemischt, in die gerade getippt wird — sie
können es gar nicht, weil `PUT` alle verschachtelten IDs neu vergibt.

```
/recipes/new              /recipes/:id/edit
      │                          │
      └──►    RecipeEditor   ◄───┘
                   │
        useRecipeDraft  (Formularzustand, client-seitige Row-Keys)
                   │
        useAutosave  ──debounced, koaleszierend, single-flight──►  foodly.updateRecipe (PUT)
```

### Zwei Modi in einer Seite

**`/recipes/new`** — der Entwurf lebt nur im Speicher, kein Autosave.
Fußleiste: *Verwerfen* (Formular wegwerfen, zurück zur Liste — serverseitig gibt
es nichts zu löschen) und *Anlegen* (`POST /recipes` →
`navigate('/recipes/{id}/edit', { replace: true })`). *Anlegen* ist deaktiviert,
solange `name` leer ist — das Backend lehnt einen leeren Namen mit 422 ab.

**`/recipes/:id/edit`** — lädt über `foodly.getRecipe(id)`, Autosave ist an.
Fußleiste: Speicherstatus + *Fertig* (→ `/recipes/{id}`). Kein *Verwerfen*, denn
die Änderungen sind per Definition längst gespeichert.

### Client-seitige Row-Keys

Jede Section, Zutat und jeder Schritt bekommt im Draft einen client-generierten
Key (ein simpler Zähler, **nicht** die Server-ID). Er dient als React-`key` und
als Identität beim Umsortieren. Genau das macht die ID-neuvergebenden `PUT`s
harmlos: Die Listen werden nie aus einer Serverantwort neu verschlüsselt.

### Autosave

`useAutosave` — Debounce ~800 ms nach der letzten Änderung; höchstens ein `PUT`
gleichzeitig unterwegs; Änderungen während eines laufenden Requests werden zu
**einem** Folge-`PUT` zusammengefasst; zusätzlich Flush bei `unmount` und bei
`visibilitychange`.

Status: `idle | saving | saved(at) | error`.

Bei Fehler behält das Formular die Eingaben, die Fußleiste zeigt „Nicht
gespeichert" + *Erneut versuchen*, und die nächste Änderung versucht es
automatisch erneut.

**Verlassen der Seite.** Die App hängt an `BrowserRouter` (kein Data Router), und
`useBlocker` funktioniert **nur** mit `createBrowserRouter`. Die App darauf
umzustellen ist hier nicht drin. Also:

- **Tab schließen / neu laden** → `beforeunload`-Handler, solange ein Speichern
  aussteht oder fehlgeschlagen ist.
- **Navigation innerhalb der App** → beim Unmount wird ein ausstehender
  Debounce sofort geflusht (der `PUT` läuft also noch los). Schlägt er fehl,
  meldet ein Toast den Fehler — das Formular ist dann schon weg.

Ein echter In-App-Blocker („Wirklich verlassen?") wäre erst nach einer Migration
auf `createBrowserRouter` möglich; das ist im Backlog, nicht in diesem Plan.

## Das Formular

Nur Felder, die es im Datenmodell wirklich gibt. Die „Kurzbeschreibung" aus dem
Mockup existiert nicht und entfällt.

**Grunddaten** — `name` (Pflicht; leer → 422 vom Backend) und `source`.

**Zeit** — `workMinutes` und `overallMinutes` als schlichte Zahlenfelder mit
Suffix „Min." (Der vorhandene `DurationPicker` ist das Wheel-/Drum-Picker-Control
des Timers, h:m:s, unendlich scrollend — für ein Formularfeld das falsche
Werkzeug.) **Kein `time`-Feld:** Die Zeitanzeige der Detailseite soll künftig aus
`workMinutes`/`overallMinutes` abgeleitet werden.

> `time` wird trotzdem **unverändert durchgereicht**: Weil `PUT` ein Full
> Replace ist, würde ein fehlendes `time` den heute noch gerenderten String
> löschen (alle 14 Mock-Rezepte haben einen). Der Draft trägt das Feld also mit,
> ohne es anzuzeigen — `null` bei neuen Rezepten. Es verschwindet ganz, sobald
> die Detailseite `time` nicht mehr liest.

**Größe** — ein Entweder-oder-Control, weil das Modell die beiden Felder als
exklusiv behandelt und `PortionScaler` genau darauf verzweigt:

- *Portionen*-Modus → `sizeNumber` (z. B. 4) plus Label in `sizeText`
  (`{Portionen}`)
- *Freitext*-Modus → `sizeNumber` bleibt `null`, nur `sizeText`
  (`28 cm {Springform}`)

`sizeText` ist in **beiden** Modi ein editierbares Textfeld (im Portionen-Modus
das Label neben der Zahl, vorbelegt mit `{Portionen}`). Der Moduswechsel ändert
nur, ob `sizeNumber` gesetzt oder `null` ist.

**Notizen** — `notes[]` als Zeilenliste, hinzufügen/entfernen/umsortieren.

**Abschnitte** — Liste von Sections, jede mit optionalem Namen, eigenen Zutaten
und eigenen Schritten. Ein Rezept mit genau einer namenlosen Section sieht aus
wie die flache Liste im Mockup; *Abschnitt hinzufügen* steht unauffällig
darunter. Sections, Zutaten und Schritte werden mit **Hoch/Runter-Buttons**
umsortiert (kein Drag & Drop in diesem Durchgang) und mit dem Mülleimer-Icon aus
dem Mockup gelöscht.

**Eine Zutatenzeile** sind vier Eingaben, nicht zwei:
`amountPrefix` (`ca.`) + `amount` (ein **String** — „1-2", „½") + `unit` (`g`) +
die Zutat selbst. Letztere ist eine Combobox über den Zutatenkatalog, die auch
Freitext annimmt: Katalogtreffer → `ingredient: {id}`, unbekannter Text →
`text`. Zeilen mit weder-noch werden beim Speichern verworfen (das Backend
antwortet darauf mit 422).

**Tags** — Mehrfachauswahl über den vorhandenen Tag-Katalog. **Neue Tags
anzulegen ist in diesem Durchgang nicht möglich** (kein Endpoint) — siehe
Offene Fragen.

**Bilder** — Hochladen (`POST /images`), eines als `mainImage` markieren, die
übrigen umsortieren/entfernen.

**Controls.** `@postxl/ui-components` exportiert **kein** fertiges `Combobox`
oder `MultiSelect`. `IngredientPicker` und `TagPicker` werden deshalb aus
`Popover` + `Command`/`CommandInput`/`CommandList`/`CommandItem`/`CommandEmpty`
zusammengesetzt (die übliche Kombination); ausgewählte Tags rendern als `Badge`.
Der Größen-Modusumschalter ist eine `RadioGroup`, die übrigen Felder sind
`Input`/`Textarea` in `Card`s. Keine rohen HTML-Controls.

**Textfelder bleiben Plain Text.** `name`, Schritte, Notizen und `sizeText`
dürfen `{Tag}`-Tokens enthalten, die `TagText` als Icon rendert. Unter dem
Titelfeld läuft eine Live-`TagText`-Vorschau mit — kein token-fähiger
Rich-Editor.

**Nicht editierbar:** `id`, `owner`, `editors`, `viewers`, `rating`.

## API-Schicht

`src/api/rest.ts` bekommt drei Methoden, im Vertrag der bestehenden (geparsten
Body auflösen, bei Fehler `Error` werfen — damit die Fehlerbehandlung in
`useRequest` transportunabhängig bleibt):

- `put<T>(path, body)` — JSON, wie `post`
- `del(path)` — `undefined` bei 204 (`request()` behandelt das bereits)
- `postBinary<T>(path, blob)` — **roher** Body mit dem MIME-Typ der Datei, kein
  Multipart, kein `application/json`

`src/api/index.ts` bekommt vier Methoden, jeweils mit demselben
Mock-/REST-Zweig wie die vorhandenen, damit `VITE_MOCK=1` funktionsfähig bleibt:

| Methode | REST | Mock |
| --- | --- | --- |
| `createRecipe(input)` | `POST /recipes` | `recipes.create` |
| `updateRecipe(id, input)` | `PUT /recipes/{id}` | `recipes.update` |
| `uploadImage(file)` | `POST /images` | `images.upload` |

Kein `deleteRecipe`: Mit dem expliziten *Anlegen*-Button existiert ein neues
Rezept serverseitig noch gar nicht, wenn *Verwerfen* gedrückt wird — es gibt
nichts zu löschen. Der Endpoint kommt, wenn die UI einen Löschen-Einstieg
bekommt.

`createRecipe`/`updateRecipe` nehmen die Wire-Form `CreateRecipe` (neue Typen in
`protocol.ts`), erzeugt von einem reinen `toCreateRecipe(draft)` in
`src/editor/draft.ts`. Dort passieren auch das Verwerfen leerer Zutatenzeilen
und die Normalisierung des `sizeNumber`/`sizeText`-Entweder-oder — beides ohne
React unit-testbar.

Die Mock-Writes bekommen einen In-Memory-ID-Zähler über `mockData.recipes` (der
vorhandene `recipes.copy`-Handler macht genau das schon), `images.upload` liefert
eine Fake-ID plus Fake-Hash.

### `CreateRecipe` (Wire)

```ts
type CreateRecipe = {
  name: string
  tags: TagId[]
  source: string | null
  time: string | null
  workMinutes: number | null
  overallMinutes: number | null
  sizeNumber: number | null
  sizeText: string | null
  notes: string[]
  mainImage: ImageId | null
  images: ImageId[]
  sections: CreateSection[]
}
type CreateSection = {
  name: string | null
  ingredients: CreateRecipeIngredient[] // Key muss da sein (kein serde default)
  steps: string[] // dito
}
type CreateRecipeIngredient = {
  ingredient: IngredientId | null // nur die ID, nicht das Objekt
  text: string | null
  amount: string | null
  amountPrefix: string | null
  unit: string | null
}
```

## Berechtigungen

Nur Owner und Editor dürfen bearbeiten. Ein reines `canEdit(recipe, userId)`
neben den übrigen Zugriffs-Prädikaten. `RecipeDetail` blendet *Bearbeiten* aus,
wenn es `false` ist; `RecipeEditor` zeigt statt des Formulars einen
„Kein Zugriff"-Alert, wenn ein nicht bearbeitbares Rezept geladen wird. (Das
Backend antwortet ohnehin mit 403 — das hier ist UX, keine Sicherheitsgrenze.)

## Fehler

- **Laden schlägt fehl** → dasselbe `Alert`-Muster, das `RecipeDetail` schon
  verwendet.
- **Speichern schlägt fehl** → `SaveStatus` zeigt den Fehler inline plus *Erneut
  versuchen*; Eingaben bleiben erhalten, die nächste Änderung versucht es
  erneut; Navigation ist blockiert.
- **Bild-Upload schlägt fehl** → Toast, weil es eine bewusste Einzelaktion ist
  und kein Hintergrundvorgang.

## Einstiegspunkte

- **„Neues Rezept"** in der `Nav` — Haupteinstieg, immer sichtbar, unterhalb
  `sm` nur als Icon (damit die Kopfzeile nicht umbricht). Ersetzt zugleich den
  FAB aus dem Mockup.
- **„Bearbeiten"** auf der Rezeptseite, neben dem vorhandenen „Duplizieren" —
  nur wenn `canEdit`.

Der Stift auf der Rezeptkarte und der mobile FAB samt Bottom-Nav aus dem Mockup
entfallen: Die App hat heute keine Bottom-Nav, und die einzuführen wäre ein
deutlich größerer Umbau.

## Dateien

Neu:

```
src/pages/RecipeEditor.tsx                 Seite: Modus (new|edit), Laden, Fußleiste, Draft-State
src/editor/draft.ts                        Draft-Typ + reine Reducer + toCreateRecipe()
src/editor/draft.test.ts
src/editor/useAutosave.ts                  Debounce / Koaleszenz / Single-Flight / Status
src/editor/useAutosave.test.ts
src/editor/access.ts                       canEdit()
src/editor/access.test.ts
src/components/editor/BasicsCard.tsx       name, source, Zeiten, Größe, Tags, Notizen
src/components/editor/SizeField.tsx        sizeNumber ⇄ sizeText
src/components/editor/SectionEditor.tsx    eine Section: Name, Zutaten, Schritte
src/components/editor/IngredientRow.tsx    amountPrefix + amount + unit + Zutat
src/components/editor/IngredientPicker.tsx Combobox über den Katalog, Freitext-Fallback
src/components/editor/StepRow.tsx
src/components/editor/RowActions.tsx       Hoch / Runter / Löschen (geteilt)
src/components/editor/TagPicker.tsx        Mehrfachauswahl über den Tag-Katalog
src/components/editor/ImageManager.tsx     Upload, Hauptbild, Umsortieren, Entfernen
src/components/editor/SaveStatus.tsx       idle / saving / saved / error
```

Geändert: `src/App.tsx` (zwei Routen), `src/components/Nav.tsx` („Neues
Rezept"), `src/pages/RecipeDetail.tsx` („Bearbeiten"), `src/api/rest.ts`,
`src/api/index.ts`, `src/api/protocol.ts`, `src/mocks/index.ts`.

## Tests

Vitest + Testing Library, wie im Repo üblich (`RecipeDetail.clone.test.tsx` ist
das nächstgelegene Vorbild). TDD je Datei:

- `draft.test.ts` — Reducer (hinzufügen/entfernen/umsortieren über Sections
  hinweg), `toCreateRecipe` (leere Zeilen verwerfen, Größen-Entweder-oder,
  `time`-Durchreichung)
- `useAutosave.test.ts` — Debounce, Koaleszenz, Single-Flight, Fehler → erneuter
  Versuch bei der nächsten Änderung
- `access.test.ts` — `canEdit`
- `RecipeEditor.test.tsx` — Anlegen-Fluss (Anlegen → POST → URL ersetzt),
  Bearbeiten-Fluss (Änderung → Autosave-PUT), fehlende Berechtigung,
  Speicherfehler-Anzeige

## Bewusst nicht dabei

- Drag & Drop zum Umsortieren (Hoch/Runter-Buttons stattdessen)
- Rezept löschen aus dem Editor heraus (`DELETE` existiert, hat aber noch keinen
  Einstiegspunkt in der UI)
- Rating, Freigaben (`editors`/`viewers`), Kategorien-Zuordnung
- Overlay- und Inline-Variante des Mockups (Vorschläge B und C)

## Offene Fragen

- **Neue Tags anlegen.** Das Backend hat keinen Endpoint dafür, der Tag-Katalog
  ist read-only. Der `TagPicker` kann deshalb nur vorhandene Tags auswählen — das
  „+ Tag"-Feld aus dem Mockup gibt es nicht. Muss separat besprochen werden
  (Backend-Endpoint? Oder Tags bewusst kuratiert lassen?).
- **Verwaiste Bilder.** Ein hochgeladenes Bild, das nie in einem gespeicherten
  Rezept landet, bleibt serverseitig liegen. Kein Aufräummechanismus vorgesehen.
