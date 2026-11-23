# Plan #309 — entry chunk without patching postxl (decision B)

Baseline (`npm run build`, main d9becf6): entry `dist/assets/index-*.js` 706,35 kB min / 214,82 kB gzip.
Target lever: Rollup `treeshake.moduleSideEffects` false only for `react-resizable-panels`
(postxl dependency, never used by Foodly). Measured: 687,21 kB / 208,07 kB gzip (−3,1 %).

## Steps

1. `src/treeshake.ts` (new, lives in src/ like `previewBase.ts` so tsc + vitest cover it)
   - `export function hasModuleSideEffects(id: string): boolean` — false when the id lies in
     `/node_modules/<pkg>/` for a package in a small const list (`react-resizable-panels`), else true.
   - Why-comment: postxl's single `dist/index.js` imports every dependency; this package's
     top-level `createContext` + `displayName` writes keep it alive though nothing uses it.
     Imports that *are* used are still bundled, so the flag only drops it while unused.
     Not applied globally (`moduleSideEffects: false` would also drop side-effect-only imports).
   - Path matching normalises `\` to `/` (Windows ids). Comment says when to add a package:
     a postxl dependency Foodly does not use that still shows up in the entry (visualizer), and only
     if its package.json has no `sideEffects` field (Vite passes that on and it wins over this callback).
2. `src/treeshake.test.ts` (new): false for a resizable-panels id (posix + windows path), true for
   `@postxl/ui-components/dist/index.js`, a `.css` file, a src module, and a lookalike
   (`react-resizable-panels-foo`); also a nested
   `@postxl/ui-components/node_modules/react-resizable-panels/` id → false.
3. `vite.config.ts`
   - `build: { chunkSizeWarningLimit: 690, rollupOptions: { treeshake: { moduleSideEffects: hasModuleSideEffects } } }`.
   - Update the comment: entry ~687 kB min after #309; rest is react-dom and postxl, which can't be
     tree-shaken without a build transform of its code (ruled out, #309); limit just above.
   - tsc does not cover vite.config.ts (tsconfig includes only src) — that's why the logic is in src/;
     `npm run build` loading the config is the check. Option applies only to `vite build`
     (dev server and vitest unaffected).
   - Comment names the 690 limit as tripwire: if a postxl upgrade renames/moves the package the
     lever silently stops, and 706 kB warns again.
4. `docs/architecture.md` §Routing/Code-Splitting: one bullet — postxl is not tree-shakeable (single
   bundled file, no PURE annotations); unused deps that stay in only because of their own top-level
   code go into the list in `src/treeshake.ts`; no transforms of postxl code (#309).
5. Verify
   - `npm run build`: entry gzip measurably smaller (expected ~208 kB), no warning; compare the
     before/after chunk list (names + sizes; lazy chunks may differ by a few bytes because shared
     helpers move, explain if so).
   - `grep` dist for `data-panel-group` → absent; visualizer on the after-build shows no react-resizable-panels.
   - Re-measure after on current main; set limit/comment from those numbers (expected ~687 → 690).
   - All five checks: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`.
   - Visual check: not possible (no Chrome MCP) → owner checklist in PR (Start, Liste, Detail, light/dark;
     loading/empty/error; Tooltip, Toast, Sheet, Dropdown).
6. Order: post issue comment first, then open PR, then report "PR ready" to the Dispatcher.
   Issue comment on #309 (condition 1): analysis (before per package, cause, unused components,
   tested levers with numbers, after; 3,1 % < 5 % → condition 2). PR body: AC 1/2 analysis + before/after
   build output + owner visual checklist. Use "Refs #309" (never Closes/Fixes) in PR and commits:
   the Dispatcher closes #309 (condition 3).

## AC mapping
1 analysis → issue comment + PR body (visualizer run from a temp config outside the repo, no devDependency;
  check `git diff package.json package-lock.json` is empty).
2 before/after → PR body. 3 limit 710 → 690 + comment. 4 no postxl change → only Foodly config.
5 checks green, tests unchanged. 6 n/a (condition 2 allows small PR < 5 %).

## Commits (no Co-Authored-By or other AI trailer, per CLAUDE.md; `npm run format` before commit)
1. `build: drop unused react-resizable-panels from entry chunk` (body: Refs #309) (treeshake.ts + test + vite.config)
2. `docs: note postxl tree-shaking limits` (body: Refs #309) — architecture.md bullet + this plan committed as
   `docs/superpowers/plans/2026-11-23-entry-chunk-postxl.md`.

## Review log
- Review pass 1 (fresh reviewer): no blockers. Applied: plan committed under docs/superpowers/plans (major),
  no AI trailer stated (major), tsc wording fixed, nested-path test, tripwire comment, order issue
  comment → PR → "PR ready", visualizer outside repo + lockfile check, chunk-list comparison.
  Not changed: single-entry list kept (cheap, comment says when to extend).
- Review pass 2 (fresh reviewer): no blockers. Applied: rebased on main d9becf6 and re-measured baseline
  (706,35 / 214,82 kB), "Refs #309" instead of closing keyword, `sideEffects`-field caveat in comment,
  visualizer confirmation after build, German decimal commas in docs. Not changed: callback returns
  boolean (Rollup type), docs/plan.md untouched.
