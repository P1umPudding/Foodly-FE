import { Star } from 'lucide-react';

// Quarter step → a Tailwind width utility. Literal class strings (not built at
// runtime) so Tailwind's scanner keeps them.
const FILL_WIDTH = {
  0: 'w-0',
  0.25: 'w-1/4',
  0.5: 'w-1/2',
  0.75: 'w-3/4',
  1: 'w-full',
} as const;

const STAR_SIZE = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

export type StarSize = keyof typeof STAR_SIZE;

function quarter(frac: number): keyof typeof FILL_WIDTH {
  return (Math.round(Math.min(1, Math.max(0, frac)) * 4) / 4) as keyof typeof FILL_WIDTH;
}

// A 0–5 star bar with quarter precision: each star is an empty base with a
// golden overlay clipped to its fill fraction. The overlay star is `shrink-0`
// so the clip cuts it off on the right instead of squashing it.
export function Stars({ value, size = 'sm' }: { value: number; size?: StarSize }) {
  const cls = STAR_SIZE[size];
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="relative inline-flex">
          <Star className={`${cls} text-muted-foreground/40`} />
          <span className={`absolute left-0 top-0 overflow-hidden ${FILL_WIDTH[quarter(value - i)]}`}>
            <Star className={`${cls} shrink-0 fill-current text-star`} />
          </span>
        </span>
      ))}
    </span>
  );
}
