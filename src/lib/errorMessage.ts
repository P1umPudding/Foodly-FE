// A caught value as UI text. Not built on toError: its String(value) would show "[object Object]" or
// "undefined"; a blank message is just as useless, so both fall back.
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.trim() !== '') return e.message
  if (typeof e === 'string' && e.trim() !== '') return e
  return fallback
}
