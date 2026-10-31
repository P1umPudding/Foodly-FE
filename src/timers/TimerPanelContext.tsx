// Open state of the header's timer panel, shared so a time chip in the page can open it too.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type TimerPanelApi = {
  open: boolean
  // `returnFocusTo`: the element that opened the panel from elsewhere (a chip); it gets focus back on close.
  setOpen: (open: boolean, returnFocusTo?: HTMLElement | null) => void
  // Focus target on close: that element if it is still in the page, otherwise null (→ the header toggle).
  takeReturnFocus: () => HTMLElement | null
}

const TimerPanelContext = createContext<TimerPanelApi | null>(null)

export function TimerPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  const setOpen = useCallback((next: boolean, returnFocusTo?: HTMLElement | null) => {
    if (next) returnFocus.current = returnFocusTo ?? null
    setOpenState(next)
  }, [])
  const takeReturnFocus = useCallback(() => {
    const el = returnFocus.current
    returnFocus.current = null
    return el?.isConnected ? el : null
  }, [])

  const value = useMemo(() => ({ open, setOpen, takeReturnFocus }), [open, setOpen, takeReturnFocus])
  return <TimerPanelContext.Provider value={value}>{children}</TimerPanelContext.Provider>
}

// null outside the app shell (a page rendered on its own): there is no panel to open then.
export function useTimerPanel(): TimerPanelApi | null {
  return useContext(TimerPanelContext)
}
