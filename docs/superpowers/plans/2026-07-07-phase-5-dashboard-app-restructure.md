# Phase 5 — Dashboard & App Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app around a responsive navigation shell with a new Dashboard landing screen, moving the recipe list to `/recipes` and adding Categories/Groups destinations — all buildable now on mocks (Milestone 1).

**Architecture:** A single `AppShell` wraps the routes and renders one `NAV_DESTINATIONS` list two ways: a slim left rail on desktop and a fixed bottom tab bar on mobile. The Dashboard composes tiles from data already loaded by `CatalogProvider` plus three new pure modules (recently-viewed store, a `recencyOrder` seam that stands in for missing timestamps, and a group→recipes derivation). Categories reuse the existing list via a `scopeCategory` prop; Groups get their own thin screens.

**Tech Stack:** React 18, React Router 6, TypeScript, Tailwind v4, `@postxl/ui-components`, `lucide-react`, Vitest + Testing Library (jsdom).

## Global Constraints

- No backend / no persistence beyond `localStorage`; reads come from `src/mocks` (mock request delay is 250ms — async tests must `await`).
- All backend access via `src/api` (`foodly.*`) — never open ad-hoc sockets.
- UI exclusively via `@postxl/ui-components` + Tailwind tokens. No raw `<button>/<input>`, no inline `style={{}}`, no `title=""` (use postxl `Tooltip`).
- Prettier (Skaile config): no semicolons, single quotes, 2-space, printWidth 120, arrow functions. Match surrounding style.
- Current user is mocked: `CURRENT_USER_ID = 1` (users: 1 Kolja, 2 Mara, 3 Jonas). Get it in components via `useCurrentUserId()`.
- Timestamps (`createdAt`, per-viewer "added-at") do NOT exist in `protocol.ts` — they are the documented backend blocker. Do not add them. The two recency tiles use the `recencyOrder` proxy (Task 3); swapping to real timestamps is Milestone 2.
- Commit after every task. Do NOT push and do NOT add a `Co-Authored-By` trailer (repo CLAUDE.md). Work stays on branch `phase-5-dashboard-app-restructure`.
- Test file lives next to its source (`x.ts` → `x.test.ts`). Run a single file with `npx vitest run <path>`.

---

## File Structure

**Create:**
- `src/mocks/data/groups.json` — mock groups (user 1 is a member).
- `src/dashboard/recency.ts` (+ `.test.ts`) — `recencyOrder` seam.
- `src/dashboard/recentlyViewed.ts` (+ `.test.ts`) — per-user localStorage view history.
- `src/groups/groupRecipes.ts` (+ `.test.ts`) — derive "recipes shared with all members".
- `src/components/PageHeader.tsx` — shared title/subtitle/actions scaffold.
- `src/components/Tile.tsx` — dashboard/groups card wrapper.
- `src/nav/destinations.ts` — `NAV_DESTINATIONS`.
- `src/components/AppShell.tsx` (+ `.test.tsx`) — desktop rail + mobile bottom bar + header/footer.
- `src/pages/Dashboard.tsx` (+ `.test.tsx`) — the `/` screen.
- `src/pages/CategoryPage.tsx` — thin `/categories/:id` wrapper around the list.
- `src/pages/Groups.tsx` — `/groups` overview.
- `src/pages/GroupDetail.tsx` — `/groups/:id`.
- `src/pages/ComingSoon.tsx` — placeholder for reserved Phase 4 paths.

**Modify:**
- `src/api/index.ts` — add `foodly.listGroups()`.
- `src/mocks/index.ts` — import groups, add to `mockData`, add `groups.list` case.
- `src/App.tsx` — new routes + `AppShell`.
- `src/pages/RecipeList.tsx` — optional `scopeCategory` prop + adopt `PageHeader` title styling.
- `src/pages/RecipeDetail.tsx` — push id to recently-viewed on view.

**Remove/absorb:** `src/components/Nav.tsx` is superseded by `AppShell`'s header (Task 6 deletes it).

---

## Task 1: Groups data layer

**Files:**
- Create: `src/mocks/data/groups.json`
- Modify: `src/api/index.ts`, `src/mocks/index.ts`
- Test: `src/mocks/groups.test.ts`

**Interfaces:**
- Consumes: `Group` from `src/api/protocol` (`{ id, name, owner, members }`).
- Produces: `foodly.listGroups(): Promise<Group[]>`; mock handles `'groups.list'`; `mockData.groups: Group[]`.

- [ ] **Step 1: Create the mock data**

`src/mocks/data/groups.json`:
```json
[
  { "id": 1, "name": "Familie", "owner": 1, "members": [1, 2, 3] },
  { "id": 2, "name": "WG Kochabend", "owner": 2, "members": [1, 2] }
]
```

- [ ] **Step 2: Write the failing test**

`src/mocks/groups.test.ts`:
```ts
import { mockRequest, mockData } from './index'

it('serves groups.list from mockData', async () => {
  const groups = await mockRequest('groups.list')
  expect(groups).toBe(mockData.groups)
  expect(mockData.groups.some((g) => g.members.includes(1))).toBe(true)
})
```

- [ ] **Step 3: Run it, expect fail**

Run: `npx vitest run src/mocks/groups.test.ts`
Expected: FAIL — `no handler for message type "groups.list"` (and `mockData.groups` undefined).

- [ ] **Step 4: Wire the mock**

In `src/mocks/index.ts`, add the import beside the others:
```ts
import groups from './data/groups.json'
```
Add `Group` to the type import:
```ts
import type { Group, Ingredient, Recipe, Tag, User, UserCategory } from '../api/protocol'
```
Add to `mockData`:
```ts
  groups: groups as Group[],
```
Add a case before `default:`:
```ts
    case 'groups.list':
      return mockData.groups
```

- [ ] **Step 5: Add the API method**

In `src/api/index.ts`, extend the type import with `Group`:
```ts
import type { Group, Ingredient, Recipe, RecipeId, Tag, User, UserCategory } from './protocol'
```
Add to the `foodly` object (below `listUsers`):
```ts
  listGroups: () => socket.request<Group[]>('groups.list'),
```

- [ ] **Step 6: Run test, expect pass**

Run: `npx vitest run src/mocks/groups.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/data/groups.json src/mocks/index.ts src/api/index.ts src/mocks/groups.test.ts
git commit -m "feat(api): add listGroups + mock groups"
```

---

## Task 2: Recency seam (`recencyOrder`)

**Files:**
- Create: `src/dashboard/recency.ts`, `src/dashboard/recency.test.ts`

**Interfaces:**
- Consumes: `Recipe` from `src/api/protocol`.
- Produces: `recencyOrder(recipes: Recipe[]): Recipe[]` — a NEW array, sorted most-recent-first.

- [ ] **Step 1: Write the failing test**

`src/dashboard/recency.test.ts`:
```ts
import { recencyOrder } from './recency'
import type { Recipe } from '../api/protocol'

const r = (id: number): Recipe =>
  ({ id, owner: 1, editors: [], viewers: [], name: `r${id}`, tags: [], source: null, rating: [], time: null,
     workMinutes: null, overallMinutes: null, sizeNumber: null, sizeText: null, notes: [], mainImage: null,
     images: [], sections: [] }) as Recipe

describe('recencyOrder', () => {
  it('orders most-recent (highest id) first', () => {
    expect(recencyOrder([r(1), r(3), r(2)]).map((x) => x.id)).toEqual([3, 2, 1])
  })
  it('does not mutate the input', () => {
    const input = [r(1), r(2)]
    recencyOrder(input)
    expect(input.map((x) => x.id)).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Run it, expect fail**

Run: `npx vitest run src/dashboard/recency.test.ts`
Expected: FAIL — cannot find module `./recency`.

- [ ] **Step 3: Implement**

`src/dashboard/recency.ts`:
```ts
import type { Recipe } from '../api/protocol'

// TODO(backend timestamps): `createdAt` / per-viewer "added-at" are the
// documented backend blocker (docs/plan.md → "Daten-/Protokoll-Fragen"). Until
// they exist, descending id is the stand-in for "most recent". When the
// timestamps land, change ONLY the comparator below — callers stay untouched.
export function recencyOrder(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => b.id - a.id)
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run src/dashboard/recency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/recency.ts src/dashboard/recency.test.ts
git commit -m "feat(dashboard): recencyOrder seam (id-desc proxy until timestamps land)"
```

---

## Task 3: Recently-viewed store

**Files:**
- Create: `src/dashboard/recentlyViewed.ts`, `src/dashboard/recentlyViewed.test.ts`

**Interfaces:**
- Consumes: `RecipeId`, `UserId` from `src/api/protocol`.
- Produces:
  - `loadRecentlyViewed(userId: UserId | null): RecipeId[]` — most-recent-first, `[]` if none/corrupt.
  - `pushRecentlyViewed(userId: UserId | null, id: RecipeId): void` — moves id to front, dedups, caps at 12. Best-effort.

- [ ] **Step 1: Write the failing test**

`src/dashboard/recentlyViewed.test.ts`:
```ts
import { loadRecentlyViewed, pushRecentlyViewed } from './recentlyViewed'

beforeEach(() => localStorage.clear())

describe('recentlyViewed', () => {
  it('returns [] when nothing stored', () => {
    expect(loadRecentlyViewed(1)).toEqual([])
  })
  it('pushes most-recent to the front', () => {
    pushRecentlyViewed(1, 10)
    pushRecentlyViewed(1, 20)
    expect(loadRecentlyViewed(1)).toEqual([20, 10])
  })
  it('dedups — re-viewing moves it to the front without duplicating', () => {
    pushRecentlyViewed(1, 10)
    pushRecentlyViewed(1, 20)
    pushRecentlyViewed(1, 10)
    expect(loadRecentlyViewed(1)).toEqual([10, 20])
  })
  it('caps at 12 entries', () => {
    for (let i = 1; i <= 15; i++) pushRecentlyViewed(1, i)
    expect(loadRecentlyViewed(1)).toHaveLength(12)
    expect(loadRecentlyViewed(1)[0]).toBe(15)
  })
  it('namespaces by user', () => {
    pushRecentlyViewed(1, 10)
    expect(loadRecentlyViewed(2)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it, expect fail**

Run: `npx vitest run src/dashboard/recentlyViewed.test.ts`
Expected: FAIL — cannot find module `./recentlyViewed`.

- [ ] **Step 3: Implement**

`src/dashboard/recentlyViewed.ts`:
```ts
import type { RecipeId, UserId } from '../api/protocol'

// Local "recently opened" history (per user). No backend needed — this is what
// powers the dashboard "Weiter geht's" tile in Milestone 1.
const MAX = 12
const keyFor = (userId: UserId | null) => `foodly:recently-viewed:${userId ?? 'anon'}`

export function loadRecentlyViewed(userId: UserId | null): RecipeId[] {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : []
  } catch {
    return [] // corrupt/unavailable storage → empty history
  }
}

export function pushRecentlyViewed(userId: UserId | null, id: RecipeId): void {
  try {
    const next = [id, ...loadRecentlyViewed(userId).filter((x) => x !== id)].slice(0, MAX)
    localStorage.setItem(keyFor(userId), JSON.stringify(next))
  } catch {
    // best-effort; history is a nicety, never critical
  }
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run src/dashboard/recentlyViewed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/recentlyViewed.ts src/dashboard/recentlyViewed.test.ts
git commit -m "feat(dashboard): per-user recently-viewed store"
```

---

## Task 4: Group → recipes derivation

**Files:**
- Create: `src/groups/groupRecipes.ts`, `src/groups/groupRecipes.test.ts`

**Interfaces:**
- Consumes: `Group`, `Recipe` from `src/api/protocol`.
- Produces: `recipesForGroup(recipes: Recipe[], group: Group): Recipe[]` — recipes every current member can see.

- [ ] **Step 1: Write the failing test**

`src/groups/groupRecipes.test.ts`:
```ts
import { recipesForGroup } from './groupRecipes'
import type { Group, Recipe } from '../api/protocol'

const recipe = (id: number, owner: number, editors: number[], viewers: number[]): Recipe =>
  ({ id, owner, editors, viewers, name: `r${id}`, tags: [], source: null, rating: [], time: null,
     workMinutes: null, overallMinutes: null, sizeNumber: null, sizeText: null, notes: [], mainImage: null,
     images: [], sections: [] }) as Recipe

const group: Group = { id: 1, name: 'Fam', owner: 1, members: [1, 2, 3] }

describe('recipesForGroup', () => {
  it('includes a recipe every member can see', () => {
    const r = recipe(1, 1, [2], [3]) // owner 1, editor 2, viewer 3 → all three
    expect(recipesForGroup([r], group).map((x) => x.id)).toEqual([1])
  })
  it('excludes a recipe a member cannot see', () => {
    const r = recipe(2, 1, [2], []) // member 3 is not in the audience
    expect(recipesForGroup([r], group)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it, expect fail**

Run: `npx vitest run src/groups/groupRecipes.test.ts`
Expected: FAIL — cannot find module `./groupRecipes`.

- [ ] **Step 3: Implement**

`src/groups/groupRecipes.ts`:
```ts
import type { Group, Recipe } from '../api/protocol'

// The data model has NO Group→Recipe link (docs/plan.md open question
// "Gruppen ↔ Rezepte"). We derive the group's recipes honestly: a recipe shows
// under the group when every current member can see it (is owner, editor, or
// viewer). If the sharing model changes, this is the one place to revisit.
export function recipesForGroup(recipes: Recipe[], group: Group): Recipe[] {
  return recipes.filter((r) => {
    const audience = new Set<number>([r.owner, ...r.editors, ...r.viewers])
    return group.members.every((m) => audience.has(m))
  })
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run src/groups/groupRecipes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/groups/groupRecipes.ts src/groups/groupRecipes.test.ts
git commit -m "feat(groups): derive group recipes (visible to all members)"
```

---

## Task 5: PageHeader + Tile primitives

**Files:**
- Create: `src/components/PageHeader.tsx`, `src/components/Tile.tsx`

**Interfaces:**
- Produces:
  - `PageHeader({ title, subtitle?, color?, actions?, children? })` — `title: ReactNode`, `subtitle?: ReactNode`, `color?: string` (hex for a leading dot), `actions?: ReactNode` (right-aligned), `children?` renders under the title row.
  - `Tile({ title, to?, action?, children })` — `title: ReactNode`, `to?: string` (makes the whole tile a link via the header "see all →"), `action?: ReactNode`, `children: ReactNode`.

No standalone test — these are presentational and are exercised by the Dashboard/Groups smoke tests (Tasks 8, 10).

- [ ] **Step 1: Implement PageHeader**

`src/components/PageHeader.tsx`:
```tsx
import type { ReactNode } from 'react'

// Shared title block for every top-level screen (Dashboard, Recipes, Categories,
// Groups) so headers share one rhythm. `color` draws a small leading dot — used
// by the category page to echo the category's color.
export function PageHeader({
  title,
  subtitle,
  color,
  actions,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  color?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="pb-3 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {color && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
          <div>
            <h1 className="font-display text-3xl text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
```

> Exception note: the category color is a per-recipe dynamic value from data (not a theme token), so an inline `style` backgroundColor is the sanctioned path here — same as the existing category sidebar. Keep it to this one dot.

- [ ] **Step 2: Implement Tile**

`src/components/Tile.tsx`:
```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@postxl/ui-components'

// Dashboard / Groups card. When `to` is set the header title becomes a link with
// a trailing arrow ("see all →"); otherwise it's a plain heading.
export function Tile({
  title,
  to,
  action,
  children,
}: {
  title: ReactNode
  to?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          {to ? (
            <Link to={to} className="inline-flex items-center gap-1 hover:text-foreground/80">
              {title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            title
          )}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}
```

> If `@postxl/ui-components` does not export `Card`/`CardHeader`/`CardContent`/`CardTitle`, check its exports first (`node -e "console.log(Object.keys(require('@postxl/ui-components')))"`). If absent, replace them with a `<div className="rounded-xl border border-border bg-card p-4">` wrapper keeping the same structure. Do not hand-roll a card if a primitive exists.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/PageHeader.tsx src/components/Tile.tsx
git commit -m "feat(ui): shared PageHeader + Tile primitives"
```

---

## Task 6: Nav destinations + AppShell + route restructure

This task carries the structural change (new shell, `/` → Dashboard, list → `/recipes`) as one reviewable unit — the app must still boot at the end.

**Files:**
- Create: `src/nav/destinations.ts`, `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`, `src/pages/ComingSoon.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 5) — used by `ComingSoon`.
- Produces:
  - `NAV_DESTINATIONS: NavDestination[]` where `NavDestination = { label: string; path: string; icon: LucideIcon; primary?: boolean }`.
  - `AppShell({ children })` — full chrome (header + desktop rail + mobile bottom bar + footer), renders `children` in `<main>`.

- [ ] **Step 1: Create the destinations list**

`src/nav/destinations.ts`:
```ts
import { Home, BookOpen, Plus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavDestination = { label: string; path: string; icon: LucideIcon; primary?: boolean }

// Single source of truth for top-level navigation. `primary` = the create action
// (rendered as the centered "+" on mobile). Order is the bottom-bar order.
export const NAV_DESTINATIONS: NavDestination[] = [
  { label: 'Start', path: '/', icon: Home },
  { label: 'Rezepte', path: '/recipes', icon: BookOpen },
  { label: 'Neu', path: '/recipes/new', icon: Plus, primary: true },
  { label: 'Gruppen', path: '/groups', icon: Users },
]
```

- [ ] **Step 2: Create the ComingSoon placeholder**

`src/pages/ComingSoon.tsx`:
```tsx
import { PageHeader } from '../components/PageHeader'

// Reserved Phase 4 routes (create/edit) resolve here instead of NotFound, so the
// "Neu" nav action leads somewhere honest until the editor is built.
export function ComingSoon() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageHeader title="Bald verfügbar" subtitle="Rezepte anlegen und bearbeiten kommt in einer späteren Phase." />
    </div>
  )
}
```

- [ ] **Step 3: Write the failing shell test**

`src/components/AppShell.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { AppShell } from './AppShell'

vi.mock('../timers/TimerPanel', () => ({ TimerPanel: () => null }))
vi.mock('./ConnectionDot', () => ({ ConnectionDot: () => null }))

it('renders every top-level destination and the page content', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <AppShell>
          <p>page body</p>
        </AppShell>
      </MemoryRouter>
    </TooltipProvider>,
  )
  // Each destination label appears twice (desktop rail + mobile bar).
  expect(screen.getAllByText('Rezepte').length).toBeGreaterThanOrEqual(1)
  expect(screen.getAllByText('Gruppen').length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('page body')).toBeTruthy()
})
```

- [ ] **Step 4: Run it, expect fail**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: FAIL — cannot find module `./AppShell`.

- [ ] **Step 5: Implement AppShell**

`src/components/AppShell.tsx`:
```tsx
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@postxl/ui-components'
import { NAV_DESTINATIONS } from '../nav/destinations'
import { ThemeToggle } from './ThemeToggle'
import { TimerPanel } from '../timers/TimerPanel'
import { ConnectionDot } from './ConnectionDot'
import { Footer } from './Footer'

// `end` on '/' so the Start tab isn't active on every route.
const isEnd = (path: string) => path === '/'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* keep class `site-header`: RecipeList measures its height into --site-nav-h */}
      <header className="site-header sticky top-0 z-50 border-b border-border/60 bg-background shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className="font-display text-[1.35rem] text-foreground">
            Foodly
          </Link>
          <nav className="flex items-center gap-2 text-[0.95rem] sm:gap-3">
            <ConnectionDot />
            <TimerPanel />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop left rail */}
        <aside className="sticky top-[var(--site-nav-h,3.5rem)] hidden h-[calc(100vh-var(--site-nav-h,3.5rem))] w-52 shrink-0 border-r border-border/60 px-3 py-4 md:block">
          <nav className="flex flex-col gap-1">
            {NAV_DESTINATIONS.map((d) => (
              <NavLink
                key={d.path}
                to={d.path}
                end={isEnd(d.path)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                    isActive && 'bg-muted font-medium text-foreground',
                  )
                }
              >
                <d.icon className="h-4 w-4" />
                {d.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border/60 bg-background md:hidden">
        {NAV_DESTINATIONS.map((d) => (
          <NavLink
            key={d.path}
            to={d.path}
            end={isEnd(d.path)}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] text-muted-foreground',
                isActive && 'text-foreground',
                d.primary && 'text-primary',
              )
            }
          >
            <d.icon className={cn('h-5 w-5', d.primary && 'rounded-full bg-primary/10 p-0.5')} />
            {d.label}
          </NavLink>
        ))}
      </nav>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 6: Run the shell test, expect pass**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: PASS.

- [ ] **Step 7: Rewire App.tsx**

Replace `src/App.tsx` with:
```tsx
import { Routes, Route } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@postxl/ui-components'
import { AppShell } from './components/AppShell'
import { NotFound } from './pages/NotFound'
import { ComingSoon } from './pages/ComingSoon'
import { CatalogProvider } from './catalog/CatalogProvider'
import { TimerProvider } from './timers/TimerProvider'
import { Dashboard } from './pages/Dashboard'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { CategoryPage } from './pages/CategoryPage'
import { Groups } from './pages/Groups'
import { GroupDetail } from './pages/GroupDetail'

export default function App() {
  return (
    <TooltipProvider>
      {/* TimerProvider wraps the shell so timers survive navigation. */}
      <TimerProvider>
        <CatalogProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recipes" element={<RecipeList />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/recipes/new" element={<ComingSoon />} />
              <Route path="/recipes/:id/edit" element={<ComingSoon />} />
              <Route path="/categories/:id" element={<CategoryPage />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </CatalogProvider>
        <Toaster />
      </TimerProvider>
    </TooltipProvider>
  )
}
```

> `App.tsx` now imports `Dashboard`, `CategoryPage`, `Groups`, `GroupDetail` — created in Tasks 7–10. Until those exist, `tsc` and the app won't build. Create minimal stub files NOW so the app boots after this task, then flesh them out in their tasks:
> - `src/pages/Dashboard.tsx`: `export function Dashboard() { return <div className="mx-auto max-w-6xl px-6" /> }`
> - `src/pages/CategoryPage.tsx`: `export function CategoryPage() { return null }`
> - `src/pages/Groups.tsx`: `export function Groups() { return null }`
> - `src/pages/GroupDetail.tsx`: `export function GroupDetail() { return null }`

- [ ] **Step 8: Delete the old Nav**

```bash
git rm src/components/Nav.tsx
```
Confirm nothing else imports it:
Run: `grep -rn "components/Nav'" src` → expected: no matches.

- [ ] **Step 9: Build + run the suite**

Run: `npm run build`
Expected: type-check passes, `dist/` builds.
Run: `npx vitest run`
Expected: all green.

- [ ] **Step 10: Visual smoke (Chrome MCP, per CLAUDE.md)**

Start dev (`VITE_MOCK=1 npm run dev`), open `/`. Confirm: shell renders, desktop rail lists Start/Rezepte/Neu/Gruppen, `/recipes` shows the existing list, the list's sticky header and filter rail still line up (no drift/overlap with the app rail). Note any misalignment for Task 11.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(shell): AppShell + responsive nav, dashboard at /, list at /recipes"
```

---

## Task 7: Dashboard screen

**Files:**
- Modify: `src/pages/Dashboard.tsx` (replace the stub)
- Test: `src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `foodly.listRecipes`, `foodly.listCategories`, `foodly.listGroups`; `useCurrentUserId`; `canViewRecipe` (`src/api/views`); `recencyOrder` (Task 2); `loadRecentlyViewed` (Task 3); `Tile`, `PageHeader` (Task 5); `RecipeRow` (`src/components/recipe/RecipeRow`) for tile recipe lines.

- [ ] **Step 1: Write the failing smoke test**

`src/pages/Dashboard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { Dashboard } from './Dashboard'
import type { Recipe, UserCategory, Group } from '../api/protocol'

vi.mock('../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => 1,
  useTags: () => ({ byId: {} }),
}))

const recipe = (id: number): Recipe =>
  ({ id, owner: 1, editors: [], viewers: [], name: `Recipe ${id}`, tags: [], source: null, rating: [], time: null,
     workMinutes: null, overallMinutes: null, sizeNumber: null, sizeText: null, notes: [], mainImage: null,
     images: [], sections: [] }) as Recipe
const category: UserCategory = { id: 1, user: 1, name: 'Favoriten', recipes: [1], order: 0, color: '#f00', colorLight: null, colorDark: null }
const group: Group = { id: 1, name: 'Familie', owner: 1, members: [1, 2] }

vi.mock('../hooks/useRequest', () => ({
  useRequest: (fn: () => Promise<unknown>) => {
    // Distinguish the three calls by the resolved shape isn't possible synchronously;
    // instead return a fixed ready payload keyed by call order via a counter.
    return { status: 'ready', data: (globalThis as any).__next__?.(), error: null }
  },
}))

it('renders the dashboard headings', () => {
  // Provide the three datasets in call order: recipes, categories, groups.
  const queue = [[recipe(1), recipe(2)], [category], [group]]
  let i = 0
  ;(globalThis as any).__next__ = () => queue[i++ % queue.length]
  render(
    <TooltipProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.getByText('Start')).toBeTruthy()
  expect(screen.getByText('Favoriten')).toBeTruthy()
  expect(screen.getByText('Familie')).toBeTruthy()
})
```

> The `useRequest` mock above is order-based and brittle. If the Dashboard calls `useRequest` in a different order than recipes→categories→groups, adjust the `queue` order to match the actual call order in your implementation. Keep the three `foodly.*` calls in a fixed, documented order in the component so the test stays valid.

- [ ] **Step 2: Run it, expect fail**

Run: `npx vitest run src/pages/Dashboard.test.tsx`
Expected: FAIL — Dashboard renders nothing (stub).

- [ ] **Step 3: Implement the Dashboard**

`src/pages/Dashboard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { Badge } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { canViewRecipe, myRole } from '../api/views'
import { recencyOrder } from '../dashboard/recency'
import { loadRecentlyViewed } from '../dashboard/recentlyViewed'
import { PageHeader } from '../components/PageHeader'
import { Tile } from '../components/Tile'
import { RecipeRow } from '../components/recipe/RecipeRow'

const TOP_N = 5

export function Dashboard() {
  const currentUserId = useCurrentUserId()
  // Fixed call order: recipes, categories, groups (the Dashboard test depends on it).
  const recipesReq = useRequest(() => foodly.listRecipes(), [])
  const categoriesReq = useRequest(() => foodly.listCategories(), [])
  const groupsReq = useRequest(() => foodly.listGroups(), [])

  const recipes = (recipesReq.data ?? []).filter((r) => canViewRecipe(r, currentUserId))
  const categories = categoriesReq.data ?? []
  const groups = (groupsReq.data ?? []).filter((g) => g.members.includes(currentUserId ?? -1))

  const byId = new Map(recipes.map((r) => [r.id, r]))
  const recentlyViewed = loadRecentlyViewed(currentUserId)
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .slice(0, TOP_N)

  // Recency proxy (Task 2) — swapped for real timestamps in Milestone 2.
  const myCreations = recencyOrder(recipes.filter((r) => myRole(r, currentUserId) === 'owner')).slice(0, TOP_N)
  const addedToMe = recencyOrder(recipes.filter((r) => myRole(r, currentUserId) !== 'owner')).slice(0, TOP_N)

  return (
    <div className="mx-auto max-w-6xl px-6 pb-10">
      <PageHeader title="Start" subtitle="Dein Überblick" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recentlyViewed.length > 0 && (
          <Tile title="Weiter geht's" to="/recipes">
            <div className="space-y-2">
              {recentlyViewed.map((r) => (
                <RecipeRow key={r.id} recipe={r} />
              ))}
            </div>
          </Tile>
        )}

        {addedToMe.length > 0 && (
          <Tile title="Neu für dich geteilt" to="/recipes?role=viewer">
            <div className="space-y-2">
              {addedToMe.map((r) => (
                <RecipeRow key={r.id} recipe={r} />
              ))}
            </div>
          </Tile>
        )}

        {myCreations.length > 0 && (
          <Tile title="Zuletzt von dir erstellt" to="/recipes?role=owner">
            <div className="space-y-2">
              {myCreations.map((r) => (
                <RecipeRow key={r.id} recipe={r} />
              ))}
            </div>
          </Tile>
        )}

        {categories.length > 0 && (
          <Tile title="Kategorien" to="/recipes">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c.id} to={`/categories/${c.id}`}>
                  <Badge
                    variant="secondary"
                    className="border"
                    style={{ borderColor: c.color, color: c.color }}
                  >
                    {c.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </Tile>
        )}

        {groups.length > 0 && (
          <Tile title="Gruppen" to="/groups">
            <ul className="space-y-1.5">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link to={`/groups/${g.id}`} className="flex items-center justify-between hover:text-foreground/80">
                    <span>{g.name}</span>
                    <span className="text-sm text-muted-foreground">{g.members.length} Mitglieder</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Tile>
        )}

        <Tile title="Auf einen Blick">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Rezepte" value={recipes.length} />
            <Stat label="Kategorien" value={categories.length} />
            <Stat label="Gruppen" value={groups.length} />
            <Stat label="Für dich geteilt" value={recipes.filter((r) => myRole(r, currentUserId) !== 'owner').length} />
          </dl>
        </Tile>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
```

> The category `Badge` uses an inline `style` for `borderColor`/`color` because the category color is dynamic data (a hex from the backend), the same sanctioned exception used by the existing category sidebar. Verify `Badge` accepts `style` (it forwards props); if not, wrap it in a `<span style=...>`.
> Verify `myRole` is exported from `src/api/views` (it is, per the views signatures). If a `Card`/`Badge` import name differs, check the package exports before substituting.

- [ ] **Step 4: Run the smoke test, expect pass**

Run: `npx vitest run src/pages/Dashboard.test.tsx`
Expected: PASS. If it fails on call-order, align the `queue` in the test with the component's `useRequest` order.

- [ ] **Step 5: Type-check + visual**

Run: `npx tsc --noEmit` → no errors.
Chrome MCP: open `/`, confirm tiles render with mock data, category badges link to `/categories/:id`, group links to `/groups/:id`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Dashboard.test.tsx
git commit -m "feat(dashboard): tiles (recent, shared, categories, groups, stats)"
```

---

## Task 8: Category page (reuse the list)

**Files:**
- Modify: `src/pages/RecipeList.tsx` (add optional `scopeCategory` prop), `src/pages/CategoryPage.tsx` (replace stub)

**Interfaces:**
- Consumes: `RecipeList` accepts `{ scopeCategory?: UserCategory }`; `useCurrentUserId`; `foodly.listCategories`.
- Produces: `CategoryPage` renders `RecipeList` scoped to one category; unknown id → the list's empty state with a "not found" header.

- [ ] **Step 1: Add the prop to RecipeList**

In `src/pages/RecipeList.tsx`:

Change the signature:
```tsx
import type { UserCategory } from '../api/protocol'

export function RecipeList({ scopeCategory }: { scopeCategory?: UserCategory } = {}) {
```

Right after `const { state, set, clear } = useListState()`, derive an effective state that forces the scoped category:
```tsx
  // When rendered under /categories/:id the category filter is pinned to that
  // category; everything else (search, sort, tags, role/collab) still works.
  const effState = scopeCategory ? { ...state, categories: [scopeCategory.id] } : state
```

Then replace every downstream use of `state` in the DATA path with `effState` — specifically the `filterRecipes(...)`/`sortRecipes(...)` line:
```tsx
  const visible = sortRecipes(filterRecipes(accessibleRecipes, effState, currentUserId, categories), effState, currentUserId)
```
and the grouping line:
```tsx
  const groupingCats = groupingCategories(categories, effState.categories)
```
Leave the filter-panel controls bound to `state`/`set` as-is (they still drive the URL). Do NOT change `state` in the `<FilterControls>`/`<ActiveFilters>` props.

Swap the page title so a scoped page shows the category name in its color. Replace:
```tsx
                <h1 className="font-display text-3xl text-foreground">Rezepte</h1>
```
with:
```tsx
                {scopeCategory ? (
                  <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: scopeCategory.color }} />
                    {scopeCategory.name}
                  </h1>
                ) : (
                  <h1 className="font-display text-3xl text-foreground">Rezepte</h1>
                )}
```

- [ ] **Step 2: Implement CategoryPage**

`src/pages/CategoryPage.tsx`:
```tsx
import { useParams } from 'react-router-dom'
import { Skeleton } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { PageHeader } from '../components/PageHeader'
import { RecipeList } from './RecipeList'

export function CategoryPage() {
  const { id } = useParams()
  const categoryId = Number(id)
  const categoriesReq = useRequest(() => foodly.listCategories(), [])

  if (categoriesReq.status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <Skeleton className="h-9 w-48" />
      </div>
    )
  }

  const category = (categoriesReq.data ?? []).find((c) => c.id === categoryId)
  if (!category) {
    return (
      <div className="mx-auto max-w-6xl px-6">
        <PageHeader title="Kategorie nicht gefunden" subtitle="Diese Kategorie existiert nicht (mehr)." />
      </div>
    )
  }

  return <RecipeList scopeCategory={category} />
}
```

- [ ] **Step 3: Verify existing RecipeList tests still pass**

Run: `npx vitest run src/pages src/list`
Expected: PASS (the prop is optional; default `{}` keeps the unscoped behavior). If `RecipeList` has no existing test, run `npx tsc --noEmit`.

- [ ] **Step 4: Visual**

Chrome MCP: open `/categories/1`. Confirm the header shows the category name + color dot, the list is scoped to that category, and search/sort still work.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RecipeList.tsx src/pages/CategoryPage.tsx
git commit -m "feat(categories): /categories/:id reuses the list, scoped + titled"
```

---

## Task 9: Groups overview + Group detail

**Files:**
- Modify: `src/pages/Groups.tsx`, `src/pages/GroupDetail.tsx` (replace stubs)
- Test: `src/pages/Groups.test.tsx`

**Interfaces:**
- Consumes: `foodly.listGroups`, `foodly.listRecipes`, `foodly.listUsers` (via `useUsers`), `useCurrentUserId`, `useUser`; `recipesForGroup` (Task 4); `canViewRecipe`; `RecipeRow`; `PageHeader`, `Tile`.

- [ ] **Step 1: Write the failing Groups smoke test**

`src/pages/Groups.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { Groups } from './Groups'
import type { Group } from '../api/protocol'

vi.mock('../catalog/CatalogProvider', () => ({ useCurrentUserId: () => 1 }))

const groups: Group[] = [
  { id: 1, name: 'Familie', owner: 1, members: [1, 2, 3] },
  { id: 2, name: 'Kollegen', owner: 9, members: [8, 9] }, // user 1 not a member
]
vi.mock('../hooks/useRequest', () => ({
  useRequest: () => ({ status: 'ready', data: groups, error: null }),
}))

it('lists only groups the current user belongs to', () => {
  render(
    <TooltipProvider>
      <MemoryRouter>
        <Groups />
      </MemoryRouter>
    </TooltipProvider>,
  )
  expect(screen.getByText('Familie')).toBeTruthy()
  expect(screen.queryByText('Kollegen')).toBeNull()
})
```

- [ ] **Step 2: Run it, expect fail**

Run: `npx vitest run src/pages/Groups.test.tsx`
Expected: FAIL — stub renders nothing.

- [ ] **Step 3: Implement Groups overview**

`src/pages/Groups.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Skeleton } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { PageHeader } from '../components/PageHeader'
import { Tile } from '../components/Tile'

export function Groups() {
  const currentUserId = useCurrentUserId()
  const groupsReq = useRequest(() => foodly.listGroups(), [])
  const groups = (groupsReq.data ?? []).filter((g) => g.members.includes(currentUserId ?? -1))

  return (
    <div className="mx-auto max-w-6xl px-6 pb-10">
      <PageHeader title="Gruppen" subtitle="Gruppen, in denen du Mitglied bist" />

      {groupsReq.status === 'loading' && <Skeleton className="h-24 w-full rounded-xl" />}

      {groupsReq.status === 'ready' && groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Du bist in keiner Gruppe.</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Tile key={g.id} title={g.name} to={`/groups/${g.id}`}>
              <p className="text-sm text-muted-foreground">{g.members.length} Mitglieder</p>
            </Tile>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the Groups test, expect pass**

Run: `npx vitest run src/pages/Groups.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement Group detail**

`src/pages/GroupDetail.tsx`:
```tsx
import { useParams } from 'react-router-dom'
import { Skeleton } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId, useUsers } from '../catalog/CatalogProvider'
import { canViewRecipe } from '../api/views'
import { recipesForGroup } from '../groups/groupRecipes'
import { PageHeader } from '../components/PageHeader'
import { RecipeRow } from '../components/recipe/RecipeRow'

export function GroupDetail() {
  const { id } = useParams()
  const groupId = Number(id)
  const currentUserId = useCurrentUserId()
  const users = useUsers()
  const groupsReq = useRequest(() => foodly.listGroups(), [])
  const recipesReq = useRequest(() => foodly.listRecipes(), [])

  if (groupsReq.status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <Skeleton className="h-9 w-48" />
      </div>
    )
  }

  const group = (groupsReq.data ?? []).find((g) => g.id === groupId)
  if (!group) {
    return (
      <div className="mx-auto max-w-6xl px-6">
        <PageHeader title="Gruppe nicht gefunden" subtitle="Diese Gruppe existiert nicht (mehr)." />
      </div>
    )
  }

  const memberNames = group.members.map((m) => users.byId[m]?.name ?? `User ${m}`).join(', ')
  const allRecipes = (recipesReq.data ?? []).filter((r) => canViewRecipe(r, currentUserId))
  const groupRecipes = recipesForGroup(allRecipes, group)

  return (
    <div className="mx-auto max-w-6xl px-6 pb-10">
      <PageHeader title={group.name} subtitle={`${group.members.length} Mitglieder · ${memberNames}`} />

      {/* Derived view: recipes every current member can see. The model has no
          direct group↔recipe link yet (docs/plan.md open question). */}
      <h2 className="mb-3 mt-2 text-sm font-medium text-muted-foreground">Gemeinsame Rezepte</h2>
      {groupRecipes.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Rezepte, die alle Mitglieder sehen können.</p>
      ) : (
        <div className="space-y-2">
          {groupRecipes.map((r) => (
            <RecipeRow key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Type-check + visual**

Run: `npx tsc --noEmit` → no errors.
Chrome MCP: open `/groups`, click a group → `/groups/:id` shows members + derived recipes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Groups.tsx src/pages/GroupDetail.tsx src/pages/Groups.test.tsx
git commit -m "feat(groups): overview + detail with derived shared recipes"
```

---

## Task 10: Wire recently-viewed + cohesion verification

**Files:**
- Modify: `src/pages/RecipeDetail.tsx`

**Interfaces:**
- Consumes: `pushRecentlyViewed` (Task 3), `useCurrentUserId`.

- [ ] **Step 1: Record the view in RecipeDetail**

In `src/pages/RecipeDetail.tsx`, add imports:
```tsx
import { pushRecentlyViewed } from '../dashboard/recentlyViewed'
import { useCurrentUserId } from '../catalog/CatalogProvider'
```
Inside the component, after `const recipeId = Number(id)`:
```tsx
  const currentUserId = useCurrentUserId()
```
Add an effect that records the view once the recipe is confirmed loadable (guard against `NaN`):
```tsx
  // Feed the dashboard "Weiter geht's" tile. Record only real, loaded recipes.
  useEffect(() => {
    if (status === 'ready' && Number.isInteger(recipeId)) pushRecentlyViewed(currentUserId, recipeId)
  }, [status, recipeId, currentUserId])
```

- [ ] **Step 2: Manual verification of the loop**

Chrome MCP: open a few recipes via `/recipes/:id`, return to `/`. Confirm the "Weiter geht's" tile lists them most-recent-first. Reload — the tile persists (localStorage).

- [ ] **Step 3: Cohesion check (list under the shell)**

Chrome MCP at `/recipes`: confirm the sticky list header tucks correctly under the app header (`--site-nav-h` still measured) and the fixed filter rail does not overlap the app rail or the list. If the filter rail's `--rail-left` is off because of the app rail, note it and adjust: the rail measures its reserved slot's `getBoundingClientRect().left`, which already accounts for the app rail — if drift appears, it's a `--site-nav-h` timing issue; verify the header still carries class `site-header`.

- [ ] **Step 4: Full suite + build + format**

Run: `npx vitest run` → all green.
Run: `npm run build` → passes.
Run: `npm run format`
Run: `npm run format:check` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RecipeDetail.tsx
git commit -m "feat(dashboard): record recipe views for the recent tile"
```

---

## Milestone 2 (deferred — do NOT build now)

When the backend adds `Recipe.createdAt` and per-viewer "added-at":
1. Add the fields to `protocol.ts` + mock data.
2. Change the comparator inside `recencyOrder` (Task 2) to sort by the real timestamp. No caller or UI change.
3. Split "added to me" vs "created by me" using the real "added-at" instead of the `myRole` proxy in `Dashboard.tsx`.

## Self-Review Notes

- **Spec coverage:** shell + responsive nav (Task 6) ✓; dashboard tiles incl. recency proxy, categories, groups, jump-back-in, at-a-glance (Task 7) ✓; `/categories/:id` reuse (Task 8) ✓; `/groups` + `/groups/:id` derived recipes (Task 9) ✓; recently-viewed store + wiring (Tasks 3, 10) ✓; `recencyOrder` seam (Task 2) ✓; `listGroups` + mock (Task 1) ✓; PageHeader/Tile cohesion scaffold (Task 5) ✓; list header cohesion + sticky verification (Tasks 8, 10) ✓; reserved Phase 4 paths via ComingSoon (Task 6) ✓; no `protocol.ts` timestamp changes ✓.
- **Type consistency:** `recencyOrder`, `recipesForGroup`, `loadRecentlyViewed/pushRecentlyViewed`, `NAV_DESTINATIONS`, `scopeCategory` prop names are used identically across producing and consuming tasks.
- **Known brittleness flagged inline:** the Dashboard `useRequest` order-based mock (Task 7 Step 1) and the postxl `Card`/`Badge` export assumption (Tasks 5, 7) each carry a fallback instruction.
