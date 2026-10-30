import { describe, it, expect } from 'vitest'
import {
  SUGGESTED_COLORS,
  categoryColorVars,
  categoryColors,
  contrastRatio,
  hexToOklch,
  hueDistance,
  oklchToHex,
  type CategoryRole,
} from './categoryColor'

const cat = (color: string, colorLight: string | null = null, colorDark: string | null = null) => ({
  color,
  colorLight,
  colorDark,
})

// --background from theme.css: light oklch(0.985 0 0), dark oklch(0.17 0 0).
const BACKGROUND = { light: oklchToHex(0.985, 0, 0), dark: oklchToHex(0.17, 0, 0) }

const MAX_C = {
  light: { dot: 0.17, soft: 0.035, ink: 0.13, line: 0.08 },
  dark: { dot: 0.15, soft: 0.045, ink: 0.1, line: 0.09 },
}
const ROLE_L = {
  light: { dot: 0.62, soft: 0.955, ink: 0.46, line: 0.84 },
  dark: { dot: 0.7, soft: 0.27, ink: 0.86, line: 0.42 },
}
const ROLES: CategoryRole[] = ['dot', 'soft', 'ink', 'line']
const THEMES = ['light', 'dark'] as const

const TEST_COLORS = {
  navy: '#000080',
  paleYellow: '#ffffcc',
  black: '#000',
  white: '#ffffff',
  neonGreen: '#39ff14',
  grey: '#808080',
  red: '#ff0000',
  blue: '#0000ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ff8800',
  rose: '#e11d48',
  sky: '#0ea5e9',
  emerald: '#10b981',
}

const neutral = (theme: 'light' | 'dark') =>
  Object.fromEntries(ROLES.map((r) => [r, oklchToHex(ROLE_L[theme][r], 0, 0)]))

describe('colour math reference values', () => {
  it('converts known colours to OKLCH', () => {
    const red = hexToOklch('#ff0000')!
    expect(red.l).toBeCloseTo(0.628, 3)
    expect(red.c).toBeCloseTo(0.258, 3)
    expect(red.h).toBeCloseTo(29.2, 1)
    const white = hexToOklch('#ffffff')!
    expect(white.l).toBeCloseTo(1, 4)
    expect(white.c).toBeCloseTo(0, 4)
  })

  it('converts OKLCH back to hex and computes WCAG contrast', () => {
    expect(BACKGROUND.light).toBe('#fafafa')
    expect(BACKGROUND.dark).toBe('#0f0f0f')
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2)
  })
})

describe('categoryColors', () => {
  it.each(Object.entries(TEST_COLORS))('%s is readable in both themes', (_, hex) => {
    const colors = categoryColors(cat(hex))
    for (const theme of THEMES) {
      const r = colors[theme]
      expect(contrastRatio(r.ink, r.soft)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(r.dot, BACKGROUND[theme])).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(Object.entries(TEST_COLORS))('%s: fixed L, capped C, sRGB hex', (_, hex) => {
    const colors = categoryColors(cat(hex))
    for (const theme of THEMES) {
      for (const role of ROLES) {
        const value = colors[theme][role]
        expect(value).toMatch(/^#[0-9a-f]{6}$/)
        const lch = hexToOklch(value)!
        expect(lch.l).toBeCloseTo(ROLE_L[theme][role], 2)
        expect(lch.c).toBeLessThanOrEqual(MAX_C[theme][role] + 0.005)
      }
    }
  })

  it('keeps the hue for chromatic colours (dot and ink)', () => {
    for (const hex of [TEST_COLORS.red, TEST_COLORS.sky, TEST_COLORS.emerald, TEST_COLORS.orange]) {
      const colors = categoryColors(cat(hex))
      for (const theme of THEMES) {
        for (const role of ['dot', 'ink'] as const) {
          expect(hueDistance(colors[theme][role], hex)).toBeLessThan(2)
        }
      }
    }
  })

  it('keeps the chroma of a low-chroma input below the cap', () => {
    const input = hexToOklch(TEST_COLORS.paleYellow)!.c
    const colors = categoryColors(cat(TEST_COLORS.paleYellow))
    expect(hexToOklch(colors.light.dot)!.c).toBeCloseTo(input, 2)
    expect(hexToOklch(colors.dark.dot)!.c).toBeCloseTo(input, 2)
  })

  it.each(['#000', '#000000', '#ffffff', '#808080', '#78808a'])('renders %s neutral', (hex) => {
    const colors = categoryColors(cat(hex))
    expect(colors.light).toEqual(neutral('light'))
    expect(colors.dark).toEqual(neutral('dark'))
  })

  it('treats a colour just above the chroma threshold as chromatic', () => {
    expect(hexToOklch('#708090')!.c).toBeGreaterThan(0.02)
    expect(categoryColors(cat('#708090')).light.dot).not.toBe(neutral('light').dot)
  })

  it.each(['', 'red', '#12', '#ggg', '#1234567'])('renders invalid input %j neutral', (hex) => {
    expect(categoryColors(cat(hex))).toEqual({ light: neutral('light'), dark: neutral('dark') })
  })

  it('normalises a theme override like the base colour', () => {
    const red = categoryColors(cat('#ff0000'))
    const blue = categoryColors(cat('#0000ff'))
    const withOverride = categoryColors(cat('#ff0000', '#0000ff', null))
    expect(withOverride.light).toEqual(blue.light)
    expect(withOverride.dark).toEqual(red.dark)

    const darkOverride = categoryColors(cat('#ff0000', null, '#0000ff'))
    expect(darkOverride.light).toEqual(red.light)
    expect(darkOverride.dark).toEqual(blue.dark)
  })

  it('does not pass an override through unchanged', () => {
    const colors = categoryColors(cat('#ff0000', '#ffffcc', '#ffffcc'))
    expect(colors.light.dot).not.toBe('#ffffcc')
    expect(colors.dark.dot).not.toBe('#ffffcc')
    expect(contrastRatio(colors.light.dot, BACKGROUND.light)).toBeGreaterThanOrEqual(3)
  })

  it('renders a missing base colour neutral instead of throwing', () => {
    expect(categoryColors(cat(null as unknown as string))).toEqual({ light: neutral('light'), dark: neutral('dark') })
  })

  it('falls back to the base colour for an empty or blank override', () => {
    const red = categoryColors(cat('#ff0000'))
    expect(categoryColors(cat('#ff0000', '', '  '))).toEqual(red)
    expect(categoryColors(cat('#ff0000', 42 as unknown as string))).toEqual(red)
  })

  it('renders an invalid override neutral for that theme only', () => {
    const colors = categoryColors(cat('#ff0000', 'nope', null))
    expect(colors.light).toEqual(neutral('light'))
    expect(colors.dark).toEqual(categoryColors(cat('#ff0000')).dark)
  })

  it('is deterministic', () => {
    expect(categoryColors(cat('#e11d48', '#0ea5e9'))).toEqual(categoryColors(cat('#e11d48', '#0ea5e9')))
  })
})

describe('categoryColorVars', () => {
  it('returns data-cat and exactly the eight role variables', () => {
    const c = cat('#e11d48')
    const { light, dark } = categoryColors(c)
    const props = categoryColorVars(c)
    expect(props['data-cat']).toBe('')
    expect(props.style).toEqual(
      Object.fromEntries(
        ROLES.flatMap((r) => [
          [`--cat-${r}-l`, light[r]],
          [`--cat-${r}-d`, dark[r]],
        ]),
      ),
    )
  })
})

describe('SUGGESTED_COLORS', () => {
  it('holds 12 distinct colours spread evenly by hue', () => {
    expect(SUGGESTED_COLORS).toHaveLength(12)
    expect(new Set(SUGGESTED_COLORS).size).toBe(12)
    SUGGESTED_COLORS.forEach((hex, i) => {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
      const next = SUGGESTED_COLORS[(i + 1) % 12]
      expect(Math.abs(hueDistance(hex, next) - 30)).toBeLessThan(3)
    })
  })
})

describe('hueDistance', () => {
  it('measures the shortest hue angle in degrees', () => {
    expect(hueDistance('#ff0000', '#ff0000')).toBe(0)
    expect(hueDistance('#ff0000', '#00ffff')).toBeCloseTo(hueDistance('#00ffff', '#ff0000'), 10)
    const a = oklchToHex(0.62, 0.1, 350)
    const b = oklchToHex(0.62, 0.1, 10)
    expect(Math.abs(hueDistance(a, b) - 20)).toBeLessThan(2) // hex rounding drifts the hue slightly
  })

  it('treats neutral or invalid colours as far apart', () => {
    expect(hueDistance('#808080', '#ff0000')).toBe(180)
    expect(hueDistance('#ff0000', 'nope')).toBe(180)
  })
})
