import { fetchDailyClimate, type DayHistory } from '../adapters/openmeteo/archive'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { addDays } from '../core/dates'
import { monthClimate, type MonthClimate } from '../core/rain/rain'
import { ensureRange } from './rainArchive'
import { frostSeason, type FrostSeason } from '../core/climate/frostStats'
import type { Location } from '../core/types'

const HISTORY_DAYS = 60
const CLIMATE_YEARS = 25

const key = (loc: Location) => `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`

/**
 * Daily history of the last 60 days up to yesterday, from the archive kept on the device
 * (only what is missing is downloaded; falls back to what is stored when offline).
 */
export async function loadHistory(loc: Location, today: string): Promise<DayHistory[]> {
  return ensureRange(loc, addDays(today, -HISTORY_DAYS), addDays(today, -1), today)
}

export interface Climate {
  year: number
  /** Years actually covered. */
  years: number
  air: FrostSeason
  ground: FrostSeason
  /** Typical rain of each calendar month at this place. */
  rain?: MonthClimate
}

/** Frost statistics over the last 25 full years: computed once per location and year. */
export async function loadClimate(loc: Location, thisYear: number): Promise<Climate> {
  const k = `climate:${key(loc)}`
  const cached = await kvGet<Climate>(k)
  // climates saved before the rain averages existed are downloaded again
  if (cached && cached.year === thisYear && cached.rain) return cached
  try {
    const from = thisYear - CLIMATE_YEARS
    const daily = await fetchDailyClimate(loc, from, thisYear - 1)
    const value: Climate = {
      year: thisYear,
      years: CLIMATE_YEARS,
      air: frostSeason(daily, 0),
      ground: frostSeason(daily, 2),
      rain: monthClimate(daily),
    }
    await kvSet(k, value)
    return value
  } catch (err) {
    if (cached) return cached
    throw err
  }
}
