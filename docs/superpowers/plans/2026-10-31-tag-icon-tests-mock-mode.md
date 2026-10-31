# Plan: #55 Tag-Icon-Tests (REST) schlagen mit VITE_MOCK=1 fehl

Spec: `.git/agent-work/spec.md`

Approach: pin REST mode at file level with `vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))` in both test files. `vi.hoisted` runs before the static imports (TagText/TagChips -> api/assets -> api/index), so `import.meta.env.VITE_MOCK` is `''` when those modules load. Add `afterAll(() => vi.unstubAllEnvs())`, because `vite.config.ts` does not set `unstubEnvs`. The static imports stay, so `resetTagIconCache` refers to the same module instance the component uses; `resetModules` would leave the test with a second copy and an empty cache trap. The mode applies to every test in the files, not only the 6 that fail. No app code changes.

## Steps
0. Reproduce: `VITE_MOCK=1 npx vitest run src/components/TagText.test.tsx src/components/recipe/TagChips.test.tsx` fails 6 tests.
1. `src/components/TagText.test.tsx`
   - Add `afterAll` to the vitest import.
   - Directly after the imports and before `vi.mock(...)`: replace the stale comment "Vitest runs in REST mode (VITE_MOCK unset)…" with a why-only comment (e.g. "The mode is read when the modules load, so pin REST before the imports run (vi.hoisted), whatever the shell env or .env.local sets."), then `vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))`.
   - Add `afterAll(() => vi.unstubAllEnvs())`.
2. `src/components/recipe/TagChips.test.tsx`: the same change (its stale comment is "REST mode (vitest default)…").
3. Re-run the step 0 command: green.
4. Copy this plan (with the complete review log) to `docs/superpowers/plans/2026-10-31-tag-icon-tests-mock-mode.md` (repo convention, as in #50/#54; prettier ignores .md).
5. Verify:
   - AC1: `npx vitest run` and `VITE_MOCK=1 npx vitest run`, both fully green.
   - AC2: the REST describes still run. Same test count in both modes, 0 skipped.
   - AC3: `npm run format` first, then `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check` on the final state.
   - No visual check (test-only change).
6. Commit: one commit with the test change and the plan doc, in German repo style, without an AI trailer:
   `Tests: REST-Modus in Tag-Icon-Tests fest setzen`, with a body explaining why (the mode is read when the modules load, so VITE_MOCK=1 in the shell or .env.local turned the REST tests red; the plan doc is included).

Out of scope (PR note only): if `SKAILE_PREVIEW_BASE` is set and neither VITE_MOCK nor VITE_API_URL is set, `vite.config.ts` `define`s VITE_MOCK='1' at transform time, which `vi.stubEnv` cannot override. The same limit exists in `assets.test.ts` and others.

## Review log
- Review pass 1 (fresh subagent): ready, no blockers or majors. Verified in a /tmp copy: 473/473 green with VITE_MOCK unset, shell VITE_MOCK=1, and .env.local. Adopted: the before/after effectiveness check, a plan doc in docs/superpowers/plans, format before format:check, the comment also covers the shell env, vi.hoisted right after the imports.
- Review pass 2 (fresh subagent): ready, no blockers or majors. Adopted: a German commit message in `Bereich: Beschreibung` style without (#55), reproduction moved to step 0, the plan doc is a copy of this plan, the doc goes in the same commit (stated explicitly), and a note on the SKAILE_PREVIEW_BASE define limit.
