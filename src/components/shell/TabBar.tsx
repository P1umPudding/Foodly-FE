import { Link } from 'react-router-dom'
import { cn } from '@postxl/ui-components'
import { SHELL_NAV_STATE, NAV_DESTINATIONS, currentFor, inRecipesSection } from './nav'
import { useNavState } from './useNavState'

// Phone navigation (below 761 px): the same destinations as the sidebar, icon + label.
export function TabBar() {
  const { pathname, hrefFor } = useNavState()
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-sidebar-border bg-sidebar"
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
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
