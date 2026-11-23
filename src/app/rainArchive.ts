import { fetchHistory, type DayHistory } from '../adapters/openmeteo/archive'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { addDays, daysBetween } from '../core/dates'
import type { Location } from '../core/types'

/**
 * Daily rain archive of a place, kept on the device and growing over time.
 * Asking for a range downloads only the days that are missing (the most recent days are refreshed now and then,
 * because the archive can still revise them), so browsing months already seen costs nothing.
 */

interface Stored {
  days: Record<string, DayHistory>
  /** Last time the most recent days were refreshed. */
  refreshedAt: number
}

const REFRESH_EVERY_MS = 12 * 3600 * 1000
/** How many of the latest days are asked for again on a refresh. */
const REFRESH_DAYS = 10
/** One request never covers more than this many days. */
const MAX_SPAN = 3700

const key = (loc: Location) => `archive:${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`

/** First and last day of a list of dates, or null if empty. */
export function span(dates: string[]): { from: string; to: string } | null {
  if (dates.length === 0) return null
  const sorted = [...dates].sort()
  return { from: sorted[0], to: sorted[sorted.length - 1] }
}

/** Days of [from, to] that are not stored yet. */
export function missingDays(stored: Record<string, unknown>, from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) if (!(d in stored)) out.push(d)
  return out
}

/**
 * Returns the days of [from, to] (the archive reaches up to yesterday), downloading what is missing.
 * If the download fails the days already stored are returned.
 */
export async function ensureRange(loc: Location, from: string, to: string, today: string, now = Date.now()): Promise<DayHistory[]> {
  const yesterday = addDays(today, -1)
  const end = to < yesterday ? to : yesterday
  if (end < from) return []

  const k = key(loc)
  const stored: Stored = (await kvGet<Stored>(k)) ?? { days: {}, refreshedAt: 0 }

  const need = missingDays(stored.days, from, end)
  const refresh = now - stored.refreshedAt > REFRESH_EVERY_MS && end >= addDays(yesterday, -(REFRESH_DAYS - 1))
  if (refresh) need.push(...missingDays({}, addDays(yesterday, -(REFRESH_DAYS - 1)), yesterday))

  const range = span(need)
  if (range && daysBetween(range.from, range.to) < MAX_SPAN) {
    try {
      for (const d of await fetchHistory(loc, range.from, range.to)) stored.days[d.date] = d
      if (refresh) stored.refreshedAt = now
      await kvSet(k, JSON.parse(JSON.stringify(stored)))
    } catch {
      // offline or over quota: show what we have
    }
  }
  return Object.values(stored.days)
    .filter((d) => d.date >= from && d.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
}
