import { describe, expect, it } from 'vitest'
import type { HourlyPoint } from '../types'
import { buildPastWater, rainNext48 } from './inputs'

const hour = (time: string, precipitation: number, et0 = 0.1): HourlyPoint => ({
  time, temperature: 10, dewPoint: 5, precipitation, cloudCover: 0, windSpeed: 0, windGusts: 0, et0,
  soilTemp0: 0, soilTemp6: 0, sky: 'sun', modelCount: 1,
})
const day = (date: string, p: number) => Array.from({ length: 24 }, (_, h) => hour(`${date}T${String(h).padStart(2, '0')}:00`, p / 24))

describe('buildPastWater', () => {
  it('prefers the archive, falls back to forecast hours, and counts only elapsed hours today', () => {
    const hours = [...day('2026-05-08', 24), ...day('2026-05-09', 0), ...day('2026-05-10', 24)]
    const history = [{ date: '2026-05-08', precip: 5, et0: 2 }]
    const w = buildPastWater(history, hours, '2026-05-10T11:30')
    expect(w.find((d) => d.date === '2026-05-08')).toMatchObject({ precip: 5, et0: 2 }) // archive wins
    expect(w.find((d) => d.date === '2026-05-09')!.precip).toBe(0) // from hours
    const today = w.at(-1)!
    expect(today.date).toBe('2026-05-10')
    expect(today.precip).toBeCloseTo(12) // hours 00..11 of a 24 mm day
  })
})

describe('rainNext48', () => {
  it('sums the next 48 hours from now', () => {
    const hours = [...day('2026-05-10', 24), ...day('2026-05-11', 24), ...day('2026-05-12', 24), ...day('2026-05-13', 24)]
    expect(rainNext48(hours, '2026-05-10T12:00')).toBeCloseTo(48)
  })
})
