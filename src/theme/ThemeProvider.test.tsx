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
})
