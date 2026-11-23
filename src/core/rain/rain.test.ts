import { describe, expect, it } from 'vitest'
import type { DailySummary, HourlyPoint } from '../types'
import { buildRainDays, compareToAverage, groupByMonth, intensity, monthClimate, niceAxis, rainStats, type RainDay } from './rain'

const day = (date: string, mm: number, kind: RainDay['kind'] = 'past'): RainDay => ({ date, mm, tMin: 5, tMax: 12, kind })

describe('rainStats', () => {
  const days = [day('2026-11-01', 0), day('2026-11-02', 0.4), day('2026-11-03', 12), day('2026-11-04', 0), day('2026-11-05', 0), day('2026-11-06', 0), day('2026-11-07', 30)]
  it('totals, counts rainy days (>= 1 mm) and finds the wettest day', () => {
    const s = rainStats(days)
    expect(s.total).toBeCloseTo(42.4)
    expect(s.rainyDays).toBe(2)
    expect(s.maxDay?.date).toBe('2026-11-07')
    expect(s.lastRain?.date).toBe('2026-11-07')
  })
  it('measures the dry spells', () => {
    expect(rainStats(days).longestDry).toBe(3) // 4th, 5th, 6th
    expect(rainStats(days).dryNow).toBe(0)
    expect(rainStats([...days, day('2026-11-08', 0), day('2026-11-09', 0.2)]).dryNow).toBe(2)
    expect(rainStats([day('2026-11-01', 5), day('2026-11-02', 0), day('2026-11-03', 0), day('2026-11-04', 0)]).dryNow).toBe(3)
  })
  it('a gap in the data breaks a dry spell instead of inventing one', () => {
    const s = rainStats([day('2026-11-01', 0), day('2026-11-02', 0), day('2026-11-10', 0)])
    expect(s.longestDry).toBe(2)
    expect(s.dryNow).toBe(1)
  })
  it('ignores forecast days and has no wettest day when it never rained', () => {
    expect(rainStats([day('2026-11-01', 0), day('2026-11-02', 50, 'forecast')]).total).toBe(0)
    expect(rainStats([day('2026-11-01', 0)]).maxDay).toBeNull()
    expect(rainStats([]).dayCount).toBe(0)
  })
})

describe('groupByMonth', () => {
  it('sums the months of the requested year only', () => {
    const m = groupByMonth([{ date: '2026-01-05', mm: 10 }, { date: '2026-01-06', mm: 0.5 }, { date: '2026-03-01', mm: 3 }, { date: '2025-01-01', mm: 99 }], 2026)
    expect(m[0]).toMatchObject({ month: 1, mm: 10.5, rainyDays: 1, days: 2, length: 31 })
    expect(m[2]).toMatchObject({ mm: 3, rainyDays: 1 })
    expect(m[1]).toMatchObject({ mm: 0, days: 0, length: 28 })
  })
  it('knows leap years', () => {
    expect(groupByMonth([], 2024)[1].length).toBe(29)
  })
})

describe('monthClimate', () => {
  const month = (y: number, m: number, mmPerDay: number) =>
    Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => ({ date: `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, precip: mmPerDay }))
  it('averages each calendar month over the years', () => {
    const c = monthClimate([...month(2023, 11, 2), ...month(2024, 11, 4)])
    expect(c.mm[10]).toBeCloseTo(90) // (60 + 120) / 2
    expect(c.rainyDays[10]).toBe(30)
    expect(c.years).toBe(2)
    expect(c.mm[0]).toBe(0)
  })
  it('skips incomplete months and missing values', () => {
    const partial = month(2024, 11, 5).slice(0, 10)
    expect(monthClimate(partial).mm[10]).toBe(0)
    expect(monthClimate([{ date: '2024-11-01', precip: null }]).years).toBe(0)
  })
})

describe('compareToAverage', () => {
  it('describes how a month compares with the usual', () => {
    expect(compareToAverage(140, 95)).toEqual({ pct: 47, level: 'piu' })
    expect(compareToAverage(200, 95).level).toBe('molto-piu')
    expect(compareToAverage(95, 95).level).toBe('nella-media')
    expect(compareToAverage(60, 95).level).toBe('meno')
    expect(compareToAverage(20, 95).level).toBe('molto-meno')
  })
  it('does not divide by a tiny average', () => {
    expect(compareToAverage(10, 1).pct).toBeNull()
  })
})

describe('niceAxis', () => {
  it('gives round maxima and few ticks', () => {
    expect(niceAxis(33)).toEqual({ max: 40, step: 10 })
    expect(niceAxis(3)).toEqual({ max: 3, step: 1 })
    expect(niceAxis(120)).toEqual({ max: 150, step: 50 })
    expect(niceAxis(0)).toEqual({ max: 1, step: 1 })
    expect(niceAxis(8)).toEqual({ max: 8, step: 2 })
  })
})

describe('intensity', () => {
  it('grades the rain', () => {
    expect([0.3, 2, 15, 40].map(intensity)).toEqual(['trace', 'debole', 'moderata', 'forte'])
  })
})

describe('buildRainDays', () => {
  const hour = (time: string, p: number): HourlyPoint => ({
    time, temperature: 10, dewPoint: 5, precipitation: p, cloudCover: 0, windSpeed: 0, windGusts: 0, et0: 0, soilTemp0: 0, soilTemp6: 0, sky: 'sun', modelCount: 1,
  })
  const hoursOf = (date: string, p: number) => Array.from({ length: 24 }, (_, h) => hour(`${date}T${String(h).padStart(2, '0')}:00`, p))
  const fday = (date: string, mm: number): DailySummary => ({
    date, dayIndex: 0, tMin: 4, tMax: 11, precipSum: mm, et0Sum: 0, windMax: 0, gustMax: 0, sky: 'rain', reliability: { score: 80, level: 'alta' },
  })
  it('mixes archive, model hours, today so far and the forecast', () => {
    const hours = [...hoursOf('2026-11-08', 0.5), ...hoursOf('2026-11-10', 1)]
    const days = buildRainDays(
      [{ date: '2026-11-07', precip: 4, tMin: 3, tMax: 9 }],
      hours,
      [fday('2026-11-10', 9), fday('2026-11-11', 6)],
      '2026-11-10T11:30',
      '2026-11-07',
      '2026-11-11',
    )
    expect(days.map((d) => `${d.date}:${d.kind}:${d.mm}`)).toEqual([
      '2026-11-07:past:4', // archive
      '2026-11-08:past:12', // not in the archive yet: model hours
      // 2026-11-09 has no data at all: left out
      '2026-11-10:today:12', // hours 00..11 of a 1 mm/h day
      '2026-11-11:forecast:6',
    ])
    expect(days.find((d) => d.kind === 'today')?.expectedMm).toBe(9)
  })
})
