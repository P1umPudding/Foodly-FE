import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StarMeter, Stars } from './Stars'

// The golden overlay is the absolutely-positioned span; its width utility encodes
// the fill. (A runtime-built width would never survive Tailwind's scanner, so these
// must stay literal — that's exactly what we assert here.)
const overlayClass = (container: HTMLElement) => container.querySelector('span.absolute')?.className ?? ''

describe('StarMeter', () => {
  it('fills proportionally to value/max', () => {
    expect(overlayClass(render(<StarMeter value={5} />).container)).toContain('w-full')
    expect(overlayClass(render(<StarMeter value={4} />).container)).toContain('w-4/5') // 80%
    expect(overlayClass(render(<StarMeter value={2.5} />).container)).toContain('w-1/2') // 50%
    expect(overlayClass(render(<StarMeter value={0} />).container)).toContain('w-0')
  })

  it('rounds to the nearest 5% step', () => {
    // 4.3 / 5 = 86% → 85%
    expect(overlayClass(render(<StarMeter value={4.3} />).container)).toContain('w-[85%]')
  })

  it('clamps out-of-range values', () => {
    expect(overlayClass(render(<StarMeter value={9} />).container)).toContain('w-full')
    expect(overlayClass(render(<StarMeter value={-1} />).container)).toContain('w-0')
  })

  it('labels with one decimal (no raw float)', () => {
    expect(render(<StarMeter value={3.6666} />).getByLabelText('3.7 von 5')).toBeTruthy()
  })
})

describe('Stars (5-star bar)', () => {
  it('renders five star bases and a one-decimal label', () => {
    const { container, getByLabelText } = render(<Stars value={3.2} />)
    expect(getByLabelText('3.2 von 5')).toBeTruthy()
    expect(container.querySelectorAll('svg').length).toBe(10) // 5 base + 5 overlay
  })
})
