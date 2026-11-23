// Rollup `treeshake.moduleSideEffects` for `vite build` (#309). Lives in src/ (not vite.config.ts) so tsc and
// vitest cover it.
//
// @postxl/ui-components ships one pre-bundled file that imports every dependency of every component. Packages
// listed here are such dependencies that Foodly never uses but whose own top-level code (`createContext`,
// `displayName` writes) would keep them in the entry chunk. Marking them side-effect free only drops them while
// nothing imports from them; once a used component needs them, Rollup bundles them as usual. Not global
// (`moduleSideEffects: false`): that would also drop side-effect-only imports.
//
// Add a package when the visualizer shows an unused postxl dependency in the entry, and only if its package.json
// has no `sideEffects` field: Vite passes that field on and it wins over this callback.
const SIDE_EFFECT_FREE_PACKAGES = ['react-resizable-panels']

export function hasModuleSideEffects(id: string): boolean {
  const path = id.replace(/\\/g, '/')
  return !SIDE_EFFECT_FREE_PACKAGES.some((pkg) => path.includes(`/node_modules/${pkg}/`))
}
