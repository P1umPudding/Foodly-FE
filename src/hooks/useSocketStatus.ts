import { useEffect, useState } from 'react'
import { socket, type SocketStatus } from '../api'

/** Status of the shared socket (future live editing) — not REST/backend health. */
export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(socket.getStatus())
  useEffect(() => {
    // onStatus returns the unsubscribe, which is this effect's cleanup.
    return socket.onStatus(setStatus)
  }, [])
  return status
}
