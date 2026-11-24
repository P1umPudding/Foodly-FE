import { act, render } from '@testing-library/react'
import { TimerPanelProvider, useTimerPanel } from './TimerPanelContext'

const tap = vi.hoisted(() => ({ handler: null as null | (() => void), stop: vi.fn() }))
vi.mock('../native/timerNotifications', () => ({
  onNotificationTap: (handler: () => void) => {
    tap.handler = handler
    return tap.stop
  },
}))

function OpenState() {
  return <p>{useTimerPanel()?.open ? 'open' : 'closed'}</p>
}

describe('TimerPanelProvider', () => {
  it('opens the panel when a timer notification is tapped', () => {
    const { container, unmount } = render(
      <TimerPanelProvider>
        <OpenState />
      </TimerPanelProvider>,
    )
    expect(container.textContent).toBe('closed')
    act(() => tap.handler!())
    expect(container.textContent).toBe('open')
    unmount()
    expect(tap.stop).toHaveBeenCalled()
  })
})
