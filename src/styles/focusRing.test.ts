// WCAG 1.4.11: the focus ring tokens must reach 3:1 against every theme surface, in both themes.
// Only full-alpha usages are covered; postxl's `ring-ring/50` halves the alpha (known gap, #77).
import { describe, it, expect } from 'vitest'
import themeCss from './theme.css?raw'
import { contrastRatio, oklchToHex } from '../lib/categoryColor'

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
