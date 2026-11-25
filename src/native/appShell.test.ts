const m = vi.hoisted(() => ({
  SplashScreen: { hide: vi.fn(() => Promise.resolve()) },
  StatusBar: { setStyle: vi.fn((_: { style: string }) => Promise.resolve()) },
  Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}))

vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: m.SplashScreen }))
vi.mock('@capacitor/status-bar', () => ({ StatusBar: m.StatusBar, Style: m.Style }))

async function load(shell: 'native' | 'web' = 'native') {
  if (shell === 'native') vi.stubGlobal('Capacitor', { isNativePlatform: () => true, getPlatform: () => 'android' })
  vi.resetModules()
  return import('./appShell')
}

// Lets the dynamic imports and the promise chains behind them settle.
async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
  await vi.dynamicImportSettled()
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('appShell', () => {
  it('does nothing on the web', async () => {
    const shell = await load('web')
    shell.startSplash()
    shell.hideSplash()
    shell.setStatusBarStyle('dark')
    await settle(3000)

    expect(m.SplashScreen.hide).not.toHaveBeenCalled()
    expect(m.StatusBar.setStyle).not.toHaveBeenCalled()
  })

  it('hides the splash after 3 s when the app never renders', async () => {
    const { startSplash } = await load()
    startSplash()
    await settle(2999)
    expect(m.SplashScreen.hide).not.toHaveBeenCalled()

    await settle(1)
    expect(m.SplashScreen.hide).toHaveBeenCalledTimes(1)
  })

  it('hides the splash once on render, also when called twice and after the fallback time', async () => {
    const { startSplash, hideSplash } = await load()
    startSplash()
    hideSplash()
    hideSplash()
    await settle()
    expect(m.SplashScreen.hide).toHaveBeenCalledTimes(1)

    await settle(3000)
    expect(m.SplashScreen.hide).toHaveBeenCalledTimes(1)
  })

  it('schedules no fallback after an early hide or a second start', async () => {
    const { startSplash, hideSplash } = await load()
    hideSplash()
    startSplash()
    startSplash()
    await settle(3000)

    expect(m.SplashScreen.hide).toHaveBeenCalledTimes(1)
  })

  it('retries the hide once via the fallback when the first hide fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    m.SplashScreen.hide.mockRejectedValueOnce(new Error('bridge down'))
    const { startSplash, hideSplash } = await load()
    startSplash()
    hideSplash()
    await settle()
    expect(error).toHaveBeenCalledTimes(1)

    await settle(3000)
    expect(m.SplashScreen.hide).toHaveBeenCalledTimes(2)
  })

  it('maps the theme to the status-bar style, in call order', async () => {
    const { setStatusBarStyle } = await load()
    setStatusBarStyle('dark')
    setStatusBarStyle('light')
    await settle()

    expect(m.StatusBar.setStyle.mock.calls).toEqual([[{ style: 'DARK' }], [{ style: 'LIGHT' }]])
  })
})
