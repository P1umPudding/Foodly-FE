// Open state of the header's timer panel, shared so a time chip in the page can open it too.
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type TimerPanelApi = { open: boolean; setOpen: (open: boolean) => void }

const TimerPanelContext = createContext<TimerPanelApi | null>(null)

export function TimerPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <TimerPanelContext.Provider value={{ open, setOpen }}>{children}</TimerPanelContext.Provider>
}

// null outside the app shell (a page rendered on its own): there is no panel to open then.
export function useTimerPanel(): TimerPanelApi | null {
  return useContext(TimerPanelContext)
}
