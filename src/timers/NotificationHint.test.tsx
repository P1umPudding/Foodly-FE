import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationHint } from './NotificationHint'
import { allowExactNotifications, notificationHint, onForeground } from '../native/timerNotifications'

vi.mock('../native/timerNotifications', () => ({
  notificationHint: vi.fn(),
  allowExactNotifications: vi.fn(() => Promise.resolve()),
  onForeground: vi.fn(() => () => {}),
}))

const DENIED = /Benachrichtigungen sind aus/
const INEXACT = /um einige Minuten verspäten/
const BUTTON = { name: 'Genaue Wecker erlauben' }

beforeEach(() => {
  vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('NotificationHint', () => {
  it('says notifications are off, without a button', async () => {
    vi.mocked(notificationHint).mockResolvedValue('denied')
    render(<NotificationHint />)
    await screen.findByText(DENIED)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('warns about late timers and opens the exact-alarm setting', async () => {
    vi.mocked(notificationHint).mockResolvedValue('inexact')
    render(<NotificationHint />)
    await screen.findByText(INEXACT)
    vi.mocked(notificationHint).mockResolvedValue('ok')
    fireEvent.click(screen.getByRole('button', BUTTON))
    expect(allowExactNotifications).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(screen.queryByText(INEXACT)).toBeNull())
  })

  it('shows nothing when all is well', async () => {
    vi.mocked(notificationHint).mockResolvedValue('ok')
    const { container } = render(<NotificationHint />)
    await act(() => Promise.resolve())
    expect(notificationHint).toHaveBeenCalledTimes(1)
    expect(container.innerHTML).toBe('')
  })

  it('checks again on the return to the foreground', async () => {
    vi.mocked(notificationHint).mockResolvedValue('inexact')
    render(<NotificationHint />)
    await screen.findByText(INEXACT)
    const onBack = vi.mocked(onForeground).mock.calls[0][0]
    vi.mocked(notificationHint).mockResolvedValue('ok')
    act(() => onBack())
    await vi.waitFor(() => expect(screen.queryByText(INEXACT)).toBeNull())
  })

  it('keeps only the newest result', async () => {
    let resolveFirst: (h: 'denied') => void = () => {}
    vi.mocked(notificationHint).mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
    vi.mocked(notificationHint).mockResolvedValue('ok')
    const { container } = render(<NotificationHint />)
    act(() => vi.mocked(onForeground).mock.calls[0][0]())
    await act(() => Promise.resolve())
    await act(async () => resolveFirst('denied'))
    expect(container.innerHTML).toBe('')
  })

  it('stops listening when the panel closes', () => {
    const stop = vi.fn()
    vi.mocked(onForeground).mockReturnValueOnce(stop)
    vi.mocked(notificationHint).mockReturnValue(new Promise(() => {}))
    const { unmount } = render(<NotificationHint />)
    unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('shows nothing and checks nothing on the web', () => {
    vi.unstubAllGlobals()
    const { container } = render(<NotificationHint />)
    expect(container.innerHTML).toBe('')
    expect(notificationHint).not.toHaveBeenCalled()
    expect(onForeground).not.toHaveBeenCalled()
  })
})
