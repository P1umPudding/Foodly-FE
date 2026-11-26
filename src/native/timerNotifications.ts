// Timer notifications for the native app. JS doesn't run reliably in the background (iOS suspends it), so on the
// way out every running timer gets a local notification at its end time, and on the way back in they are all
// cancelled again: in the foreground the in-app alarm rings, never both. Web: no-ops, no plugin is ever loaded.

import type { PluginListenerHandle } from '@capacitor/core'
import { isNative, platform } from './platform'

export type NotifiableTimer = {
  id: string
  label: string
  status: 'running' | 'paused' | 'expired'
  endAt: number | null
}

const CHANNEL_ID = 'timers'

let plugins: Promise<[typeof import('@capacitor/local-notifications'), typeof import('@capacitor/app')]> | null = null
const loadPlugins = () =>
  (plugins ??= Promise.all([import('@capacitor/local-notifications'), import('@capacitor/app')]))

// One chain for every scheduling call: a quick background → foreground switch must cancel only after the schedule
// has landed, or the notification would ring on top of the in-app alarm.
let queue: Promise<unknown> = Promise.resolve()
function enqueue(op: () => Promise<unknown>): void {
  queue = queue.then(op).catch(() => {})
}

let active = true

export function isActive(): boolean {
  return active
}

// Notification ids are int32 on both platforms; FNV-1a keeps the same timer on the same id.
export function notificationId(timerId: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < timerId.length; i++) {
    hash ^= timerId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash & 0x7fffffff || 1
}

async function cancelPending(): Promise<void> {
  const [{ LocalNotifications }] = await loadPlugins()
  const { notifications } = await LocalNotifications.getPending()
  if (notifications.length > 0)
    await LocalNotifications.cancel({ notifications: notifications.map(({ id }) => ({ id })) })
}

async function scheduleRunning(timers: NotifiableTimer[]): Promise<void> {
  // A timer that ended in the last tick interval still counts: both platforms deliver a past `at` right away.
  const due = timers.filter((t): t is NotifiableTimer & { endAt: number } => t.status === 'running' && t.endAt !== null)
  if (due.length === 0) return
  const [{ LocalNotifications }] = await loadPlugins()
  // schedule() would open the permission dialog itself; that is only asked for on a timer start.
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
  const android = platform() === 'android'
  // Without "Alarms & reminders" Android's schedule() opens that settings screen on every trip to the
  // background; inexact is the agreed fallback (E4).
  const exact = !android || (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
  await LocalNotifications.schedule({
    notifications: due.map((t) => ({
      id: notificationId(t.id),
      title: 'Foodly',
      body: t.label.trim() ? `${t.label.trim()} ist fertig` : 'Timer ist fertig',
      channelId: CHANNEL_ID,
      schedule: { at: new Date(t.endAt), allowWhileIdle: true },
      ...(android ? { isExactNotification: exact } : { sound: 'default' }), // iOS is silent without a sound
    })),
  })
}

// Runs for the lifetime of a TimerProvider. `onBecameActive` runs before the cancel, synchronously in the event,
// so a timer that ended in the background is settled before the next tick could ring for it.
export function startTimerNotifications({
  getTimers,
  onBecameActive,
}: {
  getTimers: () => NotifiableTimer[]
  onBecameActive: () => void
}): () => void {
  if (!isNative()) return () => {}
  let disposed = false
  let handle: PluginListenerHandle | null = null

  enqueue(async () => {
    const [{ LocalNotifications }] = await loadPlugins()
    if (platform() === 'android') {
      await LocalNotifications.createChannel({ id: CHANNEL_ID, name: 'Timer', importance: 5, vibration: true })
    }
    // Leftovers from a previous run (the app was killed in the background).
    await cancelPending()
  })

  void loadPlugins()
    .then(async ([, { App }]) => {
      // A provider mounted after a sign-out in the background gets no event for the return, so read the state.
      const state = await App.getState()
      if (!disposed) active = state.isActive
      return App.addListener('appStateChange', ({ isActive: nowActive }) => {
        if (disposed) return
        active = nowActive
        if (nowActive) {
          onBecameActive()
          enqueue(cancelPending)
        } else {
          enqueue(() => (disposed ? Promise.resolve() : scheduleRunning(getTimers())))
        }
      })
    })
    .then((h) => {
      if (disposed) void h.remove()
      else handle = h
    })
    .catch(() => {})

  return () => {
    disposed = true
    void handle?.remove()
    enqueue(async () => {
      await cancelPending()
      // Sign-out or user switch: no lock-screen notification may name the previous user's timers.
      const [{ LocalNotifications }] = await loadPlugins()
      await LocalNotifications.removeAllDeliveredNotifications()
    })
  }
}

let permissionRequest: Promise<unknown> | null = null

// On a timer start (E9): ask only while the user hasn't decided yet. Outside the queue, so an open dialog never
// holds back scheduling; the timer runs either way.
export function ensureNotificationPermission(): void {
  if (!isNative() || permissionRequest) return
  permissionRequest = loadPlugins()
    .then(async ([{ LocalNotifications }]) => {
      if ((await LocalNotifications.checkPermissions()).display === 'prompt')
        await LocalNotifications.requestPermissions()
    })
    .catch(() => {})
    .finally(() => {
      permissionRequest = null
    })
}

export function onNotificationTap(handler: () => void): () => void {
  if (!isNative()) return () => {}
  let disposed = false
  let handle: PluginListenerHandle | null = null
  void loadPlugins()
    .then(([{ LocalNotifications }]) =>
      LocalNotifications.addListener('localNotificationActionPerformed', () => {
        if (!disposed) handler()
      }),
    )
    .then((h) => {
      if (disposed) void h.remove()
      else handle = h
    })
    .catch(() => {})
  return () => {
    disposed = true
    void handle?.remove()
  }
}

export type NotificationHint = 'ok' | 'denied' | 'inexact'

// What the timer panel should warn about. Not in the scheduling queue: it may run any time the panel is open.
// `prompt` is not a problem yet: the next timer start asks (E9).
export async function notificationHint(): Promise<NotificationHint> {
  if (!isNative()) return 'ok'
  try {
    const [{ LocalNotifications }] = await loadPlugins()
    if ((await LocalNotifications.checkPermissions()).display === 'denied') return 'denied'
    // iOS has no exact-alarm setting; the plugin rejects the call there.
    if (platform() !== 'android') return 'ok'
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting()
    return exact_alarm === 'granted' ? 'ok' : 'inexact'
  } catch {
    return 'ok'
  }
}

// Opens Android's "Alarms & reminders" screen; resolves once the user is back.
export async function allowExactNotifications(): Promise<void> {
  if (!isNative() || platform() !== 'android') return
  try {
    const [{ LocalNotifications }] = await loadPlugins()
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    // Nothing to do: the next check shows the hint again.
  }
}

export function onForeground(handler: () => void): () => void {
  if (!isNative()) return () => {}
  let disposed = false
  let handle: PluginListenerHandle | null = null
  void loadPlugins()
    .then(([, { App }]) =>
      App.addListener('appStateChange', ({ isActive: nowActive }) => {
        if (nowActive && !disposed) handler()
      }),
    )
    .then((h) => {
      if (disposed) void h.remove()
      else handle = h
    })
    .catch(() => {})
  return () => {
    disposed = true
    void handle?.remove()
  }
}
