// Desktop navigation (from 761 px). Not postxl's Sidebar: that one switches to an off-canvas Sheet at
// 768 px via useIsMobile and collapses to 3rem, while the redesign needs 761 px, a bottom tab bar
// below it and a 64 px icon rail (docs/design/redesign §1.6).
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button, Skeleton, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useCategories } from '../../catalog/CatalogProvider'
import { categoryColorVars } from '../../lib/categoryColor'
import { SHELL_NAV_STATE, currentFor, visibleDestinations } from './nav'
import { navItemClass } from './navItem'
import { ProfileMenu } from './ProfileMenu'
import { useNavState } from './useNavState'

const COLLAPSED_KEY = 'foodly:sidebar-collapsed'

// A layout preference of this device, so deliberately not keyed per user like the list state.
export function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // storage blocked → the choice just isn't remembered
  }
}

// Collapsed entries show no label (jsdom has no CSS, so hiding by class would still expose it), carry
// their name as aria-label and explain themselves in a tooltip. The span gives the tooltip a host
// element to anchor to; Slot can't merge NavLink's className function.
function WithTip({ collapsed, label, children }: { collapsed: boolean; label: string; children: ReactNode }) {
  if (!collapsed) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  widthClass,
}: {
  collapsed: boolean
  onCollapsedChange: (next: boolean) => void
  widthClass: string
}) {
  const { pathname, activeCategory, hrefFor, categoryHref } = useNavState()
  const categories = useCategories()
  const ordered = [...categories.list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  // Only a category entry that is actually listed can take over the highlight (not ?cat=999, nor while
  // the categories are loading or failed).
  const highlightedCategory = ordered.some((c) => c.id === activeCategory) ? activeCategory : null
  const toggleLabel = collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      aria-label="Seitenleiste"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col gap-0.5 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground',
        widthClass,
      )}
    >
      <div className={cn('flex items-center pb-4', collapsed ? 'flex-col gap-2' : 'justify-between pl-2.5')}>
        {!collapsed && (
          <Link
            to="/"
            className="-ml-1 rounded-md px-1 font-display text-xl focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden"
          >
            Foodly
          </Link>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={toggleLabel}
                aria-expanded={!collapsed}
                onClick={() => onCollapsedChange(!collapsed)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ToggleIcon className="size-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">{toggleLabel}</TooltipContent>
        </Tooltip>
      </div>

      <WithTip collapsed={collapsed} label="Neues Rezept">
        <Button asChild className={cn('mb-3 w-full gap-1.5', collapsed && 'px-0')}>
          <Link to="/recipes/new" aria-label={collapsed ? 'Neues Rezept' : undefined}>
            <Plus className="size-4" />
            {!collapsed && 'Neues Rezept'}
          </Link>
        </Button>
      </WithTip>

      <nav aria-label="Hauptnavigation" className="flex flex-col gap-0.5">
        {visibleDestinations().map(({ label, path, icon: Icon }) => {
          // Highlighted on its sub-pages too (a recipe belongs to "Rezepte"), but "page" only on itself.
          // NavLink's own active check ignores the query, so it can't tell "all recipes" from one category:
          // while a single category is shown, that category is the current entry, not "Rezepte".
          const yieldsToCategory = path === '/recipes' && highlightedCategory !== null
          return (
            <WithTip key={path} collapsed={collapsed} label={label}>
              <NavLink
                to={hrefFor(path)}
                state={SHELL_NAV_STATE}
                end={path === '/'}
                aria-label={collapsed ? label : undefined}
                aria-current={yieldsToCategory ? 'false' : currentFor(pathname, path)}
                className={({ isActive }) => navItemClass(isActive && !yieldsToCategory, collapsed)}
              >
                <Icon className="size-4" />
                {!collapsed && label}
              </NavLink>
            </WithTip>
          )
        })}
      </nav>

      {categories.status !== 'error' && (categories.status === 'loading' || ordered.length > 0) && (
        // Own scroll area, so a long category list never pushes the profile row off the screen.
        <nav aria-label="Kategorien" className="mt-4 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          {!collapsed && <h2 className="px-2.5 pb-1.5 text-xs font-semibold text-muted-foreground">Kategorien</h2>}
          {categories.status === 'loading'
            ? [0, 1, 2].map((i) => (
                <Skeleton key={i} data-testid="category-skeleton" className="h-9 w-full rounded-md" />
              ))
            : ordered.map((c) => {
                const active = highlightedCategory === c.id
                const count = c.recipes.length
                return (
                  <WithTip key={c.id} collapsed={collapsed} label={`${c.name} (${count})`}>
                    <Link
                      to={categoryHref(c.id)}
                      state={SHELL_NAV_STATE}
                      aria-label={collapsed ? `${c.name} (${count})` : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={navItemClass(active, collapsed)}
                    >
                      <span
                        aria-hidden
                        {...categoryColorVars(c)}
                        className="size-2.5 shrink-0 rounded-full bg-cat-dot"
                      />
                      {!collapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                        </>
                      )}
                    </Link>
                  </WithTip>
                )
              })}
        </nav>
      )}

      <div className="mt-auto pt-3">
        <ProfileMenu variant={collapsed ? 'icon' : 'row'} />
      </div>
    </aside>
  )
}
