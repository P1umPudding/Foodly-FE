import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@postxl/ui-components'
import { LogOut, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import { foodly } from '../../api'
import { useMe } from '../../catalog/CatalogProvider'
import { ThemeSubmenu } from '../ThemeMenu'
import { navItemClass } from './navItem'
import { TriggerButton } from '../TriggerButton'

const LABEL = 'Profil & Einstellungen'

// Profile and settings behind the avatar (phone header) or the sidebar's bottom row. There is no profile
// page yet; the menu holds the name, the categories, the theme and (REST only) Abmelden. Wake-lock stays on the recipe
// page, where it acts.
//  • avatar — phone header, 40 px tap target
//  • row    — expanded sidebar: avatar + name
//  • icon   — collapsed sidebar: avatar only, tooltip
export function ProfileMenu({ variant }: { variant: 'avatar' | 'row' | 'icon' }) {
  const me = useMe()
  const name = me?.name ?? 'Profil'
  const initial = (me?.name.trim()[0] ?? '?').toUpperCase()

  const avatar = (
    <Avatar aria-hidden className={variant === 'avatar' ? 'size-8' : 'size-6'}>
      <AvatarFallback className="text-xs font-semibold">{initial}</AvatarFallback>
    </Avatar>
  )

  const trigger =
    variant === 'row' ? (
      <DropdownMenuTrigger asChild>
        <TriggerButton variant="ghost" aria-label={`${name} – ${LABEL}`} className={navItemClass(false, false)}>
          {avatar}
          <span className="truncate">{name}</span>
        </TriggerButton>
      </DropdownMenuTrigger>
    ) : (
      <DropdownMenuTrigger asChild>
        <TriggerButton
          variant="ghost"
          size="icon"
          aria-label={LABEL}
          // flex, not inline-flex: in the collapsed rail's block footer an inline box would gain the line's descender gap.
          className={variant === 'avatar' ? 'size-10 rounded-full' : cn(navItemClass(false, true), 'flex')}
        >
          {avatar}
        </TriggerButton>
      </DropdownMenuTrigger>
    )

  return (
    <DropdownMenu>
      {variant === 'icon' ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
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
        <DropdownMenuItem asChild className="gap-2">
          <Link to="/categories">
            <Tags aria-hidden className="size-4" />
            Kategorien
          </Link>
        </DropdownMenuItem>
        <ThemeSubmenu />
        {foodly.auth.canSignOut && (
          <>
            <DropdownMenuSeparator />
            {/* No confirm, no toast: the guard takes over to /login at once (design spec „Abmelden“). */}
            <DropdownMenuItem className="gap-2" onSelect={() => void foodly.auth.signOut()}>
              <LogOut aria-hidden className="size-4" />
              Abmelden
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
