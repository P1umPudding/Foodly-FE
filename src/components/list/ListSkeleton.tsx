// Loading placeholders of the recipe list and the category page, in the shape of the chosen view.
import { Skeleton } from '@postxl/ui-components'
import type { DetailView } from '../../list/state'
import { TILE_META_TEXT, TILE_TITLE_TEXT } from '../recipe/RecipeTile'
import { GroupIndent, TileGrid } from './RecipeListView'

// Laid out like a photo RecipeTile: each bar sits in a box one text line of the tile tall.
export function TileSkeleton() {
  return (
    <div data-testid="tile-skeleton" className="flex min-w-0 flex-col gap-2">
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className={`flex h-lh items-center ${TILE_TITLE_TEXT}`}>
          <Skeleton data-testid="tile-skeleton-line" className="h-4 w-3/4 rounded-sm" />
        </div>
        <div className={`flex h-lh items-center ${TILE_META_TEXT}`}>
          <Skeleton data-testid="tile-skeleton-line" className="h-3 w-1/2 rounded-sm" />
        </div>
      </div>
    </div>
  )
}

// Placeholders in the shape of the chosen view, so nothing jumps when the recipes arrive.
export function ListSkeleton({
  detail,
  count,
  testId,
  oneRow = false,
  denseTiles = false,
}: {
  detail: DetailView
  count: number
  testId?: string
  oneRow?: boolean
  denseTiles?: boolean
}) {
  const items = Array.from({ length: count }, (_, i) => i)
  if (detail === 'tiles') {
    return (
      <div data-testid={testId}>
        <TileGrid oneRow={oneRow} dense={denseTiles}>
          {items.map((i) => (
            <TileSkeleton key={i} />
          ))}
        </TileGrid>
      </div>
    )
  }
  // Same pitch as the flat rows (34 / 60 px without photo; compact 40 on touch): bar plus a small gap, so the bars
  // don't merge into one block.
  const compact = detail === 'compact'
  return (
    <div data-testid={testId} className={compact ? 'space-y-0.5' : 'space-y-1'}>
      {items.map((i) => (
        <Skeleton
          key={i}
          data-testid="row-skeleton"
          className={`w-full rounded-md ${compact ? 'h-8 touch:h-[38px]' : 'h-14'}`}
        />
      ))}
    </div>
  )
}

export function LoadMoreSkeleton({
  detail,
  grouped,
  denseTiles = false,
}: {
  detail: DetailView
  grouped: boolean
  denseTiles?: boolean
}) {
  if (detail !== 'tiles') {
    return (
      <div className="pt-1">
        <ListSkeleton detail={detail} count={1} testId="list-more-skeleton" />
      </div>
    )
  }
  // One row, as many tiles as the grid has columns (the max-w-6xl column fits at most 4, the dense grid 5).
  const tiles = (
    <ListSkeleton
      detail="tiles"
      count={denseTiles ? 5 : 4}
      denseTiles={denseTiles}
      testId="list-more-skeleton"
      oneRow
    />
  )
  // Grouped: indented like a group's grid, so the skeleton columns match the tiles above.
  return (
    <div className={`${denseTiles ? 'pt-6' : 'pt-7'} phone:pt-5`}>
      {grouped ? <GroupIndent lineless>{tiles}</GroupIndent> : tiles}
    </div>
  )
}
