import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { handleBack, registerBackButton } from './backButton'

// Mounted once in App.tsx. Registers on Android only; elsewhere it does nothing.
export function AndroidBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // The listener is registered once, so it reads the current route through a ref.
  const route = useRef({ navigate, pathname })
  useEffect(() => {
    route.current = { navigate, pathname }
  })

  useEffect(() => {
    const unregister = registerBackButton(({ canGoBack, exitApp }) => {
      handleBack({ ...route.current, canGoBack, exitApp })
    })
    return unregister
  }, [])
  return null
}
