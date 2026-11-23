import { Link } from 'react-router'
import { cn } from '@postxl/ui-components'
import { SHELL_NAV_STATE, NAV_DESTINATIONS, currentFor, inRecipesSection } from './nav'
import { useNavState } from './useNavState'

// Phone navigation (below 761 px): the same destinations as the sidebar, icon + label.
export function TabBar() {
  const { pathname, hrefFor } = useNavState()
  return (
    <nav
      aria-label="Hauptnavigation"
      // `tab-bar`: hook for styles.css, which drops the blur during the theme view-transition (as for the header).
      // The bar grows by the safe-area insets (#220): the labels keep their 4 rem, the home indicator sits below them.
      className="tab-bar fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-sidebar-border bg-sidebar/92 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur-[14px]"
    >
      {/* No category entries here, so unlike the sidebar "Rezepte" stays current on a category view. A plain Link:
          NavLink drops aria-current whenever its own route doesn't match, and /recipes doesn't match a category page. */}
      {NAV_DESTINATIONS.map(({ label, path, icon: Icon }) => {
        const active = path === '/recipes' ? inRecipesSection(pathname) : pathname === path
        return (
          <Link
            key={path}
            to={hrefFor(path)}
            state={SHELL_NAV_STATE}
            aria-current={active ? currentFor(pathname, path) : undefined}
            // text-[11px]: mockup `.tabbar a`, below the xs step.
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-[3px] text-[11px] font-medium',
              // Inactive stays muted, not the mockup's subtle: design.md keeps subtle off small text.
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5.5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
