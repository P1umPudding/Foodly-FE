# Plan — #138 rohe <button> in RecipeImages und Lightbox

Smallest change: swap the two raw `<button>` for the existing `TriggerButton variant="bare"` (`src/components/TriggerButton.tsx`),
which renders `type="button"` + `FOCUS_RING` only (no size/padding/hover styles), so layout stays unchanged.

## Step 0 — setup
- `npm ci` (node_modules missing) before anything else.

## Step 1 — RecipeImages tile (`src/components/recipe/RecipeImages.tsx`)
- Import `TriggerButton` from `../TriggerButton` and `imageName` from `../../api/assets`.
- `Tile`: replace `<button type="button" …>` by `<TriggerButton variant="bare" onClick={onClick} aria-label={label} className={…}>`,
  `Tile` takes `more?: number` instead of the `overlay` string; it renders "+{more}" and the label is `imageName(image)`,
  plus `, N weitere Bilder` (singular `1 weiteres Bild`) when set, so the hint is not lost to screen readers.
  Keep existing classes (`relative cursor-zoom-in overflow-hidden rounded-lg bg-foreground/5 dark:bg-muted ${className}`) and add
  `focus-visible:ring-ring` (full-opacity token, ≥3:1 per design.md). Overlay span and RecipeImage unchanged.
- New test `src/components/recipe/RecipeImages.test.tsx`:
  - 2 images → one tile button named after image 2 (`imageName`), `type="button"`, click → `onOpen(1)`.
  - 5 images → two tiles; second shows "+2" and is named `Bild 3, 2 weitere Bilder` (4 images → `1 weiteres Bild`); clicks → `onOpen(1)` / `onOpen(2)`.
  - tile class list (split on whitespace, `arrayContaining`) has `focus-visible:ring-[3px]` and `focus-visible:ring-ring`, and not `focus-visible:ring-ring/50`.

## Step 2 — Lightbox thumbnails (`src/components/recipe/Lightbox.tsx`)
- Import `TriggerButton` from `../TriggerButton`.
- Replace the thumbnail `<button>` with `<TriggerButton variant="bare" key=… onClick={() => onIndexChange(i)} aria-label={imageName(thumb)} className=…>`.
  Classes: existing ones + `focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black` for all;
  active additionally `ring-2 ring-white focus-visible:ring-white` (via `cn`, already imported; last wins in tailwind-merge).
  Lightbox-only (design.md §6 "kein zusätzlicher Ring" is about form fields). The offset gap makes focus clearly distinguishable from the active marker (ring-2 vs ring-[3px] alone differ by 1 px).
  Strip padding `p-1` → `p-1.5` (6 px) so the 3 px ring + 2 px offset isn't clipped by `overflow-x-auto`.
  Thumbnail stays a direct child of the strip (scroll uses `strip.children[index]`).
- Extend `Lightbox.test.tsx` (new describe "Lightbox thumbnails"): 3 images, index 0 → buttons named `Bild 1..3`
  (`ref(id)` has `name: null`, so `imageName` → `Bild ${id}`), `type="button"`, click on 3rd → `onIndexChange(2)`;
  active thumbnail has `aria-current`; inactive has `focus-visible:ring-white/60`, `focus-visible:ring-[3px]`, `focus-visible:ring-offset-2`; active has `ring-white` + `focus-visible:ring-white` (exact class-list checks).
  Note: names may collide with the main image alt / caption — query with `getByRole('button', { name })`.

## Step 3 — suppressions
- `npx eslint . --prune-suppressions` → `eslint-suppressions.json` becomes `{}` (keep file). `npm run lint` clean.

## Step 4 — checks + visual
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format` then `format:check`, `npm run lint`.
- Visual check (Chrome MCP if available, otherwise note as not done): detail page with 1/2/4 images light+dark, lightbox thumbs, Tab focus ring.

## Acceptance criteria → verification
1. Suppressions entries removed → Step 3, file diff `{}`, `npm run lint` green.
2. Tests green, keyboard + aria-label kept → existing tests + new tests (role button, name, type=button; native button gives Enter/Space).
3. Five local checks green → Step 4.

## Commits
Main commit (as #137, review fixes follow as separate commits): `Lint-Altlast react/forbid-elements abbauen: RecipeImages und Lightbox (#138)` — both components, tests,
pruned `eslint-suppressions.json` and this plan as `docs/superpowers/plans/2026-11-11-lint-forbid-elements.md`
(CLAUDE.md: plans live in docs/superpowers/plans). One commit because ESLint 9 fails on unpruned suppressions,
so a component-only commit would not pass `npm run lint`. No Co-Authored-By trailer.
