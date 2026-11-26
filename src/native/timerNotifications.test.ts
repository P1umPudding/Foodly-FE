import type { NotifiableTimer } from './timerNotifications'

const m = vi.hoisted(() => {
  const state = {
    pending: [] as { id: number }[],
    display: 'granted' as string,
    exact: 'granted' as string,
    appHandler: null as null | ((e: { isActive: boolean }) => void),
    tapHandler: null as null | (() => void),
    loaded: 0,
  }
  const handle = { remove: vi.fn(() => Promise.resolve()) }
  const LocalNotifications = {
    createChannel: vi.fn(() => Promise.resolve()),
    getPending: vi.fn(() => Promise.resolve({ notifications: [...state.pending] })),
    cancel: vi.fn(({ notifications }: { notifications: { id: number }[] }) => {
      state.pending = state.pending.filter((p) => !notifications.some((n) => n.id === p.id))
      return Promise.resolve()
    }),
    schedule: vi.fn(({ notifications }: { notifications: ({ id: number } & Record<string, unknown>)[] }) => {
      state.pending.push(...notifications.map(({ id }) => ({ id })))
      return Promise.resolve({ notifications })
    }),
    checkPermissions: vi.fn(() => Promise.resolve({ display: state.display })),
    requestPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
    removeAllDeliveredNotifications: vi.fn(() => Promise.resolve()),
    checkExactNotificationSetting: vi.fn(() => Promise.resolve({ exact_alarm: state.exact })),
    changeExactNotificationSetting: vi.fn(() => Promise.resolve({ exact_alarm: 'granted' })),
    addListener: vi.fn((_: string, fn: () => void) => {
      state.tapHandler = fn
      return Promise.resolve(handle)
    }),
  }
  const App = {
    getState: vi.fn(() => Promise.resolve({ isActive: true })),
    addListener: vi.fn((_: string, fn: (e: { isActive: boolean }) => void) => {
      state.appHandler = fn
      return Promise.resolve(handle)
    }),
  }
  return { state, handle, LocalNotifications, App }
})

vi.mock('@capacitor/local-notifications', () => {
  m.state.loaded++
  return { LocalNotifications: m.LocalNotifications }
})
vi.mock('@capacitor/app', () => {
  m.state.loaded++
  return { App: m.App }
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const NOW = new Date('2026-11-24T12:00:00Z').getTime()

async function load(shell: 'android' | 'ios' | 'web' = 'android') {
  if (shell !== 'web') vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => shell })
  vi.resetModules()
  return import('./timerNotifications')
}

const timer = (over: Partial<NotifiableTimer>): NotifiableTimer => ({
  id: 'a',
  label: 'Nudeln',
  status: 'running',
  endAt: NOW + 60_000,
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  Object.assign(m.state, { pending: [], display: 'granted', exact: 'granted', appHandler: null, tapHandler: null })
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('timerNotifications', () => {
  it('schedules every running timer on the way to the background', async () => {
    const { startTimerNotifications, notificationId } = await load()
    const timers = [
      timer({ id: 'a' }),
      timer({ id: 'b', label: '  ', endAt: NOW + 120_000 }),
      timer({ id: 'c', status: 'paused', endAt: null }),
      timer({ id: 'd', status: 'expired', endAt: null }),
      timer({ id: 'e', endAt: NOW - 1 }),
    ]
    startTimerNotifications({ getTimers: () => timers, onBecameActive: () => {} })
    await flush()
    m.state.appHandler!({ isActive: false })
    await flush()

    expect(m.LocalNotifications.schedule).toHaveBeenCalledTimes(1)
    const { notifications } = m.LocalNotifications.schedule.mock.calls[0][0]
    expect(notifications).toEqual([
      expect.objectContaining({
        id: notificationId('a'),
        title: 'Foodly',
        body: 'Nudeln ist fertig',
        channelId: 'timers',
        schedule: { at: new Date(NOW + 60_000), allowWhileIdle: true },
        isExactNotification: true,
      }),
      expect.objectContaining({ id: notificationId('b'), body: 'Timer ist fertig' }),
      expect.objectContaining({ id: notificationId('e'), schedule: { at: new Date(NOW - 1), allowWhileIdle: true } }),
    ])
  })

  it('cancels every scheduled notification on return, also right after leaving', async () => {
    const { startTimerNotifications, isActive, notificationId } = await load()
    const onBecameActive = vi.fn()
    startTimerNotifications({ getTimers: () => [timer({ id: 'a' }), timer({ id: 'b' })], onBecameActive })
    await flush()

    // No await in between: the cancel must still land after the schedule.
    m.state.appHandler!({ isActive: false })
    expect(isActive()).toBe(false)
    m.state.appHandler!({ isActive: true })
    expect(isActive()).toBe(true)
    expect(onBecameActive).toHaveBeenCalledTimes(1)
    await flush()

    expect(m.LocalNotifications.schedule).toHaveBeenCalledTimes(1)
    expect(m.LocalNotifications.cancel).toHaveBeenLastCalledWith({
      notifications: [{ id: notificationId('a') }, { id: notificationId('b') }],
    })
    expect(m.state.pending).toEqual([])
  })

  it('creates the Android channel before cancelling leftovers on start, and cancels on cleanup', async () => {
    const { startTimerNotifications } = await load()
    m.state.pending = [{ id: 7 }]
    const stop = startTimerNotifications({ getTimers: () => [], onBecameActive: () => {} })
    await flush()
    expect(m.LocalNotifications.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'timers', importance: 5, vibration: true }),
    )
    expect(m.LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 7 }] })

    m.state.pending = [{ id: 8 }]
    stop()
    await flush()
    expect(m.LocalNotifications.cancel).toHaveBeenLastCalledWith({ notifications: [{ id: 8 }] })
    expect(m.LocalNotifications.removeAllDeliveredNotifications).toHaveBeenCalledTimes(1)
    expect(m.handle.remove).toHaveBeenCalled()
  })

  it('reads the app state on start, after a provider ended in the background', async () => {
    const { startTimerNotifications, isActive } = await load()
    const stop = startTimerNotifications({ getTimers: () => [], onBecameActive: () => {} })
    await flush()
    m.state.appHandler!({ isActive: false })
    stop()
    expect(isActive()).toBe(false)

    startTimerNotifications({ getTimers: () => [], onBecameActive: () => {} })
    await flush()
    expect(isActive()).toBe(true)
  })

  it('ignores app state changes after cleanup', async () => {
    const { startTimerNotifications } = await load()
    const stop = startTimerNotifications({ getTimers: () => [timer({})], onBecameActive: () => {} })
    await flush()
    stop()
    m.state.appHandler!({ isActive: false })
    await flush()
    expect(m.LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('schedules inexact without the exact-alarm permission', async () => {
    const { startTimerNotifications } = await load()
    m.state.exact = 'denied'
    startTimerNotifications({ getTimers: () => [timer({})], onBecameActive: () => {} })
    await flush()
    m.state.appHandler!({ isActive: false })
    await flush()
    expect(m.LocalNotifications.schedule.mock.calls[0][0].notifications[0].isExactNotification).toBe(false)
  })

  it('schedules nothing without notification permission', async () => {
    const { startTimerNotifications } = await load()
    m.state.display = 'denied'
    startTimerNotifications({ getTimers: () => [timer({})], onBecameActive: () => {} })
    await flush()
    m.state.appHandler!({ isActive: false })
    await flush()
    expect(m.LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('on iOS skips the channel and the exact check and sets a sound', async () => {
    const { startTimerNotifications } = await load('ios')
    startTimerNotifications({ getTimers: () => [timer({})], onBecameActive: () => {} })
    await flush()
    m.state.appHandler!({ isActive: false })
    await flush()
    expect(m.LocalNotifications.createChannel).not.toHaveBeenCalled()
    expect(m.LocalNotifications.checkExactNotificationSetting).not.toHaveBeenCalled()
    const [n] = m.LocalNotifications.schedule.mock.calls[0][0].notifications
    expect(n.sound).toBe('default')
    expect(n).not.toHaveProperty('isExactNotification')
  })

  it.each([
    ['prompt', 1],
    ['granted', 0],
    ['denied', 0],
  ])('asks for permission on a timer start only while undecided (%s)', async (display, requests) => {
    const { ensureNotificationPermission } = await load()
    m.state.display = display
    ensureNotificationPermission()
    ensureNotificationPermission()
    await flush()
    expect(m.LocalNotifications.requestPermissions).toHaveBeenCalledTimes(requests)
  })

  it('swallows a failing permission request', async () => {
    const { ensureNotificationPermission } = await load()
    m.state.display = 'prompt'
    m.LocalNotifications.requestPermissions.mockRejectedValueOnce(new Error('denied'))
    expect(() => ensureNotificationPermission()).not.toThrow()
    await flush()
    // The guard is released again, so a later start can still ask.
    ensureNotificationPermission()
    await flush()
    expect(m.LocalNotifications.requestPermissions).toHaveBeenCalledTimes(2)
  })

  it('reports a tap on a notification', async () => {
    const { onNotificationTap } = await load()
    const onTap = vi.fn()
    const stop = onNotificationTap(onTap)
    await flush()
    expect(m.LocalNotifications.addListener).toHaveBeenCalledWith(
      'localNotificationActionPerformed',
      expect.any(Function),
    )
    m.state.tapHandler!()
    expect(onTap).toHaveBeenCalledTimes(1)
    stop()
    expect(m.handle.remove).toHaveBeenCalled()
    m.state.tapHandler!()
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('never loads a plugin on the web', async () => {
    m.state.loaded = 0
    const mod = await load('web')
    const stop = mod.startTimerNotifications({ getTimers: () => [timer({})], onBecameActive: () => {} })
    mod.ensureNotificationPermission()
    const stopTap = mod.onNotificationTap(() => {})
    stop()
    stopTap()
    await flush()
    expect(mod.isActive()).toBe(true)
    expect(m.state.loaded).toBe(0)
  })

  it('maps a timer id to a stable positive int32', async () => {
    const { notificationId } = await load()
    for (const id of ['3f1c2a9e-8d7b-4c6a-9e5f-1a2b3c4d5e6f', 'a', '']) {
      const n = notificationId(id)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(0x7fffffff)
      expect(notificationId(id)).toBe(n)
    }
    expect(notificationId('a')).not.toBe(notificationId('b'))
  })
})

describe('notification hint', () => {
  it('is denied without notification permission, without the exact check', async () => {
    m.state.display = 'denied'
    m.state.exact = 'denied'
    const { notificationHint } = await load()
    expect(await notificationHint()).toBe('denied')
    expect(m.LocalNotifications.checkExactNotificationSetting).not.toHaveBeenCalled()
  })

  it('is inexact on Android without exact alarms, also before the permission is asked for', async () => {
    m.state.exact = 'denied'
    const { notificationHint } = await load()
    expect(await notificationHint()).toBe('inexact')
    m.state.display = 'prompt'
    expect(await notificationHint()).toBe('inexact')
  })

  it('is denied after a first refusal on Android (prompt-with-rationale)', async () => {
    m.state.display = 'prompt-with-rationale'
    const { notificationHint } = await load()
    expect(await notificationHint()).toBe('denied')
  })

  it('is ok with both permissions', async () => {
    const { notificationHint } = await load()
    expect(await notificationHint()).toBe('ok')
  })

  it('never checks exact alarms on iOS', async () => {
    m.state.exact = 'denied'
    const { notificationHint } = await load('ios')
    expect(await notificationHint()).toBe('ok')
    m.state.display = 'prompt'
    expect(await notificationHint()).toBe('ok')
    m.state.display = 'denied'
    expect(await notificationHint()).toBe('denied')
    expect(m.LocalNotifications.checkExactNotificationSetting).not.toHaveBeenCalled()
  })

  it('is ok when the plugin fails', async () => {
    m.LocalNotifications.checkPermissions.mockRejectedValueOnce(new Error('boom'))
    const { notificationHint } = await load()
    expect(await notificationHint()).toBe('ok')
  })

  it('is checked again on the return to the foreground', async () => {
    m.state.exact = 'denied'
    const { notificationHint, onForeground } = await load()
    expect(await notificationHint()).toBe('inexact')
    const onBack = vi.fn()
    const stop = onForeground(onBack)
    await flush()
    m.state.exact = 'granted'
    m.state.appHandler!({ isActive: false })
    expect(onBack).not.toHaveBeenCalled()
    m.state.appHandler!({ isActive: true })
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(await notificationHint()).toBe('ok')
    stop()
    expect(m.handle.remove).toHaveBeenCalled()
    m.state.appHandler!({ isActive: true })
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('opens the exact-alarm setting only on Android', async () => {
    const android = await load()
    await android.allowExactNotifications()
    expect(m.LocalNotifications.changeExactNotificationSetting).toHaveBeenCalledTimes(1)
    const ios = await load('ios')
    await ios.allowExactNotifications()
    expect(m.LocalNotifications.changeExactNotificationSetting).toHaveBeenCalledTimes(1)
  })

  it('never loads a plugin on the web', async () => {
    m.state.loaded = 0
    const mod = await load('web')
    expect(await mod.notificationHint()).toBe('ok')
    await mod.allowExactNotifications()
    mod.onForeground(() => {})()
    await flush()
    expect(m.state.loaded).toBe(0)
  })
})
