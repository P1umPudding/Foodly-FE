// The recipe size as a search parameter, shared by the detail page and the cook mode (R4/R5).
// Portions recipes (hasPortions) carry `?servings=<n>`, fixed-size recipes `?factor=<x>`; each mode reads only
// its own key. Missing or invalid values mean factor 1. The steppers only produce values this module accepts,
// so every size a user can set survives a reload.
import { hasPortions } from '../api/views'

export const FACTOR_SERIES = [0.25, 0.5, 0.75, 1, 1.5, 2] as const

const SERVINGS = 'servings'
const FACTOR = 'factor'

export function parseSize(params: URLSearchParams, sizeNumber: number | null): number {
  if (hasPortions(sizeNumber) && sizeNumber !== null) {
    const raw = params.get(SERVINGS)
    if (raw === null || !/^[1-9]\d*$/.test(raw)) return 1
    const servings = Number(raw)
    return servings >= 1 && Number.isSafeInteger(servings) ? servings / sizeNumber : 1
  }
  // As strict as servings: plain decimals only, no "0x2", "2e0" or "+1.5".
  const raw = params.get(FACTOR)
  if (raw === null || !/^\d+(\.\d+)?$/.test(raw)) return 1
  const factor = Number(raw)
  return isInSeries(factor) ? factor : 1
}

// The param that represents `factor`, or null when none does: servings that aren't a whole count ≥ 1 (only
// possible at the default with old non-integer sizeNumbers) or a factor outside the series.
function sizeParam(factor: number, sizeNumber: number | null): [string, string] | null {
  if (hasPortions(sizeNumber) && sizeNumber !== null) {
    const servings = round2(factor * sizeNumber)
    return Number.isSafeInteger(servings) && servings >= 1 ? [SERVINGS, String(servings)] : null
  }
  return factor !== 1 && isInSeries(factor) ? [FACTOR, String(factor)] : null
}

// Copy of `params` with the size set for `factor`. Factor 1 drops the size, so the detail URL stays clean.
export function withSize(params: URLSearchParams, factor: number, sizeNumber: number | null): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(SERVINGS)
  next.delete(FACTOR)
  const param = factor === 1 ? null : sizeParam(factor, sizeNumber)
  if (param) next.set(...param)
  return next
}

// The cook-mode link keeps the size. A portions recipe names its servings even at the default (AC3), unless that
// default is fractional (old data, e.g. 2.5): no whole count stands for it, and a missing param is factor 1 anyway.
export function cookHref(recipeId: number, factor: number, sizeNumber: number | null): string {
  const param = sizeParam(factor, sizeNumber)
  const query = param ? `?${new URLSearchParams([param]).toString()}` : ''
  return `/recipes/${recipeId}/cook${query}`
}

export function stepFactor(current: number, direction: 1 | -1): number {
  const index = FACTOR_SERIES.indexOf(snapFactor(current) as (typeof FACTOR_SERIES)[number])
  const next = Math.min(FACTOR_SERIES.length - 1, Math.max(0, index + direction))
  return FACTOR_SERIES[next]
}

// Nearest series value; ties go to the larger one.
export function snapFactor(value: number): number {
  return FACTOR_SERIES.reduce((best, f) => (Math.abs(f - value) <= Math.abs(best - value) ? f : best))
}

export function clampServings(value: number): number {
  return Math.max(1, Math.round(value))
}

// Whole servings around `current`. Old data can have a fractional base (e.g. 2.5): stepping passes through it
// (3 → 2.5 → 2), so the original size stays reachable.
export function stepServings(current: number, direction: 1 | -1, base: number): number {
  const next = direction === 1 ? Math.floor(current) + 1 : Math.ceil(current) - 1
  const passesBase = direction === 1 ? current < base && base < next : next < base && base < current
  return passesBase ? base : Math.max(1, next)
}

function isInSeries(value: number): boolean {
  return (FACTOR_SERIES as readonly number[]).includes(value)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
