import { describe, expect, it } from 'vitest'
import { VARIABLES, type ModelSeries, type RawForecast, type Variable } from '../types'
import { combineForecast, dayReliability, deriveSky, modelWeight } from './ensemble'

function times(days: number): string[] {
  const out: string[] = []
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      out.push(`2026-03-${String(10 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`)
    }
  }
  return out
}

function model(name: string, n: number, over: Partial<Record<Variable, (i: number) => number | null>> = {}): ModelSeries {
  const values = {} as Record<Variable, (number | null)[]>
  for (const v of VARIABLES) {
    const f = over[v] ?? (() => 0)
    values[v] = Array.from({ length: n }, (_, i) => f(i))
  }
  return { model: name, values, weatherCode: Array(n).fill(0) }
}

const NOW = '2026-03-10T08:30'

describe('modelWeight', () => {
  it('trusts high-resolution models in the short range', () => {
    expect(modelWeight('icon_d2', 10)).toBe(2)
    expect(modelWeight('icon_eu', 10)).toBe(1)
  })
  it('trusts ECMWF in the long range', () => {
    expect(modelWeight('ecmwf_ifs025', 80)).toBe(2)
    expect(modelWeight('icon_d2', 80)).toBe(1)
  })
})

describe('deriveSky', () => {
  it('maps values to a condition', () => {
    expect(deriveSky({ precipitation: 0, cloudCover: 10, temperature: 15 })).toBe('sun')
    expect(deriveSky({ precipitation: 0, cloudCover: 50, temperature: 15 })).toBe('partly')
    expect(deriveSky({ precipitation: 0, cloudCover: 90, temperature: 15 })).toBe('cloudy')
    expect(deriveSky({ precipitation: 1, cloudCover: 90, temperature: 15 })).toBe('rain')
    expect(deriveSky({ precipitation: 1, cloudCover: 90, temperature: 0 })).toBe('snow')
    expect(deriveSky({ precipitation: 1, cloudCover: 90, temperature: 15, storm: true })).toBe('storm')
    expect(deriveSky({ precipitation: 0, cloudCover: 100, temperature: 5, fog: true })).toBe('fog')
  })
})

describe('combineForecast', () => {
  it('computes a weighted mean, favouring high-resolution models early', () => {
    const t = times(2)
    const raw: RawForecast = {
      fetchedAt: 0,
      utcOffsetSeconds: 0,
      times: t,
      models: [
        model('icon_d2', 48, { temperature: () => 10 }),
        model('ecmwf_ifs025', 48, { temperature: () => 13 }),
      ],
    }
    const { hours } = combineForecast(raw, NOW)
    expect(hours[10].temperature).toBeCloseTo((10 * 2 + 13) / 3)
  })

  it('ignores models with missing values at that hour', () => {
    const t = times(2)
    const raw: RawForecast = {
      fetchedAt: 0,
      utcOffsetSeconds: 0,
      times: t,
      models: [
        model('icon_d2', 48, { temperature: (i) => (i < 24 ? 10 : null) }),
        model('icon_eu', 48, { temperature: () => 14 }),
      ],
    }
    const { hours } = combineForecast(raw, NOW)
    expect(hours[30].temperature).toBe(14)
    expect(hours[30].modelCount).toBe(1)
  })

  it('builds daily summaries from today onwards', () => {
    const t = times(3)
    const raw: RawForecast = {
      fetchedAt: 0,
      utcOffsetSeconds: 0,
      times: t,
      models: [
        model('icon_eu', 72, {
          temperature: (i) => 5 + (i % 24 === 14 ? 10 : 0),
          precipitation: (i) => (i >= 48 && i % 24 === 9 ? 6 : 0),
          windSpeed: () => 8,
          windGusts: (i) => (i % 24 === 15 ? 30 : 12),
          cloudCover: () => 10,
        }),
        model('ecmwf_ifs025', 72, {
          temperature: (i) => 5 + (i % 24 === 14 ? 10 : 0),
          precipitation: (i) => (i >= 48 && i % 24 === 9 ? 6 : 0),
          windSpeed: () => 8,
          windGusts: (i) => (i % 24 === 15 ? 30 : 12),
          cloudCover: () => 10,
        }),
      ],
    }
    const { days } = combineForecast(raw, NOW)
    expect(days.map((d) => d.date)).toEqual(['2026-03-10', '2026-03-11', '2026-03-12'])
    expect(days[0]).toMatchObject({ tMin: 5, tMax: 15, precipSum: 0, gustMax: 30, sky: 'sun' })
    expect(days[2]).toMatchObject({ precipSum: 6, sky: 'rain' })
  })
})

describe('dayReliability', () => {
  const same = { tMin: 4, tMax: 14, precipSum: 0 }
  it('is high when models agree on a near day', () => {
    expect(dayReliability([same, { ...same }, { ...same }], 0)).toEqual({ score: 100, level: 'alta' })
  })
  it('drops when models disagree on rain', () => {
    const r = dayReliability([same, { ...same, precipSum: 8 }, same, { ...same, precipSum: 6 }], 1)
    expect(r.level).not.toBe('alta')
  })
  it('drops with temperature spread', () => {
    const r = dayReliability([same, { tMin: 0, tMax: 20, precipSum: 0 }], 1)
    expect(r.score).toBeLessThan(60)
  })
  it('drops with distance and with a single model', () => {
    expect(dayReliability([same, same], 4).score).toBeLessThan(dayReliability([same, same], 0).score)
    expect(dayReliability([same], 0).score).toBeLessThan(100)
  })
})
