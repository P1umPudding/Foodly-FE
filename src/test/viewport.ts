import { act } from '@testing-library/react'

const lists = new Set<MediaQueryList>()
const listeners = new Map<MediaQueryList, Set<(e: MediaQueryListEvent) => void>>()

function evaluate(query: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  const max = /\(max-width:\s*(\d+)px\)/.exec(query)
  if (!min && !max) return false
  const w = window.innerWidth
  return (!min || w >= Number(min[1])) && (!max || w <= Number(max[1]))
}

export function createMediaQueryList(query: string): MediaQueryList {
  const own = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    media: query,
    get matches() {
      return evaluate(query)
    },
    onchange: null,
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => own.add(cb),
    removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => own.delete(cb),
    addListener: (cb: (e: MediaQueryListEvent) => void) => own.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => own.delete(cb),
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
  lists.add(mql)
  listeners.set(mql, own)
  return mql
}

export function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  act(() => {
    for (const mql of lists) {
      const event = { matches: mql.matches, media: mql.media } as MediaQueryListEvent
      for (const cb of listeners.get(mql) ?? []) cb(event)
    }
  })
}
