# Plan: #74 Handy: „+“-FAB verdeckt die letzte Karte der Rezeptliste

Basis: spec.md incl. assumptions A1–A5. Smallest change: phone-only bottom padding on the RecipeList outer wrapper. No shell change, FAB/TabBar/toast offset untouched.

## Step 0: Commit the plan
- Copy this plan as `docs/superpowers/plans/2026-11-01-phone-fab-clearance.md` (CLAUDE.md: plans live in docs/superpowers/plans; precedent #67, #84). Own commit.

## Step 1: Fix in `src/pages/RecipeList.tsx` (outer grid wrapper, ~:217)
- `pb-10` → `pb-10 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]`.
- Extend the existing comment above the wrapper with one why-line, no exact rem numbers: on phones the shell's bottom padding only clears the tab bar, so the list adds room to scroll the last card past the fixed "+" button; the safe-area inset is ready for viewport-fit=cover.
- `phone:` variant (<761 px, = useIsDesktop, #66); no `lg:`/`max-*` breakpoint → 761 px+ keeps `pb-10` (AC3); phoneVariant.test's raw-breakpoint guard stays green.
- Wrapper-level, so loading/error/empty states, the loadingMore skeleton and the sentinel are covered; the sentinel stays the last element.

## Step 2: Test (AC2, AC3, AC4) in `src/pages/RecipeList.search.test.tsx`
- Add a top-level `describe('RecipeList (layout)')` (sibling of `'RecipeList (server-side search)'`, not nested) with one `it` reusing the file's existing mocks/helpers (`renderList`, `searchRecipes` + `listCategories` spies as the other tests do). Await the settled state (`findByText` of a recipe name) to avoid act() warnings.
- Locate the wrapper via the sr-only h1 „Rezepte“ → `closest('.grid')`; assert exact tokens via `classList.contains('pb-10')` and `classList.contains('phone:pb-[calc(6rem+env(safe-area-inset-bottom))]')`.
- One-line comment: jsdom has no layout (and the width doesn't matter), so the class pins the geometry (AC1).

## Step 3: Verify
- Mutation checks: remove the phone class → test fails; drop `pb-10` → test fails. Restore.
- `npm run format`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`.
- Built CSS: grep `dist/assets/*.css` for `safe-area-inset-bottom` and check by eye that the rule sits inside the phone media block (minified form may be `(width<761px)` or `(max-width:760.98px)`) and reads `calc(6rem + env(safe-area-inset-bottom))`; it appears exactly once.
- AC1 geometry (for the PR): FAB top = `bottom-20` 5rem + `size-14` 3.5rem = 8.5rem; below the last card on phone = 0.25rem sentinel + 6rem + 4rem shell = 10.25rem → 1.75rem (28 px) clearance.
- Visual check at 375 px with the Chrome MCP (CLAUDE.md, not Playwright) if available; otherwise state in the PR that it was not done (QA container also lacks Chrome) and ask for a manual check.

## Commits
0. `Plan: Rezeptliste am Handy unter dem „+“-Knopf freihalten (#74)` (docs/superpowers/plans)
1. `RecipeList: letzte Karte am Handy nicht mehr unter dem „+“-Knopf (#74)` (fix + test)
`npm run format` before the commit. No Co-Authored-By or other AI trailer.

## Review log
- Review pass 1 (fresh subagent): no blocker/major. Applied: CSS grep loosened for minified media query; test needs both spies and an awaited settled state; Chrome MCP named; plan committed to docs/superpowers/plans; test added to the existing RecipeList.search.test instead of a new file (no duplicated mocks); comment without exact rem numbers; format before build/test.
- Review pass 2 (fresh subagent): no blocker/major; pass-1 fixes OK. Applied: exact class-token assertions; describe as top-level sibling in the existing file; second mutation check for `pb-10`; viewport note in the test comment; rule appears once in built CSS.
