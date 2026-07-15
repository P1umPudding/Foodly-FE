import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManager } from './ImageManager'
import { foodly } from '../../api'

afterEach(() => vi.restoreAllMocks())

const file = () => new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })

function setup(onChange = vi.fn(), mainImage: number | null = 1, images: number[] = [2]) {
  render(
    <TooltipProvider>
      <ImageManager mainImage={mainImage} images={images} onChange={onChange} />
    </TooltipProvider>,
  )
  return onChange
}

describe('ImageManager', () => {
  it('uploads a file and appends it to the gallery', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 9, hash: 'h', name: null })
    const onChange = setup()

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(foodly.uploadImage).toHaveBeenCalled())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ images: [2, 9] }))
  })

  it('makes the first image the main one when there is none', async () => {
    vi.spyOn(foodly, 'uploadImage').mockResolvedValue({ id: 9, hash: 'h', name: null })
    const onChange = setup(vi.fn(), null, [])

    fireEvent.change(screen.getByLabelText('Bild hochladen'), { target: { files: [file()] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ mainImage: 9, images: [] }))
  })

  it('promotes a gallery image to main and demotes the old main', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Als Hauptbild' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: 2, images: [1] })
  })

  it('removes the main image', () => {
    const onChange = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Hauptbild entfernen' }))

    expect(onChange).toHaveBeenCalledWith({ mainImage: null })
  })
})
