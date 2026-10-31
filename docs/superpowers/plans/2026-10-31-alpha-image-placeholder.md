# Plan: #37 Placeholder instead of recipe images in REST mode

Spec: `.git/agent-work/spec.md`. Smallest change: everything renders through `recipeImageSrc` (`src/api/assets.ts`), so the switch lives there. No component changes.

## Step 1: placeholder SVG
- New `public/recipes/placeholder.svg`: square `viewBox="0 0 96 96"`, `width="96" height="96"`, transparent background. Centred plate silhouette: an outer circle plus an inner rim circle, with a fork on the left and a knife on the right. Stroke only, one fixed mid-grey (e.g. `#8a8a8a`, full opacity) that reads on light and dark backgrounds. The motif stays inside a ~60% safe area, so 44px and 80px `object-cover` crops keep it whole. No comment needed in the SVG (the reference lives in assets.ts). Full stroke opacity from the start. Visual check on every backdrop: `bg-foreground/5` and `dark:bg-muted` (detail), the Lightbox `bg-black/70`, and the bare ImageManager and RecipeRow thumbnails, in light and dark. Motif echoes RecipeRow's existing `UtensilsCrossed` no-image icon (plate with crossed cutlery), so "placeholder" and "no image" look related.

## Step 2: `recipeImageSrc` / `imageName` in REST mode (`src/api/assets.ts`)
- `import { isStubbed } from './stubs'`.
- `recipeImageSrc(id)`: if `isStubbed('images')`, return `publicUrl('recipes/placeholder.svg')`, built at call time so BASE_URL stubs apply. Otherwise use the existing mock mapping, unchanged.
- `imageName(id)`: if `isStubbed('images')`, return `Bild ${id}` (dev names are mock-data only).
- One short why-comment at the REST branch, e.g. `// Backend #9 (B1): ImageId has no route yet, so REST shows a neutral placeholder (ADR 0003 §5).` Reword the header sentence about dev filename stems in place (replace, don't append).
- Check that no import cycle appears: `stubs.ts` imports `views`/`protocol` only.

## Step 3: tests
- New `src/api/assets.test.ts`, with no static import of `./assets` or `./stubs`. Each case does `vi.stubEnv` (VITE_MOCK and, where relevant, BASE_URL), then `vi.resetModules()`, then `await import('./assets')`, with `afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })`. This follows the pattern from `stubs.test.ts` (`vi.stubEnv('VITE_MOCK', …)` + `vi.resetModules()` + dynamic `import('./assets')`):
  - REST (`VITE_MOCK=''`): `recipeImageSrc(1)`, `(3)` and `(999)` all end in `recipes/placeholder.svg`, and `imageName(1)` is `Bild 1` (AC1).
  - Mock (`VITE_MOCK='1'`): `recipeImageSrc(1)` ends in `recipes/1.png`, `(3)` in `recipes/3.svg`, and `imageName(1)` is `Fertiger Teller` (AC1).
  - REST under base `/foo/`: the placeholder URL is `/foo/recipes/placeholder.svg`.
- `src/App.basename.test.tsx`: exact, mode-aware assertion: `expect(imgSrcs).toContain(isStubbed('images') ? '/foo/recipes/placeholder.svg' : '/foo/recipes/3.svg')`. This proves the placeholder end to end through RecipeDetail, and a local `.env.local` with `VITE_MOCK=1` can't break it. The fixture comment states both cases: REST builds the placeholder at call time; in mock mode id 3 must stay out of `DEV_RECIPE_IMAGE`, because that map captures BASE_URL at module load.
- Reviewer grep: no other test asserts REST image URLs or names. Run the full suite to confirm.

## Step 4: verification
- AC2: visual check in REST mode (Chrome MCP if available, else a dev build with `VITE_MOCK` unset; the backend may be unreachable, so check the placeholder rendering via the test DOM plus opening the SVG on light/dark backgrounds). All render sites are covered by the single function: RecipeRow (detailed), RecipeImages hero and tiles, Lightbox main and strip, ImageManager. Run `grep -rn "<img" src` to confirm no other recipe-image source exists.
- AC3: the comment in assets.ts.
- AC4: already on main (`STUBBED` contains `images`); no change.
- AC5: `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`.

## Step 5: docs
- Copy the plan to `docs/superpowers/plans/2026-10-31-alpha-image-placeholder.md` (as #45 did for the rating stub).

## Commits (no Co-Authored-By or other AI trailer, per CLAUDE.md)
1. `Platzhalter-SVG für Rezeptbilder im REST-Modus` (svg + assets.ts + tests + basename test)
2. Fix-ups from the reviews as separate commits. `npm run format` before the PR.

## PR notes
- In REST mode the detail hero scales the square placeholder to row height, and the editor preview shows the placeholder after a real upload. Both are by design.

## Review log
- Review pass 2 (fresh subagent): no blockers or majors. Applied: exact mode-aware basename assertion with a comment on the module-load trap, test-module hygiene for assets.test.ts, SVG check on every backdrop incl. the Lightbox at full opacity, motif echoing UtensilsCrossed. Skipped the nit on the pre-existing `DEV_RECIPE_IMAGE` comment typo (out of scope).
- Review pass 1 (fresh subagent): no blockers or majors. Applied: mode-independent basename assertion, plan copied to docs/superpowers/plans, the no-trailer rule stated, comment wording pinned, SVG contrast check in both themes. Kept `public/recipes/placeholder.svg` (the issue asks for an SVG in `public/`; that folder already holds recipe image assets).
