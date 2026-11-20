import { describe, expect, it } from 'vitest'
import type { FrostNight } from '../frost/frost'
import type { HourlyPoint } from '../types'
import { newCustomCrop, type Crop } from './crops'
import { adviseAll, groupByCrop, inPeriod, soilTemps, type MethodAdvice, type SowingConditions } from './sowing'

const crop = (over: Partial<Crop> = {}): Crop => ({
  ...newCustomCrop('Test', '🌱'),
  id: 'test',
  soilTempMin: 12,
  frost: 'sensibile',
  periods: { diretta: [{ from: '04-25', to: '07-15' }] },
  ...over,
})

const night = (dayIndex: number, level: FrostNight['level'], air: number, ground: number): FrostNight => ({
  morningDate: `2026-05-${String(10 + dayIndex).padStart(2, '0')}`,
  dayIndex,
  tMinAir: air,
  tMinGround: ground,
  level,
  confidence: 'alta',
  factors: { clearSky: true, calm: true, dryAir: true },
  firstFrostTime: null,
})

const cond = (over: Partial<SowingConditions> = {}): SowingConditions => ({
  today: '2026-05-10',
  soilPast: 15,
  soilNext: 16,
  frostNights: [],
  lateFrostUntil: null,
  ...over,
})

const one = (c: Crop, k: SowingConditions): MethodAdvice => adviseAll([c], k)[0]

describe('inPeriod', () => {
  it('handles normal and year-wrapping windows', () => {
    expect(inPeriod('05-10', { from: '04-25', to: '07-15' })).toBe(true)
    expect(inPeriod('08-01', { from: '04-25', to: '07-15' })).toBe(false)
    expect(inPeriod('12-20', { from: '11-15', to: '02-10' })).toBe(true)
    expect(inPeriod('01-05', { from: '11-15', to: '02-10' })).toBe(true)
    expect(inPeriod('06-01', { from: '11-15', to: '02-10' })).toBe(false)
  })
})

describe('adviseAll: window', () => {
  it('says "ora" inside the window with warm soil and no frost', () => {
    expect(one(crop(), cond()).status).toBe('ora')
  })
  it('says "presto" shortly before the window and "fuori" long before', () => {
    const early = one(crop(), cond({ today: '2026-04-10' }))
    expect(early).toMatchObject({ status: 'presto', startsIn: 15 })
    expect(one(crop(), cond({ today: '2026-01-10' })).status).toBe('fuori')
  })
  it('says "fuori" after the window', () => {
    expect(one(crop(), cond({ today: '2026-09-01' })).status).toBe('fuori')
  })
})

describe('adviseAll: soil temperature moves the date forward', () => {
  it('postpones when soil is below the threshold now and in the forecast', () => {
    const a = one(crop(), cond({ soilPast: 9, soilNext: 10 }))
    expect(a).toMatchObject({ status: 'rimanda', reason: 'suolo-freddo', soilNeeded: 12 })
  })
  it('postpones when the soil is about to cool down', () => {
    expect(one(crop(), cond({ soilPast: 14, soilNext: 9 })).status).toBe('rimanda')
  })
  it('allows it when soil is cold now but clearly warming up', () => {
    const a = one(crop(), cond({ soilPast: 10, soilNext: 15 }))
    expect(a.status).toBe('ora')
    expect(a.warming).toBe(true)
  })
  it('does not apply to the protected seedbed', () => {
    const c = crop({ periods: { semenzaio: [{ from: '02-15', to: '05-30' }] } })
    expect(one(c, cond({ soilPast: 2, soilNext: 3 })).status).toBe('ora')
  })
  it('ignores soil temperature when it is unknown', () => {
    expect(one(crop(), cond({ soilPast: null, soilNext: null })).status).toBe('ora')
  })
})

describe('adviseAll: frost is warned, not forbidden', () => {
  const frost = [night(0, 'nessuno', 8, 6), night(3, 'probabile', 1, -2.3)]
  it('flags a tender crop with the day and the minimum', () => {
    const a = one(crop(), cond({ frostNights: frost }))
    expect(a.status).toBe('attenzione')
    expect(a.frost).toMatchObject({ dayIndex: 3, tMinAir: 1, tMinGround: -2.3 })
  })
  it('does not flag a hardy crop for a light frost', () => {
    expect(one(crop({ frost: 'resistente' }), cond({ frostNights: frost })).status).toBe('ora')
  })
  it('flags a half-hardy crop only for a hard frost', () => {
    const c = crop({ frost: 'tollerante' })
    expect(one(c, cond({ frostNights: [night(2, 'possibile', 3, 1)] })).status).toBe('ora')
    expect(one(c, cond({ frostNights: frost })).status).toBe('ora') // -2.3 °C on the ground is bearable
    expect(one(c, cond({ frostNights: [night(2, 'probabile', -1, -4)] })).status).toBe('attenzione')
  })
  it('does not warn for the protected seedbed', () => {
    const c = crop({ periods: { semenzaio: [{ from: '02-15', to: '05-30' }] } })
    expect(one(c, cond({ frostNights: frost })).status).toBe('ora')
  })
  it('postponing for cold soil wins over the frost warning', () => {
    expect(one(crop(), cond({ soilPast: 8, soilNext: 9, frostNights: frost })).reason).toBe('suolo-freddo')
  })
  it('notes late frosts beyond the forecast for tender crops in spring', () => {
    const a = one(crop(), cond({ today: '2026-04-28', lateFrostUntil: '05-05' }))
    expect(a.status).toBe('ora')
    expect(a.lateFrostUntil).toBe('05-05')
    expect(one(crop({ frost: 'resistente' }), cond({ today: '2026-04-28', lateFrostUntil: '05-05' })).lateFrostUntil).toBeUndefined()
    expect(one(crop(), cond({ today: '2026-05-10', lateFrostUntil: '05-05' })).lateFrostUntil).toBeUndefined()
  })
})

describe('adviseAll: ordering', () => {
  it('lists actionable items before postponed and upcoming ones', () => {
    const list = adviseAll(
      [
        crop({ id: 'a', name: 'A', periods: { diretta: [{ from: '05-25', to: '06-30' }] } }), // presto
        crop({ id: 'b', name: 'B', soilTempMin: 30 }), // rimanda
        crop({ id: 'c', name: 'C' }), // ora
      ],
      cond(),
    )
    expect(list.map((a) => a.status)).toEqual(['ora', 'rimanda', 'presto'])
  })
})

describe('soilTemps', () => {
  it('averages the last 7 and the next 5 days', () => {
    const hours: HourlyPoint[] = []
    for (let d = 0; d < 13; d++)
      for (let h = 0; h < 24; h++)
        hours.push({
          time: `2026-05-${String(3 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
          temperature: 10, dewPoint: 5, precipitation: 0, cloudCover: 0, windSpeed: 0, windGusts: 0, et0: 0,
          soilTemp0: 0, soilTemp6: d < 7 ? 10 : 14, sky: 'sun', modelCount: 1,
        })
    const t = soilTemps(hours, '2026-05-10T00:00')
    expect(t.soilPast).toBe(10)
    expect(t.soilNext).toBe(14)
  })
})

describe('groupByCrop', () => {
  it('puts the techniques of one crop in the same status together', () => {
    const c = crop({ periods: { semenzaio: [{ from: '02-01', to: '06-30' }], trapianto: [{ from: '05-01', to: '06-30' }] } })
    const groups = groupByCrop(adviseAll([c, crop({ id: 'other', name: 'Other' })], cond()))
    expect(groups.map((g) => g.map((a) => a.method))).toEqual([['diretta'], ['semenzaio', 'trapianto']]) // sorted by crop name: Other, Test
  })
})
