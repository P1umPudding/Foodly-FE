import { act, render } from '@testing-library/react'
import { hideSplash, setStatusBarStyle } from '../native/appShell'
import { ThemeProvider, useTheme } from './ThemeProvider'
import type { ColorMode } from './ThemeProvider'

vi.mock('../native/appShell', () => ({ hideSplash: vi.fn(), setStatusBarStyle: vi.fn() }))

let setColorMode: (mode: ColorMode) => void
function Probe() {
  setColorMode = useTheme().setColorMode
  return null
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('foodly-theme', 'dark')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider native shell', () => {
  it('hides the splash on mount and keeps the status bar in step with the theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(hideSplash).toHaveBeenCalledTimes(1)
    expect(setStatusBarStyle).toHaveBeenLastCalledWith('dark')

    act(() => setColorMode('light'))
    expect(setStatusBarStyle).toHaveBeenLastCalledWith('light')
    expect(hideSplash).toHaveBeenCalledTimes(1)
  })

  it('follows an OS switch while on system', () => {
    localStorage.setItem('foodly-theme', 'system')
    let onChange: ((e: MediaQueryListEvent) => void) | undefined
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: false,
          media: query,
          addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => (onChange = fn),
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(setStatusBarStyle).toHaveBeenLastCalledWith('light')

    act(() => onChange!({ matches: true } as MediaQueryListEvent))
    expect(setStatusBarStyle).toHaveBeenLastCalledWith('dark')
  })
})
