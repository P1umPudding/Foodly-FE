// Shows how many recipes match the current filter/search out of the total.
export function ResultCount({ matching, total }: { matching: number; total: number }) {
  return (
    <span className="tabular-nums text-sm text-muted-foreground" aria-label={`${matching} von ${total} Rezepten`}>
      {matching} / {total}
    </span>
  )
}
