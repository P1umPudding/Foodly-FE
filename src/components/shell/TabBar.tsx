import { NavLink } from 'react-router-dom'
import { cn } from '@postxl/ui-components'
import { visibleDestinations } from './nav'
import { useNavState } from './useNavState'

// Phone navigation (below 761 px): the same destinations as the sidebar, icon + label.
export function TabBar() {
  const { hrefFor } = useNavState()
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-sidebar-border bg-sidebar"
    >
      {/* No category entries here, so unlike the sidebar "Rezepte" stays current on a category view. */}
      {visibleDestinations().map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={hrefFor(path)}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
