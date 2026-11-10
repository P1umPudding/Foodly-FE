# Plan: #144 Rezeptbilder anzeigen

Basis: `spec.md` (inkl. Assumptions (worker) 1–9). Branch `agent/issue-144` von `c6ee841`.
Kleinste Änderung: Bild-Stub in `src/api` abbauen, eine gemeinsame Bild-Komponente mit Fehler-Fallback, Aufrufer umstellen, Tests + Doku nachziehen.
Commits ohne `Co-Authored-By`/AI-Trailer (CLAUDE.md). Jeder Commit baut und ist testgrün.

## Schritt 1 — Stub abbauen, echte URLs (ein Commit)

- `src/api/stubs.ts`: `'images'` aus `STUBBED` und aus `StubFeature` entfernen.
- `src/api/assets.ts`:
  - `showsRecipeImages()` löschen; `isStubbed`-Import entfällt.
  - `recipeImageSrc(image)`: `USE_MOCKS ? (DEV_RECIPE_IMAGE[id] ?? publicUrl('recipes/<id>.svg')) : apiUrl('/images/' + encodeURIComponent(image.hash))`.
  - `imageName(image)`: `image.name ?? \`Bild ${image.id}\`` (REST-Sonderzweig weg).
  - `userImageSrc(hash)`: `USE_MOCKS ? publicUrl('users/<hash>.svg') : apiUrl('/images/' + encodeURIComponent(hash))`.
  - Veraltete Kommentare (FE #144, ADR §5, „REST display not wired“) entfernen.
- `public/recipes/placeholder.svg` löschen (einzige Referenzen sind `assets.ts`/`assets.test.ts`, die hier wegfallen; historische Erwähnung in `docs/superpowers/plans/2026-10-31-…` bleibt).
- Aufrufer ohne `showsRecipeImages`: `RecipeDetail.tsx` (`allImages` immer aus Rezept), `src/list/rowData.ts` (`hasDisplayableImages = recipes.some(r => r.mainImage !== null)`, Kommentar zu FE #144 weg), `RecipeRow.tsx` (Bedingung nur `recipe.mainImage !== null`), `RecipeTile.tsx` (`photo = recipe.mainImage`).
- Tests im selben Commit (sonst rot/`tsc`-Fehler):
  - `src/api/assets.test.ts`: REST-Block mit `vi.stubEnv('VITE_API_URL','/api/v1')` gepinnt: `recipeImageSrc({id:1,hash:'ab12',name:null})` → `/api/v1/images/ab12`; Hash wird encodiert (`'a/b'` → `a%2Fb`); `imageName` nutzt `name`, sonst `Bild <id>`; `userImageSrc('cd34')` → `/api/v1/images/cd34` (AC 5). Mock-Block: `showsRecipeImages`-Fall weg; URL-/Caption-Fälle bleiben; neu: `base:'/foo/'` → `recipeImageSrc(ref(3)) === '/foo/recipes/3.svg'`; `userImageSrc` Mock-URL unverändert (AC 6).
  - `src/api/stubs.test.ts`: `['images','ratings']` → `['ratings']` (AC 4; `isStubbed('images')` kompiliert zudem nicht mehr).
  - Die 8 Tests mit `f === 'images'`-Mock: `src/list/rowData.test.ts`, `src/App.basename.test.tsx`, `src/pages/RecipeList.search.test.tsx`, `src/pages/RecipeDetail.images.test.tsx`, `src/components/list/RecipeListView.test.tsx`, `src/components/recipe/RecipeRow.test.tsx`, `src/components/recipe/RecipeTile.test.tsx`, `src/components/editor/ImageManager.test.tsx`. Mock entfernen; Vitest läuft im REST-Modus (`VITE_MOCK` ungesetzt) → Mock-URL-Erwartungen (`/recipes/3.svg`, `/foo/recipes/3.svg`) auf `/api/v1/images/h3`; „stubbed → kein Bild“-Fälle löschen bzw. auf „Bild sichtbar“ drehen. `App.basename`: REST-URLs folgen bewusst nicht dem Basename (`apiUrl` nutzt `VITE_API_URL`); der Basename-Fall für Bilder liegt im neuen Mock-Test in `assets.test.ts`.
  - AC 1 hier mit abdecken: Zeile, Kachel und Detail mit `mainImage.hash = 'ab12'` rendern `img[src="/api/v1/images/ab12"]` (RecipeRow.test, RecipeTile.test, RecipeDetail.images.test).

Commit: `Bilder: REST-URLs statt Platzhalter-Stub (#144)`

## Schritt 2 — `RecipeImage` + `useImageFailed`

- Neu `src/components/recipe/RecipeImage.tsx` (React 18.3 → `forwardRef<HTMLImageElement>`):
  - `useImageFailed(src)` → `{ failed, onError }`; intern `failedSrc` State, `failed = failedSrc === src` (why-Kommentar: Bildwechsel setzt ohne Effect zurück).
  - `RecipeImage` Props: `image: ImageRef`, `alt: string`, `className?` (nur `<img>`), `fallbackClassName?` (nur Default-Fallback), `fallback?: ReactNode` (ersetzt Default), `onClick?`, `onLoad?`, `loading?`.
  - Default-Fallback: `<div data-testid="image-fallback" onClick={onClick} className={cn('flex items-center justify-center bg-muted text-muted-foreground/40', fallbackClassName)}><ImageOff className="size-6" /></div>`; bei nicht-leerem `alt` zusätzlich `role="img" aria-label={alt}`, sonst `aria-hidden`. Theme-Tokens → hell/dunkel.
- `RecipeImage.test.tsx`: rendert `<img src>`; `fireEvent.error` → Fallback (AC 3); eigener `fallback` wird genutzt; neues `image` zeigt wieder `<img>`; `onClick` feuert am Fallback.

Commit: `RecipeImage: Bild mit Platzhalter bei Ladefehler (#144)`

## Schritt 3 — Aufrufer auf `RecipeImage` umstellen

- `RecipeRow.tsx`: `<RecipeImage image alt="" className="h-full w-full object-cover" fallback={<UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />} />` — Fehler sieht aus wie „kein Foto“ (Container ist schon flex-zentriert).
- `RecipeTile.tsx`: nutzt `useImageFailed(src)`; `showPhoto = photo !== null && !failed`; behält eigenes `<img>` (lazy, Hover-Scale) mit `onError`, sonst Typo-Zweig ohne zweiten Titel (Fehler = „kein Foto“).
- `RecipeImages.tsx`: Hero → `<RecipeImage alt={hero.name ?? alt} onClick={() => onOpen(0)} className={…wie heute…} fallbackClassName={\`h-full aspect-[4/3] ${mainMaxW} cursor-zoom-in rounded-lg\`} />` (Hero ist `w-auto` → Fallback braucht eigene Breite, Cap wie das Bild). Galerie-`Tile` → `<RecipeImage alt="" className="h-full w-full object-cover" fallbackClassName="h-full w-full" />`.
- `Lightbox.tsx`: Hauptbild → `RecipeImage` mit `ref`, `onLoad={computeFit}`, `onClick={stop}`, `fallbackClassName="h-[64vh] w-[50vw] cursor-default rounded-lg"`; Thumbnails → `RecipeImage alt="" fallbackClassName="h-full w-full"`. Test in `Lightbox.test.tsx`: `error` am Hauptbild → Fallback; Klick darauf lässt den Dialog offen.
- `ImageManager.tsx`: beide `<img>` → `RecipeImage` mit `className="size-20 rounded-md object-cover"`, `fallbackClassName="size-20 rounded-md"`; alt bleibt `"Hauptbild"` bzw. `""`.
- `Rating.tsx`: unverändert (AvatarFallback).
- Tests: AC 2 in `ImageManager.test.tsx` mit `useState`-Wrapper, `foodly.uploadImage` gemockt → `{ id: 5, hash: 'ef56', name: null }`; nach Dateiauswahl `img[src="/api/v1/images/ef56"]`. AC 3 zusätzlich: `RecipeTile.test` (Fehler → `tile-type-name`), `RecipeRow.test` (Fehler → Icon, kein img).

Commit: `Liste, Detail, Lightbox und Editor zeigen Platzhalter bei Ladefehler (#144)`

## Schritt 4 — Doku

- `docs/decisions/0003-backend-gap-stubs.md`: §3-Beispielliste ohne `'images'`; §5 und Konsequenz-Punkt zu Bildern knapp als „erledigt durch FE #144 (2026-11)“ markieren.
- `docs/plan.md`: Zeile „Rezeptbilder anzeigen“ aus der Stub-Tabelle (offene Stubs) entfernen.
- `docs/backend-questions.md` B1 (schon „gelöst“): FE-Satz auf „Anzeige umgesetzt in FE #144“ ändern, nicht verschieben.
- Plan ablegen: `docs/superpowers/plans/2026-11-10-recipe-images.md` (ohne Review-Log), Spec als `docs/superpowers/specs/2026-11-10-recipe-images-design.md`.

Commit: `Docs: Bild-Stub abgebaut, Plan und Spec zu #144`

## Schritt 5 — Checks

`npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format` → `format:check`, `npm run lint` (keine neuen Suppressions; bei entfallenen `--prune-suppressions`). Visuell: `npm run dev` im Mock-Modus (Bilder unverändert, Platzhalter z. B. für Mock-Upload-id ≥ 10000). REST-Anzeige ohne Backend nur per Test belegbar → im PR-Body vermerken. Formatierungs-Commit falls nötig.

## Verifikation je Akzeptanzkriterium

| AC | Nachweis |
|---|---|
| 1 REST `<img src="/api/v1/images/ab…">` in Zeile, Kachel, Detail | RecipeRow/RecipeTile/RecipeDetail.images Tests (Schritt 1) |
| 2 Upload sofort sichtbar | ImageManager.test mit State-Wrapper (Schritt 3) |
| 3 Ladefehler → Platzhalter | RecipeImage.test, RecipeTile.test, RecipeRow.test, Lightbox.test |
| 4 `isStubbed('images')` false, kein Demo-Hinweis | stubs.test (`STUBBED` = `['ratings']`), Typ; DemoHint hat keine Bild-Variante |
| 5 `userImageSrc('cd…')` | assets.test |
| 6 Mock unverändert | assets.test Mock-Block inkl. Basename |
| 7 Checks | Schritt 5 |

## Risiken

- Tests sind in `tsc` (`include: ["src"]`): darum alle 8 Stub-Mock-Tests in Commit 1.
- Lightbox `computeFit` bei Fallback: `imgRef` ist null → Guard greift; Fallback hat feste Größe.
- `onClick` auf `<div>`-Fallback: keine jsx-a11y-Regel, gleicher Präzedenzfall wie Hero-`<img onClick>`.

