import { describe, expect, it } from 'vitest'
import { parseIngredientLine, parseIngredientList } from './ingredientLine'

const catalog = [
  { id: 1, name: 'Hackfleisch (Rind)' },
  { id: 2, name: 'Tomaten' },
  { id: 3, name: 'Tomaten (gehackt)' },
  { id: 4, name: 'Salz' },
  { id: 5, name: 'Olivenöl' },
  { id: 6, name: 'Zucker' },
  { id: 7, name: 'Mehl' },
]

const parse = (line: string) => parseIngredientLine(line, catalog)

// For a catalog row `text` is the Zusatz; for a free-text row (`ingredient: null`) it is the name.
describe('parseIngredientLine', () => {
  it('splits the issue examples', () => {
    expect(parse('500 g Hackfleisch')).toEqual({ amount: '500', unit: 'g', ingredient: null, text: 'Hackfleisch' })
    expect(parse('ca. 800 g Tomaten (gehackt)')).toEqual({ amount: 'ca. 800', unit: 'g', ingredient: 3, text: '' })
    expect(parse('Salz nach Geschmack')).toEqual({ amount: '', unit: '', ingredient: 4, text: 'nach Geschmack' })
    expect(parse('2 EL Olivenöl')).toEqual({ amount: '2', unit: 'EL', ingredient: 5, text: '' })
  })

  it.each([
    ['1 ½ TL Zucker', '1 ½', 'TL'],
    ['½ TL Zucker', '½', 'TL'],
    ['1/2 TL Zucker', '1/2', 'TL'],
    ['1-2 EL Zucker', '1-2', 'EL'],
    ['1 – 2 EL Zucker', '1 – 2', 'EL'],
    ['1 bis 2 EL Zucker', '1 bis 2', 'EL'],
    ['- 500 g Zucker', '500', 'g'],
    ['• 2 EL Zucker', '2', 'EL'],
    ['1. 2 EL Zucker', '2', 'EL'],
    ['3) 2 EL Zucker', '2', 'EL'],
    ['0,5 kg Zucker', '0,5', 'kg'],
    ['500g Zucker', '500', 'g'],
    ['2 el Zucker', '2', 'EL'],
    ['ca.800 g Zucker', 'ca. 800', 'g'],
    ['Etwa 200 g Zucker', 'Etwa 200', 'g'],
    ['Ca. 200 g Zucker', 'Ca. 200', 'g'],
    ['~200 g Zucker', '~ 200', 'g'],
  ])('reads amount and unit of „%s“', (line, amount, unit) => {
    expect(parse(line)).toEqual({ amount, unit, ingredient: 6, text: '' })
  })

  it('takes units from the list only, whole words', () => {
    expect(parse('2 Stück Eier')).toEqual({ amount: '2', unit: 'Stück', ingredient: null, text: 'Eier' })
    expect(parse('2 Prisen Salz')).toEqual({ amount: '2', unit: '', ingredient: null, text: 'Prisen Salz' })
    expect(parse('2 Gläser Zucker')).toEqual({ amount: '2', unit: '', ingredient: null, text: 'Gläser Zucker' })
  })

  it('keeps a capitalised word before a number as the name', () => {
    expect(parse('Knoblauch 2 Zehen')).toEqual({ amount: '', unit: '', ingredient: null, text: 'Knoblauch 2 Zehen' })
    expect(parse('Salz 1 Prise')).toEqual({ amount: '', unit: '', ingredient: 4, text: '1 Prise' })
  })

  it('links a catalog name the rest starts with, word by word', () => {
    expect(parse('Salz, nach Geschmack')).toEqual({ amount: '', unit: '', ingredient: 4, text: 'nach Geschmack' })
    expect(parse('400 g Tomaten aus der Dose')).toMatchObject({ ingredient: 2, text: 'aus der Dose' })
    expect(parse('Salzbutter')).toMatchObject({ ingredient: null, text: 'Salzbutter' })
    expect(parse('Tomaten  (gehackt)')).toMatchObject({ ingredient: 3, text: '' })
    expect(parse('olivenöl')).toMatchObject({ ingredient: 5, text: '' })
    expect(parse('* Salz')).toMatchObject({ ingredient: 4, text: '' })
    expect(parse('2 g, Salz')).toEqual({ amount: '2', unit: 'g', ingredient: 4, text: '' })
  })

  it('keeps a line without a name as a nameless row', () => {
    expect(parse('500 g')).toEqual({ amount: '500', unit: 'g', ingredient: null, text: '' })
  })
})

describe('parseIngredientList', () => {
  it('parses one ingredient per non-blank line', () => {
    const rows = parseIngredientList('500 g Hackfleisch\r\n\n   \n2 EL Olivenöl\n  Salz nach Geschmack  ', catalog)
    expect(rows.map((r) => [r.ingredient, r.text])).toEqual([
      [null, 'Hackfleisch'],
      [5, ''],
      [4, 'nach Geschmack'],
    ])
  })
})
