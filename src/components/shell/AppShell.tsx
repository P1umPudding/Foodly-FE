// The app frame: sidebar (desktop) or tab bar + "+" button (phone) around a sticky header and the page.
// The window stays the scroll container: the list's scroll restore, sticky headers and infinite scroll
// all rely on window scrolling.
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, Toaster, cn } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { TimerPanel } from '../../timers/TimerPanel'
import { TimerPanelProvider } from '../../timers/TimerPanelContext'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { NAV_DESTINATIONS, SHELL_NAV_STATE, isCategoryPage, routeTitle } from './nav'
import { useCategories } from '../../catalog/CatalogProvider'
import { useNavState } from './useNavState'
import { FOCUS_RING } from '../focusRing'
import { ProfileMenu } from './ProfileMenu'
import { Sidebar, loadSidebarCollapsed, saveSidebarCollapsed } from './Sidebar'
import { TabBar } from './TabBar'

// Sidebar width and the matching --shell-left, kept side by side. Fixed page bars (the editor's footer)
// offset themselves by --shell-left / --shell-bottom so the sidebar or tab bar never covers them.
const SIDEBAR_WIDTH = {
  expanded: { width: 'w-60', shellVar: '[--shell-left:15rem]' },
  collapsed: { width: 'w-16', shellVar: '[--shell-left:4rem]' },
}
const PHONE_SHELL_VAR = '[--shell-bottom:4rem]'
// sonner applies mobileOffset only up to 600 px, so the offset has to follow our breakpoint instead.
const PHONE_TOAST_OFFSET = { bottom: '5rem' }

export function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed)
  const sidebar = SIDEBAR_WIDTH[collapsed ? 'collapsed' : 'expanded']
  const onMainPage = NAV_DESTINATIONS.some((d) => d.path === pathname)

  const setSidebarCollapsed = (next: boolean) => {
    setCollapsed(next)
    saveSidebarCollapsed(next)
  }

  // One tree for both layouts: only the sidebar, tab bar, "+" button and avatar are conditional, so
  // crossing the breakpoint never remounts the page (an editor draft or the list's state survive).
  // TimerPanelProvider spans header and page, so a time chip in a step can open the header's panel.
  return (
    <TimerPanelProvider>
      <div
        className={cn(
          'flex min-h-screen bg-background text-foreground',
          isDesktop ? sidebar.shellVar : PHONE_SHELL_VAR,
        )}
      >
        {isDesktop && (
          <Sidebar collapsed={collapsed} onCollapsedChange={setSidebarCollapsed} widthClass={sidebar.width} />
        )}
        <div className={cn('flex min-w-0 flex-1 flex-col', !isDesktop && 'pb-16')}>
          {/* `site-header`: RecipeList measures this element for its sticky offsets (--site-nav-h). */}
          <header
            className={cn(
              'site-header sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border/60 bg-background',
              isDesktop ? 'px-6' : 'px-4',
            )}
          >
            {/* Not a heading: each page owns its single h1. On the phone, Start greets in its h1, so the
                header carries the wordmark instead of repeating "Start" (plain text: we're already on Start). */}
            {!isDesktop && pathname === '/' ? (
              <span className="font-display text-xl">Foodly</span>
            ) : isCategoryPage(pathname) ? (
              <CategoryCrumb />
            ) : (
              <span className="truncate font-semibold">{routeTitle(pathname)}</span>
            )}
            {/* Room for page actions. */}
            <div className="flex-1" />
            <TimerPanel />
            {!isDesktop && onMainPage && <ProfileMenu variant="avatar" />}
          </header>
          <main className="flex-1">{children}</main>
        </div>
        {!isDesktop && <TabBar />}
        {/* Moving or resizing this button? The phone bottom padding of RecipeList's and CategoryPage's wrappers
            and of Home must still clear its top edge (#74). */}
        {!isDesktop && (pathname === '/recipes' || pathname === '/' || isCategoryPage(pathname)) && (
          <Button asChild size="icon" className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg">
            <Link to="/recipes/new" aria-label="Neues Rezept">
              <Plus className="size-6" />
            </Link>
          </Button>
        )}
        <Toaster offset={isDesktop ? undefined : PHONE_TOAST_OFFSET} mobileOffset={PHONE_TOAST_OFFSET} />
      </div>
    </TimerPanelProvider>
  )
}

// "Rezepte / <Name>" on a category page. Only "Rezepte" while the name is unknown (loading, not found).
function CategoryCrumb() {
  const { activeCategory, hrefFor } = useNavState()
  const name = useCategories().list.find((c) => c.id === activeCategory)?.name
  return (
    <nav aria-label="Brotkrümel" className="flex min-w-0 items-center gap-1.5 font-semibold">
      <Link
        to={hrefFor('/recipes')}
        state={SHELL_NAV_STATE}
        className={cn('shrink-0 rounded-sm text-muted-foreground hover:text-foreground', FOCUS_RING)}
      >
        Rezepte
      </Link>
      {name !== undefined && (
        <>
          <span aria-hidden className="text-muted-foreground">
            /
          </span>
          <span aria-current="page" className="truncate">
            {name}
          </span>
        </>
      )}
    </nav>
  )
}
