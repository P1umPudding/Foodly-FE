import { StrictMode, useState, type ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
} from '@postxl/ui-components'
import { BottomSheet } from '../components/BottomSheet'
import { Lightbox } from '../components/recipe/Lightbox'
import { ref } from '../test/images'
import { AndroidBackButton } from './AndroidBackButton'
import { topOverlay } from './backButton'

type BackListener = (event: { canGoBack: boolean }) => void

const plugin = vi.hoisted(() => {
  const listeners = new Set<BackListener>()
  return {
    listeners,
    exitApp: vi.fn(() => Promise.resolve()),
    addListener: vi.fn((_event: 'backButton', listener: BackListener) => {
      listeners.add(listener)
      return Promise.resolve({ remove: () => Promise.resolve(void listeners.delete(listener)) })
    }),
  }
})

vi.mock('@capacitor/app', () => ({ App: { addListener: plugin.addListener, exitApp: plugin.exitApp } }))

function onPlatform(name: string) {
  vi.stubGlobal('Capacitor', { isNativePlatform: () => name !== 'web', getPlatform: () => name })
}

// Lets the dynamic import and addListener settle.
async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function pressBack(canGoBack = true) {
  expect(plugin.listeners.size).toBe(1)
  await act(async () => {
    for (const listener of plugin.listeners) listener({ canGoBack })
    await Promise.resolve()
  })
}

function Path() {
  return <output aria-label="path">{useLocation().pathname}</output>
}

async function renderAt(entries: string[], page: ReactNode = null) {
  const result = render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1} useTransitions={false}>
      <AndroidBackButton />
      <Path />
      <Routes>
        <Route path="*" element={page} />
      </Routes>
    </MemoryRouter>,
  )
  await flush()
  return result
}

const path = () => screen.getByLabelText('path').textContent

beforeEach(() => {
  onPlatform('android')
})

afterEach(() => {
  vi.unstubAllGlobals()
  plugin.listeners.clear()
  plugin.addListener.mockClear()
  plugin.exitApp.mockClear()
})

describe('Android back button with an open overlay', () => {
  it('closes a dialog and stays on the page', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Titel</DialogTitle>
          <DialogDescription>Text</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(path()).toBe('/recipes/1')
    expect(plugin.exitApp).not.toHaveBeenCalled()
  })

  it('closes an alert dialog', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Löschen?</AlertDialogTitle>
          <AlertDialogDescription>Text</AlertDialogDescription>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    )
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('closes a bottom sheet', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <Sheet defaultOpen>
        <BottomSheet title="Zutaten" description="Liste">
          Inhalt
        </BottomSheet>
      </Sheet>,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('closes a dropdown menu', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Eintrag</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.getByRole('menu')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('closes an open select', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <Select defaultOpen>
        <SelectTrigger aria-label="Sortierung">
          <SelectValue placeholder="Sortierung" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    )
    expect(screen.getByRole('listbox')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('closes the lightbox', async () => {
    function Photos() {
      const [open, setOpen] = useState(true)
      return open ? (
        <Lightbox images={[ref(1)]} index={0} onIndexChange={() => {}} onClose={() => setOpen(false)} />
      ) : null
    }
    await renderAt(['/recipes', '/recipes/1'], <Photos />)
    expect(screen.getByRole('dialog', { name: 'Fotos' })).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('dialog', { name: 'Fotos' })).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('closes only the top one of two stacked overlays', async () => {
    await renderAt(
      ['/recipes', '/recipes/1'],
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Titel</DialogTitle>
          <DialogDescription>Text</DialogDescription>
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Eintrag</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogContent>
      </Dialog>,
    )
    await pressBack()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    await pressBack()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(path()).toBe('/recipes/1')
  })

  it('sends Escape from the focused field, so an open suggestion list closes before its sheet', async () => {
    // The pattern of IngredientSheet: Escape from an expanded combobox only closes its list.
    const targets: (EventTarget | null)[] = []
    const keepOpen = (e: KeyboardEvent) => {
      targets.push(e.target)
      if ((e.target as Element | null)?.matches('[role=combobox][aria-expanded=true]')) e.preventDefault()
    }
    await renderAt(
      ['/recipes', '/recipes/1'],
      <Sheet defaultOpen>
        <BottomSheet title="Zutat bearbeiten" description="Zeile" onEscapeKeyDown={keepOpen}>
          <Input role="combobox" aria-expanded="true" aria-label="Zutat" />
        </BottomSheet>
      </Sheet>,
    )
    const field = screen.getByRole('combobox')
    act(() => field.focus())
    await pressBack()
    expect(targets).toEqual([field])
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('Android back button without an overlay', () => {
  it('goes back to the previous route', async () => {
    await renderAt(['/recipes', '/recipes/1'])
    await pressBack(true)
    expect(path()).toBe('/recipes')
  })

  it('goes to the start page without history', async () => {
    await renderAt(['/recipes/1'])
    await pressBack(false)
    expect(path()).toBe('/')
    expect(plugin.exitApp).not.toHaveBeenCalled()
  })

  it('leaves the app on the start page', async () => {
    await renderAt(['/recipes/1', '/'])
    await pressBack(true)
    expect(plugin.exitApp).toHaveBeenCalledTimes(1)
    expect(path()).toBe('/')
  })

  it('leaves the app on the sign-in page, where the start page would redirect back', async () => {
    await renderAt(['/login'])
    await pressBack(false)
    expect(plugin.exitApp).toHaveBeenCalledTimes(1)
  })

  it('goes back from register to sign-in, and leaves the app without history', async () => {
    await renderAt(['/login', '/register'])
    await pressBack(true)
    expect(path()).toBe('/login')
    expect(plugin.exitApp).not.toHaveBeenCalled()
    await pressBack(false)
    expect(plugin.exitApp).toHaveBeenCalledTimes(1)
  })
})

describe('Android back button registration', () => {
  it.each(['web', 'ios'])('registers no listener on %s', async (name) => {
    onPlatform(name)
    await renderAt(['/'])
    expect(plugin.addListener).not.toHaveBeenCalled()
  })

  it('keeps exactly one listener under StrictMode', async () => {
    render(
      <StrictMode>
        <MemoryRouter useTransitions={false}>
          <AndroidBackButton />
        </MemoryRouter>
      </StrictMode>,
    )
    await flush()
    expect(plugin.listeners.size).toBe(1)
  })

  it('leaves no listener when unmounted before the plugin loaded', async () => {
    const { unmount } = render(
      <MemoryRouter useTransitions={false}>
        <AndroidBackButton />
      </MemoryRouter>,
    )
    unmount()
    await flush()
    expect(plugin.listeners.size).toBe(0)
  })

  it('removes the listener on unmount', async () => {
    const { unmount } = await renderAt(['/'])
    expect(plugin.listeners.size).toBe(1)
    unmount()
    await flush()
    expect(plugin.listeners.size).toBe(0)
  })
})

describe('topOverlay', () => {
  it('picks the last open overlay in the DOM and ignores closed ones', () => {
    document.body.innerHTML = `
      <div role="dialog" data-state="open" id="a"></div>
      <div role="menu" data-state="open" id="b"></div>
      <div role="dialog" data-state="closed" id="c"></div>`
    expect(topOverlay()?.id).toBe('b')
    document.body.innerHTML = ''
    expect(topOverlay()).toBeNull()
  })
})
