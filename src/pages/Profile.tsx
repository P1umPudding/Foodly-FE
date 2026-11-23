// „Profil & Einstellungen“ (mockup `#/profile`): who is signed in, the theme, the way to the categories and Abmelden.
// Mockup entries with nothing behind them in the app are left out: the recipe count (B19: none without an extra
// request, #304), the group count (B5), Timer-Ton, Offline, wake-lock (#245).
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, Button, Card, cn } from '@postxl/ui-components'
import { ChevronRight } from 'lucide-react'
import { foodly } from '../api'
import { useMe } from '../catalog/CatalogProvider'
import { ThemeSegment } from '../components/ThemeMenu'
import { FOCUS_RING } from '../components/focusRing'
import { ROW_DIVIDER } from '../components/rowDivider'
import { Page } from '../components/shell/Page'
import { profileName } from '../components/shell/profileName'

// Mockup `.card.set-card` and `.row.set`.
const CARD = 'mb-5 gap-0 px-1 py-0.5'
const ROW = cn('flex items-center gap-3.5 rounded-md p-3', ROW_DIVIDER)
const SECTION_HEADING = 'mb-2 text-xs font-semibold text-subtle-foreground'

export function Profile() {
  const me = useMe()
  const { name, initial } = profileName(me)

  return (
    <Page className="pb-10">
      <h1 className="sr-only">Profil & Einstellungen</h1>
      <div className="max-w-[640px]">
        {/* 22 px: mockup `.avatar.lg` and the profile's `.page-title` size, off the text scale. */}
        <div className="mb-6 flex items-center gap-4">
          <Avatar aria-hidden className="size-14">
            <AvatarFallback className="text-[22px] font-semibold">{initial}</AvatarFallback>
          </Avatar>
          <h2 className="min-w-0 truncate text-[22px] leading-[1.15] font-[650] tracking-[-0.025em]">{name}</h2>
        </div>

        <section aria-labelledby="profile-appearance">
          <h2 id="profile-appearance" className={SECTION_HEADING}>
            Darstellung
          </h2>
          <Card className={CARD}>
            {/* Wraps on very narrow phones (320 px) instead of pushing the segment out of the card. */}
            <div className={cn(ROW, 'flex-wrap gap-y-2')}>
              <span id="profile-design" className="min-w-0 flex-1 font-medium">
                Design
              </span>
              <ThemeSegment labelledBy="profile-design" />
            </div>
          </Card>
        </section>

        {/* The mockup shows this card without a heading; the sr-only one keeps it out of „Darstellung“ for
            heading navigation. */}
        <section aria-labelledby="profile-account">
          <h2 id="profile-account" className="sr-only">
            Konto
          </h2>
          <Card className={CARD}>
            <Link
              to="/categories"
              className={cn(ROW, 'font-medium hover:bg-hover focus-visible:ring-ring', FOCUS_RING)}
            >
              <span className="flex-1">Kategorien</span>
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </Link>
            {foodly.auth.canSignOut && (
              // No confirm, no toast: the guard takes over to /login at once (design spec „Abmelden“). text-base: the
              // Button's own text-sm would sit smaller than the link row above it.
              <Button
                variant="ghost"
                className={cn(
                  ROW,
                  'h-auto w-full justify-start text-base font-medium text-destructive hover:bg-transparent hover:text-destructive dark:hover:bg-transparent',
                )}
                onClick={() => void foodly.auth.signOut()}
              >
                Abmelden
              </Button>
            )}
          </Card>
        </section>
      </div>
    </Page>
  )
}
