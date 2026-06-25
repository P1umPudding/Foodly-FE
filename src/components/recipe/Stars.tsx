import { Star } from 'lucide-react';

const SIZE = 'h-4 w-4';

// Round a single star's fill to the nearest quarter (0 / .25 / .5 / .75 / 1).
function quarter(frac: number): 0 | 0.25 | 0.5 | 0.75 | 1 {
  return (Math.round(Math.min(1, Math.max(0, frac)) * 4) / 4) as 0 | 0.25 | 0.5 | 0.75 | 1;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="recipe-star" data-fill={quarter(value - i)}>
          <Star className={`${SIZE} text-muted-foreground`} />
          <span className="recipe-star__fill">
            <Star className={`${SIZE} fill-current`} />
          </span>
        </span>
      ))}
    </span>
  );
}
