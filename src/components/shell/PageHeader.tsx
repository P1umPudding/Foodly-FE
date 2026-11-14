// The header slot: pages put their actions into the shell's header and tell it the name for the breadcrumb.
// Router-free on purpose (context + portal only): page tests mock react-router-dom with a handful of hooks.
// Without the shell (a page rendered alone in a test) actions render in place and the name is ignored.
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type PageHeaderSlot = {
  actionsTarget: HTMLElement | null
  setCrumbName: (name: string | null) => void
}

export const PageHeaderContext = createContext<PageHeaderSlot | null>(null)

// Only triggers belong in here: dialogs they open stay in the page tree, so a re-rendered header can't take an
// open dialog with it.
export function HeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(PageHeaderContext)
  if (!slot) return <>{children}</>
  return slot.actionsTarget ? createPortal(children, slot.actionsTarget) : null
}

// The breadcrumb's last part ("Rezepte / <name>"). Also what the shell remembers as this page's label when the
// user moves on, so the next page can show "<name> / …".
export function HeaderCrumbName({ name }: { name: string }) {
  const setCrumbName = useContext(PageHeaderContext)?.setCrumbName
  useEffect(() => {
    if (!setCrumbName) return
    setCrumbName(name)
    return () => setCrumbName(null)
  }, [setCrumbName, name])
  return null
}
