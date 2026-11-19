import { describe, expect, it } from 'vitest'
import type { Section } from '../api/protocol'
import { flattenSteps, nextStep } from './steps'

const section = (name: string | null, steps: string[], id = 1): Section => ({ id, name, ingredients: [], steps })

describe('flattenSteps', () => {
  it('numbers steps across sections and keeps the section name', () => {
    const steps = flattenSteps([section('Soße', ['a', 'b', 'c']), section('Teig', ['d', 'e'], 2)])
    expect(steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5])
    expect(steps[3]).toEqual({ text: 'd', number: 4, sectionIndex: 1, sectionName: 'Teig' })
  })

  it('skips sections without steps but still counts them for the naming rule', () => {
    const steps = flattenSteps([section('Zutaten', []), section('Teig', ['a'], 2)])
    expect(steps).toEqual([{ text: 'a', number: 1, sectionIndex: 1, sectionName: 'Teig' }])
  })

  it('drops the name of a single section and of unnamed sections', () => {
    expect(flattenSteps([section('Alles', ['a'])])[0].sectionName).toBeNull()
    expect(flattenSteps([section(null, ['a']), section(' ', ['b'], 2)]).map((s) => s.sectionName)).toEqual([null, null])
  })

  it('trims section names', () => {
    expect(flattenSteps([section(' Teig ', ['a']), section('B', ['b'], 2)])[0].sectionName).toBe('Teig')
  })

  it('is empty without steps', () => {
    expect(flattenSteps([])).toEqual([])
    expect(flattenSteps([section('A', []), section('B', [], 2)])).toEqual([])
  })
})

describe('nextStep', () => {
  const steps = flattenSteps([section('Soße', ['a', 'b', 'c']), section('Teig', ['d', 'e'], 2)])

  it('has no prefix inside a section', () => {
    expect(nextStep(steps, 0)).toEqual({ prefix: null, text: 'b' })
  })

  it('names the new section where it begins', () => {
    expect(nextStep(steps, 2)).toEqual({ prefix: 'Teig', text: 'd' })
  })

  it('is null on the last step', () => {
    expect(nextStep(steps, 4)).toBeNull()
  })

  it('has no prefix when the next section is unnamed', () => {
    const unnamed = flattenSteps([section('Soße', ['a']), section(null, ['b'], 2)])
    expect(nextStep(unnamed, 0)).toEqual({ prefix: null, text: 'b' })
  })
})
