// Frame of the sign-in pages: grey page, card in the upper third so the phone keyboard doesn't cover it.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageTitle } from '../PageTitle'
import { Skeleton } from '../Skeleton'
import { Brand } from '../shell/BrandMark'

// The skeleton renders as a div: while the page loads, the lazy route's fallback provides the main landmark.
function AuthFrame({ as: Frame = 'main', children }: { as?: 'main' | 'div'; children: ReactNode }) {
  return (
    <Frame className="min-h-screen bg-background pt-[12vh] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] pb-8 text-foreground">
      <div className="mx-auto w-full max-w-sm rounded-lg border bg-card p-6">{children}</div>
    </Frame>
  )
}

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <AuthFrame>
      <Brand className="mb-4 flex" />
      <PageTitle className="mb-6">{title}</PageTitle>
      {children}
      <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
    </AuthFrame>
  )
}

// The sign-in card while its page loads (lazy route): brand, title, two fields, the button.
export function AuthCardSkeleton() {
  return (
    <AuthFrame as="div">
      <Brand className="mb-4 flex" />
      <Skeleton className="mb-6 h-7 w-32" />
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-full touch:h-10" />
      </div>
    </AuthFrame>
  )
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    // Touch: inline-block so the padding adds to the line height of the text-sm parent (footer, field note: 18 px;
    // 18 + 2 × 11 = 40 px tap area; on a plain inline link it would add to the smaller font box); the negative margins
    // keep the line where it was. relative: in a field's error note the padding reaches into the (positioned) input
    // box, which would otherwise take those taps.
    <Link
      to={to}
      className="font-medium text-foreground underline underline-offset-4 touch:relative touch:-my-[11px] touch:inline-block touch:py-[11px]"
    >
      {children}
    </Link>
  )
}
