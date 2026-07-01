// Countdown display: `mm:ss`, or `h:mm:ss` once at least an hour remains. Rounds
// up so a freshly-started 5:00 timer reads "05:00", and a finished one "00:00".
export function formatRemaining(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
