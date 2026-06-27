// Shows how many recipes match. When nothing narrows the list (matching === total)
// the "von" carries no information, so we just show the plain total. The noun
// ("Rezepte") is dropped — the heading next to it already says what's counted.
export function ResultCount({ matching, total }: { matching: number; total: number }) {
  return (
    <span className="tabular-nums text-sm text-muted-foreground">
      {matching === total ? total : `${matching} von ${total}`}
    </span>
  )
}
