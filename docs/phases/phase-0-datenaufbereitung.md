# Phase 0 — Datenaufbereitung

Querschnitt-Fundament für alle Phasen: wie Backend-Daten im Frontend
strukturiert, gecacht und für die Anzeige aufbereitet werden. Klein halten —
nur bauen, was die jeweils nächste Phase wirklich braucht (YAGNI).

## Grundsätze

1. **DTOs bleiben der Vertrag.** `src/api/protocol.ts` ist die einzige
   Definition dessen, was über den Socket geht. Wird nur im Gleichschritt mit
   dem Backend geändert, nie für Frontend-Bequemlichkeit.
2. **Normalisiert, nicht denormalisiert gespeichert.** Geteilte Entities liegen
   flach als Lookup-Maps nach id (`recipesById`, `ingredientsById`, `usersById`,
   `tagsById`, `categoriesById`) — eine Quelle der Wahrheit. Referenzen
   (`category.recipes: recipeId[]`, `recipe.owner: userId`, …) bleiben ids und
   werden **nicht** in eingebettete Objekte umgeschrieben. Grund: many-to-many
   (ein Rezept in mehreren Kategorien) und „heimatlose" Entities (Rezepte ohne
   Kategorie) würden bei Einbettung dupliziert bzw. unauffindbar.
3. **Resolve an der API-Grenze.** `foodly.*` löst id-Referenzen bei Bedarf auf
   und gibt **resolved View-Modelle** zurück; Komponenten jonglieren nie mit
   ids. Auflösung passiert an *einer* Stelle (`src/api`), gestützt auf den
   Entity-Cache. Resolved/View-Typen leben in `src/api/views.ts`, getrennt von
   den DTOs.

## Expanded reference: `IngredientRef`

Bewusste Ausnahme zur „Referenzen bleiben ids"-Regel, weil Zutaten ein großer
Katalog sind und man sonst nur zum Rendern eines Rezepts hunderte Einträge laden
müsste:

- `recipeIngredient.ingredient` ist `IngredientRef = { id, name } | null` —
  die **id bleibt erhalten** (für Einkaufsliste / Filtern nach Zutat), der Name
  kommt inline zum sofortigen Rendern mit.
- Der volle `Ingredient` (mit künftigen Metadaten: Icon, Standard-Einheit,
  Nährwerte) ist separat und wird nur für katalogweite Features geladen.
- **Gewollte Asymmetrie:** Zutaten reichern wir inline an (großer Katalog),
  Tags bleiben bare ids (`tagId` *ist* der Name), User bleiben ids (wenige,
  einmal als `usersById` ladbar). Getrieben von Katalog-Größe und „was braucht
  der erste Render".

## Konkret für Phase 1

Nach der `IngredientRef`-Änderung braucht Phase 1 **fast kein** Resolving — das
einzige id→Objekt (Zutat) kommt schon inline. Daher hier minimal:

- **`src/api/views.ts`** anlegen mit reinen Ableitungs-/Formatier-Helfern, die
  die Detail-/Listenansicht braucht, z.B.:
  - `averageRating(recipe): number | null` — Mittel aus `recipe.rating[]`.
  - `formatIngredient(line): string` — `amountPrefix? amount? unit? name|text`.
  - `formatPortions(amount): string` — `"4 {Portionen}"` → `"4 Portionen"`.
  - ggf. `overallTime(recipe)` / Formatierung der Minuten.
- **Entity-Cache / Lookup-Maps** noch **nicht** nötig (kein id-Resolving in
  Phase 1). Wird eingeführt, sobald Phase 2 (Kategorien, „meine vs. geteilte",
  Filter) User-/Kategorie-Auflösung braucht.

So bleibt Phase 0 hier ein dünner View-Helfer-Layer; die schwerere
Cache-/Resolver-Infrastruktur kommt erst, wenn eine Phase sie real einfordert.
