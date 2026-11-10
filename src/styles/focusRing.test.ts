// WCAG 1.4.11: the focus ring tokens must reach 3:1 against every theme surface, in both themes.
// postxl's `ring-ring/50` would halve the alpha; styles.css lifts it to the full token on focus (#77), pinned below.
import { describe, it, expect } from 'vitest'
import themeCss from './theme.css?raw'
import stylesCss from './styles.css?raw'
import postxlJs from '@postxl/ui-components?raw'
import { contrastRatio, oklchToHex } from '../lib/categoryColor'
import { FOCUS_RING } from '../components/focusRing'
import ratingTsx from '../components/recipe/Rating.tsx?raw'
import sidebarTsx from '../components/shell/Sidebar.tsx?raw'
import lightboxTsx from '../components/recipe/Lightbox.tsx?raw'

const RINGS = ['ring', 'sidebar-ring']
const SURFACES = ['background', 'card', 'popover', 'muted', 'accent', 'sidebar', 'sidebar-accent']

function block(selector: ':root' | '.dark'): string {
  const match = themeCss.match(new RegExp(`^${selector.replace('.', '\\.')} \\{([^}]*)\\}`, 'm'))
  if (!match) throw new Error(`no ${selector} block in theme.css`)
  return match[1]
}

// Only greyscale `oklch(L 0 0[ / a])` and `#fff` exist today; anything else must fail loudly, not be skipped.
function token(css: string, name: string): { hex: string; alpha: number } {
  // CSS applies the last declaration, so a duplicate must not let the test check a stale one.
  const values = [...css.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim())
  if (values.length !== 1) throw new Error(`--${name}: expected one declaration, found ${values.length}`)
  const value = values[0]
  if (value === '#fff') return { hex: '#ffffff', alpha: 1 }
  const oklch = value.match(/^oklch\(([\d.]+) 0 0(?: \/ ([\d.]+))?\)$/)
  if (!oklch) throw new Error(`--${name}: unsupported value ${value}`)
  return { hex: oklchToHex(Number(oklch[1]), 0, 0), alpha: oklch[2] ? Number(oklch[2]) : 1 }
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

// Browsers composite in gamma-encoded sRGB and paint 8-bit channels, so mix and round the same way.
function over(top: string, alpha: number, bottom: string): string {
  const [t, b] = [channels(top), channels(bottom)]
  return (
    '#' +
    t
      .map((v, i) =>
        Math.round(alpha * v + (1 - alpha) * b[i])
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

describe('focus ring contrast', () => {
  it('reads the real theme.css', () => {
    expect(themeCss).toContain('--ring')
  })

  describe.each([':root', '.dark'] as const)('%s', (selector) => {
    const css = block(selector)
    it.each(RINGS.flatMap((ring) => SURFACES.map((surface) => [ring, surface])))(
      '--%s on %s ≥ 3:1',
      (ring, surface) => {
        const r = token(css, ring)
        const s = token(css, surface)
        expect(s.alpha).toBe(1)
        const painted = over(r.hex, r.alpha, s.hex)
        expect(painted).toMatch(/^#[0-9a-f]{6}$/)
        expect(contrastRatio(painted, s.hex)).toBeGreaterThanOrEqual(3)
      },
    )
  })
})

// Rules at column 0 are top-level; prettier indents anything inside @layer, where it would lose to the utilities.
function topLevelRules(): { selector: string; body: string }[] {
  const css = stylesCss.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...css.matchAll(/^([^\s@}][^{]*)\{([^}]*)\}/gm)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body: body.trim(),
  }))
}

describe('postxl ring-ring/50 override', () => {
  const SELECTORS = [
    ".focus-visible\\:ring-ring\\/50:focus-visible:not([aria-invalid='true'])",
    ".ring-ring\\/50:focus-visible:not([aria-invalid='true'])",
  ]

  it('lifts ring-ring/50 to the full --ring in an unlayered rule', () => {
    const rules = topLevelRules().map(({ selector, body }) => ({
      selectors: selector.split(',').map((s) => s.trim()),
      body,
    }))
    const rule = rules.find((r) => SELECTORS.every((s) => r.selectors.includes(s)))
    expect(rule, 'top-level rule with both selectors').toBeDefined()
    expect(rule!.body).toMatch(/^--tw-ring-color:\s*var\(--ring\);?$/)
  })

  // A failure here means a postxl upgrade changed its ring-ring variants: check the override still covers them.
  it('matches the ring-ring/* variants postxl ships', () => {
    const classes = new Set(postxlJs.match(/[^\s"'`]*ring-ring\/[^\s"'`]+/g))
    expect(classes).toEqual(
      new Set([
        'focus-visible:ring-ring/50',
        'ring-ring/50', // Slider thumb
        'focus-within:ring-ring/50', // NumberInput wrapper, ring zeroed in styles.css
        'has-focus:ring-ring/50', // date picker, not used in the app
        'group-data-[focused=true]/day:ring-ring/50', // date picker, not used in the app
      ]),
    )
  })
})

describe('postxl checkbox/select-trigger ring width (#90)', () => {
  const SELECTOR =
    ":is(input[type='checkbox'], [data-slot='select-trigger']).focus-visible\\:ring-ring\\/50:focus-visible:not([aria-invalid='true'])"
  const BODY =
    '--tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor); outline: 2px solid transparent;'
  const stripped = (s: string) => s.replace(/\s+/g, '')

  it('gives both controls a 3-px ring in an unlayered rule', () => {
    // Prettier wraps the :not(...) across lines; the selector has no descendant combinator, so stripping is safe.
    const rule = topLevelRules().find((r) => stripped(r.selector) === stripped(SELECTOR))
    expect(rule, 'top-level rule with the checkbox/select-trigger selector').toBeDefined()
    expect(rule!.body.replace(/\s+/g, ' ')).toBe(BODY)
  })

  it('is the only top-level rule touching their ring shadow', () => {
    const touching = topLevelRules().filter(
      (r) => /checkbox|select-trigger/.test(r.selector) && r.body.includes('--tw-ring-shadow'),
    )
    expect(touching).toHaveLength(1)
  })

  // A failure here means a postxl upgrade changed these controls: check the rule above still matches and is still needed.
  describe('postxl still ships them without a ring width', () => {
    const hasRingWidth = (classes: string) =>
      classes.split(/\s+/).some((c) => /(^|:)ring(-\d+|-\[[^\]]+\]|-\([^)]+\))?$/.test(c))
    const checkboxBase = postxlJs.match(/const checkboxVariants = cva\("([^"]*)"/)?.[1]
    const selectTrigger = postxlJs.match(
      /const selectTriggerVariants = cva\("([^"]*)"[\s\S]*?variant: \{\s*default: "([^"]*)",\s*simple: "([^"]*)"/,
    )

    it('checkbox: a native input carrying the focus class', () => {
      expect(checkboxBase).toContain('focus-visible:ring-ring/50')
      expect(hasRingWidth(checkboxBase!)).toBe(false)
      expect(postxlJs).toMatch(/type: "checkbox"[\s\S]{0,80}checkboxVariants\(/)
      // The rule's transparent outline replaces the native one; if postxl adds outline-none, it is no longer needed.
      expect(checkboxBase).not.toMatch(/outline-(none|hidden)/)
    })

    it('select trigger: data-slot, focus class only on the default variant', () => {
      expect(postxlJs).toContain('"data-slot": "select-trigger"')
      const [, base, defaultVariant, simpleVariant] = selectTrigger!
      expect(defaultVariant).toContain('focus-visible:ring-ring/50')
      expect(simpleVariant).not.toContain('ring-ring/50')
      expect(hasRingWidth(`${base} ${defaultVariant}`)).toBe(false)
    })
  })
})

// FocusToggleGroupItem (src/components/list) overrides the ring width through className; a failure here means a
// postxl upgrade changed ToggleGroupItem: check the wrapper is still needed and still wins.
describe('postxl toggle-group item ring width (#95)', () => {
  it('toggleVariants still ships the 1-px ring in full --ring', () => {
    const base = postxlJs.match(/const toggleVariants = cva\("([^"]*)"/)?.[1]
    expect(base).toBeDefined()
    const classes = base!.split(/\s+/)
    expect(classes).toContain('focus-visible:ring-1')
    expect(classes).toContain('focus-visible:ring-ring')
  })

  it('ToggleGroupItem still merges the caller className last', () => {
    expect(postxlJs).toMatch(
      /const ToggleGroupItem = [\s\S]{0,300}?className: cn\(toggleVariants\(\{[\s\S]{0,120}?\}\), className\)/,
    )
  })
})

// Hand-written focus rings must use the shared 3-px width (#90/#95) rather than their own; the colour stays per
// place. Render checks in Rating.test, AppShell.test and Lightbox.test cover the resulting classes.
describe('hand-written focus rings (#133)', () => {
  it('FOCUS_RING has the width postxl buttonVariants ships', () => {
    const base = postxlJs.match(/const buttonVariants = cva\("([^"]*)"/)?.[1]
    expect(base?.split(/\s+/)).toContain('focus-visible:ring-[3px]')
    expect(FOCUS_RING.split(/\s+/)).toContain('focus-visible:ring-[3px]')
  })

  // Only `focus-visible:` widths: the Lightbox thumbnail's selection ring (`ring-2 ring-white`) is not a focus ring.
  it.each([
    ['Rating', ratingTsx, 'TriggerButton'],
    ['Sidebar', sidebarTsx, 'FOCUS_RING'],
    ['Lightbox', lightboxTsx, 'FOCUS_RING'],
  ])('%s takes the shared width', (_name, source, marker) => {
    expect(source).toContain(marker)
    expect(source).not.toMatch(/focus-visible:ring-[124]\b/)
  })
})
