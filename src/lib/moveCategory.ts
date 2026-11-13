// One step up (-1) or down (1) in an ordered id list. At the edge, or for an id the list doesn't know, the order stays.
export function moveCategory<T>(ids: readonly T[], id: T, delta: -1 | 1): T[] {
  const from = ids.indexOf(id)
  const to = from + delta
  const next = [...ids]
  if (from < 0 || to < 0 || to >= ids.length) return next
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}
