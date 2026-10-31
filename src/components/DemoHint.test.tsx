import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DemoHint } from './DemoHint'

const stubbed = vi.hoisted(() => ({ value: true }))
vi.mock('../api/stubs', () => ({ isStubbed: () => stubbed.value }))

describe('DemoHint', () => {
  it('shows the ratings text while ratings are stubbed', () => {
    stubbed.value = true
    render(<DemoHint feature="ratings" />)
    expect(screen.getByText('Demo: nur in diesem Browser gespeichert')).toBeTruthy()
  })

  it('falls back to the generic text for other stubbed features', () => {
    stubbed.value = true
    render(<DemoHint feature="sharing" />)
    expect(screen.getByText('Demo: wird noch nicht gespeichert')).toBeTruthy()
  })

  it('renders nothing when the feature is not stubbed', () => {
    stubbed.value = false
    const { container } = render(<DemoHint feature="ratings" />)
    expect(container.innerHTML).toBe('')
  })
})
