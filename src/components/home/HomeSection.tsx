// One section of the start page: heading with an optional link, and its loading / error / content states.
// An empty section renders nothing (design spec: empty sections hide themselves).
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Skeleton } from '@postxl/ui-components'
import { RetryAlert } from '../RetryAlert'
import { useReportSection, type SectionState } from './HomeSections'

export function HomeSection({
  title,
  link,
  state,
  onRetry,
  errorMessage,
  skeleton,
  children,
}: {
  title: string
  link?: { label: string; to: string }
  state: SectionState
  onRetry: () => void
  errorMessage?: string
  skeleton?: ReactNode
  children?: ReactNode
}) {
  useReportSection(state)
  const headingId = useId()
  if (state === 'empty') return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {state === 'ready' && link && (
          <Button asChild variant="link" size="sm">
            <Link to={link.to}>{link.label}</Link>
          </Button>
        )}
      </div>
      {state === 'loading' && (skeleton ?? <Skeleton data-testid="home-section-skeleton" className="h-24 w-full" />)}
      {state === 'error' && <RetryAlert title={`Konnte „${title}“ nicht laden`} message={errorMessage} onRetry={onRetry} />}
      {state === 'ready' && children}
    </section>
  )
}
