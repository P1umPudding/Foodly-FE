import { buttonVariants, cn } from '@postxl/ui-components'

// Sidebar entries are links, styled as ghost buttons; the active one gets the sidebar accent fill.
export function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    buttonVariants({ variant: 'ghost' }),
    'h-9 w-full gap-2.5 px-2.5 font-medium',
    collapsed ? 'justify-center px-0' : 'justify-start',
    active
      ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent'
      : 'text-muted-foreground hover:text-foreground',
  )
}
