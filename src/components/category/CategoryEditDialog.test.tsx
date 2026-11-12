import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@postxl/ui-components'
import { CategoryEditDialog } from './CategoryEditDialog'
import { SUGGESTED_COLORS } from '../../lib/categoryColor'
import { setViewport } from '../../test/viewport'
import type { UserCategory } from '../../api/protocol'

const actions = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
const catalog = vi.hoisted(() => ({ list: [] as UserCategory[] }))

vi.mock('../../catalog/useCategoryActions', () => ({ useCategoryActions: () => actions }))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCategories: () => ({ list: catalog.list, status: 'ready', error: null, retry: () => {} }),
}))

const cat = (over: Partial<UserCategory>): UserCategory => ({
  id: 1,
  user: 1,
  name: 'Pasta',
  recipes: [],
  order: 0,
  color: SUGGESTED_COLORS[0],
  colorLight: null,
  colorDark: null,
  ...over,
})

function renderDialog(category: UserCategory | null = null) {
  const onClose = vi.fn()
  render(
    <TooltipProvider>
      <CategoryEditDialog open onClose={onClose} category={category} />
    </TooltipProvider>,
  )
  return { onClose }
}

const nameInput = () => screen.getByLabelText('Name') as HTMLInputElement
const saveButton = () => screen.getByRole('button', { name: 'Speichern' })

beforeEach(() => {
  setViewport(1200)
  catalog.list = []
  actions.create.mockReset()
  actions.update.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('CategoryEditDialog', () => {
  it('keeps Speichern off for an empty or blank name', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Neue Kategorie' })).toBeTruthy()
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(nameInput(), { target: { value: '   ' } })
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(nameInput(), { target: { value: 'Suppen' } })
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('focuses the name and limits it to 60 characters', () => {
    renderDialog()
    expect(document.activeElement).toBe(nameInput())
    expect(nameInput().maxLength).toBe(60)
  })

  it('creates with the trimmed name and the first free colour, then closes', async () => {
    // The first suggestion is taken, so a new category starts with the second.
    catalog.list = [cat({ color: SUGGESTED_COLORS[0] })]
    actions.create.mockResolvedValue(cat({ id: 9, name: 'Suppen' }))
    const { onClose } = renderDialog()
    fireEvent.change(nameInput(), { target: { value: '  Suppen  ' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(actions.create).toHaveBeenCalledWith({
      name: 'Suppen',
      color: SUGGESTED_COLORS[1],
      colorLight: null,
      colorDark: null,
    })
  })

  it('edits name and colour and sends the overrides back unchanged', async () => {
    const pasta = cat({ id: 4, colorLight: '#111111', colorDark: '#eeeeee' })
    catalog.list = [pasta]
    actions.update.mockResolvedValue(pasta)
    const { onClose } = renderDialog(pasta)
    expect(screen.getByRole('heading', { name: 'Kategorie bearbeiten' })).toBeTruthy()
    expect(nameInput().value).toBe('Pasta')
    fireEvent.change(nameInput(), { target: { value: 'Nudeln' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Farbe 3' }))
    // The picker only changes the draft; nothing is saved before Speichern.
    expect(actions.update).not.toHaveBeenCalled()
    fireEvent.click(saveButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(actions.update).toHaveBeenCalledWith(4, {
      name: 'Nudeln',
      color: SUGGESTED_COLORS[2],
      colorLight: '#111111',
      colorDark: '#eeeeee',
    })
  })

  it('shows a failed save in the dialog and keeps the input', async () => {
    actions.create.mockRejectedValue(new Error('Name must not be empty'))
    const { onClose } = renderDialog()
    fireEvent.change(nameInput(), { target: { value: 'Suppen' } })
    fireEvent.click(saveButton())
    expect((await screen.findByRole('alert')).textContent).toContain('Name must not be empty')
    expect(onClose).not.toHaveBeenCalled()
    expect(nameInput().value).toBe('Suppen')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('shows a spinner and ignores a second submit while saving', async () => {
    let resolve!: (c: UserCategory) => void
    actions.create.mockReturnValue(new Promise<UserCategory>((r) => (resolve = r)))
    const { onClose } = renderDialog()
    fireEvent.change(nameInput(), { target: { value: 'Suppen' } })
    fireEvent.click(saveButton())
    await waitFor(() => expect(saveButton().getAttribute('aria-disabled')).toBe('true'))
    fireEvent.click(saveButton())
    expect(actions.create).toHaveBeenCalledTimes(1)
    resolve(cat({ id: 9 }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('is a bottom sheet on the phone', () => {
    setViewport(390)
    renderDialog()
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Neue Kategorie' })).toBeTruthy()
    expect(document.activeElement).toBe(nameInput())
  })
})
