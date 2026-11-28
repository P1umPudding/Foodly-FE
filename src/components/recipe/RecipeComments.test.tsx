import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeComments } from './RecipeComments'
import { foodly } from '../../api'
import type { RecipeComment } from '../../api/comments'
import type { Recipe } from '../../api/protocol'

const session = vi.hoisted(() => ({ me: 1 }))
vi.mock('../../catalog/CatalogProvider', () => ({
  useCurrentUserId: () => session.me,
  useUser: (id: number) => ({ id, name: { 1: 'Kolja', 2: 'Mara' }[id] ?? `U${id}`, profilePicture: null }),
}))

const recipe = (owner: number) => ({ id: 5, owner, editors: [], viewers: [] }) as unknown as Recipe

// A tiny in-memory stand-in for the stub storage, so a remount reads what was written ("after reload").
let stored: RecipeComment[]
let seq = 0

beforeEach(() => {
  session.me = 1
  stored = [{ id: 'm', user: 2, createdAt: '2026-11-20T10:00:00Z', text: 'Von Mara' }]
  vi.spyOn(foodly, 'listComments').mockImplementation(async () => [...stored])
  vi.spyOn(foodly, 'addComment').mockImplementation(async (_id, text) => {
    const c = { id: `n${++seq}`, user: session.me, createdAt: new Date().toISOString(), text: text.trim() }
    stored = [...stored, c]
    return c
  })
  vi.spyOn(foodly, 'deleteComment').mockImplementation(async (_id, commentId) => {
    stored = stored.filter((c) => c.id !== commentId)
  })
})

afterEach(() => vi.restoreAllMocks())

const renderComments = (owner: number) =>
  render(
    <TooltipProvider>
      <RecipeComments recipe={recipe(owner)} />
    </TooltipProvider>,
  )

describe('RecipeComments', () => {
  it('shows a sent comment right away and again after a remount', async () => {
    const { unmount } = renderComments(2)
    expect(await screen.findByRole('heading', { name: 'Kommentare (1)' })).toBeTruthy()
    const send = screen.getByRole('button', { name: 'Senden' }) as HTMLButtonElement
    expect(send.disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: 'Kommentar schreiben' }), { target: { value: 'Super!' } })
    fireEvent.click(send)
    expect(await screen.findByText('Super!')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Kommentare (2)' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Kommentar schreiben' }) as HTMLTextAreaElement).value).toBe('')
    unmount()

    renderComments(2)
    expect(await screen.findByText('Super!')).toBeTruthy()
  })

  it('offers delete on my own comment only, unless I own the recipe', async () => {
    stored.push({ id: 'k', user: 1, createdAt: '2026-11-21T10:00:00Z', text: 'Von mir' })
    const { unmount } = renderComments(2)
    await screen.findByText('Von mir')
    expect(screen.getAllByRole('button', { name: 'Kommentar löschen' })).toHaveLength(1)
    const mine = screen.getByText('Von mir').closest('li')!
    expect(within(mine).getByRole('button', { name: 'Kommentar löschen' })).toBeTruthy()
    unmount()

    renderComments(1)
    await screen.findByText('Von Mara')
    expect(screen.getAllByRole('button', { name: 'Kommentar löschen' })).toHaveLength(2)
  })

  it('deletes after confirming and shows the empty state', async () => {
    renderComments(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Kommentar löschen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Löschen' }))
    expect(await screen.findByText('Noch keine Kommentare')).toBeTruthy()
    expect(foodly.deleteComment).toHaveBeenCalledWith(5, 'm', 1)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })
})
