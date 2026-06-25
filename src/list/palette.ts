// Category colours come from data (`UserCategory.color`, a hex string), but the
// Tailwind v4 scanner only keeps *literal* class strings — a dynamic
// `bg-[${hex}]` is never generated. So we map each known palette hex to a fixed
// set of literal classes (approach A). Unknown colours fall back to neutral.
// When the backend ever supplies arbitrary colours, switch to a CSS-variable
// bridge (theme.css → styles.css); see the historical note in git for SWATCH.

export type ColorClasses = {
  border: string // outline (inactive toggle, category accent) — softened with /60 alpha
  bgActive: string // filled tint (active toggle)
  text: string // heading / label tint
  line: string // left rule colour (used with border-l-2)
  dot: string // solid swatch
}

const NEUTRAL: ColorClasses = {
  border: 'border-border',
  bgActive: 'bg-muted',
  text: 'text-muted-foreground',
  line: 'border-border',
  dot: 'bg-muted',
}

const PALETTE: Record<string, ColorClasses> = {
  '#e11d48': {
    border: 'border-[#e11d48]/60',
    bgActive: 'bg-[#e11d48]/15',
    text: 'text-[#e11d48]',
    line: 'border-[#e11d48]',
    dot: 'bg-[#e11d48]',
  },
  '#0ea5e9': {
    border: 'border-[#0ea5e9]/60',
    bgActive: 'bg-[#0ea5e9]/15',
    text: 'text-[#0ea5e9]',
    line: 'border-[#0ea5e9]',
    dot: 'bg-[#0ea5e9]',
  },
  '#f59e0b': {
    border: 'border-[#f59e0b]/60',
    bgActive: 'bg-[#f59e0b]/15',
    text: 'text-[#f59e0b]',
    line: 'border-[#f59e0b]',
    dot: 'bg-[#f59e0b]',
  },
  '#10b981': {
    border: 'border-[#10b981]/60',
    bgActive: 'bg-[#10b981]/15',
    text: 'text-[#10b981]',
    line: 'border-[#10b981]',
    dot: 'bg-[#10b981]',
  },
}

export function colorClasses(hex: string): ColorClasses {
  return PALETTE[hex] ?? NEUTRAL
}
