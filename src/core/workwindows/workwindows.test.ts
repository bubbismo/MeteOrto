import { describe, expect, it } from 'vitest'
import type { HourlyPoint } from '../types'
import { findWorkWindows } from './workwindows'

type Over = (date: string, hour: number) => Partial<HourlyPoint>

function series(days: number, over: Over = () => ({})): HourlyPoint[] {
  const out: HourlyPoint[] = []
  for (let d = 0; d < days; d++) {
    const date = `2026-04-${String(10 + d).padStart(2, '0')}`
    for (let h = 0; h < 24; h++) {
      out.push({
        time: `${date}T${String(h).padStart(2, '0')}:00`,
        temperature: 14,
        dewPoint: 5,
        precipitation: 0,
        cloudCover: 20,
        windSpeed: 5,
        windGusts: 10,
        et0: 0,
        soilTemp0: 10,
        soilTemp6: 10,
        sky: 'sun',
        modelCount: 3,
        ...over(date, h),
      })
    }
  }
  return out
}

const NOW = '2026-04-10T05:00'
const find = (ws: ReturnType<typeof findWorkWindows>, profile: string, dayIndex: number) =>
  ws.find((w) => w.profile === profile && w.dayIndex === dayIndex)

describe('findWorkWindows', () => {
  it('gives the whole morning on a calm dry day', () => {
    const w = find(findWorkWindows(series(5), NOW), 'lavori', 0)!
    expect(w).toMatchObject({ start: '06:00', end: '12:00', hours: 6 })
  })

  it('splits the morning around a windy hour and keeps the longest stretch', () => {
    const hours = series(5, (d, h) => (d === '2026-04-10' && h === 9 ? { windSpeed: 30, windGusts: 45 } : {}))
    const w = find(findWorkWindows(hours, NOW), 'lavori', 0)!
    expect(w).toMatchObject({ start: '06:00', end: '09:00' })
  })

  it('refuses spraying when wind is above 10 km/h but allows general work', () => {
    const hours = series(5, () => ({ windSpeed: 15, windGusts: 18 }))
    const ws = findWorkWindows(hours, NOW)
    expect(find(ws, 'trattamenti', 0)).toBeUndefined()
    expect(find(ws, 'lavori', 0)).toBeDefined()
  })

  it('refuses spraying when rain arrives within 6 hours after the window', () => {
    const hours = series(5, (d, h) => (d === '2026-04-11' && h === 14 ? { precipitation: 3 } : {}))
    const ws = findWorkWindows(hours, NOW)
    expect(find(ws, 'trattamenti', 1)).toBeUndefined()
    expect(find(ws, 'lavori', 1)).toBeDefined() // 2 h of dry margin is enough for general work
  })

  it('refuses mowing after rain in the previous 24 hours', () => {
    const hours = series(5, (d, h) => (d === '2026-04-10' && h === 20 ? { precipitation: 5 } : {}))
    const ws = findWorkWindows(hours, NOW)
    expect(find(ws, 'sfalcio', 1)).toBeUndefined()
    expect(find(ws, 'sfalcio', 2)).toBeDefined()
  })

  it('skips mornings already gone and too-cold mornings', () => {
    const hours = series(5, (d) => (d === '2026-04-11' ? { temperature: -1 } : {}))
    const ws = findWorkWindows(hours, '2026-04-10T10:30')
    expect(find(ws, 'lavori', 0)!.start).toBe('10:00') // the hour in progress still counts
    expect(find(ws, 'lavori', 1)).toBeUndefined()
  })

  it('drops windows shorter than the minimum', () => {
    const hours = series(5, (d, h) => (d === '2026-04-10' && h !== 7 && h < 12 ? { precipitation: 2 } : {}))
    expect(find(findWorkWindows(hours, NOW), 'lavori', 0)).toBeUndefined()
  })
})
