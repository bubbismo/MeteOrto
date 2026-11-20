import { describe, expect, it } from 'vitest'
import type { DayWeather, JournalEntry } from './types'
import { buildEntryWeather, needsWeather, summarizeWeather, weatherRange } from './weather'

const entry = (sownOn: string, over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'x', cropId: 'c', cropName: 'C', emoji: '🌱', method: 'diretta', sownOn, lat: 44, lon: 9, createdAt: 0, ...over,
})
const days = (from: number, n: number, over: Partial<DayWeather> = {}): DayWeather[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-05-${String(from + i).padStart(2, '0')}`, tMin: 8, tMax: 20, precip: 1, soil: 14, ...over }))

describe('weatherRange', () => {
  it('has nothing to download on the sowing day', () => {
    expect(weatherRange('2026-05-10', '2026-05-10')).toBeNull()
  })
  it('runs up to yesterday while the 30 days are not over', () => {
    expect(weatherRange('2026-05-10', '2026-05-15')).toEqual({ from: '2026-05-10', to: '2026-05-14', complete: false })
  })
  it('stops after 30 days', () => {
    expect(weatherRange('2026-05-01', '2026-08-01')).toEqual({ from: '2026-05-01', to: '2026-05-30', complete: true })
  })
})

describe('needsWeather', () => {
  const now = Date.parse('2026-05-15T12:00:00Z')
  it('asks for entries without weather, but not for ones sown today', () => {
    expect(needsWeather(entry('2026-05-10'), '2026-05-15', now)).toBe(true)
    expect(needsWeather(entry('2026-05-15'), '2026-05-15', now)).toBe(false)
  })
  it('does not ask again for complete or up-to-date entries', () => {
    const complete = entry('2026-04-01', { weather: { days: [], complete: true, fetchedAt: 0 } })
    expect(needsWeather(complete, '2026-05-15', now)).toBe(false)
    const upToDate = entry('2026-05-10', { weather: { days: days(10, 5), complete: false, fetchedAt: now } })
    expect(needsWeather(upToDate, '2026-05-15', now)).toBe(false)
  })
  it('refreshes an incomplete entry after a few hours when new days exist', () => {
    const old = entry('2026-05-10', { weather: { days: days(10, 3), complete: false, fetchedAt: now - 7 * 3600 * 1000 } })
    expect(needsWeather(old, '2026-05-15', now)).toBe(true)
  })
})

describe('buildEntryWeather', () => {
  it('is complete only with all 30 days', () => {
    expect(buildEntryWeather(days(1, 5), '2026-05-01', '2026-08-01').complete).toBe(false)
    const thirty = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, tMin: 1, tMax: 2, precip: 0, soil: 3 }))
    expect(buildEntryWeather(thirty, '2026-05-01', '2026-08-01').complete).toBe(true)
  })
})

describe('summarizeWeather', () => {
  it('summarises the first 14 days', () => {
    const w = { days: [...days(1, 14, { tMin: 6, soil: 12, precip: 2 }), { date: 'late', tMin: -9, tMax: 0, precip: 50, soil: -1 }], complete: false, fetchedAt: 0 }
    expect(summarizeWeather(w)).toEqual({ days: 14, soilMean: 12, soilMin: 12, tMinAbs: 6, frostNights: 0, rain: 28 })
  })
  it('counts frost nights and finds the coldest night', () => {
    const w = { days: [{ date: 'a', tMin: -2, tMax: 8, precip: 0, soil: 5 }, { date: 'b', tMin: 0, tMax: 9, precip: 0, soil: 6 }, { date: 'c', tMin: 4, tMax: 12, precip: 0, soil: 7 }], complete: false, fetchedAt: 0 }
    expect(summarizeWeather(w)).toMatchObject({ frostNights: 2, tMinAbs: -2, soilMin: 5, soilMean: 6 })
  })
  it('returns null without data', () => {
    expect(summarizeWeather(undefined)).toBeNull()
  })
})
