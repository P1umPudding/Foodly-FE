// The timer panel's duration field: "12" (minutes), "12:30" (mm:ss, as the countdown reads) or "0:12:00" (h:mm:ss).
// Not to be confused with parseDurations.ts, which finds times in recipe text.

const MAX_SECONDS = 23 * 3600 + 59 * 60 + 59

// Seconds, or null for anything that isn't a positive duration up to 23:59:59.
export function parseDurationInput(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  // Below the leading part, minutes and seconds are clock digits and must stay under 60.
  if (nums.slice(1).some((n) => n >= 60)) return null
  const [a, b = 0, c = 0] = nums
  const seconds = nums.length === 1 ? a * 60 : nums.length === 2 ? a * 60 + b : a * 3600 + b * 60 + c
  return seconds > 0 && seconds <= MAX_SECONDS ? seconds : null
}

export function formatDurationInput(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${h}:${pad(m)}:${pad(s)}`
}
