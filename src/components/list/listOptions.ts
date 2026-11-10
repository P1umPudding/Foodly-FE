// Labels and icons of the list's view choices, shared by the desktop toggles and the phone sheet so both
// use the same words.
import { LayoutGrid, LayoutList, List, ListTree, Menu, type LucideIcon } from 'lucide-react'
import type { DetailView } from '../../list/state'

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
