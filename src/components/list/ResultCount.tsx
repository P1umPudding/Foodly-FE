// Shows how many recipes are visible (loaded pages, narrowed by the client-side filters). There is no
// "x von y": the client never knows the real total (that needs a server count, backend B16). While
// more pages may follow, the count is a lower bound and reads "14+". The noun stays: on the desktop
// the count stands alone in the list header.
export function ResultCount({ count, more }: { count: number; more: boolean }) {
  // Nothing known yet: keep the span (on the desktop it is the only visible thing in its header row,
  // dropping it would shift the sticky header) but show and announce nothing.
  if (count === 0 && more) {
    return (
      <span aria-hidden className="invisible tabular-nums text-sm text-muted-foreground">
        0 Rezepte
      </span>
    )
  }
  const noun = count === 1 && !more ? 'Rezept' : 'Rezepte'
  return <span className="tabular-nums text-sm text-muted-foreground">{`${count}${more ? '+' : ''} ${noun}`}</span>
}
