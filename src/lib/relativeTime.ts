const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// "gerade eben", "vor 5 Minuten", "gestern", then the date. Under a minute, and any future time (clock skew between
// devices), reads as "gerade eben". Rendered once, not ticking: a stale "vor 1 Minute" is fine for comments.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < MINUTE) return 'gerade eben'
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  if (diff < 7 * DAY) return rtf.format(-Math.floor(diff / DAY), 'day')
  return then.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}
