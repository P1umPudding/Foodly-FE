# Plan #242 — Mockup-Angleich: Seitentitel und Abschnittsköpfe

Issue: #242 (Befunde A2–A4, K-2, L2 aus `docs/design/redesign/audit/shell.md`, Gruppe G2).

## Annahmen (Spec-Review)
1. Real deltas (compact scale: text-lg=15, text-2xl=26): Home greeting 36→26 (A3), date line 14/400 muted → 13/500 subtle (A2), NotFound title text-4xl → PageTitle; section header h2 already 15/600, gets tracking -0.01em, baseline alignment, and the link changes to 13/500 muted (A4). Category head (K-2) already matches → only switched to PageTitle with `text-cat-ink`, no visual change. Auth title (L2) gets -0.025em tracking and line-height 1.15 via PageTitle.
2. PageTitle = h1 (prop `as` optional), `text-2xl/[1.15] font-[650] tracking-[-0.025em]`, NOT combined with `.font-display` (its -0.015em letter-spacing in the utilities layer would win). Same size on phone (mockup has no phone override). className pass-through for colour (cat-ink).
3. Date line in `text-subtle-foreground`: the issue names it explicitly, which design.md §0 permits as an exception ("oder ein Issue sie ausdrücklich nennt"), although subtle is below AA for 13px text. Flagged in the PR so the owners see it; design.md not edited (Designer-owned).
4. SectionHeader link: router Link styled 13/500 `text-muted-foreground`, no underline, hover → `text-foreground`, focus ring as in the app (focusRing helper), shown only in `ready` state (unchanged behaviour). Section spacing stays from the existing layout (gap-8 / gap-3 ≈ mockup 32/12); date/title gap removed (mockup: no gap).
5. Login/Register/NotFound have no mockup screen: aligning them is for consistency, not mockup match.
6. Out of scope: RecipeList (#237), RecipeEditor (#231), RecipeDetail title, CategoryPage "Kategorie nicht gefunden", Categories.tsx "Meine Kategorien", RecipeImages "Fotos". PanelHead (sheet head) untouched.
7. AC2: no existing test asserts font classes of the in-scope elements; tests are added at component level (PageTitle/SectionHeader) plus Home (AC1) via the components' data-slot hooks. Screenshots cover Home loading state as well.


## Step 1 — `src/components/PageTitle.tsx` (new)
- `PageTitle({ children, className })`: always h1 (all four callers are h1; Home keeps h1 on purpose although the mockup uses h2 there). `<h1 data-slot="page-title" className={cn('font-(family-name:--font-display) text-2xl/[1.15] font-[650] tracking-[-0.025em] break-words', className)}>`. No colour class: colour is inherited (callers add `text-cat-ink`), so no reliance on tailwind-merge.
  No `.font-display`: move the one-line reason from CategoryPage.tsx:123 into PageTitle.
- `PageTitle.test.tsx`: h1 with accessible name; one class check (size/weight/tracking, no `font-display`); className appended.

## Step 2 — `src/components/SectionHeader.tsx` (new)
- `SectionHeader({ id, title, link? })`: `<div data-slot="section-header" className="flex items-baseline justify-between gap-3"><h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">` + optional router `<Link>` with `cn(FOCUS_RING, 'inline-flex items-center rounded-xs text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 touch:min-h-10')` (design.md §7: 40 px tap target on touch; inline-flex keeps the first-line baseline for items-baseline).
  Plain router Link (like AuthLink / RecipeCategoryChips), not postxl Button variant=link (that brings foreground colour, underline, 36px box).
- `SectionHeader.test.tsx`: h2 with title + id; link role/name/href; no link when omitted; classes 15/600 (text-lg font-semibold) and link 13/500 muted, no underline class, `touch:min-h-10`.

## Step 3 — HomeSection uses SectionHeader
- `src/components/home/HomeSection.tsx`: replace the header div with `<SectionHeader id={headingId} title={title} link={state === 'ready' ? link : undefined} />`; drop the postxl Button import if unused.
- `HomeSection.test.tsx`: already covers link only in `ready` + href; nothing to add. Keep `Skeleton` import, drop only `Button`.

## Step 4 — Home uses PageTitle
- `src/pages/Home.tsx`: header block → `<div className="flex flex-col">` (no gap; mockup has none) with `<p className="text-sm/[1.5] font-medium text-subtle-foreground">{date}</p>` and `<PageTitle>{greeting}</PageTitle>`. Short comment why subtle is used despite design.md (issue #242 names it explicitly). Keep Page layout (gap-8 ≈ 32px section spacing).
- Home test (AC1): extend the existing `Home.test.tsx` case that renders the "Kategorien" section: h1 greeting has `data-slot="page-title"`; "Kategorien" h2 and "Verwalten" link sit inside the same `[data-slot="section-header"]` (assert `heading.closest('[data-slot="section-header"]')` non-null and contains the link).
- `.home-head` 8px top margin on desktop (0 on phone): add only if the screenshot comparison shows a difference.

## Step 5 — Category head, Auth, NotFound
- `CategoryPage.tsx:125`: h1 → `<PageTitle className="text-cat-ink">`; remove the old comment above it (its reason now lives in PageTitle.tsx); no visual change.
- `AuthCard.tsx:10`: h1 → `<PageTitle className="mt-1 mb-6">`.
- `NotFound.tsx:9`: h1 → `<PageTitle className="mt-4">` (Button import stays).
- AC2: no existing test asserts font classes of these elements (checked); full suite must stay green, state that in the PR rather than inventing edits.

## Step 6 — Checks and screenshots
- `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`, `npm run lint`.
- Screenshots (AC3): Chrome MCP is not available in this agent container; the Dispatcher explicitly asked for headless Chrome via Playwright in scratch. Playwright lives only in $SKAILE_SESSION_SCRATCH, never in the project's package.json, app via `VITE_MOCK=1` vite preview/dev, mockup via static server on `docs/design/redesign/app.html?theme=…#/home` (and category screen). Desktop 1280×800 + phone 390×844, light/dark: Home, category head, login, NotFound; app vs mockup side by side. Image hosting (gh has no attachment upload): commit the PNGs under `docs/pr-assets/242/` in one commit on agent/issue-242, push, reference them in the PR body by raw URL pinned to that commit SHA, then remove them in the next commit so the final diff contains no images.

## Commits
0. `docs/superpowers/plans/2026-11-14-seitentitel-abschnittskoepfe.md` (spec assumptions, plan, review log; German like its siblings) committed with commit 1.
1. `PageTitle und SectionHeader als gemeinsame Komponenten (#242)` (steps 1–2)
2. `Start: Titel, Datumszeile und Abschnittsköpfe wie im Mockup (#242)` (steps 3–4)
3. `Kategorie-Kopf, Anmeldung und NotFound nutzen PageTitle (#242)` (step 5)
4. format commit only if needed.
5. screenshots add + remove commits (PR step).
No `Co-Authored-By` or other AI trailer on any commit (CLAUDE.md overrides the harness default).

## AC mapping
1 → step 4 test; 2 → step 5 test runs/adjustments; 3 → step 6 screenshots in PR; 4 → step 6 checks.

## Review log
- Review pass 1 (fresh subagent): 0 blocker, 3 major (cn/tailwind-merge reliance → no colour class in PageTitle; no-trailer rule → added; screenshot tooling/location → justified + decided), 4 minor (drop `as`; fewer class-only tests, reuse existing Home test; AC2 needs no edits; keep CategoryPage comment reason), nits (imports, .home-head margin, npm ci) — all applied.
- Review pass 2 (fresh subagent): 0 blocker, 1 major (section link tap target → `inline-flex touch:min-h-10`), 2 minor (commit plan to docs/superpowers/plans; stronger AC1 assertion), 2 nits (date line-height 1.5; CategoryPage comment moved) — all applied.
