# Plan: #211 Kategorie-Seite bleibt weiß (Effekt gibt Rückgabewert von scrollTo zurück)

Basis: spec.md incl. assumptions A1–A4. Smallest change: fix the one effect, make the intentional cleanup explicit,
add a lint guard via the existing `no-restricted-syntax` rule, add a regression test. No UI change, no new
packages, no new components/routes.

## Step 0: Commit the plan
- Copy this plan as `docs/superpowers/plans/2026-11-13-category-scroll-effect.md` (CLAUDE.md: plans live in
  docs/superpowers/plans; precedent 2026-11-01-clone-button-reset.md). Own commit.

## Step 1: Regression test first (AC1) — `src/pages/CategoryPage.test.tsx`
- `afterEach(() => vi.restoreAllMocks())` so spies don't leak when an assertion fails (vite config has no restoreMocks).
- Helper in the test: `vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve() as unknown as void)`
  (cast because no-misused-promises also checks test files) and `vi.spyOn(console, 'error')`.
- Test A (dev/StrictMode, "opening a category"): `render(<StrictMode>{page()}</StrictMode>)` with the category ready;
  h1 is 'Favoriten'; `unmount()` doesn't throw. On the unfixed code React's StrictMode cleanup calls the Promise and
  `render` itself throws ("destroy is not a function") — that's the expected red.
- Test B (production path, "leaving the page"): plain `render(page())`, h1 'Favoriten', `expect(() => unmount()).not.toThrow()`.
  On the unfixed code React 18 only logs at mount and throws at unmount — red at the unmount assertion.
- Both: `vi.spyOn(console, 'error').mockImplementation(() => {})` and assert no call has ANY argument containing
  'must not return anything besides a function' (React 18.3 logs a format string + args, so a single
  stringContaining matcher via toHaveBeenCalledWith would never match):
  `expect(vi.mocked(console.error).mock.calls.filter((args) => args.some((a) => String(a).includes('must not return anything besides a function')))).toHaveLength(0)`.
- Tests extend the existing file and reuse its `catalog`/`useRecipeSearch` mocks and `page()` helper
  (`catalog.categories = { status: 'ready', list: [CATEGORY] }` in each new test).
- Expected red on the unfixed code: Test A throws at `render` (StrictMode cleanup calls the Promise);
  Test B fails at the warning assertion (logged at mount) and at `unmount`. A test green on the old code is a failure of the test.
- Run on unfixed code: both tests red. Navigation away = unmount (App keys the page by id), so unmount covers "verlassen".

## Step 2: Fix — `src/pages/CategoryPage.tsx:49`
- `useEffect(() => window.scrollTo(0, 0), [])` -> block body. Existing comment above stays; no new comment.
- Tests green.

## Step 3: Lint guard — `eslint.config.js`, `src/hooks/useSocketStatus.ts`, `docs/architecture.md`
- Append to the existing `no-restricted-syntax` array:
  selector `CallExpression[callee.name=/^use(Layout|Insertion)?Effect$/] > ArrowFunctionExpression[body.type!='BlockStatement']`,
  message: "An expression-bodied effect callback hands its value to React as the cleanup; use a block body (and an explicit `return` for a real cleanup)."
  (No code uses `React.useEffect`, so callee.name suffices.)
- Verify before fixing useSocketStatus: eslint flags exactly useSocketStatus.ts:7 (and CategoryPage:49 if checked on the old code via `git stash`/old blob), nothing else.
- `useSocketStatus.ts:7` -> `useEffect(() => { return socket.onStatus(setStatus) }, [])` (same behaviour).
- `docs/architecture.md` §6 table (~line 143): add row
  "`no-restricted-syntax` gegen Effekt-Callbacks ohne Block-Body | Ein Effekt gibt React nur bewusst eine Cleanup-Funktion zurück (#211)".
- Never add to eslint-suppressions.json.

## Step 4: Checks (AC2, AC3)
- `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format` then `npm run format:check`, `npm run lint`.
- AC2: `grep -rnE "useEffect\(\(\) => [a-zA-Z.]+\(" src` -> no hits.
- Visual check: not needed (no visual change); behaviour covered by tests.

## Commits (no Co-Authored-By)
0. `docs: plan for #211 category scroll effect`
1. `fix(category): give the scroll-to-top effect a block body (#211)` — CategoryPage.tsx + CategoryPage.test.tsx
2. `chore(lint): forbid expression-bodied effect callbacks (#211)` — eslint.config.js + useSocketStatus.ts + docs/architecture.md
PR text names all five checks as green.

