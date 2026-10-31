# Plan: #36 Alpha: Rezept löschen

Source: `.git/agent-work/spec.md` (AC1–6, assumptions A1–A9).

## Step 1: API (AC1)
- `src/api/rest.ts`: in `request()`, replace the existing `if (res.status === 204)` line (after the `!res.ok` throw, so a failing DELETE still reads its error body) with `if (res.status === 204 || method === 'DELETE') return undefined as T` — a DELETE body is never parsed, so a 200 with an empty body cannot turn a successful delete into an error (A6). Short why-comment. (No `res.text()` change: existing fetch fakes only provide `json()`.)
- `src/api/index.ts`: `deleteRecipe: (id: RecipeId): Promise<void> => USE_MOCKS ? socket.request<void>('recipes.delete', { id }) : rest.del(`/recipes/${id}`)`, placed next to `copyRecipe`.
- `src/mocks/index.ts`: `case 'recipes.delete'`: find the index, throw `recipe ${id} not found` if missing, splice it out of `mockData.recipes`, remove the id from every `category.recipes` (filter in place) (A3). Returns `undefined`.
- Tests:
  - `src/api/rest.write.test.ts`: extend the existing "del resolves undefined on 204" test with the bearer assertion; add: a DELETE answered 200 with an empty body (fake without `json()`) resolves `undefined`; a DELETE error body throws its message.
  - `src/mocks/write.test.ts`: create a recipe, add its id to a category, `recipes.delete` → `recipes.get` throws, and the id is gone from the category; deleting an unknown id throws. Uses a freshly created recipe, so no shared fixture is mutated (A9/test isolation).
- Commit: `API: deleteRecipe (REST DELETE /recipes/{id}, Mock-Handler)`

## Step 2: Owner check (AC2 basis)
- `src/editor/access.ts`: `export function isOwner(recipe, userId)` → `userId !== null && recipe.owner === userId` (A1).
- `src/editor/access.test.ts`: owner true, editor false, viewer false, `null` false.
- Commit: `access: isOwner`

## Step 3: Delete action + dialog (AC2–5)
- New `src/components/recipe/DeleteRecipeButton.tsx` (`{ recipeId: RecipeId; name: string; onDeleted: () => void }`):
  - postxl `AlertDialog` controlled via `open` state. Trigger: `<Tooltip><TooltipTrigger asChild><AlertDialogTrigger aria-label="Löschen" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 max-[760px]:size-10')}>` with `Trash2` icon and label `<span className="max-[760px]:hidden">Löschen</span>`; `TooltipContent` "Rezept löschen" (A7). No inner postxl `Button`: it is not forwardRef, so Slot would drop the ref (no tooltip, no focus return) — precedent and why-comment as in `ProfileMenu.tsx`. Below the shell's phone breakpoint (`SHELL_DESKTOP_QUERY`, <761px) it is icon-only at 40×40 (design.md §7).
  - `AlertDialogTitle` "Rezept löschen?", `AlertDialogDescription` names the recipe: „<name>“ wird endgültig gelöscht.
  - Footer (`AlertDialogFooter`): `AlertDialogCancel` "Abbrechen" (`disabled={pending}`) and a plain postxl `<Button variant="destructive" onClick={onConfirm} aria-disabled={pending}>` (aria-disabled keeps focus in the dialog; a ref guards double clicks) with the postxl `Spinner` while pending (postxl `Loader` is a full-area overlay, not an inline button spinner) and the label "Löschen"` — not `AlertDialogAction`, which auto-closes and has no variant prop; the dialog must stay open on error.
  - `onConfirm`: `setPending(true)`, `setError(null)`, `await foodly.deleteRecipe(recipe.id)` → `onDeleted()`; on error `setError(message)`, `setPending(false)`.
  - While pending: Cancel `disabled`, confirm `aria-disabled` (keeps focus); `onOpenChange` ignores close requests (Esc; Radix AlertDialog already ignores overlay clicks) (A8). Opening resets `error` (it cannot reopen while pending).
  - Error: `<p role="alert" className="text-sm text-destructive">` inside the content. Tokens only.
- `src/pages/RecipeDetail.tsx`: in the header action group, first (order: `{cloneError}`, Löschen, Duplizieren, Bearbeiten), render `{isOwner(recipe, currentUserId) && <DeleteRecipeButton recipeId={recipe.id} name={plainName} onDeleted={() => navigate('/recipes', { replace: true })} />}` (A2). Only in the `status === 'ready'` branch, where the group already lives.
- Test `src/pages/RecipeDetail.delete.test.tsx` (setup like the clone test: mocked router + catalog, render inside `TooltipProvider`, spy `foodly.getRecipe`/`deleteRecipe`):
  - owner (owner 1, me 1) sees "Löschen"; editor (owner 2, editors [1]) and viewer (owner 2) do not (AC2).
  - open → dialog shows the recipe name → "Abbrechen" → dialog gone, `deleteRecipe` not called, no navigate (AC3).
  - AC4 with the mock handler: seed a recipe via `mockRequest('recipes.create')`, `getRecipe` resolves it, `deleteRecipe` spied with `mockImplementation((id) => mockRequest('recipes.delete', { id }) as Promise<void>)`; open → confirm → `navigate('/recipes', { replace: true })` and the id is gone from `mockData.recipes`. (`getRecipe` returns the seeded recipe, so the fixed `useParams` id '5' is fine; the 250ms mock delay fits `waitFor`'s default, no fake timers.)
  - Pending: `deleteRecipe` returns a controlled promise; confirm and cancel are disabled while it is open; resolve it before the test ends.
  - `deleteRecipe` rejects `Error('Kaputt')` → dialog still open, shows "Kaputt", no navigate (AC5).
  - Queries scoped with `within(screen.getByRole('alertdialog'))` since trigger and confirm share the label; "dialog gone" via `waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())`.
- Placement reason: the destructive action is not next to the primary one.
- Commit: `Detail: Rezept löschen (nur Owner, Bestätigungsdialog)`

## Step 4: Docs
- Copy the final plan to `docs/superpowers/plans/2026-10-31-alpha-recipe-delete.md` (precedent: #45 committed only its plan). Commit: `docs: Plan Rezept löschen`

## Step 5: Verify (AC6)
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`.
- Visual check (light/dark, 360px and ~700px width; if the header row overflows add `flex-wrap justify-end` to the action group) via the dev server in mock mode, if a browser is available; otherwise note it as not done.
- Commit formatting changes if any.

All commits: no `Co-Authored-By` or other AI trailer (CLAUDE.md).

## Out of scope / PR notes
- Sidebar category counts stay stale until reload (A4).
- design.md §5 suggests a toast for failed actions; AC5 asks for the error inside the open dialog, followed as specified.
- On phones the 40px Löschen icon is taller than the existing 32px buttons (existing buttons already miss §7; not changed here).
- Stub rating in localStorage for the deleted id is not cleaned (A9).
- No undo, no delete from the list (non-goals).

## Review log
- Review pass 1 (fresh subagent): 0 blocker, 2 major, 6 minor, 4 nit. Applied: DELETE short-circuit instead of text parsing (major 1), plain destructive Button instead of AlertDialogAction (major 2), AC4 test runs through the mock handler (3), trigger nesting + TooltipProvider (4), Radix test notes (5), Esc-only guard (6), 40px icon button below sm (7), plan committed to docs/superpowers/plans (8), own commit for isOwner (9), no-trailer note (10), Löschen placed first (11), reset pending on open (12).
- Review pass 2 (fresh subagent): 0 blocker, 1 major, 3 minor, 5 nit. Applied: trigger is AlertDialogTrigger styled via buttonVariants (postxl Button is not forwardRef; ProfileMenu precedent) (major), placement contradiction fixed (Löschen first), DELETE short-circuit placement + extend existing del test, phone breakpoint aligned to the shell (<761px) and overflow check at 360/700px, dropped `max-sm:px-0`, fixed useParams id, Loader in confirm, toast deviation + taller icon noted for the PR.
