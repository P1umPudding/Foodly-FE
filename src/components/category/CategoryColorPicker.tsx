// Picks the one colour of a category (ADR 0002); light/dark variants are derived, never edited here.
import { useId } from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@postxl/ui-components'
import { SUGGESTED_COLORS, categoryColorVars, similarCategory, type CategoryLike } from '../../lib/categoryColor'
import { CategoryMark } from './CategoryMark'

const HEX6 = /^#[0-9a-f]{6}$/
const HEX3 = /^#[0-9a-f]{3}$/

// <input type="color"> only accepts #rrggbb; anything else would silently show black.
function toColorInputValue(value: string): string {
  const v = value.trim().toLowerCase()
  if (HEX6.test(v)) return v
  if (HEX3.test(v)) return '#' + [...v.slice(1)].map((d) => d + d).join('')
  return '#000000'
}

const colorOnly = (color: string) => ({ color, colorLight: null, colorDark: null })

export function CategoryColorPicker({
  value,
  onChange,
  name,
  categories,
  exceptId,
}: {
  value: string
  onChange: (color: string) => void
  name: string
  categories: readonly CategoryLike[]
  exceptId?: CategoryLike['id']
}) {
  const customId = useId()
  const lower = value.trim().toLowerCase()
  // '' and never undefined: undefined would make Radix uncontrolled and keep a stale check.
  const selected = SUGGESTED_COLORS.find((c) => c === lower) ?? ''
  const similar = similarCategory(value, categories, exceptId)
  const preview = { name: name.trim() || 'Neue Kategorie', ...colorOnly(value) }

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Vorschlagsfarben"
        value={selected}
        onValueChange={onChange}
        className="grid-cols-6 gap-2 justify-self-start"
      >
        {SUGGESTED_COLORS.map((color, i) => (
          <RadioGroupItem
            key={color}
            value={color}
            aria-label={`Farbe ${i + 1}`}
            {...categoryColorVars(colorOnly(color))}
            // dark:bg-cat-dot beats the item's own dark:bg-input/30. The ring marks the choice, so the
            // indicator dot is hidden; it stays visible under the focus ring.
            className={
              'size-10 rounded-md border-0 bg-cat-dot shadow-none dark:bg-cat-dot ' +
              '[&_[data-slot=radio-group-indicator]]:hidden data-[state=checked]:ring-2 ' +
              'data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-2 ' +
              'data-[state=checked]:ring-offset-background focus-visible:data-[state=checked]:ring-foreground'
            }
          />
        ))}
      </RadioGroup>

      <div className="flex items-center gap-2">
        <Input
          id={customId}
          type="color"
          value={toColorInputValue(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 p-1"
        />
        <Label htmlFor={customId}>Eigene Farbe</Label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span
          {...categoryColorVars(preview)}
          className="inline-flex items-center gap-1.5 rounded-full border border-cat-line bg-cat-soft py-0.5 pr-2.5 pl-0.5 text-cat-ink"
        >
          <CategoryMark category={preview} size="sm" />
          {preview.name}
        </span>
        <span {...categoryColorVars(preview)} className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-cat-dot" />
          {preview.name}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Du wählst eine Farbe, die Varianten für Hell und Dunkel rechnet Foodly selbst.
      </p>
      {/* Always rendered so a hint appearing after a colour change is announced. */}
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground empty:hidden">
        {similar && `Ähnlich wie „${similar.name}“. Eine andere Farbe macht die beiden leichter unterscheidbar.`}
      </p>
    </div>
  )
}
