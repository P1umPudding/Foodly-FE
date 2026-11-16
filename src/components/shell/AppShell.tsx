// The app frame: sidebar (desktop) or tab bar + "+" button (phone) around a sticky header and the page.
// The window stays the scroll container: the list's scroll restore, sticky headers and infinite scroll
// all rely on window scrolling.
import { useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Toaster, Tooltip, TooltipContent, TooltipTrigger, buttonVariants, cn } from '@postxl/ui-components'
import { ChevronLeft, Plus } from 'lucide-react'
import { TimerPanel } from '../../timers/TimerPanel'
import { TimerPanelProvider } from '../../timers/TimerPanelContext'
import { useIsDesktop, useIsWideDesktop } from '../../hooks/useIsDesktop'
import { NAV_DESTINATIONS, SHELL_NAV_STATE, isCategoryPage, routeTitle } from './nav'
import { useHasAppHistory } from '../../hooks/useHasAppHistory'
import { PageHeaderContext } from './PageHeader'
import { parentHref, staticOriginLabel, subpageOf, type Origin } from './origin'
import { useOrigin } from './useOrigin'
import { Brand } from './BrandMark'
import { useCategories } from '../../catalog/CatalogProvider'
import { useNavState } from './useNavState'
import { FOCUS_RING } from '../focusRing'
import { ProfileLink } from './ProfileLink'
import { Sidebar, loadSidebarCollapsed, saveSidebarCollapsed } from './Sidebar'
import { TabBar } from './TabBar'

// Sidebar width and the matching --shell-left, kept side by side. Fixed page bars offset themselves by
// --shell-left / --shell-bottom so the sidebar or tab bar never covers them (none today since the editor's footer
// moved into the header, #231). --shell-bottom is unset without the tab bar: read it as var(--shell-bottom,0px).
const SIDEBAR_WIDTH = {
  expanded: { width: 'w-62', shellVar: '[--shell-left:15.5rem]' },
  collapsed: { width: 'w-16', shellVar: '[--shell-left:4rem]' },
}
// --site-nav-h: header height, which the list's group headers stick under; the desktop 60 px is the :root default.
const PHONE_SHELL_VAR = '[--site-nav-h:3.5rem]'
const TAB_BAR_SHELL_VAR = '[--shell-bottom:4rem]'
// sonner applies mobileOffset only up to 600 px, so the offset has to follow our breakpoint instead.
const PHONE_TOAST_OFFSET = { bottom: '5rem' }
const EDITOR_PHONE_TOAST_OFFSET = { bottom: 'calc(1rem + env(safe-area-inset-bottom))' }

export function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop()
  const { pathname } = useLocation()
  const { activeCategory, hrefFor } = useNavState()
  const categoryName = useCategories().list.find((c) => c.id === activeCategory)?.name
  const subpage = subpageOf(pathname)
  const [savedChoice, setSavedChoice] = useState(loadSidebarCollapsed)
  const isWide = useIsWideDesktop()
  const collapsed = savedChoice ?? !isWide
  const sidebar = SIDEBAR_WIDTH[collapsed ? 'collapsed' : 'expanded']
  const onMainPage = NAV_DESTINATIONS.some((d) => d.path === pathname)
  // The editor takes the whole phone screen: no tab bar there (#218), so the page gets the bottom edge.
  const tabBar = !isDesktop && subpage !== 'editor'
  const phoneToastOffset = tabBar ? PHONE_TOAST_OFFSET : EDITOR_PHONE_TOAST_OFFSET

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
    setSavedChoice(next)
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
            tabBar && TAB_BAR_SHELL_VAR,
          )}
        >
          {isDesktop && (
            <Sidebar collapsed={collapsed} onCollapsedChange={setSidebarCollapsed} widthClass={sidebar.width} />
          )}
          <div className={cn('flex min-w-0 flex-1 flex-col', tabBar && 'pb-16')}>
            {/* `site-header`: hook for the theme view-transition rule in styles.css. */}
            <header
              className={cn(
                'site-header sticky top-0 z-50 flex h-(--site-nav-h) items-center gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md',
                isDesktop ? 'px-8' : 'px-4',
              )}
            >
              {/* Not a heading: each page owns its single h1. On the phone, Start greets in its h1, so the
                header carries the wordmark instead of repeating "Start" (plain text: we're already on Start). */}
              {subpage ? (
                <>
                  <BackLink pathname={pathname} />
                  {/* Editor and settings pages have no crumb, only their title (mockup). */}
                  {subpage === 'editor' || subpage === 'settings' ? (
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
                <Brand small />
              ) : (
                <span className="truncate font-semibold">
                  {!isDesktop && pathname === '/profile' ? 'Profil' : routeTitle(pathname)}
                </span>
              )}
              <div className="flex-1" />
              {/* Page actions (HeaderActions). Always mounted at this spot, so a portalled menu survives re-renders. */}
              <div ref={setActionsTarget} className="flex items-center gap-2 empty:hidden" />
              <TimerPanel />
              {!isDesktop && onMainPage && <ProfileLink variant="avatar" />}
            </header>
            <main className="flex-1">{children}</main>
          </div>
          {tabBar && <TabBar />}
          {/* Moving or resizing this button? The phone bottom padding of RecipeList's and CategoryPage's wrappers
            and of Home must still clear its top edge (#74). It never shows in the editor, so it can assume the tab bar. */}
          {!isDesktop && (pathname === '/recipes' || pathname === '/' || isCategoryPage(pathname)) && (
            <Button
              asChild
              size="icon"
              className="fixed right-4 bottom-20 z-40 size-13 rounded-full shadow-[0_6px_20px_rgb(0_0_0/0.22)]"
            >
              <Link to="/recipes/new" aria-label="Neues Rezept">
                <Plus className="size-6" />
              </Link>
            </Button>
          )}
          <Toaster offset={isDesktop ? undefined : phoneToastOffset} mobileOffset={phoneToastOffset} />
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
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            '-ml-2 shrink-0 phone:size-10 touch:size-10',
          )}
        >
          <ChevronLeft className="size-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Zurück</TooltipContent>
    </Tooltip>
  )
}

// "<Origin> / <Name>": the origin muted and a link back to it, the name once the page knows it (loading, not found:
// only the origin). No percentage cap on the origin: the nav is only as wide as its content, so 45 % of it cut
// "Rezepte" to "R…" (#268). Instead the name gives way first (down to a few letters, so it never vanishes); the
// origin only truncates when even that isn't enough.
function Crumb({ origin, fromShell, name }: { origin: Origin; fromShell: boolean; name: string | null }) {
  return (
    <nav aria-label="Pfad" className="flex min-w-0 items-center gap-1.5 font-semibold">
      <Link
        to={origin.href}
        state={fromShell ? SHELL_NAV_STATE : undefined}
        className={cn(
          'max-w-60 min-w-0 truncate rounded-sm text-muted-foreground hover:text-foreground',
          // On touch the padding grows the tap area to 40 px inside truncate's clip; the negative margins keep the
          // layout.
          'touch:-mx-1 touch:-my-2.5 touch:px-1 touch:py-2.5',
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
          <span aria-current="page" className="min-w-12 shrink-[1000] truncate">
            {name}
          </span>
        </>
      )}
    </nav>
  )
}
