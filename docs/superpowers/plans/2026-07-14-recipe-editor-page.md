# Recipe Editor Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and edit recipes on their own pages — `/recipes/new` (explicit *Anlegen*) and `/recipes/:id/edit` (background autosave).

**Architecture:** The editor is a local-first form. A `Draft` (pure data + pure reducers, client-generated row keys) is the source of truth while editing; `useAutosave` debounces and coalesces `PUT /recipes/{id}` in the background. Server responses are never merged back into the form — the backend's `PUT` is a full replace that regenerates every nested id, so re-keying from a response would destroy the user's cursor and row identity.

**Tech Stack:** React 18 + TypeScript, React Router 6 (`BrowserRouter`), Vite, Vitest + Testing Library (jsdom), `@postxl/ui-components`, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-14-recipe-editor-page-design.md`

## Global Constraints

- **UI components:** every interactive control comes from `@postxl/ui-components`. Never hand-roll `<button>`, `<input>`, `<select>`. The library exports **no** `Combobox`/`MultiSelect` — build those from `Popover` + `Command`/`CommandInput`/`CommandList`/`CommandItem`/`CommandEmpty`.
- **Tooltips:** the postxl `Tooltip` + `TooltipTrigger asChild` + `TooltipContent`. Never `title=""`.
- **Styling:** Tailwind utilities only. **No inline `style={{…}}`**, no new CSS rules. Arbitrary values (`w-[62px]`) are the way to express one-off numbers. Don't hand-size text — the token scale drives it.
- **Backend access:** only through `src/api`. Never `fetch` from a component.
- **Formatting (`prettier.config.cjs`):** no semicolons, single quotes, 2-space indent, printWidth 120. Match it as you write.
- **Comments:** explain *why*, never *what*. No comment walls above functions.
- **Language:** all user-facing copy is **German**. Code identifiers are English.
- **Git:** commit after each task. **No `Co-Authored-By` trailer, no AI attribution.** Never push.
- **`PUT /recipes/{id}` is a full replace** — anything omitted from the body is destroyed server-side. This is why `time` is carried through the draft untouched even though it has no form field.

**Commands:** `npm test` (vitest run) · `npx vitest run <path>` (one file) · `npm run build` (tsc + vite build) · `npm run format`

---

### Task 1: Write wire types + REST verbs

**Files:**
- Modify: `src/api/protocol.ts` (append at end)
- Modify: `src/api/rest.ts:36-39` (the `rest` object)
- Test: `src/api/rest.write.test.ts` (create)

**Interfaces:**
- Produces: `CreateRecipe`, `CreateSection`, `CreateRecipeIngredient`, `UploadedImage` types; `rest.put`, `rest.del`, `rest.postBinary`.

- [ ] **Step 1: Write the failing test**

Create `src/api/rest.write.test.ts`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rest } from './rest'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

afterEach(() => vi.restoreAllMocks())

describe('rest write verbs', () => {
  it('put sends JSON and resolves the parsed body', async () => {
    const fetchSpy = mockFetch(200, { id: 7 })

    const result = await rest.put<{ id: number }>('/recipes/7', { name: 'Neu' })

    expect(result).toEqual({ id: 7 })
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/v1/recipes/7')
    expect(init?.method).toBe('PUT')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ name: 'Neu' }))
  })

  it('del resolves undefined on 204', async () => {
    mockFetch(204, undefined)
    await expect(rest.del('/recipes/7')).resolves.toBeUndefined()
  })

  it('postBinary sends the raw blob with its own content type', async () => {
    const fetchSpy = mockFetch(201, { id: 3, hash: 'abc', name: null })
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })

    const result = await rest.postBinary<{ id: number }>('/images', file)

    expect(result).toEqual({ id: 3, hash: 'abc', name: null })
    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('image/png')
    expect(init?.body).toBe(file)
  })

  it('throws the backend error message', async () => {
    mockFetch(422, { error: { message: 'Recipe name must not be empty' } })
    await expect(rest.put('/recipes/7', {})).rejects.toThrow('Recipe name must not be empty')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/rest.write.test.ts`
Expected: FAIL — `rest.put is not a function`.

- [ ] **Step 3: Add the verbs**

The existing `request()` already handles the 204 case and the error envelope. `postBinary` can't reuse it, because `request()` hardcodes `Content-Type: application/json` whenever a body is present — the backend reads `POST /images` as raw `Bytes` and rejects JSON.

In `src/api/rest.ts`, replace the `rest` object (lines 36-39) with:

```ts
async function requestBinary<T>(path: string, blob: Blob): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEV_TOKEN}`, 'Content-Type': blob.type },
    body: blob,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return (await res.json()) as T
}

export const rest = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),
  postBinary: <T>(path: string, blob: Blob) => requestBinary<T>(path, blob),
}
```

Extract the error-body parsing that `request()` already does into a shared helper, so both paths report the backend's message. Replace the `if (!res.ok) { … }` block inside `request()` with `if (!res.ok) throw new Error(await errorMessage(res))` and add above it:

```ts
async function errorMessage(res: Response): Promise<string> {
  try {
    const parsed = (await res.json()) as { error?: { message?: string } }
    if (parsed?.error?.message) return parsed.error.message
  } catch {
    // non-JSON error body — fall back to the status
  }
  return `HTTP ${res.status}`
}
```

- [ ] **Step 4: Add the wire types**

Append to `src/api/protocol.ts`:

```ts
// Write payload for POST /recipes and PUT /recipes/{id}. PUT is a FULL REPLACE:
// the backend deletes and re-inserts tags, images and sections, so nested ids are
// not stable across updates and any id sent in a nested object is ignored.
export type CreateRecipe = {
  name: string
  tags: TagId[]
  source: string | null
  time: string | null
  workMinutes: number | null
  overallMinutes: number | null
  sizeNumber: number | null
  sizeText: string | null
  notes: string[]
  mainImage: ImageId | null
  images: ImageId[]
  sections: CreateSection[]
}

// `ingredients` and `steps` have no serde default server-side — both keys must
// be present, even when empty.
export type CreateSection = {
  name: string | null
  ingredients: CreateRecipeIngredient[]
  steps: string[]
}

// `ingredient` is the bare id here, unlike the expanded IngredientRef on reads.
export type CreateRecipeIngredient = {
  ingredient: IngredientId | null
  text: string | null
  amount: string | null
  amountPrefix: string | null
  unit: string | null
}

export type UploadedImage = { id: ImageId; hash: Hash; name: string | null }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/api/rest.test.ts src/api/rest.write.test.ts`
Expected: PASS — both the existing rest tests and the four new ones.

- [ ] **Step 6: Commit**

```bash
git add src/api/protocol.ts src/api/rest.ts src/api/rest.write.test.ts
git commit -m "feat(api): add put/del/postBinary and the recipe write wire types"
```

---

### Task 2: Extend the `foodly` API surface + mock backend

**Files:**
- Modify: `src/api/index.ts:38-66` (the `foodly` object)
- Modify: `src/mocks/index.ts:30-77` (the `mockRequest` switch)
- Test: `src/mocks/write.test.ts` (create)

**Interfaces:**
- Consumes: `CreateRecipe`, `UploadedImage`, `rest.put`, `rest.postBinary` (Task 1).
- Produces:
  - `foodly.createRecipe(input: CreateRecipe): Promise<Recipe>`
  - `foodly.updateRecipe(id: RecipeId, input: CreateRecipe): Promise<Recipe>`
  - `foodly.uploadImage(file: Blob): Promise<UploadedImage>`

No `deleteRecipe`: with the explicit *Anlegen* button a new recipe doesn't exist server-side when *Verwerfen* is pressed, so nothing needs deleting. The endpoint exists; it gets wired when the UI grows a delete entry point.

- [ ] **Step 1: Write the failing test**

Create `src/mocks/write.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mockData, mockRequest, CURRENT_USER_ID } from './index'
import type { CreateRecipe, Recipe } from '../api/protocol'

const input: CreateRecipe = {
  name: 'Testrezept',
  tags: [],
  source: null,
  time: null,
  workMinutes: 10,
  overallMinutes: 20,
  sizeNumber: 2,
  sizeText: '{Portionen}',
  notes: [],
  mainImage: null,
  images: [],
  sections: [{ name: null, ingredients: [], steps: ['Umrühren.'] }],
}

describe('mock writes', () => {
  it('creates a recipe owned by the current user and makes it gettable', async () => {
    const created = (await mockRequest('recipes.create', { input })) as Recipe

    expect(created.id).toBeGreaterThan(0)
    expect(created.owner).toBe(CURRENT_USER_ID)
    expect(created.name).toBe('Testrezept')
    expect(created.sections[0].steps).toEqual(['Umrühren.'])

    const fetched = (await mockRequest('recipes.get', { id: created.id })) as Recipe
    expect(fetched.name).toBe('Testrezept')
  })

  it('updates in place and keeps the id', async () => {
    const created = (await mockRequest('recipes.create', { input })) as Recipe

    const updated = (await mockRequest('recipes.update', {
      id: created.id,
      input: { ...input, name: 'Umbenannt' },
    })) as Recipe

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Umbenannt')
    expect(mockData.recipes.filter((r) => r.id === created.id)).toHaveLength(1)
  })

  it('rejects an update of an unknown recipe', async () => {
    await expect(mockRequest('recipes.update', { id: 9999, input })).rejects.toThrow(/not found/)
  })

  it('uploads an image and returns a fresh id', async () => {
    const first = (await mockRequest('images.upload')) as { id: number }
    const second = (await mockRequest('images.upload')) as { id: number }
    expect(second.id).toBeGreaterThan(first.id)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/write.test.ts`
Expected: FAIL — `[mock] no handler for message type "recipes.create"`.

- [ ] **Step 3: Add the mock handlers**

The mock is the write-side reference implementation: it must expand `CreateRecipe` back into a full `Recipe` exactly as the backend does — assigning ids, resolving `ingredient` ids to `IngredientRef`s, and defaulting the read-only fields.

Add to `src/mocks/index.ts`, above `mockRequest`:

```ts
import type { CreateRecipe, Recipe, RecipeId } from '../api/protocol'

let nextId = 10_000

// Mirrors the backend's expansion of a CreateRecipe into a Recipe: fresh ids
// everywhere (the real PUT deletes and re-inserts nested rows, so ids are not
// stable across an update) and IngredientRefs resolved from the catalog.
function expand(input: CreateRecipe, id: RecipeId, owner: number): Recipe {
  return {
    id,
    owner,
    editors: [],
    viewers: [],
    rating: [],
    name: input.name,
    tags: input.tags,
    source: input.source,
    time: input.time,
    workMinutes: input.workMinutes,
    overallMinutes: input.overallMinutes,
    sizeNumber: input.sizeNumber,
    sizeText: input.sizeText,
    notes: input.notes,
    mainImage: input.mainImage,
    images: input.images,
    sections: input.sections.map((section) => ({
      id: nextId++,
      name: section.name,
      steps: section.steps,
      ingredients: section.ingredients.map((line) => ({
        id: nextId++,
        ingredient: line.ingredient === null ? null : (mockData.ingredients.find((i) => i.id === line.ingredient) ?? null),
        text: line.text,
        amount: line.amount,
        amountPrefix: line.amountPrefix,
        unit: line.unit,
      })),
    })),
  }
}
```

Then add these `case`s to the `switch` in `mockRequest`, before `default`:

```ts
    case 'recipes.create': {
      const { input } = payload as { input: CreateRecipe }
      const created = expand(input, nextId++, CURRENT_USER_ID)
      mockData.recipes.push(created)
      return created
    }
    case 'recipes.update': {
      const { input } = payload as { input: CreateRecipe }
      const index = mockData.recipes.findIndex((r) => r.id === id)
      if (index === -1) throw new Error(`recipe ${id} not found`)
      const existing = mockData.recipes[index]
      const updated = expand(input, existing.id, existing.owner)
      updated.editors = existing.editors
      updated.viewers = existing.viewers
      updated.rating = existing.rating
      mockData.recipes[index] = updated
      return updated
    }
    case 'images.upload': {
      const imageId = nextId++
      return { id: imageId, hash: `mock-${imageId}`, name: null }
    }
```

The `ingredient` lookup returns the catalog `Ingredient` (`{id, name, …}`), which structurally satisfies `IngredientRef` — the extra metadata fields are harmless.

- [ ] **Step 4: Add the `foodly` methods**

In `src/api/index.ts`, add to the `foodly` object (and extend the type import list with `CreateRecipe`, `UploadedImage`):

```ts
  createRecipe: (input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.create', { input }) : rest.post<Recipe>('/recipes', input),

  updateRecipe: (id: RecipeId, input: CreateRecipe): Promise<Recipe> =>
    USE_MOCKS ? socket.request<Recipe>('recipes.update', { id, input }) : rest.put<Recipe>(`/recipes/${id}`, input),

  uploadImage: (file: Blob): Promise<UploadedImage> =>
    USE_MOCKS ? socket.request<UploadedImage>('images.upload') : rest.postBinary<UploadedImage>('/images', file),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/mocks && npm run build`
Expected: PASS, and `tsc` clean.

- [ ] **Step 6: Commit**

```bash
git add src/api/index.ts src/mocks/index.ts src/mocks/write.test.ts
git commit -m "feat(api): createRecipe/updateRecipe/uploadImage with mock backend support"
```

---

### Task 3: The draft model — types, reducers, `toCreateRecipe`

**Files:**
- Create: `src/editor/draft.ts`
- Test: `src/editor/draft.test.ts`

This is the heart of the feature and it is pure: no React, no network. Everything that can be a bug in the editor (losing a section, mangling the size fields, sending an invalid ingredient) is decided here and tested without rendering anything.

**Interfaces:**
- Consumes: `Recipe`, `CreateRecipe`, `IngredientId`, `ImageId`, `TagId` (Task 1).
- Produces:
  - `type Draft`, `type DraftSection`, `type DraftIngredient`, `type DraftStep`
  - `emptyDraft(): Draft`
  - `toDraft(recipe: Recipe): Draft`
  - `toCreateRecipe(draft: Draft): CreateRecipe`
  - `move<T extends { key: number }>(rows: T[], key: number, delta: -1 | 1): T[]`
  - `newIngredient(): DraftIngredient`, `newStep(): DraftStep`, `newSection(): DraftSection`

**Key design points to preserve:**
- **`key`** is a client-side counter, never a server id. It's the React `key` and the reorder identity. Server ids are dropped entirely on load, because `PUT` regenerates them.
- **`time`** is carried but never edited (see Global Constraints).
- **`sizeMode`** makes the `sizeNumber`/`sizeText` either-or explicit in the draft, so the UI branches on one field instead of inferring from nulls.

- [ ] **Step 1: Write the failing test**

Create `src/editor/draft.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { emptyDraft, move, newIngredient, toCreateRecipe, toDraft } from './draft'
import type { Recipe } from '../api/protocol'

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Pasta',
    tags: ['Vegan'],
    source: 'Oma',
    time: '20 min + {Kochzeit} 25 min',
    workMinutes: 20,
    overallMinutes: 45,
    sizeNumber: 4,
    sizeText: '{Portionen}',
    notes: ['Kalt besser.'],
    mainImage: 1,
    images: [2, 3],
    sections: [
      {
        id: 10,
        name: 'Sugo',
        ingredients: [
          { id: 100, ingredient: { id: 5, name: 'Zwiebel' }, text: null, amount: '1', amountPrefix: null, unit: null },
          { id: 101, ingredient: null, text: 'Salz', amount: null, amountPrefix: 'ca.', unit: 'Prise' },
        ],
        steps: ['Hacken.', 'Braten.'],
      },
    ],
    ...over,
  }
}

describe('toDraft', () => {
  it('assigns client keys and drops server ids', () => {
    const draft = toDraft(recipe())
    const keys = draft.sections[0].ingredients.map((i) => i.key)
    expect(new Set(keys).size).toBe(2)
    expect(keys).not.toContain(100)
  })

  it('reads a catalog ingredient as an id and a free-text one as text', () => {
    const [first, second] = toDraft(recipe()).sections[0].ingredients
    expect(first.ingredient).toBe(5)
    expect(first.text).toBe('')
    expect(second.ingredient).toBeNull()
    expect(second.text).toBe('Salz')
  })

  it('derives sizeMode from sizeNumber', () => {
    expect(toDraft(recipe()).sizeMode).toBe('portions')
    expect(toDraft(recipe({ sizeNumber: null, sizeText: '28 cm {Springform}' })).sizeMode).toBe('text')
  })
})

describe('toCreateRecipe', () => {
  it('round-trips a recipe unchanged', () => {
    const original = recipe()
    const wire = toCreateRecipe(toDraft(original))

    expect(wire).toEqual({
      name: 'Pasta',
      tags: ['Vegan'],
      source: 'Oma',
      time: '20 min + {Kochzeit} 25 min',
      workMinutes: 20,
      overallMinutes: 45,
      sizeNumber: 4,
      sizeText: '{Portionen}',
      notes: ['Kalt besser.'],
      mainImage: 1,
      images: [2, 3],
      sections: [
        {
          name: 'Sugo',
          ingredients: [
            { ingredient: 5, text: null, amount: '1', amountPrefix: null, unit: null },
            { ingredient: null, text: 'Salz', amount: null, amountPrefix: 'ca.', unit: 'Prise' },
          ],
          steps: ['Hacken.', 'Braten.'],
        },
      ],
    })
  })

  it('drops ingredient rows with neither an ingredient nor text', () => {
    const draft = toDraft(recipe())
    draft.sections[0].ingredients.push(newIngredient())

    const wire = toCreateRecipe(draft)

    expect(wire.sections[0].ingredients).toHaveLength(2)
  })

  it('drops blank steps and blank notes', () => {
    const draft = toDraft(recipe())
    draft.sections[0].steps.push({ key: 900, text: '   ' })
    draft.notes.push({ key: 901, text: '' })

    const wire = toCreateRecipe(draft)

    expect(wire.sections[0].steps).toEqual(['Hacken.', 'Braten.'])
    expect(wire.notes).toEqual(['Kalt besser.'])
  })

  it('nulls sizeNumber in text mode', () => {
    const draft = toDraft(recipe())
    draft.sizeMode = 'text'
    draft.sizeText = '28 cm {Springform}'

    expect(toCreateRecipe(draft).sizeNumber).toBeNull()
  })

  it('keeps an empty section, with both keys present', () => {
    const wire = toCreateRecipe(emptyDraft())
    expect(wire.sections).toEqual([{ name: null, ingredients: [], steps: [] }])
  })

  it('trims the name but keeps an empty one (the backend rejects it)', () => {
    const draft = emptyDraft()
    draft.name = '  Neu  '
    expect(toCreateRecipe(draft).name).toBe('Neu')
  })
})

describe('move', () => {
  it('swaps a row with its neighbour', () => {
    const rows = [{ key: 1 }, { key: 2 }, { key: 3 }]
    expect(move(rows, 2, -1).map((r) => r.key)).toEqual([2, 1, 3])
    expect(move(rows, 2, 1).map((r) => r.key)).toEqual([1, 3, 2])
  })

  it('is a no-op at the edges and does not mutate the input', () => {
    const rows = [{ key: 1 }, { key: 2 }]
    expect(move(rows, 1, -1).map((r) => r.key)).toEqual([1, 2])
    expect(move(rows, 2, 1).map((r) => r.key)).toEqual([1, 2])
    expect(rows.map((r) => r.key)).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editor/draft.test.ts`
Expected: FAIL — cannot resolve `./draft`.

- [ ] **Step 3: Write the implementation**

Create `src/editor/draft.ts`:

```ts
// The editor's working copy of a recipe. Deliberately NOT the wire shape:
//
//  - every row carries a client-side `key` instead of a server id, because
//    PUT /recipes/{id} deletes and re-inserts nested rows — server ids change on
//    every save, so they cannot identify a row the user is editing;
//  - `sizeMode` makes the sizeNumber/sizeText either-or explicit rather than
//    leaving the UI to infer it from nulls;
//  - text fields are '' rather than null, so inputs stay controlled.

import type { CreateRecipe, ImageId, IngredientId, Recipe, TagId } from '../api/protocol'

export type DraftIngredient = {
  key: number
  ingredient: IngredientId | null // catalog hit …
  text: string // … or free text; at least one must be set to survive the save
  amount: string
  amountPrefix: string
  unit: string
}

export type DraftStep = { key: number; text: string }
export type DraftNote = { key: number; text: string }

export type DraftSection = {
  key: number
  name: string
  ingredients: DraftIngredient[]
  steps: DraftStep[]
}

export type SizeMode = 'portions' | 'text'

export type Draft = {
  name: string
  source: string
  workMinutes: number | null
  overallMinutes: number | null
  sizeMode: SizeMode
  sizeNumber: number | null
  sizeText: string
  tags: TagId[]
  notes: DraftNote[]
  mainImage: ImageId | null
  images: ImageId[]
  sections: DraftSection[]
  // Never edited: the detail page still renders `time`, and PUT is a full
  // replace — dropping it would wipe the string. Goes away once the detail page
  // derives its display from workMinutes/overallMinutes.
  time: string | null
}

let counter = 0
const nextKey = () => ++counter

export function newIngredient(): DraftIngredient {
  return { key: nextKey(), ingredient: null, text: '', amount: '', amountPrefix: '', unit: '' }
}

export function newStep(): DraftStep {
  return { key: nextKey(), text: '' }
}

export function newNote(): DraftNote {
  return { key: nextKey(), text: '' }
}

export function newSection(): DraftSection {
  return { key: nextKey(), name: '', ingredients: [newIngredient()], steps: [newStep()] }
}

export function emptyDraft(): Draft {
  return {
    name: '',
    source: '',
    workMinutes: null,
    overallMinutes: null,
    sizeMode: 'portions',
    sizeNumber: null,
    sizeText: '',
    tags: [],
    notes: [],
    mainImage: null,
    images: [],
    sections: [{ key: nextKey(), name: '', ingredients: [], steps: [] }],
    time: null,
  }
}

export function toDraft(recipe: Recipe): Draft {
  return {
    name: recipe.name,
    source: recipe.source ?? '',
    workMinutes: recipe.workMinutes,
    overallMinutes: recipe.overallMinutes,
    sizeMode: recipe.sizeNumber !== null ? 'portions' : 'text',
    sizeNumber: recipe.sizeNumber,
    sizeText: recipe.sizeText ?? '',
    tags: [...recipe.tags],
    notes: recipe.notes.map((text) => ({ key: nextKey(), text })),
    mainImage: recipe.mainImage,
    images: [...recipe.images],
    time: recipe.time,
    sections: recipe.sections.map((section) => ({
      key: nextKey(),
      name: section.name ?? '',
      steps: section.steps.map((text) => ({ key: nextKey(), text })),
      ingredients: section.ingredients.map((line) => ({
        key: nextKey(),
        ingredient: line.ingredient?.id ?? null,
        text: line.text ?? '',
        amount: line.amount ?? '',
        amountPrefix: line.amountPrefix ?? '',
        unit: line.unit ?? '',
      })),
    })),
  }
}

const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim())

export function toCreateRecipe(draft: Draft): CreateRecipe {
  return {
    name: draft.name.trim(),
    tags: draft.tags,
    source: orNull(draft.source),
    time: draft.time,
    workMinutes: draft.workMinutes,
    overallMinutes: draft.overallMinutes,
    sizeNumber: draft.sizeMode === 'portions' ? draft.sizeNumber : null,
    sizeText: orNull(draft.sizeText),
    notes: draft.notes.map((n) => n.text.trim()).filter((t) => t !== ''),
    mainImage: draft.mainImage,
    images: draft.images,
    sections: draft.sections.map((section) => ({
      name: orNull(section.name),
      steps: section.steps.map((s) => s.text.trim()).filter((t) => t !== ''),
      // A row with neither an ingredient nor text is a 422 server-side; an empty
      // trailing row is normal while typing, so drop it instead of failing.
      ingredients: section.ingredients
        .filter((line) => line.ingredient !== null || line.text.trim() !== '')
        .map((line) => ({
          ingredient: line.ingredient,
          text: orNull(line.text),
          amount: orNull(line.amount),
          amountPrefix: orNull(line.amountPrefix),
          unit: orNull(line.unit),
        })),
    })),
  }
}

export function move<T extends { key: number }>(rows: T[], key: number, delta: -1 | 1): T[] {
  const from = rows.findIndex((r) => r.key === key)
  const to = from + delta
  if (from === -1 || to < 0 || to >= rows.length) return rows
  const next = [...rows]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editor/draft.test.ts`
Expected: PASS — all 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/draft.ts src/editor/draft.test.ts
git commit -m "feat(editor): draft model with client row keys and wire conversion"
```

---

### Task 4: `canEdit` permission predicate

**Files:**
- Create: `src/editor/access.ts`
- Test: `src/editor/access.test.ts`

**Interfaces:**
- Produces: `canEdit(recipe: Recipe, userId: UserId | null): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/editor/access.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canEdit } from './access'
import type { Recipe } from '../api/protocol'

const recipe = (over: Partial<Recipe>): Recipe =>
  ({ id: 1, owner: 1, editors: [], viewers: [], name: 'R' }) as Recipe & typeof over

describe('canEdit', () => {
  it('allows the owner', () => {
    expect(canEdit(recipe({ owner: 7 }), 7)).toBe(true)
  })

  it('allows an editor', () => {
    expect(canEdit(recipe({ owner: 1, editors: [7] }), 7)).toBe(true)
  })

  it('denies a viewer', () => {
    expect(canEdit(recipe({ owner: 1, viewers: [7] }), 7)).toBe(false)
  })

  it('denies an unrelated user and an unknown user', () => {
    expect(canEdit(recipe({ owner: 1 }), 7)).toBe(false)
    expect(canEdit(recipe({ owner: 1 }), null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editor/access.test.ts`
Expected: FAIL — cannot resolve `./access`.

- [ ] **Step 3: Write the implementation**

Create `src/editor/access.ts`:

```ts
// UX only, not a security boundary — the backend 403s regardless.
import type { Recipe, UserId } from '../api/protocol'

export function canEdit(recipe: Recipe, userId: UserId | null): boolean {
  if (userId === null) return false
  return recipe.owner === userId || recipe.editors.includes(userId)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editor/access.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/access.ts src/editor/access.test.ts
git commit -m "feat(editor): canEdit predicate"
```

---

### Task 5: `useAutosave`

**Files:**
- Create: `src/editor/useAutosave.ts`
- Test: `src/editor/useAutosave.test.ts`

The one genuinely tricky piece. Requirements, each of which is a test:

1. **Debounce** — changes within ~800 ms produce one save.
2. **Single-flight** — never two saves in flight at once.
3. **Coalesce** — changes arriving *during* a flight produce exactly one follow-up save, carrying the newest value.
4. **Error** — a failed save exposes `status: 'error'`; the next change retries; `retry()` retries on demand.
5. **Flush on unmount** — a pending debounce fires immediately rather than being dropped (in-app navigation must not lose the last keystroke).
6. **Adopt on enable** — the value present when the hook becomes *enabled* is the baseline, not a change.

Requirement 6 is subtle and load-bearing. In edit mode the editor's value goes `null` → *loaded recipe* while the fetch resolves. A naive "save whenever the value differs from the last one saved" fires a `PUT` on that transition — the app would re-save every recipe the moment you open it, before the user touched anything. So autosave stays disabled until the draft is loaded, and switching on **adopts** whatever is there as the baseline.

Note `React.StrictMode` double-invokes effects in dev, so the hook must be idempotent on mount/unmount cycles.

**Interfaces:**
- Consumes: nothing from earlier tasks (generic over the saved value).
- Produces:
  ```ts
  type SaveStatus = { state: 'idle' | 'saving' | 'saved' | 'error'; at: number | null; error: Error | null }
  function useAutosave<T>(value: T, save: (value: T) => Promise<unknown>, opts?: { enabled?: boolean; delay?: number }): {
    status: SaveStatus
    retry: () => void
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/editor/useAutosave.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

// Resolve pending promises without advancing timers.
const flushMicrotasks = () => act(async () => { await Promise.resolve() })

describe('useAutosave', () => {
  it('does not save the initial value', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useAutosave('a', save))

    act(() => vi.advanceTimersByTime(2000))

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces rapid changes into one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'ab' })
    act(() => vi.advanceTimersByTime(400))
    rerender({ v: 'abc' })
    act(() => vi.advanceTimersByTime(400))
    rerender({ v: 'abcd' })
    act(() => vi.advanceTimersByTime(800))
    await flushMicrotasks()

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('abcd')
  })

  it('reports saving then saved', async () => {
    let resolve!: () => void
    const save = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(800))
    expect(result.current.status.state).toBe('saving')

    await act(async () => { resolve() })
    expect(result.current.status.state).toBe('saved')
    expect(result.current.status.at).not.toBeNull()
  })

  it('coalesces changes made during a flight into one follow-up save', async () => {
    let resolveFirst!: () => void
    const save = vi
      .fn()
      .mockReturnValueOnce(new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(800)) // first save is now in flight

    rerender({ v: 'c' })
    act(() => vi.advanceTimersByTime(800))
    rerender({ v: 'd' })
    act(() => vi.advanceTimersByTime(800))
    expect(save).toHaveBeenCalledTimes(1) // still single-flight

    await act(async () => { resolveFirst() })
    await act(async () => { vi.advanceTimersByTime(800) })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('d') // newest value, not 'c'
  })

  it('exposes an error and retries on the next change', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    await act(async () => { vi.advanceTimersByTime(800) })

    expect(result.current.status.state).toBe('error')
    expect(result.current.status.error?.message).toBe('offline')

    rerender({ v: 'c' })
    await act(async () => { vi.advanceTimersByTime(800) })

    expect(result.current.status.state).toBe('saved')
  })

  it('retries the failed value on demand', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    await act(async () => { vi.advanceTimersByTime(800) })

    await act(async () => { result.current.retry() })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('b')
    expect(result.current.status.state).toBe('saved')
  })

  it('flushes a pending save on unmount', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender, unmount } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: 'a' } })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(200)) // debounce still pending
    unmount()

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('b')
  })

  it('saves nothing while disabled', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v }) => useAutosave(v, save, { enabled: false }), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(2000))

    expect(save).not.toHaveBeenCalled()
  })

  // The editor's value goes null -> loaded-recipe while the fetch resolves. That
  // must NOT count as an edit, or opening a recipe would immediately re-save it.
  it('adopts the value present when it becomes enabled', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(({ v, enabled }) => useAutosave(v, save, { enabled }), {
      initialProps: { v: null as string | null, enabled: false },
    })

    rerender({ v: 'loaded', enabled: true })
    await act(async () => { vi.advanceTimersByTime(2000) })

    expect(save).not.toHaveBeenCalled()

    rerender({ v: 'loaded, then edited', enabled: true })
    await act(async () => { vi.advanceTimersByTime(800) })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('loaded, then edited')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editor/useAutosave.test.ts`
Expected: FAIL — cannot resolve `./useAutosave`.

- [ ] **Step 3: Write the implementation**

Create `src/editor/useAutosave.ts`:

```ts
// Debounced background save with a single request in flight.
//
// Why single-flight + coalescing rather than one request per change: the save is
// PUT /recipes/{id}, a full replace. Two overlapping PUTs would race, and the
// loser's body — not the newest one — could land last. So at most one is in
// flight; anything typed meanwhile is folded into ONE follow-up carrying the
// newest value.

import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export type SaveStatus = { state: SaveState; at: number | null; error: Error | null }

const IDLE: SaveStatus = { state: 'idle', at: null, error: null }

export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  { enabled = true, delay = 800 }: { enabled?: boolean; delay?: number } = {},
): { status: SaveStatus; retry: () => void } {
  const [status, setStatus] = useState<SaveStatus>(IDLE)

  // Refs, not state: these drive an imperative timer/flight machine and must not
  // re-trigger the effect that schedules saves.
  const latest = useRef(value)
  const saveRef = useRef(save)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)
  const baseline = useRef(value) // the last value known to be persisted
  const wasEnabled = useRef(false)
  const enabledRef = useRef(enabled)

  latest.current = value
  saveRef.current = save
  enabledRef.current = enabled

  const dirty = () => !Object.is(latest.current, baseline.current)

  const run = useCallback(() => {
    if (inFlight.current) {
      queued.current = true
      return
    }
    const pending = latest.current
    inFlight.current = true
    setStatus({ state: 'saving', at: null, error: null })

    saveRef.current(pending)
      .then(() => {
        baseline.current = pending
        setStatus({ state: 'saved', at: Date.now(), error: null })
      })
      .catch((error: unknown) => {
        setStatus({ state: 'error', at: null, error: error as Error })
      })
      .finally(() => {
        inFlight.current = false
        // Something changed while we were saving — fold it into one more save.
        if (queued.current) {
          queued.current = false
          run()
        }
      })
  }, [])

  useEffect(() => {
    // While disabled (a new recipe, or one still loading) the value is tracked but
    // never sent, so the moment autosave switches on it has nothing to catch up on.
    if (!enabled) {
      baseline.current = value
      wasEnabled.current = false
      return
    }

    // First enabled render: adopt what's there (the freshly loaded recipe) as the
    // baseline. Without this the null -> loaded transition reads as an edit and
    // every recipe would be re-saved the instant it's opened.
    if (!wasEnabled.current) {
      wasEnabled.current = true
      baseline.current = value
      return
    }

    if (Object.is(value, baseline.current)) return // nothing new to persist

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      run()
    }, delay)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, enabled, delay, run])

  // In-app navigation unmounts the editor; a pending debounce would silently drop
  // the last keystrokes, so fire it now. The PUT outlives the component.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (enabledRef.current && !inFlight.current && dirty()) void saveRef.current(latest.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Closing the tab mid-save loses the change; warn while one is outstanding.
  useEffect(() => {
    const pendingWork = () => timer.current !== null || inFlight.current || status.state === 'error'
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWork()) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [status.state])

  const retry = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    run()
  }, [run])

  return { status, retry }
}
```

The `baseline` ref is what makes "don't save the initial value" and "retry the failed value" both work: a save only fires when `value` differs from the last successfully-persisted one, and a failure leaves `baseline` untouched, so the next change (or `retry()`) tries again.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editor/useAutosave.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/useAutosave.ts src/editor/useAutosave.test.ts
git commit -m "feat(editor): debounced single-flight autosave hook"
```

---

### Task 6: Leaf inputs — `SaveStatus`, `SizeField`, `StepRow`, `RowActions`

**Files:**
- Create: `src/components/editor/SaveStatus.tsx`
- Create: `src/components/editor/RowActions.tsx`
- Create: `src/components/editor/SizeField.tsx`
- Create: `src/components/editor/StepRow.tsx`
- Test: `src/components/editor/SizeField.test.tsx`

**Interfaces:**
- Consumes: `SaveStatus` type (Task 5); `Draft`, `SizeMode` (Task 3).
- Produces:
  - `<SaveStatusIndicator status={SaveStatus} onRetry={() => void} />`
  - `<RowActions onUp onDown onRemove canMoveUp canMoveDown removeLabel />` — the shared up/down/trash trio
  - `<SizeField mode sizeNumber sizeText onChange={(patch: Partial<Draft>) => void} />`
  - `<StepRow index text onChange onUp onDown onRemove canMoveUp canMoveDown />`

- [ ] **Step 1: Write the failing test**

Create `src/components/editor/SizeField.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SizeField } from './SizeField'

describe('SizeField', () => {
  it('edits the portion count in portions mode', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Anzahl'), { target: { value: '6' } })

    expect(onChange).toHaveBeenCalledWith({ sizeNumber: 6 })
  })

  it('switching to text mode clears the number', () => {
    const onChange = vi.fn()
    render(<SizeField mode="portions" sizeNumber={4} sizeText="{Portionen}" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Freitext' }))

    expect(onChange).toHaveBeenCalledWith({ sizeMode: 'text', sizeNumber: null })
  })

  it('hides the number input in text mode', () => {
    render(<SizeField mode="text" sizeNumber={null} sizeText="28 cm {Springform}" onChange={vi.fn()} />)

    expect(screen.queryByLabelText('Anzahl')).toBeNull()
    expect(screen.getByLabelText('Bezeichnung')).toHaveValue('28 cm {Springform}')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/editor/SizeField.test.tsx`
Expected: FAIL — cannot resolve `./SizeField`.

- [ ] **Step 3: Write the components**

Create `src/components/editor/SaveStatus.tsx`:

```tsx
import { Button } from '@postxl/ui-components'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import type { SaveStatus } from '../../editor/useAutosave'

const time = (at: number) => new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

export function SaveStatusIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status.state === 'error') {
    return (
      <span className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Nicht gespeichert
        <Button variant="outline" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      </span>
    )
  }
  if (status.state === 'saving') {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Speichert …
      </span>
    )
  }
  if (status.state === 'saved' && status.at !== null) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Check className="h-4 w-4 text-success" />
        Automatisch gesichert {time(status.at)}
      </span>
    )
  }
  return <span className="text-muted-foreground">Änderungen werden automatisch gesichert</span>
}
```

`text-success` maps to the `--success` token that `theme.css` already defines.

Create `src/components/editor/RowActions.tsx`:

```tsx
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

// The up/down/trash trio shared by ingredients, steps, notes and sections.
// Drag & drop is deliberately not implemented (see the plan's scope notes).
export function RowActions({
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  removeLabel,
}: {
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  removeLabel: string
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="sm" onClick={onUp} disabled={!canMoveUp} aria-label="Nach oben">
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDown} disabled={!canMoveDown} aria-label="Nach unten">
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={removeLabel}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{removeLabel}</TooltipContent>
      </Tooltip>
    </div>
  )
}
```

Create `src/components/editor/SizeField.tsx`:

```tsx
import { Input, Label, RadioGroup, RadioGroupItem } from '@postxl/ui-components'
import type { Draft, SizeMode } from '../../editor/draft'

// sizeNumber and sizeText are mutually exclusive in the model (PortionScaler
// branches on sizeNumber !== null), so the mode is an explicit choice rather
// than something inferred from which field the user touched last.
export function SizeField({
  mode,
  sizeNumber,
  sizeText,
  onChange,
}: {
  mode: SizeMode
  sizeNumber: number | null
  sizeText: string
  onChange: (patch: Partial<Draft>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Größe</Label>
      <RadioGroup
        value={mode}
        onValueChange={(next) =>
          onChange(next === 'portions' ? { sizeMode: 'portions' } : { sizeMode: 'text', sizeNumber: null })
        }
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="portions" id="size-portions" />
          <Label htmlFor="size-portions">Portionen</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="text" id="size-text" />
          <Label htmlFor="size-text">Freitext</Label>
        </div>
      </RadioGroup>

      <div className="flex gap-2">
        {mode === 'portions' && (
          <Input
            type="number"
            min={1}
            aria-label="Anzahl"
            className="w-24"
            value={sizeNumber ?? ''}
            onChange={(e) => onChange({ sizeNumber: e.target.value === '' ? null : Number(e.target.value) })}
          />
        )}
        <Input
          aria-label="Bezeichnung"
          className="flex-1"
          placeholder={mode === 'portions' ? '{Portionen}' : '28 cm {Springform}'}
          value={sizeText}
          onChange={(e) => onChange({ sizeText: e.target.value })}
        />
      </div>
    </div>
  )
}
```

Create `src/components/editor/StepRow.tsx`:

```tsx
import { Textarea } from '@postxl/ui-components'
import { RowActions } from './RowActions'

export function StepRow({
  index,
  text,
  onChange,
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  index: number
  text: string
  onChange: (text: string) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
        {index + 1}
      </span>
      <Textarea
        aria-label={`Schritt ${index + 1}`}
        className="min-h-14 flex-1"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <RowActions
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        removeLabel={`Schritt ${index + 1} entfernen`}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/editor/SizeField.test.tsx`
Expected: PASS — 3 tests.

`RadioGroupItem` is a Radix primitive; if the test errors on a missing observer, the stubs in `src/test/setup.ts` already cover `ResizeObserver`/`IntersectionObserver` — add nothing new without a failing test proving it's needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor
git commit -m "feat(editor): save-status, row actions, size field and step row"
```

---

### Task 7: `IngredientPicker` + `IngredientRow`

**Files:**
- Create: `src/components/editor/IngredientPicker.tsx`
- Create: `src/components/editor/IngredientRow.tsx`
- Test: `src/components/editor/IngredientPicker.test.tsx`

The combobox that accepts **either** a catalog ingredient **or** free text. The model allows both (`ingredient` xor `text`), and the backend 422s a row with neither.

**Interfaces:**
- Consumes: `DraftIngredient` (Task 3), `useIngredients()` from `src/catalog/CatalogProvider`.
- Produces:
  - `<IngredientPicker value={IngredientId | null} text={string} onPick={(id: IngredientId) => void} onText={(text: string) => void} />`
  - `<IngredientRow line={DraftIngredient} onChange={(patch: Partial<DraftIngredient>) => void} onUp onDown onRemove canMoveUp canMoveDown />`

- [ ] **Step 1: Write the failing test**

Create `src/components/editor/IngredientPicker.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IngredientPicker } from './IngredientPicker'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({
    byId: { 1: { id: 1, name: 'Zwiebel' }, 2: { id: 2, name: 'Zucchini' } },
    status: 'ready',
  }),
}))

describe('IngredientPicker', () => {
  it('shows the picked catalog ingredient by name', () => {
    render(<IngredientPicker value={1} text="" onPick={vi.fn()} onText={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('Zwiebel')
  })

  it('picks a catalog ingredient', async () => {
    const onPick = vi.fn()
    render(<IngredientPicker value={null} text="" onPick={onPick} onText={vi.fn()} />)

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: 'Zucc' } })
    fireEvent.click(await screen.findByText('Zucchini'))

    expect(onPick).toHaveBeenCalledWith(2)
  })

  it('offers the typed value as free text when nothing matches', async () => {
    const onText = vi.fn()
    render(<IngredientPicker value={null} text="" onPick={vi.fn()} onText={onText} />)

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Zutat suchen …'), { target: { value: 'Zimtstange' } })
    fireEvent.click(await screen.findByText('„Zimtstange" als Freitext übernehmen'))

    expect(onText).toHaveBeenCalledWith('Zimtstange')
  })

  it('shows existing free text', () => {
    render(<IngredientPicker value={null} text="Salz" onPick={vi.fn()} onText={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('Salz')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/editor/IngredientPicker.test.tsx`
Expected: FAIL — cannot resolve `./IngredientPicker`.

- [ ] **Step 3: Write the components**

Create `src/components/editor/IngredientPicker.tsx`:

```tsx
import { useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@postxl/ui-components'
import { ChevronsUpDown } from 'lucide-react'
import { useIngredients } from '../../catalog/CatalogProvider'
import type { IngredientId } from '../../api/protocol'

// The catalog is read-only (no create-ingredient endpoint), so anything not in it
// has to survive as free text — which is exactly what RecipeIngredient.text is for.
export function IngredientPicker({
  value,
  text,
  onPick,
  onText,
}: {
  value: IngredientId | null
  text: string
  onPick: (id: IngredientId) => void
  onText: (text: string) => void
}) {
  const { byId } = useIngredients()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const all = Object.values(byId)
  const matches = all.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
  const label = value !== null ? (byId[value]?.name ?? '') : text
  const typed = query.trim()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
          <span className={label === '' ? 'text-muted-foreground' : undefined}>{label === '' ? 'Zutat …' : label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Zutat suchen …" value={query} onValueChange={setQuery} />
          <CommandList>
            {matches.length === 0 && typed === '' && <CommandEmpty>Keine Zutaten im Katalog.</CommandEmpty>}
            <CommandGroup>
              {matches.map((ingredient) => (
                <CommandItem
                  key={ingredient.id}
                  value={ingredient.name}
                  onSelect={() => {
                    onPick(ingredient.id)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  {ingredient.name}
                </CommandItem>
              ))}
              {typed !== '' && (
                <CommandItem
                  value={`__freetext_${typed}`}
                  onSelect={() => {
                    onText(typed)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  „{typed}" als Freitext übernehmen
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

`shouldFilter={false}` because the filtering is done above — `cmdk`'s built-in scoring would also hide the free-text item.

Create `src/components/editor/IngredientRow.tsx`:

```tsx
import { Input } from '@postxl/ui-components'
import { IngredientPicker } from './IngredientPicker'
import { RowActions } from './RowActions'
import type { DraftIngredient } from '../../editor/draft'

export function IngredientRow({
  line,
  onChange,
  onUp,
  onDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  line: DraftIngredient
  onChange: (patch: Partial<DraftIngredient>) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label="Präfix"
        className="w-16"
        placeholder="ca."
        value={line.amountPrefix}
        onChange={(e) => onChange({ amountPrefix: e.target.value })}
      />
      {/* amount is a string on the wire — "1-2" and "½" are valid */}
      <Input
        aria-label="Menge"
        className="w-20"
        placeholder="400"
        value={line.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />
      <Input
        aria-label="Einheit"
        className="w-20"
        placeholder="g"
        value={line.unit}
        onChange={(e) => onChange({ unit: e.target.value })}
      />
      <IngredientPicker
        value={line.ingredient}
        text={line.text}
        onPick={(id) => onChange({ ingredient: id, text: '' })}
        onText={(text) => onChange({ ingredient: null, text })}
      />
      <RowActions
        onUp={onUp}
        onDown={onDown}
        onRemove={onRemove}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        removeLabel="Zutat entfernen"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/editor/IngredientPicker.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/IngredientPicker.tsx src/components/editor/IngredientRow.tsx src/components/editor/IngredientPicker.test.tsx
git commit -m "feat(editor): ingredient picker with catalog and free-text entry"
```

---

### Task 8: `SectionEditor`

**Files:**
- Create: `src/components/editor/SectionEditor.tsx`
- Test: `src/components/editor/SectionEditor.test.tsx`

One section: optional name, its ingredients, its steps. A single unnamed section reads like the flat mockup; the name field is what makes multi-section recipes possible.

**Interfaces:**
- Consumes: `DraftSection`, `DraftIngredient`, `move`, `newIngredient`, `newStep` (Task 3); `IngredientRow` (Task 7); `StepRow`, `RowActions` (Task 6).
- Produces: `<SectionEditor section index total onChange={(next: DraftSection) => void} onUp onDown onRemove />`

- [ ] **Step 1: Write the failing test**

Create `src/components/editor/SectionEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { describe, expect, it, vi } from 'vitest'
import { SectionEditor } from './SectionEditor'
import type { DraftSection } from '../../editor/draft'

vi.mock('../../catalog/CatalogProvider', () => ({
  useIngredients: () => ({ byId: { 1: { id: 1, name: 'Zwiebel' } }, status: 'ready' }),
}))

const section: DraftSection = {
  key: 1,
  name: 'Sugo',
  ingredients: [{ key: 10, ingredient: 1, text: '', amount: '1', amountPrefix: '', unit: '' }],
  steps: [
    { key: 20, text: 'Hacken.' },
    { key: 21, text: 'Braten.' },
  ],
}

function setup(onChange = vi.fn()) {
  render(
    <TooltipProvider>
      <SectionEditor
        section={section}
        index={0}
        total={1}
        onChange={onChange}
        onUp={vi.fn()}
        onDown={vi.fn()}
        onRemove={vi.fn()}
      />
    </TooltipProvider>,
  )
  return onChange
}

describe('SectionEditor', () => {
  it('adds an ingredient row', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /zutat hinzufügen/i }))

    expect(onChange.mock.calls[0][0].ingredients).toHaveLength(2)
  })

  it('adds a step', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: /schritt hinzufügen/i }))

    expect(onChange.mock.calls[0][0].steps).toHaveLength(3)
  })

  it('moves a step down', () => {
    const onChange = setup()

    // The first step's "Nach unten" — steps come after the single ingredient row.
    const downs = screen.getAllByRole('button', { name: 'Nach unten' })
    fireEvent.click(downs[1])

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Braten.', 'Hacken.'])
  })

  it('removes a step', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Schritt 2 entfernen' }))

    expect(onChange.mock.calls[0][0].steps.map((s: { text: string }) => s.text)).toEqual(['Hacken.'])
  })

  it('edits the section name', () => {
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Abschnittsname'), { target: { value: 'Teig' } })

    expect(onChange.mock.calls[0][0].name).toBe('Teig')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/editor/SectionEditor.test.tsx`
Expected: FAIL — cannot resolve `./SectionEditor`.

- [ ] **Step 3: Write the component**

Create `src/components/editor/SectionEditor.tsx`:

```tsx
import { Button, Card, CardContent, Input, Label } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { IngredientRow } from './IngredientRow'
import { RowActions } from './RowActions'
import { StepRow } from './StepRow'
import { move, newIngredient, newStep } from '../../editor/draft'
import type { DraftIngredient, DraftSection } from '../../editor/draft'

export function SectionEditor({
  section,
  index,
  total,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  section: DraftSection
  index: number
  total: number
  onChange: (next: DraftSection) => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
}) {
  const patchIngredient = (key: number, patch: Partial<DraftIngredient>) =>
    onChange({
      ...section,
      ingredients: section.ingredients.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    })

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor={`section-${section.key}`}>Abschnittsname</Label>
            <Input
              id={`section-${section.key}`}
              aria-label="Abschnittsname"
              placeholder="ohne Namen"
              value={section.name}
              onChange={(e) => onChange({ ...section, name: e.target.value })}
            />
          </div>
          <RowActions
            onUp={onUp}
            onDown={onDown}
            onRemove={onRemove}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            removeLabel="Abschnitt entfernen"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Zutaten</Label>
          {section.ingredients.map((line, i) => (
            <IngredientRow
              key={line.key}
              line={line}
              onChange={(patch) => patchIngredient(line.key, patch)}
              onUp={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, -1) })}
              onDown={() => onChange({ ...section, ingredients: move(section.ingredients, line.key, 1) })}
              onRemove={() =>
                onChange({ ...section, ingredients: section.ingredients.filter((r) => r.key !== line.key) })
              }
              canMoveUp={i > 0}
              canMoveDown={i < section.ingredients.length - 1}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ ...section, ingredients: [...section.ingredients, newIngredient()] })}
          >
            <Plus className="h-4 w-4" />
            Zutat hinzufügen
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Zubereitung</Label>
          {section.steps.map((step, i) => (
            <StepRow
              key={step.key}
              index={i}
              text={step.text}
              onChange={(text) =>
                onChange({ ...section, steps: section.steps.map((s) => (s.key === step.key ? { ...s, text } : s)) })
              }
              onUp={() => onChange({ ...section, steps: move(section.steps, step.key, -1) })}
              onDown={() => onChange({ ...section, steps: move(section.steps, step.key, 1) })}
              onRemove={() => onChange({ ...section, steps: section.steps.filter((s) => s.key !== step.key) })}
              canMoveUp={i > 0}
              canMoveDown={i < section.steps.length - 1}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ ...section, steps: [...section.steps, newStep()] })}
          >
            <Plus className="h-4 w-4" />
            Schritt hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/editor/SectionEditor.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/SectionEditor.tsx src/components/editor/SectionEditor.test.tsx
git commit -m "feat(editor): section editor with ingredients and steps"
```

---

### Task 9: `TagPicker` + `ImageManager`

**Files:**
- Create: `src/components/editor/TagPicker.tsx`
- Create: `src/components/editor/ImageManager.tsx`
- Test: `src/components/editor/ImageManager.test.tsx`

**Interfaces:**
- Consumes: `useTags()` from `src/catalog/CatalogProvider`; `foodly.uploadImage` (Task 2); `recipeImageSrc`-style helper from `src/api/assets`; `TagIcon`/`TagText` from `src/components/TagText`.
- Produces:
  - `<TagPicker value={TagId[]} onChange={(tags: TagId[]) => void} />`
  - `<ImageManager mainImage={ImageId | null} images={ImageId[]} onChange={(patch: {mainImage?: ImageId | null; images?: ImageId[]}) => void} />`

**Image URLs** come from `recipeImageSrc(id)` in `src/api/assets.ts` — it already exists (the detail page uses it). Never hand-build an image URL in a component; `assets.ts` is the single place that knows the hash/id → URL scheme.

**No tag creation.** The backend has no create-tag endpoint and a recipe referencing an unknown tag is a 422 — so the picker selects from the catalog only, and the mockup's "+ Tag" free-entry field does not exist. This is an accepted, spec-recorded gap.

- [ ] **Step 1: Write the failing test**

Create `src/components/editor/ImageManager.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManager } from './ImageManager'
import { foodly } from '../../api'

afterEach(() => vi.restoreAllMocks())

const file = () => new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })

function setup(onChange = vi.fn(), mainImage: number | null = 1, images: number[] = [2]) {
  render(
    <TooltipProvider>
      <ImageManager mainImage={mainImage} images={images} onChange={onChange} />
    </TooltipProvider>,
  )
  return onChange
}

describe('ImageManager', () => {
  it('uploads a file and appends it to the gallery', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 9, hash: 'h', name: null })
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(foodly.uploadImage).toHaveBeenCalled())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ images: [2, 9] }))
  })

  it('makes the first image the main one when there is none', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 9, hash: 'h', name: null })
    const onChange = setup(vi.fn(), null, [])

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ mainImage: 9, images: [] }))
  })

  it('promotes a gallery image to main and demotes the old main', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Als Hauptbild' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: 2, images: [1] })
  })

  it('removes the main image', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Hauptbild entfernen' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: null })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/editor/ImageManager.test.tsx`
Expected: FAIL — cannot resolve `./ImageManager`.

- [ ] **Step 3: Write the components**

Create `src/components/editor/TagPicker.tsx`:

```tsx
import { useState } from 'react'
import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@postxl/ui-components'
import { Plus, X } from 'lucide-react'
import { useTags } from '../../catalog/CatalogProvider'
import type { TagId } from '../../api/protocol'

// Selection only: the backend has no create-tag endpoint, and a recipe naming an
// unknown tag is rejected with 422.
export function TagPicker({ value, onChange }: { value: TagId[]; onChange: (tags: TagId[]) => void }) {
  const { byId } = useTags()
  const [open, setOpen] = useState(false)

  const available = Object.keys(byId).filter((id) => !value.includes(id))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((id) => (
        <Badge key={id} variant="secondary" className="gap-1">
          {id}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0"
            aria-label={`${id} entfernen`}
            onClick={() => onChange(value.filter((t) => t !== id))}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" role="combobox" className="gap-1.5">
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Tag suchen …" />
            <CommandList>
              <CommandEmpty>Kein passender Tag.</CommandEmpty>
              <CommandGroup>
                {available.map((id) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onChange([...value, id])
                      setOpen(false)
                    }}
                  >
                    {id}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

Create `src/components/editor/ImageManager.tsx`:

```tsx
import { useState } from 'react'
import { Button, Label } from '@postxl/ui-components'
import { Star, Trash2, Upload } from 'lucide-react'
import { toast } from '@postxl/ui-components'
import { foodly } from '../../api'
import { recipeImageSrc } from '../../api/assets'
import type { ImageId } from '../../api/protocol'

// Uploads land in the image store immediately (POST /images), and only the id is
// held in the draft. An image whose recipe is never saved is simply orphaned —
// the backend has no cleanup, and that's an accepted gap.
export function ImageManager({
  mainImage,
  images,
  onChange,
}: {
  mainImage: ImageId | null
  images: ImageId[]
  onChange: (patch: { mainImage?: ImageId | null; images?: ImageId[] }) => void
}) {
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const { id } = await foodly.uploadImage(file)
      if (mainImage === null) onChange({ mainImage: id, images })
      else onChange({ images: [...images, id] })
    } catch (e) {
      toast.error(`Bild konnte nicht hochgeladen werden: ${(e as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Bilder</Label>
      <div className="flex flex-wrap items-start gap-3">
        {mainImage !== null && (
          <figure className="flex flex-col items-center gap-1">
            <img src={recipeImageSrc(mainImage)} alt="Hauptbild" className="size-20 rounded-md object-cover" />
            <figcaption className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-star text-star" />
              Hauptbild
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hauptbild entfernen"
                onClick={() => onChange({ mainImage: null })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </figcaption>
          </figure>
        )}

        {images.map((id) => (
          <figure key={id} className="flex flex-col items-center gap-1">
            <img src={recipeImageSrc(id)} alt="" className="size-20 rounded-md object-cover" />
            <figcaption className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Als Hauptbild"
                onClick={() =>
                  onChange({
                    mainImage: id,
                    images: [...images.filter((i) => i !== id), ...(mainImage === null ? [] : [mainImage])],
                  })
                }
              >
                <Star className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Bild entfernen"
                onClick={() => onChange({ images: images.filter((i) => i !== id) })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </figcaption>
          </figure>
        ))}

        <Label
          htmlFor="image-upload"
          className="grid size-20 cursor-pointer place-items-center rounded-md border border-dashed text-muted-foreground"
        >
          <Upload className="h-5 w-5" />
        </Label>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Bild hochladen"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
```

The bare `<input type="file">` is the one allowed raw control: there is no postxl file-input component, and a file picker can't be faked with a `Button` — the hidden-input-behind-a-`Label` pattern is the standard accessible approach. Everything visible is still a postxl component.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/editor/ImageManager.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/TagPicker.tsx src/components/editor/ImageManager.tsx src/components/editor/ImageManager.test.tsx
git commit -m "feat(editor): tag picker and image manager"
```

---

### Task 10: `BasicsCard`

**Files:**
- Create: `src/components/editor/BasicsCard.tsx`
- Test: none of its own — it is covered by `RecipeEditor.test.tsx` in Task 11.

Name, source, the two durations, size, notes and tags. This is assembly of components that are already tested; a separate test file would only re-test them.

**Interfaces:**
- Consumes: `Draft`, `move`, `newNote` (Task 3); `SizeField` (Task 6); `TagPicker` (Task 9); `RowActions` (Task 6); `TagText` (existing).
- Produces: `<BasicsCard draft onChange={(patch: Partial<Draft>) => void} />`

- [ ] **Step 1: Write the component**

Create `src/components/editor/BasicsCard.tsx`:

```tsx
import { Button, Card, CardContent, Input, Label } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { RowActions } from './RowActions'
import { SizeField } from './SizeField'
import { TagPicker } from './TagPicker'
import { TagText } from '../TagText'
import { move, newNote } from '../../editor/draft'
import type { Draft } from '../../editor/draft'

// Minutes are plain number inputs: the existing DurationPicker is the timer's
// h:m:s drum wheel, which is the wrong control for a form field.
function MinutesField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          className="w-24"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
        <span className="text-muted-foreground">Min.</span>
      </div>
    </div>
  )
}

export function BasicsCard({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-name">Titel</Label>
          <Input
            id="recipe-name"
            value={draft.name}
            placeholder="Cremige Pilz-Pasta"
            onChange={(e) => onChange({ name: e.target.value })}
          />
          {/* {Tag} tokens render as icons on the detail page — show what they'll become. */}
          {draft.name.includes('{') && (
            <p className="text-muted-foreground">
              Vorschau: <TagText value={draft.name} />
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-source">Quelle</Label>
          <Input
            id="recipe-source"
            value={draft.source}
            placeholder="Omas Rezept oder https://…"
            onChange={(e) => onChange({ source: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <MinutesField
            id="work-minutes"
            label="Arbeitszeit"
            value={draft.workMinutes}
            onChange={(workMinutes) => onChange({ workMinutes })}
          />
          <MinutesField
            id="overall-minutes"
            label="Gesamtzeit"
            value={draft.overallMinutes}
            onChange={(overallMinutes) => onChange({ overallMinutes })}
          />
        </div>

        <SizeField
          mode={draft.sizeMode}
          sizeNumber={draft.sizeNumber}
          sizeText={draft.sizeText}
          onChange={onChange}
        />

        <div className="flex flex-col gap-2">
          <Label>Tags</Label>
          <TagPicker value={draft.tags} onChange={(tags) => onChange({ tags })} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Notizen</Label>
          {draft.notes.map((note, i) => (
            <div key={note.key} className="flex items-center gap-2">
              <Input
                aria-label={`Notiz ${i + 1}`}
                className="flex-1"
                value={note.text}
                onChange={(e) =>
                  onChange({
                    notes: draft.notes.map((n) => (n.key === note.key ? { ...n, text: e.target.value } : n)),
                  })
                }
              />
              <RowActions
                onUp={() => onChange({ notes: move(draft.notes, note.key, -1) })}
                onDown={() => onChange({ notes: move(draft.notes, note.key, 1) })}
                onRemove={() => onChange({ notes: draft.notes.filter((n) => n.key !== note.key) })}
                canMoveUp={i > 0}
                canMoveDown={i < draft.notes.length - 1}
                removeLabel={`Notiz ${i + 1} entfernen`}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-primary"
            onClick={() => onChange({ notes: [...draft.notes, newNote()] })}
          >
            <Plus className="h-4 w-4" />
            Notiz hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: `tsc` clean, vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/BasicsCard.tsx
git commit -m "feat(editor): basics card with title, times, size, tags and notes"
```

---

### Task 11: The `RecipeEditor` page

**Files:**
- Create: `src/pages/RecipeEditor.tsx`
- Test: `src/pages/RecipeEditor.test.tsx`

Both routes, one component. `/recipes/new` starts from `emptyDraft()` with autosave **off** and an explicit *Anlegen*; `/recipes/:id/edit` loads the recipe, checks `canEdit`, and turns autosave **on**.

**Interfaces:**
- Consumes: everything above — `emptyDraft`, `toDraft`, `toCreateRecipe`, `move`, `newSection` (Task 3); `canEdit` (Task 4); `useAutosave` (Task 5); `SaveStatusIndicator` (Task 6); `SectionEditor` (Task 8); `BasicsCard` (Task 10); `foodly.createRecipe`/`updateRecipe`/`getRecipe`; `useRequest`; `useCurrentUserId`.
- Produces: `<RecipeEditor />`, routed in Task 12.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RecipeEditor.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditor } from './RecipeEditor'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

const navigate = vi.fn()
let params: { id?: string } = {}

vi.mock('react-router-dom', () => ({
  useParams: () => params,
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useIngredients: () => ({ byId: { 1: { id: 1, name: 'Zwiebel' } }, status: 'ready' }),
  useCurrentUserId: () => 1,
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Pasta',
    tags: [],
    source: null,
    time: '20 min',
    workMinutes: 20,
    overallMinutes: 40,
    sizeNumber: 4,
    sizeText: '{Portionen}',
    notes: [],
    mainImage: null,
    images: [],
    sections: [{ id: 1, name: null, ingredients: [], steps: ['Kochen.'] }],
    ...over,
  }
}

const view = () =>
  render(
    <TooltipProvider>
      <RecipeEditor />
    </TooltipProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  navigate.mockReset()
  params = {}
})

describe('RecipeEditor · new', () => {
  it('creates the recipe and swaps to the edit route', async () => {
    params = {}
    vi.spyOn(foodly, 'createRecipe').mockResolvedValue(recipe({ id: 42 }))
    view()

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Neues Rezept' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() =>
      expect(foodly.createRecipe).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neues Rezept' })),
    )
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/recipes/42/edit', { replace: true }))
  })

  it('will not create a nameless recipe', () => {
    params = {}
    view()

    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeDisabled()
  })
})

describe('RecipeEditor · edit', () => {
  it('autosaves a change and carries `time` through untouched', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    const update = vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect(screen.getByLabelText('Titel')).toHaveValue('Pasta'))

    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Pasta bianca' } })

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Pasta bianca', time: '20 min' }))
  })

  it('shows a retry when the save fails', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockRejectedValue(new Error('offline'))
    view()

    await waitFor(() => expect(screen.getByLabelText('Titel')).toHaveValue('Pasta'))
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'X' } })

    await waitFor(() => screen.getByText('Nicht gespeichert'), { timeout: 3000 })
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })

  it('refuses to edit a recipe the user may only view', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ owner: 2, viewers: [1] }))
    view()

    await waitFor(() => screen.getByText('Kein Zugriff'))
    expect(screen.queryByLabelText('Titel')).toBeNull()
  })

  it('surfaces a load failure', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockRejectedValue(new Error('weg'))
    view()

    await waitFor(() => screen.getByText('Rezept nicht gefunden'))
  })

  it('adds a section', async () => {
    params = { id: '5' }
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())
    vi.spyOn(foodly, 'updateRecipe').mockResolvedValue(recipe())
    view()

    await waitFor(() => expect(screen.getByLabelText('Titel')).toHaveValue('Pasta'))
    expect(screen.getAllByLabelText('Abschnittsname')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /abschnitt hinzufügen/i }))

    expect(screen.getAllByLabelText('Abschnittsname')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/RecipeEditor.test.tsx`
Expected: FAIL — cannot resolve `./RecipeEditor`.

- [ ] **Step 3: Write the page**

Create `src/pages/RecipeEditor.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { canEdit } from '../editor/access'
import { emptyDraft, move, newSection, toCreateRecipe, toDraft } from '../editor/draft'
import type { Draft } from '../editor/draft'
import { useAutosave } from '../editor/useAutosave'
import { BasicsCard } from '../components/editor/BasicsCard'
import { ImageManager } from '../components/editor/ImageManager'
import { SectionEditor } from '../components/editor/SectionEditor'
import { SaveStatusIndicator } from '../components/editor/SaveStatus'
import type { RecipeId } from '../api/protocol'

export function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUserId = useCurrentUserId()

  // One component, two modes. `recipeId` is null on /recipes/new until Anlegen
  // succeeds, and that null is exactly what keeps autosave switched off.
  const [recipeId, setRecipeId] = useState<RecipeId | null>(id ? Number(id) : null)
  const isNew = id === undefined

  const { status, data: loaded, error } = useRequest(() => (isNew ? Promise.resolve(null) : foodly.getRecipe(Number(id))), [id])

  const [draft, setDraft] = useState<Draft | null>(isNew ? emptyDraft() : null)
  useEffect(() => {
    if (loaded) setDraft(toDraft(loaded))
  }, [loaded])

  const editable = loaded === null ? true : canEdit(loaded, currentUserId)

  // `draft !== null` matters: autosave must stay off until the recipe has loaded,
  // otherwise the null -> loaded transition would be saved back as if it were an edit.
  const { status: saveStatus, retry } = useAutosave(
    draft,
    async (value) => {
      if (value === null || recipeId === null) return
      await foodly.updateRecipe(recipeId, toCreateRecipe(value))
    },
    { enabled: draft !== null && recipeId !== null && editable },
  )

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const create = async () => {
    if (!draft) return
    setCreating(true)
    setCreateError(null)
    try {
      const created = await foodly.createRecipe(toCreateRecipe(draft))
      setRecipeId(created.id)
      navigate(`/recipes/${created.id}/edit`, { replace: true })
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const patch = (p: Partial<Draft>) => setDraft((d) => (d === null ? d : { ...d, ...p }))

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Alert variant="destructive">
          <AlertTitle>Rezept nicht gefunden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Zur Liste</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Alert variant="destructive">
          <AlertTitle>Kein Zugriff</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>Dieses Rezept darfst du nur ansehen.</span>
            <Button asChild variant="outline" size="sm">
              <Link to={`/recipes/${id}`}>Zum Rezept</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (draft === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-28">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BasicsCard draft={draft} onChange={patch} />

        {draft.sections.map((section, i) => (
          <SectionEditor
            key={section.key}
            section={section}
            index={i}
            total={draft.sections.length}
            onChange={(next) =>
              patch({ sections: draft.sections.map((s) => (s.key === section.key ? next : s)) })
            }
            onUp={() => patch({ sections: move(draft.sections, section.key, -1) })}
            onDown={() => patch({ sections: move(draft.sections, section.key, 1) })}
            onRemove={() => patch({ sections: draft.sections.filter((s) => s.key !== section.key) })}
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          className="self-start gap-1.5"
          onClick={() => patch({ sections: [...draft.sections, newSection()] })}
        >
          <Plus className="h-4 w-4" />
          Abschnitt hinzufügen
        </Button>

        <ImageManager mainImage={draft.mainImage} images={draft.images} onChange={patch} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          {isNew ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/">Verwerfen</Link>
              </Button>
              <div className="flex items-center gap-3">
                {createError && <span className="text-destructive">{createError}</span>}
                <Button onClick={create} disabled={creating || draft.name.trim() === ''}>
                  Anlegen
                </Button>
              </div>
            </>
          ) : (
            <>
              <SaveStatusIndicator status={saveStatus} onRetry={retry} />
              <Button asChild>
                <Link to={`/recipes/${recipeId}`}>Fertig</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

Two things worth knowing while implementing:

- On `/recipes/new` there is no `id` param, so `useRequest` must not call `getRecipe`; it resolves `null` instead, which keeps `status` at `ready` and leaves the `emptyDraft()` in place.
- After *Anlegen*, `navigate('/recipes/{id}/edit', { replace: true })` matches a **different** `<Route>`, so React Router remounts `RecipeEditor` and it re-fetches the recipe it just created. That's a wasted GET but a correct one — the freshly-created recipe is exactly what the edit mode should load. Don't try to avoid it by sharing one route with an optional param; the two modes differ enough that the remount is the honest thing.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/RecipeEditor.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RecipeEditor.tsx src/pages/RecipeEditor.test.tsx
git commit -m "feat(editor): recipe editor page for new and existing recipes"
```

---

### Task 12: Routes and entry points

**Files:**
- Modify: `src/App.tsx:20-24` (routes)
- Modify: `src/components/Nav.tsx:13-17` (nav actions)
- Modify: `src/pages/RecipeDetail.tsx:87-95` (the button row)
- Test: `src/pages/RecipeDetail.edit.test.tsx` (create)

**Interfaces:**
- Consumes: `RecipeEditor` (Task 11), `canEdit` (Task 4).

Route order matters: `/recipes/new` must be declared **before** `/recipes/:id`, or `new` is swallowed as an id.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RecipeDetail.edit.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { foodly } from '../api'
import type { Recipe } from '../api/protocol'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))

let currentUserId: number | null = 1
vi.mock('../catalog/CatalogProvider', () => ({
  useTags: () => ({ byId: {}, status: 'ready' }),
  useCurrentUserId: () => currentUserId,
}))

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 5,
    owner: 1,
    editors: [],
    viewers: [],
    rating: [],
    name: 'Base',
    tags: [],
    source: null,
    time: null,
    workMinutes: null,
    overallMinutes: null,
    sizeNumber: null,
    sizeText: null,
    notes: [],
    mainImage: null,
    images: [],
    sections: [],
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  currentUserId = 1
})

describe('RecipeDetail edit entry point', () => {
  it('links the owner to the editor', async () => {
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe())

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )

    await waitFor(() => screen.getByText('Base'))
    expect(screen.getByRole('link', { name: /bearbeiten/i })).toHaveAttribute('href', '/recipes/5/edit')
  })

  it('hides the button from a viewer', async () => {
    currentUserId = 9
    vi.spyOn(foodly, 'getRecipe').mockResolvedValue(recipe({ owner: 1, viewers: [9] }))

    render(
      <TooltipProvider>
        <RecipeDetail />
      </TooltipProvider>,
    )

    await waitFor(() => screen.getByText('Base'))
    expect(screen.queryByRole('link', { name: /bearbeiten/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/RecipeDetail.edit.test.tsx`
Expected: FAIL — no "Bearbeiten" link.

- [ ] **Step 3: Add the routes**

In `src/App.tsx`, import `RecipeEditor` and replace the `<Routes>` block:

```tsx
              <Routes>
                <Route path="/" element={<RecipeList />} />
                {/* before /recipes/:id — otherwise "new" is parsed as an id */}
                <Route path="/recipes/new" element={<RecipeEditor />} />
                <Route path="/recipes/:id" element={<RecipeDetail />} />
                <Route path="/recipes/:id/edit" element={<RecipeEditor />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
```

- [ ] **Step 4: Add the Nav button**

In `src/components/Nav.tsx`, add the import and the button as the first item in the `<nav>`:

```tsx
import { Link } from 'react-router-dom'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { TimerPanel } from '../timers/TimerPanel'
import { ConnectionDot } from './ConnectionDot'

export function Nav() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/60 bg-background shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="font-display text-[1.35rem] text-foreground">
          Foodly
        </Link>
        <nav className="flex items-center gap-2 text-[0.95rem] sm:gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/recipes/new">
                  <Plus className="h-4 w-4" />
                  {/* the label collapses on narrow screens so the header never wraps */}
                  <span className="hidden sm:inline">Neues Rezept</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Neues Rezept</TooltipContent>
          </Tooltip>
          <ConnectionDot />
          <TimerPanel />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Add the Bearbeiten button**

In `src/pages/RecipeDetail.tsx`, import `Pencil` from `lucide-react`, `canEdit` from `../editor/access`, and `useCurrentUserId` from `../catalog/CatalogProvider`; add `const currentUserId = useCurrentUserId()` beside the other hooks; then extend the button row (currently lines 87-95):

```tsx
        {status === 'ready' && recipe && (
          <div className="flex items-center gap-2">
            {cloneError && <span className="text-sm text-destructive">{cloneError}</span>}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onClone} disabled={cloning}>
              <Copy className="h-4 w-4" />
              Duplizieren
            </Button>
            {canEdit(recipe, currentUserId) && (
              <Button asChild size="sm" className="gap-1.5">
                <Link to={`/recipes/${recipe.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </Link>
              </Button>
            )}
          </div>
        )}
```

The existing `RecipeDetail.clone.test.tsx` mocks `../catalog/CatalogProvider` with only `useTags`. Adding a `useCurrentUserId` call to the page will break it with "useCurrentUserId is not a function" — **add `useCurrentUserId: () => 1` to that file's mock** as part of this step.

- [ ] **Step 6: Run the whole suite**

Run: `npm test && npm run build`
Expected: PASS — every suite green, `tsc` clean.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add -A
git commit -m "feat(editor): routes and entry points for the recipe editor"
```

---

### Task 13: Verify it in the real app

Tests passing is not the same as the feature working. Drive it end-to-end.

- [ ] **Step 1: Start the mock dev server**

```bash
VITE_MOCK=1 npm run dev
```

- [ ] **Step 2: Walk the create flow**

Use the **Chrome MCP** server (per `CLAUDE.md` — not the Playwright browser agent, which would install `@playwright/test` into `package.json`).

1. Open the app; click **Neues Rezept** in the header → lands on `/recipes/new`.
2. *Anlegen* is disabled. Type a title → it enables.
3. Add an ingredient from the catalog, one as free text, two steps, a tag, a note. Add a second section.
4. Click **Anlegen** → the URL becomes `/recipes/{id}/edit`.
5. Change the title → within a second the footer reads **Speichert …**, then **Automatisch gesichert HH:MM**.
6. Click **Fertig** → the recipe page shows exactly what was entered: both sections, the free-text ingredient, the note, the tag.
7. From the recipe page, click **Bearbeiten** → the form is populated. Reorder a step with the down-arrow, go back, confirm the new order stuck.

- [ ] **Step 3: Check both themes and a narrow viewport**

Toggle dark mode; shrink to ~380px. The header must not wrap (the Nav label collapses to the icon), and the footer bar must not cover the last field — the page reserves `pb-28` for it.

- [ ] **Step 4: Commit anything the walkthrough fixed**

```bash
git add -A
git commit -m "fix(editor): issues found in the end-to-end walkthrough"
```

If the walkthrough surfaced nothing, skip the commit.

---

## Out of scope (deliberately)

- **Drag & drop reordering** — up/down buttons instead.
- **Deleting a recipe** — `DELETE /recipes/{id}` exists but has no UI entry point yet, so no `foodly.deleteRecipe`.
- **Creating tags or ingredients** — no backend endpoint. The pickers select from the catalogs only. Open question in the spec.
- **In-app "really leave?" blocker** — `useBlocker` needs `createBrowserRouter`; the app uses `BrowserRouter`. `beforeunload` covers tab-close, and a pending save is flushed on unmount.
- **Orphaned images** — an upload that never reaches a saved recipe stays on the server. No cleanup endpoint exists.
- **Rating, sharing (`editors`/`viewers`), category assignment.**
- **Mockup variants B (overlay) and C (inline).**
