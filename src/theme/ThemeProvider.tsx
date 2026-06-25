import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export type ColorMode = 'light' | 'dark' | 'system'
type ResolvedColorMode = 'light' | 'dark'

const STORAGE_KEY = 'foodly-theme'

type ThemeState = {
  colorMode: ColorMode
  resolvedColorMode: ResolvedColorMode
  setColorMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ColorMode): ResolvedColorMode {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

function readStored(): ColorMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore (private mode / disabled storage) */
  }
  return 'system'
}

function applyClass(resolved: ResolvedColorMode) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => readStored())
  const [resolvedColorMode, setResolved] = useState<ResolvedColorMode>(() => resolve(readStored()))

  // Apply the class + react to OS changes while on `system`.
  useEffect(() => {
    const r = resolve(colorMode)
    setResolved(r)
    applyClass(r)

    if (colorMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      const nr: ResolvedColorMode = e.matches ? 'dark' : 'light'
      setResolved(nr)
      applyClass(nr)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [colorMode])

  const setColorMode = useCallback((mode: ColorMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
    setColorModeState(mode)
  }, [])

  const value = useMemo(
    () => ({ colorMode, resolvedColorMode, setColorMode }),
    [colorMode, resolvedColorMode, setColorMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
