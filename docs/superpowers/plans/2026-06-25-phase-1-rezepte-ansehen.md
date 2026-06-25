# Phase 1 — Rezepte ansehen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read-only recipe browsing — a flat list at `/` and a detail view at `/recipes/:id` — fully driven by the dev mocks.

**Architecture:** A `CatalogProvider` loads the shared tag/user catalogs once at startup (graceful-degrade on failure). A `<TagText>` render primitive resolves `{tagId}` tokens in every recipe-authored string. Pure view helpers live in `src/api/views.ts`. Two pages (`RecipeList`, `RecipeDetail`) compose small recipe components. No backend writes, no filtering/search (Phase 2).

**Tech Stack:** Vite · React 18 · TypeScript (strict) · React Router 6 · Tailwind v4 · `@postxl/ui-components` · `lucide-react` (transitive).

**Spec:** `docs/phases/phase-1-rezepte-ansehen.md` — this plan implements it 1:1.

## Global Constraints

- **No new dependencies.** Use only what's installed. Never add a test runner, `@playwright/test`, or anything else to `package.json`.
- **Verification model:** there is no unit-test runner. Every task's gate is **`npm run build`** (runs `tsc` strict typecheck + `vite build`) ending **green**, plus the inspection notes in the task. The pipeline ends with a Chrome-MCP smoke (orchestrated outside these tasks).
- **All backend access via `src/api` (`foodly.*`)** — never open ad-hoc sockets/fetches. Backend URL only via `import.meta.env.VITE_WS_URL` (already handled in `socket.ts`).
- **UI only via `@postxl/ui-components`** (`Card`, `Badge`, `Button`, `Avatar`, `Popover`, `Separator`, `Skeleton`, `Alert`, `Loader`, …). No raw `<button>`/`<input>`. (Note: there is **no** `Empty` export — use a styled paragraph for empty states.) Style via `variant`/`size` props; Tailwind only for spacing/layout.
- **No inline styles** (`style={{…}}`). Anything Tailwind can't express → a class in `src/styles/styles.css`. Do **not** edit `src/styles/theme.css` (brand tokens, synced with sibling apps).
- **Comments:** explain *why*, not *what*. No comment-wall above every function. Short file headers OK.
- **Commits:** Conventional-commit style, present in this repo (e.g. `feat(catalog): …`). **No `Co-Authored-By` trailer.** Do **not** push.
- **Dev run:** mocks are served with `VITE_MOCK=1` (e.g. `VITE_MOCK=1 npm run dev`).
- **Language:** UI copy in German (matches existing app).

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/mocks/data/tags.json` | + `Backzeit`, `Kochzeit`, `Formgröße` tags | 1 |
| `src/mocks/data/recipes.json` | `time` strings w/ tokens, an empty-rating recipe, an unknown token, `mainImage: null` everywhere | 1 |
| `src/api/views.ts` | + `ratingsByRole` (pure) | 2 |
| `src/catalog/CatalogProvider.tsx` | load tags/users/me once; hooks; graceful degrade | 3 |
| `src/App.tsx` | wrap routes in `CatalogProvider`; routes for list/detail; remove `Home` | 3, 7, 10 |
| `src/components/TagText.tsx` | render `{tagId}` tokens in a string → React | 4 |
| `src/components/recipe/Stars.tsx` | quarter-precision 0–5 star bar (pure) | 5 |
| `src/components/recipe/Rating.tsx` | detail rating: `Stars` + Popover breakdown | 6 |
| `src/components/recipe/RecipeRow.tsx` | one compact list row | 7 |
| `src/pages/RecipeList.tsx` | list page: load + states + rows | 7 |
| `src/components/recipe/IngredientLine.tsx` | one formatted ingredient line | 8 |
| `src/components/recipe/SectionBlock.tsx` | 2-column ingredients/steps per section | 9 |
| `src/pages/RecipeDetail.tsx` | detail page: header/meta/notes/sections/footer | 10 |
| `src/pages/Home.tsx` | **deleted** | 7 |

---

## Task 1: Mock-Ausbau (data foundation)

**Files:**
- Modify: `src/mocks/data/tags.json`
- Modify: `src/mocks/data/recipes.json`

**Interfaces:**
- Consumes: `protocol.ts` types (`Recipe`, `Tag`) — must stay type-conformant (note: `Recipe.mainImage: ImageId | null` is now required).
- Produces: richer fixtures exercising every render path (token resolution, empty rating, unknown token, fallback thumbnail).

- [ ] **Step 1: Add catalog tags**

In `src/mocks/data/tags.json`, append three tags (all `svg: null`) so the new `time`/`amount` tokens resolve to text:

```json
  { "id": "Backzeit", "svg": null },
  { "id": "Kochzeit", "svg": null },
  { "id": "Formgröße", "svg": null }
```

(Keep the existing 8 entries; valid JSON — comma between items, none after the last.)

- [ ] **Step 2: Enrich recipes**

In `src/mocks/data/recipes.json`, apply these edits (keep everything else):

- Add `"mainImage": null` to **every** recipe object — explicitly recipes 1, 2 and 3 need it added (recipe 4 below already includes it); place it right before `"images"`. **This fixes the currently-red build** (`src/mocks/index.ts` casts `as Recipe[]`, and `mainImage` is now required) — after this step `npm run build` must go green.
- Recipe 1 (Bolognese): set `"time": "20 min + {Kochzeit} 25 min"`. Add an unknown token to a note: change its note to `"Schmeckt am nächsten Tag aufgewärmt noch besser. {WIP}"` (`WIP` is **not** a tag → must render literal).
- Recipe 2 (Schokokuchen): set `"time": "25 min inkl. {Backzeit} 45 min"`. Leave its single rating.
- Recipe 3 (Pfannkuchen): set `"time": "25 min"` (plain, no token).
- Add a **4th recipe** with an **empty rating** to test the no-stars path:

```json
  {
    "id": 4,
    "owner": 1,
    "viewers": [],
    "editors": [],
    "name": "Ofengemüse",
    "tags": ["Vegetarisch"],
    "source": null,
    "time": null,
    "workMinutes": 15,
    "overallMinutes": 40,
    "amount": "2 {Portionen}",
    "basePortionMultiplier": 2,
    "notes": [],
    "mainImage": null,
    "images": [],
    "sections": [
      {
        "id": 5,
        "name": null,
        "ingredients": [
          { "id": 401, "ingredient": { "id": 18, "name": "Kartoffeln" }, "text": null, "amount": "600", "amountPrefix": null, "unit": "g" },
          { "id": 402, "ingredient": { "id": 19, "name": "Paprika" }, "text": null, "amount": "2", "amountPrefix": null, "unit": null },
          { "id": 403, "ingredient": { "id": 6, "name": "Olivenöl" }, "text": "zum Beträufeln", "amount": null, "amountPrefix": null, "unit": null },
          { "id": 404, "ingredient": { "id": 17, "name": "Salz" }, "text": "nach Geschmack", "amount": null, "amountPrefix": null, "unit": null }
        ],
        "steps": [
          "Gemüse in mundgerechte Stücke schneiden.",
          "Mit Öl und Salz mischen, auf ein Blech geben.",
          "Bei 200 °C ca. 30 Minuten rösten."
        ]
      }
    ],
    "rating": []
  }
```

Add the two new ingredients to `src/mocks/data/ingredients.json` so ids 18/19 exist (if that file is `Ingredient[]` of `{id,name}`):

```json
  { "id": 18, "name": "Kartoffeln" },
  { "id": 19, "name": "Paprika" }
```

(Check the existing ids in `ingredients.json` first; only add ones that are missing.)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS (the JSON `as Recipe[]` cast in `src/mocks/index.ts` stays valid — every recipe now has `mainImage`).

- [ ] **Step 4: Commit**

```bash
git add src/mocks/data/tags.json src/mocks/data/recipes.json src/mocks/data/ingredients.json
git commit -m "test(mocks): enrich fixtures for phase-1 render paths"
```

---

## Task 2: `ratingsByRole` view helper

**Files:**
- Modify: `src/api/views.ts`

**Interfaces:**
- Consumes: `Recipe`, `UserId` from `protocol.ts`.
- Produces:
  - `type RatedRole = 'owner' | 'editor' | 'viewer' | 'other'`
  - `function ratingsByRole(recipe: Recipe): { user: UserId; rating: number; role: RatedRole }[]`
  — sorted owner → editor → viewer → other, then by rating desc within a group.

- [ ] **Step 1: Add the helper**

Append to `src/api/views.ts` (and extend the existing `import type` line to include `UserId`):

```ts
export type RatedRole = 'owner' | 'editor' | 'viewer' | 'other';

const ROLE_ORDER: Record<RatedRole, number> = { owner: 0, editor: 1, viewer: 2, other: 3 };

// A rater's role is derived from the recipe itself (owner/editors/viewers), not
// from any user catalog — so this stays a pure DTO function.
export function ratingsByRole(
  recipe: Recipe,
): { user: UserId; rating: number; role: RatedRole }[] {
  const roleOf = (u: UserId): RatedRole =>
    u === recipe.owner ? 'owner'
      : recipe.editors.includes(u) ? 'editor'
        : recipe.viewers.includes(u) ? 'viewer'
          : 'other';

  return recipe.rating
    .map((r) => ({ user: r.user, rating: r.rating, role: roleOf(r.user) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rating - a.rating);
}
```

> The secondary `b.rating - a.rating` tie-break (highest rating first within a
> role group) is an intentional addition beyond the spec, which only mandates the
> role order. Keep it.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

Inspection (mock-traceable): for recipe 1 (`owner:1`, `editors:[2]`, ratings `[{1,5},{2,4}]`) → `[{user:1,role:'owner',rating:5},{user:2,role:'editor',rating:4}]`.

- [ ] **Step 3: Commit**

```bash
git add src/api/views.ts
git commit -m "feat(views): add ratingsByRole helper"
```

---

## Task 3: `CatalogProvider` + App wrap

**Files:**
- Create: `src/catalog/CatalogProvider.tsx`
- Modify: `src/App.tsx` (wrap routes only — routes themselves change in later tasks)

**Interfaces:**
- Consumes: `foodly.listTags()`, `foodly.listUsers()`, `foodly.me()`; `useRequest`; `Tag`, `User`, `TagId`, `UserId` from `protocol.ts`.
- Produces (all imported by later tasks):
  - `<CatalogProvider>{children}</CatalogProvider>`
  - `type CatalogStatus = 'ready' | 'error'`
  - `useTags(): { byId: Record<TagId, Tag>; status: CatalogStatus }`
  - `useUsers(): { byId: Record<UserId, User>; status: CatalogStatus }`
  - `useTag(id: TagId): Tag | undefined`
  - `useUser(id: UserId): User | undefined`
  - `useCurrentUserId(): UserId | null`
  - (The spec's `useCatalogStatus()` is folded into `useTags()`/`useUsers()`, which each return a `status` field — no separate hook needed for Phase 1.)

- [ ] **Step 1: Write the provider**

Create `src/catalog/CatalogProvider.tsx`:

```tsx
// Loads the app-wide lookup catalogs (tags, users, current user) once at
// startup. Tag *images* are never bulk-loaded — Tag.svg is only a hash; the
// image would be fetched lazily per tag when actually rendered.
import { createContext, useContext, type ReactNode } from 'react';
import { Loader } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import type { Tag, TagId, User, UserId } from '../api/protocol';

export type CatalogStatus = 'ready' | 'error';

type Catalog = {
  tags: { byId: Record<TagId, Tag>; status: CatalogStatus };
  users: { byId: Record<UserId, User>; status: CatalogStatus };
  currentUserId: UserId | null;
};

const CatalogContext = createContext<Catalog | null>(null);

function indexBy<T, K extends string | number>(rows: T[] | null, key: (t: T) => K): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const row of rows ?? []) out[key(row)] = row;
  return out;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const tagsReq = useRequest(() => foodly.listTags(), []);
  const usersReq = useRequest(() => foodly.listUsers(), []);
  const meReq = useRequest(() => foodly.me(), []);

  // Graceful degrade: render children once every load has *settled* (ready or
  // error). A failed catalog just yields an empty map + 'error' status; the UI
  // degrades (tokens stay literal, user names fall back) rather than crashing.
  const settled = [tagsReq, usersReq, meReq].every((r) => r.status !== 'loading');
  if (!settled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const value: Catalog = {
    tags: { byId: indexBy(tagsReq.data, (t) => t.id), status: tagsReq.status === 'error' ? 'error' : 'ready' },
    users: { byId: indexBy(usersReq.data, (u) => u.id), status: usersReq.status === 'error' ? 'error' : 'ready' },
    currentUserId: meReq.data?.id ?? null,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

function useCatalog(): Catalog {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within <CatalogProvider>');
  return ctx;
}

export function useTags() { return useCatalog().tags; }
export function useUsers() { return useCatalog().users; }
export function useTag(id: TagId): Tag | undefined { return useCatalog().tags.byId[id]; }
export function useUser(id: UserId): User | undefined { return useCatalog().users.byId[id]; }
export function useCurrentUserId(): UserId | null { return useCatalog().currentUserId; }
```

- [ ] **Step 2: Wrap routes in App.tsx**

In `src/App.tsx`, import the provider and wrap the `<Routes>` block (leave the existing `Home`/`NotFound` routes untouched for now):

```tsx
import { CatalogProvider } from './catalog/CatalogProvider';
// …
      <main className="flex-1">
        <CatalogProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CatalogProvider>
      </main>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/catalog/CatalogProvider.tsx src/App.tsx
git commit -m "feat(catalog): add CatalogProvider (tags/users/me, graceful degrade)"
```

---

## Task 4: `<TagText>` render primitive

**Files:**
- Create: `src/components/TagText.tsx`

**Interfaces:**
- Consumes: `useTags` from `CatalogProvider`; `Tag` from `protocol.ts`.
- Produces: `function TagText({ value }: { value: string }): JSX.Element` — renders `{tagId}` / `{!tagId}` tokens per the rule table.

**Token rules** (from spec §4):

| Token | Case | Output |
|---|---|---|
| `{X}` | tag with `svg` | tag **image** (lazy; inactive in Phase 1 → name fallback) |
| `{X}` | tag, `svg === null` | `X` (name, no braces) |
| `{X}` | not a tag | literal `{X}` |
| `{!X}` | tag (any svg) | `X` (name, no braces) |
| `{!X}` | not a tag | literal `{!X}` |

- [ ] **Step 1: Write the component**

Create `src/components/TagText.tsx`:

```tsx
import { Fragment } from 'react';
import { useTags } from '../catalog/CatalogProvider';
import type { Tag } from '../api/protocol';

// {X} or {!X}; X = tag id (anything but braces). Global flag → iterate matches.
const TOKEN = /\{(!?)([^{}]+)\}/g;

export function TagText({ value }: { value: string }) {
  const { byId } = useTags();
  const nodes: Array<string | JSX.Element> = [];
  let last = 0;

  for (const m of value.matchAll(TOKEN)) {
    const [full, bang, id] = m;
    const start = m.index ?? 0;
    if (start > last) nodes.push(value.slice(last, start));

    const tag: Tag | undefined = byId[id];
    if (!tag) {
      nodes.push(full); // unknown tag → keep literal (incl. braces / leading !)
    } else if (bang === '!' || tag.svg === null) {
      nodes.push(id); // forced name, or no image available → name without braces
    } else {
      // Tag has an svg. Real image loading is backend-dependent and deferred
      // (Phase 1: no tag has an svg, so this branch is unreached). Fall back to
      // the readable name rather than an empty box.
      nodes.push(id);
    }
    last = start + full.length;
  }
  if (last < value.length) nodes.push(value.slice(last));

  return <>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

Inspection (no consumer yet — pure logic check against the table): `"2 {Portionen}"` → `2 Portionen`; `"x {WIP}"` → `x {WIP}` (WIP unknown); `"{!Portionen}"` → `Portionen`.

- [ ] **Step 3: Commit**

```bash
git add src/components/TagText.tsx
git commit -m "feat(recipe): add TagText token renderer"
```

---

## Task 5: `<Stars>` quarter-precision bar

**Files:**
- Create: `src/components/recipe/Stars.tsx`

**Interfaces:**
- Produces: `function Stars({ value }: { value: number }): JSX.Element` — 5-star bar, value in `[0,5]`, filled to nearest quarter. Used by Task 6.

**No custom CSS.** Quarter precision = 5 discrete fill widths, each expressible
with a Tailwind width utility (`w-0` `w-1/4` `w-1/2` `w-3/4` `w-full`); the gold
is the themed `text-star` token (defined in `theme.css` for light+dark). Pure Tailwind in the component — no
`styles.css` additions (per CLAUDE.md: Tailwind first, `styles.css` only for what
Tailwind *can't* express).

- [ ] **Step 1: Write the component**

Create `src/components/recipe/Stars.tsx`:

```tsx
import { Star } from 'lucide-react';

const SIZE = 'h-4 w-4';

// Quarter step → a Tailwind width utility. Literal class strings (not built at
// runtime) so Tailwind's scanner keeps them.
const FILL_WIDTH = {
  0: 'w-0',
  0.25: 'w-1/4',
  0.5: 'w-1/2',
  0.75: 'w-3/4',
  1: 'w-full',
} as const;

function quarter(frac: number): keyof typeof FILL_WIDTH {
  return (Math.round(Math.min(1, Math.max(0, frac)) * 4) / 4) as keyof typeof FILL_WIDTH;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="relative inline-flex">
          <Star className={`${SIZE} text-muted-foreground`} />
          <span className={`absolute left-0 top-0 inline-flex overflow-hidden ${FILL_WIDTH[quarter(value - i)]}`}>
            <Star className={`${SIZE} fill-current text-star`} />
          </span>
        </span>
      ))}
    </span>
  );
}
```

The single inline stars in `RecipeRow`/`Rating` use the same `text-star`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipe/Stars.tsx
git commit -m "feat(recipe): add quarter-precision Stars bar"
```

---

## Task 6: `<Rating>` (detail stars + popover)

**Files:**
- Create: `src/components/recipe/Rating.tsx`

**Interfaces:**
- Consumes: `Stars` (Task 5); `averageRating`, `ratingsByRole`, `RatedRole` from `views.ts`; `useUser`, `useCurrentUserId` from `CatalogProvider`; `Popover`/`PopoverTrigger`/`PopoverContent`, `Separator` from `@postxl/ui-components`; `Recipe`, `UserId` from `protocol.ts`.
- Produces: `function Rating({ recipe }: { recipe: Recipe }): JSX.Element | null` — null when there are no ratings.

**Role labels:** `owner → 'Besitzer'`, `editor → 'Bearbeiter'`, `viewer → 'Betrachter'`, `other → 'Weitere'`.

- [ ] **Step 1: Write the component**

Create `src/components/recipe/Rating.tsx`:

```tsx
import { Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, Separator, Button } from '@postxl/ui-components';
import { Stars } from './Stars';
import { averageRating, ratingsByRole, type RatedRole } from '../../api/views';
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider';
import type { Recipe, UserId } from '../../api/protocol';

const ROLE_LABEL: Record<RatedRole, string> = {
  owner: 'Besitzer',
  editor: 'Bearbeiter',
  viewer: 'Betrachter',
  other: 'Weitere',
};

function UserName({ id }: { id: UserId }) {
  const user = useUser(id);
  return <>{user?.name ?? `User ${id}`}</>;
}

export function Rating({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);
  const currentUserId = useCurrentUserId();
  if (avg === null) return null;

  const rows = ratingsByRole(recipe);
  const own = currentUserId === null ? undefined : rows.find((r) => r.user === currentUserId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 px-1.5 py-0.5">
          <Stars value={avg} />
          <span className="text-sm tabular-nums text-muted-foreground">{avg.toFixed(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex items-center justify-between">
          <span className="font-medium">Bewertungen</span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-star" />
            {avg.toFixed(1)} · {rows.length}
          </span>
        </div>

        {own && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
            <span className="text-sm font-medium">Du</span>
            <span className="inline-flex items-center gap-1 text-sm tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current text-star" />
              {own.rating.toFixed(1)}
            </span>
          </div>
        )}

        <Separator className="my-3" />

        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.user} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <UserName id={r.user} />
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[r.role]}</span>
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {r.rating.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
```

Note: the single inline stars use the themed `text-star` token (same gold as the `Stars` bar).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipe/Rating.tsx
git commit -m "feat(recipe): add detail Rating with role-sorted popover"
```

---

## Task 7: `RecipeRow` + `RecipeList` page + route `/`

**Files:**
- Create: `src/components/recipe/RecipeRow.tsx`
- Create: `src/pages/RecipeList.tsx`
- Modify: `src/App.tsx` (route `/` → `RecipeList`; drop `Home` import/route)
- Delete: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `foodly.listRecipes`, `useRequest`, `TagText`, inline list rating (single star + number), `averageRating` from `views.ts`, `Avatar`/`AvatarFallback`/`Badge`/`Card`/`Skeleton`/`Alert`/`Button` from UI lib, `Link` from router; `Recipe` from `protocol.ts`. Empty state is a plain styled `<p>` (no `Empty` export exists).
- Produces: `RecipeList` page; `RecipeRow` component.

- [ ] **Step 1: Write `RecipeRow`**

Create `src/components/recipe/RecipeRow.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { averageRating } from '../../api/views';
import type { Recipe } from '../../api/protocol';

export function RecipeRow({ recipe }: { recipe: Recipe }) {
  const avg = averageRating(recipe);
  const initial = recipe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link to={`/recipes/${recipe.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        <Avatar className="h-10 w-10 shrink-0">
          {/* recipe.mainImage drives AvatarImage once image loading lands; null in Phase 1 → fallback initial */}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="truncate font-medium"><TagText value={recipe.name} /></span>
            {recipe.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {recipe.tags.map((t) => (
                  <Badge key={t} variant="secondary"><TagText value={t} /></Badge>
                ))}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {avg !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3.5 w-3.5 fill-current text-star" />
                {avg.toFixed(1)}
              </span>
            )}
            {avg !== null && recipe.time && <span aria-hidden>·</span>}
            {recipe.time && <span>🕒 <TagText value={recipe.time} /></span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Write `RecipeList`**

Create `src/pages/RecipeList.tsx`:

```tsx
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { RecipeRow } from '../components/recipe/RecipeRow';

export function RecipeList() {
  // Retry by bumping a nonce in the deps → useRequest re-runs (no full reload).
  const [nonce, setNonce] = useState(0);
  const { status, data, error } = useRequest(() => foodly.listRecipes(), [nonce]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display mb-6 text-3xl text-foreground">Rezepte</h1>

      {status === 'loading' && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
              Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === 'ready' && data && data.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Noch keine Rezepte.</p>
      )}

      {status === 'ready' && data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((recipe) => <RecipeRow key={recipe.id} recipe={recipe} />)}
        </div>
      )}
    </div>
  );
}
```


- [ ] **Step 3: Wire route, remove Home**

In `src/App.tsx`: remove the `Home` import and its route; import and route `RecipeList` at `/`:

```tsx
import { RecipeList } from './pages/RecipeList';
// …
          <Routes>
            <Route path="/" element={<RecipeList />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
```

Then delete the file:

```bash
git rm src/pages/Home.tsx
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS (no remaining import of `Home`).

- [ ] **Step 5: Commit**

```bash
git add src/components/recipe/RecipeRow.tsx src/pages/RecipeList.tsx src/App.tsx
git commit -m "feat(recipe): recipe list page at / (replaces scaffold Home)"
```

---

## Task 8: `<IngredientLine>`

**Files:**
- Create: `src/components/recipe/IngredientLine.tsx`

**Interfaces:**
- Consumes: `formatIngredient` from `views.ts`; `TagText`; `RecipeIngredient` from `protocol.ts`.
- Produces: `function IngredientLine({ line }: { line: RecipeIngredient }): JSX.Element`.

- [ ] **Step 1: Write the component**

Create `src/components/recipe/IngredientLine.tsx`:

```tsx
import { TagText } from '../TagText';
import { formatIngredient } from '../../api/views';
import type { RecipeIngredient } from '../../api/protocol';

export function IngredientLine({ line }: { line: RecipeIngredient }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="text-muted-foreground">•</span>
      <span><TagText value={formatIngredient(line)} /></span>
    </li>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipe/IngredientLine.tsx
git commit -m "feat(recipe): add IngredientLine"
```

---

## Task 9: `<SectionBlock>`

**Files:**
- Create: `src/components/recipe/SectionBlock.tsx`

**Interfaces:**
- Consumes: `IngredientLine` (Task 8); `TagText`; `Separator` from UI lib; `Section` from `protocol.ts`.
- Produces: `function SectionBlock({ section }: { section: Section }): JSX.Element`.

- [ ] **Step 1: Write the component**

Create `src/components/recipe/SectionBlock.tsx`:

```tsx
import { Separator } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { IngredientLine } from './IngredientLine';
import type { Section } from '../../api/protocol';

export function SectionBlock({ section }: { section: Section }) {
  return (
    <section className="mt-8">
      {section.name && (
        <>
          <h2 className="text-lg font-medium"><TagText value={section.name} /></h2>
          <Separator className="mt-2 mb-4" />
        </>
      )}

      {/* Stack on mobile (ingredients then steps); 2 columns from md: up. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.5fr]">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Zutaten</h3>
          <ul className="space-y-1">
            {section.ingredients.map((line) => <IngredientLine key={line.id} line={line} />)}
          </ul>
        </div>

        <div className="md:border-l md:pl-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Zubereitung</h3>
          <ol className="list-inside list-decimal space-y-1">
            {section.steps.map((step, i) => (
              <li key={i}><TagText value={step} /></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipe/SectionBlock.tsx
git commit -m "feat(recipe): add SectionBlock (2-column ingredients/steps)"
```

---

## Task 10: `RecipeDetail` page + route `/recipes/:id`

**Files:**
- Create: `src/pages/RecipeDetail.tsx`
- Modify: `src/App.tsx` (add `/recipes/:id` route)

**Interfaces:**
- Consumes: `foodly.getRecipe`, `useRequest`, `useParams`/`Link` from router; `Rating` (Task 6), `SectionBlock` (Task 9), `TagText`; `Badge`/`Button`/`Skeleton`/`Alert` from UI lib; `Recipe` from `protocol.ts`.
- Produces: `RecipeDetail` page.

- [ ] **Step 1: Write the page**

Create `src/pages/RecipeDetail.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Badge, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { TagText } from '../components/TagText';
import { Rating } from '../components/recipe/Rating';
import { SectionBlock } from '../components/recipe/SectionBlock';

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function RecipeDetail() {
  const { id } = useParams();
  const recipeId = Number(id);
  const { status, data: recipe, error } = useRequest(() => foodly.getRecipe(recipeId), [recipeId]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/">← Zurück</Link>
      </Button>

      {status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Rezept nicht gefunden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button asChild variant="outline" size="sm"><Link to="/">Zur Liste</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      {status === 'ready' && recipe && (
        <article>
          {/* mainImage hero goes here once image loading lands; null in Phase 1. */}
          <header>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="font-display text-3xl text-foreground"><TagText value={recipe.name} /></h1>
              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {recipe.tags.map((t) => <Badge key={t} variant="secondary"><TagText value={t} /></Badge>)}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <Rating recipe={recipe} />
              {recipe.time && <><span aria-hidden>·</span><span>🕒 <TagText value={recipe.time} /></span></>}
              {recipe.amount && <><span aria-hidden>·</span><span><TagText value={recipe.amount} /></span></>}
            </div>
          </header>

          {recipe.notes.length > 0 && (
            <div className="mt-4 space-y-1">
              {recipe.notes.map((note, i) => (
                <p key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden>ⓘ</span><span><TagText value={note} /></span>
                </p>
              ))}
            </div>
          )}

          {recipe.sections.map((section) => <SectionBlock key={section.id} section={section} />)}

          {recipe.source && (
            <footer className="mt-10 text-sm text-muted-foreground">
              Quelle:{' '}
              {isUrl(recipe.source)
                ? <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="underline">{recipe.source}</a>
                : <TagText value={recipe.source} />}
            </footer>
          )}
        </article>
      )}
    </div>
  );
}
```

Note on `Rating` placement: when `averageRating` is `null` it renders `null`, leaving a leading `·`-free meta line — fine, since the dots are only inserted before `time`/`amount`.

- [ ] **Step 2: Add the route**

In `src/App.tsx`:

```tsx
import { RecipeDetail } from './pages/RecipeDetail';
// …
            <Route path="/" element={<RecipeList />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="*" element={<NotFound />} />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RecipeDetail.tsx src/App.tsx
git commit -m "feat(recipe): recipe detail page at /recipes/:id"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** Routing (T3/T7/T10) · `CatalogProvider` + graceful degrade + lazy-image note (T3) · `<TagText>` all-strings + rule table (T4, used in T7/T8/T9/T10) · `views.ratingsByRole` (T2) · list `★ Zahl` (T7) · detail `Stars`+Popover w/ role labels + "Du" highlight (T5/T6) · list layout rating-first + tags right + states (T7) · detail layout tags-right, meta rating-first, notes, 2-col sections, footer source-as-link (T9/T10) · `mainImage` placeholder/hero deferral (T1/T7/T10) · mock-Ausbau incl. empty rating + unknown token + time tokens (T1) · component inventory (all tasks) · `Home` deletion (T7). No gaps.

**Type consistency:** `ratingsByRole`/`RatedRole` defined T2, consumed T6. `useTags/useUsers/useTag/useUser/useCurrentUserId` defined T3, consumed T4/T6. `Stars({value})` T5 → T6. `TagText({value})` T4 → T7/T8/T9/T10. `formatIngredient`/`averageRating` (existing) → T6/T7/T8. Consistent.

**Placeholders:** none — every code step shows complete code.

**Known soft spots flagged for reviewers/smoke:** `Loader` render. Verified in the Chrome-MCP smoke.
