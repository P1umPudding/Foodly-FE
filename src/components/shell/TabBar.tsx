import { NavLink } from 'react-router-dom'
import { cn } from '@postxl/ui-components'
import { visibleDestinations } from './nav'
import { useNavState } from './useNavState'

// Phone navigation (below 761 px): the same destinations as the sidebar, icon + label.
export function TabBar() {
  const { activeCategory, hrefFor } = useNavState()
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-sidebar-border bg-sidebar"
    >
      {visibleDestinations().map(({ label, path, icon: Icon }) => {
        // Same rule as the sidebar: one shown category is not "all recipes".
        const yieldsToCategory = path === '/recipes' && activeCategory !== null
        return (
          <NavLink
            key={path}
            to={hrefFor(path)}
            end={path === '/'}
            aria-current={yieldsToCategory ? 'false' : 'page'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
                isActive && !yieldsToCategory ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}
