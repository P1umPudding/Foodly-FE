// Labels and icons of the list's sort and view choices, shared by the desktop controls and the phone sheet so
// both use the same words.
import {
  ArrowDownWideNarrow,
  ArrowDownZA,
  ArrowUpAZ,
  ArrowUpNarrowWide,
  Clock,
  LayoutGrid,
  LayoutList,
  List,
  ListTree,
  Menu,
  Star,
  Timer,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { DetailView, SortDir, SortKey } from '../../list/state'

export type Criterion = { key: SortKey; label: string; Icon: LucideIcon }
export const SORT_CRITERIA: Criterion[] = [
  { key: 'name', label: 'Name', Icon: Type },
  { key: 'work', label: 'Arbeitszeit', Icon: Clock },
  { key: 'overall', label: 'Gesamtzeit', Icon: Timer },
  { key: 'rating', label: 'Bewertung', Icon: Star },
]

export const SORT_DIRS: SortDir[] = ['asc', 'desc']

export function criterionFor(sortKey: SortKey): Criterion {
  return SORT_CRITERIA.find((c) => c.key === sortKey) ?? SORT_CRITERIA[0]
}

// Direction glyph: the ARROW flips up (ascending) / down (descending). For name the
// letters also swap (A→Z up vs Z→A down); for the numeric keys the bars go narrow→wide.
export function dirIcon(sortKey: SortKey, dir: SortDir): LucideIcon {
  if (sortKey === 'name') return dir === 'asc' ? ArrowUpAZ : ArrowDownZA
  return dir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
}

// Plain-language meaning of a direction, per criterion ("asc" reads differently for a rating than for a time).
export function dirLabel(sortKey: SortKey, dir: SortDir): string {
  if (sortKey === 'name') return dir === 'asc' ? 'A → Z' : 'Z → A'
  if (sortKey === 'rating') return dir === 'asc' ? 'Schlechteste zuerst' : 'Beste zuerst'
  return dir === 'asc' ? 'Kürzeste zuerst' : 'Längste zuerst'
}

export type ViewOption<T extends string> = { value: T; label: string; Icon: LucideIcon }

export type Layout = 'grouped' | 'flat'

export const DETAIL_OPTIONS: ViewOption<DetailView>[] = [
  { value: 'compact', label: 'Kompakt', Icon: Menu },
  { value: 'detailed', label: 'Detailliert', Icon: LayoutList },
  { value: 'tiles', label: 'Kacheln', Icon: LayoutGrid },
]

export const LAYOUT_OPTIONS: ViewOption<Layout>[] = [
  { value: 'grouped', label: 'Nach Kategorie', Icon: ListTree },
  { value: 'flat', label: 'Einfache Liste', Icon: List },
]
