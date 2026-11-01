// The `phone:` variant and useIsDesktop must split at the same pixel, or one width gets the phone
// layout from JS but desktop styles from CSS (#66).
import { expect, it } from 'vitest'
import stylesCss from './styles.css?raw'
import { SHELL_DESKTOP_QUERY } from '../hooks/useIsDesktop'

it('puts the phone variant exactly below SHELL_DESKTOP_QUERY', () => {
  const variants = [...stylesCss.matchAll(/@custom-variant phone \(@media \(width\s*<\s*(\d+)px\)\);/g)]
  expect(variants, 'one `phone` variant in the expected `width < Npx` form').toHaveLength(1)
  const desktop = SHELL_DESKTOP_QUERY.match(/^\(min-width: (\d+)px\)$/)
  if (!desktop) throw new Error(`unexpected SHELL_DESKTOP_QUERY: ${SHELL_DESKTOP_QUERY}`)
  expect(variants[0][1]).toBe(desktop[1])
})

it('leaves no hand-written breakpoint next to the phone variant in src', () => {
  // A raw max-[Npx] class would reopen a gap the guard above can't see.
  const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
  const offenders = Object.entries(sources)
    .filter(([, code]) => /max-\[\d+px\]:/.test(code))
    .map(([path]) => path)
  expect(offenders).toEqual([])
})
