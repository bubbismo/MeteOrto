import { describe, expect, it } from 'vitest'
import colture from '../../data/colture.json'
import { EMPTY_USER_CROPS, isModified, isMonthDay, mergeCrops, newCustomCrop, validateCrop, type Crop } from './crops'

const base = colture as unknown as Crop[]

describe('built-in crops table', () => {
  it('has unique ids and passes validation', () => {
    expect(new Set(base.map((c) => c.id)).size).toBe(base.length)
    expect(base.flatMap(validateCrop)).toEqual([])
  })
  it('gives every crop at least one period', () => {
    for (const c of base) expect(Object.values(c.periods).flat().length, c.id).toBeGreaterThan(0)
  })
  it('has sane numbers', () => {
    for (const c of base) {
      expect(c.soilTempMin, c.id).toBeGreaterThanOrEqual(0)
      expect(c.soilTempMin, c.id).toBeLessThanOrEqual(20)
      expect(c.harvestDays[0], c.id).toBeLessThanOrEqual(c.harvestDays[1])
      expect(c.germinationDays[0], c.id).toBeLessThanOrEqual(c.germinationDays[1])
    }
  })
})

describe('isMonthDay', () => {
  it('accepts real dates only', () => {
    expect(isMonthDay('02-29')).toBe(true)
    expect(isMonthDay('02-30')).toBe(false)
    expect(isMonthDay('13-01')).toBe(false)
    expect(isMonthDay('4-5')).toBe(false)
  })
})

describe('mergeCrops', () => {
  it('applies overrides without touching the original, and appends custom crops', () => {
    const id = base[0].id
    const user = {
      overrides: { [id]: { soilTempMin: 99 } },
      custom: [newCustomCrop('Topinambur', '🌻')],
    }
    const merged = mergeCrops(base, user)
    expect(merged[0].soilTempMin).toBe(99)
    expect(base[0].soilTempMin).not.toBe(99)
    expect(merged.at(-1)).toMatchObject({ name: 'Topinambur', custom: true })
    expect(merged).toHaveLength(base.length + 1)
    expect(isModified(id, user)).toBe(true)
    expect(isModified(id, EMPTY_USER_CROPS)).toBe(false)
  })
  it('reports invalid periods', () => {
    const bad = { ...base[0], periods: { diretta: [{ from: '13-40', to: '01-01' }] } }
    expect(validateCrop(bad).length).toBeGreaterThan(0)
  })
})
