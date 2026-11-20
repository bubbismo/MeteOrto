import { fetchDailyMinima, fetchHistory, type DayHistory } from '../adapters/openmeteo/archive'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { addDays } from '../core/dates'
import { frostSeason, type FrostSeason } from '../core/climate/frostStats'
import type { Location } from '../core/types'

const HISTORY_DAYS = 60
const HISTORY_MAX_AGE_MS = 6 * 3600 * 1000
const CLIMATE_YEARS = 25

const key = (loc: Location) => `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`

interface Cached<T> {
  at: number
  value: T
}

/**
 * Daily history of the last 60 days up to yesterday (archive), kept on the device.
 * Falls back to the cached copy when offline.
 */
export async function loadHistory(loc: Location, today: string): Promise<DayHistory[]> {
  const k = `history:${key(loc)}`
  const cached = await kvGet<Cached<DayHistory[]>>(k)
  if (cached && Date.now() - cached.at < HISTORY_MAX_AGE_MS && cached.value.at(-1)?.date === addDays(today, -1)) return cached.value
  try {
    const value = await fetchHistory(loc, addDays(today, -HISTORY_DAYS), addDays(today, -1))
    await kvSet(k, { at: Date.now(), value })
    return value
  } catch (err) {
    if (cached) return cached.value
    throw err
  }
}

export interface Climate {
  year: number
  /** Years actually covered. */
  years: number
  air: FrostSeason
  ground: FrostSeason
}

/** Frost statistics over the last 25 full years: computed once per location and year. */
export async function loadClimate(loc: Location, thisYear: number): Promise<Climate> {
  const k = `climate:${key(loc)}`
  const cached = await kvGet<Climate>(k)
  if (cached && cached.year === thisYear) return cached
  try {
    const from = thisYear - CLIMATE_YEARS
    const daily = await fetchDailyMinima(loc, from, thisYear - 1)
    const value: Climate = {
      year: thisYear,
      years: CLIMATE_YEARS,
      air: frostSeason(daily, 0),
      ground: frostSeason(daily, 2),
    }
    await kvSet(k, value)
    return value
  } catch (err) {
    if (cached) return cached
    throw err
  }
}
