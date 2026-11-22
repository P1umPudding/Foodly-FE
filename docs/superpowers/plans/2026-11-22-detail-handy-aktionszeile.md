# Plan #301 — Handy-Detail: Aktionszeile einzeilig, Toggles ins ⋯, Stift ghost

Basis: spec.md (A1–A7). Breakpoint = `phone:` / `useIsDesktop()` (761 px).

## Steps
1. **WakeLockToggle controlled** (`src/components/WakeLockToggle.tsx`)
   - Props `{ enabled: boolean; supported: boolean; onToggle: () => void }`; no own `useWakeLock`. Returns null when !supported.
   - Rewrite `WakeLockToggle.test.tsx` to pass props (drop the vi.mock of useWakeLock).
   - CookMode untouched (uses MugIcon + useWakeLock directly).
2. **RecipeDetail: lift wake-lock state** (same commit as step 1, so every commit builds) — `const wakeLock = useWakeLock()` in `RecipeDetail`; pass to the row toggle and menu item. Destructure `const { enabled: wakeEnabled, supported: wakeSupported, setEnabled: setWakeLock } = useWakeLock()` (top of RecipeDetail next to useCheckedIngredients; stable setter keeps exhaustive-deps happy) and add `setWakeLock(false)` + dep to the existing `[recipeId]` reset effect so a recipe switch releases the lock as the unmount did before.
3. **Action row single line** (`RecipeDetail.tsx` ~l.323–350)
   - Toggle wrapper: drop `phone:order-last phone:basis-full`, add `phone:hidden`.
   - Row: `flex flex-wrap ... phone:flex-nowrap`.
   - PortionScaler unchanged: size text already truncates on phones (`min-w-0 truncate`, stepper `phone:flex-1 phone:basis-0`). Update the row comment (l.320–321).
4. **Header ⋯ menu** (`RecipeDetail.tsx` HeaderActions)
   - `const isDesktop = useIsDesktop()` at the top of RecipeDetail; `showMore = isOwner || !isDesktop`.
   - Same `DropdownMenu` element regardless of isDesktop (only its items switch), so an open owner menu isn't remounted on resize.
   - On phones the menu holds postxl `DropdownMenuCheckboxItem`s "Zutaten abhaken" (checked=checkable, onCheckedChange→setCheckable) and "Bildschirm anlassen" (only if wakeLock.supported; checked=enabled; onCheckedChange→setEnabled). Both use `onSelect={(e) => e.preventDefault()}` so the menu stays open and the new check state is visible. Then `DropdownMenuSeparator` + Löschen (`inset` on phones so icons align with the checkbox items) for the owner.
   - Update misleading comments (l.133–134, l.168 "owner only").
   - Desktop: unchanged (owner-only, Löschen only).
   - DeleteRecipeDialog/focus logic untouched.
5. **Pencil variant** — `buttonVariants({ variant: isDesktop ? 'outline' : 'ghost', size: 'sm' })`; label span already `phone:hidden`.
6. **Tests** (new `src/pages/RecipeDetail.mobile.test.tsx`, using `setViewport(390)` / reset to 1024 in afterEach):
   - AC1: action row has `phone:flex-nowrap`, toggle wrapper has `phone:hidden`, no `phone:basis-full` in row.
   - Open ⋯ via keyDown Enter on the trigger (as delete.test does); Menu stays open on toggle (preventDefault), so assert aria-checked right after the click. Query by role (`menuitemcheckbox`) since phone:hidden buttons still exist in jsdom.
   - Wake lock stub: define `navigator.wakeLock = { request: vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) }) }` before render, assert `request` in waitFor, `delete` it in afterEach.
   - AC2: at 390 px, viewer/editor/owner get ⋯; opening shows checkbox items "Zutaten abhaken" (aria-checked false → click → true; ingredients become checkboxes) and "Bildschirm anlassen" (stub `navigator.wakeLock`; aria-checked toggles; request called). Löschen only for owner. Wake-lock item absent without API.
   - AC3: at 1024 px row toggles present, ⋯ absent for editor/viewer, owner's menu has only Löschen.
   - AC4: at 390 px pencil classes contain ghost tokens, not outline border tokens; desktop still outline (existing test).
   - Resize: open menu at 390 px, setViewport(1024) → toggle items gone (owner keeps Löschen).
   - Rename head.test l.369 ("an editor gets the pencil on phones…") so the ⋯-absent assertion is clearly desktop.
   - Existing desktop tests stay valid unchanged (head.test 376, 380–392; categories.test 283; rating.test 81/94), jsdom default 1024 px = desktop.
7. **Plan doc**: copy this plan to `docs/superpowers/plans/2026-11-22-detail-handy-aktionszeile.md` (repo convention).
8. **Checks** (CLAUDE.md five): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint` (run `npm run format` before). Visual check at 390 px light/dark (Chrome MCP if available, not Playwright) next to the mockups in `docs/design/redesign/gap-1911/` on the designer branch.

## Commits
1. `refactor: WakeLockToggle controlled, wake-lock state in RecipeDetail`
2. `feat(detail): phone action row in one line, toggles in ⋯ menu (#301)`
3. `feat(detail): ghost pencil on phones (#301)`
4. `test(detail): phone header menu and action row (#301)`

## Review log
- Review pass 1 (fresh subagent): no blockers. Applied: merge steps 1+2 into one commit (build), Radix close-on-select in tests + keyboard open, release wake lock on recipe switch, keep PortionScaler phone:max-w-none, wake-lock stub hygiene, five checks incl. npm ci, Chrome MCP screenshots, plan in docs/superpowers/plans, DropdownMenuSeparator, stable DropdownMenu on resize + resize test, comment updates, role-based queries. No Co-Authored-By trailer.
- Review pass 2 (fresh subagent): no blockers. Applied: stable setWakeLock in reset-effect deps (lint), hooks placed at top of RecipeDetail, rename misleading head.test, async wake-lock stub with waitFor, keep menu open on toggle (preventDefault) so state is visible, inset Löschen for alignment.
