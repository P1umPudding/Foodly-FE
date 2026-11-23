import { describe, expect, it } from 'vitest'
import { hasModuleSideEffects } from './treeshake'

describe('hasModuleSideEffects', () => {
  it.each([
    '/app/node_modules/react-resizable-panels/dist/react-resizable-panels.browser.js',
    'C:\\app\\node_modules\\react-resizable-panels\\dist\\react-resizable-panels.browser.js',
    '/app/node_modules/@postxl/ui-components/node_modules/react-resizable-panels/dist/index.js',
  ])('marks %s side-effect free', (id) => {
    expect(hasModuleSideEffects(id)).toBe(false)
  })

  it.each([
    '/app/node_modules/@postxl/ui-components/dist/index.js',
    '/app/node_modules/@postxl/ui-components/src/styles/theme.css',
    '/app/node_modules/react-resizable-panels-foo/dist/index.js',
    '/app/src/main.tsx',
  ])('keeps side effects of %s', (id) => {
    expect(hasModuleSideEffects(id)).toBe(true)
  })
})
