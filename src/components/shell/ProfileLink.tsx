import {
  Avatar,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { Link, useLocation } from 'react-router-dom'
import { useMe } from '../../catalog/CatalogProvider'
import { navItemClass } from './navItem'
import { profileName } from './profileName'

const LABEL = 'Profil & Einstellungen'

// The way to /profile: the avatar in the phone header or the sidebar's bottom row.
//  • avatar — phone header, 40 px tap target, 28 px avatar
//  • row    — expanded sidebar: avatar + name
//  • icon   — collapsed sidebar: avatar only, tooltip
export function ProfileLink({ variant }: { variant: 'avatar' | 'row' | 'icon' }) {
  const me = useMe()
  const { pathname } = useLocation()
  const { name, initial, known } = profileName(me)
  // The categories are a setting reached from the profile (mockup), so the profile entry stays lit there; a single
  // category's page belongs to "Rezepte".
  const current = pathname === '/profile' ? 'page' : pathname === '/categories' ? 'location' : undefined

  // Sidebar: mockup `.avatar.xs` (22 px, 11 px initial), off the text scale.
  const avatar = (
    <Avatar aria-hidden className={variant === 'avatar' ? 'size-7' : 'size-[22px]'}>
      <AvatarFallback className={cn('font-semibold', variant === 'avatar' ? 'text-xs' : 'text-[11px]')}>
        {initial}
      </AvatarFallback>
    </Avatar>
  )

  if (variant === 'avatar') {
    return (
      <Link
        to="/profile"
        aria-label={LABEL}
        // -mr-1.5: mockup `.me-btn`, pulls the avatar to the header's edge while keeping the 40 px tap target.
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '-mr-1.5 size-10 rounded-full')}
      >
        {avatar}
      </Link>
    )
  }

  if (variant === 'row') {
    return (
      <Link
        to="/profile"
        aria-label={known ? `${name} – ${LABEL}` : LABEL}
        aria-current={current}
        className={navItemClass(current !== undefined, false)}
      >
        {avatar}
        <span className="truncate">{name}</span>
      </Link>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/profile"
          aria-label={LABEL}
          aria-current={current}
          // flex, not inline-flex: in the collapsed rail's block footer an inline box would gain the line's descender gap.
          className={cn(navItemClass(current !== undefined, true), 'flex')}
        >
          {avatar}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{LABEL}</TooltipContent>
    </Tooltip>
  )
}
