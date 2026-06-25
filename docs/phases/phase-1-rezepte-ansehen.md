# Phase 1 — Rezepte ansehen

Das Herzstück: Rezepte durchstöbern und ein Rezept im Detail lesen. Reines
Lesen, vollständig mit den Mock-Daten (`src/mocks`) baubar. Voraussetzung:
[Phase 0 — Datenaufbereitung](./phase-0-datenaufbereitung.md).

## Ziel

Ein Nutzer kann seine Rezepte als Liste sehen und ein einzelnes Rezept mit
Zutaten, Schritten, Notizen und Metadaten öffnen.

## Routing

- `/` → **Rezeptliste** (die Scaffold-`Home` fliegt raus; die Liste ist das
  Zuhause der App).
- `/recipes/:id` → **Rezept-Detail**.
- `*` → bestehende `NotFound`.

Neue Pages in `src/pages/`, Routen in `src/App.tsx` (Konvention aus CLAUDE.md).

## Datenquelle

Alles über `foodly.*` (mock-gestützt, kein direkter Socket):

- `foodly.listRecipes()` → `Recipe[]`
- `foodly.getRecipe(id)` → `Recipe`

Laden/Loading/Error über den bestehenden `useRequest`-Hook. Die `Recipe`-DTOs
sind nach der `IngredientRef`-Änderung direkt renderbar (Zutatenname kommt inline
mit) — es ist für Phase 1 kein id→Objekt-Resolving nötig. View-Ableitungen
(Durchschnitts-Rating, Formatierung) liegen in `src/api/views.ts` (siehe Phase 0).

## Rezeptliste (`/`)

**Layout: kompakte Zeilen** (gegen Karten-Raster entschieden — sieht ohne echte
Fotos aufgeräumter aus, gut zum Scannen).

Pro Zeile:

```
┌────────────────────────────────────────┐
│ [▢]  Spaghetti Bolognese                │
│      🕒 45m  ★ 4.5  #Hauptgericht #Ital. │
└────────────────────────────────────────┘
```

- Bild-/Initial-Platzhalter links (Mocks haben `images: []` → Platzhalter, kein
  echtes Foto).
- Name (Klick → `/recipes/:id`).
- Meta: Zeit (`recipe.time`, String — via Tag-Renderer), Durchschnitts-Rating
  (aus `rating[]`), Tags (`tags` sind Strings = Namen).
- Felder, die fehlen können (`time === null`, leeres `rating`), werden einfach
  weggelassen — keine „—"-Platzhalter.

**Zustände:** Loading (Skeleton/Hinweis), Error (Fehlermeldung + ggf. Retry),
Empty (freundlicher „noch keine Rezepte"-Hinweis).

**Scope Phase 1:** flache Liste aller Rezepte aus `listRecipes()`. Die
Unterscheidung „meine vs. geteilte", Kategorien-Sidebar, Filter und Suche sind
**Phase 2** — hier bewusst nicht.

## Rezept-Detail (`/recipes/:id`)

Grobaufbau übernommen aus der Schwester-App `~/projects/Recipes/app`
(`src/recipe/RecipePage.tsx`) — aber **screen-first & scrollbar** statt deren
print-first A5-Seiten (keine festen Seitenhöhen, kein Pagination, keine
A5-Maße).

Vertikale Reihenfolge:

```
Spaghetti Bolognese                         (Titel)
🕒 45m · 4 Portionen · ★ 4.5 · Quelle       (Meta-Zeile)

ⓘ Schmeckt am nächsten Tag noch besser.     (Notizen)

── Bolognese ─────────────────────────────  (Section-Überschrift)
Zutaten              │ Zubereitung
• 500 g Hackfleisch  │ 1. Zwiebel & Knobl…
• 1 Zwiebel          │ 2. Hackfleisch …
• ca. 800 g Tomaten  │ 3. …
• …                  │

── Pasta ─────────────────────────────────
Zutaten              │ Zubereitung
• 500 g Spaghetti    │ 1. Nach Packung …

Quelle: Omas Rezept                          (Footer)
```

**Kopf:** Titel; darunter eine Meta-Zeile mit (in dieser Reihenfolge, was
vorhanden ist): Zeit (`recipe.time`, String), Portionen (`recipe.amount`,
z.B. `"4 {Portionen}"`), Durchschnitts-Rating, Quelle (`source` als Link, wenn
URL). `time` und `amount` laufen durch den **Tag-Renderer** (siehe unten) — kein
String-Trimming. `workMinutes`/`overallMinutes` sind nur für Filter (Phase 2).

**Notizen** (`notes: string[]`) direkt unter der Meta-Zeile, je Notiz eine Zeile
mit ⓘ-Marker.

**Sections** (`recipe.sections`): pro Section ein Block mit optionaler
Überschrift (`section.name`, kann `null` sein → ohne Überschrift) und einem
**2-Spalten-Grid: Zutaten links (~1fr), Zubereitung rechts (~1.5fr)** mit
dezenter Trennlinie. Auf Mobile stapeln (Zutaten oben, Schritte darunter).

- **Zutatenzeile** (`recipeIngredient`): zusammengesetzt aus
  `amountPrefix? + amount? + unit? + (ingredient.name | text)`. Beispiele:
  - `{ amount:"500", unit:"g", ingredient:{name:"Hackfleisch (Rind)"} }`
    → „500 g Hackfleisch (Rind)"
  - `{ amountPrefix:"ca.", amount:"800", unit:"g", ingredient:{name:"Tomaten"} }`
    → „ca. 800 g Tomaten"
  - `{ ingredient:{name:"Parmesan"}, text:"zum Servieren" }`
    → „Parmesan zum Servieren" (`text` als Suffix hinter dem Namen)
  - `{ text:"Salz nach Geschmack", ingredient:null }`
    → „Salz nach Geschmack" (reiner Freitext)
- **Schritte** (`section.steps: string[]`): nummerierte Liste.

**Footer:** Quelle (wenn vorhanden). Bilder bleiben in Phase 1 außen vor (Mocks
haben keine; `image.hash` → echte URL ist backend-abhängig).

## Tag-Renderer (Render-Primitiv)

Generischer Mechanismus, **nicht** nur für `amount`: in jedem anzeigbaren String
darf `{tagId}` stehen und wird beim Rendern ersetzt. Wird auf `time`, `amount`
und perspektivisch jeden gerenderten Text angewandt.

Regeln pro Token:

| Token | Fall | Ergebnis |
|---|---|---|
| `{X}` | `X` existierender Tag **mit** `svg` | Tag-**Bild** rendern |
| `{X}` | `X` existierender Tag **ohne** `svg` (`svg === null`) | nur `X`, **ohne** Klammern |
| `{X}` | `X` **kein** existierender Tag | **literal** `{X}` lassen (erlaubt echte `{}` im Text) |
| `{!X}` | `X` existierender Tag | immer **Name** `X` (ohne Klammern), auch wenn ein Icon existiert |
| `{!X}` | `X` kein existierender Tag | literal `{!X}` |

**Name erzwingen:** `{!tagId}` zeigt bewusst das Wort statt des Icons — z.B. bei
`recipe.tags`-Chips, wo man den Namen lesen will, obwohl der Tag ein Bild hätte.
(Syntax noch offen — `{!tagId}` ist der Vorschlag.)

- Gibt **React** zurück (Text-Fragmente + Tag-Bilder), kein reiner String →
  gehört in die Render-Schicht, nicht in `views.ts`.
- Braucht den **Tags-Katalog** (Existenz + `svg`): kleine Tag-Auflösung — der
  einzige Daten-Resolve-Bedarf in Phase 1. Quelle: `foodly.listTags()`, als
  `tagsById`-Lookup bereitgestellt (z.B. über Context).
- `svg` ist ein `Hash` → echte Bild-URL ist backend-abhängig; in den Mocks haben
  alle Tags `svg: null`, also rendern alle als Klartext. (Mock-Tags `Portionen`
  und `Springform` wurden ergänzt, damit `amount` wie `"4 {Portionen}"` sauber
  als „4 Portionen" rendert statt literal.)
- Vorschlag: Komponente `<TagText value={…} />`.

## Komponenten (Vorschlag)

| Datei | Zweck |
|---|---|
| `src/pages/RecipeList.tsx` | Liste laden + Zeilen rendern, Zustände |
| `src/pages/RecipeDetail.tsx` | Einzelrezept laden, Kopf/Meta/Sections/Footer |
| `src/components/recipe/RecipeRow.tsx` | eine kompakte Listenzeile |
| `src/components/recipe/Rating.tsx` | Sterne aus einem 0–5-Wert |
| `src/components/recipe/SectionBlock.tsx` | 2-Spalten Zutaten/Schritte je Section |
| `src/components/recipe/IngredientLine.tsx` | eine formatierte Zutatenzeile |
| `src/components/TagText.tsx` | `{tagId}`-Templates in einem String rendern |

(Granularität beim Umsetzen anpassen — Leitlinie: kleine, fokussierte Einheiten.)

## UI-/Styling-Konventionen (aus CLAUDE.md)

- Interaktive Elemente ausschließlich über `@postxl/ui-components`
  (Card, Button, …) — keine rohen `<button>`/`<input>`.
- Größen über die `size`/`variant`-Props, nicht per Tailwind nachbauen.
- Keine Inline-Styles; Spacing/Layout via Tailwind-Utilities, sonst Klasse in
  `styles.css`. Text-Größen über die Tokens, nicht hand-sizen.

## Nicht in Phase 1 (bewusst)

- Portionen umrechnen (`basePortionMultiplier`) → **Phase 3 (Koch-Modus)**.
- Kategorien-Sidebar, Tag-Filter, Suche, „meine vs. geteilte" → **Phase 2**.
- Bearbeiten/Anlegen/Rating-Abgabe → **Phase 4** (braucht Backend).
- Bilder rendern, Tag-SVGs (`tag.svg`) → später (backend-abhängig).
