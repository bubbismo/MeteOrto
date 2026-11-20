import * as SunCalc from 'suncalc'
import { describe, expect, it } from 'vitest'
import type { HorizonProfile } from '../types'
import { directSunWindows, effectiveSunMinutes, formatLocalTime, horizonAltitude, isDaylight, localToEpoch, totalMinutes } from './sun'

const LAT = 44.6863
const LON = 9.8568
const OFFSET = 3600 // CET, November
const DATE = '2026-11-20'

const flat: HorizonProfile = { source: 'dem', points: [{ az: 0, alt: 0 }, { az: 180, alt: 0 }] }

function wall(from: number, to: number, alt: number): HorizonProfile {
  const points = []
  for (let az = 0; az < 360; az += 10) points.push({ az, alt: az >= from && az <= to ? alt : 0 })
  return { source: 'dem', points }
}

const minutesOf = (ms: number) => Math.round(ms / 60000)

describe('horizonAltitude', () => {
  const pts = [{ az: 10, alt: 0 }, { az: 90, alt: 20 }, { az: 350, alt: 10 }]
  it('interpolates linearly', () => {
    expect(horizonAltitude(pts, 50)).toBeCloseTo(10)
  })
  it('wraps around north', () => {
    // between 350 (10) and 10 (0): at 0 it is the midpoint
    expect(horizonAltitude(pts, 0)).toBeCloseTo(5)
    expect(horizonAltitude(pts, 360)).toBeCloseTo(5)
  })
  it('handles an empty profile', () => {
    expect(horizonAltitude([], 100)).toBe(0)
  })
})

describe('directSunWindows', () => {
  it('matches astronomical sunrise and sunset on a flat horizon', () => {
    const [w, ...rest] = directSunWindows(DATE, OFFSET, LAT, LON, flat)
    expect(rest).toHaveLength(0)
    const t = SunCalc.getTimes(new Date(localToEpoch(DATE + 'T12:00', OFFSET)), LAT, LON)
    // sunrise/sunset in suncalc include refraction and the solar disc: allow a few minutes
    expect(Math.abs(minutesOf(w.start - t.sunrise!.getTime()))).toBeLessThanOrEqual(8)
    expect(Math.abs(minutesOf(w.end - t.sunset!.getTime()))).toBeLessThanOrEqual(8)
  })

  it('treats a missing profile as a flat horizon', () => {
    expect(directSunWindows(DATE, OFFSET, LAT, LON, null)).toEqual(directSunWindows(DATE, OFFSET, LAT, LON, flat))
  })

  it('delays sunrise behind a ridge to the east', () => {
    const [free] = directSunWindows(DATE, OFFSET, LAT, LON, flat)
    const [blocked] = directSunWindows(DATE, OFFSET, LAT, LON, wall(60, 130, 15))
    expect(blocked.start).toBeGreaterThan(free.start + 60 * 60000)
    expect(blocked.end).toBe(free.end)
  })

  it('splits the day in two when a peak hides the midday sun', () => {
    // winter sun culminates at ~22 degrees: a 40 degree peak to the south hides it
    const wins = directSunWindows(DATE, OFFSET, LAT, LON, wall(160, 200, 40))
    expect(wins.length).toBe(2)
    expect(totalMinutes(wins)).toBeLessThan(totalMinutes(directSunWindows(DATE, OFFSET, LAT, LON, flat)))
  })

  it('keeps one window when the obstacle is lower than the sun', () => {
    expect(directSunWindows(DATE, OFFSET, LAT, LON, wall(160, 200, 10)).length).toBe(1)
  })

  it('gives no sun in a valley closed all around', () => {
    expect(directSunWindows(DATE, OFFSET, LAT, LON, wall(0, 350, 60))).toEqual([])
  })
})

describe('effectiveSunMinutes', () => {
  const win = [{ start: localToEpoch(DATE + 'T09:00', OFFSET), end: localToEpoch(DATE + 'T11:00', OFFSET) }]
  it('counts everything under a clear sky', () => {
    const hours = [9, 10, 11].map((h) => ({ time: `${DATE}T${String(h).padStart(2, '0')}:00`, cloudCover: 0 }))
    expect(effectiveSunMinutes(win, hours, OFFSET)).toBe(120)
  })
  it('reduces with clouds', () => {
    const hours = [
      { time: `${DATE}T09:00`, cloudCover: 100 },
      { time: `${DATE}T10:00`, cloudCover: 50 },
    ]
    expect(effectiveSunMinutes(win, hours, OFFSET)).toBe(30)
  })
})

describe('time helpers', () => {
  it('formats local time', () => {
    expect(formatLocalTime(localToEpoch(`${DATE}T07:45`, OFFSET), OFFSET)).toBe('07:45')
  })
  it('tells day from night', () => {
    expect(isDaylight(`${DATE}T12:00`, OFFSET, LAT, LON)).toBe(true)
    expect(isDaylight(`${DATE}T23:00`, OFFSET, LAT, LON)).toBe(false)
  })
})
