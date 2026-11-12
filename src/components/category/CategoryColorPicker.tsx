// Picks the one colour of a category (ADR 0002); light/dark variants are derived, never edited here.
// onChange fires live while the native colour input is dragged: consumers that save debounce or save on submit.
import { useId } from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@postxl/ui-components'
import { SUGGESTED_COLORS, categoryColorVars, similarCategory, type CategoryLike } from '../../lib/categoryColor'
import { CategoryMark } from './CategoryMark'

const HEX6 = /^#[0-9a-f]{6}$/
const HEX3 = /^#[0-9a-f]{3}$/

// <input type="color"> only takes lowercase #rrggbb, so #ABC must be expanded to show as itself.
function toColorInputValue(v: string): string {
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
  const id = useId()
  const customId = `${id}-custom`
  const hintId = `${id}-hint`
  const statusId = `${id}-status`
  // The value can come straight from the foreign backend: guard like parseHex does.
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : ''
  // '' and never undefined: undefined would make Radix uncontrolled and keep a stale check.
  const selected = SUGGESTED_COLORS.find((c) => c === lower) ?? ''
  const similar = similarCategory(lower, categories, exceptId)
  const preview = { name: name.trim() || 'Neue Kategorie', ...colorOnly(lower) }

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Vorschlagsfarben"
        aria-describedby={`${hintId} ${statusId}`}
        // Radix moves linearly, not by grid row; horizontal keeps Up/Down from pretending otherwise.
        orientation="horizontal"
        value={selected}
        onValueChange={onChange}
        className="grid-cols-6 gap-2 self-start"
      >
        {SUGGESTED_COLORS.map((color, i) => (
          <RadioGroupItem
            key={color}
            value={color}
            aria-label={`Farbe ${i + 1}`}
            {...categoryColorVars(colorOnly(color))}
            // dark:bg-cat-dot beats the item's own dark:bg-input/30. An outline marks the choice (indicator
            // dot hidden), so the item's own focus ring stays free to show keyboard focus on top of it.
            className={
              'size-10 rounded-md border-0 bg-cat-dot shadow-none dark:bg-cat-dot ' +
              '[&_[data-slot=radio-group-indicator]]:hidden data-[state=checked]:outline-2 ' +
              'data-[state=checked]:outline-offset-2 data-[state=checked]:outline-solid data-[state=checked]:outline-foreground'
            }
          />
        ))}
      </RadioGroup>

      <div className="flex items-center gap-2">
        <Input
          id={customId}
          type="color"
          value={toColorInputValue(lower)}
          aria-describedby={`${hintId} ${statusId}`}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 p-1"
        />
        <Label htmlFor={customId}>Eigene Farbe</Label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span
          {...categoryColorVars(preview)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-cat-line bg-cat-soft py-0.5 pr-2 pl-0.5 text-xs text-cat-ink"
        >
          <CategoryMark category={preview} size="sm" />
          {preview.name}
        </span>
        <span {...categoryColorVars(preview)} className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-cat-dot" />
          {preview.name}
        </span>
      </div>

      <div className="flex flex-col text-xs text-muted-foreground">
        <p id={hintId}>Du wählst eine Farbe, die Varianten für Hell und Dunkel rechnet Foodly selbst.</p>
        {/* Always in the accessibility tree (never display:none) so a hint appearing later is announced. */}
        <p id={statusId} role="status" className="mt-1 empty:mt-0">
          {similar && `Ähnlich wie „${similar.name}“. Eine andere Farbe macht die beiden leichter unterscheidbar.`}
        </p>
      </div>
    </div>
  )
}
