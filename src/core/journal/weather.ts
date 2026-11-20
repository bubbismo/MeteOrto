import { addDays, daysBetween } from '../dates'
import { WEATHER_DAYS, type DayWeather, type EntryWeather, type JournalEntry } from './types'

/** Dates to download for an entry: from the sowing day up to 30 days or yesterday, whichever comes first. */
export function weatherRange(sownOn: string, today: string): { from: string; to: string; complete: boolean } | null {
  const last = addDays(sownOn, WEATHER_DAYS - 1)
  const yesterday = addDays(today, -1)
  const to = last < yesterday ? last : yesterday
  if (to < sownOn) return null // sown today: nothing has happened yet
  return { from: sownOn, to, complete: to === last }
}

const SIX_HOURS = 6 * 3600 * 1000

/** Does this entry still need weather data (missing, incomplete and not refreshed recently)? */
export function needsWeather(e: JournalEntry, today: string, now = Date.now()): boolean {
  if (e.weather?.complete) return false
  const range = weatherRange(e.sownOn, today)
  if (!range) return false
  if (!e.weather) return true
  const have = e.weather.days.at(-1)?.date ?? ''
  if (have >= range.to) return false
  return now - e.weather.fetchedAt > SIX_HOURS
}

export function buildEntryWeather(days: DayWeather[], sownOn: string, today: string, now = Date.now()): EntryWeather {
  const range = weatherRange(sownOn, today)
  return { days, complete: !!range?.complete && days.length >= WEATHER_DAYS, fetchedAt: now }
}

export interface WeatherSummary {
  days: number
  soilMean: number | null
  soilMin: number | null
  tMinAbs: number | null
  frostNights: number
  rain: number
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)

/** Summary of the first `n` days after sowing (default 14): what mattered for germination and early growth. */
export function summarizeWeather(w: EntryWeather | undefined, n = 14): WeatherSummary | null {
  if (!w || w.days.length === 0) return null
  const days = w.days.slice(0, n)
  const soil = days.map((d) => d.soil).filter((v): v is number => v !== null)
  const mins = days.map((d) => d.tMin).filter((v): v is number => v !== null)
  return {
    days: days.length,
    soilMean: mean(soil),
    soilMin: soil.length ? Math.min(...soil) : null,
    tMinAbs: mins.length ? Math.min(...mins) : null,
    frostNights: mins.filter((v) => v <= 0).length,
    rain: days.reduce((a, d) => a + d.precip, 0),
  }
}

/** Number of days between sowing and a later date (for harvest timing). */
export const daysSince = (sownOn: string, date: string) => daysBetween(sownOn, date)
