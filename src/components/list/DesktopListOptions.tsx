// Desktop counterpart of MobileListOptions, right of the search: the sort button, a vertical divider and the view
// toggles, 6 px apart as in the mockup toolbar (.lb-right).
import type { ListState } from '../../list/state'
import { SortMenu } from './SortMenu'
import { ViewToggles } from './ViewToggles'

export function DesktopListOptions({
  state,
  set,
  showLayout = true,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  showLayout?: boolean
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <SortMenu state={state} set={set} />
      {/* Mockup .vsep: 1 px, inset 6 px from the 38 px row's top and bottom, 2 px extra on each side. */}
      <div aria-hidden data-testid="sort-view-divider" className="mx-0.5 h-[26px] w-px bg-border" />
      <ViewToggles state={state} set={set} showLayout={showLayout} />
    </div>
  )
}
