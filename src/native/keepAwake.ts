// Keeps the screen on in the native app. The Android WebView and iOS < 18.4 have no Screen Wake Lock API, so the
// native shell always goes through the plugin; the web build never loads it.
// The plugin holds one global flag and doesn't count callers: one allowSleep() releases every holder. That is fine
// with one holder at a time (recipe page and cook mode are separate routes); a second simultaneous holder would need
// a counter. All calls run through one queue so a pending keepAwake() can't land after a later allowSleep().

let plugin: Promise<typeof import('@capacitor-community/keep-awake')> | null = null
const loadPlugin = () => (plugin ??= import('@capacitor-community/keep-awake'))

let queue: Promise<unknown> = Promise.resolve()
function run(op: () => Promise<void>): Promise<void> {
  const p = queue.then(op)
  queue = p.catch(() => {})
  return p
}

export function keepAwake(): Promise<void> {
  return run(async () => (await loadPlugin()).KeepAwake.keepAwake())
}

export function allowSleep(): Promise<void> {
  return run(async () => (await loadPlugin()).KeepAwake.allowSleep())
}
