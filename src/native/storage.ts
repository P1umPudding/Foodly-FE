// The signed-in session in the native app. iOS may clear the WebView's localStorage, which would sign the user out,
// so the native shell keeps it in Preferences (E5); the web build never loads the plugin. Writes run through one
// queue so the last write wins even when an earlier one resolves late.

const AUTH_KEY = 'foodly.auth'

let plugin: Promise<typeof import('@capacitor/preferences')> | null = null
const loadPlugin = () => (plugin ??= import('@capacitor/preferences'))

let queue: Promise<unknown> = Promise.resolve()
function run(op: () => Promise<void>): Promise<void> {
  const p = queue.then(op)
  queue = p.catch(() => {})
  return p
}

export async function loadAuth(): Promise<string | null> {
  const { Preferences } = await loadPlugin()
  return (await Preferences.get({ key: AUTH_KEY })).value ?? null
}

export function saveAuth(value: string | null): Promise<void> {
  return run(async () => {
    const { Preferences } = await loadPlugin()
    if (value === null) await Preferences.remove({ key: AUTH_KEY })
    else await Preferences.set({ key: AUTH_KEY, value })
  })
}
