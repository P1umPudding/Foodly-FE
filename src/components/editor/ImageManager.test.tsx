import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@postxl/ui-components'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManager } from './ImageManager'
import { foodly } from '../../api'
import type { ImageRef } from '../../api/protocol'
import type { StubFeature } from '../../api/stubs'
import { ref } from '../../test/images'

const imageStub = vi.hoisted(() => ({ stubbed: true }))
vi.mock('../../api/stubs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/stubs')>()
  return { ...actual, isStubbed: (f: StubFeature) => (f === 'images' ? imageStub.stubbed : actual.isStubbed(f)) }
})

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
  // The editor keeps the placeholder previews in REST mode, unlike list and detail.
  it('REST: previews the images with the placeholder', () => {
    imageStub.stubbed = true
    setup()

    expect(screen.getByAltText('Hauptbild').getAttribute('src')).toMatch(/\/recipes\/placeholder\.svg$/)
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

  // Matching by id, not object identity: a fresh copy of the same ref must still be removed.
  it('removes a gallery image by id', () => {
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
