import { useSyncExternalStore } from 'react'
import { foodly, type AuthSession } from '../api'

// Synchronous from localStorage, so the guard decides on the first render without a loading state.
export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(foodly.auth.subscribe, foodly.auth.session)
}
