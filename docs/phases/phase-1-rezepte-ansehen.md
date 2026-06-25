# Phase 1 — Rezepte ansehen (Spec)

Das Herzstück: Rezepte durchstöbern und ein Rezept im Detail lesen. **Reines
Lesen**, vollständig mit den Mock-Daten (`src/mocks`) baubar. Voraussetzung:
[Phase 0 — Datenaufbereitung](./phase-0-datenaufbereitung.md).

Dies ist das **konkrete Spec-Sheet** für die Umsetzung. Layout-Entscheidungen
sind getroffen; offene Punkte stehen explizit unter „Bewusst nicht in Phase 1".

## Ziel

Ein Nutzer kann seine Rezepte als **flache Liste** sehen und ein einzelnes
Rezept mit Zutaten, Schritten, Notizen und Metadaten öffnen. Kein Filtern, keine
Suche, keine Kategorien — nur Liste + Detail.

---

## 1. Routing

In `src/App.tsx` (Konvention aus CLAUDE.md):

- `/` → **`RecipeList`** (die Scaffold-`Home` fliegt raus — die Liste ist das
  Zuhause der App).
- `/recipes/:id` → **`RecipeDetail`**.
- `*` → bestehende `NotFound`.

Die Routen werden in den **`CatalogProvider`** (siehe §3) gewrappt, damit Tags/
User-Kataloge einmalig geladen vorliegen. `src/pages/Home.tsx` wird **gelöscht**;
der Nav-Link „Start" (→ `/`) bleibt unverändert.

---

## 2. Datenquelle

Alles über `foodly.*` (mock-gestützt, kein direkter Socket):

| Aufruf | Liefert | Wofür |
|---|---|---|
| `foodly.listRecipes()` | `Recipe[]` | Liste |
| `foodly.getRecipe(id)` | `Recipe` | Detail |
| `foodly.listTags()` | `Tag[]` | Katalog (Tag-Renderer) |
| `foodly.listUsers()` | `User[]` | Katalog (Rating-Popover) |
| `foodly.me()` | `User` | aktueller User (Rating-Hervorhebung) |

Laden/Loading/Error pro Screen über den bestehenden `useRequest`-Hook. Die
`Recipe`-DTOs sind nach der `IngredientRef`-Änderung direkt renderbar
(Zutatenname kommt inline mit) — kein id→Objekt-Resolving für Rezepte nötig.
View-Ableitungen liegen in `src/api/views.ts` (siehe §5).

---

## 3. Kataloge — `CatalogProvider` (`src/catalog/`)

Ein Context-Provider, der die App-weit geteilten Nachschlage-Kataloge **einmalig
beim Start** lädt und bereitstellt. Wrappt die Routen in `App.tsx`.

**Lädt einmal:** `listTags()` → `tagsById`, `listUsers()` → `usersById`,
`me()` → `currentUserId`.

**Exponiert (Hooks):**
- `useTag(id: TagId): Tag | undefined` — Tag-Metadaten (für `<TagText>`).
- `useUser(id: UserId): User | undefined` — User (für Rating-Popover).
- `useCurrentUserId(): UserId | null`.
- `useCatalogStatus(): { tags: 'ready'|'error'; users: 'ready'|'error'; … }`
  — pro Katalog, für Graceful Degrade.

**Tag-Bilder werden NICHT mitgeladen.** `Tag.svg` ist ein `Hash` (Referenz),
keine Bytes — der Katalog ist also leichtgewichtig (ids + Hashes). Das eigentliche
Bild eines Tags wird **lazy, pro Tag, erst beim tatsächlichen Rendern** geladen
(Hash → URL ist backend-abhängig). In Phase 1 sind **alle `svg` null** → null
Bild-Traffic, alles rendert als Text. (Dieser Lazy-Image-Pfad ist damit für Phase
1 spezifiziert, aber noch nicht implementiert — siehe „Bewusst nicht in Phase 1".)

### Graceful Degrade (Katalog-Fehler)

Kein harter Boot-Block. Schlägt ein Katalog-Load fehl, bleiben die Rezepte
sichtbar; nur die katalog-abhängigen Details degradieren:

- **Tags fehlgeschlagen:** `<TagText>` kennt keine Tags → jedes `{X}`/`{!X}`
  bleibt **literal** stehen (regelkonform: „kein existierender Tag" → literal).
  Kein Crash, nur ungelöste Tokens.
- **Users fehlgeschlagen:** Rating-Popover zeigt **Fallback-Namen** (`User <id>`)
  statt echter Namen; Rollen-Sortierung funktioniert weiter (kommt aus dem
  Recipe, nicht aus dem User-Katalog).
- **`me()` fehlgeschlagen:** `currentUserId = null` → keine „Du"-Hervorhebung,
  sonst unverändert.

Der Provider rendert die Kinder, sobald die Loads **abgeschlossen** sind (ready
oder error) — er wartet nicht endlos und blockt nicht auf Teilfehlern.

---

## 4. Tag-Renderer — `<TagText value={…} />` (`src/components/`)

Das zentrale **Render-Primitiv für jeden rezept-autorierten String**. In jedem
anzeigbaren Text darf `{tagId}` stehen und wird beim Rendern ersetzt.

**Angewandt auf:** Rezept-**Name**, **Tag-Chips**, **time**, **amount**,
**Quelle**-Label, **Notizen**, **Section-Name**, **Zutatenzeilen** (der fertig
zusammengesetzte String inkl. `unit` + Suffix) und **Schritte**. Faustregel:
**überall**, wo sonst ein roher Recipe-String gerendert würde, steht `<TagText>`.

**Regeln pro Token** (unverändert ggü. Vorgabe):

| Token | Fall | Ergebnis |
|---|---|---|
| `{X}` | `X` Tag **mit** `svg` | Tag-**Bild** (lazy geladen) |
| `{X}` | `X` Tag **ohne** `svg` (`svg === null`) | nur `X`, **ohne** Klammern |
| `{X}` | `X` **kein** Tag | **literal** `{X}` (erlaubt echte `{}` im Text) |
| `{!X}` | `X` Tag (egal ob svg) | immer **Name** `X` (ohne Klammern) |
| `{!X}` | `X` kein Tag | literal `{!X}` |

- Gibt **React** zurück (Text-Fragmente + ggf. Tag-Bilder), kein reiner String →
  Render-Schicht, **nicht** `views.ts`.
- Konsumiert den Tag-Katalog über `useTag` (aus dem `CatalogProvider`). Das ist
  der einzige Daten-Resolve-Bedarf in Phase 1.
- In Phase 1 haben alle Tags `svg: null` → jeder bekannte Tag rendert als
  Klartext, jeder unbekannte bleibt literal. Der Bild-Zweig wird vorbereitet
  (Verzweigung vorhanden), aber das tatsächliche Bild-Fetching ist noch nicht
  dran (kein Backend-URL-Schema).

**Tag-Chips** (`recipe.tags: TagId[]`): das sind **bare ids = Namen** (keine
`{}`-Templates). Sie werden als `Badge` gerendert, Inhalt = Tag-Name (später
Icon+Name, sobald `svg` existiert). Kein Template-Parsing nötig — direkt der
Name.

---

## 5. View-Helfer — `src/api/views.ts`

Bereits vorhanden (Phase 0): `averageRating(recipe)`, `formatIngredient(line)`.

**Neu (pur, kein React):**

```ts
// Bewertungen eines Rezepts nach Rolle des bewertenden Users sortiert:
// owner → editors → viewers → (sonstige). Rolle kommt aus dem Recipe selbst.
export type RatedRole = 'owner' | 'editor' | 'viewer' | 'other';
export function ratingsByRole(
  recipe: Recipe,
): { user: UserId; rating: number; role: RatedRole }[];
```

Reine Daten-Funktion (nimmt nur das Recipe, kennt keine Namen). Die Namen
mappt der Popover über `useUser`. `averageRating` liefert weiterhin `null` bei
leerem `rating` → UI lässt Sterne dann weg.

---

## 6. Rating-Darstellung

Zwei Ausprägungen, bewusst unterschiedlich:

### Liste (kompakt) — `★ <Zahl>`
Ein **einzelner voller Stern + Durchschnittszahl** (z.B. `★ 4.5`), platzsparend.
Nicht interaktiv (die ganze Zeile ist der Link). Bei leerem `rating` → komplett
weglassen.

### Detail — Sternleiste (Viertel-Präzision) + Popover
- **`Stars`** (`src/components/recipe/Stars.tsx`, pur): 5-Sterne-Leiste, Füllung
  per **Clip-Overlay** auf `avg/5` (beliebige Präzision, inkl. Viertel). Amber/
  Gold gefüllt, leer in `muted`. Reine Anzeige aus einem `0–5`-Wert.
- **`Rating`** (`src/components/recipe/Rating.tsx`, Detail): `Stars` als
  **Popover-Trigger** (klickbar). Popover-Inhalt:
  - **Kopf:** Durchschnitt (`★ 4.5`) + Anzahl („2 Bewertungen").
  - **Deine Bewertung** oben hervorgehoben (`bg-muted`, Label „Du"), falls der
    aktuelle User bewertet hat.
  - **Liste** aller Bewertungen via `ratingsByRole`, mit dezenten Gruppen-Labels
    **„Besitzer / Bearbeiter / Betrachter"** (+ „Weitere" für `other`). Pro Zeile:
    User-Name (aus `useUser`, Fallback `User <id>`) links, dessen `★ <Zahl>`
    rechts.
- Popover/Stars nur im Detail — in der Liste **kein** Popover (Klick-Ziel-Konflikt
  mit dem Zeilen-Link).

---

## 7. Screen: Rezeptliste (`/`) — `src/pages/RecipeList.tsx`

**Layout: kompakte Zeilen** (gegen Karten-Raster entschieden — ohne echte Fotos
aufgeräumter, gut zum Scannen). Zentrierte Spalte `max-w-5xl`.

**Zeilen-Anatomie** (`src/components/recipe/RecipeRow.tsx`), ganze Zeile ist
`Link` → `/recipes/:id`:

```
┌──────────────────────────────────────────────────┐
│ [▢]  Spaghetti Bolognese      #Hauptgericht #Ital. │   ← obere Zeile: Name links, Tags rechtsbündig
│      ★ 4.5 · 🕒 2 h inkl. Backzeit 15 min          │   ← Meta-Zeile: Rating zuerst, dann Zeit
└──────────────────────────────────────────────────┘
```

- **Thumbnail links:** `Avatar`. Sobald `recipe.mainImage` gesetzt ist und
  Bild-Laden steht, würde dessen Bild als `AvatarImage` dienen; in Phase 1 ist
  `mainImage` in den Mocks `null` → **`AvatarFallback`** = Initial des
  Rezeptnamens. Der `mainImage`-Pfad ist also vorgesehen, aber inaktiv.
- **Obere Zeile:** Name links (`<TagText>`), **Tag-Chips rechtsbündig** (`Badge`,
  je Tag der Name). Auf Mobile umbrechend.
- **Meta-Zeile:** **Rating zuerst** (`★ 4.5`, einzelner Stern + Zahl), dann Zeit
  (`recipe.time` durch `<TagText>`). Punkt-getrennt (` · `).
- Fehlende Felder (`time === null`, leeres `rating`) werden **weggelassen** —
  keine „—"-Platzhalter. Keine Portionen in der Liste (Detail-only).

**Zustände:**
- **Loading:** ein paar `Skeleton`-Zeilen.
- **Error:** `Alert` (variant destructive) mit Meldung + „Erneut versuchen"
  (Retry über Re-Mount/Key der Anfrage).
- **Empty:** freundlicher „Noch keine Rezepte"-Hinweis (schlichter, gestylter
  `<p>` — `@postxl/ui-components` exportiert kein `Empty`).

---

## 8. Screen: Rezept-Detail (`/recipes/:id`) — `src/pages/RecipeDetail.tsx`

Grobaufbau übernommen aus der Schwester-App `~/projects/Recipes/app`
(`src/recipe/RecipePage.tsx`) — aber **screen-first & scrollbar** statt deren
print-first A5-Seiten (keine festen Seitenhöhen, kein Pagination, keine
A5-Maße). Zentrierte Spalte `max-w-3xl`. Oben ein „← Zurück"-Link (`Button`
variant ghost) → `/`.

**Vertikale Reihenfolge:**

```
← Zurück
Spaghetti Bolognese           #Hauptgericht #Italienisch   ← Titel links, Tags rechtsbündig
★ 4.5 · 🕒 2 h inkl. Backzeit 15 min · 4 Portionen          ← Meta-Zeile (Rating ZUERST)

ⓘ Schmeckt am nächsten Tag aufgewärmt noch besser.          ← Notizen

── Bolognese ─────────────────────────────────────────────  ← Section-Name
Zutaten                 │ Zubereitung
• 500 g Hackfleisch     │ 1. Zwiebel & Knoblauch …
• 1 Zwiebel             │ 2. Hackfleisch …
• ca. 800 g Tomaten     │ 3. …

── Pasta ─────────────────────────────────────────────────
Zutaten                 │ Zubereitung
• 500 g Spaghetti       │ 1. Nach Packung …

Quelle: Omas Rezept                                          ← Footer (unten)
```

**Kopf:**
- **Hauptbild (Hero):** wenn `recipe.mainImage` gesetzt ist, gehört oben ein
  Hero-Bild hin (über oder neben den Titel). In Phase 1 ist `mainImage` in den
  Mocks `null` und Bild-Laden ist noch nicht dran → **kein Hero gerendert**; das
  Layout sieht den Platz vor, blendet ihn aber bei `null` aus. (Bild-Laden:
  `image.hash` → URL ist backend-abhängig, siehe „Bewusst nicht in Phase 1".)
- **Titel** (`<TagText>` auf `recipe.name`) links; **Tag-Chips rechtsbündig**
  daneben (`Badge` je `recipe.tags`-Eintrag). Auf Mobile bricht die Chip-Reihe
  unter den Titel.
- **Meta-Zeile**, punkt-getrennt, nur was vorhanden ist, **in dieser
  Reihenfolge**:
  1. **Rating** (`<Rating>` — Sternleiste + Popover), zuerst, weil wichtigstes.
  2. **Zeit** (`recipe.time` durch `<TagText>`).
  3. **Portionen** (`recipe.amount` durch `<TagText>`, z.B. `"4 {Portionen}"`
     → „4 Portionen").
  - `workMinutes`/`overallMinutes` sind **nur** für Filter (Phase 2), hier nicht.
  - **Quelle steht NICHT hier**, sondern im Footer.

**Notizen** (`recipe.notes: string[]`) direkt unter der Meta-Zeile, je Notiz eine
Zeile mit ⓘ-Marker (`<TagText>`).

**Sections** (`recipe.sections`): pro Section ein Block
(`src/components/recipe/SectionBlock.tsx`):
- Optionale Überschrift `section.name` (kann `null` → **ohne** Überschrift),
  durch `<TagText>`.
- **2-Spalten-Grid:** Zutaten links (~1fr), Zubereitung rechts (~1.5fr), dezente
  Trennlinie (`Separator`/Border). Auf Mobile (**unter `md:`**) stapeln: Zutaten
  oben, Schritte darunter.
- **Zutatenzeile** (`src/components/recipe/IngredientLine.tsx`): String aus
  `views.formatIngredient(line)` zusammengesetzt, dann durch `<TagText>`
  gerendert. Bullet-Liste (`•`). Beispiele:
  - `{ amount:"500", unit:"g", ingredient:{name:"Hackfleisch (Rind)"} }`
    → „500 g Hackfleisch (Rind)"
  - `{ amountPrefix:"ca.", amount:"800", unit:"g", ingredient:{name:"Tomaten"} }`
    → „ca. 800 g Tomaten"
  - `{ ingredient:{name:"Parmesan"}, text:"zum Servieren" }`
    → „Parmesan zum Servieren" (`text` als Suffix hinter dem Namen)
  - `{ text:"Salz nach Geschmack", ingredient:null }`
    → „Salz nach Geschmack" (reiner Freitext)
- **Schritte** (`section.steps: string[]`): nummerierte Liste, je Schritt durch
  `<TagText>`.

**Footer:** **Quelle** (wenn vorhanden). Ist `source` eine URL → externer Link
(`target="_blank" rel="noopener"`); sonst Klartext durch `<TagText>`. Bilder
bleiben in Phase 1 außen vor (Mocks haben keine; `image.hash` → echte URL ist
backend-abhängig).

**Zustände:** Loading (`Skeleton`-Blöcke), Error inkl. **unbekannte id**
(`getRecipe` rejected → `Alert` „Rezept nicht gefunden" + Link zurück zur Liste).

---

## 9. Komponenten-Inventar

| Datei | Zweck |
|---|---|
| `src/catalog/CatalogProvider.tsx` | Tags/Users/me einmal laden, Context + Hooks (`useTag`, `useUser`, `useCurrentUserId`, `useCatalogStatus`) |
| `src/components/TagText.tsx` | `{tagId}`-Templates in einem String → React |
| `src/components/recipe/Stars.tsx` | Viertel-Präzise Sternleiste aus 0–5-Wert (pur) |
| `src/components/recipe/Rating.tsx` | Detail-Rating: `Stars` als Popover-Trigger + Breakdown |
| `src/components/recipe/RecipeRow.tsx` | eine kompakte Listenzeile (Avatar, Name, Tags, `★ Zahl`, Zeit) |
| `src/components/recipe/SectionBlock.tsx` | 2-Spalten Zutaten/Schritte je Section |
| `src/components/recipe/IngredientLine.tsx` | eine formatierte Zutatenzeile (`formatIngredient` → `<TagText>`) |
| `src/pages/RecipeList.tsx` | Liste laden + Zeilen rendern, Zustände |
| `src/pages/RecipeDetail.tsx` | Einzelrezept laden, Kopf/Meta/Notizen/Sections/Footer |
| `src/api/views.ts` | + `ratingsByRole` (Helfer) |
| `src/App.tsx` | Routen + `CatalogProvider`-Wrap; `Home`-Route entfernt |

`src/pages/Home.tsx` wird gelöscht. Granularität beim Umsetzen anpassen —
Leitlinie: kleine, fokussierte Einheiten.

---

## 10. Mock-Ausbau (für vollständige Render-Pfade)

Damit alle Pfade in dev sichtbar sind (realistische Strings angelehnt an das
Recipes-Repo, wo `time`/`amount` häufig Tokens einbetten):

- **`tags.json`:** Tags `Backzeit`, `Kochzeit`, `Formgröße` ergänzen (`svg: null`)
  — kommen in `time`/`amount`-Strings als Tokens vor.
- **`recipes.json`:**
  - `time` befüllen (statt überall `null`), realistische Strings mit Tokens:
    z.B. `"2 h inkl. {Backzeit} 15 min"`, `"15 min + {Kochzeit} 15 min"`,
    `"45 min"`.
  - Ein Rezept **ohne Bewertung** (`rating: []`) → testet „keine Sterne" in Liste
    und Detail.
  - Ein **unbekanntes Token** in einem Text (z.B. Notiz `"{WIP}"` mit `WIP` NICHT
    im Tag-Katalog) → testet den **literal**-Pfad von `<TagText>`.
  - **`mainImage: null`** an jedem Rezept ergänzen (neues Pflichtfeld aus
    `protocol.ts`; `images: []` bleibt) → typkonform + testet den Hero-/
    Thumbnail-Fallback (Avatar-Initial).
  - Bestehende Abdeckung bleibt erhalten: `section.name === null` (Schokokuchen,
    Pfannkuchen), Freitext-Zutat (`ingredient: null`), Suffix-`text`
    („zum Servieren"), Quelle als URL (Schokokuchen) und als Klartext (Bolognese)
    sowie `null` (Pfannkuchen).

Mock-Erweiterungen müssen typkonform zu `protocol.ts` bleiben.

---

## 11. UI-/Styling-Konventionen (aus CLAUDE.md)

- Interaktive Elemente **ausschließlich** über `@postxl/ui-components`
  (`Card`, `Badge`, `Button`, `Avatar`, `Popover`, `Separator`, `Skeleton`,
  `Alert`, `Skeleton`, …) — keine rohen `<button>`/`<input>`.
- Größen über `size`/`variant`-Props, nicht per Tailwind nachbauen.
- Keine Inline-Styles; Spacing/Layout via Tailwind-Utilities, sonst Klasse in
  `styles.css`. Text-Größen über die Tokens, nicht hand-sizen.
- Icons aus `lucide-react` (ist transitive Dep von `@postxl/ui-components`),
  passend zum bestehenden Stil.

---

## 12. Verifikation (vor PR)

1. **`npm run build`** (tsc-Typecheck + Vite-Build) muss fehlerfrei sein.
2. **Chrome-MCP-Smoke** am laufenden dev-Server (`VITE_MOCK=1`):
   - Liste rendert alle Rezepte, Zeilen klickbar, `★ Zahl` + Zeit korrekt.
   - Detail: Tags rechtsbündig, Meta-Zeile Rating-zuerst, Notizen, 2-Spalten-
     Sections, Footer-Quelle (URL als Link).
   - Rating-Popover öffnet, zeigt Breakdown nach Rolle, „Du"-Hervorhebung.
   - Token-Auflösung: `{Portionen}`/`{Backzeit}` → Klartext, `{WIP}` literal.
   - Empty-/Error-Pfade (z.B. `/recipes/999` → „nicht gefunden").
   - Konsole ohne Fehler; grobe Mobile-Breite (Sections stapeln).

---

## 13. Bewusst nicht in Phase 1

- Portionen **umrechnen** (`basePortionMultiplier`) → **Phase 3 (Koch-Modus)**.
- Kategorien-Sidebar, Tag-Filter, Suche, Sortierung, Rollen-Modi, detailed↔
  compact-Umschalter, by-category-Gruppierung → **Phase 2**.
- Bearbeiten/Anlegen/Rating **abgeben**, Notizen editieren → **Phase 4**
  (braucht Backend).
- **Tag-Bilder** tatsächlich laden/rendern (`tag.svg` Hash → URL) und Rezept-
  Bilder (`mainImage`/`images` über `image.hash` → URL) → später
  (backend-abhängig). Der Lazy-Pfad ist in `<TagText>` vorbereitet, aber inaktiv
  (alle `svg` null); `mainImage` ist in den Mocks `null`, das Hero-/Thumbnail-
  Layout sieht den Platz vor, rendert aber nur den Fallback.
