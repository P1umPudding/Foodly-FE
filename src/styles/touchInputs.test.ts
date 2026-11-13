// Fields under 16px make iOS Safari zoom on focus (#215). The fix only works if the rule is unlayered (postxl's
// text-* utilities would beat any layered rule) and page zoom is never blocked instead.
import { expect, it } from 'vitest'
import stylesCss from './styles.css?raw'
import indexHtml from '../../index.html?raw'

const css = stylesCss.replace(/\/\*[\s\S]*?\*\//g, '')
// The :not() list is the opt-out for fields that are already larger (PortionScaler's text-xl); keep it in sync with
// the comment in styles.css.
const RULE =
  /@media (\([^)]*\)) \{\s*:is\(input, textarea, \[contenteditable\]\):not\(\.text-xl, \.text-2xl, \.text-3xl\) \{\s*font-size: 16px;/

it('defines one touch variant with the same query as the 16px field rule', () => {
  const variants = [...css.matchAll(/@custom-variant touch \(@media (\([^)]*\))\);/g)]
  expect(variants).toHaveLength(1)
  expect(variants[0][1]).toBe('(pointer: coarse)')
  expect(css.match(RULE)?.[1]).toBe(variants[0][1])
})

it('keeps the 16px field rule outside every @layer', () => {
  const at = css.search(RULE)
  expect(at).toBeGreaterThan(-1)
  const before = css.slice(0, at)
  const depth = before.split('{').length - before.split('}').length
  expect(depth).toBe(0)
})

it('never blocks page zoom in the viewport meta tag', () => {
  expect(indexHtml).not.toMatch(/maximum-scale|user-scalable/)
})
