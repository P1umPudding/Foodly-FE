import { useEffect, useState } from 'react'
import { socket, type SocketStatus } from '../api'

/** Live connection status of the shared backend socket. */
export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(socket.getStatus())
  useEffect(() => socket.onStatus(setStatus), [])
  return status
}
