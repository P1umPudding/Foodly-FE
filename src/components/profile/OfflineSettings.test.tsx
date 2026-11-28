import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { clearOfflineStore, offlineGet, offlinePut } from '../../api/offline'
import { OfflineSettings, formatMb } from './OfflineSettings'

const KEY = 'foodly.offline.settings'
const modeSwitch = () => screen.getByRole('switch', { name: 'Offline-Modus' })
const slider = () => screen.getByRole('slider')
const usage = () => screen.getByTestId('offline-usage')

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await clearOfflineStore()
})

describe('OfflineSettings', () => {
  it('starts off, with the other options disabled', async () => {
    render(<OfflineSettings />)
    expect(modeSwitch().getAttribute('aria-checked')).toBe('false')
    const download = screen.getByRole('group', { name: 'Laden' })
    expect(within(download).getByRole('radio', { name: 'Nur WLAN' }).getAttribute('aria-checked')).toBe('true')
    expect(within(download).getByRole('radio', { name: 'Auch mobil' }).hasAttribute('disabled')).toBe(true)
    const images = screen.getByRole('group', { name: 'Bilder speichern' })
    expect(within(images).getByRole('radio', { name: 'Nur WLAN' }).getAttribute('aria-checked')).toBe('true')
    await waitFor(() => expect(usage().textContent).toBe('0 MB'))
  })

  it('keeps the choices after a reload', async () => {
    render(<OfflineSettings />)
    fireEvent.click(modeSwitch())
    fireEvent.click(within(screen.getByRole('group', { name: 'Hochladen' })).getByRole('radio', { name: 'Auch mobil' }))
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Bilder speichern' })).getByRole('radio', { name: 'Immer' }),
    )
    await waitFor(() => expect(usage().textContent).toBe('0 MB'))
    cleanup()

    render(<OfflineSettings />)
    expect(modeSwitch().getAttribute('aria-checked')).toBe('true')
    const upload = screen.getByRole('group', { name: 'Hochladen' })
    expect(within(upload).getByRole('radio', { name: 'Auch mobil' }).getAttribute('aria-checked')).toBe('true')
    const images = screen.getByRole('group', { name: 'Bilder speichern' })
    expect(within(images).getByRole('radio', { name: 'Immer' }).getAttribute('aria-checked')).toBe('true')
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ enabled: true, upload: 'mobile', images: 'always' })
    await waitFor(() => expect(usage().textContent).toBe('0 MB'))
  })

  it('limits the storage slider to 200 MB – 5 GB, 1 GB by default', async () => {
    localStorage.setItem(KEY, JSON.stringify({ enabled: true }))
    render(<OfflineSettings />)
    expect(slider().getAttribute('aria-valuemin')).toBe('200')
    expect(slider().getAttribute('aria-valuemax')).toBe('5000')
    expect(slider().getAttribute('aria-valuenow')).toBe('1000')
    screen.getByText('1 GB')
    fireEvent.keyDown(slider(), { key: 'End' })
    expect(slider().getAttribute('aria-valuenow')).toBe('5000')
    screen.getByText('5 GB')
    expect(JSON.parse(localStorage.getItem(KEY)!).limitMb).toBe(5000)
    fireEvent.keyDown(slider(), { key: 'Home' })
    screen.getByText('200 MB')
    expect(JSON.parse(localStorage.getItem(KEY)!).limitMb).toBe(200)
    await waitFor(() => expect(usage().textContent).toBe('0 MB'))
  })

  it('„Cache leeren“ empties the store after a confirmation', async () => {
    await offlinePut('recipes', '1', { id: 1, name: 'x'.repeat(300_000) })
    render(<OfflineSettings />)
    await waitFor(() => expect(usage().textContent).toBe('0,3 MB'))

    fireEvent.click(screen.getByRole('button', { name: 'Cache leeren' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cache leeren?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    expect(await offlineGet('recipes', '1')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Cache leeren' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Cache leeren?' })
    await act(async () => fireEvent.click(within(confirm).getByRole('button', { name: 'Leeren' })))
    await waitFor(() => expect(usage().textContent).toBe('0 MB'))
    expect(await offlineGet('recipes', '1')).toBeUndefined()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('formatMb', () => {
  it('shows MB below 1 GB and GB from there', () => {
    expect(formatMb(0)).toBe('0 MB')
    expect(formatMb(800)).toBe('800 MB')
    expect(formatMb(1000)).toBe('1 GB')
    expect(formatMb(1500)).toBe('1,5 GB')
  })
})
