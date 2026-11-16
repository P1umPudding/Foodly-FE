// The symbol slot of a category. Until tags can supply a symbol (B11) it shows the name's initial.
import { cn } from '@postxl/ui-components'
import { categoryColorVars, type CategoryColorInput } from '../../lib/categoryColor'
import type { UserCategory } from '../../api/protocol'

// `/none` sets the line height with the size: a separate leading-none would be dropped by tailwind-merge.
// md is the mockup's `.cat-mark` (32 px, radius 6); a 6 px radius on the 20 px sm mark would look round, so it keeps 4.
const SIZE = {
  sm: 'size-5 rounded-sm text-xs/none',
  md: 'size-8 rounded-md text-base/none',
  // The editor's symbol field next to the name (mockup `.ce-icon`, 38 px, 14 px initial).
  field: 'size-[38px] rounded-md text-base/none',
  xl: 'size-10 rounded-sm text-lg/none',
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
  className,
}: {
  category: Pick<UserCategory, 'name'> & CategoryColorInput
  size: keyof typeof SIZE
  className?: string
}) {
  return (
    <span
      aria-hidden
      {...categoryColorVars(category)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-cat-soft font-bold text-cat-ink',
        SIZE[size],
        className,
      )}
    >
      {categoryInitial(category.name)}
    </span>
  )
}
