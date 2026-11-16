import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoryEditorCard } from './CategoryEditorCard'
import type { UserCategory } from '../../api/protocol'

const actions = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../../catalog/useCategoryActions', () => ({ useCategoryActions: () => actions }))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCategories: () => ({ list: [], status: 'ready', error: null, retry: () => {} }),
}))

function renderCard() {
  const onClose = vi.fn()
  render(<CategoryEditorCard category={null} onClose={onClose} />)
  return { onClose, name: screen.getByLabelText('Name') }
}

beforeEach(() => {
  actions.create.mockReset()
})

describe('CategoryEditorCard', () => {
  it('ignores Escape while saving and keeps Abbrechen off', async () => {
    let resolve!: (c: UserCategory) => void
    actions.create.mockReturnValue(new Promise<UserCategory>((r) => (resolve = r)))
    const { onClose, name } = renderCard()
    fireEvent.change(name, { target: { value: 'Suppen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveProperty('disabled', true))
    fireEvent.keyDown(name, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    resolve({} as UserCategory)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('leaves an Escape that something inside already handled', () => {
    const { onClose, name } = renderCard()
    name.addEventListener('keydown', (e) => e.preventDefault())
    fireEvent.keyDown(name, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
