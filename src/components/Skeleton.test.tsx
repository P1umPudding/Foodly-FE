import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('shimmers instead of pulsing, stops for reduced motion and keeps the caller’s classes', () => {
    render(<Skeleton data-testid="s" className="h-4 w-1/2 rounded-sm" />)
    const classes = [...screen.getByTestId('s').classList]
    expect(classes).toEqual(
      expect.arrayContaining([
        'animate-shimmer',
        'motion-reduce:animate-none',
        'bg-skel',
        'h-4',
        'w-1/2',
        'rounded-sm',
      ]),
    )
    expect(classes).not.toContain('animate-pulse')
    expect(classes).not.toContain('rounded-md')
  })
})
