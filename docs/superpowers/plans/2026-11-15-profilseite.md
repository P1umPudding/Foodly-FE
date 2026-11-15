# Plan — #245 Profilseite /profile

Spec: `.git/agent-work/spec.md` (A1–A9, C1 = Option A: no wake-lock on profile).
Rules: CLAUDE.md (postxl components, Tailwind only, why-comments, no AI trailer).

## Step 1 — Theme segment (reuse reveal animation)
- `src/components/list/Segment.tsx`: add optional `onItemClick?: (v: T, e: React.MouseEvent<HTMLElement>) => void`,
  forwarded as `onClick` to each `FocusToggleGroupItem` (the theme reveal needs the click point). Look stays in Segment.
- `src/components/ThemeMenu.tsx`: KEEP `ThemeSubmenu` for now (still used by ProfileMenu until step 3). Add
  `ThemeSegment` = `<Segment withLabels value={colorMode} onChange={noop} onItemClick={(v, e) => void select(e, v)}
  itemClassName="h-8 gap-1.5" aria-labelledby=…>`; options Hell (Sun) / Dunkel (Moon) / System (no icon, mockup
  app.js:920). Segment options' `Icon` is a LucideIcon → use lucide `Sun`/`Moon` (or widen the type; pick lucide).
- `src/components/ThemeMenu.test.tsx`: add ThemeSegment tests: three `radio`s, active one `aria-checked`, click
  „Dunkel“ → `html.dark` + `localStorage['foodly-theme']`, click on the active item keeps it checked. Wrap in ThemeProvider.
- Commit: `feat(profile): Theme als Segment statt Untermenü`

## Step 2 — Profile page
- New `src/pages/Profile.tsx`, inside `<Page>`; content column `max-w-[640px]` like Categories.
  - `<h1 className="sr-only">Profil & Einstellungen</h1>` (shell header is not a heading).
  - Head (`prof-head`: flex, gap-4, items-center, mb-6): postxl `Avatar` size-14 with initials fallback
    (same rule as ProfileMenu: `me?.name.trim()[0]` upper-case, else „?“), name as `h2` 22 px semibold
    (`text-[22px]`, fallback „Profil“). No subtitle (A2).
  - Section heading „Darstellung“ (`col-h`: 12 px semibold subtle, mb-2) → postxl `Card` (set-card: mb-5, px-1 py-0.5)
    with one row (p-3): „Design“ (grow) + `ThemeSegment`.
  - Card with rows: `Link to="/categories"` row „Kategorien“ + `ChevronRight` (hover bg like `a.row.set`),
    and — only if `foodly.auth.canSignOut` — „Abmelden“ in `text-destructive`, as postxl `Button variant="ghost"`
    styled as a full-width row (left-aligned, p-3), `onClick={() => void foodly.auth.signOut()}`, no confirm/toast.
    Abmelden button classes override ghost defaults: `h-auto w-full justify-start rounded-sm p-3 text-base font-medium
    text-destructive hover:bg-transparent hover:text-destructive` (mockup: non-link row has no hover fill).
  - Row divider: inset hairline like Categories `ROW` (Categories.tsx:36-38). Move the hairline part into a shared
    export (e.g. `src/components/rowDivider.ts` `ROW_DIVIDER`), compose it in Categories and Profile — no `divide-y`.
  - postxl `Card` reset: `gap-0 p-0 px-1 py-0.5 mb-5` (Card defaults padding/gap, cf. Categories.tsx:120).
  - Kategorien row: `FOCUS_RING`, `hover:bg-hover`, chevron `text-muted-foreground`.
  - Avatar fallback text 22 px (`text-[22px]`, base.css:372-376).
- `src/App.tsx`: `<Route path="/profile" element={<Profile />} />` inside `RequireAuth`.
- `src/components/shell/nav.ts`: `routeTitle('/profile')` → „Profil & Einstellungen“; `nav.test.ts` row.
  AppShell non-subpage title branch (AppShell.tsx:113): `!isDesktop && pathname === '/profile' ? 'Profil' : routeTitle(pathname)`.
  AppShell.header tests: desktop/phone titles, /profile on phone has no avatar and no back arrow.
- `src/components/shell/origin.ts`: `parentHref('/categories')` → `'/profile'` (update comment);
  `staticOriginLabel('/profile')` → `'Profil'`. Update `origin.test.ts`, and `AppShell.header.test.tsx:178-183`
  („back leads to Start without history“ → leads to /profile).
- Tests:
  - AC1 guard: add `/profile` rows to both `it.each` tables in `src/App.routes.test.tsx` + `vi.mock('./pages/Profile')`.
  - `src/pages/Profile.test.tsx`: `<ThemeProvider><MemoryRouter><Profile/></MemoryRouter></ThemeProvider>`, `useMe` mocked:
    name + initial, „Darstellung“, click „Dunkel“ → dark theme (AC1 theme); „Kategorien“ href `/categories`;
    REST: „Abmelden“ button calls `foodly.auth.signOut`.
  - `src/pages/Profile.mock.test.tsx` (stubEnv + resetModules, like ProfileMenu.mock.test): no „Abmelden“.
- Commit: `feat(profile): Profilseite /profile`

## Step 3 — Avatar links instead of dropdown
- `src/components/shell/ProfileMenu.tsx` → rename to `ProfileLink.tsx` (export `ProfileLink`), keep variants
  avatar/row/icon, avatar sizes, tooltip on `icon` (TooltipTrigger asChild directly on the Link; keep the `'flex'`
  fix for the collapsed rail). Row keeps aria-label `${name} – Profil & Einstellungen`. Sidebar avatar `size-[22px]`
  (audit S7, mockup `.avatar.xs`). Render react-router `Link to="/profile"` styled with
  `navItemClass(active, collapsed)` (row/icon) or `buttonVariants({variant:'ghost', size:'icon'})` + `size-10 rounded-full`
  (avatar). Labels: aria-label „Profil & Einstellungen“ (avatar/icon), row shows name.
  Active (sidebar, A5): exact `pathname === '/profile'` → `aria-current="page"`, exact `'/categories'` → `"location"`
  (not `/categories/:id`, that belongs to Rezepte), highlight via `navItemClass(true, …)`.
  Drop the DropdownMenu imports; delete `ThemeSubmenu` + its tests from ThemeMenu(.test).tsx now.
- `Sidebar.tsx`, `AppShell.tsx`: use `ProfileLink`. Phone header avatar stays on main pages only
  (`onMainPage`), which excludes /profile (mockup: no avatar on profile) — unchanged logic.
- `TabBar.tsx`: verify no tab is active on /profile (only `/` and `/recipes` paths) — no change expected.
- Tests: rewrite `AppShell.test.tsx` profile-menu cases (links → `/profile`, expanded + collapsed sidebar + phone;
  add `<Route path="/profile">` to `renderAt` and click through; active state on /profile and /categories, not on
  /categories/2). AC3 covered here.
  `SignOut.test.tsx`: keep; its AppShell mock renders `<ProfileLink variant="row" />` + `<Profile />`, start at
  `/profile`, click button „Abmelden“; mock `ThemeSegment` (`vi.mock('../ThemeMenu', () => ({ ThemeSegment: () => null }))`).
  Delete `ProfileMenu.mock.test.tsx` (covered by Profile.mock.test). Remove other `ThemeSubmenu` mocks.
- Commit: `feat(shell): Avatar verlinkt auf /profile, Dropdown entfällt`

## Step 4 — Docs
- `docs/design.md:146-147`, `docs/design/redesign/README.md:279-280`: profile is a page (Darstellung, Kategorien,
  Abmelden), wake-lock stays on the recipe page.
- `CLAUDE.md` page list: add `Profile`.
- `docs/design/redesign/audit/shell.md`: mark P1–P4 / S7 as done if the file tracks status (check format).
- Commit: `docs: Profilseite statt Profilmenü`

## Verification
- `npm run build`, `npm test -- --passWithNoTests`, `npm run lint`, `npm run format` then `format:check`,
  `npm ci` in quality-check.
- `eslint-suppressions.json` has no ProfileMenu/ThemeMenu entries → no prune needed.
- Visual: `npm run dev` with `VITE_MOCK=1`, Chrome MCP if available (otherwise headless screenshot): /profile desktop + phone
  (390 px), light + dark, next to mockup `app.html?theme=light|dark#/profile`. Note: Abmelden hidden in mock mode,
  so a REST-mode screenshot or note in the PR.
- Before quality-check: rebase on origin/main (Dispatcher).

## AC mapping
1. Profile.test (route + theme) — Step 2. 2. Profile.test / SignOut port — Step 2/3. 3. AppShell.test — Step 3.
4. Screenshots — PR step. 5. Five local checks — quality-check.

## Review log
- Review pass 1 (fresh subagent): 1 blocker (step 1 deleted ThemeSubmenu still used → keep until step 3), 4 major
  (AppShell.header back test, AC1 guard test belongs in App.routes.test, SignOut.test restructure, ghost Button
  overrides for Abmelden), 6 minor (inset hairline reuse, Segment.onItemClick instead of duplicate, exact active
  paths, phone title, ThemeProvider in tests, Card/avatar values), 5 nits (System without icon, sidebar avatar 22 px,
  comments, suppressions, trailers). All incorporated.

## Revisions from review pass 2 (binding, override earlier text where they differ)
- Step 1: port the reveal-failure test (`ThemeMenu.test.tsx:39-56`, rejected `ready` → dark applied, data-theme-anim/
  -transition cleared) to ThemeSegment. `onChange={noop}` gets a why-comment (selection happens in onItemClick for the click point).
- Step 2: `Profile.mock.test` mocks `../components/ThemeMenu` (`ThemeSegment: () => null`) because resetModules breaks
  the ThemeProvider context. `Profile.test` spies `vi.spyOn(foodly.auth, 'signOut').mockResolvedValue()`.
  `ROW_DIVIDER` includes `relative`. Card classes `gap-0 px-1 py-0.5 mb-5`. Profile `<Page className="pb-10">`.
  Abmelden `text-base` with a short why-comment (Button defaults to text-sm, link row inherits 14 px).
- Step 3: delete everything ThemeSubmenu leaves unused (Sun/Moon/MonitorIcon, Option/OPTIONS, ICON, DropdownMenu* imports;
  `noUnusedLocals`). AppShell avatar queries (`AppShell.test.tsx:97, :279, :291, :320`) switch to `link`, plus a positive
  `getByRole('link', { name: 'Profil & Einstellungen' })` on /recipes (phone). SignOut.test: mock AppShell renders only
  `<Profile/>` + children-free; second case asserts Profile's h2 „Lee“; header comment updated.
  Sidebar avatar `size-[22px] text-[11px]` for row/icon.
- Step 4 docs also: `docs/design.md:215-216`, `docs/architecture.md:175`, `docs/qa/checklist.md:6, :49`.
  Commit the final plan as `docs/superpowers/plans/2026-11-15-profilseite.md` (CLAUDE.md convention).
- Review pass 2 (fresh subagent): 0 blocker, 2 major (mock test ThemeProvider context, lost reveal-failure test),
  7 minor, 6 nits — all incorporated above.
