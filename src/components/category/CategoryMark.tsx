// The symbol slot of a category. Until tags can supply a symbol (B11) it shows the name's initial.
import { cn } from '@postxl/ui-components'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import type { UserCategory } from '../../api/protocol'

// `/none` sets the line height with the size: a separate leading-none would be dropped by tailwind-merge.
const SIZE = {
  sm: 'size-5 text-xs/none',
  md: 'size-7 text-sm/none',
  xl: 'size-10 text-lg/none',
} as const

let segmenter: Intl.Segmenter | undefined

function firstGrapheme(text: string): string {
  if (typeof Intl.Segmenter !== 'function') return Array.from(text)[0] ?? ''
  segmenter ??= new Intl.Segmenter('de', { granularity: 'grapheme' })
  const [first] = segmenter.segment(text)
  return first?.segment ?? ''
}

export function categoryInitial(name: string): string {
  const initial = firstGrapheme(name.trim())
  const upper = initial.toLocaleUpperCase('de')
  // "ß" uppercases to "SS": keep the slot to one character.
  return firstGrapheme(upper) === upper ? upper : initial
}

export function CategoryMark({
  category,
  size,
}: {
  category: Pick<UserCategory, 'name'> & CategoryColorInput
  size: keyof typeof SIZE
}) {
  return (
    <span
      aria-hidden
      {...categoryColorVars(category)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm bg-cat-soft font-medium text-cat-ink',
        SIZE[size],
      )}
    >
      {categoryInitial(category.name)}
    </span>
  )
}
