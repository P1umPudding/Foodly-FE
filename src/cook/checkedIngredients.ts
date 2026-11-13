// Ticked ingredients and the check-off switch, shared by the detail page and the cook mode of the same recipe.
// Memory only, by design (no Web Storage): a reload clears it, and so does opening another recipe.
import { useCallback, useSyncExternalStore } from 'react'
import type { RecipeIngredientId } from '../api/protocol'

type State = { recipeId: number | null; checkable: boolean; ids: ReadonlySet<RecipeIngredientId> }

const EMPTY: State = Object.freeze({ recipeId: null, checkable: false, ids: new Set<RecipeIngredientId>() })

let state: State = EMPTY
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The state for `recipeId`, starting fresh when the store still holds another recipe. A write can come before
// the page's openRecipe effect has run, so it must never mix ticks of two recipes.
function stateFor(recipeId: number): State {
  return state.recipeId === recipeId ? state : { ...EMPTY, recipeId }
}

export function openRecipe(recipeId: number) {
  if (state.recipeId !== recipeId) set({ ...EMPTY, recipeId })
}

export function resetCheckedIngredients() {
  set(EMPTY)
}

export function useCheckedIngredients(recipeId: number) {
  // Another recipe's state reads as EMPTY, a stable snapshot, so its ticks never flash before openRecipe runs.
  const snapshot = useSyncExternalStore(subscribe, () => (state.recipeId === recipeId ? state : EMPTY))

  const setCheckable = useCallback((checkable: boolean) => set({ ...stateFor(recipeId), checkable }), [recipeId])
  const toggle = useCallback(
    (id: RecipeIngredientId) => {
      const current = stateFor(recipeId)
      const ids = new Set(current.ids)
      if (ids.has(id)) ids.delete(id)
      else ids.add(id)
      set({ ...current, ids })
    },
    [recipeId],
  )

  return { checkable: snapshot.checkable, checkedIds: snapshot.ids, setCheckable, toggle }
}
