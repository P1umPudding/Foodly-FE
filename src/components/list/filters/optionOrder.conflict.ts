import { useState } from 'react'

// The options' order as it was when the panel opened (the content unmounts on close, so every open takes a fresh
// one). Toggling an option refetches the list and its frequencies; without this the rows would reshuffle under the
// pointer. Options that weren't there at open time follow in their current order.
export function useOrderAtOpen<T, K>(items: T[], keyOf: (item: T) => K): T[] {
  const [rank] = useState(() => new Map(items.map((item, i) => [keyOf(item), i])))
  const at = (item: T, i: number) => rank.get(keyOf(item)) ?? rank.size + i
  return items
    .map((item, i) => ({ item, at: at(item, i) }))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.item)
}

// Selected first, then the rest up to `cap` rows in total (mockup app.js: [...sel, ...rest].slice(0, cap)) —
// except that a selection is never cut off. Selected rows keep the option order, not the order they were picked.
export function selectedThenCapped<T>(items: T[], isSelected: (item: T) => boolean, cap: number | null): T[] {
  const picked = items.filter(isSelected)
  const rest = items.filter((i) => !isSelected(i))
  const shownRest = cap === null ? rest : rest.slice(0, Math.max(0, cap - picked.length))
  return [...picked, ...shownRest]
}