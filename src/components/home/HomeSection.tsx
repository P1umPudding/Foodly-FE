// One section of the start page: heading with an optional link, and its loading / error / content states.
// An empty section renders nothing (design spec: empty sections hide themselves). Render it from the first
// render on, with state="loading" while fetching: a section that mounts late lets the "nothing to show" card
// show until it reports.
import { useId, type ReactNode } from 'react'
import { Skeleton } from '../Skeleton'
import { ErrorState } from '../StateCard'
import { SectionHeader } from '../SectionHeader'
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
    <section aria-labelledby={headingId} aria-busy={state === 'loading'} className="flex flex-col gap-3">
      <SectionHeader id={headingId} title={title} link={state === 'ready' ? link : undefined} />
      {state === 'loading' && (skeleton ?? <Skeleton data-testid="home-section-skeleton" className="h-24 w-full" />)}
      {state === 'error' && (
        <ErrorState title={`„${title}“ konnte nicht geladen werden`} description={errorMessage} onRetry={onRetry} />
      )}
      {state === 'ready' && children}
    </section>
  )
}
