import { describe, expect, it } from 'vitest'
import { VARIABLES, type ModelSeries, type RawForecast, type Variable } from '../types'
import { assessHail, classify, hourScore, nextHailAlert, shear } from './hail'

describe('shear', () => {
  it('is the vector difference between ground and 500 hPa wind, in m/s', () => {
    // 36 km/h (10 m/s) from the south at the ground, 108 km/h (30 m/s) from the south aloft: 20 m/s
    expect(shear(36, 180, 108, 180)).toBeCloseTo(20)
    // opposite directions add up
    expect(shear(36, 0, 36, 180)).toBeCloseTo(20)
  })
  it('is null when something is missing', () => {
    expect(shear(null, 0, 10, 0)).toBeNull()
  })
})

const base = { cape: 0, shearMs: 0, precipitation: 0, weatherCode: 0, freezingLevel: 3500 }

describe('hourScore', () => {
  it('gives nothing for instability without showers', () => {
    expect(hourScore({ ...base, cape: 3000, shearMs: 25 })).toBe(0)
  })
  it('grows with CAPE and shear when it is showering', () => {
    expect(hourScore({ ...base, cape: 400, precipitation: 2 })).toBe(1)
    expect(hourScore({ ...base, cape: 1000, precipitation: 2 })).toBe(2)
    expect(hourScore({ ...base, cape: 1800, precipitation: 2, shearMs: 20 })).toBe(5)
  })
  it('counts the models’ own thunder and hail codes', () => {
    expect(hourScore({ ...base, weatherCode: 95 })).toBe(1)
    expect(hourScore({ ...base, weatherCode: 96, cape: 1000 })).toBe(4)
    expect(hourScore({ ...base, weatherCode: 99, cape: 1800, shearMs: 20 })).toBe(8)
  })
  it('reduces the score when the freezing level is very high', () => {
    const hail = { ...base, weatherCode: 96, cape: 1000 }
    expect(hourScore({ ...hail, freezingLevel: 5000 })).toBe(hourScore(hail) - 1)
  })
})

const md = (...scores: number[]) => scores.map((score) => ({ score, hail: false }))

describe('classify', () => {
  it('stays quiet for weak or lonely signals', () => {
    expect(classify(md(2, 1, 0, 0, 1), 1)).toBe('nessuno')
    expect(classify(md(3, 2, 1), 1)).toBe('nessuno')
    expect(classify(md(3, 3, 0), 1)).toBe('nessuno') // two worried models are not yet an alert
    expect(classify(md(4, 0, 0), 1)).toBe('nessuno') // a single convinced model, nobody else worried
  })
  it('goes yellow when one model is convinced and another is worried', () => {
    expect(classify(md(4, 3, 0), 1)).toBe('gialla')
  })
  it('goes yellow on an explicit hail forecast with a high score', () => {
    expect(classify([{ score: 4, hail: true }, { score: 0, hail: false }], 1)).toBe('gialla')
    expect(classify([{ score: 2, hail: true }], 1)).toBe('nessuno')
  })
  it('goes orange only when models agree on a strong signal', () => {
    expect(classify(md(5, 5, 1), 1)).toBe('arancione')
    expect(classify(md(6, 4, 0), 1)).toBe('arancione')
    expect(classify(md(7, 1, 0), 1)).toBe('nessuno')
  })
  it('does not go orange far ahead', () => {
    expect(classify(md(6, 6, 6), 4)).toBe('gialla')
  })
})

function times(days: number): string[] {
  const out: string[] = []
  for (let d = 0; d < days; d++) for (let h = 0; h < 24; h++) out.push(`2026-07-${String(10 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`)
  return out
}

/** A model with a thunderstorm on the afternoon of the given day index. */
function model(name: string, n: number, stormDay: number | null, strength = 1800, code = 96): ModelSeries {
  const values = {} as Record<Variable, (number | null)[]>
  for (const v of VARIABLES) values[v] = Array(n).fill(0)
  const conv = { cape: Array(n).fill(100), wind500: Array(n).fill(80), dir500: Array(n).fill(270), dir10: Array(n).fill(180), freezingLevel: Array(n).fill(3800) }
  const weatherCode: number[] = Array(n).fill(1)
  values.windSpeed = Array(n).fill(10)
  if (stormDay !== null) {
    for (let h = 15; h <= 18; h++) {
      const i = stormDay * 24 + h
      conv.cape[i] = strength
      weatherCode[i] = code
      values.precipitation[i] = 6
    }
  }
  return { model: name, values, weatherCode, convective: conv }
}

const NOW = '2026-07-10T08:00'
const raw = (models: ModelSeries[]): RawForecast => ({ fetchedAt: 0, utcOffsetSeconds: 0, times: times(4), models })

describe('assessHail', () => {
  it('raises an orange alert for tomorrow afternoon when models agree, with the time window', () => {
    const r = assessHail(raw([model('icon_d2', 96, 1), model('icon_eu', 96, 1), model('ecmwf_ifs025', 96, 1)]), NOW)
    const d = r.days.find((x) => x.date === '2026-07-11')!
    expect(r.available).toBe(true)
    expect(d).toMatchObject({ dayIndex: 1, level: 'arancione', hailCode: true, models: 3, agreeing: 3 })
    expect(d.window).toEqual({ from: '15:00', to: '19:00' })
    expect(d.capeMax).toBe(1800)
    expect(r.days.find((x) => x.date === '2026-07-10')!.level).toBe('nessuno')
  })

  it('is yellow when only one model forecasts hail explicitly, but with low confidence', () => {
    const r = assessHail(raw([model('icon_d2', 96, 2), model('icon_eu', 96, null), model('ecmwf_ifs025', 96, null)]), NOW)
    const d = r.days.find((x) => x.date === '2026-07-12')!
    expect(d.level).toBe('gialla')
    expect(d.confidence).not.toBe('alta')
  })
  it('stays quiet when a model sees a thunderstorm without hail and nobody confirms', () => {
    const r = assessHail(raw([model('icon_d2', 96, 2, 900, 95), model('icon_eu', 96, null), model('ecmwf_ifs025', 96, null)]), NOW)
    expect(r.days.find((x) => x.date === '2026-07-12')!.level).toBe('nessuno')
  })

  it('stays calm on an ordinary day', () => {
    const r = assessHail(raw([model('icon_d2', 96, null), model('icon_eu', 96, null)]), NOW)
    expect(r.days.every((d) => d.level === 'nessuno')).toBe(true)
    expect(nextHailAlert(r.days)).toBeNull()
  })

  it('ignores hours that are already past today', () => {
    const r = assessHail(raw([model('icon_d2', 96, 0), model('icon_eu', 96, 0)]), '2026-07-10T20:00')
    expect(r.days.find((d) => d.date === '2026-07-10')?.level ?? 'nessuno').toBe('nessuno')
  })

  it('finds the first alert', () => {
    const r = assessHail(raw([model('icon_d2', 96, 2), model('icon_eu', 96, 2)]), NOW)
    expect(nextHailAlert(r.days)?.date).toBe('2026-07-12')
  })

  it('reports "not available" when the forecast has no convective data', () => {
    const m = model('icon_d2', 96, 1)
    delete m.convective
    expect(assessHail(raw([m]), NOW)).toEqual({ available: false, days: [] })
  })

  it('skips models that do not reach a later day', () => {
    const short = model('icon_d2', 96, null)
    short.convective!.cape = short.convective!.cape.map((v, i) => (i >= 48 ? null : v))
    const r = assessHail(raw([short, model('icon_eu', 96, 3), model('ecmwf_ifs025', 96, 3)]), NOW)
    expect(r.days.find((d) => d.dayIndex === 3)!.models).toBe(2)
  })
})

describe('pre-storm environment', () => {
  it('uses the CAPE of the previous hours, because a storm consumes it', () => {
    const m = model('icon_d2', 96, 1, 2000, 96)
    // the storm hour itself has low CAPE left, the hours before had plenty
    const i = 24 + 17
    m.convective!.cape[i] = 150
    const m2 = model('icon_eu', 96, 1, 2000, 96)
    m2.convective!.cape[i] = 150
    const d = assessHail(raw([m, m2]), NOW).days.find((x) => x.dayIndex === 1)!
    expect(d.level).toBe('arancione')
  })
})
