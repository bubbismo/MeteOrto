import { describe, expect, it } from 'vitest'
import { csvSource, parseObservationsCsv } from '../../adapters/datasource/csv'
import type { HourlyPoint, Observation } from '../types'
import { applyBias, estimateBias } from './bias'

const hour = (i: number, temperature: number | null): HourlyPoint => ({
  time: `2026-03-${String(10 + Math.floor(i / 24)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00`,
  temperature, dewPoint: temperature === null ? null : temperature - 3, precipitation: 0, cloudCover: 0, windSpeed: 0, windGusts: 0,
  et0: 0, soilTemp0: 0, soilTemp6: 0, sky: 'sun', modelCount: 3,
})
const forecast = Array.from({ length: 72 }, (_, i) => hour(i, 8))
const obs = (n: number, delta: number): Observation[] => forecast.slice(0, n).map((h) => ({ time: h.time, temperature: 8 + delta }))

describe('estimateBias', () => {
  it('finds a station that is colder than the models', () => {
    expect(estimateBias(obs(60, -1.5), forecast)).toEqual({ temperature: -1.5, samples: 60 })
  })
  it('needs at least two days of data', () => {
    expect(estimateBias(obs(30, -1.5), forecast)).toBeNull()
  })
  it('ignores hours without a forecast or a reading', () => {
    const o = [...obs(60, 2), { time: '2030-01-01T00:00', temperature: 99 }, { time: forecast[0].time }]
    expect(estimateBias(o, forecast)!.temperature).toBeCloseTo(2)
  })
})

describe('applyBias', () => {
  it('shifts temperature and dew point', () => {
    const [h] = applyBias(forecast, { temperature: -2, samples: 60 })
    expect(h.temperature).toBe(6)
    expect(h.dewPoint).toBe(3)
  })
  it('leaves the forecast alone without a bias or with missing values', () => {
    expect(applyBias(forecast, null)).toBe(forecast)
    expect(applyBias([hour(0, null)], { temperature: 1, samples: 60 })[0].temperature).toBeNull()
  })
})

describe('CSV station source', () => {
  const csv = 'Time,Temperature,Precipitation,Wind\n2026-03-10 14:05,10.2,0.2,5\n2026-03-10 14:35,10.8,0.1,7\n2026-03-10T15:00,11,0,6\nbad,1,2,3\n'
  it('averages readings per hour and sums the rain', () => {
    expect(parseObservationsCsv(csv)).toEqual([
      { time: '2026-03-10T14:00', temperature: 10.5, precipitation: 0.30000000000000004, windSpeed: 6 },
      { time: '2026-03-10T15:00', temperature: 11, precipitation: 0, windSpeed: 6 },
    ])
  })
  it('accepts a decimal comma and returns nothing without a time column', () => {
    expect(parseObservationsCsv('time;x\n')).toEqual([])
    expect(parseObservationsCsv('time,temperature\n2026-03-10 10:00,"9,5"\n')[0].temperature).toBe(9.5)
  })
  it('implements DataSource over a time range', async () => {
    const s = csvSource('Stazione', csv)
    const r = await s.fetchObservations(new Date('2026-03-10T15:00:00Z'), new Date('2026-03-10T16:00:00Z'))
    expect(r.map((o) => o.time)).toEqual(['2026-03-10T15:00'])
  })
})
