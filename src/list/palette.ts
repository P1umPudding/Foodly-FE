// Category colours come from data (`UserCategory.color`, a hex string), but the
// Tailwind v4 scanner only keeps *literal* class strings — a dynamic
// `bg-[${hex}]` is never generated. So we map each known palette hex to a fixed
// set of literal classes (approach A). Unknown colours fall back to neutral.
// When the backend ever supplies arbitrary colours, switch to a CSS-variable
// bridge (theme.css → styles.css); see the historical note in git for SWATCH.

export type ColorClasses = {
  border: string // outline (inactive toggle, category accent) — softened with /60 alpha
  bgActive: string // filled tint (active toggle)
  bgActiveHover: string // active toggle, hovered — keeps the colour (stronger) so a selected button stays visibly selected AND gives feedback
  bgHover: string // inactive toggle, hovered — NEUTRAL grey (not the category hue) so "hovered-inactive" never reads like "active"
  text: string // heading / label tint
  textHover: string // keep the heading tint on hover (else the ghost Button greys it)
  line: string // left rule colour (used with border-l-2)
  dot: string // solid swatch
}

// Hover backgrounds carry a dark: twin so they outrank the ghost Button's own
// dark:hover:bg-accent rule (same-prefix specificity) in dark mode.
const NEUTRAL: ColorClasses = {
  border: 'border-border',
  bgActive: 'bg-muted',
  bgActiveHover: 'hover:bg-muted dark:hover:bg-muted',
  bgHover: 'hover:bg-muted dark:hover:bg-muted',
  text: 'text-muted-foreground',
  textHover: 'hover:text-muted-foreground',
  line: 'border-border',
  dot: 'bg-muted',
}

const PALETTE: Record<string, ColorClasses> = {
  '#e11d48': {
    border: 'border-[#e11d48]/60',
    bgActive: 'bg-[#e11d48]/15',
    bgActiveHover: 'hover:bg-[#e11d48]/25 dark:hover:bg-[#e11d48]/25',
    bgHover: 'hover:bg-muted dark:hover:bg-muted',
    // text darkened in light mode for legible header contrast; vibrant on dark.
    text: 'text-[#be123c] dark:text-[#fb7185]',
    textHover: 'hover:text-[#be123c] dark:hover:text-[#fb7185]',
    line: 'border-[#e11d48]',
    dot: 'bg-[#e11d48]',
  },
  '#0ea5e9': {
    border: 'border-[#0ea5e9]/60',
    bgActive: 'bg-[#0ea5e9]/15',
    bgActiveHover: 'hover:bg-[#0ea5e9]/25 dark:hover:bg-[#0ea5e9]/25',
    bgHover: 'hover:bg-muted dark:hover:bg-muted',
    text: 'text-[#0369a1] dark:text-[#38bdf8]',
    textHover: 'hover:text-[#0369a1] dark:hover:text-[#38bdf8]',
    line: 'border-[#0ea5e9]',
    dot: 'bg-[#0ea5e9]',
  },
  '#f59e0b': {
    border: 'border-[#f59e0b]/60',
    bgActive: 'bg-[#f59e0b]/15',
    bgActiveHover: 'hover:bg-[#f59e0b]/25 dark:hover:bg-[#f59e0b]/25',
    bgHover: 'hover:bg-muted dark:hover:bg-muted',
    text: 'text-[#b45309] dark:text-[#fbbf24]',
    textHover: 'hover:text-[#b45309] dark:hover:text-[#fbbf24]',
    line: 'border-[#f59e0b]',
    dot: 'bg-[#f59e0b]',
  },
  '#10b981': {
    border: 'border-[#10b981]/60',
    bgActive: 'bg-[#10b981]/15',
    bgActiveHover: 'hover:bg-[#10b981]/25 dark:hover:bg-[#10b981]/25',
    bgHover: 'hover:bg-muted dark:hover:bg-muted',
    text: 'text-[#047857] dark:text-[#34d399]',
    textHover: 'hover:text-[#047857] dark:hover:text-[#34d399]',
    line: 'border-[#10b981]',
    dot: 'bg-[#10b981]',
  },
}

export function colorClasses(hex: string): ColorClasses {
  return PALETTE[hex] ?? NEUTRAL
}
