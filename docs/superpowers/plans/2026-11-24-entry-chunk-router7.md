# Plan #334 — Entry-Chunk nach React Router 7 (Limit 690 → 710 kB)

Baseline (`npm run build`, main d56b410): entry `dist/assets/index-*.js` 704,26 kB min / 214,05 kB gzip; mock and
native builds 704,66 kB. #331 had brought the entry from ~706 to ~687 kB; React Router 7 (#333) added ~17 kB.

Shrinking the entry back under 690 kB is not worthwhile: the react-router 7 core is a single module (~42–44 kB
minified for the APIs Foodly uses), trimming imports saves ≤ ~2 kB, treeshake options ~0,3 kB. A separate vendor chunk
for the router doesn't help (same first load, the warning would lose its point), and making the eager routes from
#221 lazy would change the first visit.

## Steps

1. `vite.config.ts`: `chunkSizeWarningLimit: 690` → `710` (owner decision, Clarifications in #334), just above the
   entry with the native PRs #336/#337 (708,34 kB web / 708,73 kB native, ~1,3 kB headroom). The comment names
   React Router 7 as part of the entry and keeps the tripwire: a dropped postxl dependency creeping back in (~19 kB)
   still warns.
2. `docs/architecture.md` §5, #309 bullet: append why the router stays in the entry and the limit was raised.
3. Verify: `npm run build` and `npm run build:native` without "Some chunks are larger than"; tests, lint, format.
   No new test: the build output is the check. No runtime change, so no visual check.
