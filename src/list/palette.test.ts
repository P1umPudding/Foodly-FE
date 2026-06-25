import { describe, it, expect } from 'vitest'
import { colorClasses } from './palette'

describe('colorClasses', () => {
  it('maps a known palette hex to its literal classes', () => {
    const c = colorClasses('#e11d48')
    expect(c.text).toBe('text-[#e11d48]')
    expect(c.border).toBe('border-[#e11d48]/60')
    expect(c.bgActive).toBe('bg-[#e11d48]/15')
    expect(c.line).toBe('border-[#e11d48]')
    expect(c.dot).toBe('bg-[#e11d48]')
  })

  it('falls back to a neutral set for unknown colors', () => {
    const c = colorClasses('#123456')
    expect(c.text).toBe('text-muted-foreground')
    expect(c.border).toBe('border-border')
    expect(c.bgActive).toBe('bg-muted')
    expect(c.dot).toBe('bg-muted')
  })
})
