import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CookSkeleton } from './CookSkeleton'

describe('CookSkeleton', () => {
  // #307: the ✕ stand-in grows with the real ✕ on touch, so the header doesn't jump when cook mode arrives.
  it('sizes the close-button stand-in like the real ✕', () => {
    const { container } = render(<CookSkeleton />)
    // The first skeleton is the ✕ stand-in in the header.
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).not.toBeNull()
    const standIn = el!.className.split(/\s+/)
    expect(standIn).toEqual(expect.arrayContaining(['size-9', 'touch:size-10']))
    expect(standIn).not.toContain('size-10')
  })
})
