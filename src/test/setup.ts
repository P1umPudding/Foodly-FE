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
