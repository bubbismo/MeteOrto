import { describe, expect, it } from 'vitest'
import { newCustomCrop, type Crop } from '../sowing/crops'
import { defaultMethod, explainOutcome, newEntry } from './entry'

const tomato: Crop = {
  ...newCustomCrop('Pomodoro', '🍅'),
  id: 'pomodoro',
  periods: { semenzaio: [{ from: '02-15', to: '04-10' }], trapianto: [{ from: '05-01', to: '06-15' }] },
}

describe('defaultMethod', () => {
  it('picks the technique whose window contains the date', () => {
    expect(defaultMethod(tomato, '2026-03-10')).toBe('semenzaio')
    expect(defaultMethod(tomato, '2026-05-20')).toBe('trapianto')
  })
  it('falls back to the first technique the crop has', () => {
    expect(defaultMethod(tomato, '2026-11-20')).toBe('semenzaio')
    expect(defaultMethod(newCustomCrop('X', 'x'), '2026-11-20')).toBe('diretta')
  })
})

describe('newEntry', () => {
  it('snapshots crop name and place, with a unique id', () => {
    const a = newEntry(tomato, 'trapianto', '2026-05-20', { lat: 44, lon: 9 }, 1000)
    const b = newEntry(tomato, 'trapianto', '2026-05-20', { lat: 44, lon: 9 }, 1000)
    expect(a).toMatchObject({ cropId: 'pomodoro', cropName: 'Pomodoro', emoji: '🍅', method: 'trapianto', sownOn: '2026-05-20', lat: 44, lon: 9 })
    expect(a.id).not.toBe(b.id)
  })
})

describe('explainOutcome', () => {
  const s = (over = {}) => ({ days: 14, soilMean: 15, soilMin: 12, tMinAbs: 8, frostNights: 0, rain: 30, ...over })
  it('flags cold soil, frost, floods and drought', () => {
    expect(explainOutcome(s({ soilMean: 8 }), 1, 12)).toContain('suolo-freddo')
    expect(explainOutcome(s({ frostNights: 2 }), 1, 12)).toContain('gelate')
    expect(explainOutcome(s({ rain: 120 }), 2, 12)).toContain('molta-pioggia')
    expect(explainOutcome(s({ rain: 2 }), 2, 12)).toContain('siccita')
  })
  it('notes good conditions behind a good harvest, and stays silent otherwise', () => {
    expect(explainOutcome(s(), 5, 12)).toEqual(['condizioni-buone'])
    expect(explainOutcome(s(), 3, 12)).toEqual([])
  })
})
