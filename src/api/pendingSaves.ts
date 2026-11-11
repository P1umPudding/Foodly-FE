// Saves still in flight after the editor unmounted, per recipe. Reads of that
// recipe (or any list) wait for them, so a GET can't overtake the PUT and show
// the old state. The app uses <BrowserRouter> without a data router, so there is
// no useBlocker to hold navigation instead. Readers must start their requests in
// effects (not during render): the editor registers in its unmount cleanup, which
// runs before the next page's effects.

import type { RecipeId } from './protocol'

// A PUT that never settles (REST has no request timeout) must not keep pages loading forever.
// Applied per registration, so a hung save drops out instead of delaying every later read
// again. Trade-off: if it lands after that, it can overwrite an edit made meanwhile.
const MAX_WAIT_MS = 10_000

const pending = new Map<RecipeId, Promise<void>>()

const noop = () => {}

// A failed save never fails a read: the read then shows the server state, the
// editor already reported the failure (toast).
export function trackPendingSave(id: RecipeId, done: Promise<unknown>): void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, MAX_WAIT_MS)
  })
  const settled = Promise.race([done.then(noop, noop), cap]).finally(() => clearTimeout(timer))
  const previous = pending.get(id)
  const entry = previous ? Promise.all([previous, settled]).then(noop) : settled
  pending.set(id, entry)
  // Never rejects: save failures are swallowed into `settled`.
  void entry.then(() => {
    if (pending.get(id) === entry) pending.delete(id)
  })
}

export function pendingSaveFor(id: RecipeId): Promise<void> | null {
  return pending.get(id) ?? null
}

export function allPendingSaves(): Promise<void> | null {
  if (pending.size === 0) return null
  return Promise.all(pending.values()).then(noop)
}

// With nothing pending the read starts synchronously, so the common path keeps
// its exact timing.
export function afterSave<T>(wait: Promise<void> | null, read: () => Promise<T>): Promise<T> {
  return wait ? wait.then(read) : read()
}

// Tests only: the registry is module state and would leak between cases.
export function resetPendingSaves(): void {
  pending.clear()
}
