import { describe, expect, it } from 'vitest'
import { VARIABLES, type HourlyPoint, type ModelSeries, type RawForecast, type Variable } from '../types'
import { assessFrost, nextFrostRisk, radiativeCooling } from './frost'

describe('radiativeCooling', () => {
  it('is maximal with clear sky, calm wind and dry air', () => {
    expect(radiativeCooling(0, 0, 8)).toBeCloseTo(3.5)
  })
  it('vanishes under thick clouds', () => {
    expect(radiativeCooling(100, 0, 8)).toBe(0)
  })
  it('is cut by wind and by humid air', () => {
    expect(radiativeCooling(0, 20, 8)).toBeLessThan(0.6)
    expect(radiativeCooling(0, 0, 0.5)).toBeLessThan(1)
  })
})

const times: string[] = []
for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) times.push(`2026-03-${String(10 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`)

interface Night {
  t: number
  cloud: number
  wind: number
  dew: number
}

function build(perNight: Record<string, Night>, modelOffsets = [0, 0]) {
  const mk = (offset: number): ModelSeries => {
    const values = {} as Record<Variable, (number | null)[]>
    for (const v of VARIABLES) values[v] = times.map(() => 0)
    times.forEach((time, i) => {
      const h = Number(time.slice(11, 13))
      const date = time.slice(0, 10)
      const isNight = h >= 18 || h < 9
      const morning = h >= 18 ? new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10) : date
      const n = perNight[morning]
      values.temperature[i] = isNight && n ? n.t + offset : 15
      values.cloudCover[i] = isNight && n ? n.cloud : 20
      values.windSpeed[i] = isNight && n ? n.wind : 5
      values.dewPoint[i] = isNight && n ? n.t - n.dew : 5
    })
    return { model: 'm', values, weatherCode: times.map(() => 0) }
  }
  const models = modelOffsets.map(mk)
  const hours: HourlyPoint[] = times.map((time, i) => ({
    time,
    temperature: models.reduce((a, m) => a + m.values.temperature[i]!, 0) / models.length,
    dewPoint: models[0].values.dewPoint[i],
    precipitation: 0,
    cloudCover: models[0].values.cloudCover[i],
    windSpeed: models[0].values.windSpeed[i],
    windGusts: 0,
    et0: 0,
    soilTemp0: 0,
    soilTemp6: 0,
    sky: 'sun',
    modelCount: models.length,
  }))
  const raw: RawForecast = { fetchedAt: 0, utcOffsetSeconds: 0, times, models }
  return { raw, combined: { hours, days: [] } }
}

const NOW = '2026-03-10T12:00'

describe('assessFrost', () => {
  it('flags a clear calm night with 2 °C at 2 m as probable ground frost', () => {
    const { raw, combined } = build({ '2026-03-11': { t: 2, cloud: 0, wind: 2, dew: 8 } })
    const n = assessFrost(raw, combined, NOW).find((x) => x.morningDate === '2026-03-11')!
    expect(n.tMinAir).toBe(2)
    expect(n.tMinGround).toBeCloseTo(-1.5)
    expect(n.level).toBe('probabile')
    expect(n.factors).toEqual({ clearSky: true, calm: true, dryAir: true })
  })

  it('does not flag a cloudy windy night at 4 °C', () => {
    const { raw, combined } = build({ '2026-03-11': { t: 4, cloud: 100, wind: 20, dew: 3 } })
    const n = assessFrost(raw, combined, NOW).find((x) => x.morningDate === '2026-03-11')!
    expect(n.level).toBe('nessuno')
  })

  it('reports possible frost between 0 and 3 °C at ground level', () => {
    const { raw, combined } = build({ '2026-03-11': { t: 3, cloud: 60, wind: 3, dew: 4 } })
    const n = assessFrost(raw, combined, NOW).find((x) => x.morningDate === '2026-03-11')!
    expect(n.level).toBe('possibile')
  })

  it('warns days ahead and finds the first risky night', () => {
    const { raw, combined } = build({
      '2026-03-11': { t: 8, cloud: 50, wind: 5, dew: 4 },
      '2026-03-12': { t: 7, cloud: 50, wind: 5, dew: 4 },
      '2026-03-14': { t: 0, cloud: 5, wind: 2, dew: 7 },
    })
    const nights = assessFrost(raw, combined, NOW)
    const risk = nextFrostRisk(nights)!
    expect(risk.morningDate).toBe('2026-03-14')
    expect(risk.dayIndex).toBe(4)
    expect(risk.level).toBe('probabile')
    expect(risk.firstFrostTime).not.toBeNull()
  })

  it('lowers confidence when models disagree on the minimum', () => {
    const agree = build({ '2026-03-11': { t: 1, cloud: 0, wind: 2, dew: 8 } }, [0, 0])
    const split = build({ '2026-03-11': { t: 1, cloud: 0, wind: 2, dew: 8 } }, [-2, 2])
    const a = assessFrost(agree.raw, agree.combined, NOW).find((x) => x.morningDate === '2026-03-11')!
    const s = assessFrost(split.raw, split.combined, NOW).find((x) => x.morningDate === '2026-03-11')!
    expect(a.confidence).toBe('alta')
    expect(s.confidence).not.toBe('alta')
  })

  it('ignores nights already over', () => {
    const { raw, combined } = build({ '2026-03-10': { t: -2, cloud: 0, wind: 1, dew: 8 } })
    expect(assessFrost(raw, combined, '2026-03-10T12:00').find((x) => x.morningDate === '2026-03-10')).toBeUndefined()
  })
})
