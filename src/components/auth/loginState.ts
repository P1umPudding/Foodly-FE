// Router state from the guard to /login after an expired session. Router state, not a URL parameter, so
// the hint doesn't come back from a bookmark or shared link.
export type LoginState = { expired?: boolean; email?: string }

// history.state can hold anything (another app version, a manual pushState), so check the shape.
export function readLoginState(state: unknown): LoginState {
  if (typeof state !== 'object' || state === null) return {}
  const { expired, email } = state as Record<string, unknown>
  return { expired: expired === true, email: typeof email === 'string' ? email : undefined }
}
