// Category colours (docs/design.md §2.4, ADR 0002): the user picks one colour per
// category; this derives four readable roles per theme by fixing OKLCH lightness,
// capping chroma and keeping the hue. Pure — no DOM, no theme state.
import type { CSSProperties } from 'react'
import type { UserCategory } from '../api/protocol'

export type CategoryColorInput = Pick<UserCategory, 'color' | 'colorLight' | 'colorDark'>
export type CategoryRole = 'dot' | 'soft' | 'ink' | 'line'
export type Roles = Record<CategoryRole, string>
type Theme = 'light' | 'dark'
type Oklch = { l: number; c: number; h: number }

const ROLES: readonly CategoryRole[] = ['dot', 'soft', 'ink', 'line']

// Lightness / max chroma per role and theme — the table in docs/design.md §2.4.
// The neutral C = 0 values equal the --cat-* defaults in theme.css.
const ROLE_TABLE: Record<Theme, Record<CategoryRole, { l: number; maxC: number }>> = {
  light: {
    dot: { l: 0.62, maxC: 0.17 },
    soft: { l: 0.955, maxC: 0.035 },
    ink: { l: 0.46, maxC: 0.13 },
    line: { l: 0.84, maxC: 0.08 },
  },
  dark: {
    dot: { l: 0.7, maxC: 0.15 },
    soft: { l: 0.27, maxC: 0.045 },
    ink: { l: 0.86, maxC: 0.1 },
    line: { l: 0.42, maxC: 0.09 },
  },
}

// Below this the hue is noise (grey, black, white) → render neutral.
const NEUTRAL_CHROMA = 0.02

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const digits = m[1].length === 3 ? [...m[1]].map((d) => d + d).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [number, number, number]
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

// OKLab matrices from Björn Ottosson, https://bottosson.github.io/posts/oklab/
function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180
  return oklabToLinear(l, c * Math.cos(rad), c * Math.sin(rad))
}

const EPS = 1e-6
const inGamut = (rgb: number[]) => rgb.every((v) => v >= -EPS && v <= 1 + EPS)

export function hexToOklch(hex: string): Oklch | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const [L, a, b] = linearToOklab(...(rgb.map(toLinear) as [number, number, number]))
  const h = (Math.atan2(b, a) * 180) / Math.PI
  return { l: L, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h }
}

// Out-of-gamut colours lose chroma at fixed L and hue (binary search), never by
// clamping channels — channel clamping shifts L and breaks the contrast bounds.
export function oklchToHex(l: number, c: number, h: number): string {
  let rgb = oklchToLinear({ l, c, h })
  if (!inGamut(rgb)) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklchToLinear({ l, c: mid, h }))) lo = mid
      else hi = mid
    }
    rgb = oklchToLinear({ l, c: lo, h })
  }
  // Clamp only absorbs float noise here; the colour is already in gamut.
  const channel = (v: number) =>
    Math.round(fromLinear(Math.min(1, Math.max(0, v))) * 255)
      .toString(16)
      .padStart(2, '0')
  return '#' + rgb.map(channel).join('')
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = (parseHex(hex) ?? [0, 0, 0]).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function chromaticOrNull(hex: string): Oklch | null {
  const lch = hexToOklch(hex)
  return lch && lch.c >= NEUTRAL_CHROMA ? lch : null
}

function rolesFor(input: string, theme: Theme): Roles {
  const lch = chromaticOrNull(input)
  const roles = {} as Roles
  for (const role of ROLES) {
    const { l, maxC } = ROLE_TABLE[theme][role]
    roles[role] = lch ? oklchToHex(l, Math.min(lch.c, maxC), lch.h) : oklchToHex(l, 0, 0)
  }
  return roles
}

// A backend override is that theme's input instead of `color` and is normalised the
// same way, so an override stays readable too (ADR 0002).
export function categoryColors(cat: CategoryColorInput): { light: Roles; dark: Roles } {
  return {
    light: rolesFor(cat.colorLight || cat.color, 'light'),
    dark: rolesFor(cat.colorDark || cat.color, 'dark'),
  }
}

type CategoryVarName = `--cat-${CategoryRole}-${'l' | 'd'}`

// The only inline-style exception in the codebase (CLAUDE.md, ADR 0002): both theme
// variants go on the element and the `[data-cat]` rule in styles.css picks one, so a
// theme switch needs no re-render. Spread the result onto the category element.
export function categoryColorVars(cat: CategoryColorInput): { 'data-cat': ''; style: CSSProperties } {
  const { light, dark } = categoryColors(cat)
  const vars = {} as Record<CategoryVarName, string>
  for (const role of ROLES) {
    vars[`--cat-${role}-l`] = light[role]
    vars[`--cat-${role}-d`] = dark[role]
  }
  return { 'data-cat': '', style: vars as CSSProperties }
}

export const SUGGESTED_COLORS: readonly string[] = Array.from({ length: 12 }, (_, i) =>
  oklchToHex(ROLE_TABLE.light.dot.l, ROLE_TABLE.light.dot.maxC, i * 30),
)

// Neutral or invalid colours have no meaningful hue; 180 (maximally far) keeps a
// "too similar" hint from firing on them.
export function hueDistance(a: string, b: string): number {
  const x = chromaticOrNull(a)
  const y = chromaticOrNull(b)
  if (!x || !y) return 180
  const d = Math.abs(x.h - y.h) % 360
  return d > 180 ? 360 - d : d
}
