// The two view toggles next to the sort menu on desktop — view (compact/detailed/tiles) and layout
// (by-category/flat), each its own icon-only segment, 6 px apart as in the mockup toolbar.
import type { ListState } from '../../list/state'
import { DETAIL_OPTIONS, LAYOUT_OPTIONS } from './listOptions'
import { Segment } from './Segment'

// 34 px segments make the 38 px track of the mockup toolbar, flush with the search and the sort button.
const TOOLBAR_ITEM = 'h-[34px] touch:h-10'

export function ViewToggles({
  state,
  set,
  showLayout = true,
}: {
  state: ListState
  set: (patch: Partial<ListState>) => void
  showLayout?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Segment
        aria-label="Ansicht"
        value={state.detail}
        onChange={(v) => set({ detail: v })}
        options={DETAIL_OPTIONS}
        itemClassName={TOOLBAR_ITEM}
      />
      {showLayout && (
        <Segment
          aria-label="Gliederung"
          value={state.grouped ? 'grouped' : 'flat'}
          onChange={(v) => set({ grouped: v === 'grouped' })}
          options={LAYOUT_OPTIONS}
          itemClassName={TOOLBAR_ITEM}
        />
      )}
    </div>
  )
}
