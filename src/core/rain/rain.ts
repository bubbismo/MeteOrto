import { addDays, daysBetween } from '../dates'
import type { DailySummary, HourlyPoint } from '../types'

/** A day with at least this much rain (mm) counts as a "rainy day". */
export const RAINY_DAY_MM = 1

export type RainKind = 'past' | 'today' | 'forecast'

export interface RainDay {
  date: string
  mm: number
  tMin: number | null
  tMax: number | null
  kind: RainKind
  /** Today only: rain expected over the whole day (fallen so far + still to come). */
  expectedMm?: number
}

export interface RainStats {
  /** Days with data. */
  dayCount: number
  total: number
  rainyDays: number
  /** Wettest day. */
  maxDay: RainDay | null
  /** Most recent rainy day. */
  lastRain: RainDay | null
  /** Consecutive dry days up to the last observed day (0 if it rained on the last day). */
  dryNow: number
  /** Longest dry spell in the period, days. */
  longestDry: number
}

/** Statistics of the observed days (past and today); forecast days are ignored. */
export function rainStats(days: RainDay[]): RainStats {
  const obs = days.filter((d) => d.kind !== 'forecast').sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  let rainyDays = 0
  let maxDay: RainDay | null = null
  let lastRain: RainDay | null = null
  let run = 0
  let longestDry = 0
  let prev: string | null = null
  for (const d of obs) {
    total += d.mm
    const rainy = d.mm >= RAINY_DAY_MM
    if (rainy) rainyDays++
    if (!maxDay || d.mm > maxDay.mm) maxDay = d
    if (rainy) lastRain = d
    // a gap in the data breaks a dry spell: we cannot know it was dry
    if (prev !== null && daysBetween(prev, d.date) > 1) run = 0
    run = rainy ? 0 : run + 1
    longestDry = Math.max(longestDry, run)
    prev = d.date
  }
  return { dayCount: obs.length, total, rainyDays, maxDay: maxDay && maxDay.mm > 0 ? maxDay : null, lastRain, dryNow: run, longestDry }
}

export interface MonthRain {
  /** 1-12 */
  month: number
  mm: number
  rainyDays: number
  /** Days with data in that month. */
  days: number
  /** Number of days in the calendar month. */
  length: number
}

/** Totals for the 12 months of a year from daily values (months without data have days = 0). */
export function groupByMonth(days: { date: string; mm: number }[], year: number): MonthRain[] {
  const out: MonthRain[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    mm: 0,
    rainyDays: 0,
    days: 0,
    length: new Date(Date.UTC(year, i + 1, 0)).getUTCDate(),
  }))
  for (const d of days) {
    if (!d.date.startsWith(String(year))) continue
    const m = out[Number(d.date.slice(5, 7)) - 1]
    m.mm += d.mm
    m.days++
    if (d.mm >= RAINY_DAY_MM) m.rainyDays++
  }
  return out
}

export interface MonthClimate {
  /** Average rain per calendar month (index 0 = January), mm. */
  mm: number[]
  /** Average number of rainy days per month. */
  rainyDays: number[]
  /** Years the averages come from. */
  years: number
}

/** Typical rain of each calendar month from a long daily record (only years with the whole month are used). */
export function monthClimate(daily: { date: string; precip: number | null }[]): MonthClimate {
  const sums = new Map<string, { mm: number; rainy: number; n: number }>()
  for (const d of daily) {
    if (d.precip === null) continue
    const k = d.date.slice(0, 7)
    const s = sums.get(k) ?? { mm: 0, rainy: 0, n: 0 }
    s.mm += d.precip
    s.n++
    if (d.precip >= RAINY_DAY_MM) s.rainy++
    sums.set(k, s)
  }
  const mm = Array(12).fill(0)
  const rainy = Array(12).fill(0)
  const count = Array(12).fill(0)
  const years = new Set<string>()
  for (const [k, s] of sums) {
    const [y, m] = [Number(k.slice(0, 4)), Number(k.slice(5, 7))]
    if (s.n < new Date(Date.UTC(y, m, 0)).getUTCDate()) continue // incomplete month
    mm[m - 1] += s.mm
    rainy[m - 1] += s.rainy
    count[m - 1]++
    years.add(k.slice(0, 4))
  }
  return {
    mm: mm.map((v, i) => (count[i] ? v / count[i] : 0)),
    rainyDays: rainy.map((v, i) => (count[i] ? v / count[i] : 0)),
    years: years.size,
  }
}

export interface Comparison {
  /** Difference from the average, percent (rounded); null when the average is too small to compare. */
  pct: number | null
  level: 'molto-meno' | 'meno' | 'nella-media' | 'piu' | 'molto-piu'
}

/** How a total compares with its usual value. */
export function compareToAverage(mm: number, avg: number): Comparison {
  if (avg < 5) return { pct: null, level: mm > 20 ? 'molto-piu' : 'nella-media' }
  const pct = Math.round(((mm - avg) / avg) * 100)
  const level = pct <= -50 ? 'molto-meno' : pct <= -15 ? 'meno' : pct < 15 ? 'nella-media' : pct < 50 ? 'piu' : 'molto-piu'
  return { pct, level }
}

/** A round axis maximum and step for a chart (e.g. 33 mm -> 40 mm in steps of 10). */
export function niceAxis(maxMm: number, maxTicks = 4): { max: number; step: number } {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
  const target = Math.max(maxMm, 1)
  const step = steps.find((s) => target / s <= maxTicks) ?? 1000
  return { max: Math.ceil(target / step) * step, step }
}

/** Colour class of a day's intensity (for bars and legends). */
export type Intensity = 'trace' | 'debole' | 'moderata' | 'forte'
export function intensity(mm: number): Intensity {
  return mm >= 30 ? 'forte' : mm >= 10 ? 'moderata' : mm >= RAINY_DAY_MM ? 'debole' : 'trace'
}

export interface ArchiveDay {
  date: string
  precip: number
  tMin: number | null
  tMax: number | null
}

/**
 * Rain of each day from `from` to `to`: archive for the past, the forecast models' own hours for recent days the
 * archive does not have yet, the hours elapsed so far for today, and the forecast for the days ahead.
 * Days without any data are left out.
 */
export function buildRainDays(
  archive: ArchiveDay[],
  hours: HourlyPoint[],
  forecast: DailySummary[],
  nowLocal: string,
  from: string,
  to: string,
): RainDay[] {
  const today = nowLocal.slice(0, 10)
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const byDate = new Map(archive.map((d) => [d.date, d]))
  const fc = new Map(forecast.map((d) => [d.date, d]))
  const out: RainDay[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (date > today) {
      const f = fc.get(date)
      if (f) out.push({ date, mm: f.precipSum, tMin: f.tMin, tMax: f.tMax, kind: 'forecast' })
    } else if (date === today) {
      const hs = hours.filter((h) => h.time.startsWith(date) && h.time <= nowHour && h.precipitation !== null)
      const f = fc.get(date)
      if (hs.length) out.push({ date, mm: hs.reduce((a, h) => a + (h.precipitation ?? 0), 0), tMin: f?.tMin ?? null, tMax: f?.tMax ?? null, kind: 'today', expectedMm: f?.precipSum })
    } else {
      const a = byDate.get(date)
      if (a) out.push({ date, mm: a.precip, tMin: a.tMin, tMax: a.tMax, kind: 'past' })
      else {
        const hs = hours.filter((h) => h.time.startsWith(date) && h.precipitation !== null)
        if (hs.length >= 20) out.push({ date, mm: hs.reduce((a2, h) => a2 + (h.precipitation ?? 0), 0), tMin: null, tMax: null, kind: 'past' })
      }
    }
  }
  return out
}
