// The app frame: sidebar (desktop) or tab bar + "+" button (phone) around a sticky header and the page.
// The window stays the scroll container: the list's scroll restore, sticky headers and infinite scroll
// all rely on window scrolling.
import { useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Toaster, Tooltip, TooltipContent, TooltipTrigger, buttonVariants, cn } from '@postxl/ui-components'
import { ChevronLeft, Plus } from 'lucide-react'
import { TimerPanel } from '../../timers/TimerPanel'
import { TimerPanelProvider } from '../../timers/TimerPanelContext'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { NAV_DESTINATIONS, SHELL_NAV_STATE, isCategoryPage, routeTitle } from './nav'
import { useHasAppHistory } from '../../hooks/useHasAppHistory'
import { PageHeaderContext } from './PageHeader'
import { parentHref, staticOriginLabel, subpageOf, type Origin } from './origin'
import { useOrigin } from './useOrigin'
import { BrandMark } from './BrandMark'
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
  const { activeCategory, hrefFor } = useNavState()
  const categoryName = useCategories().list.find((c) => c.id === activeCategory)?.name
  const subpage = subpageOf(pathname)
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed)
  const sidebar = SIDEBAR_WIDTH[collapsed ? 'collapsed' : 'expanded']
  const onMainPage = NAV_DESTINATIONS.some((d) => d.path === pathname)

  // The page's crumb name, stamped with the path it was set on: on a switch between two recipes the old name must not
  // show (or be remembered) for the new one until that page reports its own.
  const [crumb, setCrumb] = useState<{ name: string; path: string } | null>(null)
  const pathRef = useRef(pathname)
  pathRef.current = pathname
  const setCrumbName = useCallback(
    (name: string | null) => setCrumb(name === null ? null : { name, path: pathRef.current }),
    [],
  )
  const crumbName = subpage === 'category' ? (categoryName ?? null) : crumb?.path === pathname ? crumb.name : null
  const origin = useOrigin(crumbName ?? staticOriginLabel(pathname))
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null)
  const headerSlot = useMemo(() => ({ actionsTarget, setCrumbName }), [actionsTarget, setCrumbName])

  const setSidebarCollapsed = (next: boolean) => {
    setCollapsed(next)
    saveSidebarCollapsed(next)
  }

  // One tree for both layouts: only the sidebar, tab bar, "+" button and avatar are conditional, so
  // crossing the breakpoint never remounts the page (an editor draft or the list's state survive).
  // TimerPanelProvider spans header and page, so a time chip in a step can open the header's panel.
  return (
    <TimerPanelProvider>
      <PageHeaderContext.Provider value={headerSlot}>
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
                'site-header sticky top-0 z-50 flex items-center gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md',
                isDesktop ? 'h-15 px-8' : 'h-14 px-4',
              )}
            >
              {/* Not a heading: each page owns its single h1. On the phone, Start greets in its h1, so the
                header carries the wordmark instead of repeating "Start" (plain text: we're already on Start). */}
              {subpage ? (
                <>
                  <BackLink pathname={pathname} />
                  {subpage === 'editor' ? (
                    <span className="truncate font-semibold">{routeTitle(pathname)}</span>
                  ) : (
                    // Phones show only the arrow and the icons (mockup).
                    isDesktop && (
                      <Crumb
                        origin={origin ?? { label: 'Rezepte', href: hrefFor('/recipes') }}
                        fromShell={origin === null}
                        name={crumbName}
                      />
                    )
                  )}
                </>
              ) : !isDesktop && pathname === '/' ? (
                <span className="flex items-center gap-2 font-display text-xl">
                  <BrandMark small />
                  Foodly
                </span>
              ) : (
                <span className="truncate font-semibold">{routeTitle(pathname)}</span>
              )}
              <div className="flex-1" />
              {/* Page actions (HeaderActions). Always mounted at this spot, so a portalled menu survives re-renders. */}
              <div ref={setActionsTarget} className="flex items-center gap-2 empty:hidden" />
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
      </PageHeaderContext.Provider>
    </TimerPanelProvider>
  )
}

// Back like the browser when an in-app entry lies behind (the list keeps its search, filters and scroll, no entry
// piles up); otherwise (direct link, reload) the plain link to the parent page applies.
function BackLink({ pathname }: { pathname: string }) {
  const navigate = useNavigate()
  const hasAppHistory = useHasAppHistory()
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!hasAppHistory()) return
    e.preventDefault()
    navigate(-1)
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A Link styled via buttonVariants: the postxl Button would drop the tooltip's ref. */}
        <Link
          to={parentHref(pathname)}
          onClick={onClick}
          aria-label="Zurück"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2 shrink-0 phone:size-10')}
        >
          <ChevronLeft className="size-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Zurück</TooltipContent>
    </Tooltip>
  )
}

// "<Origin> / <Name>": the origin muted and a link back to it, the name once the page knows it (loading, not found:
// only the origin).
function Crumb({ origin, fromShell, name }: { origin: Origin; fromShell: boolean; name: string | null }) {
  return (
    <nav aria-label="Pfad" className="flex min-w-0 items-center gap-1.5 font-semibold">
      <Link
        to={origin.href}
        state={fromShell ? SHELL_NAV_STATE : undefined}
        className={cn(
          'max-w-[45%] min-w-0 truncate rounded-sm text-muted-foreground hover:text-foreground',
          FOCUS_RING,
        )}
      >
        {origin.label}
      </Link>
      {name !== null && (
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
