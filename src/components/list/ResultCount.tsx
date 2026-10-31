// Shows how many recipes match. When nothing narrows the list (matching === total) the "von" carries no
// information, so we just show the total. The noun stays: on the desktop the count stands alone in the
// list header. After "von" the noun is dative ("3 von 12 Rezepten"), singular "Rezept" in both cases.
export function ResultCount({ matching, total }: { matching: number; total: number }) {
  const text =
    matching === total
      ? `${total} ${total === 1 ? 'Rezept' : 'Rezepte'}`
      : `${matching} von ${total} ${total === 1 ? 'Rezept' : 'Rezepten'}`
  return <span className="tabular-nums text-sm text-muted-foreground">{text}</span>
}
