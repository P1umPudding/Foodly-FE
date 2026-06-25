import { Star } from 'lucide-react';

const SIZE = 'h-4 w-4';

// Quarter step → a Tailwind width utility. Literal class strings (not built at
// runtime) so Tailwind's scanner keeps them.
const FILL_WIDTH = {
  0: 'w-0',
  0.25: 'w-1/4',
  0.5: 'w-1/2',
  0.75: 'w-3/4',
  1: 'w-full',
} as const;

function quarter(frac: number): keyof typeof FILL_WIDTH {
  return (Math.round(Math.min(1, Math.max(0, frac)) * 4) / 4) as keyof typeof FILL_WIDTH;
}

// A 0–5 star bar with quarter precision: each star is an empty base with a
// golden overlay clipped to its fill fraction via a width utility.
export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="relative inline-flex">
          <Star className={`${SIZE} text-muted-foreground`} />
          <span className={`absolute left-0 top-0 inline-flex overflow-hidden ${FILL_WIDTH[quarter(value - i)]}`}>
            <Star className={`${SIZE} fill-current text-amber-500`} />
          </span>
        </span>
      ))}
    </span>
  );
}
