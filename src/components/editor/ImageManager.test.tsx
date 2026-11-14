import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider, toast } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManager } from './ImageManager'
import { foodly } from '../../api'
import { addImage } from '../../editor/draft'
import type { ImageRef } from '../../api/protocol'
import { ref } from '../../test/images'

afterEach(() => vi.restoreAllMocks())

const file = (name = 'a.png') => new File([new Uint8Array([1])], name, { type: 'image/png' })

function setup(onChange = vi.fn(), mainImage: ImageRef | null = ref(1), images: ImageRef[] = [ref(2)]) {
  render(
    <TooltipProvider>
      <ImageManager mainImage={mainImage} images={images} onChange={onChange} onAdd={vi.fn()} />
    </TooltipProvider>,
  )
  return onChange
}

// Holds the images like the editor draft does: uploads go through addImage on the current state.
function Draft({
  initial = { mainImage: null, images: [] },
}: {
  initial?: { mainImage: ImageRef | null; images: ImageRef[] }
}) {
  const [draft, setDraft] = useState(initial)
  return (
    <ImageManager
      {...draft}
      onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      onAdd={(image) => setDraft((d) => addImage(d, image))}
    />
  )
}

const openMenu = (name: string) => fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' })

describe('ImageManager', () => {
  it('REST: previews the images from the backend', () => {
    const { container } = render(
      <TooltipProvider>
        <ImageManager mainImage={ref(1)} images={[]} onChange={vi.fn()} onAdd={vi.fn()} />
      </TooltipProvider>,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/api/v1/images/h1')
    expect(screen.getByText('Hauptbild')).toBeTruthy()
  })

  it('without photos shows the drop area', () => {
    setup(vi.fn(), null, [])

    expect(screen.getByText('Fotos hinzufügen')).toBeTruthy()
    expect(screen.getByText('Das erste wird Hauptbild')).toBeTruthy()
    expect(screen.queryByText('Bild antippen: als Hauptbild setzen oder entfernen.')).toBeNull()
  })

  it('with photos shows the main image, the gallery and the hint', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Hauptbild' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bild 1' })).toBeTruthy()
    expect(screen.getByText('Bild antippen: als Hauptbild setzen oder entfernen.')).toBeTruthy()
  })

  it('a gallery without a main image keeps the drop area above it', () => {
    setup(vi.fn(), null, [ref(2)])

    expect(screen.getByText('Fotos hinzufügen')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bild 1' })).toBeTruthy()
  })

  it('shows an uploaded image right away', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 5, hash: 'ef56', name: null })
    const { container } = render(
      <TooltipProvider>
        <Draft />
      </TooltipProvider>,
    )

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(container.querySelector('img[src="/api/v1/images/ef56"]')).toBeTruthy())
  })

  it('uploads several files one after another: the first becomes main, the rest join the gallery', async () => {
    const upload = vi
      .spyOn(foodly, 'uploadImage')
      .mockResolvedValueOnce(ref(7))
      .mockResolvedValueOnce(ref(8))
      .mockResolvedValueOnce(ref(9))
    const onAdd = vi.fn()
    render(
      <TooltipProvider>
        <ImageManager mainImage={null} images={[]} onChange={vi.fn()} onAdd={onAdd} />
      </TooltipProvider>,
    )

    const files = [file('a.png'), file('b.png'), file('c.png')]
    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files } })

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(3))
    expect(upload.mock.calls.map(([f]) => (f as File).name)).toEqual(['a.png', 'b.png', 'c.png'])
    expect(onAdd.mock.calls.map(([image]) => image)).toEqual([ref(7), ref(8), ref(9)])
  })

  it('keeps the other uploads when one fails', async () => {
    vi.spyOn(foodly, 'uploadImage')
      .mockResolvedValueOnce(ref(7))
      .mockRejectedValueOnce(new Error('zu groß'))
      .mockResolvedValueOnce(ref(9))
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 0)
    const { container } = render(
      <TooltipProvider>
        <Draft />
      </TooltipProvider>,
    )

    fireEvent.change(screen.getByLabelText('Bild hochladen'), {
      target: { files: [file('a.png'), file('b.png'), file('c.png')] },
    })

    await waitFor(() => expect(container.querySelector('img[src="/api/v1/images/h9"]')).toBeTruthy())
    expect(container.querySelector('img[src="/api/v1/images/h7"]')).toBeTruthy()
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][0]).toContain('zu groß')
  })

  it('promotes a gallery image to main and demotes the old main', async () => {
    const onChange = setup()

    openMenu('Bild 1')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Als Hauptbild' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: ref(2), images: [ref(1)] })
  })

  it('removes the main image', async () => {
    const onChange = setup()

    openMenu('Hauptbild')
    expect(screen.queryByRole('menuitem', { name: 'Als Hauptbild' })).toBeNull()
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Entfernen' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: null })
  })

  it('removes a gallery image', async () => {
    const onChange = setup(vi.fn(), null, [ref(2), ref(3)])

    openMenu('Bild 1')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Entfernen' }))

    expect(onChange).toHaveBeenCalledWith({ images: [ref(3)] })
  })
})
