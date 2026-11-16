// Picks the one colour of a category (ADR 0002); light/dark variants are derived, never edited here. Laid out like the
// mockup's category editor (`.cat-editor`): „Farbe“ with round swatches and a „+“ for a custom colour, then the preview
// „So sieht es aus“ and the similarity hint.
// onChange fires live while the native colour input is dragged: consumers that save debounce or save on submit.
import { useId } from 'react'
import { Input, RadioGroup, RadioGroupItem, cn } from '@postxl/ui-components'
import { Info, Plus } from 'lucide-react'
import { SUGGESTED_COLORS, categoryColorVars, similarCategory, type CategoryLike } from '../../lib/categoryColor'
import { COL_HEAD } from '../editor/EditorSidebar'
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

// Mockup `.sw`: a 30 px ring around a 22 px core (the radios draw it as a pseudo-element, the same classes with
// `before:`); the ring turns `--fg` for the chosen colour.
const SWATCH = 'grid size-[30px] place-items-center rounded-full border-2 border-transparent'
const SWATCH_CORE = 'size-[22px] rounded-full bg-cat-dot'
const SECTION_HEAD = cn(COL_HEAD, 'mb-2')

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
  const headId = `${id}-head`
  const hintId = `${id}-hint`
  const statusId = `${id}-status`
  const customStateId = `${id}-custom-state`
  // The value can come straight from the foreign backend: guard like parseHex does.
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : ''
  // '' and never undefined: undefined would make Radix uncontrolled and keep a stale check.
  const selected = SUGGESTED_COLORS.find((c) => c === lower) ?? ''
  const custom = selected === '' && (HEX6.test(lower) || HEX3.test(lower))
  const similar = similarCategory(lower, categories, exceptId)
  const preview = { name: name.trim() || 'Neue Kategorie', ...colorOnly(lower) }

  return (
    <div className="flex flex-col">
      <div id={headId} className={SECTION_HEAD}>
        Farbe
      </div>
      <RadioGroup
        aria-labelledby={headId}
        aria-describedby={`${hintId} ${statusId}`}
        // Radix moves linearly, not by grid row; horizontal keeps Up/Down from pretending otherwise.
        orientation="horizontal"
        value={selected}
        onValueChange={onChange}
        // The „+“ sits inside the group so it wraps with the swatches (8 + 5 on the phone, like the mockup); outside,
        // the group would take the whole row and push it onto a line of its own.
        className="flex flex-wrap gap-2"
      >
        {SUGGESTED_COLORS.map((color, i) => (
          <RadioGroupItem
            key={color}
            value={color}
            aria-label={`Farbe ${i + 1}`}
            {...categoryColorVars(colorOnly(color))}
            // The item renders only its own indicator (hidden here), so the core is a pseudo-element.
            // dark:bg-transparent beats the item's own dark:bg-input/30.
            className={cn(
              SWATCH,
              'bg-transparent shadow-none dark:bg-transparent',
              'before:size-[22px] before:rounded-full before:bg-cat-dot',
              '[&_[data-slot=radio-group-indicator]]:hidden data-[state=checked]:border-foreground',
              // Forced colours drop the box-shadow focus ring; an outline still shows there.
              'forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid',
            )}
          />
        ))}
        {/* Mockup `.sw.custom`: the invisible native input covers the swatch, so its own picker opens right here. */}
        <span
          {...(custom ? categoryColorVars(colorOnly(lower)) : {})}
          className={cn(
            SWATCH,
            'relative has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
            custom ? 'border-foreground' : 'border border-dashed border-border-strong text-muted-foreground',
          )}
        >
          {custom ? <span aria-hidden className={SWATCH_CORE} /> : <Plus aria-hidden className="size-4" />}
          <Input
            type="color"
            aria-label="Eigene Farbe"
            aria-describedby={custom ? `${customStateId} ${statusId}` : statusId}
            value={toColorInputValue(lower)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full min-h-0 cursor-pointer rounded-full border-0 p-0 opacity-0"
          />
          {/* hidden: only read through aria-describedby, never as loose text in the group. */}
          <span id={customStateId} hidden>
            gewählt
          </span>
        </span>
      </RadioGroup>
      <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
        Du wählst eine Farbe, die Varianten für Hell und Dunkel rechnet Foodly selbst.
      </p>

      <div className={cn(SECTION_HEAD, 'mt-4')}>So sieht es aus</div>
      <div data-testid="category-preview" className="flex flex-wrap items-center gap-3.5 text-sm">
        <span
          {...categoryColorVars(preview)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-cat-line bg-cat-soft py-0.5 pr-2 pl-0.5 text-xs text-cat-ink"
        >
          <CategoryMark category={preview} size="sm" />
          {preview.name}
        </span>
        <CategoryMark category={preview} size="md" />
        <span {...categoryColorVars(preview)} className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-cat-dot" />
          {preview.name}
        </span>
      </div>

      {/* Always in the accessibility tree (never display:none) so a hint appearing later is announced. */}
      <p id={statusId} role="status" className="mt-3.5 flex items-start gap-2 text-sm text-muted-foreground empty:mt-0">
        {similar && (
          <>
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>Ähnlich wie „{similar.name}“. Eine andere Farbe macht die beiden leichter unterscheidbar.</span>
          </>
        )}
      </p>
    </div>
  )
}
