import { describe, expect, it } from 'vitest'
import { formatDurationInput, parseDurationInput } from './parseDurationInput'

describe('parseDurationInput', () => {
  it.each([
    ['0:12:00', 720],
    ['12', 720],
    ['12:30', 750],
    ['1:00:00', 3600],
    [' 5 ', 300],
    ['90', 5400],
    ['0:00:30', 30],
    ['23:59:59', 86_399],
  ])('reads %j as %i seconds', (text, seconds) => {
    expect(parseDurationInput(text)).toBe(seconds)
  })

  it.each([
    '',
    '   ',
    '0',
    '0:00',
    '0:00:00',
    'abc',
    '12 min',
    '12,5',
    '1.5',
    '-5',
    '+5',
    '1:60',
    '1:2:60',
    '1:60:00',
    '1::00',
    ':30',
    '5:',
    '1:00:00:00',
    '24:00:00',
    '1440',
  ])('rejects %j', (text) => {
    expect(parseDurationInput(text)).toBeNull()
  })
})

describe('formatDurationInput', () => {
  it.each([
    [300, '0:05:00'],
    [720, '0:12:00'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('writes %i seconds as %j and reads it back', (seconds, text) => {
    expect(formatDurationInput(seconds)).toBe(text)
    expect(parseDurationInput(text)).toBe(seconds)
  })
})
