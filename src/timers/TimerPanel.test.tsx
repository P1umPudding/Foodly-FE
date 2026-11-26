import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { TimerPanel } from './TimerPanel'
import { TimerProvider } from './TimerProvider'
import { TimerPanelProvider, useTimerPanel } from './TimerPanelContext'

vi.mock('../native/timerNotifications', () => ({
  startTimerNotifications: () => () => {},
  isActive: () => true,
  ensureNotificationPermission: () => {},
  onNotificationTap: () => () => {},
  notificationHint: () => Promise.resolve('denied'),
  allowExactNotifications: () => Promise.resolve(),
  onForeground: () => () => {},
}))

function OpenPanel() {
  const panel = useTimerPanel()
  useEffect(() => {
    panel?.setOpen(true)
  }, [panel])
  return null
}

beforeEach(() => {
  vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TimerPanel', () => {
  it('shows the notification hint in the open panel', async () => {
    render(
      <TooltipProvider>
        <TimerProvider userId={1}>
          <TimerPanelProvider>
            <TimerPanel />
            <OpenPanel />
          </TimerPanelProvider>
        </TimerProvider>
      </TooltipProvider>,
    )
    await screen.findByText(/Benachrichtigungen sind aus/)
  })
})
