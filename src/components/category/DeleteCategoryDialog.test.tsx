import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import type { UserCategory } from '../../api/protocol'

const actions = vi.hoisted(() => ({ remove: vi.fn() }))
vi.mock('../../catalog/useCategoryActions', () => ({ useCategoryActions: () => actions }))

const pasta: UserCategory = {
  id: 4,
  user: 1,
  name: 'Pasta',
  recipes: [],
  order: 0,
  color: '#e11d48',
  colorLight: null,
  colorDark: null,
}

function renderDialog() {
  const onClose = vi.fn()
  render(<DeleteCategoryDialog open onClose={onClose} category={pasta} />)
  return { onClose }
}

const confirm = () => screen.getByRole('button', { name: 'Löschen' })

beforeEach(() => {
  actions.remove.mockReset()
})

describe('DeleteCategoryDialog', () => {
  it('deletes and closes', async () => {
    actions.remove.mockResolvedValue(undefined)
    const { onClose } = renderDialog()
    fireEvent.click(confirm())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(actions.remove).toHaveBeenCalledWith(4)
  })

  it('shows a spinner and ignores a second click while deleting', async () => {
    let resolve!: () => void
    actions.remove.mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { onClose } = renderDialog()
    fireEvent.click(confirm())
    await waitFor(() => expect(confirm().getAttribute('aria-disabled')).toBe('true'))
    expect(confirm().querySelector('.animate-spin')).not.toBeNull()
    fireEvent.click(confirm())
    expect(actions.remove).toHaveBeenCalledTimes(1)
    resolve()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps the dialog open with the message when deleting fails', async () => {
    actions.remove.mockRejectedValue(new Error('Category not found'))
    const { onClose } = renderDialog()
    fireEvent.click(confirm())
    expect((await screen.findByRole('alert')).textContent).toContain('Category not found')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(confirm().getAttribute('aria-disabled')).toBe('false')
  })
})
