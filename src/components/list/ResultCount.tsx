// Shows how many recipes match. When nothing narrows the list (matching === total)
// the "von" carries no information, so we just show the plain total.
export function ResultCount({ matching, total }: { matching: number; total: number }) {
  return (
    <span className="tabular-nums text-sm text-muted-foreground">
      {matching === total ? `${total} Rezepte` : `${matching} von ${total} Rezepten`}
    </span>
  )
}
