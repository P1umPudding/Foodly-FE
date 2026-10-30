import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { useMe } from '../../catalog/CatalogProvider'
import { ThemeSubmenu } from '../ThemeMenu'
import { navItemClass } from './navItem'

const LABEL = 'Profil & Einstellungen'

// Profile and settings behind the avatar (phone header) or the sidebar's bottom row. There is no profile
// page yet; the menu holds the name and the theme. Wake-lock stays on the recipe page, where it acts.
//  • avatar — phone header, 40 px tap target
//  • row    — expanded sidebar: avatar + name
//  • icon   — collapsed sidebar: avatar only, tooltip
export function ProfileMenu({ variant }: { variant: 'avatar' | 'row' | 'icon' }) {
  const me = useMe()
  const name = me?.name ?? 'Profil'
  const initial = (me?.name.trim()[0] ?? '?').toUpperCase()

  const avatar = (
    <Avatar className={variant === 'avatar' ? 'size-8' : 'size-6'}>
      <AvatarFallback className="text-xs font-semibold">{initial}</AvatarFallback>
    </Avatar>
  )

  // DropdownMenuTrigger styled via buttonVariants rather than wrapping a postxl Button: Button isn't
  // forwardRef, so Radix couldn't anchor the menu to it (same reason as in TimerToggle).
  const trigger =
    variant === 'row' ? (
      <DropdownMenuTrigger className={navItemClass(false, false)}>
        {avatar}
        <span className="truncate">{name}</span>
      </DropdownMenuTrigger>
    ) : (
      <DropdownMenuTrigger
        aria-label={LABEL}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          variant === 'avatar' ? 'size-10 rounded-full' : navItemClass(false, true),
        )}
      >
        {avatar}
      </DropdownMenuTrigger>
    )

  return (
    <DropdownMenu>
      {variant === 'icon' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex">{trigger}</span>
          </TooltipTrigger>
          <TooltipContent side="right">{LABEL}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        align={variant === 'avatar' ? 'end' : 'start'}
        side={variant === 'avatar' ? 'bottom' : 'top'}
        className="min-w-48"
      >
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeSubmenu />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
