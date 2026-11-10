import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManager } from './ImageManager'
import { foodly } from '../../api'
import type { ImageRef } from '../../api/protocol'
import { ref } from '../../test/images'

afterEach(() => vi.restoreAllMocks())

const file = () => new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })

function setup(onChange = vi.fn(), mainImage: ImageRef | null = ref(1), images: ImageRef[] = [ref(2)]) {
  render(
    <TooltipProvider>
      <ImageManager mainImage={mainImage} images={images} onChange={onChange} />
    </TooltipProvider>,
  )
  return onChange
}

describe('ImageManager', () => {
  it('REST: previews the images from the backend', () => {
    setup()

    expect(screen.getByAltText('Hauptbild').getAttribute('src')).toBe('/api/v1/images/h1')
  })

  it('shows an uploaded image right away', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 5, hash: 'ef56', name: null })
    function Draft() {
      const [draft, setDraft] = useState<{ mainImage: ImageRef | null; images: ImageRef[] }>({
        mainImage: null,
        images: [],
      })
      return (
        <ImageManager {...draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      )
    }
    const { container } = render(
      <TooltipProvider>
        <Draft />
      </TooltipProvider>,
    )

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(container.querySelector('img[src="/api/v1/images/ef56"]')).toBeTruthy())
  })

  it('uploads a file and appends the returned ref to the gallery', async () => {
    const uploaded = { id: 9, hash: 'h9', name: 'Neu' }
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue(uploaded)
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(foodly.uploadImage).toHaveBeenCalled())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ images: [ref(2), uploaded] }))
  })

  it('makes the first image the main one when there is none', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue(ref(9))
    const onChange = setup(vi.fn(), null, [])

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ mainImage: ref(9), images: [] }))
  })

  it('promotes a gallery image to main and demotes the old main', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Als Hauptbild' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: ref(2), images: [ref(1)] })
  })

  it('removes the main image', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Hauptbild entfernen' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: null })
  })

  it('removes a gallery image', () => {
    const onChange = vi.fn()
    render(
      <TooltipProvider>
        <ImageManager mainImage={null} images={[ref(2), ref(3)]} onChange={onChange} />
      </TooltipProvider>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Bild entfernen' })[0])

    expect(onChange).toHaveBeenCalledWith({ images: [ref(3)] })
  })
})
