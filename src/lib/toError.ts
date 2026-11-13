// A caught value as an Error, so a non-Error throw still yields a readable message.
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}
