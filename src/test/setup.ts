import { createMediaQueryList } from './viewport'

// jsdom lacks ResizeObserver, which Radix primitives (e.g. Slider) touch on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

// jsdom also lacks IntersectionObserver, which the recipe list's infinite-scroll
// sentinel constructs on mount. Without this stub any test that mounts the list
// with more pages to load (non-null cursor) crashes with a ReferenceError.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver
}

// jsdom also lacks scrollIntoView, which cmdk (the Command palette used by
// IngredientPicker) calls when the highlighted item changes.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom lacks matchMedia. The shell picks its desktop/phone layout from a width query, so width queries
// are evaluated live against window.innerWidth (jsdom default 1024 = desktop); every other query
// (prefers-color-scheme, prefers-reduced-motion) never matches. Resize with setViewport() from
// ./viewport, which also fires the change listeners.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => createMediaQueryList(query)
}
